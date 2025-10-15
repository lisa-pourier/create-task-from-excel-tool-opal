import * as EmailValidator from 'email-validator';

import {Rivendell} from '../../util/Rivendell';
import {Runtime} from '../Runtime';
import {APP_ID_FORMAT, VENDOR_FORMAT, VERSION_FORMAT} from '../types';

export async function validateMeta(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  const {app_id, display_name, version, vendor, support_url, contact_email, summary, categories, availability} =
    runtime.manifest.meta;

  // App ID, version, vendor, support url, and contact email must be in the correct format
  if (!app_id.match(APP_ID_FORMAT)) {
    errors.push(
      'Invalid app.yml: meta.app_id must start with a letter, contain only lowercase alpha-numeric and underscore, ' +
        `and be between 3 and 32 characters long (${APP_ID_FORMAT.toString()})`
    );
  }
  if (!version.match(VERSION_FORMAT)) {
    errors.push(
      'Invalid app.yml: meta.version must be a semantic version number, optionally with -dev/-beta (and increment) ' +
        `or -private (${VERSION_FORMAT.toString()})`
    );
  }
  if (!vendor.match(VENDOR_FORMAT)) {
    errors.push(`Invalid app.yml: meta.vendor must be lower snake case (${VENDOR_FORMAT.toString()})`);
  }

  if (!isValidUrl(support_url)) {
    errors.push('Invalid app.yml: meta.support_url must be a valid web address');
  }
  if (!EmailValidator.validate(contact_email)) {
    errors.push('Invalid app.yml: meta.contact_email must be a valid email address');
  }

  // Display name and summary must not be blank
  if (!(display_name && display_name.trim())) {
    errors.push('Invalid app.yml: meta.display_name must not be blank');
  }
  if (!(summary && summary.trim())) {
    errors.push('Invalid app.yml: meta.summary must not be blank');
  }

  // Make sure there are exactly 1 to 2 categories listed
  if (categories.length > 2 || categories.length < 1) {
    errors.push('Invalid app.yml: meta.categories must contain 1 or 2 categories');
  }
  if (categories.length === 2 && categories[0] === categories[1]) {
    errors.push('Invalid app.yml: meta.categories contains two identical categories');
  }

  // Validate meta.availability
  if (availability && !availability.length) {
    errors.push('Invalid app.yml: meta.availability must contain at least one availability zone');
  } else if (availability) {
    if (availability.includes('all') && availability.length > 1) {
      errors.push(
        'Invalid app.yml: meta.availability should not contain any other availability zones ' +
          'if it contains "all" availability zones'
      );
    }

    if (!availability.includes('all')) {
      const shards = await Rivendell.shards();
      const invalid = availability.filter((zone) => !shards.includes(zone));

      if (invalid.length) {
        errors.push(
          'Invalid app.yml: meta.availability should only contain ' +
            `valid availability zones (${shards.toString()}) found: ${invalid.toString()}`
        );
      }
    }
  }

  return errors;
}

function isValidUrl(url: string) {
  try {
    new URL(url);
  } catch (_) {
    return false;
  }

  return url.startsWith('https://');
}
