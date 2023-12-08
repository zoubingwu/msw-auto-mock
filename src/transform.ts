import vm from 'node:vm';
import { OpenAPIV3 } from 'openapi-types';
import merge from 'lodash/merge';
import camelCase from 'lodash/camelCase';
import { faker } from '@faker-js/faker';
import { CliOptions } from './types';

export interface ResponseMap {
  code: string;
  id: string;
  responses?: Record<string, OpenAPIV3.SchemaObject>;
}

export interface Operation {
  verb: string;
  path: string;
  response: ResponseMap[];
}

export type OperationCollection = Operation[];

export function getResIdentifierName(res: ResponseMap) {
  if (!res.id) {
    return '';
  }
  return camelCase(`get ${res.id}${res.code}Response`);
}

export function transformToGenerateResultFunctions(
  operationCollection: OperationCollection,
  baseURL: string,
  options?: CliOptions
): string {
  const context = {
    faker,
    MAX_ARRAY_LENGTH: options?.maxArrayLength ?? 20,
    baseURL: baseURL ?? '',
    result: null,
  };
  vm.createContext(context);

  return operationCollection
    .map(op =>
      op.response
        .map(r => {
          const name = getResIdentifierName(r);
          if (!name) {
            return '';
          }

          const fakerResult = transformJSONSchemaToFakerCode(r.responses?.['application/json']);

          if (options?.static) {
            vm.runInContext(`result = ${fakerResult};`, context);
          }

          return [
            `export function `,
            `${getResIdentifierName(r)}() { `,
            `return ${options?.static ? JSON.stringify(context.result) : fakerResult} `,
            `};\n`,
          ].join('');
        })
        .join('\n')
    )
    .join('\n');
}

export function transformToHandlerCode(operationCollection: OperationCollection): string {
  return operationCollection
    .map(op => {
      return `http.${op.verb}(\`\${baseURL}${op.path}\`, () => {
        const resultArray = [${op.response.map(response => {
          const identifier = getResIdentifierName(response);
          return parseInt(response?.code!) === 204
            ? `[null, { status: ${parseInt(response?.code!)} }]`
            : `[${identifier ? `${identifier}()` : 'null'}, { status: ${parseInt(response?.code!)} }]`;
        })}];

          return HttpResponse.json(...resultArray[next() % resultArray.length])
        }),\n`;
    })
    .join('  ')
    .trimEnd();
}

function transformJSONSchemaToFakerCode(jsonSchema?: OpenAPIV3.SchemaObject, key?: string): string {
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

  if (jsonSchema.allOf) {
    const { allOf, ...rest } = jsonSchema;
    return transformJSONSchemaToFakerCode(merge({}, ...allOf, rest));
  }

  if (jsonSchema.oneOf) {
    const schemas = jsonSchema.oneOf as OpenAPIV3.SchemaObject[];
    return `faker.helpers.arrayElement([${schemas.map(i => transformJSONSchemaToFakerCode(i))}])`;
  }

  if (jsonSchema.anyOf) {
    const schemas = jsonSchema.anyOf as OpenAPIV3.SchemaObject[];
    return `faker.helpers.arrayElement([${schemas.map(i => transformJSONSchemaToFakerCode(i))}])`;
  }

  switch (jsonSchema.type) {
    case 'string':
      return transformStringBasedOnFormat(jsonSchema.format, key);
    case 'number':
    case 'integer':
      return `faker.number.int({ min: ${jsonSchema.minimum}, max: ${jsonSchema.maximum} })`;
    case 'boolean':
      return `faker.datatype.boolean()`;
    case 'object':
      if (!jsonSchema.properties && typeof jsonSchema.additionalProperties === 'object') {
        return `[...new Array(5).keys()].map(_ => ({ [faker.lorem.word()]: ${transformJSONSchemaToFakerCode(
          jsonSchema.additionalProperties as OpenAPIV3.SchemaObject
        )} })).reduce((acc, next) => Object.assign(acc, next), {})`;
      }

      return `{
        ${Object.entries(jsonSchema.properties ?? {})
          .map(([k, v]) => {
            return `${JSON.stringify(k)}: ${transformJSONSchemaToFakerCode(v as OpenAPIV3.SchemaObject, k)}`;
          })
          .join(',\n')}
    }`;
    case 'array':
      return `[...(new Array(faker.number.int({ min: ${jsonSchema.minLength ?? 1}, max: ${
        jsonSchema.maxLength ?? 'MAX_ARRAY_LENGTH'
      } }))).keys()].map(_ => (${transformJSONSchemaToFakerCode(jsonSchema.items as OpenAPIV3.SchemaObject)}))`;
    default:
      return 'null';
  }
}

/**
 * See https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
 */
function transformStringBasedOnFormat(format?: string, key?: string) {
  if (['date-time', 'date', 'time'].includes(format ?? '') || key?.toLowerCase().endsWith('_at')) {
    return `faker.date.past()`;
  } else if (format === 'uuid') {
    return `faker.datatype.uuid()`;
  } else if (['idn-email', 'email'].includes(format ?? '') || key?.toLowerCase().endsWith('email')) {
    return `faker.internet.email()`;
  } else if (['hostname', 'idn-hostname'].includes(format ?? '')) {
    return `faker.internet.domainName()`;
  } else if (format === 'ipv4') {
    return `faker.internet.ip()`;
  } else if (format === 'ipv6') {
    return `faker.internet.ipv6()`;
  } else if (
    ['uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template'].includes(format ?? '') ||
    key?.toLowerCase().endsWith('url')
  ) {
    if (['photo', 'image', 'picture'].some(image => key?.toLowerCase().includes(image))) {
      return `faker.image.url()`;
    }
    return `faker.internet.url()`;
  } else if (key?.toLowerCase().endsWith('name')) {
    return `faker.person.fullName()`;
  } else {
    return `faker.lorem.slug(1)`;
  }
}
