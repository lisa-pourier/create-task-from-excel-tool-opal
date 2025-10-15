import {ValueHash} from '..';
import {JobApi, JobDetail, JobRunStatus} from './JobApi';
import {LocalJobApi} from './LocalJobApi';

let jobsApi: JobApi = new LocalJobApi();

function getJobApi(): JobApi {
  return global.ocpContextStorage?.getStore()?.ocpRuntime?.jobApi || jobsApi;
}

/**
 * @hidden
 */
export const initializeJobApi = (api: JobApi) => {
  jobsApi = api;
};

/**
 * The jobs api implementation
 */
export const jobs: JobApi = {
  trigger(jobName: string, parameters: ValueHash): Promise<JobDetail> {
    return getJobApi().trigger(jobName, parameters);
  },
  getDetail(jobId: string): Promise<JobDetail> {
    return getJobApi().getDetail(jobId);
  },
  getStatus(jobId: string): Promise<JobRunStatus> {
    return getJobApi().getStatus(jobId);
  }
};
