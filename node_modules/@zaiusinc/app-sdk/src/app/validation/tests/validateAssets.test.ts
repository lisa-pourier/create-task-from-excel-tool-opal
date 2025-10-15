import deepFreeze from 'deep-freeze';
import mockFs from 'mock-fs';

import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {validateAssets} from '../validateAssets';

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
  }
} as AppManifest) as AppManifest;

const formContent = `
sections:
  - key: stuff
    label: Stuff
    elements:
      - key: junk
        label: Junk
        help: Some junk
        type: text
`;

function appDir(): any {
  return {
    'path/to/app/dir': {
      dist: {},
      assets: {
        directory: {
          'overview.md': '## Overview'
        },
        'icon.svg': '0110',
        'logo.svg': '0101'
      },
      forms: {
        'settings.yml': formContent
      }
    }
  };
}

const channelAppManifest = deepFreeze({
  ...appManifest,
  meta: {
    ...appManifest.meta,
    categories: ['Channel']
  },
  channel: {
    type: 'sms',
    targeting: 'dynamic'
  }
} as AppManifest) as AppManifest;

function channelAppDir(): any {
  const base = appDir();
  return {
    'path/to/app/dir': {
      ...base['path/to/app/dir'],
      forms: {
        ...base['path/to/app/dir'].forms,
        'content-settings.yml': formContent,
        'content-template.yml': formContent
      }
    }
  };
}

async function expectError(error: string | string[], manifest?: AppManifest) {
  const runtime = Runtime.fromJson(
    JSON.stringify({
      appManifest: manifest || appManifest,
      dirName: 'path/to/app/dir/dist'
    })
  );
  expect(await validateAssets(runtime)).toEqual(error instanceof Array ? error : [error]);
}

describe('validateAssets', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('succeeds when all required assets are available', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir/dist'}));
    mockFs(appDir());
    expect(await validateAssets(runtime)).toEqual([]);
  });

  it('fails when assets/directory/overview.md does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['directory']['overview.md'];
    mockFs(missingAssets);
    await expectError('Required file assets/directory/overview.md is missing.');
  });

  it('fails when forms/settings.yml does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['forms']['settings.yml'];
    mockFs(missingAssets);
    await expectError('Required file forms/settings.yml is missing.');
  });

  it('fails when assets/icon.svg does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['icon.svg'];
    mockFs(missingAssets);
    await expectError('Required file assets/icon.svg is missing.');
  });

  it('fails when assets/logo.svg does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['logo.svg'];
    mockFs(missingAssets);
    await expectError('Required file assets/logo.svg is missing.');
  });

  it('fails when markdown files contain links to unknown headers', async () => {
    const missingHeaderLinks = appDir();
    missingHeaderLinks['path/to/app/dir']['assets']['directory']['overview.md'] = '[dne](#dne).';
    mockFs(missingHeaderLinks);
    await expectError('Link to unknown heading: `dne` in assets/directory/overview.md:1:1-1:12.');
  });

  it('fails when markdown files contain links to unknown files', async () => {
    const missingFileLinks = appDir();
    missingFileLinks['path/to/app/dir']['assets']['directory']['overview.md'] = '[missing](missing.js)';
    mockFs(missingFileLinks);
    await expectError('Link to unknown file: `missing.js` in assets/directory/overview.md:1:1-1:22.');
  });

  it('detects schema errors in forms/settings.yml', async () => {
    const badForm = appDir();
    badForm['path/to/app/dir']['forms']['settings.yml'] = 'something: wrong';
    mockFs(badForm);
    await expectError([
      "Invalid forms/settings.yml: must have required property 'sections'",
      'Invalid forms/settings.yml: must NOT have additional properties'
    ]);
  });

  describe('channel app', () => {
    it('succeeds when all required assets are available', async () => {
      const runtime = Runtime.fromJson(
        JSON.stringify({
          appManifest: channelAppManifest,
          dirName: 'path/to/app/dir/dist'
        })
      );
      mockFs(channelAppDir());
      expect(await validateAssets(runtime)).toEqual([]);
    });

    it('fails when content forms do not exist', async () => {
      const missingAssets = channelAppDir();
      delete missingAssets['path/to/app/dir']['forms']['content-settings.yml'];
      delete missingAssets['path/to/app/dir']['forms']['content-template.yml'];
      mockFs(missingAssets);
      await expectError(
        [
          'Required file forms/content-settings.yml is missing.',
          'Required file forms/content-template.yml is missing.'
        ],
        channelAppManifest
      );
    });

    it('detects schema errors in content forms', async () => {
      const badForms = channelAppDir();
      badForms['path/to/app/dir']['forms']['content-settings.yml'] = 'something: wrong';
      badForms['path/to/app/dir']['forms']['content-template.yml'] = 'sections:\n  - elements:\n    - type: text';
      mockFs(badForms);
      await expectError(
        [
          "Invalid forms/content-settings.yml: must have required property 'sections'",
          'Invalid forms/content-settings.yml: must NOT have additional properties',
          "Invalid forms/content-template.yml: sections[0] must have required property 'key'",
          "Invalid forms/content-template.yml: sections[0] must have required property 'label'",
          "Invalid forms/content-template.yml: sections[0].elements[0] must have required property 'help'",
          "Invalid forms/content-template.yml: sections[0].elements[0] must have required property 'key'",
          "Invalid forms/content-template.yml: sections[0].elements[0] must have required property 'label'"
        ],
        channelAppManifest
      );
    });
  });
});
