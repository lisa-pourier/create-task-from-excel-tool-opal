import {SourceSchema} from './types';

export interface SourceSchemaFunctionConfig {
  sourceKey: string;
}

export abstract class SourceSchemaFunction {
  protected config: SourceSchemaFunctionConfig;

  public constructor(config: SourceSchemaFunctionConfig) {
    this.config = config;
  }

  public abstract getSourcesSchema(): Promise<SourceSchema>;
}
