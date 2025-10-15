import {Headers} from './Headers';

export class Response {
  public status = 0;
  public headers: Headers = new Headers();
  private bodyData?: Uint8Array;

  public constructor(status?: number, bodyJSON?: any, headers?: Headers) {
    if (status !== undefined) {
      this.status = status;
    }
    if (bodyJSON !== undefined) {
      this.bodyJSON = bodyJSON;
    }
    if (headers !== undefined) {
      this.headers = headers;
    }
  }

  public set body(body: string | null) {
    if (body === null || typeof body !== 'string') {
      this.bodyData = undefined;
    } else {
      this.bodyData = new Uint8Array(Buffer.from(body));
    }
  }

  public get bodyAsU8Array(): Uint8Array | undefined {
    return this.bodyData;
  }

  public set bodyAsU8Array(body: Uint8Array | undefined) {
    this.bodyData = body;
  }

  public set bodyJSON(body: any) {
    if (!this.headers.has('content-type')) {
      this.headers.set('content-type', 'application/json');
    }

    if (body !== undefined) {
      this.bodyData = new Uint8Array(Buffer.from(JSON.stringify(body)));
    } else {
      this.bodyData = undefined;
    }
  }
}
