import {Runtime} from '../Runtime';

export function validateEnvironment(runtime: Runtime): string[] {
  const errors: string[] = [];

  const nameCounts: {[name: string]: number} = {};
  (runtime.manifest.environment || []).forEach((name) => {
    if (!name.match(/^APP_ENV_[A-Z0-9_]+$/)) {
      errors.push(
        `Invalid app.yml: environment${name.match(/\s/) ? `["${name}"]` : `.${name}`} ` +
          'must be prefixed with "APP_ENV_" and consist of only uppercase alphanumeric and underscores'
      );
    }
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });
  Object.keys(nameCounts).forEach((name) => {
    if (nameCounts[name] > 1) {
      errors.push(
        `Invalid app.yml: environment${name.match(/\s/) ? `["${name}"]` : `.${name}`} is listed more than once`
      );
    }
  });

  return errors;
}
