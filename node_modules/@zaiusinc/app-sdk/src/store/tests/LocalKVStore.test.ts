import 'jest';

import {StringSet} from '..';
import {LocalAsyncStoreBackend} from '../LocalAsyncStoreBackend';
import {LocalKVStore} from '../LocalKVStore';
import {NumberSet} from '../NumberSet';

describe('LocalKVStore', () => {
  let store: LocalKVStore;
  beforeEach(async () => {
    store = new LocalKVStore(new LocalAsyncStoreBackend());
    await store.put('foo', {bar: 'bar'});
    await store.put('foo2', {foo: 'foo', bar: 'bar'});
  });

  describe('get', () => {
    it('gets an existing value', async () => {
      expect(await store.get('foo')).toEqual({bar: 'bar'});
    });

    it('filters the value', async () => {
      expect(await store.get('foo2', ['foo'])).toEqual({foo: 'foo'});
      expect(await store.get('foo2', ['baz'])).toEqual({});
    });

    it('returns {} for expired data', async () => {
      const mockTime = 1585273000000;
      const dateSpy = jest.spyOn(Date.prototype, 'getTime').mockReturnValue(mockTime);
      await store.put('foo', {foo: 'foo'}, {ttl: 60});
      expect(await store.get('foo')).toEqual({foo: 'foo'});

      dateSpy.mockReturnValue(mockTime + 100 * 1000);
      expect(await store.get('foo')).toEqual({});

      dateSpy.mockRestore();
    });
  });

  describe('reset', () => {
    it('resets the store', async () => {
      store.reset();
      expect(await store.get('foo')).toEqual({});
    });
  });

  describe('put', () => {
    it('overwrites an existing value', async () => {
      expect(await store.put('foo', {baz: 'baz'})).toEqual({bar: 'bar'});
      expect(await store.get('foo')).toEqual({baz: 'baz'});
    });

    it('inserts new data', async () => {
      expect(await store.put('baz', {baz: 'baz'})).toEqual({});
      expect(await store.get('baz')).toEqual({baz: 'baz'});
      expect(await store.get('foo')).toEqual({bar: 'bar'});
    });
  });

  describe('patch', () => {
    it('updates an existing value', async () => {
      expect(await store.patch('foo', {baz: 'baz'})).toEqual({bar: 'bar'});
      expect(await store.patch('foo', (previous: any) => ({...previous, foo: 'foo'}))).toEqual({
        bar: 'bar',
        baz: 'baz'
      });
      expect(await store.get('foo')).toEqual({foo: 'foo', bar: 'bar', baz: 'baz'});
    });

    it('inserts new data', async () => {
      expect(await store.patch('baz', {baz: 'baz'})).toEqual({});
      expect(await store.get('baz')).toEqual({baz: 'baz'});
      expect(await store.get('foo')).toEqual({bar: 'bar'});
    });

    it('properly surfaces errors thrown in a function patch', async () => {
      await expect(
        store.patch('foo', () => {
          throw new Error('nah');
        })
      ).rejects.toThrowError('nah');
    });
  });

  describe('delete', () => {
    it('removes the value', async () => {
      expect(await store.delete('foo')).toEqual({bar: 'bar'});
      expect(await store.get('foo')).toEqual({});
      expect(await store.delete('bar')).toEqual({});
    });
  });

  describe('exists', () => {
    it('returns true if a value exists', async () => {
      expect(await store.exists('foo')).toEqual(true);
      expect(await store.exists('baz')).toEqual(false);
    });
  });

  describe('increment', () => {
    it('increments an existing numeric value', async () => {
      await store.put('foo', {v1: 10, v2: '10'});
      await store.increment('foo', 'v1');
      await store.increment('foo', 'v2', 10);
      expect(await store.get('foo')).toEqual({v1: 11, v2: 20});
    });

    it('increments from zero when there is no existing value', async () => {
      await store.increment('foo', 'v1');
      await store.increment('bar', 'v1');
      expect(await store.get('foo')).toEqual({v1: 1, bar: 'bar'});
      expect(await store.get('bar')).toEqual({v1: 1});
    });

    it('throws appropriate errors for non-numeric data', async () => {
      await store.put('foo', {v1: [1], v2: {foo: 1}, v3: 'non-number'});
      await expect(store.increment('foo', 'v1')).rejects.toThrow(Error);
      await expect(store.increment('foo', 'v2')).rejects.toThrow(Error);
      await expect(store.increment('foo', 'v3')).rejects.toThrow(Error);
    });
  });

  describe('incrementMulti', () => {
    it('increments multiple values', async () => {
      await store.put('foo', {v1: 10, v2: '10'});
      await store.incrementMulti('foo', {v1: 1, v2: -10, v3: 10, v4: 0});
      expect(await store.get('foo')).toEqual({v1: 11, v2: 0, v3: 10, v4: 0});
    });
  });

  describe('shift', () => {
    it('shifts a value off an existing array', async () => {
      await store.put('foo', {v1: [2, 3]});
      expect(await store.shift('foo', 'v1')).toEqual(2);
      expect(await store.get('foo')).toEqual({v1: [3]});
    });

    it('returns undefiend for empty arrays/values', async () => {
      await store.put('foo', {v1: []});
      expect(await store.shift('foo', 'v1')).toEqual(undefined);
      expect(await store.shift('foo', 'v2')).toEqual(undefined);
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.shift('foo', 'v1')).rejects.toThrow(Error);
      await expect(store.shift('foo', 'v2')).rejects.toThrow(Error);
      await expect(store.shift('foo', 'v3')).rejects.toThrow(Error);
    });
  });

  describe('shiftMulti', () => {
    it('shifts multiple values off a existing arrays', async () => {
      await store.put('foo', {v1: [2, 3], v2: [4, 5]});
      expect(await store.shiftMulti('foo', {v1: 1, v2: 2})).toEqual({v1: [2], v2: [4, 5]});
      expect(await store.get('foo')).toEqual({v1: [3], v2: []});
    });
  });

  describe('unshift', () => {
    it('unshifts a value onto an existing array', async () => {
      await store.put('foo', {v1: [2, 3]});
      await store.unshift('foo', 'v1', 1);
      expect(await store.get('foo')).toEqual({v1: [1, 2, 3]});
    });

    it('creates an array for missing values', async () => {
      await store.delete('foo');
      await store.unshift('foo', 'v1', 'one');
      expect(await store.get('foo')).toEqual({v1: ['one']});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.unshift('foo', 'v1', 0)).rejects.toThrow(Error);
      await expect(store.unshift('foo', 'v2', 0)).rejects.toThrow(Error);
      await expect(store.unshift('foo', 'v3', 0)).rejects.toThrow(Error);
    });
  });

  describe('unshiftMulti', () => {
    it('unshifts multiple values onto arrays', async () => {
      await store.put('foo', {v1: [2, 3], v2: [4, 5]});
      await store.unshiftMulti('foo', {v1: [1], v2: [2, 3], v3: [{foo: 'foo'} as any]});
      expect(await store.get('foo')).toEqual({v1: [1, 2, 3], v2: [2, 3, 4, 5], v3: [{foo: 'foo'}]});
    });
  });

  describe('peek', () => {
    it('peeks a value at the front an existing array', async () => {
      await store.put('foo', {v1: [2, 3]});
      expect(await store.peek('foo', 'v1')).toEqual(2);
      expect(await store.get('foo')).toEqual({v1: [2, 3]});
    });

    it('returns undefined for missing values', async () => {
      await store.delete('foo');
      expect(await store.peek('foo', 'v1')).toEqual(undefined);
      expect(await store.get('foo')).toEqual({});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.peek('foo', 'v1')).rejects.toThrow(Error);
      await expect(store.peek('foo', 'v2')).rejects.toThrow(Error);
      await expect(store.peek('foo', 'v3')).rejects.toThrow(Error);
    });
  });

  describe('peekMulti', () => {
    it('peeks one or more values from multiple arrays', async () => {
      await store.put('foo', {v1: [2, 3], v2: [4, 5]});
      expect(await store.peekMulti('foo', {v1: 1, v2: 3, v3: 1})).toEqual({v1: [2], v2: [4, 5], v3: []});
      expect(await store.get('foo')).toEqual({v1: [2, 3], v2: [4, 5]});
    });
  });

  describe('append', () => {
    it('appends a value onto an existing array', async () => {
      await store.put('foo', {v1: [2, 3]});
      await store.append('foo', 'v1', 4);
      expect(await store.get('foo')).toEqual({v1: [2, 3, 4]});
    });

    it('creates an array for missing values', async () => {
      await store.delete('foo');
      await store.append('foo', 'v1', 'one');
      expect(await store.get('foo')).toEqual({v1: ['one']});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.append('foo', 'v1', 0)).rejects.toThrow(Error);
      await expect(store.append('foo', 'v2', 0)).rejects.toThrow(Error);
      await expect(store.append('foo', 'v3', 0)).rejects.toThrow(Error);
    });
  });

  describe('appendMulti', () => {
    it('appends multiple values onto arrays', async () => {
      await store.put('foo', {v1: [2, 3], v2: [4, 5]});
      await store.appendMulti('foo', {v1: [4], v2: [6, 7], v3: [{foo: 'foo'} as any]});
      expect(await store.get('foo')).toEqual({v1: [2, 3, 4], v2: [4, 5, 6, 7], v3: [{foo: 'foo'}]});
    });
  });

  describe('addNumber', () => {
    it('adds a number to a number set', async () => {
      await store.put('foo', {v1: [2, 3]});
      expect(await store.addNumber('foo', 'v1', 4)).toBeTruthy();
      expect(await store.addNumber('foo', 'v1', 4)).toBeFalsy();
      expect(await store.get('foo')).toEqual({v1: [2, 3, 4]});
    });

    it('creates a new set for missing values', async () => {
      await store.delete('foo');
      expect(await store.addNumber('foo', 'v1', 1)).toBeTruthy();
      expect(await store.get('foo')).toEqual({v1: [1]});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.addNumber('foo', 'v1', 0)).rejects.toThrow(Error);
      await expect(store.addNumber('foo', 'v2', 0)).rejects.toThrow(Error);
      await expect(store.addNumber('foo', 'v3', 0)).rejects.toThrow(Error);
    });
  });

  describe('addNumberMulti', () => {
    it('adds multiple values to number sets', async () => {
      await store.put('foo', {v1: [2, 3], v2: [4, 5]});
      expect(await store.addNumberMulti('foo', {v1: [2, 4], v2: [6, 7], v3: [1]})).toEqual({
        v1: new NumberSet([4]),
        v2: new NumberSet([6, 7]),
        v3: new NumberSet([1])
      });
      expect(await store.get('foo')).toEqual({
        v1: [2, 3, 4],
        v2: [4, 5, 6, 7],
        v3: [1]
      });
    });
  });

  describe('removeNumber', () => {
    it('removes a number from a number set', async () => {
      await store.put('foo', {v1: [2, 3]});
      expect(await store.removeNumber('foo', 'v1', 2)).toBeTruthy();
      expect(await store.removeNumber('foo', 'v1', 2)).toBeFalsy();
      expect(await store.get('foo')).toEqual({v1: [3]});
    });

    it('returns false when there is no set to remove from', async () => {
      await store.delete('foo');
      expect(await store.removeNumber('foo', 'v1', 1)).toBeFalsy();
      expect(await store.get('foo')).toEqual({});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.removeNumber('foo', 'v1', 0)).rejects.toThrow(Error);
      await expect(store.removeNumber('foo', 'v2', 0)).rejects.toThrow(Error);
      await expect(store.removeNumber('foo', 'v3', 0)).rejects.toThrow(Error);
    });
  });

  describe('removeNumberMulti', () => {
    it('removes multiple values from number sets', async () => {
      await store.put('foo', {v1: [2, 3], v2: [4, 5]});
      expect(await store.removeNumberMulti('foo', {v1: [2, 4], v2: [4, 5], v3: [1]})).toEqual({
        v1: new NumberSet([2]),
        v2: new NumberSet([4, 5]),
        v3: new NumberSet([])
      });
      expect(await store.get('foo')).toEqual({
        v1: [3],
        v2: []
      });
    });
  });

  describe('hasNumber', () => {
    it('checks if a number exists in a set', async () => {
      await store.put('foo', {v1: [2, 3]});
      expect(await store.hasNumber('foo', 'v1', 2)).toBeTruthy();
      expect(await store.hasNumber('foo', 'v1', 4)).toBeFalsy();
      expect(await store.hasNumber('foo', 'v2', 4)).toBeFalsy();
      expect(await store.get('foo')).toEqual({v1: [2, 3]});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.hasNumber('foo', 'v1', 0)).rejects.toThrow(Error);
      await expect(store.hasNumber('foo', 'v2', 0)).rejects.toThrow(Error);
      await expect(store.hasNumber('foo', 'v3', 0)).rejects.toThrow(Error);
    });
  });

  describe('hasNumberMulti', () => {
    it('checks if multiple numbers exist in sets', async () => {
      await store.put('foo', {v1: [2, 3], v2: [4, 5]});
      expect(await store.hasNumberMulti('foo', {v1: [2, 4], v2: [4, 5], v3: [1]})).toEqual({
        v1: new NumberSet([2]),
        v2: new NumberSet([4, 5]),
        v3: new NumberSet([])
      });
      expect(await store.get('foo')).toEqual({v1: [2, 3], v2: [4, 5]});
    });
  });

  describe('addString', () => {
    it('adds a string to a string set', async () => {
      await store.put('foo', {v1: ['two', 'three']});
      expect(await store.addString('foo', 'v1', 'four')).toBeTruthy();
      expect(await store.addString('foo', 'v1', 'four')).toBeFalsy();
      expect(await store.get('foo')).toEqual({v1: ['two', 'three', 'four']});
    });

    it('creates a new set for missing values', async () => {
      await store.delete('foo');
      expect(await store.addString('foo', 'v1', 'one')).toBeTruthy();
      expect(await store.get('foo')).toEqual({v1: ['one']});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.addString('foo', 'v1', 'zero')).rejects.toThrow(Error);
      await expect(store.addString('foo', 'v2', 'zero')).rejects.toThrow(Error);
      await expect(store.addString('foo', 'v3', 'zero')).rejects.toThrow(Error);
    });
  });

  describe('addStringMulti', () => {
    it('adds multiple values to string sets', async () => {
      await store.put('foo', {v1: ['two', 'three'], v2: ['four', 'five']});
      expect(await store.addStringMulti('foo', {v1: ['two', 'four'], v2: ['six', 'seven'], v3: ['one']})).toEqual({
        v1: new StringSet(['four']),
        v2: new StringSet(['six', 'seven']),
        v3: new StringSet(['one'])
      });
      expect(await store.get('foo')).toEqual({
        v1: ['two', 'three', 'four'],
        v2: ['four', 'five', 'six', 'seven'],
        v3: ['one']
      });
    });
  });

  describe('removeString', () => {
    it('removes a string from a string set', async () => {
      await store.put('foo', {v1: ['two', 'three']});
      expect(await store.removeString('foo', 'v1', 'two')).toBeTruthy();
      expect(await store.removeString('foo', 'v1', 'two')).toBeFalsy();
      expect(await store.get('foo')).toEqual({v1: ['three']});
    });

    it('returns false when there is no set to remove from', async () => {
      await store.delete('foo');
      expect(await store.removeString('foo', 'v1', 'one')).toBeFalsy();
      expect(await store.get('foo')).toEqual({});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.removeString('foo', 'v1', 'zero')).rejects.toThrow(Error);
      await expect(store.removeString('foo', 'v2', 'zero')).rejects.toThrow(Error);
      await expect(store.removeString('foo', 'v3', 'zero')).rejects.toThrow(Error);
    });
  });

  describe('removeStringMulti', () => {
    it('removes multiple values from string sets', async () => {
      await store.put('foo', {v1: ['two', 'three'], v2: ['four', 'five']});
      expect(await store.removeStringMulti('foo', {v1: ['two', 'four'], v2: ['four', 'five'], v3: ['one']})).toEqual({
        v1: new StringSet(['two']),
        v2: new StringSet(['four', 'five']),
        v3: new StringSet([])
      });
      expect(await store.get('foo')).toEqual({
        v1: ['three'],
        v2: []
      });
    });
  });

  describe('hasString', () => {
    it('checks if a string exists in a set', async () => {
      await store.put('foo', {v1: ['two', 'three']});
      expect(await store.hasString('foo', 'v1', 'two')).toBeTruthy();
      expect(await store.hasString('foo', 'v1', 'four')).toBeFalsy();
      expect(await store.hasString('foo', 'v2', 'four')).toBeFalsy();
      expect(await store.get('foo')).toEqual({v1: ['two', 'three']});
    });

    it('throws appropriate errors for non-array data', async () => {
      await store.put('foo', {v1: 1, v2: '2', v3: {foo: 1}});
      await expect(store.hasString('foo', 'v1', 'zero')).rejects.toThrow(Error);
      await expect(store.hasString('foo', 'v2', 'zero')).rejects.toThrow(Error);
      await expect(store.hasString('foo', 'v3', 'zero')).rejects.toThrow(Error);
    });
  });

  describe('hasStringMulti', () => {
    it('checks if multiple strings exist in sets', async () => {
      await store.put('foo', {v1: ['two', 'three'], v2: ['four', 'five']});
      expect(await store.hasStringMulti('foo', {v1: ['two', 'four'], v2: ['four', 'five'], v3: ['one']})).toEqual({
        v1: new StringSet(['two']),
        v2: new StringSet(['four', 'five']),
        v3: new StringSet([])
      });
      expect(await store.get('foo')).toEqual({v1: ['two', 'three'], v2: ['four', 'five']});
    });
  });
});
