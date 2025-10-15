import csv from 'csv-parser';
import {Options} from 'csv-parser';
import fetch from 'node-fetch';
import {URL} from 'url';
import * as zlib from 'zlib';

import {FileReadableStreamBuilder, FileRowProcessor, FileStream} from './FileStream';

export interface CsvRow {
  [column: string]: string;
}

export type CsvRowProcessor<T = CsvRow> = FileRowProcessor<T>;

/**
 * Builds source streams for the CsvStream to process.
 */
export type CsvReadableStreamBuilder = FileReadableStreamBuilder;

export class CsvStream<T> extends FileStream<T, Options> {
  /**
   * Build a CsvStream from an existing ReadableStream.
   * @param stream source stream for the csv data
   * @param processor the row processor
   * @param options options to provide the underlying parser,
   * see https://github.com/mafintosh/csv-parser#csvoptions--headers
   */
  public static fromStream<T>(
    stream: NodeJS.ReadableStream,
    processor: CsvRowProcessor<T>,
    options: Options = {}
  ): CsvStream<T> {
    return new CsvStream(async () => stream, processor, options);
  }

  /**
   * Build a CsvStream that reads from a web resource.
   * @param url source url for the csv data
   * @param processor the row processor
   * @param options options to provide the underlying parser,
   * see https://github.com/mafintosh/csv-parser#csvoptions--headers
   */
  public static fromUrl<T>(url: string, processor: CsvRowProcessor<T>, options: Options = {}): CsvStream<T> {
    const builder: CsvReadableStreamBuilder = async () => {
      const response = await fetch(url);
      const pipeline = response.body;
      return /\.gz$/.test(new URL(url).pathname) ? pipeline.pipe(zlib.createGunzip()) : pipeline;
    };

    return new CsvStream(builder, processor, options);
  }

  public constructor(streamBuilder: CsvReadableStreamBuilder, rowProcessor: CsvRowProcessor<T>, options: Options = {}) {
    super(streamBuilder, rowProcessor, csv, options);
  }
}
