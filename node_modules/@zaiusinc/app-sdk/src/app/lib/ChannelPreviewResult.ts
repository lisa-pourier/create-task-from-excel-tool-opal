import {FormResult, Intent} from './FormResult';

/**
 * @hidden
 */
export interface ChannelPreviewResponse {
  previews?: string[];
  displayOptions?: PreviewDisplayOptions;
  errors?: {[ref: string]: string[]};
  toasts?: Array<{intent: Intent; message: string}>;
}

/**
 * Options to control how previews are displayed.
 */
export interface PreviewDisplayOptions {
  minWidth?: number;
  minHeight?: number;
}

/**
 * Result of {@link Channel.preview}. All previews must be a full HTML page. There must be exactly one preview per
 * recipient, and they must be added to this result in the same order as the recipients were given to
 * {@link Channel.preview}.
 */
export class ChannelPreviewResult extends FormResult {
  private previews: string[];
  private displayOptions?: PreviewDisplayOptions;

  /**
   * @param previews the complete set of HTML previews, if already known
   */
  public constructor(previews?: string[]) {
    super();
    this.previews = previews || [];
  }

  /**
   * Add a single HTML preview
   * @param preview to add
   */
  public addPreview(preview: string): this {
    this.previews.push(preview);
    return this;
  }

  /**
   * Provide the complete set of HTML previews
   * @param previews to provide
   */
  public setPreviews(previews: string[]): this {
    this.previews = previews;
    return this;
  }

  /**
   * Set options to control how the preview is displayed
   * @param displayOptions to control the preview
   */
  public setDisplayOptions(displayOptions: PreviewDisplayOptions): this {
    this.displayOptions = displayOptions;
    return this;
  }

  /**
   * Add an error to display to the user for a particular form field
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
  public getResponse(): ChannelPreviewResponse {
    if (
      (!this.previews || this.previews.length === 0) &&
      Object.keys(this.errors).length === 0 &&
      this.toasts.length === 0
    ) {
      this.addToast('danger', 'Failed to generate preview');
    }
    return {
      previews: this.previews,
      displayOptions: this.displayOptions,
      errors: this.errors,
      toasts: this.toasts
    };
  }
}
