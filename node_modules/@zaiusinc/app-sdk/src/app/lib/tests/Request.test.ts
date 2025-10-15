import 'jest';
import {TextEncoder} from 'util';

import {Request} from '../Request';

describe('Request', () => {
  const bodyAsUint8 = new TextEncoder().encode('{"price":"27¢"}');
  let request!: Request;

  beforeEach(() => {
    request = new Request(
      'GET',
      '/foo',
      {foo: 'bar', baz: ['1', '2']},
      [['content-type', 'application/json; charset=utf-8']],
      bodyAsUint8
    );
  });

  describe('constructor', () => {
    it('initialises as expected', () => {
      expect(request.method).toEqual('GET');
      expect(request.path).toEqual('/foo');
      expect(request.params).toEqual({foo: 'bar', baz: ['1', '2']});
      expect(request.headers.toArray()).toEqual([['content-type', 'application/json; charset=utf-8']]);
      expect(request.body).toBe(bodyAsUint8);
    });
  });

  describe('contentType', () => {
    it('provides a helper to get the content-type', () => {
      expect(request.contentType).toEqual('application/json');
    });

    it('returns null if there is no content-type', () => {
      request = new Request('GET', '/foo', {}, [], null);
      expect(request.contentType).toBeNull();
    });
  });

  describe('bodyJSON', () => {
    it('parses a json body', () => {
      expect(request.bodyJSON).toEqual({price: '27¢'});
    });

    it('returns null if the body is empty', () => {
      request = new Request('GET', '/foo', {}, [], null);
      expect(request.bodyJSON).toBeNull();
    });

    it('throws an error when the body is invalid json', () => {
      request = new Request('GET', '/foo', {}, [], new TextEncoder().encode('invalid json'));
      expect(() => request.bodyJSON).toThrow();
    });

    it('memoizes the parsed json', () => {
      expect(request['parsedJsonBody']).toBeUndefined();
      const json = request.bodyJSON;
      expect(request['parsedJsonBody']).toBe(json);
      // ensure it reuses the parsed data
      expect(request.bodyJSON).toBe(json);
    });
  });
});
