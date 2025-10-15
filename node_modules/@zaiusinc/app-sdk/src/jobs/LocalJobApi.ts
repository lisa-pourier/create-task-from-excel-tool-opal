import {ValueHash} from '..';
import {JobApi, JobDetail, JobRunStatus} from './JobApi';

/**
 * @hidden
 * A stub of the job api
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalJobApi implements JobApi {
  public trigger(_jobName: string, _parameters: ValueHash): Promise<JobDetail> {
    throw new Error('Method not implemented.');
  }

  public getDetail(_jobId: string): Promise<JobDetail> {
    throw new Error('Method not implemented.');
  }

  public getStatus(_jobId: string): Promise<JobRunStatus> {
    throw new Error('Method not implemented.');
  }
}
