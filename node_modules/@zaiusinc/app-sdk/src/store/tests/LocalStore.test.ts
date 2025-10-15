import 'jest';

import {LocalAsyncStoreBackend} from '../LocalAsyncStoreBackend';
import {LocalStore} from '../LocalStore';

describe('LocalStore', () => {
  let store: LocalStore = new LocalStore(new LocalAsyncStoreBackend());
  beforeEach(() => {
    store = new LocalStore(new LocalAsyncStoreBackend());
  });

  describe('get / put / delete', () => {
    it('overwrites and reads data from the store', async () => {
      // inital put
      expect(await store.exists('foo')).toBeFalsy();
      await store.put('foo', {foo: 'foo', bar: 'bar'});
      expect(await store.get('foo')).toEqual({foo: 'foo', bar: 'bar'});
      expect(await store.exists('foo')).toBeTruthy();

      // filtered get
      expect(await store.get('foo', ['bar'])).toEqual({bar: 'bar'});

      // overwrite
      await store.put('foo', {foo: 'bar'});
      // second key
      await store.put('bar', {bar: 'foo'});
      expect(await store.get('foo')).toEqual({foo: 'bar'});
      expect(await store.get('bar')).toEqual({bar: 'foo'});

      // wipe
      await store.put('foo', {});
      expect(await store.get('foo')).toEqual({});

      // delete
      await store.delete('bar');
      expect(await store.get('bar')).toEqual({});
    });

    it('copies data to avoid side-effects/mimic reality', async () => {
      const data = {foo: 'bar'};
      await store.put('foo', data);
      data['foo'] = 'foo';
      expect(await store.get('foo')).toEqual({foo: 'bar'});
    });
  });

  describe('patch', () => {
    it('handles a hash patch', async () => {
      // patch existing
      await store.put('foo', {foo: 1, bar: 2});
      expect(await store.patch('foo', {bar: 3})).toEqual({foo: 1, bar: 2});
      expect(await store.get('foo')).toEqual({foo: 1, bar: 3});

      // patch empty key
      expect(await store.patch('bar', {bar: 3})).toEqual({});
      expect(await store.get('bar')).toEqual({bar: 3});
    });

    it('handles a function patch', async () => {
      // patch existing
      await store.put('foo', {foo: 1, bar: 2});
      expect(
        await store.patch('foo', (data) => {
          Object.entries(data).forEach(([key, value]) => (data[key] = (value as number) + 1));
          return data;
        })
      ).toEqual({foo: 1, bar: 2});
      expect(await store.get('foo')).toEqual({foo: 2, bar: 3});

      // patch empty key
      expect(
        await store.patch('bar', (data) => {
          Object.entries(data).forEach(([key, value]) => (data[key] = (value as number) + 1));
          data['foobar'] = 0;
          return data;
        })
      ).toEqual({});
      expect(await store.get('bar')).toEqual({foobar: 0});
    });

    it('properly surfaces errors thrown in a function patch', async () => {
      await expect(
        store.patch('foo', () => {
          throw new Error('nah');
        })
      ).rejects.toThrowError('nah');
    });
  });
});
