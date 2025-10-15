import {ErrorObject} from 'ajv';
import Ajv from 'ajv';

import {Runtime} from '../Runtime';
import * as manifestSchema from '../types/AppManifest.schema.json';
import * as destinationSchema from '../types/DestinationSchema.schema.json';
import * as schemaObjectSchema from '../types/SchemaObject.schema.json';
import * as sourceSchema from '../types/SourceSchema.schema.json';
import {validateAssets} from './validateAssets';
import {validateChannel} from './validateChannel';
import {validateDestinations} from './validateDestinations';
import {validateDestinationsSchema} from './validateDestinationsSchema';
import {validateEnvironment} from './validateEnvironment';
import {validateFunctions} from './validateFunctions';
import {validateJobs} from './validateJobs';
import {validateLifecycle} from './validateLifecycle';
import {validateLiquidExtensions} from './validateLiquidExtensions';
import {validateMeta} from './validateMeta';
import {validateOutboundDomains} from './validateOutboundDomains';
import {validateSchemaObject} from './validateSchemaObject';
import {validateSources} from './validateSources';
import {validateSourcesSchema} from './validateSourcesSchema';

/**
 * Validates that all of the required pieces of the app are accounted for.
 *
 * @return array of error messages, if there were any, otherwise an empty array
 */
export async function validateApp(runtime: Runtime, baseObjectNames?: string[]): Promise<string[]> {
  let errors: string[] = [];

  const ajv = new Ajv({allErrors: true, allowUnionTypes: true});
  if (!ajv.validate(manifestSchema, runtime.manifest)) {
    ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError('app.yml', e)));
  } else {
    errors = errors
      .concat(await validateMeta(runtime))
      .concat(validateEnvironment(runtime))
      .concat(await validateFunctions(runtime))
      .concat(await validateJobs(runtime))
      .concat(await validateDestinations(runtime))
      .concat(await validateSources(runtime))
      .concat(await validateLiquidExtensions(runtime))
      .concat(await validateLifecycle(runtime))
      .concat(await validateChannel(runtime))
      .concat(await validateAssets(runtime))
      .concat(validateOutboundDomains(runtime));
  }

  if (runtime.manifest.destinations) {
    const destinationSchemaObjects = runtime.getDestinationSchema();
    for (const file of Object.keys(destinationSchemaObjects)) {
      const destinationSchemaObject = destinationSchemaObjects[file];
      if (!ajv.validate(destinationSchema, destinationSchemaObject)) {
        ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError(file, e)));
      } else {
        errors = errors.concat(validateDestinationsSchema(destinationSchemaObject, file));
      }
    }
  }

  if (runtime.manifest.sources) {
    const sourceSchemaObjects = runtime.getSourceSchema();
    for (const file of Object.keys(sourceSchemaObjects)) {
      const sourceSchemaObject = sourceSchemaObjects[file];
      if (!ajv.validate(sourceSchema, sourceSchemaObject)) {
        ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError(file, e)));
      } else {
        errors = errors.concat(validateSourcesSchema(sourceSchemaObject, file));
      }
    }
  }

  const schemaObjects = runtime.getSchemaObjects();
  for (const file of Object.keys(schemaObjects)) {
    const schemaObject = schemaObjects[file];
    if (!ajv.validate(schemaObjectSchema, schemaObject)) {
      ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError(file, e)));
    } else {
      errors = errors.concat(validateSchemaObject(runtime, schemaObject, file, baseObjectNames));
    }
  }

  return errors;
}

function formatAjvError(file: string, e: ErrorObject): string {
  const adjustedDataPath =
    e.instancePath.length > 0 ? e.instancePath.substring(1).replace(/\['([^']+)']/, '.$1') + ' ' : '';
  return `Invalid ${file}: ${adjustedDataPath}${e.message?.replace(/\bshould\b/, 'must') ?? ''}`;
}
