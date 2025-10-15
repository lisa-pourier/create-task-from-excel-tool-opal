import {logger} from '../logging';
import {BaseKVStore, PatchUpdater, ValueHash} from './BaseKVStore';
import {CasError} from './CasError';
import {LocalAsyncStoreBackend} from './LocalAsyncStoreBackend';

/**
 * @hidden
 * A stub of the key value store
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalStore implements BaseKVStore<ValueHash, true> {
  public constructor(private store: LocalAsyncStoreBackend<ValueHash>) {}

  public reset() {
    this.store.reset();
  }

  public async get<T extends ValueHash>(key: string, fields?: string[]): Promise<T> {
    return this.filter((await this.store.get(key)).value || {}, fields) as T;
  }

  public async put(key: string, value?: ValueHash): Promise<true> {
    if (value) {
      await this.store.put(key, value);
    } else {
      await this.store.delete(key);
    }
    return true;
  }

  public async patch<T extends ValueHash>(key: string, value?: ValueHash | PatchUpdater): Promise<T> {
    if (typeof value === 'function') {
      return (await this.patchWithRetry(key, value)) as T;
    } else {
      return await this.patchWithRetry(key, (previous) => Object.assign(previous, value));
    }
  }

  public async delete(key: string, fields?: string[]): Promise<true> {
    if (fields) {
      await this.patchWithRetry(key, (previous) => {
        fields.forEach((f) => delete previous[f]);
        return previous;
      });
    } else {
      await this.store.delete(key);
    }
    return true;
  }

  public async exists(key: string): Promise<boolean> {
    return await this.store.exists(key);
  }

  private filter(result: ValueHash, fields?: string[]) {
    if (fields) {
      const copy: ValueHash = {};
      fields.forEach((f) => (copy[f] = result[f]));
      return copy;
    }
    return result;
  }

  private async patchWithRetry<T extends ValueHash>(key: string, updater: PatchUpdater<T>, retries = 5): Promise<T> {
    const stored = await this.store.get<T>(key);
    const previous = JSON.stringify(stored.value);
    const update = updater(stored.value);
    try {
      await this.store.put(key, update, undefined, stored.cas);
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
