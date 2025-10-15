import 'jest';

import {Runtime} from '../../Runtime';
import {validateOutboundDomains} from '../validateOutboundDomains';

describe('validateOutboundDomains', () => {
  it.each([
    [['http://example.zaius.com'], []],
    [['https://*.zaius.com'], []],
    [['https://example.zaius.com'], []],
    [['https://*.zaius.com'], []],
    [['http://example.zaius.com:1234'], []],
    [['https://example.zaius.com:1234'], []],
    [['http://*.zaius.com:1234'], []],
    [['https://*.zaius.com:1234'], []],
    [['example.zaius.com'], []],
    [['*.zaius.com'], []],
    [['example.zaius.com:1234'], []],
    [['*.zaius.com:1234'], []],
    [
      ['example.*.zaius.com'],
      ['Invalid app.yml: outbound_domains[0] "example.*.zaius.com" wildcard is only allowed for final subdomain']
    ],
    [['*.zaius.com:1234a'], ['Invalid app.yml: outbound_domains[0] "*.zaius.com:1234a" URL is malformed']],
    [['1!dotcom'], ['Invalid app.yml: outbound_domains[0] "1!dotcom" hostname must be valid']],
    [
      ['https://*.zaius.com:1234a'],
      ['Invalid app.yml: outbound_domains[0] "https://*.zaius.com:1234a" URL is malformed']
    ],
    [
      ['https://*.zaius.com/foo'],
      ['Invalid app.yml: outbound_domains[0] "https://*.zaius.com/foo" paths are not allowed']
    ],
    [
      ['https://*.zaius.com/foo?bar'],
      [
        'Invalid app.yml: outbound_domains[0] "https://*.zaius.com/foo?bar" paths are not allowed',
        'Invalid app.yml: outbound_domains[0] "https://*.zaius.com/foo?bar" query strings not allowed'
      ]
    ],
    [
      ['https://*.zaius.com?bar'],
      ['Invalid app.yml: outbound_domains[0] "https://*.zaius.com?bar" query strings not allowed']
    ]
  ])('validates %s', (urls, errors) => {
    const appManifest = {
      outbound_domains: urls
    };
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    expect(validateOutboundDomains(runtime)).toEqual(errors);
  });
});
