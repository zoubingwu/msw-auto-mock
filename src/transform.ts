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
      return `rest.${op.verb}(\`\${baseURL}${op.path}\`, (req, res, ctx) => {
        const resultArray = [${op.responseMap.map(response => {
          return `[ctx.status(${parseInt(
            response?.code!
          )}), ctx.json(${transformJSONSchemaToFakerCode(
            response?.responses?.['application/json']
          )})]`;
        })}];

          return res(...resultArray[next() % resultArray.length])
        }),\n`;
    })
    .join('  ')
    .trimEnd();
}

function transformJSONSchemaToFakerCode(
  jsonSchema?: OpenAPIV3.SchemaObject,
  key?: string
): string {
  if (!jsonSchema) {
    return 'null';
  }

  if (jsonSchema.example) {
    return JSON.stringify(jsonSchema.example);
  }

  if (Array.isArray(jsonSchema.type)) {
    return `faker.helpers.arrayElement([${jsonSchema.type
      .map(type => transformJSONSchemaToFakerCode({ ...jsonSchema, type }))
      .join(',')}])`;
  }

  if (jsonSchema.enum) {
    return `faker.helpers.arrayElement(${JSON.stringify(jsonSchema.enum)})`;
  }

  switch (jsonSchema.type) {
    case 'string':
      return transformStringBasedOnFormat(jsonSchema.format, key);
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
          .map(([k, v]) => {
            return `${JSON.stringify(k)}: ${transformJSONSchemaToFakerCode(
              v as OpenAPIV3.SchemaObject,
              k
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
function transformStringBasedOnFormat(format?: string, key?: string) {
  if (
    ['date-time', 'date', 'time'].includes(format ?? '') ||
    key?.toLowerCase().endsWith('_at')
  ) {
    return `faker.date.past()`;
  } else if (format === 'uuid') {
    return `faker.datatype.uuid()`;
  } else if (
    ['idn-email', 'email'].includes(format ?? '') ||
    key?.toLowerCase().endsWith('email')
  ) {
    return `faker.internet.email()`;
  } else if (['hostname', 'idn-hostname'].includes(format ?? '')) {
    return `faker.internet.domainName()`;
  } else if (format === 'ipv4') {
    return `faker.internet.ip()`;
  } else if (format === 'ipv6') {
    return `faker.internet.ipv6()`;
  } else if (
    ['uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template'].includes(
      format ?? ''
    ) ||
    key?.toLowerCase().endsWith('url')
  ) {
    return `faker.internet.url()`;
  } else if (key?.toLowerCase().endsWith('name')) {
    return `faker.name.findName()`;
  } else {
    return `faker.lorem.slug(1)`;
  }
}
