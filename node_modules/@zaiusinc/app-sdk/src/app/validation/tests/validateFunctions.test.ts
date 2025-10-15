/* eslint-disable max-classes-per-file */
import deepFreeze from 'deep-freeze';
import 'jest';

import {Function} from '../../Function';
import {GlobalFunction} from '../../GlobalFunction';
import {FunctionClassNotFoundError, Runtime} from '../../Runtime';
import {Request, Response} from '../../lib';
import {AppManifest} from '../../types';
import {validateFunctions} from '../validateFunctions';

const appManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Commerce Platform'],
    availability: ['all']
  },
  runtime: 'node12',
  functions: {
    foo: {
      entry_point: 'Foo',
      description: 'gets foo'
    },
    global_foo: {
      entry_point: 'GlobalFoo',
      description: 'gets foo globally',
      global: true
    }
  },
  jobs: {
    bar: {
      entry_point: 'Bar',
      description: 'Does a thing'
    }
  }
} as AppManifest);

class NonExtendedFoo {
  // Nothing
}

abstract class PartialFoo extends Function {
  protected constructor(request: Request) {
    super(request);
  }
}

abstract class PartialGlobalFoo extends GlobalFunction {
  protected constructor(request: Request) {
    super(request);
  }
}

class ProperFoo extends Function {
  public constructor(request: Request) {
    super(request);
  }

  public async perform(): Promise<Response> {
    return new Response();
  }
}

class ProperGlobalFoo extends GlobalFunction {
  public constructor(request: Request) {
    super(request);
  }

  public async perform(): Promise<Response> {
    return new Response();
  }
}

describe('validateFunctions', () => {
  it('succeeds with a proper definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest
      .spyOn(Runtime.prototype, 'getFunctionClass')
      .mockImplementation((name) => Promise.resolve(name === 'foo' ? ProperFoo : ProperGlobalFoo));

    const errors = await validateFunctions(runtime);

    expect(getFunctionClass).toHaveBeenCalledWith('foo');
    expect(getFunctionClass).toHaveBeenCalledWith('global_foo');
    expect(errors).toEqual([]);

    getFunctionClass.mockRestore();
  });

  it('detects missing function entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest
      .spyOn(Runtime.prototype, 'getFunctionClass')
      .mockRejectedValue(new FunctionClassNotFoundError('not found'));

    expect(await validateFunctions(runtime)).toEqual([
      'Error loading function class foo. Error: not found',
      'Error loading function class global_foo. Error: not found'
    ]);

    getFunctionClass.mockRestore();
  });

  it('detects loading errors', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest
      .spyOn(Runtime.prototype, 'getFunctionClass')
      .mockRejectedValue(new Error('dependent module not found'));

    expect(await validateFunctions(runtime)).toEqual([
      'Failed to load function class foo.  Error was: dependent module not found'
    ]);

    getFunctionClass.mockRestore();
  });

  it('detects non-extended function entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest.spyOn(Runtime.prototype, 'getFunctionClass').mockResolvedValue(NonExtendedFoo as any);

    expect(await validateFunctions(runtime)).toEqual([
      'Function entry point does not extend App.Function: Foo',
      'Global Function entry point does not extend App.GlobalFunction: GlobalFoo'
    ]);

    getFunctionClass.mockRestore();
  });

  it('detects global functions implementing functions and vis versa', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest
      .spyOn(Runtime.prototype, 'getFunctionClass')
      .mockImplementation((name) => Promise.resolve(name === 'foo' ? ProperGlobalFoo : ProperFoo));

    expect(await validateFunctions(runtime)).toEqual([
      'Function entry point does not extend App.Function: Foo',
      'Global Function entry point does not extend App.GlobalFunction: GlobalFoo'
    ]);

    getFunctionClass.mockRestore();
  });

  it('detects partial function entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getFunctionClass = jest
      .spyOn(Runtime.prototype, 'getFunctionClass')
      .mockImplementation((name) => Promise.resolve(name === 'foo' ? PartialFoo : PartialGlobalFoo) as Promise<any>);

    expect(await validateFunctions(runtime)).toEqual([
      'Function entry point is missing the perform method: Foo',
      'Function entry point is missing the perform method: GlobalFoo'
    ]);

    getFunctionClass.mockRestore();
  });

  it('detects global function defining a installation resolution', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

    runtime.manifest.functions!.global_foo.installation_resolution = {type: 'HEADER', key: 'foo'};
    const getFunctionClass = jest
      .spyOn(Runtime.prototype, 'getFunctionClass')
      .mockImplementation((name) => Promise.resolve(name === 'foo' ? ProperFoo : ProperGlobalFoo));

    expect(await validateFunctions(runtime)).toEqual(['Global functions cannot define a installation_resolution']);
    getFunctionClass.mockRestore();
  });

  it('detects a invalid JSONPath expression', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

    runtime.manifest.functions!.foo.installation_resolution = {
      type: 'JSON_BODY_FIELD',
      key: '/test/foo'
    };
    const getFunctionClass = jest
      .spyOn(Runtime.prototype, 'getFunctionClass')
      .mockImplementation((name) => Promise.resolve(name === 'foo' ? ProperFoo : ProperGlobalFoo));

    expect(await validateFunctions(runtime)).toEqual([
      'Invalid JSON path expression: Lexical error on line 1. Unrecognized text.\n' + '/test/foo\n' + '^'
    ]);
    getFunctionClass.mockRestore();
  });
});
