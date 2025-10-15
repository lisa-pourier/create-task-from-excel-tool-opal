import deepFreeze from 'deep-freeze';
import 'jest';

import {Rivendell} from '../../../util/Rivendell';
import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {validateMeta} from '../validateMeta';

jest.mock('../../../util/Rivendell', () => ({
  Rivendell: {
    shards: jest.fn()
  }
}));

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

describe('validateMeta', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('succeeds with a proper definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    expect(await validateMeta(runtime)).toEqual([]);
  });

  it('detects invalid app id', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, app_id: 'MyApp'}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual([
      'Invalid app.yml: meta.app_id must start with a letter, contain only lowercase alpha-numeric and underscore, ' +
        'and be between 3 and 32 characters long (/^[a-z][a-z_0-9]{2,31}$/)'
    ]);
  });

  it('detects blank display name', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, display_name: '\t'}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual(['Invalid app.yml: meta.display_name must not be blank']);
  });

  it('detects invalid version', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, version: '1.3'}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual([
      'Invalid app.yml: meta.version must be a semantic version number, optionally with -dev/-beta (and increment) ' +
        'or -private (/^\\d+\\.\\d+\\.\\d+(-(((dev|beta)(\\.\\d+)?)|private))?$/)'
    ]);
  });

  it('detects invalid vendor', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, vendor: 'MyCompany'}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual([
      'Invalid app.yml: meta.vendor must be lower snake case (/^[a-z0-9]+(_[a-z0-9]+)*$/)'
    ]);
  });

  it('detects invalid support url', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, support_url: 'foo.bar'}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual(['Invalid app.yml: meta.support_url must be a valid web address']);
  });

  it('detects invalid contact email', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, contact_email: 'foo@bar'}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual(['Invalid app.yml: meta.contact_email must be a valid email address']);
  });

  it('detects blank summary', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, summary: '  '}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual(['Invalid app.yml: meta.summary must not be blank']);
  });

  it('detects missing categories', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, categories: []}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual(['Invalid app.yml: meta.categories must contain 1 or 2 categories']);
  });

  it('detects too many categories', async () => {
    const manifest = {
      ...appManifest,
      meta: {
        ...appManifest.meta,
        categories: ['Commerce Platform', 'Point of Sale', 'Lead Capture']
      }
    };
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual(['Invalid app.yml: meta.categories must contain 1 or 2 categories']);
  });

  it('detects duplicate categories', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, categories: ['CRM', 'CRM']}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual(['Invalid app.yml: meta.categories contains two identical categories']);
  });

  it('detects availability is present', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, availability: []}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual([
      'Invalid app.yml: meta.availability must contain at least one availability zone'
    ]);
  });

  it('detects availability contains "all" or shards not both', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, availability: ['all', 'foo']}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateMeta(runtime)).toEqual([
      'Invalid app.yml: meta.availability should not contain any other availability zones ' +
        'if it contains "all" availability zones'
    ]);
  });

  it('detects invalid shards', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, availability: ['us', 'fuz']}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
    jest.spyOn(Rivendell, 'shards').mockResolvedValue(['us', 'bar']);

    expect(await validateMeta(runtime)).toEqual([
      'Invalid app.yml: meta.availability should only contain valid availability zones (us,bar) found: fuz'
    ]);
  });

  it('allows only none-primary shards', async () => {
    const manifest = {...appManifest, meta: {...appManifest.meta, availability: ['au', 'eu']}};
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
    jest.spyOn(Rivendell, 'shards').mockResolvedValue(['us', 'au', 'eu']);

    expect(await validateMeta(runtime)).toEqual([]);
  });
});
