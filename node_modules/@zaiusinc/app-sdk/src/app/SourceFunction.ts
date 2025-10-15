import {Source} from '../sources/Source';
import {Request} from './lib/Request';
import {Response} from './lib/Response';

export interface SourceConfiguration {
  dataSyncId: string;
  sourceKey: string;
  schema: string | {entry_point: string};
  webhookUrl?: string;
}

export abstract class SourceFunction {
  protected config: SourceConfiguration;
  protected request: Request;
  protected source: Source;

  public constructor(config: SourceConfiguration, request: Request, source: Source) {
    this.config = config;
    this.request = request;
    this.source = source;
  }

  public abstract perform(): Promise<Response>;
}
