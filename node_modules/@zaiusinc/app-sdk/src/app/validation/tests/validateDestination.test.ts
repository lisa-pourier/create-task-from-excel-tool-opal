/* eslint-disable max-classes-per-file */
import fs from 'fs';

import {DestinationSchema} from '../..';
import {Destination, GetDestinationSchemaResult} from '../../Destination';
import {DestinationSchemaFunction} from '../../DestinationSchemaFunction';
import {validateDestinations} from '../validateDestinations';

class ValidDestination extends Destination<any> {
  public getDestinationSchema(): Promise<GetDestinationSchemaResult> {
    throw new Error('Method not implemented.');
  }
  public async ready() {
    return {ready: true};
  }
  public async deliver(batch: any) {
    return {success: !batch};
  }
}

class ValidDestinationSchemaFunction extends DestinationSchemaFunction {
  public async getDestinationsSchema(): Promise<DestinationSchema> {
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

class InvalidDestinationSchemaFunction extends Function {
  public async getDestinationsSchema(): Promise<DestinationSchema> {
    return {} as DestinationSchema;
  }
}

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
const existsSyncMock: jest.Mock = mockedModule.mocks.existsSyncMock;

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockReturnValue('mocked')
}));

describe('validateDestination', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const invalidRuntime: any = {
    manifest: {
      destinations: {
        validDestination: {
          entry_point: 'validDestinationClass',
          schema: 'validSchema'
        },
        missingSchema: {
          entry_point: 'missingSchemaClass'
        },
        invalidSchema: {
          entry_point: 'invalidSchemaClass',
          schema: 123
        }
      }
    },
    getDestinationClass: jest.fn()
  };

  it('should return error when destination cannot be loaded', async () => {
    const getDestinationsClass = jest
      .spyOn(invalidRuntime, 'getDestinationClass')
      .mockRejectedValue(new Error('not found'));
    const result = await validateDestinations(invalidRuntime);
    getDestinationsClass.mockRestore();
    expect(result).toContain('Error loading entry point validDestination. Error: not found');
  });

  it('should return error when schema is missing', async () => {
    const result = await validateDestinations(invalidRuntime);
    expect(result).toContain('Destination is missing the schema property: missingSchema');
  });

  it('should return error when schema is not a string or an object', async () => {
    const result = await validateDestinations(invalidRuntime);
    expect(result).toContain('Destination schema property must be a string or an object: invalidSchema');
  });

  it('should return no error when configuration is valid', async () => {
    const validRuntime: any = {
      manifest: {
        destinations: {
          validDestination: {
            entry_point: 'validDestinationClass',
            schema: 'validSchema'
          }
        }
      },
      getDestinationClass: () => ValidDestination
    };

    jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
    const result = await validateDestinations(validRuntime);
    expect(result.length).toEqual(0);
  });

  it('should return error when schema is missing', async () => {
    const validRuntime: any = {
      manifest: {
        destinations: {
          validDestination: {
            entry_point: 'validDestinationClass',
            schema: 'validSchema'
          }
        }
      },
      getDestinationClass: () => ValidDestination
    };

    existsSyncMock.mockReturnValueOnce(false);
    const result = await validateDestinations(validRuntime);
    expect(result).toEqual(['File not found for Destination schema validSchema']);
  });

  it('should validate schema entry_point when present', async () => {
    const validRuntime: any = {
      manifest: {
        destinations: {
          validDestination: {
            entry_point: 'validDestinationClass',
            schema: {
              entry_point: 'ValidDestinationSchemaFunction'
            }
          }
        }
      },
      getDestinationClass: () => ValidDestination,
      getDestinationSchemaFunctionClass: () => ValidDestinationSchemaFunction
    };

    const result = await validateDestinations(validRuntime);
    expect(result.length).toEqual(0);
  });

  it('should return errors if schema entry_point is not extending the correct interface', async () => {
    const runtime: any = {
      manifest: {
        destinations: {
          validDestination: {
            entry_point: 'validDestinationClass',
            schema: {
              entry_point: 'InvalidDestinationSchemaFunction'
            }
          }
        }
      },
      getDestinationClass: () => ValidDestination,
      getDestinationSchemaFunctionClass: () => InvalidDestinationSchemaFunction
    };

    const result = await validateDestinations(runtime);
    expect(result.length).toEqual(1);
    expect(result).toContain(
      'DestinationSchemaFunction entry point does not extend ' +
        'App.DestinationSchemaFunction: InvalidDestinationSchemaFunction'
    );
  });
});
