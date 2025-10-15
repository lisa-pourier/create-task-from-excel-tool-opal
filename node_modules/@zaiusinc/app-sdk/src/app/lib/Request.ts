import {HttpMethod} from '../types';
import {Headers} from './Headers';
import {QueryParams} from './QueryParams';

export class Request {
  public readonly method: HttpMethod;
  public readonly path: string;
  public readonly params: QueryParams;
  public headers: Headers;
  private bodyData: Uint8Array;
  private parsedJsonBody?: any;

  public constructor(
    method: HttpMethod,
    path: string,
    params: QueryParams,
    headers: string[][],
    body: Uint8Array | null
  ) {
    this.method = method;
    this.path = path;
    this.params = params;
    this.headers = new Headers(headers);
    this.bodyData = body || new Uint8Array(0);
  }

  public get body(): Uint8Array {
    return this.bodyData;
  }

  public get bodyJSON(): any {
    if (this.parsedJsonBody) {
      return this.parsedJsonBody;
    }

    if (this.bodyData.length === 0) {
      return null;
    }

    // TODO: attempt to read character set from content-type header and/or allow user to set the encoding
    return (this.parsedJsonBody = JSON.parse(Buffer.from(this.bodyData).toString('utf8')));
  }

  public get contentType() {
    const value = this.headers.get('content-type');
    if (value) {
      return value.split(';')[0];
    }
    return null;
  }
}
