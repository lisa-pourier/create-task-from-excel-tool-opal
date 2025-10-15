import {ValueHash} from '../../store';
import {CampaignTargeting} from '../Channel';

// regenerate JSON schema with `yarn run update-schema`
export interface AppFunction {
  entry_point: string;
  description: string;
  global?: boolean;
  opal_tool?: boolean;
  installation_resolution?: {
    type: 'GUID' | 'HEADER' | 'QUERY_PARAM' | 'JSON_BODY_FIELD';
    key: string;
  };
}

export interface AppJob {
  entry_point: string;
  description: string;
  cron?: string;
  parameters?: ValueHash;
}

export interface AppSourceJob {
  entry_point: string;
  description: string;
  parameters?: ValueHash;
}

export interface AppConsumer {
  entry_point: string;
  description: string;
  batch_size?: number;
  batch_timeout?: number;
}

export interface AppLiquidExtension {
  entry_point: string;
  description: string;
  input?: {
    [name: string]: {
      type: 'string' | 'number' | 'boolean' | 'any';
      required: boolean;
      description: string;
    };
  };
}

export interface AppDestination {
  entry_point: string;
  schema: string | AppDestinationSchemaFunction;
  description: string;
}

export interface AppSource {
  description: string;
  schema: string | AppSourceSchemaFunction;
  function?: AppSourceFunction;
  jobs?: {
    [name: string]: AppSourceJob;
  };
  lifecycle?: AppSourceLifecycle;
}

export interface AppSourceLifecycle {
  entry_point: string;
}

export interface AppSourceFunction {
  entry_point: string;
}

export interface AppSourceSchemaFunction {
  entry_point: string;
}

export interface AppDestinationSchemaFunction {
  entry_point: string;
}

export type AppCategory =
  | 'Commerce Platform'
  | 'Point of Sale'
  | 'Lead Capture'
  | 'Advertising'
  | 'Marketing'
  | 'Channel'
  | 'Loyalty & Rewards'
  | 'Customer Experience'
  | 'Analytics & Reporting'
  | 'Surveys & Feedback'
  | 'Reviews & Ratings'
  | 'Content Management'
  | 'Data Quality & Enrichment'
  | 'Productivity'
  | 'CRM'
  | 'Accounting & Finance'
  | 'CDP / DMP'
  | 'Attribution & Linking'
  | 'Testing & Utilities'
  | 'Personalization & Content'
  | 'Offers'
  | 'Merchandising & Products'
  | 'Site & Content Experience'
  | 'Subscriptions'
  | 'Audience Sync'
  | 'Opal';

export type AppRuntime = 'node12' | 'node18' | 'node18_rt' | 'node22';

export enum ChannelType {
  Email = 'email',
  AppPush = 'app_push',
  WebPush = 'web_push',
  WebModal = 'web_modal',
  WebEmbed = 'web_embed',
  SMS = 'sms',
  Api = 'api',
  DirectMail = 'direct_mail',
  WhatsApp = 'whatsapp',
  FacebookMessenger = 'facebook_messenger',
  Ad = 'ad',
  SegmentSync = 'segment_sync',
  TestChannel = 'test_channel'
}

export enum DeliveryMetric {
  Sent = 'sent',
  Delivery = 'delivery',
  DeliveryUnknown = 'delivery_unknown'
}

export enum EngagementMetric {
  Open = 'open',
  Click = 'click',
  Engage = 'engage'
}

export enum AttributableMetric {
  Open = 'open',
  Click = 'click',
  Engage = 'engage',
  Delivery = 'delivery'
}

export enum DisengagementMetric {
  Disengage = 'disengage',
  OptOut = 'opt-out',
  SpamReport = 'spam_report',
  ListUnsubscribe = 'list_unsubscribe'
}

export enum ReachabilityMetric {
  HardBounce = 'hard_bounce',
  SoftBounce = 'soft_bounce'
}

/**
 * Defines a rate limit for channel delivery in to form of <count> per <n> <unit>
 * where unit is `second`, `minute`, `hour`, `day`, or <number> of seconds.
 * E.g., count: 100, period: 15, unit: second => 100 per 15 seconds
 */
export interface ChannelRateLimit {
  /**
   * The number of delivery requests (batches) per period of time
   */
  count: number;
  /**
   * The number of units of time to measure the rate limit over
   */
  period: number;
  /**
   * The unit of time applied to the perioid
   */
  unit: 'second' | 'minute' | 'hour' | 'day';
  /**
   * Whether this rate limit applies to the app as a whole or per each install
   */
  grouping: 'app' | 'install';
}

export interface AppManifest {
  meta: {
    app_id: string;
    display_name: string;
    version: string;
    vendor: string;
    support_url: string;
    summary: string;
    contact_email: string;
    categories: AppCategory[];
    availability: string[];
  };
  runtime: AppRuntime;
  environment?: string[];
  functions?: {
    [name: string]: AppFunction;
  };
  jobs?: {
    [name: string]: AppJob;
  };
  consumers?: {
    [name: string]: AppConsumer;
  };
  liquid_extensions?: {
    [name: string]: AppLiquidExtension;
  };
  destinations?: {
    [name: string]: AppDestination;
  };
  sources?: {
    [name: string]: AppSource;
  };
  channel?: {
    type: ChannelType;
    targeting: 'dynamic' | CampaignTargeting[];
    options?: {
      prepare?: boolean;
      template_preview?: boolean;
    };
    delivery?: {
      batch_size?: number;
      concurrent_batches?: number;
      rate_limits?: ChannelRateLimit[];
    };
    metrics?: {
      delivery?: DeliveryMetric[];
      engagement?: EngagementMetric[];
      attributable?: AttributableMetric[];
      disengagement?: DisengagementMetric[];
      reachability?: ReachabilityMetric[];
    };
  };
  outbound_domains?: string[];
}

export const APP_ID_FORMAT = /^[a-z][a-z_0-9]{2,31}$/;
export const VERSION_FORMAT = /^\d+\.\d+\.\d+(-(((dev|beta)(\.\d+)?)|private))?$/;
export const VENDOR_FORMAT = /^[a-z0-9]+(_[a-z0-9]+)*$/;
