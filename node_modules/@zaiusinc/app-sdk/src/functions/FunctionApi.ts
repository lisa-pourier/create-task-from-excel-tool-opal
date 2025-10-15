/**
 * Error thrown when function api interaction fails
 */
export class FunctionApiError extends Error {}

/**
 * Hash of function to name to endpoint url
 */
export interface FunctionEndpoints {
  [name: string]: string;
}

/**
 * Provides access to function endpoint urls
 */
export interface FunctionApi {
  /**
   * Retrieves the current set of available function endpoints urls. The urls do not contain a trailing slash.
   *
   * @param installId the id of the install to look up, defaults to current install.
   * Note: From global functions, `installId` must be provided. For other uses it should be left undefined.
   * @return hash of function name to endpoint url
   */
  getEndpoints(installId?: number): Promise<FunctionEndpoints>;

  /**
   * Retrieves the set of available global function endpoints urls for this app.
   * The urls do not contain a trailing slash.
   *
   * @return hash of function name to endpoint url
   */
  getGlobalEndpoints(): Promise<FunctionEndpoints>;

  /**
   * Retrieves the base url for an authorization grant. This can be used as the returning redirect url for an OAuth
   * request to an external service. The url does not contain a trailing slash.
   *
   * @return authorization grant url
   */
  getAuthorizationGrantUrl(): string;
}
