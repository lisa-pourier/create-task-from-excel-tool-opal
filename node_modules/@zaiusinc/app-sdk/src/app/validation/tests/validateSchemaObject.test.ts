import deepFreeze from 'deep-freeze';
import 'jest';

import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {SchemaObject, SchemaObjects} from '../../types/SchemaObject';
import {validateSchemaObject} from '../validateSchemaObject';

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

const schemaObjects = deepFreeze({
  'events.yml': {
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
  'my_app_coupons.yml': {
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
} as SchemaObjects) as SchemaObjects;

describe('validateSchemaObject', () => {
  it('succeeds with a proper definition', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

    expect(validateSchemaObject(runtime, schemaObjects['events.yml'], 'events.yml')).toEqual([]);
    expect(validateSchemaObject(runtime, schemaObjects['my_app_coupons.yml'], 'my_app_coupons.yml')).toEqual([]);
  });

  it('detects invalid names', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObjects: SchemaObjects = {
      'events.yml': {
        ...schemaObjects['events.yml'],
        fields: [{...schemaObjects['events.yml'].fields![0], name: 'couponID'}],
        relations: [{...schemaObjects['events.yml'].relations![0], name: 'couponID'}]
      },
      'my_app_Coupons.yml': {
        ...schemaObjects['my_app_coupons.yml'],
        name: 'my_app_Coupons',
        alias: 'Foo',
        fields: [{...schemaObjects['my_app_coupons.yml'].fields![0], name: 'couponID'}]
      },
      'customers.yml': {
        name: 'customers',
        identifiers: [
          {
            name: 'customer_key',
            display_name: 'Customer Key',
            merge_confidence: 'low'
          }
        ]
      }
    };

    expect(validateSchemaObject(runtime, badSchemaObjects['events.yml'], 'events.yml')).toEqual([
      'Invalid events.yml: fields[0].name must start with a letter, contain only lowercase alpha-numeric ' +
        'and underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)',
      'Invalid events.yml: fields[0].name must be prefixed with "my_app_"',
      'Invalid events.yml: relations[0].name must start with a letter, contain only lowercase alpha-numeric ' +
        'and underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)',
      'Invalid events.yml: relations[0].name must be prefixed with "my_app_"'
    ]);
    expect(validateSchemaObject(runtime, badSchemaObjects['my_app_Coupons.yml'], 'my_app_Coupons.yml')).toEqual([
      'Invalid my_app_Coupons.yml: name must start with a letter, contain only lowercase alpha-numeric and ' +
        'underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)',
      'Invalid my_app_Coupons.yml: alias must be prefixed with "my_app_"',
      'Invalid my_app_Coupons.yml: fields[0].name must start with a letter, contain only lowercase ' +
        'alpha-numeric and underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)'
    ]);
    expect(validateSchemaObject(runtime, badSchemaObjects['customers.yml'], 'customers.yml')).toEqual([
      'Invalid customers.yml: identifiers[0].name must be prefixed with "my_app_"',
      'Invalid customers.yml: identifiers[0].display_name must be prefixed with "My App "'
    ]);
  });

  it('detects invalid display name and description on custom items', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObjects: SchemaObjects = {
      'events.yml': {
        ...schemaObjects['events.yml'],
        fields: [{...schemaObjects['events.yml'].fields![0], display_name: '  ', description: '\t'}],
        relations: [{...schemaObjects['events.yml'].relations![0], display_name: ''}]
      },
      'my_app_coupons.yml': {
        ...schemaObjects['my_app_coupons.yml'],
        display_name: '',
        fields: [{...schemaObjects['my_app_coupons.yml'].fields![0], display_name: '\t', description: ''}]
      }
    };

    expect(validateSchemaObject(runtime, badSchemaObjects['events.yml'], 'events.yml')).toEqual([
      'Invalid events.yml: fields[0].display_name must be specified',
      'Invalid events.yml: fields[0].description must be specified',
      'Invalid events.yml: fields[0].display_name must be prefixed with "My App "',
      'Invalid events.yml: relations[0].display_name must be specified',
      'Invalid events.yml: relations[0].display_name must be prefixed with "My App "'
    ]);
    expect(validateSchemaObject(runtime, badSchemaObjects['my_app_coupons.yml'], 'my_app_coupons.yml')).toEqual([
      'Invalid my_app_coupons.yml: display_name must be specified for custom object',
      'Invalid my_app_coupons.yml: fields[0].display_name must be specified',
      'Invalid my_app_coupons.yml: fields[0].description must be specified'
    ]);
  });

  it('does not allow display name or alias on non-custom objects', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObject: SchemaObject = {
      ...schemaObjects['events.yml'],
      display_name: 'Event-Like Stuff',
      alias: 'event_like_stuff'
    };

    expect(validateSchemaObject(runtime, badSchemaObject, 'events.yml')).toEqual([
      'Invalid events.yml: display_name cannot be specified for standard object',
      'Invalid events.yml: alias cannot be specified for standard object'
    ]);
  });

  it('requires a join field', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObject: SchemaObject = {
      ...schemaObjects['events.yml'],
      relations: [{...schemaObjects['events.yml'].relations![0], join_fields: []}]
    };

    expect(validateSchemaObject(runtime, badSchemaObject, 'events.yml')).toEqual([
      'Invalid events.yml: relations[0].join_fields must contain at least one join field'
    ]);
  });

  it('requires a primary key on custom objects', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObject: SchemaObject = {
      ...schemaObjects['my_app_coupons.yml'],
      fields: [{...schemaObjects['my_app_coupons.yml'].fields![0], primary: false}]
    };

    expect(validateSchemaObject(runtime, badSchemaObject, 'my_app_coupons.yml')).toEqual([
      'Invalid my_app_coupons.yml: fields must contain at least one primary key for custom object'
    ]);
  });

  it('does not allow a primary key on non-custom objects', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObject: SchemaObject = {
      ...schemaObjects['events.yml'],
      fields: [{...schemaObjects['events.yml'].fields![0], primary: true}]
    };

    expect(validateSchemaObject(runtime, badSchemaObject, 'events.yml')).toEqual([
      'Invalid events.yml: fields[0].primary cannot be set for non-custom object'
    ]);
  });

  it('enforces custom object rules for non-prefixed objects when base object names are available', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObject: SchemaObject = {
      ...schemaObjects['my_app_coupons.yml'],
      name: 'coupons',
      display_name: 'Coupons'
    };

    expect(validateSchemaObject(runtime, badSchemaObject, 'coupons.yml', ['events'])).toEqual([
      'Invalid coupons.yml: name must be prefixed with "my_app_" for custom object',
      'Invalid coupons.yml: display_name must be prefixed with "My App "'
    ]);
  });

  it('requires name to match file base name', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    expect(validateSchemaObject(runtime, schemaObjects['events.yml'], 'something.yml')).toEqual([
      'Invalid something.yml: name must match file base name'
    ]);
  });

  it('does not allow identifiers outside of customers', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObject: SchemaObject = {
      ...schemaObjects['events.yml'],
      identifiers: [
        {
          name: 'my_app_thing_id',
          display_name: 'My App Thing ID',
          merge_confidence: 'low'
        }
      ]
    };
    expect(validateSchemaObject(runtime, badSchemaObject, 'events.yml')).toEqual([
      'Invalid events.yml: identifiers are only allowed on customers'
    ]);
  });

  it('does allow identifiers on customers', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const goodSchemaObject: SchemaObject = {
      name: 'customers',
      identifiers: [
        {
          name: 'my_app_thing_id',
          display_name: 'My App Thing ID',
          merge_confidence: 'low'
        }
      ]
    };
    expect(validateSchemaObject(runtime, goodSchemaObject, 'customers.yml')).toEqual([]);
  });

  it('detects invalid identifier suffix', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObject: SchemaObject = {
      name: 'customers',
      identifiers: [
        {
          name: 'my_app_thing',
          display_name: 'My App Thing',
          merge_confidence: 'low'
        }
      ]
    };
    expect(validateSchemaObject(runtime, badSchemaObject, 'customers.yml')).toEqual([
      'Invalid customers.yml: identifiers[0].name must end with a valid suffix'
    ]);
  });

  it('detects identifier suffix mismatch between name and display name', () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const badSchemaObject: SchemaObject = {
      name: 'customers',
      identifiers: [
        {
          name: 'my_app_thing_id',
          display_name: 'My App Thing Hash',
          merge_confidence: 'low'
        }
      ]
    };
    expect(validateSchemaObject(runtime, badSchemaObject, 'customers.yml')).toEqual([
      'Invalid customers.yml: identifiers[0].display_name must end with " ID" to match name suffix "_id"'
    ]);
  });
});
