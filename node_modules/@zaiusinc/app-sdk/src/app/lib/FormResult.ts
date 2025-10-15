export type Intent = 'info' | 'success' | 'warning' | 'danger';

export abstract class FormResult {
  protected errors: {[field: string]: string[]} = {};
  protected toasts: Array<{intent: Intent; message: string}> = [];

  /**
   * Display a toast to user, such as, "Successfully authenticated with <Integration>" or
   * "Authentication failed, please check your credentials and try again."
   * @param intent one of the supported intents that will affect how the toast is displayed
   * @param message to display in the toast
   */
  public addToast(intent: Intent, message: string): this {
    this.toasts.push({intent, message});
    return this;
  }

  /**
   * @hidden
   */
  protected addErrorInternal(key: string, error: string): this {
    if (!this.errors[key]) {
      this.errors[key] = [error];
    } else {
      this.errors[key].push(error);
    }
    return this;
  }
}
