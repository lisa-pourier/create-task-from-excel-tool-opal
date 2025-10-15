import {AsyncLocalStorage} from 'async_hooks';
import 'jest';

import {OCPContext} from '../../types';
import {JobApi} from '../JobApi';
import {LocalJobApi} from '../LocalJobApi';
import {initializeJobApi, jobs} from '../jobs';

describe('jobs', () => {
  const mockJobApi: JobApi = {
    trigger: jest.fn(),
    getDetail: jest.fn(),
    getStatus: jest.fn()
  };
  const mockJobId = '8157c520-b0a3-47c7-a8a6-b09d3ca24b78';

  function runWithAsyncLocalStore(code: () => void) {
    const ocpContextStorage = new AsyncLocalStorage<OCPContext>();
    global.ocpContextStorage = ocpContextStorage;

    const context = {
      ocpRuntime: {
        jobApi: mockJobApi
      }
    } as OCPContext;

    ocpContextStorage.run(context, code);
  }

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('async local store configured', () => {
    it('uses local job Api if not configured', async () => {
      const getEndpointsFn = jest.spyOn(LocalJobApi.prototype, 'trigger');

      expect(() => jobs.trigger('foot', {})).toThrow();
      expect(getEndpointsFn).toHaveBeenCalled();
    });

    it('uses the configured implementation for trigger', async () => {
      runWithAsyncLocalStore(async () => {
        await jobs.trigger('foo', {});
      });
      expect(mockJobApi.trigger).toHaveBeenCalled();
    });

    it('uses the configured implementation for getJobDetail', async () => {
      runWithAsyncLocalStore(async () => {
        await jobs.getDetail(mockJobId);
      });
      expect(mockJobApi.getDetail).toHaveBeenCalledWith(mockJobId);
    });

    it('uses the configured implementation for getStatus', async () => {
      runWithAsyncLocalStore(async () => {
        await jobs.getStatus(mockJobId);
      });
      expect(mockJobApi.getStatus).toHaveBeenCalledWith(mockJobId);
    });
  });

  describe('module scope config', () => {
    it('uses the configured implementation for trigger', async () => {
      initializeJobApi(mockJobApi);
      await jobs.trigger('foo', {});
      expect(mockJobApi.trigger).toHaveBeenCalled();
    });

    it('uses the configured implementation for getJobDetail', async () => {
      initializeJobApi(mockJobApi);
      await jobs.getDetail(mockJobId);
      expect(mockJobApi.getDetail).toHaveBeenCalledWith(mockJobId);
    });

    it('uses the configured implementation for getStatus', async () => {
      initializeJobApi(mockJobApi);
      await jobs.getStatus(mockJobId);
      expect(mockJobApi.getStatus).toHaveBeenCalledWith(mockJobId);
    });
  });
});
