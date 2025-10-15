import {OCPContext} from '../types';
import {AppManifest} from './types';

export interface AppContext {
  manifest: AppManifest;
  trackerId: string;
  installId: number;
  account?: {
    organizationId: string;
    instanceId: string;
  };
}

let currentContext: AppContext;

export function setContext(context: AppContext) {
  currentContext = context;
}

function getOCPContext(): OCPContext | undefined {
  return global.ocpContextStorage?.getStore();
}

/**
 * Get the app context for the current request/job
 */
export function getAppContext(): AppContext {
  return getOCPContext()?.ocpRuntime.appContext || currentContext;
}

/**
 * Check if the current context is for a global function request
 */
export function isGlobalContext() {
  const appContext = getAppContext();
  return !!appContext && !(appContext.installId > 0);
}
