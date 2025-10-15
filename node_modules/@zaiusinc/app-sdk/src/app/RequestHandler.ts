import {Request, Response} from './lib';

export abstract class RequestHandler {
  protected request: Request;

  public constructor(request: Request) {
    this.request = request;
  }

  public abstract perform(): Promise<Response>;
}
