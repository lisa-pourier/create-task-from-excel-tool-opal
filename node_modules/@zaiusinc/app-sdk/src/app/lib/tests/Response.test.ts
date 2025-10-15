import 'jest';

import {Headers} from '../Headers';
import {Response} from '../Response';

describe('Response', () => {
  let response!: Response;

  beforeEach(() => {
    response = new Response();
  });

  describe('constructor', () => {
    it('sets status if provided', () => {
      expect(new Response(202).status).toBe(202);
    });

    it('sets bodyJSON if provided', () => {
      const data = new Response(200, {foo: 'bar'})['bodyData']!;
      expect(JSON.parse(Buffer.from(data).toString('utf8'))).toEqual({foo: 'bar'});
    });

    it('sets headers if provided', () => {
      const headers = new Response(200, {status: 'OK'}, new Headers([['z-header', 'foo']])).headers;
      expect(headers.get('z-header')).toBe('foo');
    });
  });

  describe('body', () => {
    it('converts a string to a Uint8Array', () => {
      response.body = 'foo';
      expect(response.bodyAsU8Array).toEqual(new Uint8Array([102, 111, 111]));
    });

    it('clears an existing body', () => {
      response.body = 'foo';
      response.body = null;
      expect(response.bodyAsU8Array).toBeUndefined();
    });
  });

  describe('bodyAsU8Array', () => {
    it('sets the body to a provided Uint8Array without copying', () => {
      const body = new Uint8Array([102, 111, 111]);
      response.bodyAsU8Array = body;
      expect(response.bodyAsU8Array).toBe(body);
    });

    it('clears the body when set to undefined', () => {
      expect(response.bodyAsU8Array).toBeUndefined();
      response.bodyAsU8Array = new Uint8Array([102, 111, 111]);
      expect(response.bodyAsU8Array).not.toBeUndefined();
      response.bodyAsU8Array = undefined;
      expect(response.bodyAsU8Array).toBeUndefined();
    });
  });

  describe('bodyJSON', () => {
    it('stringifies a json object', () => {
      const body = {foo: 'bar'};
      response.bodyJSON = body;
      expect(Buffer.from(response.bodyAsU8Array as Uint8Array).toString()).toEqual('{"foo":"bar"}');
    });

    it('clears the body when set to undefined', () => {
      response.bodyAsU8Array = new Uint8Array([102, 111, 111]);
      expect(response.bodyAsU8Array).not.toBeUndefined();
      response.bodyJSON = undefined;
      expect(response.bodyAsU8Array).toBeUndefined();
    });
  });
});
