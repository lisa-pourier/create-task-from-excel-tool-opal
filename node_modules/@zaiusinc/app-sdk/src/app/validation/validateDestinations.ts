import fs from 'fs';
import {join} from 'path';

import {Destination} from '../Destination';
import {DestinationSchemaFunction} from '../DestinationSchemaFunction';
import {Runtime} from '../Runtime';

export async function validateDestinations(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the destinations listed in the manifest actually exist and are implemented
  if (runtime.manifest.destinations) {
    for (const name of Object.keys(runtime.manifest.destinations)) {
      let destinationClass = null;
      let errorMessage: string | null = null;
      try {
        destinationClass = await runtime.getDestinationClass(name);
      } catch (e: any) {
        errorMessage = e;
      }
      if (!destinationClass) {
        errors.push(`Error loading entry point ${name}. ${errorMessage}`);
      } else if (!(destinationClass.prototype instanceof Destination)) {
        errors.push(
          `Destination entry point does not extend App.Destination: ${runtime.manifest.destinations[name].entry_point}`
        );
      } else {
        if (typeof destinationClass.prototype.ready !== 'function') {
          errors.push(
            `Destination entry point is missing the prepare method: ${runtime.manifest.destinations[name].entry_point}`
          );
        }
        if (typeof destinationClass.prototype.deliver !== 'function') {
          errors.push(
            `Destination entry point is missing the perform method: ${runtime.manifest.destinations[name].entry_point}`
          );
        }
      }

      const schema = runtime.manifest.destinations[name].schema;
      if (!schema) {
        errors.push(`Destination is missing the schema property: ${name}`);
      } else {
        if (typeof schema !== 'object') {
          const schemaFilePath = join(runtime.baseDir, 'destinations', 'schema', schema);
          if (typeof schema !== 'string') {
            errors.push(`Destination schema property must be a string or an object: ${name}`);
          } else if (schema.trim() === '') {
            errors.push(`Destination schema property cannot be empty: ${name}`);
          } else if (!(fs.existsSync(schemaFilePath + '.yml') || fs.existsSync(schemaFilePath + '.yaml'))) {
            errors.push(`File not found for Destination schema ${schema}`);
          }
        } else if (schema.entry_point) {
          let destinationSchemaFunction = null;
          try {
            destinationSchemaFunction = await runtime.getDestinationSchemaFunctionClass(name);
          } catch (e: any) {
            errors.push(`Error loading DestinationSchemaFunction entry point ${schema.entry_point}. ${e}`);
          }
          if (destinationSchemaFunction) {
            if (!(destinationSchemaFunction.prototype instanceof DestinationSchemaFunction)) {
              errors.push(
                'DestinationSchemaFunction entry point does not extend App.DestinationSchemaFunction: ' +
                  `${schema.entry_point}`
              );
            } else if (typeof (destinationSchemaFunction.prototype as any)['getDestinationsSchema'] !== 'function') {
              errors.push(
                'DestinationSchemaFunction entry point is missing the getDestinationsSchema method: ' +
                  `${schema.entry_point}`
              );
            }
          }
        }
      }
    }
  }

  return errors;
}
