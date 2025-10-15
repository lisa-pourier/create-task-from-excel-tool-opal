import {JobApiError} from './JobApi';

/**
 * Error thrown when a job run is not found.
 */
export class JobNotFoundError extends JobApiError {}
