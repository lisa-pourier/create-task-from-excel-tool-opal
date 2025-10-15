import 'jest';

import {CasError} from '../CasError';
import {LocalAsyncStoreBackend} from '../LocalAsyncStoreBackend';

/**
 * Mostly exercised through LocalKVStore tests, but here we test some of the nuances we skipped over
 */
describe('LocalAsyncStoreBackend', () => {
  let store: LocalAsyncStoreBackend<any>;
  beforeEach(() => {
    jest.spyOn(LocalAsyncStoreBackend.prototype, 'epoch' as any).mockReturnValue(1585273000);
    store = new LocalAsyncStoreBackend(0, {foo: {cas: 1, expires: 1585273000 + 500, value: {bar: 'bar'}}});
  });

  describe('get', () => {
    it('retrives existing values and metadata', async () => {
      expect(await store.get('foo')).toEqual({
        cas: 1,
        ttl: 500,
        value: {
          bar: 'bar'
        }
      });
    });

    it('returns {} for expired values', async () => {
      jest.spyOn(LocalAsyncStoreBackend.prototype, 'epoch' as any).mockReturnValue(1585273500);

      expect(await store.get('foo')).toEqual({
        cas: 1,
        ttl: 0,
        value: {
          bar: 'bar'
        }
      });

      jest.spyOn(LocalAsyncStoreBackend.prototype, 'epoch' as any).mockReturnValue(1585273501);

      expect(await store.get('foo')).toEqual({
        cas: 0,
        value: {}
      });
    });
  });

  describe('put', () => {
    it('writes new values', async () => {
      const changeFn = jest.spyOn(store, 'onChange' as any);
      await store.put('bar', {bar: 'bar'});
      expect(await store.get('bar')).toEqual({
        cas: 0,
        value: {
          bar: 'bar'
        }
      });

      await store.put('baz', {baz: 'baz'}, 600, 3);
      expect(await store.get('baz')).toEqual({
        cas: 3,
        ttl: 600,
        value: {
          baz: 'baz'
        }
      });

      expect(changeFn).toHaveBeenCalledTimes(2);
    });

    it('overwrites values if the cas matches or is not provided', async () => {
      const changeFn = jest.spyOn(store, 'onChange' as any);
      await store.put('foo', {foo: 'foo'}, 600);
      expect(await store.get('foo')).toEqual({
        cas: 2,
        ttl: 600,
        value: {
          foo: 'foo'
        }
      });

      await store.put('foo', {foo: 'bar'}, undefined, 2);
      expect(await store.get('foo')).toEqual({
        cas: 3,
        ttl: 600,
        value: {
          foo: 'bar'
        }
      });
      expect(changeFn).toHaveBeenCalledTimes(2);
    });

    it('does not overwrite values if the cas does not match', async () => {
      const changeFn = jest.spyOn(store, 'onChange' as any);
      await expect(store.put('foo', {foo: 'bar'}, undefined, 2)).rejects.toThrow(CasError);
      expect(await store.get('foo')).toEqual({
        cas: 1,
        ttl: 500,
        value: {
          bar: 'bar'
        }
      });
      expect(changeFn).not.toHaveBeenCalled();
    });
  });

  describe('atomicPatch', () => {
    it('updates a value in place', async () => {
      const changeFn = jest.spyOn(store, 'onChange' as any);
      expect(
        await store.atomicPatch('foo', (prev, options) => {
          options.ttl = 1000;
          return {
            ...prev,
            foo: 'foo'
          };
        })
      ).toEqual({
        cas: 2,
        ttl: 1000,
        value: {
          foo: 'foo',
          bar: 'bar'
        }
      });
      expect(changeFn).toHaveBeenCalledTimes(1);
    });

    it('overwrites an expired value', async () => {
      const changeFn = jest.spyOn(store, 'onChange' as any);
      jest.spyOn(LocalAsyncStoreBackend.prototype, 'epoch' as any).mockReturnValue(1585273501);
      expect(
        await store.atomicPatch('foo', (prev, options) => {
          expect(options).toEqual({});
          expect(prev).toEqual({});
          return {
            ...prev,
            foo: 'foo'
          };
        })
      ).toEqual({
        cas: 0,
        value: {
          foo: 'foo'
        }
      });
      expect(changeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('deletes a value', async () => {
      const changeFn = jest.spyOn(store, 'onChange' as any);
      expect(await store.delete('foo')).toEqual({bar: 'bar'});
      expect(await store.get('foo')).toEqual({
        cas: 0,
        value: {}
      });
      expect(changeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('exists', () => {
    it('checks if a value exists', async () => {
      expect(await store.exists('foo')).toBeTruthy();
      expect(await store.exists('bar')).toBeFalsy();
      jest.spyOn(LocalAsyncStoreBackend.prototype, 'epoch' as any).mockReturnValue(1585273501);
      expect(await store.exists('foo')).toBeFalsy();
    });
  });

  describe('onChange', () => {
    it('sends updated data on a change', async () => {
      const changeHandler = jest.fn().mockReturnValue(Promise.resolve());
      store = new LocalAsyncStoreBackend(0, {}, changeHandler);

      expect(store['hasChanges']).toBeFalsy();
      await store.put('foo', {bar: 'bar'});
      expect(store['changeTimer']).not.toBeUndefined();
      expect(store['hasChanges']).toBeTruthy();

      // ensure we wait for our onChange timer to complete, by scheduling a timer after to complete the test
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(changeHandler).toHaveBeenCalledWith({foo: {cas: 0, expires: undefined, value: {bar: 'bar'}}});
          expect(store['hasChanges']).toBeFalsy();
          expect(store['changeTimer']).toBeUndefined();
          resolve();
        }, 0);
      });
    });
  });
});
