import jp from 'jsonpath';

import {Function} from '../Function';
import {GlobalFunction} from '../GlobalFunction';
import {FunctionClassNotFoundError, Runtime} from '../Runtime';
import {AppFunction} from '../types';

export async function validateFunctions(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the functions listed in the manifest actually exist and are implemented
  if (runtime.manifest.functions) {
    for (const name of Object.keys(runtime.manifest.functions)) {
      const fnDefinition = runtime.manifest.functions[name];
      let fnClass = null;
      let errorMessage: string | null = null;
      try {
        fnClass = await runtime.getFunctionClass(name);
      } catch (e: any) {
        if (!(e instanceof FunctionClassNotFoundError)) {
          const msg: string = e.message;
          errors.push(`Failed to load function class ${name}.  Error was: ${msg}`);
          return errors;
        }
        errorMessage = e instanceof Error ? e.message : String(e);
      }
      if (!fnClass) {
        errors.push(`Error loading function class ${name}. Error: ${errorMessage}`);
      } else if (!fnDefinition.global && !(fnClass.prototype instanceof Function)) {
        errors.push(`Function entry point does not extend App.Function: ${fnDefinition.entry_point}`);
      } else if (fnDefinition.global && !(fnClass.prototype instanceof GlobalFunction)) {
        errors.push(`Global Function entry point does not extend App.GlobalFunction: ${fnDefinition.entry_point}`);
      } else if (typeof fnClass.prototype.perform !== 'function') {
        errors.push(`Function entry point is missing the perform method: ${fnDefinition.entry_point}`);
      }
      const installationResolutionErrors = await validateInstallationResolution(fnDefinition);
      if (installationResolutionErrors.length) {
        errors.push(...installationResolutionErrors);
      }
    }
  }

  return errors;
}

async function validateInstallationResolution(definition: AppFunction): Promise<string[]> {
  if (definition.global && definition.installation_resolution) {
    return ['Global functions cannot define a installation_resolution'];
  }

  if (definition.installation_resolution) {
    const {type, key} = definition.installation_resolution;
    if (type === 'JSON_BODY_FIELD') {
      try {
        jp.parse(key);
      } catch (e: any) {
        return [`Invalid JSON path expression: ${e.message}`];
      }
    }
  }
  return [];
}
