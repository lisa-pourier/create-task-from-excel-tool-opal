import {isEqual} from 'lodash';
import * as util from 'util';

expect.extend({
  jsonContaining(json: string, expected: any) {
    try {
      const object = JSON.parse(json);
      for (const property in expected) {
        if (!Object.keys(object).includes(property) || !isEqual(object[property], expected[property])) {
          // NOTE: Don't know why this generated message isn't showing in the failure cases,
          // but you get a generic jest message instead
          return {
            pass: false,
            actual: json,
            message: () => `Expected JSON containing ${util.inspect(expected)}\nReceived: ${util.inspect(json)}`
          };
        }
      }
    } catch (e) {
      return {
        pass: false,
        actual: json,
        message: () => `Expected JSON, but unable to parse.\nReceived: ${util.inspect(json)}`
      };
    }
    return {
      pass: true,
      message: () => 'JSON matched'
    };
  },
  jsonRepresenting(json: string, expected: any) {
    const object = JSON.parse(json);
    if (!isEqual(object, expected)) {
      // NOTE: Don't know why this generated message isn't showing in the failure cases,
      // but you get a generic jest message instead
      return {
        pass: false,
        actual: json,
        message: () => `Expected JSON containing ${util.inspect(expected)}\nReceived: ${util.inspect(json)}`
      };
    }
    return {
      pass: true,
      message: () => 'JSON matched'
    };
  }
});

beforeEach(() => expect.hasAssertions());
