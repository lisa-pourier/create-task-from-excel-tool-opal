import {URL} from 'url';

import {Runtime} from '../Runtime';

const PROTOCOL_REGEX = /^[a-z]+\:\/\/.*/;
const HOSTNAME_REGEX = /^(\*\.)?[a-zA-Z0-9][a-zA-Z0-9\-_.]+$/;

export function validateOutboundDomains(runtime: Runtime): string[] {
  const errors: string[] = [];
  runtime.manifest.outbound_domains?.forEach((str, index) => {
    try {
      const urlString = PROTOCOL_REGEX.test(str) ? str : `https://${str}`;
      const url = new URL(urlString);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push(formatError(str, index, 'protocol must be http or https'));
      }

      if (url.hostname.lastIndexOf('*') > 0) {
        errors.push(formatError(str, index, 'wildcard is only allowed for final subdomain'));
      } else if (!HOSTNAME_REGEX.test(url.hostname)) {
        errors.push(formatError(str, index, 'hostname must be valid'));
      }

      if (url.pathname !== '/') {
        errors.push(formatError(str, index, 'paths are not allowed'));
      }

      if (url.search) {
        errors.push(formatError(str, index, 'query strings not allowed'));
      }
    } catch (e) {
      errors.push(formatError(str, index, 'URL is malformed'));
    }
  });
  return errors;
}

function formatError(input: string, index: number, message: string) {
  return `Invalid app.yml: outbound_domains[${index}] "${input}" ${message}`;
}
