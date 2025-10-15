import {Source} from '../sources/Source';
import {ValueHash} from '../store';

export interface SourceJobInvocation {
  /**
   * A unique id generated for this job run
   */
  jobId: string;
  /**
   * The time the job was scheduled.
   * Can be used to determine if the source job was delayed or has been running too long.
   */
  scheduledAt: Date;
  /**
   * Optional parameters that may be supplied from jobs.trigger() or the app.yml.
   * @default {} (an empty hash)
   */
  parameters: ValueHash;
  /**
   * The data sync id.
   */
  dataSyncId: string;
}

export interface SourceJobStatus extends ValueHash {
  /**
   * The source job's state. Store any state you need to continue on the next perform loop.
   * The state is expected to change regularly. If your job runs for a long time without
   * the state changing (hours not minutes), it may be considered stalled and could be terminated.
   */
  state: ValueHash;
  /**
   * Set to true when the job is complete.
   * If the `complete` is false in the returned job status, perform will be called again.
   */
  complete: boolean;
}

export interface SourceSleepOptions {
  /**
   * true if the job can be safely interrupted during this sleep (and resumed later with the current job state)
   * @default undefined the interruptible status of the job will be unchanged
   */
  interruptible?: boolean;
}

export abstract class SourceJob {
  /**
   * Set this to true during an interruptible operation, such as waiting for a long running export.
   * When true, a job can be interrupted and resumed with the PREVIOUS Job state (the one perform was last called with).
   * A job is normally expected to complete a job loop (perform) within < 60s. Your job CAN perform a loop for longer
   * than 60 seconds if isInterruptible is set to true for a significant part of each 60 seconds of runtime
   * and is performing NON-BLOCKING operations.
   * @IMPORTANT You MUST ensure the process is **NOT BLOCKED** while interruptible. This can be achieved
   * by manually calling `await this.sleep()` regularly or is automatic if you are waiting on non-blocking calls.
   *
   * `SourceJob::sleep` and `SourceJob::performInterruptibleTask` will set this value automatically.
   */
  public isInterruptible = false;

  /**
   * Initializes a job to be run
   * @param invocation details of the job invocation
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: 6138 declared but never read
  public constructor(
    protected invocation: SourceJobInvocation,
    protected source: Source
  ) {}

  /**
   * Prepares to run a job. Prepare is called at the start of a job
   * and again only if the job was interrupted and is being resumed.
   * Use this function to read secrets and establish connections to simplify the job loop (perform).
   * @param params a hash if params were supplied to the job run, otherwise an empty hash
   * @param status provided ONLY if the job was interrupted and should continue from the last known state
   * @param resuming if the job was interrupted, resuming will be set to true when it is resumed
   */
  public abstract prepare(params: ValueHash, status?: SourceJobStatus, resuming?: boolean): Promise<SourceJobStatus>;

  /**
   * Performs a unit of work. Jobs should perform a small unit of work and then return the current state.
   * Perform is automatically called in a loop where the previously returned state will be given to the next iteration.
   * Iteration will continue until complete is set to true in the returned job status.
   * @param status last known job state and status
   * @returns The current JobStatus/state that can be used to perform the next iteration or resume a job if interrupted.
   */
  public abstract perform(status: SourceJobStatus): Promise<SourceJobStatus>;

  /**
   * Wrapper for interruptible tasks, such as waiting for a long api call or a timeout loop waiting for a result.
   * Interruptible tasks MUST BE NON-BLOCKING or must manually call `await this.sleep()` regularly (every few seconds).
   * @usage `const result = await this.performInterruptibleTask(() => fetch(...)));`
   * In this example, the job can be interrupted during the fetch operation, and if interrupted will be resumed
   * with the previous job state.
   */
  protected async performInterruptibleTask<T>(task: () => Promise<T>) {
    const lastInterruptible = this.isInterruptible;
    this.isInterruptible = true;
    try {
      const result = await task();
      this.isInterruptible = lastInterruptible;
      return result;
    } catch (e) {
      this.isInterruptible = lastInterruptible;
      throw e;
    }
  }

  /**
   * Sleep the job without CPU thrashing. Use this method to wait for long running tasks, like an export API.
   * @usage `await this.sleep(5000);`
   * @param miliseconds duration to sleep in miliseconds
   * @param options `{interruptible: true}` if the job can be interrupted while sleeping.
   *                A sleep that is not interruptible cannot safely be longer than about 55 seconds.
   */
  protected async sleep(miliseconds?: number, options?: SourceSleepOptions): Promise<void> {
    const lastInterruptible = this.isInterruptible;
    if (options?.interruptible !== undefined) {
      this.isInterruptible = !!options.interruptible;
    }

    // perform the sleep
    await new Promise((resolve) => setTimeout(resolve, miliseconds || 0));

    this.isInterruptible = lastInterruptible;
  }
}
