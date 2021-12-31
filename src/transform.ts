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

function transformJSONSchemaToFakerCode(
  jsonSchema?: OpenAPIV3.SchemaObject
): string {
  if (!jsonSchema) {
    return '{}';
  }

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
            return `${JSON.stringify(key)}: ${transformJSONSchemaToFakerCode(
              value as OpenAPIV3.SchemaObject
            )}`;
          })
          .join(',\n')}
    }`;
    case 'array':
      return `[...(new Array(faker.datatype.number({ max: 100 }))).keys()].map(_ => (${transformJSONSchemaToFakerCode(
        jsonSchema.items as OpenAPIV3.SchemaObject
      )}))`;
    // @ts-ignore
    case 'null':
      return 'null';
    default:
      return '{}';
  }
}
