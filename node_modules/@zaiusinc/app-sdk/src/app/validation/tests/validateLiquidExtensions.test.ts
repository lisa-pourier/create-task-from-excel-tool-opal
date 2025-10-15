/* eslint-disable max-classes-per-file */
import deepFreeze from 'deep-freeze';
import 'jest';

import {LiquidExtension} from '../../LiquidExtension';
import {Runtime} from '../../Runtime';
import {LiquidExtensionResult} from '../../lib';
import {AppManifest} from '../../types';
import {validateLiquidExtensions} from '../validateLiquidExtensions';

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
    }
  },
  jobs: {
    bar: {
      entry_point: 'Bar',
      description: 'Does a thing'
    }
  },
  liquid_extensions: {
    buzz: {
      entry_point: 'Buzz',
      description: 'Buzzes'
    }
  }
} as AppManifest);

class NonExtendedBuzz {
  // Nothing
}

abstract class PartialBuzz extends LiquidExtension {
  // Nothing
}

class ProperBuzz extends LiquidExtension {
  public async perform(): Promise<LiquidExtensionResult> {
    return LiquidExtensionResult.success('buzz');
  }
}

describe('validateLiquidExtensions', () => {
  it('succeeds with a proper definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getLiquidExtensionClass = jest
      .spyOn(Runtime.prototype, 'getLiquidExtensionClass')
      .mockResolvedValue(ProperBuzz);

    const errors = await validateLiquidExtensions(runtime);

    expect(getLiquidExtensionClass).toHaveBeenCalledWith('buzz');
    expect(errors).toEqual([]);

    getLiquidExtensionClass.mockRestore();
  });

  it('detects missing liquid extension entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getLiquidExtensionClass = jest
      .spyOn(Runtime.prototype, 'getLiquidExtensionClass')
      .mockRejectedValue(new Error('not found'));

    expect(await validateLiquidExtensions(runtime)).toEqual([
      'Error loading entry point for liquid extension buzz. Error: not found'
    ]);

    getLiquidExtensionClass.mockRestore();
  });

  it('detects non-extended liquid extension entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getLiquidExtensionClass = jest
      .spyOn(Runtime.prototype, 'getLiquidExtensionClass')
      .mockResolvedValue(NonExtendedBuzz as any);

    expect(await validateLiquidExtensions(runtime)).toEqual([
      'Liquid Extension entry point does not extend App.LiquidExtension: Buzz'
    ]);

    getLiquidExtensionClass.mockRestore();
  });

  it('detects partial liquid extension entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getLiquidExtensionClass = jest
      .spyOn(Runtime.prototype, 'getLiquidExtensionClass')
      .mockResolvedValue(PartialBuzz as any);

    expect(await validateLiquidExtensions(runtime)).toEqual([
      'Liquid Extension entry point is missing the perform method: Buzz'
    ]);

    getLiquidExtensionClass.mockRestore();
  });
});
