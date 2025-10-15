import {logger} from '../logging';
import {Value} from './BaseKVStore';
import {CasError} from './CasError';
import {KVHash, KVPatchUpdater, KVRowOptions, KVStore, KVValue, MultiValue} from './KVStore';
import {LocalAsyncStoreBackend} from './LocalAsyncStoreBackend';
import {NumberSet} from './NumberSet';
import {StringSet} from './StringSet';

function filterFields(result: any, fields?: string[]) {
  if (fields && fields.length > 0) {
    const filtered: any = {};
    fields.forEach((f) => (filtered[f] = result[f]));
    return filtered;
  }
  return result;
}

/**
 * @hidden
 * A stub of the key value store
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalKVStore implements KVStore {
  public constructor(private store: LocalAsyncStoreBackend<KVHash>) {}

  public reset() {
    this.store.reset();
  }

  public async get<T extends KVHash>(key: string, fields?: string[]): Promise<T> {
    return filterFields((await this.store.get(key)).value, fields);
  }

  public async put<T extends KVHash>(key: string, value: T, options?: KVRowOptions): Promise<T> {
    return (await this.store.put(key, value, options?.ttl)) || {};
  }

  public async patch<T extends KVHash>(key: string, value: T | KVPatchUpdater<T>, options?: KVRowOptions): Promise<T> {
    if (typeof value === 'function') {
      return await this.patchWithRetry(key, value);
    } else {
      return await this.patchWithRetry(key, (previous, opts) => {
        opts.ttl = options?.ttl;
        return Object.assign(previous, value);
      });
    }
  }

  public async delete<T extends KVHash>(key: string, fields?: string[]): Promise<T> {
    if (fields) {
      return await this.store.atomicPatch(key, (value) => {
        for (const field of fields) {
          delete value[field];
        }
        return value;
      });
    } else {
      return await this.store.delete<T>(key);
    }
  }

  public async exists(key: string): Promise<boolean> {
    return await this.store.exists(key);
  }

  public async increment(key: string, field: string, amount = 1): Promise<number> {
    return (await this.incrementMulti(key, {[field]: amount}))[key];
  }

  public async incrementMulti(
    key: string,
    fieldAmounts: {[field: string]: number}
  ): Promise<{[field: string]: number}> {
    return filterFields(
      await this.store.atomicPatch(key, (previous, _options) => {
        const fields = Object.keys(fieldAmounts);
        for (const field of fields) {
          if (typeof fieldAmounts[field] !== 'number') {
            throw new Error(`Cannot increment by non-numeric value for field ${key}.${field}`);
          }
          const value = previous[field];
          if (value == null) {
            previous[field] = fieldAmounts[field];
          } else if (typeof value === 'number' || Number(value).toString() === value) {
            previous[field] = Number(value) + fieldAmounts[field];
          } else {
            throw new Error(`Cannot increment non-numeric value at ${key}.${field}. Value is type ${typeof value}.`);
          }
        }
        return previous;
      }),
      Object.keys(fieldAmounts)
    );
  }

  public async shift<T extends Value>(key: string, field: string): Promise<T | undefined> {
    const result = await this.shiftMulti(key, {[field]: 1});
    return result[field] ? (result[field][0] as T) : undefined;
  }

  public async shiftMulti<T extends KVValue>(key: string, fieldCounts: MultiValue<number>): Promise<MultiValue<T[]>> {
    const results: any = {};
    await this.performArrayOperation<number>(key, fieldCounts, (current, field) => {
      if (current == null) {
        results[field] = [];
      } else if (Array.isArray(current)) {
        results[field] = current.splice(0, fieldCounts[field]);
      } else {
        throw new Error(`Cannot shift from non-array value at ${key}.${field}. Value is type ${typeof current}.`);
      }
      return current;
    });
    return results;
  }

  public async unshift<T extends KVValue>(key: string, field: string, value: T): Promise<void> {
    return await this.unshiftMulti(key, {[field]: [value]});
  }

  public async unshiftMulti<T extends KVValue>(key: string, fieldValues: MultiValue<T[]>): Promise<void> {
    await this.performArrayOperation<T[]>(key, fieldValues, (current, field) => {
      if (current == null) {
        current = fieldValues[field];
      } else if (Array.isArray(current)) {
        current.unshift(...fieldValues[field]);
      } else {
        throw new Error(`Cannot unshift into non-array value at ${key}.${field}. Value is type ${typeof current}.`);
      }
      return current;
    });
  }

  public async peek<T extends KVValue>(key: string, field: string): Promise<T | undefined> {
    const result = await this.peekMulti(key, {[field]: 1});
    return result[field] ? (result[field][0] as T) : undefined;
  }

  public async peekMulti<T extends KVValue>(key: string, fieldCounts: MultiValue<number>): Promise<MultiValue<T[]>> {
    const results: any = {};
    await this.performArrayOperation<number>(key, fieldCounts, (current, field) => {
      if (current == null) {
        results[field] = [];
      } else if (Array.isArray(current)) {
        results[field] = current.slice(0, fieldCounts[field]);
      } else {
        throw new Error(`Cannot peek non-array value at ${key}.${field}. Value is type ${typeof current}.`);
      }
      return current;
    });
    return results;
  }

  public async append<T extends KVValue>(key: string, field: string, value: T): Promise<void> {
    await this.appendMulti(key, {[field]: [value]});
  }

  public async appendMulti<T extends KVValue>(key: string, fieldValues: MultiValue<T[]>): Promise<void> {
    await this.performArrayOperation<T[]>(key, fieldValues, (current, field) => {
      if (!Array.isArray(fieldValues[field])) {
        throw new Error(`Cannot append non-array value provided for ${key}.${field}`);
      }
      if (!current) {
        current = [];
      }
      current.push(...fieldValues[field]);
      return current;
    });
  }

  public async addNumber(key: string, field: string, value: number): Promise<boolean> {
    return (await this.addNumberMulti(key, {[field]: [value]}))[field].has(value);
  }

  public async addNumberMulti(key: string, fieldValues: MultiValue<number[]>): Promise<MultiValue<NumberSet>> {
    const results: {[field: string]: NumberSet} = {};
    await this.performSetOperation<number>(key, fieldValues, (current, field) => {
      if (!current) {
        current = new Set();
      }
      results[field] = new NumberSet();
      for (const val of fieldValues[field]) {
        if (!current.has(val)) {
          current.add(val);
          results[field].add(val);
        }
      }
      return current;
    });
    return results;
  }

  public async removeNumber(key: string, field: string, value: number): Promise<boolean> {
    return (await this.removeNumberMulti(key, {[field]: [value]}))[field].has(value);
  }

  public async removeNumberMulti(key: string, fieldValues: MultiValue<number[]>): Promise<MultiValue<NumberSet>> {
    const results: {[field: string]: NumberSet} = {};
    await this.performSetOperation<number>(key, fieldValues, (current, field) => {
      results[field] = new NumberSet();
      for (const val of fieldValues[field]) {
        if (current?.delete(val)) {
          results[field].add(val);
        }
      }
      return current;
    });
    return results;
  }

  public async hasNumber(key: string, field: string, value: number): Promise<boolean> {
    return (await this.hasNumberMulti(key, {[field]: [value]}))[field].has(value);
  }

  public async hasNumberMulti(key: string, fieldValues: MultiValue<number[]>): Promise<MultiValue<NumberSet>> {
    const results: {[field: string]: NumberSet} = {};
    await this.performSetOperation<number>(key, fieldValues, (current, field) => {
      results[field] = new NumberSet();
      for (const val of fieldValues[field]) {
        if (current?.has(val)) {
          results[field].add(val);
        }
      }
      return current;
    });
    return results;
  }

  public async addString(key: string, field: string, value: string): Promise<boolean> {
    return (await this.addStringMulti(key, {[field]: [value]}))[field].has(value);
  }

  public async addStringMulti(key: string, fieldValues: MultiValue<string[]>): Promise<MultiValue<StringSet>> {
    const results: {[field: string]: StringSet} = {};
    await this.performSetOperation<string>(key, fieldValues, (current, field) => {
      if (!current) {
        current = new Set();
      }
      results[field] = new StringSet();
      for (const val of fieldValues[field]) {
        if (!current.has(val)) {
          current.add(val);
          results[field].add(val);
        }
      }
      return current;
    });
    return results;
  }

  public async removeString(key: string, field: string, value: string): Promise<boolean> {
    return (await this.removeStringMulti(key, {[field]: [value]}))[field].has(value);
  }

  public async removeStringMulti(key: string, fieldValues: MultiValue<string[]>): Promise<MultiValue<StringSet>> {
    const results: {[field: string]: StringSet} = {};
    await this.performSetOperation<string>(key, fieldValues, (current, field) => {
      results[field] = new StringSet();
      for (const val of fieldValues[field]) {
        if (current?.delete(val)) {
          results[field].add(val);
        }
      }
      return current;
    });
    return results;
  }

  public async hasString(key: string, field: string, value: string): Promise<boolean> {
    return (await this.hasStringMulti(key, {[field]: [value]}))[field].has(value);
  }

  public async hasStringMulti(key: string, fieldValues: MultiValue<string[]>): Promise<MultiValue<StringSet>> {
    const results: {[field: string]: StringSet} = {};
    await this.performSetOperation<string>(key, fieldValues, (current, field) => {
      results[field] = new StringSet();
      for (const val of fieldValues[field]) {
        if (current?.has(val)) {
          results[field].add(val);
        }
      }
      return current;
    });
    return results;
  }

  private async performArrayOperation<T>(
    key: string,
    fieldValues: MultiValue<T>,
    operation: (current: KVValue[] | undefined, field: string) => KVValue[] | undefined
  ) {
    await this.store.atomicPatch<KVHash>(key, (current, _options) => {
      const fields = Object.keys(fieldValues);
      for (const field of fields) {
        const value = current[field];
        if (value == null || Array.isArray(value)) {
          const update = operation(value == null ? undefined : value, field);
          current[field] = update ? Array.from(update) : undefined;
        } else {
          throw new Error(`Cannot operate on non-array value at ${key}.${field}. Value is type ${typeof value}.`);
        }
      }
      return current;
    });
  }

  private async performSetOperation<T extends string | number>(
    key: string,
    fieldValues: MultiValue<string[] | number[]>,
    operation: (current: Set<T> | undefined, field: string) => Set<T> | undefined
  ) {
    await this.store.atomicPatch<KVHash>(key, (current, _options) => {
      const fields = Object.keys(fieldValues);
      for (const field of fields) {
        if (!Array.isArray(fieldValues[field])) {
          throw new Error(`Cannot operate with non-array value provided for ${key}.${field}`);
        }
        const value = current[field];
        if (value == null || Array.isArray(value)) {
          const update = operation(value == null ? undefined : new Set<T>(value as T[]), field);
          current[field] = update ? Array.from(update) : undefined;
        } else {
          throw new Error(`Cannot operate on non-array value at ${key}.${field}. Value is type ${typeof value}.`);
        }
      }
      return current;
    });
  }

  private async patchWithRetry<T extends KVHash>(key: string, updater: KVPatchUpdater<T>, retries = 5): Promise<T> {
    const stored = await this.store.get<T>(key);
    const previous = JSON.stringify(stored.value);
    const options = {ttl: stored.ttl};
    const update = updater(stored.value, options);
    try {
      await this.store.put(key, update, options.ttl, stored.cas);
      return JSON.parse(previous);
    } catch (e) {
      if (e instanceof CasError) {
        if (retries > 0) {
          return this.patchWithRetry(key, updater, retries - 1);
        }
        throw new Error(`Failed to update key ${key}. CAS retries exhausted.`);
      } else {
        logger.error(e);
      }
      throw new Error(`Failed to update key ${key}`);
    }
  }
}
