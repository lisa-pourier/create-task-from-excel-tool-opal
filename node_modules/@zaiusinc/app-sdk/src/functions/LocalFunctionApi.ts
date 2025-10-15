import {FunctionApi, FunctionEndpoints} from './FunctionApi';

/**
 * @hidden
 * A stub of the function api
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalFunctionApi implements FunctionApi {
  public getEndpoints(_installId?: number): Promise<FunctionEndpoints> {
    throw new Error('Method not implemented.');
  }

  public getGlobalEndpoints(): Promise<FunctionEndpoints> {
    throw new Error('Method not implemented.');
  }

  public getAuthorizationGrantUrl(): string {
    throw new Error('Method not implemented.');
  }
}
