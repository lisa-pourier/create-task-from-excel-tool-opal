import * as path from 'path';

import {SourceSchemaCustomType, SourceSchema, SourceSchemaField} from '../types';

const SCHEMA_NAME_FORMAT = /^[a-z][a-z0-9_]{1,61}$/;

export function validateSourcesSchema(sourceSchema: SourceSchema, file: string): string[] {
  return new SourceSchemaValidator(sourceSchema, file).validate();
}

class SourceSchemaValidator {
  private readonly errors: string[] = [];
  private sourcesSchema: SourceSchema;
  private file: string;

  public constructor(sourceSchema: SourceSchema, file: string) {
    this.sourcesSchema = sourceSchema;
    this.file = file;
  }

  public validate(): string[] {
    if (
      path.basename(this.file, '.yml') !== this.sourcesSchema.name &&
      path.basename(this.file, '.yaml') !== this.sourcesSchema.name
    ) {
      this.errors.push(`Invalid ${this.file}: name must match file base name`);
    }

    if (!this.sourcesSchema.name) {
      this.errors.push(`Invalid ${this.file}: name must be specified`);
    } else {
      this.enforceNameFormat(this.sourcesSchema.name, 'name');
    }

    if (!this.sourcesSchema.display_name || this.sourcesSchema.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: display_name must be specified`);
    }

    let hasPrimaryKey = false;
    this.sourcesSchema.fields.forEach((field, index) => {
      this.validateField(field, `fields[${index}]`);
      if (field.primary) {
        hasPrimaryKey = true;
      }
    });
    if (!hasPrimaryKey) {
      this.errors.push(`Invalid ${this.file}: fields must contain one primary key`);
    }

    if (this.sourcesSchema.custom_types) {
      this.sourcesSchema.custom_types.forEach((customType, index) => {
        this.validateCustomType(customType, index);
      });
    }

    return this.errors;
  }

  private enforceNameFormat(name: string, ref: string) {
    if (!name.match(SCHEMA_NAME_FORMAT)) {
      this.errors.push(
        `Invalid ${this.file}: ${ref} must start with a letter, contain only lowercase alpha-numeric and ` +
          `underscore, and be between 2 and 64 characters long (${SCHEMA_NAME_FORMAT.toString()})`
      );
    }
  }

  private validateField(field: SourceSchemaField, pathPrefix: string) {
    if (!field.name) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.name must be specified`);
    } else {
      this.enforceNameFormat(field.name, `${pathPrefix}.name`);
    }

    if (!field.display_name || field.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.display_name must be specified`);
    }

    if (!field.description || field.description.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.description must be specified`);
    }

    this.validateCustomTypeReference(field, pathPrefix);
  }

  private validateCustomType(customType: SourceSchemaCustomType, customTypeIndex: number) {
    const pathPrefix = `custom_types[${customTypeIndex}]`;

    if (!customType.name) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.name must be specified`);
    } else {
      this.enforceNameFormat(customType.name, `${pathPrefix}.name`);
    }

    if (!customType.display_name || customType.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.display_name must be specified`);
    }

    if (!customType.description || customType.description.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.description must be specified`);
    }

    if (customType.fields && Array.isArray(customType.fields)) {
      customType.fields.forEach((field: SourceSchemaField, fieldIndex: number) => {
        this.validateField(field, `${pathPrefix}.fields[${fieldIndex}]`);
      });
    }
  }

  private validateCustomTypeReference(field: SourceSchemaField, pathPrefix: string) {
    const customTypes = (this.sourcesSchema.custom_types || []).map((ct: SourceSchemaCustomType) => ct.name);
    const customTypeMatch = field.type.match(/^\w+$/);
    if (customTypeMatch && !['boolean', 'float', 'int', 'long', 'string'].includes(field.type)) {
      if (!customTypes.includes(field.type)) {
        this.errors.push(
          `Invalid ${this.file}: ${pathPrefix}.type '${field.type}' does not match any custom_types name`
        );
      }
    }

    const arrayTypeMatch = field.type.match(/^\[(\w+)\]$/);
    if (arrayTypeMatch) {
      const arrayType = arrayTypeMatch[1];
      if (!['boolean', 'float', 'int', 'long', 'string'].includes(arrayType) && !customTypes.includes(arrayType)) {
        this.errors.push(
          `Invalid ${this.file}: ${pathPrefix}.type '${field.type}' array type does not match any custom_types name`
        );
      }
    }
  }
}
