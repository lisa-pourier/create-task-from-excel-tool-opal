import {ValueHash} from '../store';

/**
 * The current status of a job run
 */
export enum JobRunStatus {
  Pending = 0,
  Scheduled = 1,
  Running = 2,
  Complete = 3,
  Error = 4,
  Terminated = 5
}

/**
 * Definition of a job
 */
export interface JobDefinition {
  /**
   * The name as defined in the app.yml
   */
  name: string;
  /**
   * A JSON-serializable hash to provide as the job parameters
   */
  parameters?: ValueHash;
}

/**
 * Details of a job run.
 */
export interface JobDetail {
  /**
   * The generated id of this job run. Unique for every run of a job.
   */
  jobId: string;
  /**
   * Current run status
   */
  status: JobRunStatus;
  /**
   * The job definition
   */
  definition: JobDefinition;
  /**
   * Any error messages associated with the run. Empty string if no errors.
   */
  errors: string;
  /**
   * Timestamp that the job run began
   */
  startedAt?: Date;
  /**
   * Timestamp that the job run completed (potentially with errors)
   */
  completedAt?: Date;
  /**
   * Timestamp that the job run was terminated (due to timeout, resource limits, etc)
   */
  terminatedAt?: Date;
}

/**
 * Error thrown when job api interaction fails
 */
export class JobApiError extends Error {}

/**
 * Interface to trigger and monitor jobs
 */
export interface JobApi {
  trigger(jobName: string, parameters: ValueHash): Promise<JobDetail>;
  getDetail(jobId: string): Promise<JobDetail>;
  getStatus(jobId: string): Promise<JobRunStatus>;
}
