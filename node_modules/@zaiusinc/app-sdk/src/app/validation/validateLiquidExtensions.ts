import {LiquidExtension} from '../LiquidExtension';
import {Runtime} from '../Runtime';

export async function validateLiquidExtensions(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the liquid extensions listed in the manifest actually exist and are implemented
  if (runtime.manifest.liquid_extensions) {
    for (const name of Object.keys(runtime.manifest.liquid_extensions)) {
      let extClass = null;
      let errorMessage: string | null = null;
      try {
        extClass = await runtime.getLiquidExtensionClass(name);
      } catch (e: any) {
        errorMessage = e;
        console.log(e);
      }
      if (!extClass) {
        errors.push(`Error loading entry point for liquid extension ${name}. ${errorMessage}`);
      } else if (!(extClass.prototype instanceof LiquidExtension)) {
        errors.push(
          'Liquid Extension entry point does not extend App.LiquidExtension: ' +
            runtime.manifest.liquid_extensions[name].entry_point
        );
      } else if (typeof extClass.prototype.perform !== 'function') {
        errors.push(
          'Liquid Extension entry point is missing the perform method: ' +
            runtime.manifest.liquid_extensions[name].entry_point
        );
      }
    }
  }

  return errors;
}
