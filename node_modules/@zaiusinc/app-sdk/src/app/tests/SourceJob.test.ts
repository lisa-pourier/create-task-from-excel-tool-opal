import 'jest';

import {ValueHash} from '../..';
import {SourceJob, SourceJobStatus} from '../SourceJob';

class MyJob extends SourceJob {
  public async prepare(_params: ValueHash, _status?: SourceJobStatus, _resuming?: boolean): Promise<SourceJobStatus> {
    return {state: {}, complete: false};
  }

  public async perform(status: SourceJobStatus): Promise<SourceJobStatus> {
    status.complete = true;
    return status;
  }
}

describe('Job', () => {
  describe('performInterruptibleTask', () => {
    it('marks the job interruptible during the task', async () => {
      const job = new MyJob({} as any, {} as any);
      expect.assertions(3);
      expect(job.isInterruptible).toBe(false);
      await job['performInterruptibleTask'](async () => {
        expect(job.isInterruptible).toBe(true);
      });
      expect(job.isInterruptible).toBe(false);
    });

    it('restores the original isInterruptible value after', async () => {
      const job = new MyJob({} as any, {} as any);
      expect.assertions(2);
      job.isInterruptible = true;
      await job['performInterruptibleTask'](async () => {
        expect(job.isInterruptible).toBe(true);
      });
      expect(job.isInterruptible).toBe(true);
    });

    it('restores isInterruptible after an exception', async () => {
      const job = new MyJob({} as any, {} as any);
      expect.assertions(2);
      try {
        await job['performInterruptibleTask'](async () => {
          expect(job.isInterruptible).toBe(true);
          throw new Error('error');
        });
      } catch (_) {
        expect(job.isInterruptible).toBe(false);
      }
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runAllTimers();
      jest.useRealTimers();
    });

    /**
     * These are a little weird because of jest + fake timers + promises.
     * Can't actually prove they sleep the specified time, but can prove they sleep
     * LESS THAN OR EQUAL TO the specified time.
     */
    it('sleeps for the specified time', () => {
      expect.assertions(3);
      const job = new MyJob({} as any, {} as any);
      let complete = false;
      const p = job['sleep'](2000).then(() => {
        complete = true;
        expect(job.isInterruptible).toBe(false);
      });

      expect(job.isInterruptible).toBe(false);
      expect(complete).toBe(false);
      jest.advanceTimersByTime(2000);
      return p;
    });

    it('sleeps for zero miliseconds if unspecified', async () => {
      const job = new MyJob({} as any, {} as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const setTimeoutFn = jest.spyOn(global, 'setTimeout').mockImplementation((resolve: any) => resolve());
      await job['sleep']();

      expect(setTimeoutFn).toHaveBeenCalledWith(expect.anything(), 0);
    });

    it('marks the job interruptible during sleep if specified', () => {
      expect.assertions(2);
      const job = new MyJob({} as any, {} as any);
      const promise = job['sleep'](2000, {interruptible: true}).then(() => {
        expect(job.isInterruptible).toBe(false);
      });

      expect(job.isInterruptible).toBe(true);
      jest.advanceTimersByTime(2000);
      return promise;
    });

    it('restores the original isInterruptible value after sleep', () => {
      expect.assertions(2);
      const job = new MyJob({} as any, {} as any);
      job.isInterruptible = true;
      const promise = job['sleep'](2000, {interruptible: true}).then(() => {
        expect(job.isInterruptible).toBe(true);
      });

      expect(job.isInterruptible).toBe(true);
      jest.advanceTimersByTime(2000);
      return promise;
    });
  });
});
