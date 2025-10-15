import {FunctionApi} from './FunctionApi';
import {LocalFunctionApi} from './LocalFunctionApi';

let functionApi = new LocalFunctionApi();

function getFunctionApi(): FunctionApi {
  return global.ocpContextStorage?.getStore()?.ocpRuntime.functionApi || functionApi;
}

/**
 * @hidden
 */
export const initializeFunctionApi = (api: FunctionApi) => {
  functionApi = api;
};

/**
 * The functions api implementation
 */
export const functions: FunctionApi = {
  getEndpoints(installId?: number): Promise<{[name: string]: string}> {
    return getFunctionApi().getEndpoints(installId);
  },

  getGlobalEndpoints(): Promise<{[name: string]: string}> {
    return getFunctionApi().getGlobalEndpoints();
  },

  getAuthorizationGrantUrl(): string {
    return getFunctionApi().getAuthorizationGrantUrl();
  }
};
