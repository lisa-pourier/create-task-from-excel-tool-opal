import {LiquidExtensionResult} from './lib';

/**
 * Context info for a liquid extension call.
 */
export interface LiquidExtensionContext {
  /**
   * Whether this extension is being called during a preview, test send, and or live campaign run. This may be important
   * for preventing external side effects, etc.
   */
  mode: 'preview' | 'test' | 'live';
}

/**
 * Basic interface describing inputs to a liquid extension.
 */
export interface LiquidExtensionInput {
  [name: string]: any;
}

/**
 * Defines the interface of a liquid extension, which allows an app to expose custom functionality into the content
 * rendering pipeline.
 */
export abstract class LiquidExtension {
  /**
   * Performs the liquid extension.
   * @async
   * @param context of the liquid call
   * @param input any input data provided by the liquid template
   * @return either successful output (via {@link LiquidExtensionResult.success}) or an error message
   *         (via {@link LiquidExtensionResult.error})
   */
  public abstract perform(context: LiquidExtensionContext, input: LiquidExtensionInput): Promise<LiquidExtensionResult>;
}
