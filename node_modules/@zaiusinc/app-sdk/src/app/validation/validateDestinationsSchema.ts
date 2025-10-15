import * as path from 'path';

import {DestinationSchema, DestinationSchemaCustomType, DestinationSchemaField} from '../types';

const SCHEMA_NAME_FORMAT = /^[a-z][a-z0-9_]{1,61}$/;

export function validateDestinationsSchema(destinationSchema: DestinationSchema, file: string): string[] {
  return new DestinationSchemaValidator(destinationSchema, file).validate();
}

class DestinationSchemaValidator {
  private readonly errors: string[] = [];
  private destinationsSchema: DestinationSchema;
  private file: string;

  public constructor(destinationSchema: DestinationSchema, file: string) {
    this.destinationsSchema = destinationSchema;
    this.file = file;
  }

  public validate(): string[] {
    if (
      path.basename(this.file, '.yml') !== this.destinationsSchema.name &&
      path.basename(this.file, '.yaml') !== this.destinationsSchema.name
    ) {
      this.errors.push(`Invalid ${this.file}: name must match file base name`);
    }

    if (!this.destinationsSchema.name) {
      this.errors.push(`Invalid ${this.file}: name must be specified`);
    } else {
      this.enforceNameFormat(this.destinationsSchema.name, 'name');
    }

    if (!this.destinationsSchema.display_name || this.destinationsSchema.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: display_name must be specified`);
    }

    let hasPrimaryKey = false;
    this.destinationsSchema.fields.forEach((field, index) => {
      this.validateField(field, `fields[${index}]`);
      if (field.primary) {
        hasPrimaryKey = true;
      }
    });
    if (!hasPrimaryKey) {
      this.errors.push(`Invalid ${this.file}: fields must contain one primary key`);
    }

    if (this.destinationsSchema.custom_types) {
      this.destinationsSchema.custom_types.forEach((customType, index) => {
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

  private validateField(field: DestinationSchemaField, pathPrefix: string) {
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

  private validateCustomType(customType: DestinationSchemaCustomType, customTypeIndex: number) {
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
      customType.fields.forEach((field: DestinationSchemaField, fieldIndex: number) => {
        this.validateField(field, `${pathPrefix}.fields[${fieldIndex}]`);
      });
    }
  }

  private validateCustomTypeReference(field: DestinationSchemaField, pathPrefix: string) {
    const customTypes = (this.destinationsSchema.custom_types || []).map((ct: DestinationSchemaCustomType) => ct.name);
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
