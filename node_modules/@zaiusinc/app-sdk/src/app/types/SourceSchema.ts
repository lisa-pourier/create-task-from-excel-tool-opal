export interface SourceSchema {
  name: string;
  description: string;
  display_name: string;
  fields: SourceSchemaField[];
  custom_types?: SourceSchemaCustomType[];
}

export interface SourceSchemaField {
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

export interface SourceSchemaObjects {
  [file: string]: SourceSchema;
}

export interface SourceSchemaCustomType {
  name: string;
  display_name: string;
  description: string;
  fields: SourceSchemaField[];
}
