/* eslint-disable max-classes-per-file */
import {FormData} from '@zaiusinc/app-forms-schema';
import deepFreeze from 'deep-freeze';
import 'jest';

import {
  CampaignContent,
  CampaignDelivery,
  CampaignTracking,
  Channel,
  ChannelDeliverOptions,
  ChannelDeliverResult,
  ChannelPrepareOptions,
  ChannelPrepareResult,
  ChannelPublishOptions,
  ChannelValidateOptions
} from '../../Channel';
import {Runtime} from '../../Runtime';
import {ChannelContentResult, ChannelPreviewResult, ChannelTargetResult} from '../../lib';
import {AppManifest} from '../../types';
import {validateChannel} from '../validateChannel';

const staticManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Channel'],
    availability: ['all']
  },
  runtime: 'node12',
  channel: {
    type: 'sms',
    targeting: [{identifier: 'my_app_identifier'}],
    options: {
      prepare: false
    },
    delivery: {
      batch_size: 10,
      concurrent_batches: 5,
      rate_limits: [
        {
          count: 20,
          period: 1,
          unit: 'minute',
          grouping: 'install'
        }
      ]
    }
  }
} as AppManifest);

const dynamicManifest = deepFreeze({
  meta: staticManifest.meta,
  runtime: 'node12',
  channel: {
    type: 'sms',
    targeting: 'dynamic'
  }
} as AppManifest);

const badManifest = deepFreeze({
  meta: staticManifest.meta,
  runtime: 'node12'
} as AppManifest);

const manifestWithoutTargeting = deepFreeze({
  meta: staticManifest.meta,
  runtime: 'node12',
  channel: {
    type: 'sms'
  }
} as AppManifest);

class NonExtendedChannel {
  // Nothing
}

abstract class PartialChannel extends Channel {
  protected constructor() {
    super();
  }
}

class ProperChannel extends Channel {
  public constructor() {
    super();
  }

  public async ready(): Promise<boolean> {
    return true;
  }

  public async validate(_content: CampaignContent, _options: ChannelValidateOptions): Promise<ChannelContentResult> {
    return new ChannelContentResult();
  }

  public async publish(
    _contentKey: string,
    _content: CampaignContent,
    _options: ChannelPublishOptions
  ): Promise<ChannelContentResult> {
    return new ChannelContentResult();
  }

  public async deliver(
    _contentKey: string,
    _tracking: CampaignTracking,
    _options: ChannelDeliverOptions,
    _batch: CampaignDelivery[],
    _previousResult?: ChannelDeliverResult
  ): Promise<ChannelDeliverResult> {
    return {success: true};
  }

  public async preview(_content: CampaignContent, _batch: CampaignDelivery[]): Promise<ChannelPreviewResult> {
    return new ChannelPreviewResult();
  }
}

class MoreProperChannel extends ProperChannel {
  public constructor() {
    super();
  }

  public async target(_contentSettings: FormData): Promise<ChannelTargetResult> {
    return new ChannelTargetResult();
  }

  public async prepare(
    _contentKey: string,
    _tracking: CampaignTracking,
    _options: ChannelPrepareOptions
  ): Promise<ChannelPrepareResult> {
    return {success: true};
  }
}

