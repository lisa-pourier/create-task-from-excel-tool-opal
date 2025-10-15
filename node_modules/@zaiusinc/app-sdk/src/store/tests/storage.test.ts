import {AsyncLocalStorage} from 'async_hooks';
import 'jest';

import {
  BaseKVStore,
  initializeStores,
  LocalKVStore,
  resetLocalKvStore,
  resetLocalSecretsStore,
  resetLocalSettingsStore,
  resetLocalStores,
  storage
} from '..';
import {OCPContext} from '../../types';
import {LocalStore} from '../LocalStore';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
class SampleStore implements BaseKVStore {}

describe('storage', () => {
  function runWithAsyncLocalStore(code: () => void) {
    const ocpContextStorage = new AsyncLocalStorage<OCPContext>();
    global.ocpContextStorage = ocpContextStorage;

    const context = {
      ocpRuntime: {
        appContext: {} as any,
        functionApi: {} as any,
        jobApi: {} as any,
        logContext: {} as any,
        logLevel: {} as any,
        notifier: {} as any,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        secretsStore: new SampleStore(),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        settingsStore: new SampleStore(),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        kvStore: new SampleStore(),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        sharedKvStore: new SampleStore()
      }
    } as OCPContext;

    ocpContextStorage.run(context, code);
  }

  it('provides local stores if not configured', () => {
    expect(storage.secrets).toBeInstanceOf(LocalStore);
    expect(storage.settings).toBeInstanceOf(LocalStore);
    expect(storage.kvStore).toBeInstanceOf(LocalKVStore);
    expect(storage.sharedKvStore).toBeInstanceOf(LocalKVStore);
  });

  describe('stores configuration from async local storage', () => {
    it('uses stores provided in OCP runtime global variable', () => {
      runWithAsyncLocalStore(() => {
        expect(storage.secrets).toBeInstanceOf(SampleStore);
        expect(storage.settings).toBeInstanceOf(SampleStore);
        expect(storage.kvStore).toBeInstanceOf(SampleStore);
        expect(storage.sharedKvStore).toBeInstanceOf(SampleStore);
      });
    });
  });

  describe('resetLocalStores', () => {
    it('resets local stores', async () => {
      await storage.secrets.put('foo', {foo: 'foo'});
      await storage.settings.put('foo', {foo: 'foo'});
      await storage.kvStore.put('foo', {foo: 'foo'});

      resetLocalStores();

      expect(await storage.secrets.get('foo')).toEqual({});
      expect(await storage.settings.get('foo')).toEqual({});
      expect(await storage.kvStore.get('foo')).toEqual({});
    });
  });

  describe('initializeStores in module scope', () => {
    it('replaces the local stores with the provided stores', () => {
      initializeStores({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        secrets: new SampleStore(),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        settings: new SampleStore(),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        kvStore: new SampleStore()
      });

      expect(storage.secrets).toBeInstanceOf(SampleStore);
      expect(storage.settings).toBeInstanceOf(SampleStore);
      expect(storage.kvStore).toBeInstanceOf(SampleStore);
    });

    it('throws errors if you try to reset a non-local store', () => {
      expect(() => resetLocalSecretsStore()).toThrow();
      expect(() => resetLocalSettingsStore()).toThrow();
      expect(() => resetLocalKvStore()).toThrow();
    });
  });
});
