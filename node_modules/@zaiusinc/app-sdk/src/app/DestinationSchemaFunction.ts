import {DestinationSchema} from './types';

export interface DestinationSchemaFunctionConfig {
  destinationKey: string;
}

export abstract class DestinationSchemaFunction {
  protected config: DestinationSchemaFunctionConfig;

  public constructor(config: DestinationSchemaFunctionConfig) {
    this.config = config;
  }

  public abstract getDestinationsSchema(): Promise<DestinationSchema>;
}
