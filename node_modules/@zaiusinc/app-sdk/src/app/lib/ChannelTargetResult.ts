import {CampaignTargeting} from '../Channel';
import {FormResult, Intent} from './FormResult';

/**
 * @hidden
 */
export interface ChannelTargetResponse {
  targeting?: CampaignTargeting[];
  errors?: {[ref: string]: string[]};
  toasts?: Array<{intent: Intent; message: string}>;
}

/**
 * Result of {@link Channel.target}.
 */
export class ChannelTargetResult extends FormResult {
  private targeting: CampaignTargeting[];

  /**
   * @param targeting the complete set of targeting requirements, if already known
   */
  public constructor(targeting?: CampaignTargeting[]) {
    super();
    this.targeting = targeting || [];
  }

  /**
   * Add a single targeting requirement
   * @param targeting requirement to add
   */
  public addTargeting(targeting: CampaignTargeting): this {
    this.targeting.push(targeting);
    return this;
  }

  /**
   * Provide the complete set of targeting requirements
   * @param targeting requirements to provide
   */
  public setTargeting(targeting: CampaignTargeting[]): this {
    this.targeting = targeting;
    return this;
  }

  /**
   * Add an error to display to the user for a particular form field (implicitly scoped to the content settings form)
   * @param section the section within the form that the error applies to
   * @param field the field within the section that the error applies to
   * @param error message to display to the user
   */
  public addError(section: string, field: string, error: string): this {
    return this.addErrorInternal(`${section}.${field}`, error);
  }

  /**
   * @hidden
   * Used internally to get the complete response
   */
  public getResponse(): ChannelTargetResponse {
    if (
      (!this.targeting || this.targeting.length === 0) &&
      Object.keys(this.errors).length === 0 &&
      this.toasts.length === 0
    ) {
      this.addToast('danger', 'Failed to determine targeting requirements');
    }
    return {
      targeting: this.targeting,
      errors: this.errors,
      toasts: this.toasts
    };
  }
}
