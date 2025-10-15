export interface Notifier {
  /**
   * Create an informational notification.
   * @param activity The activity, must not be empty
   * @param title The title, must not be empty
   * @param summary The activity summary, must not be empty
   * @param [details] The activity details
   */
  info(activity: string, title: string, summary: string, details?: string): Promise<void>;

  /**
   * Create a success notification.
   * @param activity The activity, must not be empty
   * @param title The title, must not be empty
   * @param summary The activity summary, must not be empty
   * @param [details] The activity details
   */
  success(activity: string, title: string, summary: string, details?: string): Promise<void>;

  /**
   * Create a warning notification.
   * @param activity The activity, must not be empty
   * @param title The title, must not be empty
   * @param summary The activity summary, must not be empty
   * @param [details] The activity details
   */
  warn(activity: string, title: string, summary: string, details?: string): Promise<void>;

  /**
   * Create an error notification.
   * @param activity The activity, must not be empty
   * @param title The title, must not be empty
   * @param summary The activity summary, must not be empty
   * @param [details] The activity details
   */
  error(activity: string, title: string, summary: string, details?: string): Promise<void>;
}
