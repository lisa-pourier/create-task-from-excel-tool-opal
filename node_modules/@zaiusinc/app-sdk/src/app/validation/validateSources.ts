import * as fs from 'fs';
import {join} from 'path';

import {Runtime} from '../Runtime';
import {SourceFunction} from '../SourceFunction';
import {SourceJob} from '../SourceJob';
import {SourceLifecycle} from '../SourceLifecycle';
import {SourceSchemaFunction} from '../SourceSchemaFunction';

const SOURCE_FUNCTION_LIFECYCLE_METHODS = [
  'onSourceCreate',
  'onSourceUpdate',
  'onSourceDelete',
  'onSourceEnable',
  'onSourcePause'
];

export async function validateSources(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the sources listed in the manifest actually exist and are implemented
  if (runtime.manifest.sources) {
    for (const name of Object.keys(runtime.manifest.sources)) {
      errors.push(...(await validateFunction(runtime, name)));
      errors.push(...(await validateSchema(runtime, name)));
      errors.push(...(await validateLifecycle(runtime, name)));
      errors.push(...(await validateSourceJobs(runtime, name)));
    }
  }

  return errors;
}

async function validateSchema(runtime: Runtime, name: string) {
  const errors: string[] = [];
  const source = runtime.manifest.sources?.[name];
  if (!source || !source.schema) {
    errors.push(`Source is missing the schema property: ${name}`);
  } else {
    const schema = source.schema;
    if (typeof schema !== 'object') {
      const schemaFilePath = join(runtime.baseDir, 'sources', 'schema', schema);
      if (typeof schema !== 'string') {
        errors.push(`Source schema property must be a string or an object: ${name}`);
      } else if (schema.trim() === '') {
        errors.push(`Source schema property cannot be empty: ${name}`);
      } else if (!(fs.existsSync(schemaFilePath + '.yml') || fs.existsSync(schemaFilePath + '.yaml'))) {
        errors.push(`File not found for Source schema ${schema}`);
      }
    } else if (schema.entry_point) {
      let sourceSchemaFunction = null;
      try {
        sourceSchemaFunction = await runtime.getSourceSchemaFunctionClass(name);
      } catch (e: any) {
        errors.push(`Error loading SourceSchemaFunction entry point ${schema.entry_point}. ${e}`);
      }
      if (sourceSchemaFunction) {
        if (!(sourceSchemaFunction.prototype instanceof SourceSchemaFunction)) {
          errors.push(
            'SourceSchemaFunction entry point does not extend App.SourceSchemaFunction: ' + `${schema.entry_point}`
          );
        } else if (typeof (sourceSchemaFunction.prototype as any)['getSourcesSchema'] !== 'function') {
          errors.push(
            'SourceSchemaFunction entry point is missing the getSourcesSchema method: ' + `${schema.entry_point}`
          );
        }
      }
    }
  }
  return errors;
}

async function validateLifecycle(runtime: Runtime, name: string) {
  const errors: string[] = [];
  const source = runtime.manifest.sources?.[name];

  if (!source?.lifecycle) {
    return errors;
  }

  let lifecycleClass = null;
  let errorMessage: string | null = null;
  try {
    lifecycleClass = await runtime.getSourceLifecycleClass(name);
  } catch (e: any) {
    errorMessage = e;
  }

  if (!source || errorMessage) {
    errors.push(`Error loading SourceLifecycle entry point ${name}. ${errorMessage}`);
  } else if (lifecycleClass) {
    if (!(lifecycleClass.prototype instanceof SourceLifecycle)) {
      errors.push(`SourceLifecycle entry point does not extend App.SourceLifecycle: ${source.lifecycle?.entry_point}`);
    } else {
      for (const method of SOURCE_FUNCTION_LIFECYCLE_METHODS) {
        if (typeof (lifecycleClass.prototype as any)[method] !== 'function') {
          errors.push(`SourceLifecycle entry point is missing the ${method} method: ${source.lifecycle?.entry_point}`);
        }
      }
    }
  }

  return errors;
}

async function validateFunction(runtime: Runtime, name: string) {
  const source = runtime.manifest.sources?.[name];
  if (!source?.function) {
    return [];
  }

  const errors: string[] = [];
  let sourceClass = null;
  let errorMessage: string | null = null;
  try {
    sourceClass = await runtime.getSourceFunctionClass(name);
  } catch (e: any) {
    errorMessage = e;
  }
  if (!source || !sourceClass) {
    errors.push(`Error loading SourceFunction entry point ${name}. ${errorMessage}`);
  } else if (!(sourceClass.prototype instanceof SourceFunction)) {
    errors.push(`SourceFunction entry point does not extend App.SourceFunction: ${source.function?.entry_point}`);
  } else if (typeof (sourceClass.prototype as any)['perform'] !== 'function') {
    errors.push(`SourceFunction entry point is missing the perform method: ${source.function?.entry_point}`);
  }
  return errors;
}

export async function validateSourceJobs(runtime: Runtime, sourceName: string): Promise<string[]> {
  const errors: string[] = [];
  const source = runtime.manifest.sources?.[sourceName];
  // Make sure all the source jobs listed in the manifest actually exist and are implemented
  if (source && source.jobs) {
    for (const name of Object.keys(source.jobs)) {
      let sourceJobClass = null;
      let errorMessage: string | null = null;
      try {
        sourceJobClass = await runtime.getSourceJobClass(sourceName, name);
      } catch (e: any) {
        errorMessage = e;
      }
      if (!sourceJobClass) {
        errors.push(`Error loading job entry point ${name}. ${errorMessage}`);
      } else if (!(sourceJobClass.prototype instanceof SourceJob)) {
        errors.push(`SourceJob entry point does not extend App.SourceJob: ${source.jobs[name].entry_point}`);
      } else {
        if (typeof sourceJobClass.prototype.prepare !== 'function') {
          errors.push(`SourceJob entry point is missing the prepare method: ${source.jobs[name].entry_point}`);
        }
        if (typeof sourceJobClass.prototype.perform !== 'function') {
          errors.push(`SourceJob entry point is missing the perform method: ${source.jobs[name].entry_point}`);
        }
      }
    }
  }

  return errors;
}
