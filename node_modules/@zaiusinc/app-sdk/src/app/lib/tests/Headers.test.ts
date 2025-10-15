import 'jest';

import {Headers} from '../Headers';

describe('Headers', () => {
  let headers!: Headers;
  beforeEach(() => {
    headers = new Headers([
      ['content-type', 'text/plain'],
      ['x-test', 'test'],
      ['x-test', 'test2']
    ]);
  });

  describe('constructor', () => {
    it('defaults to an empty set', () => {
      headers = new Headers();
      expect(headers.toArray()).toEqual([]);
    });
  });

  describe('addFromArray', () => {
    it('initializes from an array of header kv pairs', () => {
      expect(headers.has('content-type')).toBeTruthy();
      expect(headers.has('x-test')).toBeTruthy();
    });

    it('adds new headers', () => {
      headers.addFromArray([['x-foo', 'foo']]);
      expect(headers.has('x-foo')).toBeTruthy();
    });

    it('combines headers with the same key', () => {
      headers.addFromArray([
        ['cache-control', 'no-cache'],
        ['cache-control', 'no-store']
      ]);
      expect(headers.get('cache-control')).toEqual('no-cache,no-store');
    });
  });

  describe('setFromObject', () => {
    it('adds new headers from an object', () => {
      headers.setFromObject({'x-foo': 'foo', 'x-bar': 'bar'});
      expect(headers.get('x-foo')).toEqual('foo');
      expect(headers.get('x-bar')).toEqual('bar');
    });

    it('replaces existing headers', () => {
      headers.setFromObject({'x-test': 'foo'});
      expect(headers.get('x-test')).toEqual('foo');
    });

    it("doesn't remove headers not in the object", () => {
      headers.setFromObject({'x-test': 'foo'});
      expect(headers.get('content-type')).toEqual('text/plain');
    });
  });

  describe('toArray', () => {
    it('generates an array of kv pairs for the headers', () => {
      expect(headers.toArray()).toEqual([
        ['content-type', 'text/plain'],
        ['x-test', 'test,test2']
      ]);
    });

    it('converts keys to lowercase', () => {
      headers = new Headers([
        ['Content-Type', 'text/plain'],
        ['x-Test', 'test'],
        ['x-test', 'test2']
      ]);
      expect(headers.toArray()).toEqual([
        ['content-type', 'text/plain'],
        ['x-test', 'test,test2']
      ]);
    });
  });

  describe('get', () => {
    it('gets the value of an existing header', () => {
      expect(headers.get('content-type')).toEqual('text/plain');
    });

    it('is case insensitive', () => {
      expect(headers.get('Content-Type')).toEqual('text/plain');
    });

    it('returns undefined for a non-existent header', () => {
      expect(headers.get('foo')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('returns true when a header exists', () => {
      expect(headers.has('content-type')).toBeTruthy();
    });

    it('is case insensitive', () => {
      expect(headers.has('Content-Type')).toBeTruthy();
    });

    it('returns false when a header does not exist', () => {
      expect(headers.has('foo')).toBeFalsy();
    });
  });

  describe('set', () => {
    it('adds a new header', () => {
      headers.set('x-foo', 'foo');
      expect(headers.get('x-foo')).toEqual('foo');
    });

    it('replaces the value of an existing header', () => {
      headers.set('content-type', 'application/json');
      expect(headers.get('content-type')).toEqual('application/json');
    });

    it('is case insensitive', () => {
      headers.set('Content-Type', 'application/json');
      expect(headers.get('content-type')).toEqual('application/json');
    });

    it('removes a header if set to null', () => {
      headers.set('content-type', null);
      expect(headers.has('content-type')).toBeFalsy();
      expect(headers.toArray()).toEqual([['x-test', 'test,test2']]);
    });

    it('removes a header if set to a non-string value', () => {
      headers.set('content-type', 123 as any);
      headers.set('x-test', true as any);
      expect(headers.has('content-type')).toBeFalsy();
      expect(headers.has('x-test')).toBeFalsy();
      expect(headers.toArray()).toEqual([]);
    });
  });

  describe('add', () => {
    it('adds a new header', () => {
      headers.set('x-foo', 'foo');
      expect(headers.get('x-foo')).toEqual('foo');
    });

    it('appends to an existing header', () => {
      headers.add('content-type', 'application/json');
      expect(headers.get('content-type')).toEqual('text/plain,application/json');
    });

    it('is case insensitive', () => {
      headers.add('Content-Type', 'application/json');
      expect(headers.get('content-type')).toEqual('text/plain,application/json');
    });

    it('is ignores null values and non-string values', () => {
      headers.add('x-foo', 123 as any);
      headers.add('content-type', true as any);
      headers.add('x-test', null as any);
      expect(headers.get('content-type')).toEqual('text/plain');
      expect(headers.get('x-test')).toEqual('test,test2');
      expect(headers.has('x-foo')).toBeFalsy();
    });
  });
});
