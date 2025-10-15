/* eslint max-classes-per-file: "off" */
import 'jest';
import nock from 'nock';
import * as ObjectHash from 'object-hash';
import {Stream} from 'stream';
import * as zlib from 'zlib';

import {FileRowProcessor} from '../FileStream';
import {JsonLinesStream} from '../JsonLinesStream';

interface Row {
  col1: string;
  col2: string;
  col3: string;
}

class TestJsonLinesRowProcessor implements FileRowProcessor<Row> {
  public constructor(
    private completed = false,
    private readRows: Row[] = []
  ) {}

  public get isCompleted() {
    return this.completed;
  }

  public get rows() {
    return this.readRows;
  }

  public async process(row: Row): Promise<boolean> {
    this.rows.push(row);
    return this.rows.length % 2 === 0;
  }

  public async complete(): Promise<void> {
    this.completed = true;
  }
}

class FailingCompleteJsonLinesRowProcessor extends TestJsonLinesRowProcessor {
  public override async complete(): Promise<void> {
    throw new Error('complete failed');
  }
}

class FailingProcessJsonLinesRowProcessor extends TestJsonLinesRowProcessor {
  private failed = false;
  public override async process(_: Row): Promise<boolean> {
    if (!this.failed) {
      this.failed = true;
      throw new Error('process failed');
    }

    return super.process(_);
  }
}

describe('JsonLinesStream', () => {
  const processAndVerify = async (stream: JsonLinesStream<Row>, processor: TestJsonLinesRowProcessor) => {
    await stream.processSome();
    expect(processor.isCompleted).toBe(true);
    expect(processor.rows.length).toBe(1);
    expect(processor.rows[0]).toEqual({
      col1: 'val1',
      col2: 'val2',
      col3: 'val3'
    });
  };

  const processAndVerifyError = async (
    stream: JsonLinesStream<Row>,
    processor: TestJsonLinesRowProcessor,
    error: string
  ) => {
    await expect(() => stream.processSome()).rejects.toThrowError(error);
    expect(processor.isCompleted).toBe(false);
  };

  it('builds instances processes from a stream - tabular format', async () => {
    const readable = new Stream.Readable();
    readable.push('["col1","col2","col3"]\n["val1","val2","val3"]\n');
    readable.push(null);

    const processor = new TestJsonLinesRowProcessor();
    await processAndVerify(JsonLinesStream.fromStream(readable, processor, {tabularFormat: true}), processor);
  });

  it('builds instances processes from a stream', async () => {
    const readable = new Stream.Readable();
    readable.push('{"col1":"val1","col2":"val2","col3":"val3"}\n');
    readable.push(null);

    const processor = new TestJsonLinesRowProcessor();
    await processAndVerify(JsonLinesStream.fromStream(readable, processor), processor);
  });

  it('builds instances processes from a url - tabular format', async () => {
    nock('https://zaius.app.sdk').get('/csv').reply(200, '["col1","col2","col3"]\n["val1","val2","val3"]\n');

    const processor = new TestJsonLinesRowProcessor();
    await processAndVerify(
      JsonLinesStream.fromUrl('https://zaius.app.sdk/csv', processor, {tabularFormat: true}),
      processor
    );
  });

  it('builds instances processes from a url', async () => {
    nock('https://zaius.app.sdk').get('/csv').reply(200, '{"col1":"val1","col2":"val2","col3":"val3"}\n');

    const processor = new TestJsonLinesRowProcessor();
    await processAndVerify(JsonLinesStream.fromUrl('https://zaius.app.sdk/csv', processor), processor);
  });

  it('builds instances processes from a url - gzip format', async () => {
    nock('https://zaius.app.sdk')
      .get('/csv.gz')
      .reply(200, zlib.gzipSync('{"col1":"val1","col2":"val2","col3":"val3"}\n'));
    const processor = new TestJsonLinesRowProcessor();
    await processAndVerify(JsonLinesStream.fromUrl('https://zaius.app.sdk/csv.gz', processor), processor);
  });

  it('should pause and resume', async () => {
    const readable = new Stream.Readable();
    readable.push('["col1","col2","col3"]\n');
    readable.push('["val1","val2","val3"]\n');
    readable.push('["val4","val5","val6"]\n');
    readable.push('["val7","val8","val9"]\n');
    readable.push(null);

    const processor = new TestJsonLinesRowProcessor();
    const stream = JsonLinesStream.fromStream(readable, processor, {tabularFormat: true});
    await stream.processSome();
    expect(processor.isCompleted).toBe(false);
    expect(processor.rows.length).toBe(2);
    expect(processor.rows[0]).toEqual({
      col1: 'val1',
      col2: 'val2',
      col3: 'val3'
    });
    expect(processor.rows[1]).toEqual({
      col1: 'val4',
      col2: 'val5',
      col3: 'val6'
    });

    await stream.processSome();
    expect(processor.isCompleted).toBe(true);
    expect(processor.rows.length).toBe(3);
    expect(processor.rows[2]).toEqual({
      col1: 'val7',
      col2: 'val8',
      col3: 'val9'
    });
  });

  it('should fast forward to a specified record and resume', async () => {
    const readable = new Stream.Readable();
    readable.push('["col1","col2","col3"]\n');
    readable.push('["val1","val2","val3"]\n');
    readable.push('["val4","val5","val6"]\n');
    readable.push(null);

    const processor = new TestJsonLinesRowProcessor();
    const marker = ObjectHash.sha1({
      col1: 'val1',
      col2: 'val2',
      col3: 'val3'
    });

    const stream = JsonLinesStream.fromStream(readable, processor, {tabularFormat: true});
    await stream.fastforward(marker);
    await stream.processSome();
    expect(processor.isCompleted).toBe(true);
    expect(processor.rows.length).toBe(1);
    expect(processor.rows[0]).toEqual({
      col1: 'val4',
      col2: 'val5',
      col3: 'val6'
    });
  });

  it('should throw error for broken stream', async () => {
    nock('https://zaius.app.sdk').get('/csv').replyWithError('streaming error');

    const processor = new TestJsonLinesRowProcessor();
    await processAndVerifyError(
      JsonLinesStream.fromUrl('https://zaius.app.sdk/csv', processor, {tabularFormat: true}),
      processor,
      'streaming error'
    );
  });

  it('should throw error when complete method fails', async () => {
    const readable = new Stream.Readable();
    readable.push('["col1","col2","col3"]\n');
    readable.push('["val1","val2","val3"]\n');
    readable.push(null);

    const processor = new FailingCompleteJsonLinesRowProcessor();
    await processAndVerifyError(
      JsonLinesStream.fromStream(readable, processor, {tabularFormat: true}),
      processor,
      'complete failed'
    );
  });

  it('should throw error when process method fails and allow further processing', async () => {
    const readable = new Stream.Readable();
    readable.push('["col1","col2","col3"]\n');
    readable.push('["failure1","failure2","failure3"]\n');
    readable.push('["val1","val2","val3"]\n');
    readable.push(null);

    const processor = new FailingProcessJsonLinesRowProcessor();
    const stream = JsonLinesStream.fromStream(readable, processor, {tabularFormat: true});

    await processAndVerifyError(stream, processor, 'process failed');
    await processAndVerify(stream, processor);
  });
});
