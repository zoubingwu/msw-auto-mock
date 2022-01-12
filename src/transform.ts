import { OpenAPIV3 } from 'openapi-types';

export type OperationCollection = {
  verb: string;
  path: string;
  responseMap: {
    code: string;
    responses?: Record<string, OpenAPIV3.SchemaObject>;
  }[];
}[];

export function transformToHandlerCode(
  operationCollection: OperationCollection
): string {
  return operationCollection
    .map(op => {
      return `rest.${op.verb}('${op.path}', (req, res, ctx) => {
        const resultArray = [${op.responseMap.map(response => {
          return `[ctx.status(${parseInt(
            response?.code!
          )}), ctx.json(${transformJSONSchemaToFakerCode(
            response?.responses?.['application/json']
          )})]`;
        })}]
        return res(
          ...faker.random.arrayElement(resultArray)
        )}),\n`;
    })
    .join('  ')
    .trimEnd();
}

function transformJSONSchemaToFakerCode(
  jsonSchema?: OpenAPIV3.SchemaObject
): string {
  if (!jsonSchema) {
    return 'null';
  }

  if (Array.isArray(jsonSchema.type)) {
    return `faker.random.arrayElement([${jsonSchema.type
      .map(type => transformJSONSchemaToFakerCode({ ...jsonSchema, type }))
      .join(',')}])`;
  }

  if (jsonSchema.enum) {
    return `faker.random.arrayElement(${JSON.stringify(jsonSchema.enum)})`;
  }

  switch (jsonSchema.type) {
    case 'string':
      return transformStringBasedOnFormat(jsonSchema.format);
    case 'number':
      return `faker.datatype.number()`;
    case 'integer':
      return `faker.datatype.number()`;
    case 'boolean':
      return `faker.datatype.boolean()`;
    case 'object':
      if (
        !jsonSchema.properties &&
        typeof jsonSchema.additionalProperties === 'object'
      ) {
        return `[...new Array(5).keys()].map(_ => ({ [faker.lorem.word()]: ${transformJSONSchemaToFakerCode(
          jsonSchema.additionalProperties as OpenAPIV3.SchemaObject
        )} })).reduce((acc, next) => Object.assign(acc, next), {})`;
      }
      return `{
        ${Object.entries(jsonSchema.properties ?? {})
          .map(([key, value]) => {
            return `${JSON.stringify(key)}: ${transformJSONSchemaToFakerCode(
              value as OpenAPIV3.SchemaObject
            )}`;
          })
          .join(',\n')}
    }`;
    case 'array':
      return `[...(new Array(faker.datatype.number({ max: MAX_ARRAY_LENGTH }))).keys()].map(_ => (${transformJSONSchemaToFakerCode(
        jsonSchema.items as OpenAPIV3.SchemaObject
      )}))`;
    default:
      return 'null';
  }
}

/**
 * See https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
 */
function transformStringBasedOnFormat(format?: string) {
  switch (format) {
    case 'date-time':
      return 'faker.date.recent()';
    case 'date':
      return 'faker.date.recent().slice(0, 10)';
    case 'time':
      return 'faker.date.recent().slice(11)';
    case 'email':
      return 'faker.internet.exampleEmail()';
    case 'uuid':
      return `faker.datatype.uuid()`;
    case 'uri':
      return 'faker.internet.url()';
    case 'ipv4':
      return 'faker.internet.ip()';
    case 'ipv6':
      return 'faker.internet.ipv6()';
    default:
      return `faker.lorem.slug()`;
  }
}