describe('validateChannel', () => {
  it('succeeds with a proper static-targeting definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel);

    const errors = await validateChannel(runtime);

    expect(getChannelClass).toHaveBeenCalled();
    expect(errors).toEqual([]);

    getChannelClass.mockRestore();
  });

  it('succeeds with a proper dynamic-targeting definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: dynamicManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(MoreProperChannel);

    const errors = await validateChannel(runtime);

    expect(getChannelClass).toHaveBeenCalled();
    expect(errors).toEqual([]);

    getChannelClass.mockRestore();
  });

  it('detects missing channel configuration', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: badManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel);

    expect(await validateChannel(runtime)).toEqual([
      'Invalid app.yml: channel must exist when meta.categories includes "Channel"',
      expect.stringContaining('Channel implementation is missing the prepare method')
    ]);

    getChannelClass.mockRestore();
  });

  it('detects missing target configuration', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifestWithoutTargeting, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel);

    expect(await validateChannel(runtime)).toEqual([
      'Invalid app.yml: channel.targeting cannot be blank for a channel app',
      expect.stringContaining('Channel implementation is missing the prepare method')
    ]);

    getChannelClass.mockRestore();
  });

  it('detects missing channel implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockRejectedValue(new Error('not found'));

    expect(await validateChannel(runtime)).toEqual(['Error loading Channel implementation. Error: not found']);

    getChannelClass.mockRestore();
  });

  it('detects non-extended channel implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest
      .spyOn(Runtime.prototype, 'getChannelClass')
      .mockResolvedValue(NonExtendedChannel as any);

    expect(await validateChannel(runtime)).toEqual(['Channel implementation does not extend App.Channel']);

    getChannelClass.mockRestore();
  });

  it('detects partial channel implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(PartialChannel as any);

    expect(await validateChannel(runtime)).toEqual([
      'Channel implementation is missing the ready method',
      'Channel implementation is missing the validate method',
      'Channel implementation is missing the publish method',
      'Channel implementation is missing the deliver method',
      'Channel implementation is missing the preview method'
    ]);

    getChannelClass.mockRestore();
  });

  it('detects missing prepare implementation when required', async () => {
    const manifest = {
      ...staticManifest,
      channel: {
        ...staticManifest.channel,
        options: {
          ...staticManifest.channel?.options,
          prepare: true
        }
      }
    };
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel as any);

    expect(await validateChannel(runtime)).toEqual([
      expect.stringMatching('Channel implementation is missing the prepare method')
    ]);

    getChannelClass.mockRestore();
  });

  it('detects unused target implementation when not required', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest
      .spyOn(Runtime.prototype, 'getChannelClass')
      .mockResolvedValue(MoreProperChannel as any);

    expect(await validateChannel(runtime)).toEqual([
      'Channel implementation implements the prepare method, but the channel options specify you do not need prepare',
      'Channel implementation implements the target method, but it will not be used with static targeting'
    ]);

    getChannelClass.mockRestore();
  });

  it('detects missing target implementation when required', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: dynamicManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel as any);

    expect(await validateChannel(runtime)).toEqual([
      expect.stringContaining('Channel implementation is missing the prepare method'),
      'Channel implementation is missing the target method (required for dynamic targeting)'
    ]);

    getChannelClass.mockRestore();
  });

  it('detects detects invalid delivery options', async () => {
    const manifest = {
      ...staticManifest,
      channel: {
        ...staticManifest.channel,
        delivery: {
          batch_size: 15.5,
          concurrent_batches: 13.2
        }
      }
    } as AppManifest;
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel as any);

    expect(await validateChannel(runtime)).toEqual([
      'channel.delivery.batch_size must be an integer',
      'channel.delivery.concurrent_batches must be an integer'
    ]);

    Object.assign<any, any>(runtime.manifest.channel?.delivery, {
      batch_size: -1,
      concurrent_batches: -1
    });

    expect(await validateChannel(runtime)).toEqual([
      'channel.delivery.batch_size must be between 1 and 1000 (inclusive)',
      'channel.delivery.concurrent_batches must be between 1 and 1000 (inclusive)'
    ]);

    Object.assign<any, any>(runtime.manifest.channel?.delivery, {
      batch_size: 10000,
      concurrent_batches: 1001
    });

    expect(await validateChannel(runtime)).toEqual([
      'channel.delivery.batch_size must be between 1 and 1000 (inclusive)',
      'channel.delivery.concurrent_batches must be between 1 and 1000 (inclusive)'
    ]);

    getChannelClass.mockRestore();
  });

  it('detects detects invalid rate limit options', async () => {
    const manifest = {
      ...staticManifest,
      channel: {
        ...staticManifest.channel,
        delivery: {
          batch_size: 100,
          concurrent_batches: 10,
          rate_limits: [
            {
              count: 0,
              period: 0,
              unit: 'second',
              grouping: 'install'
            },
            {
              count: 1.25,
              period: 1.99,
              unit: 'minute',
              grouping: 'app'
            }
          ]
        }
      }
    } as AppManifest;
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel as any);

    expect(await validateChannel(runtime)).toEqual([
      'channel.delivery.rate_limit[0].count must be > 0',
      'channel.delivery.rate_limit[0].period must be > 0 if specifying a number of seconds',
      'channel.delivery.rate_limit[1].count must be an integer',
      'channel.delivery.rate_limit[1].period must be an integer'
    ]);

    getChannelClass.mockRestore();
  });
});
