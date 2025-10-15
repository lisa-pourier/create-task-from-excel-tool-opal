import {CasError} from './CasError';

type PatchUpdater<T> = (previous: T, options: {ttl?: number}) => T;

interface CasEntry<T> {
  cas: number;
  expires?: number;
  value: T;
}

interface StoreEntry<T> {
  cas: number;
  ttl?: number;
  value: T;
}

/**
 * Simulates access to a remote data store by performing operations asynchronously.
 * Used as a backend for local dev and testing to the local stores
 */
export class LocalAsyncStoreBackend<T> {
  private data: {[key: string]: CasEntry<T>};
  private hasChanges = false;
  private changeTimer?: NodeJS.Timeout;

  /**
   * @param avgDelay Average delay per request in miliseconds
   */
  public constructor(
    private avgDelay = 0,
    sourceData?: {[key: string]: CasEntry<T>},
    private changeHandler?: (data: {[key: string]: CasEntry<T>}) => Promise<void>
  ) {
    this.data = sourceData || {};
  }

  public async get<O extends T>(key: string): Promise<StoreEntry<O>> {
    return this.async(() => {
      const entry = this.data[key];
      const epoch = this.epoch();
      if (entry && !this.expired(entry.expires)) {
        return this.translateExpiresToTTL(entry, epoch);
      }
      return {cas: 0, value: {}};
    });
  }

  public async put<O extends T>(key: string, value: O, ttl?: number, cas?: number): Promise<O> {
    return this.async(() => {
      const entry = this.data[key];
      if (entry && !this.expired(entry.expires)) {
        if (this.check(entry.cas, cas)) {
          entry.cas++;
          const previous = entry.value;
          entry.value = this.copy(value);
          if (ttl != null) {
            entry.expires = this.epoch() + ttl;
          }
          this.onChange();
          return previous;
        } else {
          throw new CasError();
        }
      } else {
        this.data[key] = {
          cas: cas ?? 0,
          expires: ttl && this.epoch() + ttl,
          value: this.copy(value)
        };
        this.onChange();
        return {};
      }
    });
  }

  /**
   * Normal KV patch is not atomic without CAS and potentially retries. This implementation
   * is specifically for operations that are atomic on the data store side, such as mutating a list.
   * @param key to update
   * @param updater callback to perform atomic update
   */
  public async atomicPatch<O extends T>(key: string, updater: PatchUpdater<O>): Promise<O> {
    return this.async(() => {
      const entry = this.data[key];
      const epoch = this.epoch();
      if (entry && !this.expired(entry.expires)) {
        // Note: checking the CAS value is not required here because node is single threaded.
        // We can guarantee nothing has changed between now and when we set the value after calling the updater
        const options = {
          ttl: entry.expires ? entry.expires - epoch : undefined
        };
        entry.value = this.copy(updater(entry.value as O, options));
        entry.cas++;
        entry.expires = options.ttl == null ? undefined : epoch + options.ttl;
        this.onChange();
      } else {
        const options = {ttl: undefined};
        let value = {} as O;
        value = this.copy(updater(value, options));
        this.data[key] = {
          cas: 0,
          expires: options.ttl == null ? undefined : epoch + Number(options.ttl),
          value: this.copy(value)
        };
        this.onChange();
      }
      return this.translateExpiresToTTL(this.data[key], epoch);
    });
  }

  public async delete<O extends T>(key: string): Promise<O> {
    return this.async(() => {
      let value: O | any = {};
      if (this.data[key] && !this.expired(this.data[key].expires)) {
        value = this.data[key].value as O;
      }
      delete this.data[key];
      this.onChange();
      return value;
    });
  }

  public async exists(key: string): Promise<boolean> {
    return this.async(() => {
      const entry = this.data[key];
      return !!(entry && !this.expired(entry.expires));
    });
  }

  public reset() {
    this.data = {};
    this.onChange();
  }

  private expired(time?: number) {
    return time && time < this.epoch();
  }

  private check(cas: number, expected?: number) {
    return expected === undefined || cas === expected;
  }

  private async async<R>(operation: () => any): Promise<R> {
    return new Promise((resolve, reject) =>
      setTimeout(
        () => {
          try {
            resolve(operation());
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        },
        this.avgDelay * (0.5 + Math.random())
      )
    );
  }

  private copy<O>(value: O): O {
    return JSON.parse(JSON.stringify(value));
  }

  private translateExpiresToTTL<O>(entry: CasEntry<O>, epoch: number): StoreEntry<O> {
    return {
      cas: entry.cas,
      value: this.copy(entry.value),
      ttl: entry.expires ? entry.expires - epoch : undefined
    };
  }

  private epoch() {
    return Math.floor(new Date().getTime() / 1000);
  }

  private onChange() {
    this.hasChanges = true;
    if (!this.changeTimer && this.changeHandler) {
      this.changeTimer = setTimeout(
        async () => {
          if (this.hasChanges && this.changeHandler) {
            this.hasChanges = false;
            await this.changeHandler(this.data);
          }
          this.changeTimer = undefined;
          if (this.hasChanges) {
            this.onChange();
          }
        },
        process.env.ZAIUS_ENV === 'test' ? 0 : 10
      );
    }
  }
}
