/* eslint-disable max-classes-per-file */
import deepFreeze from 'deep-freeze';
import 'jest';

import {ValueHash} from '../../../store';
import {Job, JobStatus} from '../../Job';
import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {validateJobs} from '../validateJobs';

const appManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Commerce Platform'],
    availability: ['all']
  },
  runtime: 'node12',
  functions: {
    foo: {
      entry_point: 'Foo',
      description: 'gets foo'
    }
  },
  jobs: {
    bar: {
      entry_point: 'Bar',
      description: 'Does a thing'
    }
  }
} as AppManifest);

class NonExtendedBar {
  public async prepare(_status?: JobStatus): Promise<JobStatus> {
    return {complete: false, state: {}};
  }
  public async perform(status: JobStatus): Promise<JobStatus> {
    return status;
  }
}
class ProperBar extends Job {
  public async prepare(params: ValueHash, _status?: JobStatus, _resuming?: boolean): Promise<JobStatus> {
    return {complete: false, state: params};
  }
  public async perform(status: JobStatus): Promise<JobStatus> {
    return status;
  }
}
/* tslint:disable */

describe('validateJobs', () => {
  it('succeeds with a proper definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockResolvedValue(ProperBar);

    const errors = await validateJobs(runtime);

    expect(getJobClass).toHaveBeenCalledWith('bar');
    expect(errors).toEqual([]);

    getJobClass.mockRestore();
  });

  it('detects missing job entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockRejectedValue(new Error('not found'));

    expect(await validateJobs(runtime)).toEqual(['Error loading entry point bar. Error: not found']);

    getJobClass.mockRestore();
  });

  it('detects non-extended job entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockReturnValue(NonExtendedBar as any);

    expect(await validateJobs(runtime)).toEqual(['Job entry point does not extend App.Job: Bar']);

    getJobClass.mockRestore();
  });

  describe('valid cron expressions', () => {
    async function validateCronExpression(expression: string, expectedErrors: string[] = []) {
      const manifest = {
        ...appManifest,
        jobs: {
          bar: {
            entry_point: 'Bar',
            cron: expression
          }
        }
      };
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
      const getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockReturnValue(ProperBar as any);

      expect(await validateJobs(runtime)).toEqual(expectedErrors);

      getJobClass.mockRestore();
    }

    it('cron expression - at every minute', async () => {
      await validateCronExpression('0 * * ? * *');
    });

    it('cron expression - at midnight every night', async () => {
      await validateCronExpression('0 0 0 ? * *');
    });

    it('cron expression - every hour', async () => {
      await validateCronExpression('0 0 * * * ?');
    });

    it('cron expression - at 10:15 AM every day', async () => {
      await validateCronExpression('0 15 10 ? * *');
    });

    it('cron expression - at 10:15 AM every day during the year 2005', async () => {
      await validateCronExpression('0 15 10 * * ? 2005');
    });

    it('cron expression - every minute starting at 2:00 PM and ending at 2:59 PM, every day', async () => {
      await validateCronExpression('0 * 14 * * ?');
    });

    it('cron expression - every 5 minutes starting at 2:00 PM and ending at 2:55 PM, every day', async () => {
      await validateCronExpression('0 0/5 14 * * ?');
    });

    it('cron expression - every 5 minutes from 2:00PM to 2:55 PM AND from 6:00 PM to 6:55 PM, every day', async () => {
      await validateCronExpression('0 0/5 14,18 * * ?');
    });

    it('cron expression - at 2:10 PM and at 2:44 PM every Wednesday in the month of March', async () => {
      await validateCronExpression('0 10,44 14 ? 3 WED');
    });

    it('cron expression - at 10:15 AM every Monday, Tuesday, Wednesday, Thursday and Friday', async () => {
      await validateCronExpression('0 15 10 ? * MON-FRI');
    });

    it('cron expression - at 10:15 AM on the 15th day of every month', async () => {
      await validateCronExpression('0 15 10 15 * ?');
    });

    it('cron expression - at 10:15 AM on the last day of every month', async () => {
      await validateCronExpression('0 15 10 L * ?');
    });

    it('not a cron expression at all', async () => {
      await validateCronExpression('invalid-cron-expression', ['Invalid CRON expression: Bar']);
    });

    it('invalid cron expression - too many positions', async () => {
      await validateCronExpression('0 0 * * * ? ?', ['Invalid CRON expression: Bar']);
    });

    it('invalid cron expression - not enough positions', async () => {
      await validateCronExpression('0 0 * * *', ['Invalid CRON expression: Bar']);
    });

    it('invalid cron expression - hour outside of range', async () => {
      await validateCronExpression('0 15 25 ? * *', ['Invalid CRON expression: Bar']);
    });
  });
});
