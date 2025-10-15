/* eslint-disable max-classes-per-file, @typescript-eslint/no-unsafe-call */
import {ValueHash} from '../../../store';
import {SourceFunction} from '../../SourceFunction';
import {SourceJob, SourceJobStatus} from '../../SourceJob';
import {
  SourceCreateResponse,
  SourceDeleteResponse,
  SourceEnableResponse,
  SourceLifecycle,
  SourcePauseResponse,
  SourceUpdateResponse
} from '../../SourceLifecycle';
import {SourceSchemaFunction} from '../../SourceSchemaFunction';
import {Response} from '../../lib';
import {SourceSchema} from '../../types';
import {validateSources} from '../validateSources';

// Mock fs module
jest.mock('fs', () => {
  const originalExistsSyncMock = jest.fn();
  return {
    existsSync: originalExistsSyncMock,
    mocks: {
      existsSyncMock: originalExistsSyncMock
    }
  };
});

const mockedModule = jest.requireMock('fs');
const existsSyncMock = mockedModule.mocks.existsSyncMock;

class ValidSourceFunction extends SourceFunction {
  public async perform(): Promise<Response> {
    return new Response();
  }
}
class ValidSourceSchemaFunction extends SourceSchemaFunction {
  public async getSourcesSchema(): Promise<SourceSchema> {
    return Promise.resolve({
      name: 'asset',
      description: 'Asset Schema for Hub Shakedown',
      display_name: 'Hub Shakedown Schema',
      fields: [
        {
          name: 'hub_shakedown_name',
          type: 'string',
          display_name: 'Hub Shakedown Name',
          description: 'The name',
          primary: true
        }
      ]
    });
  }
}

class InvalidSourceSchemaFunction extends Function {
  public async getSourcesSchema(): Promise<SourceSchema> {
    return {} as SourceSchema;
  }
}

class ValidSourceLifecycle extends SourceLifecycle {
  public async onSourceCreate(): Promise<SourceCreateResponse> {
    return {success: true};
  }
  public async onSourceUpdate(): Promise<SourceUpdateResponse> {
    return {success: true};
  }
  public async onSourceDelete(): Promise<SourceDeleteResponse> {
    return {success: true};
  }
  public async onSourceEnable(): Promise<SourceEnableResponse> {
    return {success: true};
  }
  public async onSourcePause(): Promise<SourcePauseResponse> {
    return {success: true};
  }
}

class NonExtendedBar {
  public async prepare(_status?: SourceJobStatus): Promise<SourceJobStatus> {
    return {complete: false, state: {}};
  }
  public async perform(status: SourceJobStatus): Promise<SourceJobStatus> {
    return status;
  }
}
class ProperBar extends SourceJob {
  public async prepare(params: ValueHash, _status?: SourceJobStatus, _resuming?: boolean): Promise<SourceJobStatus> {
    return {complete: false, state: params};
  }
  public async perform(status: SourceJobStatus): Promise<SourceJobStatus> {
    return status;
  }
}

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockReturnValue('mocked')
}));

const getRuntime = (name: string, config: object) => ({
  manifest: {
    sources: {
      [name]: config
    }
  },
  getSourceFunctionClass: jest.fn(),
  getSourceLifecycleClass: jest.fn(),
  getSourceJobClass: jest.fn()
});

