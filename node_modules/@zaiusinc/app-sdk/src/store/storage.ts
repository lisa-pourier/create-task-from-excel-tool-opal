import {BaseKVStore} from './BaseKVStore';
import {KVStore} from './KVStore';
import {LocalAsyncStoreBackend} from './LocalAsyncStoreBackend';
import {LocalKVStore} from './LocalKVStore';
import {LocalStore} from './LocalStore';

let settingsStore: BaseKVStore = new LocalStore(new LocalAsyncStoreBackend());
let secretsStore: BaseKVStore = new LocalStore(new LocalAsyncStoreBackend());
let kvStore: KVStore = new LocalKVStore(new LocalAsyncStoreBackend());
let sharedKvStore: KVStore = new LocalKVStore(new LocalAsyncStoreBackend());

export function resetLocalStores() {
  resetLocalSettingsStore();
  resetLocalSecretsStore();
  resetLocalKvStore();
  resetLocalSharedKvStore();
}

export function resetLocalSettingsStore() {
  if (storage.settings instanceof LocalStore) {
    storage.settings.reset();
  } else {
    throw new Error('Attempting to reset non-local store');
  }
}

export function resetLocalSecretsStore() {
  if (storage.secrets instanceof LocalStore) {
    storage.secrets.reset();
  } else {
    throw new Error('Attempting to reset non-local store');
  }
}

export function resetLocalKvStore() {
  if (storage.kvStore instanceof LocalKVStore) {
    storage.kvStore.reset();
  } else {
    throw new Error('Attempting to reset non-local store');
  }
}

export function resetLocalSharedKvStore() {
  if (storage.sharedKvStore instanceof LocalKVStore) {
    storage.sharedKvStore.reset();
  } else {
    throw new Error('Attempting to reset non-local store');
  }
}

/**
 * @hidden
 */
export const initializeStores = (config: InitialStores) => {
  settingsStore = config.settings;
  secretsStore = config.secrets;
  kvStore = config.kvStore;
  sharedKvStore = config.sharedKvStore;
};

/**
 * @hidden
 */
export interface InitialStores {
  settings: BaseKVStore;
  secrets: BaseKVStore;
  kvStore: KVStore;
  sharedKvStore: KVStore;
}

/**
 * Namespace for accessing storage apis
 */
export const storage = {
  /**
   * The settings store
   */
  get settings() {
    return global.ocpContextStorage?.getStore()?.ocpRuntime?.settingsStore || settingsStore;
  },
  /**
   * The secrets store
   */
  get secrets() {
    return global.ocpContextStorage?.getStore()?.ocpRuntime?.secretsStore || secretsStore;
  },
  /**
   * The key-value store
   */
  get kvStore() {
    return global.ocpContextStorage?.getStore()?.ocpRuntime?.kvStore || kvStore;
  },
  /**
   * The shared key-value store
   */
  get sharedKvStore() {
    return global.ocpContextStorage?.getStore()?.ocpRuntime?.sharedKvStore || sharedKvStore;
  }
};
