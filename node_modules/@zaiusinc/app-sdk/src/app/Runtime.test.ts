import Ajv from 'ajv';
import deepFreeze from 'deep-freeze';
import fs from 'fs';
import 'jest';
import * as jsYaml from 'js-yaml';
import mockFs from 'mock-fs';

import {Runtime} from './Runtime';
import {AppManifest} from './types';
import {SchemaObject} from './types/SchemaObject';

jest.mock('js-yaml');

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
  consumers: {
    loo: {
      entry_point: 'Loo',
      description: 'gets loo'
    }
  },
  jobs: {
    bar: {
      entry_point: 'Bar',
      description: 'Does a thing'
    }
  },
  sources: {
    bar: {
      description: 'the bar source',
      schema: 'barSchema',
      jobs: {
        bar: {
          entry_point: 'Bar',
          description: 'Bar'
        }
      }
    }
  },
  liquid_extensions: {
    buzz: {
      entry_point: 'Buzz',
      description: 'Buzzes'
    }
  }
} as AppManifest);

const schemaObjects = deepFreeze({
  'schema/events.yml': {
    name: 'events',
    fields: [
      {
        name: 'my_app_coupon_id',
        type: 'string',
        display_name: 'My App Coupon ID',
        description: 'The coupon associated with this event'
      }
    ],
    relations: [
      {
        name: 'my_app_coupon',
        display_name: 'My App Coupon',
        child_object: 'my_app_coupons',
        join_fields: [
          {
            parent: 'my_app_coupon_id',
            child: 'coupon_id'
          }
        ]
      }
    ]
  },
  'schema/my_app_coupons.yaml': {
    name: 'my_app_coupons',
    display_name: 'My App Coupons',
    fields: [
      {
        name: 'coupon_id',
        type: 'string',
        display_name: 'Coupon ID',
        description: 'The Coupon ID',
        primary: true
      },
      {
        name: 'percent_off',
        type: 'number',
        display_name: 'Percent Off',
        description: 'Percentage discount'
      }
    ]
  }
} as {[file: string]: SchemaObject}) as {[file: string]: SchemaObject};

describe('Runtime', () => {
  beforeAll(() => {
    mockFs({
      '/tmp/foo': {
        'app.yml': JSON.stringify(appManifest),
        schema: {
          'events.yml': JSON.stringify(schemaObjects['schema/events.yml']),
          'my_app_coupons.yaml': JSON.stringify(schemaObjects['schema/my_app_coupons.yaml']),
          'something_else.yml.txt': 'something else'
        }
      }
    });
  });

  afterAll(() => {
    mockFs.restore();
  });

  describe('initialize', () => {
    it('loads and validates the manifest', async () => {
      const yamlLoadFn = jest.spyOn(jsYaml, 'load').mockImplementation((data) => JSON.parse(data));
      const validateFn = jest.spyOn(Ajv.prototype, 'validate').mockReturnValue(true);

      const runtime = await Runtime.initialize('/tmp/foo');
      expect(yamlLoadFn).toHaveBeenCalled();
      expect(validateFn).toHaveBeenCalled();

      expect(JSON.parse(runtime.toJson())).toEqual({
        appManifest,
        dirName: '/tmp/foo'
      });

      yamlLoadFn.mockRestore();
      validateFn.mockRestore();
    });

    it('throws an error when the manifest is invalid', async () => {
      const yamlLoadFn = jest.spyOn(jsYaml, 'load').mockImplementation((data) => JSON.parse(data));
      const validateFn = jest.spyOn(Ajv.prototype, 'validate').mockReturnValue(false);

      try {
        await Runtime.initialize('/tmp/foo');
      } catch (e: any) {
        expect(e.message).toMatch(/Invalid app.yml manifest/);
      }

      yamlLoadFn.mockRestore();
      validateFn.mockRestore();
    });
  });

  describe('fromJson', () => {
    it('restores from serialized json', () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      expect(runtime.manifest).toEqual(appManifest);
      expect(runtime['dirName']).toEqual('/tmp/foo');
    });
  });

  describe('toJson', () => {
    it('serializes to json', () => {
      const json = JSON.stringify({appManifest, dirName: '/tmp/foo'});
      const runtime = Runtime.fromJson(json);
      expect(runtime.toJson()).toEqual(json);
    });
  });

  describe('getFunctionClass', () => {
    it('loads the specified module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Foo: 'Foo'});

      const foo = await runtime.getFunctionClass('foo');

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/functions/Foo');
      expect(foo).toEqual('Foo');

      importFn.mockRestore();
    });

    it("throws an error the function isn't in the manifest", async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

      try {
        await runtime.getFunctionClass('bar');
      } catch (e: any) {
        expect(e.message).toMatch(/^No function named bar/);
      }
    });
  });

  describe('getJobClass', () => {
    it('loads the specified module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Bar: 'Bar'});

      const bar = await runtime.getJobClass('bar');

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/jobs/Bar');
      expect(bar).toEqual('Bar');

      importFn.mockRestore();
    });

    it("throws an error the job isn't in the manifest", async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

      try {
        await runtime.getJobClass('foo');
      } catch (e: any) {
        expect(e.message).toMatch(/^No job named foo/);
      }
    });
  });

  describe('getSourceJobClass', () => {
    it('loads the specified module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Bar: 'Bar'});

      const bar = await runtime.getSourceJobClass('bar', 'bar');

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/sources/jobs/Bar');
      expect(bar).toEqual('Bar');

      importFn.mockRestore();
    });

    it("throws an error the job isn't in the manifest", async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

      try {
        await runtime.getSourceJobClass('bar', 'foo');
      } catch (e: any) {
        expect(e.message).toMatch(/^No source job named foo defined/);
      }
    });
  });

  describe('getLiquidExtensionClass', () => {
    it('loads the specified module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Buzz: 'Buzz'});

      const buzz = await runtime.getLiquidExtensionClass('buzz');

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/liquid-extensions/Buzz');
      expect(buzz).toEqual('Buzz');

      importFn.mockRestore();
    });

    it("throws an error if the liquid extension isn't in the manifest", async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

      try {
        await runtime.getLiquidExtensionClass('bar');
      } catch (e: any) {
        expect(e.message).toMatch(/^No liquid extension named bar/);
      }
    });
  });

  describe('getLifecycleClass', () => {
    it('loads the lifecycle module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Lifecycle: 'Lifecycle'});

      const lifecycle = await runtime.getLifecycleClass();

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/lifecycle/Lifecycle');
      expect(lifecycle).toEqual('Lifecycle');

      importFn.mockRestore();
    });
  });

  describe('getChannelClass', () => {
    it('loads the channel module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Channel: 'Channel'});

      const channel = await runtime.getChannelClass();

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/channel/Channel');
      expect(channel).toEqual('Channel');

      importFn.mockRestore();
    });
  });

  describe('getSchemaObjects', () => {
    it('loads all .yml and .yaml files in the schema directory', () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const origReadFileSync = fs.readFileSync;
      const readFileSyncFn = jest.spyOn(fs, 'readFileSync').mockImplementation(origReadFileSync);
      const yamlLoadFn = jest.spyOn(jsYaml, 'load').mockImplementation((data) => JSON.parse(data));

      const result = runtime.getSchemaObjects();
      expect(readFileSyncFn.mock.calls).toEqual([
        ['/tmp/foo/schema/my_app_coupons.yaml', 'utf8'],
        ['/tmp/foo/schema/events.yml', 'utf8']
      ]);
      expect(result).toEqual(schemaObjects);

      readFileSyncFn.mockRestore();
      yamlLoadFn.mockRestore();
    });
  });
});
