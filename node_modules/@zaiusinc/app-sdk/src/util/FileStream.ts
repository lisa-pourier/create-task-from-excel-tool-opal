import * as ObjectHash from 'object-hash';
import {Transform, Stream} from 'stream';

import {logger} from '../logging';

export interface FileRowProcessor<T> {
  /**
   * Process a row from a file.
   * @param row to process
   * @return true if it is safe to pause after this row, false otherwise
   */
  process(row: T): Promise<boolean>;

  /**
   * Complete any pending work. Called when the source file has
   * been completely processed.
   */
  complete(): Promise<void>;
}

/**
 * Builds source streams for the FileStream to process.
 */
export type FileReadableStreamBuilder = () => Promise<NodeJS.ReadableStream>;

/**
 * Superclass of stream file reader with the main
 * logic involve in processing a file line by line
 */
export abstract class FileStream<T, O> {
  private readStream?: NodeJS.ReadableStream;
  private pipelineFinished = false;
  private onPause!: (marker: string | null) => void;
  private onError!: (error: Error) => void;
  private resume?: () => void;
  private fastforwardMarker?: string;

  public constructor(
    private streamBuilder: FileReadableStreamBuilder,
    private rowProcessor: FileRowProcessor<T>,
    private parser: (args: O) => Transform,
    private options: O = {} as O
  ) {}

  public get isFinished() {
    return this.pipelineFinished;
  }

  public async fastforward(target: string) {
    this.fastforwardMarker = target;
    return this.processSome();
  }

  public async processSome(): Promise<string | null> {
    if (this.pipelineFinished) {
      return null;
    }

    if (!this.readStream) {
      await this.createPipe();
    }

    return new Promise((resolve, reject) => {
      this.onError = reject;
      this.onPause = (marker) => {
        resolve(marker);
      };

      if (this.resume) {
        this.resume();
      } else {
        this.readStream?.resume();
      }
    });
  }

  private async createPipe() {
    let pipeline = (this.readStream = await this.streamBuilder());
    const rowProcessor = this.rowProcessor;
    const transform = this.parser(this.options);
    transform.on('error', (error) => {
      this.onError(error);
    });
    pipeline = pipeline.pipe(transform).pipe(
      new Stream.Transform({
        writableObjectMode: true,
        transform: (row, _, callback) => {
          // if we're fastforwarding in order to resume
          if (this.fastforwardMarker) {
            if (this.fastforwardMarker === ObjectHash.sha1(row)) {
              this.resume = callback;
              const hash = this.fastforwardMarker;
              this.fastforwardMarker = undefined;
              this.onPause(hash);
            } else {
              callback();
            }
          } else {
            rowProcessor
              .process(row)
              .then((canPause: boolean) => {
                if (canPause) {
                  this.resume = callback;
                  this.onPause(ObjectHash.sha1(row));
                } else {
                  callback();
                }
              })
              .catch((error) => {
                logger.error(error, 'on row:', row);
                this.resume = callback;
                this.onError(error);
              });
          }
        }
      })
    );

    pipeline.on('finish', async (error) => {
      this.pipelineFinished = true;
      this.resume = undefined;
      if (error) {
        this.onError(error);
      } else {
        await this.rowProcessor
          .complete()
          .then(() => this.onPause(null))
          .catch((e) => this.onError(e));
      }
    });

    this.readStream.pause();
  }
}
