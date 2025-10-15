import {AsyncLocalStorage} from 'async_hooks';
import 'jest';

import {OCPContext} from '../../types';
import {AppContext, getAppContext, isGlobalContext, setContext} from '../AppContext';

describe('AppContext', () => {
  function runWithAsyncLocalStore(appContext: AppContext, code: () => void) {
    const ocpContextStorage = new AsyncLocalStorage<OCPContext>();
    global.ocpContextStorage = ocpContextStorage;

    const context = {
      ocpRuntime: {
        appContext
      }
    } as OCPContext;

    ocpContextStorage.run(context, code);
  }

  describe('getAppContext - local storage', () => {
    it('provides the context from OCP runtime from global context', () => {
      runWithAsyncLocalStore({trackerId: 'foo'} as AppContext, () => {
        expect(getAppContext()).toEqual({trackerId: 'foo'});
      });
    });
  });

  describe('isGlobalContext - local storage', () => {
    it('returns true if the context is for a global request', () => {
      runWithAsyncLocalStore({trackerId: 'foo', installId: 1} as AppContext, () => {
        expect(isGlobalContext()).toEqual(false);
      });

      runWithAsyncLocalStore({trackerId: 'foo', installId: -1} as AppContext, () => {
        expect(isGlobalContext()).toEqual(true);
      });

      runWithAsyncLocalStore({trackerId: 'foo', installId: 0} as AppContext, () => {
        expect(isGlobalContext()).toEqual(true);
      });
    });
  });

  describe('getAppContext - configured in module scope', () => {
    it('provides the previously set context', () => {
      setContext({trackerId: 'foo'} as any);
      expect(getAppContext()).toEqual({trackerId: 'foo'});
    });
  });

  describe('isGlobalContext - configured in module scope', () => {
    it('returns true if the context is for a global request', () => {
      setContext({trackerId: 'foo', installId: 1} as any);
      expect(isGlobalContext()).toEqual(false);

      setContext({trackerId: 'foo', installId: -1} as any);
      expect(isGlobalContext()).toEqual(true);

      setContext({trackerId: 'foo', installId: 0} as any);
      expect(isGlobalContext()).toEqual(true);
    });
  });
});
