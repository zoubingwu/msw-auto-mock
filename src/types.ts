// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/json-schema/index.d.ts
export interface JSONSchema4Object {
  [key: string]: JSONSchema4Type;
}

export interface JSONSchema4Array extends Array<JSONSchema4Type> {}

export type JSONSchema4Version = string;

export type JSONSchema4Type =
  | string
  | number
  | boolean
  | JSONSchema4Object
  | JSONSchema4Array
  | null;

export type JSONSchema4TypeName =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'
  | 'any';

export interface JSONSchema4 {
  id?: string | undefined;
  $ref?: string | undefined;
  $schema?: JSONSchema4Version | undefined;

  title?: string | undefined;
  description?: string | undefined;

  default?: JSONSchema4Type | undefined;
  multipleOf?: number | undefined;
  maximum?: number | undefined;
  exclusiveMaximum?: boolean | undefined;
  minimum?: number | undefined;
  exclusiveMinimum?: boolean | undefined;
  maxLength?: number | undefined;
  minLength?: number | undefined;
  pattern?: string | undefined;
  additionalItems?: boolean | JSONSchema4 | undefined;
  items?: JSONSchema4 | JSONSchema4[] | undefined;
  maxItems?: number | undefined;
  minItems?: number | undefined;
  uniqueItems?: boolean | undefined;
  maxProperties?: number | undefined;
  minProperties?: number | undefined;
  required?: boolean | string[] | undefined;
  additionalProperties?: boolean | JSONSchema4 | undefined;
  definitions?:
    | {
        [k: string]: JSONSchema4;
      }
    | undefined;
  properties?:
    | {
        [k: string]: JSONSchema4;
      }
    | undefined;
  patternProperties?:
    | {
        [k: string]: JSONSchema4;
      }
    | undefined;
  dependencies?:
    | {
        [k: string]: JSONSchema4 | string[];
      }
    | undefined;
  enum?: JSONSchema4Type[] | undefined;
  type?: JSONSchema4TypeName | JSONSchema4TypeName[] | undefined;
  allOf?: JSONSchema4[] | undefined;
  anyOf?: JSONSchema4[] | undefined;
  oneOf?: JSONSchema4[] | undefined;
  not?: JSONSchema4 | undefined;
  extends?: string | string[] | undefined;
  [k: string]: any;
  format?: string | undefined;
}
