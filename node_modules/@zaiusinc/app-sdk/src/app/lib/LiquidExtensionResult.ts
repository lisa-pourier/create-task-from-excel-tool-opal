/**
 * @hidden
 */
export interface LiquidExtensionResponse {
  output?: string;
  error?: string;
}

/**
 * Result of {@link LiquidExtension.perform}. Clients should use the static {@link success} and {@link error} helper
 * methods (as opposed to constructing manually).
 */
export class LiquidExtensionResult {
  /**
   * Builds a success response.
   * @param output the resulting output (must be JSON-serializable)
   */
  public static success(output: any) {
    return new LiquidExtensionResult(true, output);
  }

  /**
   * Builds an error response.
   * @param message
   */
  public static error(message: string) {
    return new LiquidExtensionResult(false, undefined, message);
  }

  /**
   * @hidden
   * Use the static helper methods instead.
   */
  public constructor(
    private success: boolean,
    private output?: any,
    private message?: string
  ) {}

  /**
   * @hidden
   * Used internally to get the complete response
   */
  public getResponse(): LiquidExtensionResponse {
    return {
      output: this.success ? JSON.stringify(this.output === undefined ? null : this.output) : undefined,
      error: this.success ? undefined : this.message || 'unknown'
    };
  }
}
