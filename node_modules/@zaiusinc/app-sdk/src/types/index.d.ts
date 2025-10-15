import {AsyncLocalStorage} from 'async_hooks';

import {AppContext} from '../app';
import {FunctionApi} from '../functions';
import {JobApi} from '../jobs';
import {LogContext} from '../logging';
import {Notifier} from '../notifications';
import {BaseKVStore, KVStore} from '../store';

export interface OCPContext {
  ocpRuntime: OCPRuntime;
}

export interface OCPRuntime {
  appContext: AppContext;
  settingsStore: BaseKVStore;
  secretsStore: BaseKVStore;
  kvStore: KVStore;
  sharedKvStore: KVStore;
  functionApi: FunctionApi;
  jobApi: JobApi;
  logLevel: LogLevel;
  logContext: LogContext;
  notifier: Notifier;
}

declare global {
  /* eslint-disable no-var */
  var ocpContextStorage: AsyncLocalStorage<OCPContext>;
}