describe('validateSources', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('basic validation', () => {
    it('should return error when source function cannot be loaded', async () => {
      const runtime: any = getRuntime('invalidFunctionEntry', {
        function: {
          entry_point: 'dne'
        },
        schema: 'validSchema'
      });
      const getSourceFunctionClass = jest
        .spyOn(runtime, 'getSourceFunctionClass')
        .mockRejectedValue(new Error('not found'));
      existsSyncMock.mockReturnValueOnce(true);

      const result = await validateSources(runtime);

      getSourceFunctionClass.mockRestore();

      expect(result).toContain('Error loading SourceFunction entry point invalidFunctionEntry. Error: not found');
    });

    it('should return no errors if function is not defined', async () => {
      const runtime: any = getRuntime('noFunction', {
        schema: 'validSchema'
      });

      existsSyncMock.mockReturnValueOnce(true);
      const result = await validateSources(runtime);

      expect(result).toEqual([]);
    });

    it('should return error when source lifecycle cannot be loaded', async () => {
      const runtime: any = getRuntime('missingLifecycle', {
        function: {
          entry_point: 'SourceEntry'
        },
        schema: 'fooSchema',
        lifecycle: {
          entry_point: 'dne'
        }
      });
      const getSourceLifecycleClass = jest
        .spyOn(runtime, 'getSourceLifecycleClass')
        .mockRejectedValue(new Error('not found'));
      existsSyncMock.mockReturnValueOnce(true);

      const result = await validateSources(runtime);

      getSourceLifecycleClass.mockRestore();
      expect(result).toContain('Error loading SourceLifecycle entry point missingLifecycle. Error: not found');
    });

    it('should return error when schema is missing', async () => {
      const runtime: any = getRuntime('missingSchema', {
        function: {
          entry_point: 'SourceEntry'
        }
      });

      const result = await validateSources(runtime);

      expect(result).toContain('Source is missing the schema property: missingSchema');
    });

    it('should return error when schema name is not a string', async () => {
      const runtime: any = getRuntime('invalidSchema', {
        function: {
          entry_point: 'SourceEntry'
        },
        schema: 123
      });

      const result = await validateSources(runtime);

      expect(result).toContain('Source schema property must be a string or an object: invalidSchema');
    });

    it('should return no error when configuration is valid', async () => {
      const runtime: any = getRuntime('valid', {
        function: {
          entry_point: 'validSourceFunctionClass'
        },
        lifecycle: {
          entry_point: 'ValidSourceLifecycleClass'
        },
        schema: 'validSchema'
      });

      runtime.getSourceFunctionClass = () => ValidSourceFunction;
      runtime.getSourceLifecycleClass = () => ValidSourceLifecycle;
      existsSyncMock.mockReturnValueOnce(true).mockReturnValueOnce(true);

      const result = await validateSources(runtime);

      expect(result.length).toEqual(0);
    });

    it('should return error when schema file is missing', async () => {
      const validRuntime: any = {
        manifest: {
          sources: {
            validSource: {
              entry_point: 'validSourceClass',
              schema: 'validSchema'
            }
          }
        },
        getSourceFunctionClass: () => ValidSourceFunction,
        getSourceLifecycleClass: () => ValidSourceLifecycle
      };

      existsSyncMock.mockImplementation(false);

      const result = await validateSources(validRuntime);
      expect(result).toEqual(['File not found for Source schema validSchema']);
    });

    it('should validate schema entry_point when present', async () => {
      const validRuntime: any = {
        manifest: {
          sources: {
            validSource: {
              entry_point: 'validSourceClass',
              schema: {
                entry_point: 'ValidSourceSchemaFunction'
              }
            }
          }
        },
        getSourceFunctionClass: () => ValidSourceFunction,
        getSourceLifecycleClass: () => ValidSourceLifecycle,
        getSourceSchemaFunctionClass: () => ValidSourceSchemaFunction
      };

      existsSyncMock.mockReturnValueOnce(true);

      const result = await validateSources(validRuntime);
      expect(result.length).toEqual(0);
    });

    it('should return errors if schema entry_point is not extending the correct interface', async () => {
      const validRuntime: any = {
        manifest: {
          sources: {
            validSource: {
              entry_point: 'validSourceClass',
              schema: {
                entry_point: 'InvalidSourceSchemaFunction'
              }
            }
          }
        },
        getSourceFunctionClass: () => ValidSourceFunction,
        getSourceLifecycleClass: () => ValidSourceLifecycle,
        getSourceSchemaFunctionClass: () => InvalidSourceSchemaFunction
      };

      existsSyncMock.mockReturnValueOnce(true);

      const result = await validateSources(validRuntime);
      expect(result.length).toEqual(1);
      expect(result).toContain(
        'SourceSchemaFunction entry point does not extend App.SourceSchemaFunction: InvalidSourceSchemaFunction'
      );
    });
  });

  describe('validate source lifecycle', () => {
    function getSourceLifecycleClassMissingMethod(methodName: string): typeof SourceLifecycle {
      class ModifiedSource extends ValidSourceLifecycle {}
      Object.defineProperty(ModifiedSource.prototype, methodName, {});
      return ModifiedSource;
    }

    const requiredMethods = ['onSourceCreate', 'onSourceUpdate', 'onSourceDelete', 'onSourceEnable', 'onSourcePause'];

    requiredMethods.forEach((method) => {
      it(`should return error when source is missing the ${method} method`, async () => {
        const sourcelifecycleClass = getSourceLifecycleClassMissingMethod(method);

        const runtime: any = {
          manifest: {
            sources: {
              testSource: {
                lifecycle: {
                  entry_point: 'testSourceClass'
                },
                schema: 'testSchema',
                function: {
                  entry_point: 'testSourceClass'
                }
              }
            }
          },
          getSourceLifecycleClass: () => sourcelifecycleClass,
          getSourceFunctionClass: () => ValidSourceFunction
        };

        existsSyncMock.mockReturnValueOnce(true);
        const result = await validateSources(runtime);
        expect(result).toContain(`SourceLifecycle entry point is missing the ${method} method: testSourceClass`);
      });
    });
  });

  describe('validateJobs', () => {
    it('succeeds with a proper definition', async () => {
      const runtime: any = getRuntime('validSourceJobs', {
        jobs: {
          bar: {
            entry_point: 'ValidSourceJob'
          }
        },
        schema: 'fooSchema'
      });
      runtime.getSourceFunctionClass = () => ValidSourceFunction;
      runtime.getSourceJobClass = () => ProperBar;
      existsSyncMock.mockReturnValueOnce(true);

      const errors = await validateSources(runtime);
      expect(errors).toEqual([]);
    });

    it('should return error when source job cannot be loaded', async () => {
      const runtime: any = getRuntime('invalidJobEntry', {
        jobs: {
          bar: {
            entry_point: 'dne'
          }
        },
        schema: 'validSchema'
      });
      const getSourceJobClass = jest.spyOn(runtime, 'getSourceJobClass').mockRejectedValue(new Error('not found'));

      const result = await validateSources(runtime);
      getSourceJobClass.mockRestore();

      expect(result).toContain('Error loading job entry point bar. Error: not found');
    });

    it('detects non-extended job entry point', async () => {
      const runtime: any = getRuntime('nonExtendJob', {
        jobs: {
          bar: {
            entry_point: 'InvalidSourceJob'
          }
        },
        schema: 'validSchema'
      });

      runtime.getSourceJobClass = () => NonExtendedBar;
      const errors = await validateSources(runtime);

      expect(errors).toContain('SourceJob entry point does not extend App.SourceJob: InvalidSourceJob');
    });
  });
});
