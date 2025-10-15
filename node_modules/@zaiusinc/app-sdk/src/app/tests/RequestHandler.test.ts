import 'jest';

import {RequestHandler} from '../RequestHandler';
import {Request, Response} from '../lib';

class SubClass extends RequestHandler {
  public async perform() {
    return new Response();
  }
}

describe('RequestHandler', () => {
  it('sets the request upon construction', () => {
    const request = new Request('GET', '/foo', {}, [], null);
    const handler = new SubClass(request);
    expect(handler['request']).toBe(request);
  });
});
