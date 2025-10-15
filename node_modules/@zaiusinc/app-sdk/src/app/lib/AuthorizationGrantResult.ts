import {FormResult} from './FormResult';
import {LifecycleSettingsResponse} from './LifecycleSettingsResult';

/**
 * Used to compose a response to the onAuthorizationGrant lifecycle request
 */
export class AuthorizationGrantResult extends FormResult {
  /**
   * @param redirectSection the section of the settings form the user will be redirected to
   */
  public constructor(private redirectSection: string) {
    super();
  }

  /**
   * Add an error to display to the user for a particular form field (implicitly scoped to the redirected section)
   * @param field key to display the error under, as defined in the form schema
   * @param error message to display to the user
   */
  public addError(field: string, error: string): this {
    return this.addErrorInternal(`${this.redirectSection}.${field}`, error);
  }

  /**
   * @hidden
   * Used internally to get the complete response
   */
  public getResponse(): LifecycleSettingsResponse {
    return {
      errors: this.errors,
      toasts: this.toasts,
      redirect: this.redirectSection,
      redirectMode: 'settings'
    };
  }
}
