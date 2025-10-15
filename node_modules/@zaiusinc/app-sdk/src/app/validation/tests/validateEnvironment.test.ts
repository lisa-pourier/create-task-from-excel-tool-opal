import deepFreeze from 'deep-freeze';
import 'jest';

import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {validateEnvironment} from '../validateEnvironment';

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
  environment: ['APP_ENV_FOO'],
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

describe('validateEnvironment', () => {
  it('succeeds with a proper definition', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    expect(validateEnvironment(runtime)).toEqual([]);
  });

  it('requires the APP_ENV_ prefix', () => {
    const manifest = {...appManifest, environment: ['APP_ENV_FOO', 'MY_VARIABLE']};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(validateEnvironment(runtime)).toEqual([
      'Invalid app.yml: environment.MY_VARIABLE must be prefixed with "APP_ENV_" and consist of only uppercase ' +
        'alphanumeric and underscores'
    ]);
  });

  it('detects invalid characters', () => {
    const manifest = {...appManifest, environment: ['app_env_bar', 'My Awesome Variable', ' APP_ENV_FOO ']};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(validateEnvironment(runtime)).toEqual([
      'Invalid app.yml: environment.app_env_bar must be prefixed with "APP_ENV_" and consist of only uppercase ' +
        'alphanumeric and underscores',
      'Invalid app.yml: environment["My Awesome Variable"] must be prefixed with "APP_ENV_" and consist of only ' +
        'uppercase alphanumeric and underscores',
      'Invalid app.yml: environment[" APP_ENV_FOO "] must be prefixed with "APP_ENV_" and consist of only uppercase ' +
        'alphanumeric and underscores'
    ]);
  });

  it('detects duplicate variable names', () => {
    const manifest = {
      ...appManifest,
      environment: ['APP_ENV_FOO', 'APP_ENV_BAR', 'APP_ENV_BUZZ', 'APP_ENV_FOO', 'APP_ENV_BUZZ']
    };
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(validateEnvironment(runtime)).toEqual([
      'Invalid app.yml: environment.APP_ENV_FOO is listed more than once',
      'Invalid app.yml: environment.APP_ENV_BUZZ is listed more than once'
    ]);
  });

  it('is fine with an undefined list', () => {
    const manifest = {...appManifest, environment: undefined};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(validateEnvironment(runtime)).toEqual([]);
  });

  it('is fine with an empty list', () => {
    const manifest = {...appManifest, environment: []};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(validateEnvironment(runtime)).toEqual([]);
  });
});
