export interface DestinationSchema {
  name: string;
  description: string;
  display_name: string;
  fields: DestinationSchemaField[];
  custom_types?: DestinationSchemaCustomType[];
}

export interface DestinationSchemaField {
  name: string;
  display_name: string;
  description: string;
  /**
   * Field type - can be a primitive type, custom type reference, or array syntax
   * @pattern ^(string|integer|boolean|decimal|\w+|\[\w+\])$
   */
  type: string;
  primary?: boolean;
  format?: 'url';
}

export interface DestinationSchemaObjects {
  [file: string]: DestinationSchema;
}

export interface DestinationSchemaCustomType {
  name: string;
  display_name: string;
  description: string;
  fields: DestinationSchemaField[];
}
