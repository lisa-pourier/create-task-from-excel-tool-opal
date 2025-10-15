/* eslint-disable max-classes-per-file */
import deepFreeze from 'deep-freeze';
import 'jest';

import {Lifecycle} from '../../Lifecycle';
import {Runtime} from '../../Runtime';
import {LifecycleSettingsResult, Request} from '../../lib';
import {AuthorizationGrantResult} from '../../lib/AuthorizationGrantResult';
import {AppManifest, LifecycleResult} from '../../types';
import {validateLifecycle} from '../validateLifecycle';

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
  }
} as AppManifest);

class NonExtendedLifecycle {
  // Nothing
}

abstract class PartialLifecycle extends Lifecycle {
  protected constructor() {
    super();
  }
}

class ProperLifecycle extends Lifecycle {
  public constructor() {
    super();
  }

  public async onInstall(): Promise<LifecycleResult> {
    return {success: true};
  }

  public async onSettingsForm(_page: string, _action: string, _formData: object): Promise<LifecycleSettingsResult> {
    return new LifecycleSettingsResult();
  }

  public async onUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    return {success: true};
  }

  public async onFinalizeUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    return {success: true};
  }

  public async onUninstall(): Promise<LifecycleResult> {
    return {success: true};
  }

  public async onAuthorizationRequest(_page: string, _formData: object): Promise<LifecycleSettingsResult> {
    return new LifecycleSettingsResult();
  }

  public async onAuthorizationGrant(_request: Request): Promise<AuthorizationGrantResult> {
    return new AuthorizationGrantResult('oauth');
  }
}

describe('validateLifecycle', () => {
  it('succeeds with a proper definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getLifecycleClass = jest.spyOn(Runtime.prototype, 'getLifecycleClass').mockResolvedValue(ProperLifecycle);

    const errors = await validateLifecycle(runtime);

    expect(getLifecycleClass).toHaveBeenCalled();
    expect(errors).toEqual([]);

    getLifecycleClass.mockRestore();
  });

  it('detects missing lifecycle implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getLifecycleClass = jest
      .spyOn(Runtime.prototype, 'getLifecycleClass')
      .mockRejectedValue(new Error('not found'));

    expect(await validateLifecycle(runtime)).toEqual(['Error loading Lifecycle implementation. Error: not found']);

    getLifecycleClass.mockRestore();
  });

  it('detects non-extended lifecycle implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getLifecycleClass = jest
      .spyOn(Runtime.prototype, 'getLifecycleClass')
      .mockResolvedValue(NonExtendedLifecycle as any);

    expect(await validateLifecycle(runtime)).toEqual(['Lifecycle implementation does not extend App.Lifecycle']);

    getLifecycleClass.mockRestore();
  });

  it('detects partial lifecycle implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getLifecycleClass = jest
      .spyOn(Runtime.prototype, 'getLifecycleClass')
      .mockResolvedValue(PartialLifecycle as any);

    expect(await validateLifecycle(runtime)).toEqual([
      'Lifecycle implementation is missing the onInstall method',
      'Lifecycle implementation is missing the onSettingsForm method',
      'Lifecycle implementation is missing the onUpgrade method',
      'Lifecycle implementation is missing the onFinalizeUpgrade method',
      'Lifecycle implementation is missing the onUninstall method',
      'Lifecycle implementation is missing the onAuthorizationRequest method',
      'Lifecycle implementation is missing the onAuthorizationGrant method'
    ]);

    getLifecycleClass.mockRestore();
  });
});
