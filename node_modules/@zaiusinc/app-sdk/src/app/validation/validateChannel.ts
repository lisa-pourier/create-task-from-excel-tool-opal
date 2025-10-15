import {logger} from '../../logging';
import {Channel, CHANNEL_REQUIRED_METHODS} from '../Channel';
import {Runtime} from '../Runtime';

export async function validateChannel(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];
  const channelManifest = runtime.manifest.channel;

  if (runtime.manifest.meta && (runtime.manifest.meta.categories || []).includes('Channel')) {
    if (!channelManifest) {
      errors.push('Invalid app.yml: channel must exist when meta.categories includes "Channel"');
    } else if (channelManifest?.targeting === undefined) {
      errors.push('Invalid app.yml: channel.targeting cannot be blank for a channel app');
    }

    // Make sure the channel exists and is implemented
    let channelClass = null;
    let errorMessage: string | null = null;
    try {
      channelClass = await runtime.getChannelClass();
    } catch (e: any) {
      errorMessage = e;
      logger.error(e);
    }
    if (!channelClass) {
      errors.push(`Error loading Channel implementation. ${errorMessage}`);
    } else if (!(channelClass.prototype instanceof Channel)) {
      errors.push('Channel implementation does not extend App.Channel');
    } else {
      for (const method of CHANNEL_REQUIRED_METHODS) {
        if (typeof (channelClass.prototype as any)[method] !== 'function') {
          errors.push(`Channel implementation is missing the ${method} method`);
        }
      }

      const hasPrepare = typeof (channelClass.prototype as any).prepare === 'function';
      const needsPrepare = channelManifest?.options?.prepare === undefined ? true : channelManifest.options.prepare;
      if (needsPrepare && !hasPrepare) {
        errors.push(
          'Channel implementation is missing the prepare method. ' +
            'Either implement prepare or specify you do not need prepare in the channel options.'
        );
      } else if (!needsPrepare && hasPrepare) {
        errors.push(
          'Channel implementation implements the prepare method, ' +
            'but the channel options specify you do not need prepare'
        );
      }

      const hasTarget = typeof (channelClass.prototype as any).target === 'function';
      const needsTarget = channelManifest?.targeting === 'dynamic';
      if (needsTarget && !hasTarget) {
        errors.push('Channel implementation is missing the target method (required for dynamic targeting)');
      } else if (!needsTarget && hasTarget) {
        errors.push(
          'Channel implementation implements the target method, but it will not be used with static targeting'
        );
      }

      // validate delivery options (supplemental to JSON schema)
      const delivery = channelManifest?.delivery;
      if (delivery) {
        if (typeof delivery.batch_size === 'number') {
          if (delivery.batch_size < 1 || delivery.batch_size > 1000) {
            errors.push('channel.delivery.batch_size must be between 1 and 1000 (inclusive)');
          } else if (delivery.batch_size !== Math.floor(delivery.batch_size)) {
            errors.push('channel.delivery.batch_size must be an integer');
          }
        }
        const concurrency = delivery.concurrent_batches;
        if (typeof concurrency === 'number') {
          if (concurrency < 1 || concurrency > 1000) {
            errors.push('channel.delivery.concurrent_batches must be between 1 and 1000 (inclusive)');
          } else if (concurrency !== Math.floor(concurrency)) {
            errors.push('channel.delivery.concurrent_batches must be an integer');
          }
        }
        for (let i = 0; i < (delivery.rate_limits || []).length; i++) {
          const limit = delivery.rate_limits?.[i];
          if (limit && limit.count < 1) {
            errors.push(`channel.delivery.rate_limit[${i}].count must be > 0`);
          } else if (limit && limit.count !== Math.floor(limit.count)) {
            errors.push(`channel.delivery.rate_limit[${i}].count must be an integer`);
          }
          if (limit && limit.period < 1) {
            errors.push(`channel.delivery.rate_limit[${i}].period must be > 0 if specifying a number of seconds`);
          } else if (limit && limit.period !== Math.floor(limit.period)) {
            errors.push(`channel.delivery.rate_limit[${i}].period must be an integer`);
          }
        }
      }
    }
  }

  return errors;
}
