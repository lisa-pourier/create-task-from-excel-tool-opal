import {FormResult, Intent} from './FormResult';

/**
 * @hidden
 */
export interface ChannelContentResponse {
  errors?: {[ref: string]: string[]};
  toasts?: Array<{intent: Intent; message: string}>;
}

/**
 * Result of {@link Channel.validate} and {@link Channel.publish}.
 */
export class ChannelContentResult extends FormResult {
  /**
   * Add an error to display to the user for a particular form field.
   * @param form the type of content form that the error applies to (settings or template)
   * @param section the section within the form that the error applies to
   * @param field the field within the section that the error applies to
   * @param error message to display to the user
   */
  public addError(form: 'settings' | 'template', section: string, field: string, error: string): this {
    return this.addErrorInternal(`${form}.${section}.${field}`, error);
  }

  /**
   * @hidden
   * Used internally to get the complete response
   */
  public getResponse(): ChannelContentResponse {
    return {
      errors: this.errors,
      toasts: this.toasts
    };
  }
}
