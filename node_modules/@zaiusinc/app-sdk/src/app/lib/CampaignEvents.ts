import {EventData, z} from '@zaiusinc/node-sdk';

import {getAppContext} from '../AppContext';
import {CampaignTracking} from '../Channel';
import {Batcher} from './Batcher';

export type CampaignAction =
  | 'sent'
  | 'delivery'
  | 'open'
  | 'click'
  | 'engage'
  | 'disengage'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'spam_report';

/**
 * A class to help batch and send campaign related events
 */
export class CampaignEvents {
  /**
   * The campaign event type
   */
  private type!: string;
  private reachabilityBatcher = new Batcher(z.identifier.updateReachability);
  private consentBatcher = new Batcher(z.identifier.updateConsent);
  private eventBatcher = new Batcher(z.event);

  /**
   * @param tracking Campaign tracking information to be included on every event.
   * Use an empty {} if you plan to provide different tracking info for each event,
   * otherwise a complete CampaignTracking object.
   * @param identifierField the name of the identifier field used to target the user.
   * The identifier value provided to a campaign event must be for this identifier field name.
   */
  public constructor(
    private identifierField: string,
    public tracking: Partial<CampaignTracking>,
    type?: string
  ) {
    if (!type) {
      type = getAppContext()?.manifest.channel?.type;
      if (!type) {
        throw new Error('Type is required for generating a campaign event');
      }
    }
    this.type = type;
  }

  /**
   * Flush all API batches. You MUST flush before your task exists if you generated any events.
   */
  public async flush() {
    await this.reachabilityBatcher.flush();
    await this.consentBatcher.flush();
    await this.eventBatcher.flush();
  }

  /**
   * Send a campaign related event
   * @param identifier the identifier value / target identifier value related to this event
   * @param action the campaign action
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async event(identifier: string, action: CampaignAction, ts?: Date | string | number, data?: EventData) {
    await this.eventBatcher.append({
      identifiers: {
        [this.identifierField]: identifier
      },
      type: this.type,
      action,
      data: {
        ts: ts instanceof Date ? ts.toISOString() : ts,
        target_address: identifier,
        ...this.tracking,
        ...data
      }
    });
  }

  /**
   * Send a campaign delivery event
   * @param identifier the identifier value / target identifier value related to this event
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async delivery(identifier: string, ts?: Date | string | number, data?: EventData) {
    await this.event(identifier, 'delivery', ts, data);
  }

  /**
   * Send a campaign open event
   * @param identifier the identifier value / target identifier value related to this event
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async open(identifier: string, ts?: Date | string | number, data?: EventData) {
    await this.event(identifier, 'open', ts, data);
  }

  /**
   * Send a campaign click event
   * @param identifier the identifier value / target identifier value related to this event
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async click(identifier: string, ts?: Date | string | number, data?: EventData) {
    await this.event(identifier, 'click', ts, data);
  }

  /**
   * Send a campaign engage event
   * @param identifier the identifier value / target identifier value related to this event
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async engage(identifier: string, ts?: Date | string | number, data?: EventData) {
    await this.event(identifier, 'engage', ts, data);
  }

  /**
   * Send a campaign disengage event
   * @param identifier the identifier value / target identifier value related to this event
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async disengage(identifier: string, ts?: Date | string | number, data?: EventData) {
    await this.event(identifier, 'disengage', ts, data);
  }

  /**
   * Send a campaign hard bounce event, which means you were unable to deliver AND
   * the identifier is definitely no longer reachable. E.g., an invalid address.
   * @param identifier the identifier value / target identifier value related to this event
   * @param reason a human readable reason for the hard bounce
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async hardBounce(identifier: string, reason: string, ts?: Date | string | number, data?: EventData) {
    await this.reachabilityBatcher.append({
      identifier_field_name: this.identifierField,
      identifier_value: identifier,
      reachable: false,
      reachable_update_type: 'hard_bounce',
      reachable_update_reason: reason,
      reachable_update_ts: ts,
      event_data: {
        ...this.tracking,
        ...data
      }
    });
  }

  /**
   * Send a campaign soft bounce event, which means you were unable to deliver,
   * but the identifier may still be reachable. E.g., the provider is temporarily unavailable.
   * @param identifier the identifier value / target identifier value related to this event
   * @param reason a human readable reason for the soft bounce
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async softBounce(identifier: string, reason: string, ts?: Date | string | number, data?: EventData) {
    await this.event(identifier, 'soft_bounce', ts, {value: `Reason: ${reason}`, ...data});
  }

  // TODO: Awaiting confirmation of behavior of spam report before adding
  // /**
  //  * Send a campaign related spam report event, which means the customer reported this message as spam and
  //  * will be automatically opted out of future communications at this identifier (e.g., revokes consent).
  //  * @param identifier the identifier value / target identifier value related to this event
  //  * @param ts the time of the event. If left blank, the recevied time will be used.
  //  * @param data additional event data to add to the event
  //  */
  // public async spamReport(identifier: string, ts?: Date | string | number, data?: EventData) {
  //   await this.optOut(identifier, 'spam_report', ts, data);
  // }

  /**
   * Send a campaign related opt-out event, such as, when a customer unsubscribes or replies STOP to an SMS.
   * Consent will be revoked on the identifier.
   * @param identifier the identifier value / target identifier value related to this event
   * @param reason a human readable reason for the opt-out
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async optOut(identifier: string, reason: string, ts?: Date | string | number, data?: EventData) {
    await this.consentBatcher.append({
      identifier_field_name: this.identifierField,
      identifier_value: identifier,
      consent: false,
      consent_update_reason: reason,
      consent_update_ts: ts,
      event_data: {
        ...this.tracking,
        ...data
      }
    });
  }

  /**
   * Send a campaign related opt-in event, such as, when a customer re-subscribes or replies UNSTOP to an SMS.
   * This is considered a consent opt-in for the identifier.
   * @param identifier the identifier value / target identifier value related to this event
   * @param reason a human readable reason for the opt-in
   * @param ts the time of the event. If left blank, the recevied time will be used.
   * @param data additional event data to add to the event
   */
  public async optIn(identifier: string, reason: string, ts?: Date | string | number, data?: EventData) {
    await this.consentBatcher.append({
      identifier_field_name: this.identifierField,
      identifier_value: identifier,
      consent: true,
      consent_update_reason: reason,
      consent_update_ts: ts,
      event_data: {
        ...this.tracking,
        ...data
      }
    });
  }
}
