import {AsyncLocalStorage} from 'async_hooks';
import 'jest';

import {OCPContext} from '../../types';
import {FunctionApi} from '../FunctionApi';
import {LocalFunctionApi} from '../LocalFunctionApi';
import {functions, initializeFunctionApi} from '../functions';

describe('functions', () => {
  const mockFunctionApi: FunctionApi = {
    getEndpoints: jest.fn(),
    getGlobalEndpoints: jest.fn(),
    getAuthorizationGrantUrl: jest.fn()
  };

  function runWithAsyncLocalStore(code: () => void) {
    const ocpContextStorage = new AsyncLocalStorage<OCPContext>();
    global.ocpContextStorage = ocpContextStorage;

    const context = {
      ocpRuntime: {
        functionApi: mockFunctionApi
      }
    } as OCPContext;

    ocpContextStorage.run(context, code);
  }

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('async local store configured', () => {
    it('uses local functions if not configured', async () => {
      const getEndpointsFn = jest.spyOn(LocalFunctionApi.prototype, 'getEndpoints');

      expect(() => functions.getEndpoints()).toThrow();
      expect(getEndpointsFn).toHaveBeenCalled();
    });

    it('uses the configured implementation for getAllEndpoints', async () => {
      runWithAsyncLocalStore(async () => {
        await functions.getEndpoints();
      });
      expect(mockFunctionApi.getEndpoints).toHaveBeenCalled();
    });

    it('uses the configured implementation for getGlobalEndpoints', async () => {
      runWithAsyncLocalStore(async () => {
        await functions.getGlobalEndpoints();
      });
      expect(mockFunctionApi.getGlobalEndpoints).toHaveBeenCalled();
    });

    it('uses the configured implementation for getAuthorizationGrantUrl', () => {
      runWithAsyncLocalStore(() => {
        functions.getAuthorizationGrantUrl();
      });
      expect(mockFunctionApi.getAuthorizationGrantUrl).toHaveBeenCalled();
    });
  });

  describe('module scope config', () => {
    it('uses the configured implementation for getAllEndpoints', async () => {
      initializeFunctionApi(mockFunctionApi);
      await functions.getEndpoints();
      expect(mockFunctionApi.getEndpoints).toHaveBeenCalled();
    });

    it('uses the configured implementation for getGlobalEndpoints', async () => {
      initializeFunctionApi(mockFunctionApi);
      await functions.getGlobalEndpoints();
      expect(mockFunctionApi.getGlobalEndpoints).toHaveBeenCalled();
    });

    it('uses the configured implementation for getAuthorizationGrantUrl', () => {
      initializeFunctionApi(mockFunctionApi);
      functions.getAuthorizationGrantUrl();
      expect(mockFunctionApi.getAuthorizationGrantUrl).toHaveBeenCalled();
    });
  });
});
