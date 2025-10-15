import fetch from 'node-fetch';
import {URL} from 'url';
import * as zlib from 'zlib';

import {FileReadableStreamBuilder, FileRowProcessor, FileStream} from './FileStream';
import {parse, Options} from './JsonLinesParser';

type JsonLineRowBasics = string | number | boolean | Date | JsonLineRow;

export interface JsonLineRow {
  [column: string]: JsonLineRowBasics | JsonLineRowBasics[];
}

/**
 * Builds source streams for the JsonLinesStream to process.
 */
export type JsonLineReadableStreamBuilder = FileReadableStreamBuilder;

export class JsonLinesStream<T> extends FileStream<T, Options> {
  /**
   * Build a JsonLinesStream from an existing ReadableStream.
   * @param stream source stream for the JsonLines data
   * @param processor the row processor
   * @param options options to provide the JsonLinesParser {@link Options}
   */
  public static fromStream<T>(
    stream: NodeJS.ReadableStream,
    processor: FileRowProcessor<T>,
    options: Options = {}
  ): JsonLinesStream<T> {
    return new JsonLinesStream(async () => stream, processor, options);
  }

  /**
   * Build a JsonLinesStream that reads from a web resource.
   * @param url source url for the JsonLines data
   * @param processor the row processor
   * @param options options to provide the JsonLinesParser {@link Options}
   */
  public static fromUrl<T>(url: string, processor: FileRowProcessor<T>, options: Options = {}): JsonLinesStream<T> {
    const builder: JsonLineReadableStreamBuilder = async () => {
      const response = await fetch(url);
      const pipeline = response.body;
      return /\.gz$/.test(new URL(url).pathname) ? pipeline.pipe(zlib.createGunzip()) : pipeline;
    };

    return new JsonLinesStream(builder, processor, options);
  }

  public constructor(
    streamBuilder: JsonLineReadableStreamBuilder,
    rowProcessor: FileRowProcessor<T>,
    options: Options = {}
  ) {
    super(streamBuilder, rowProcessor, parse, options);
  }
}
