export type BatchOperation<T> = (batch: T[]) => Promise<any>;

/**
 * A class to aid in batching operations, such as sending requests to ODP APIs.
 * @usage ```
 * const eventBatcher = new Batcher(z.event);
 * ...
 * await eventBatcher.append({type: 'pageview', {page: 'https://foo'});
 * ...
 * await eventBatcher.flush();
 * ```
 */
export class Batcher<T> {
  private batch: T[] = [];
  public constructor(
    private operation: BatchOperation<T>,
    private limit = 100
  ) {}

  /**
   * Append data to the batch, and if the batch size reaches the limit, perform and await the desired operation
   * @param data the data needed by the operation. Of type T in new Batcher<T>((data: T) => Promise<void>)
   */
  public async append(data: T) {
    this.batch.push(data);
    if (this.batch.length >= this.limit) {
      await this.flush();
    }
  }

  /**
   * Flush any remaining items in the batcher. Do this before giving up control of your task, e.g.,
   * before exiting a job's perform method to make sure nothing is lost if the job needs to be paused and resumed.
   */
  public async flush() {
    if (this.batch.length > 0) {
      const flushBatch = this.batch.splice(0, this.limit);
      await this.operation(flushBatch);
    }
  }
}
