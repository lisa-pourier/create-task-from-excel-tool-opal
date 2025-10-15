import {RequestHandler} from './RequestHandler';
import {Request} from './lib';

export abstract class GlobalFunction extends RequestHandler {
  public constructor(request: Request) {
    super(request);
  }
}
