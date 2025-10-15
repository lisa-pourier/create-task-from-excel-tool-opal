import {RequestHandler} from './RequestHandler';
import {Request} from './lib';

export abstract class Function extends RequestHandler {
  public constructor(request: Request) {
    super(request);
  }
}
