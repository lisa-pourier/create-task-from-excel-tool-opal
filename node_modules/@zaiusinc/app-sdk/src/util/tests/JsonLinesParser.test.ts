import 'jest';
import {Stream} from 'stream';

import {nullValue, parse} from '../JsonLinesParser';

const expectedObjects = [
  {
    col1: 'val1',
    col2: 123,
    col3: true
  },
  {
    col1: 'val4',
    col2: 456,
    col3: true
  },
  {
    col1: 'val7',
    col2: 789,
    col3: false
  }
];
const expectedObjectsWithoutHeaders = [
  {
    0: 'val1',
    1: 123,
    2: true
  },
  {
    0: 'val4',
    1: 456,
    2: true
  },
  {
    0: 'val7',
    1: 789,
    2: false
  }
];

describe('JsonLinesParser', () => {
  it('Process stream with objects format without parameters', async () => {
    const objectsFormat = new Stream.Readable();
    objectsFormat.push('{"col1":"val1","col2":123,"col3":true}\n');
    objectsFormat.push('{"col1":"val4","col2":456,"col3":true}\n');
    objectsFormat.push('{"col1":"val7","col2":789,"col3":false}\n');
    objectsFormat.push(null);
    expect(await streamToString(objectsFormat.pipe(parse({})))).toEqual(expectedObjects);
  });

  it('Process stream with arrays format', async () => {
    const arraysFormat = new Stream.Readable();
    arraysFormat.push('["col1","col2","col3"]\n');
    arraysFormat.push('["val1",123,true]\n');
    arraysFormat.push('["val4",456,true]\n');
    arraysFormat.push('["val7",789,false]\n');
    arraysFormat.push(null);
    expect(await streamToString(arraysFormat.pipe(parse({tabularFormat: true})))).toEqual(expectedObjects);
  });

  it('Process stream with arrays format without headers', async () => {
    const arraysFormat = new Stream.Readable();
    arraysFormat.push('["val1",123,true]\n');
    arraysFormat.push('["val4",456,true]\n');
    arraysFormat.push('["val7",789,false]\n');
    arraysFormat.push(null);
    expect(await streamToString(arraysFormat.pipe(parse({tabularFormat: true, headers: false})))).toEqual(
      expectedObjectsWithoutHeaders
    );
  });

  it('Process stream with arrays format with declared headers', async () => {
    const arraysFormat = new Stream.Readable();
    arraysFormat.push('["val1",123,true]\n');
    arraysFormat.push('["val4",456,true]\n');
    arraysFormat.push('["val7",789,false]\n');
    arraysFormat.push(null);
    expect(
      await streamToString(arraysFormat.pipe(parse({tabularFormat: true, headers: ['col1', 'col2', 'col3']})))
    ).toEqual(expectedObjects);
  });

  it('Process stream with arrays format - strict mode', async () => {
    const arraysFormat = new Stream.Readable();
    arraysFormat.push('["col1","col2","col3"]\n');
    arraysFormat.push('["val1",123,true]\n');
    arraysFormat.push('["val4",456,true]\n');
    arraysFormat.push('["val7",789,false]\n');
    arraysFormat.push(null);
    expect(await streamToString(arraysFormat.pipe(parse({tabularFormat: true, strict: true})))).toEqual(
      expectedObjects
    );
  });

  it('Process stream with mixed objects format', async () => {
    const arraysFormat = new Stream.Readable();
    arraysFormat.push('{"v":"object1"}\n');
    arraysFormat.push('{"name":"Lady Gaga","records":["Chromatica"]}\n');
    arraysFormat.push('[1,2,3,4]\n');
    arraysFormat.push('true\n');
    arraysFormat.push('false\n');
    arraysFormat.push('2020\n');
    arraysFormat.push('-1\n');
    arraysFormat.push('null\n');
    arraysFormat.push('null\n');
    arraysFormat.push('{"value":null}\n');
    arraysFormat.push('[null,null]\n');
    arraysFormat.push(null);
    expect(await streamToString(arraysFormat.pipe(parse({})))).toEqual([
      {v: 'object1'},
      {name: 'Lady Gaga', records: ['Chromatica']},
      [1, 2, 3, 4],
      true,
      false,
      2020,
      -1,
      nullValue,
      nullValue,
      {value: null},
      [null, null]
    ]);
  });

  it('Reject mixed format', async () => {
    const arraysFormat = new Stream.Readable();
    arraysFormat.push('["col1","col2","col3"]\n');
    arraysFormat.push('{"col1":"val4","col2":"val5","col3":"val6"}\n');
    arraysFormat.push(null);
    await expect(streamToString(arraysFormat.pipe(parse({tabularFormat: true})))).rejects.toThrowError(
      'Each line must be an array of objects'
    );
  });
});

function streamToString(stream: Stream) {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', (err) => reject(err instanceof Error ? err : new Error(String(err))));
    stream.on('end', () => resolve(chunks));
  });
}
