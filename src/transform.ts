import * as fs from 'fs';
import { JSONSchema4, JSONSchema4TypeName } from './types';

export type OperationCollection = {
  verb: string;
  path: string;
  responseMap: {
    code: string;
    responses?: JSONSchema4;
  }[];
}[];

export function transformToHandlerCode(
  operationCollection: OperationCollection
): string {
  return operationCollection
    .map(op => {
      const response = op.responseMap[0];
      console.dir(response, { depth: 10 });
      return `rest.${op.verb}('${op.path}', (req, res, ctx) => {
        const resultArrray = [${op.responseMap.map(response => {
          return `[ctx.status(${parseInt(
            response?.code!
          )}), ctx.json(${transformJSONSchemaToFakerCode(
            response?.responses?.['application/json']
          )})]`;
        })}]
        return res(
          ...faker.random.arrayElement(resultArrray)
        )}),\n`;
    })
    .join('  ')
    .trimEnd();
}

function transformJSONSchemaToFakerCode(jsonSchema?: JSONSchema4): string {
  if (!jsonSchema) {
    return '{}';
  }

  const required = Array.isArray(jsonSchema.required)
    ? new Set(jsonSchema.required)
    : new Set();

  if (Array.isArray(jsonSchema.type)) {
    return `faker.random.arrayElement([${jsonSchema.type
      .map(type => transformJSONSchemaToFakerCode({ ...jsonSchema, type }))
      .join(',')}])`;
  }

  switch (jsonSchema.type) {
    case 'string':
      if (jsonSchema.enum) {
        return `faker.random.arrayElement(${JSON.stringify(jsonSchema.enum)})`;
      }
      return `faker.random.words()`;
    case 'number':
      return `faker.datatype.number()`;
    case 'integer':
      return `faker.datatype.number()`;
    case 'boolean':
      return `faker.datatype.boolean()`;
    case 'object':
      return `{
        ${Object.entries(jsonSchema.properties ?? {})
          .map(([key, value]) => {
            return `${key}: ${transformJSONSchemaToFakerCode(value)}`;
          })
          .join(',\n')}
    }`;
    case 'array':
      return `[...(new Array(faker.datatype.number({ max: 100 }))).keys()].map(_ => (${transformJSONSchemaToFakerCode(
        jsonSchema.items
      )}))`;
    case 'null':
      return 'null';
    default:
      return '{}';
  }
}
