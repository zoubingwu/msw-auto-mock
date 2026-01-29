import vm from 'node:vm';
import { OpenAPIV3 } from 'openapi-types';
import merge from 'lodash/merge';
import camelCase from 'lodash/camelCase';
import { faker } from '@faker-js/faker';
import { ConfigOptions } from './types';
import { DEFAULT_MAX_ARRAY_LENGTH, isValidRegExp, normalizeNonNegativeInt } from './utils';

const MAX_STRING_LENGTH = 42;

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
  options?: ConfigOptions,
): string {
  const context = {
    faker,
    MAX_STRING_LENGTH,
    MAX_ARRAY_LENGTH: normalizeNonNegativeInt(options?.maxArrayLength, DEFAULT_MAX_ARRAY_LENGTH),
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

          const useFaker = options?.ai?.enable !== true;

          if (useFaker) {
            if (!r.responses) {
              return;
            }
            const jsonResponseKey = Object.keys(r.responses).filter(r => r.startsWith('application/json'))[0];
            const fakerResult = transformJSONSchemaToFakerCode(r.responses?.[jsonResponseKey]);
            if (options?.static) {
              vm.runInContext(`result = ${fakerResult};`, context);
            }

            return [
              `export function `,
              `${name}() { `,
              `return ${options?.static ? JSON.stringify(context.result) : fakerResult} `,
              `};\n`,
            ].join('\n');
          }

          if (!r.responses) {
            return;
          }
          const jsonResponseKey = Object.keys(r.responses).filter(r => r.startsWith('application/json'))[0];
          const operationString = JSON.stringify(r.responses?.[jsonResponseKey], null, 4);
          return [
            `export async function `,
            `${name}() { `,
            `return await ${options.static ? `withCacheOne(ask)(${operationString})` : `ask(${operationString})`} `,
            `};\n`,
          ].join('\n');
        })
        .join('\n'),
    )
    .join('\n');
}

function scoreHandlerPath(path: string) {
  const segments = path.split('/').filter(Boolean);
  const dynamicSegments = segments.filter(seg => seg.startsWith(':')).length;
  return {
    dynamicSegments,
    totalSegments: segments.length,
    normalized: segments.join('/'),
  };
}

function compareOperationsForMsw(a: Operation, b: Operation) {
  const sa = scoreHandlerPath(a.path);
  const sb = scoreHandlerPath(b.path);

  // MSW matches parameterized routes broadly, so put more specific/static routes first.
  if (sa.dynamicSegments !== sb.dynamicSegments) {
    return sa.dynamicSegments - sb.dynamicSegments;
  }

  // Prefer longer paths (more segments) first when they have the same dynamic count.
  if (sa.totalSegments !== sb.totalSegments) {
    return sb.totalSegments - sa.totalSegments;
  }

  // Keep output deterministic.
  if (a.verb !== b.verb) {
    return a.verb.localeCompare(b.verb);
  }
  return sa.normalized.localeCompare(sb.normalized);
}

export function transformToHandlerCode(operationCollection: OperationCollection, options: ConfigOptions): string {
  return [...operationCollection]
    .sort(compareOperationsForMsw)
    .map(op => {
      return `http.${op.verb}(\`\${baseURL}${op.path}\`, async () => {
        const resultArray = [${op.response.map(response => {
          const identifier = getResIdentifierName(response);
          const statusCode = parseInt(response?.code!);
          const safeStatusCode = Number.isFinite(statusCode) ? statusCode : 500;
          const result =
            safeStatusCode === 204
              ? `[undefined, { status: ${safeStatusCode} }]`
              : `[${identifier ? `${identifier}()` : 'undefined'}, { status: ${safeStatusCode} }]`;

          return result;
        })}]${options.typescript ? `as [any, { status: number }][]` : ''};

          return HttpResponse.json(...resultArray[next(\`${op.verb} ${op.path}\`) % resultArray.length])
        }),\n`;
    })
    .join('  ')
    .trimEnd();
}

export function transformJSONSchemaToFakerCode(jsonSchema?: OpenAPIV3.SchemaObject, key?: string): string {
  if (!jsonSchema) {
    return 'null';
  }

  if (jsonSchema.example) {
    if (jsonSchema.example.$ref) {
    }
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
      return transformStringBasedOnFormat(jsonSchema, key);
    case 'number':
    case 'integer':
      const params = JSON.stringify({ min: jsonSchema.minimum, max: jsonSchema.maximum });
      if (jsonSchema.minimum || jsonSchema.maxItems) {
        return `faker.number.int(${params})`;
      }
      return `faker.number.int()`;
    case 'boolean':
      return `faker.datatype.boolean()`;
    case 'object':
      if (!jsonSchema.properties && typeof jsonSchema.additionalProperties === 'object') {
        return `[...new Array(5).keys()].map(_ => ({ [faker.lorem.word()]: ${transformJSONSchemaToFakerCode(
          jsonSchema.additionalProperties as OpenAPIV3.SchemaObject,
        )} })).reduce((acc, next) => Object.assign(acc, next), {})`;
      }

      return `{
        ${Object.entries(jsonSchema.properties ?? {})
          .map(([k, v]) => {
            return `${JSON.stringify(k)}: ${transformJSONSchemaToFakerCode(v as OpenAPIV3.SchemaObject, k)}`;
          })
          .join(',\n')}
    }`;
    case 'array': {
      const minItems = normalizeNonNegativeInt(jsonSchema.minItems);
      const maxItems = normalizeNonNegativeInt(jsonSchema.maxItems);
      const minItemsValue = minItems ?? 1;
      const maxItemsValue = maxItems !== undefined ? `Math.min(${maxItems}, MAX_ARRAY_LENGTH)` : 'MAX_ARRAY_LENGTH';
      return `(() => {
        const arrayMin = ${minItemsValue};
        const arrayMax = ${maxItemsValue};
        const safeMin = Math.min(arrayMin, arrayMax);
        return [...new Array(faker.number.int({ min: safeMin, max: arrayMax })).keys()].map(_ => (${transformJSONSchemaToFakerCode(
          jsonSchema.items as OpenAPIV3.SchemaObject,
        )}));
      })()`;
    }
    default:
      return 'null';
  }
}

/**
 * See https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
 */
function transformStringBasedOnFormat(schema: OpenAPIV3.NonArraySchemaObject, key?: string) {
  const { format, minLength, maxLength, pattern } = schema;
  if (format === 'date-time' || key?.toLowerCase().endsWith('_at')) {
    return `faker.date.anytime().toISOString()`;
  } else if (format === 'time') {
    return `new Date().toISOString().substring(11, 16)`;
  } else if (format === 'date') {
    return `faker.date.past().toISOString().substring(0,10)`;
  } else if (format === 'uuid' || key?.toLowerCase() === 'id' || key?.toLowerCase().endsWith('id')) {
    return `faker.string.uuid()`;
  } else if (['idn-email', 'email'].includes(format ?? '') || key?.toLowerCase().includes('email')) {
    return `faker.internet.email()`;
  } else if (['hostname', 'idn-hostname'].includes(format ?? '')) {
    return `faker.internet.domainName()`;
  } else if (format === 'ipv4') {
    return `faker.internet.ip()`;
  } else if (format === 'ipv6') {
    return `faker.internet.ipv6()`;
  } else if (
    ['uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template'].includes(format ?? '') ||
    key?.toLowerCase().includes('url')
  ) {
    if (['photo', 'image', 'picture'].some(image => key?.toLowerCase().includes(image))) {
      return `faker.image.url()`;
    }
    return `faker.internet.url()`;
  } else if (key?.toLowerCase().endsWith('name')) {
    return `faker.person.fullName()`;
  } else if (key?.toLowerCase().includes('street')) {
    return `faker.location.streetAddress()`;
  } else if (key?.toLowerCase().includes('city')) {
    return `faker.location.city()`;
  } else if (key?.toLowerCase().includes('state')) {
    return `faker.location.state()`;
  } else if (key?.toLowerCase().includes('zip')) {
    return `faker.location.zipCode()`;
  }

  if (minLength && maxLength) {
    return `faker.string.alpha({ length: { min: ${minLength}, max: ${maxLength} }})`;
  } else if (minLength) {
    return `faker.string.alpha({ length: { min: ${minLength}, max: MAX_STRING_LENGTH }})`;
  } else if (maxLength) {
    return `faker.string.alpha({ length: { min: 0, max: ${maxLength} }})`;
  }

  if (pattern && isValidRegExp(pattern)) {
    // OpenAPI `pattern` is a bare regex source (e.g. ^[a-z]{2,}$), not a JS literal.
    // Some users still pass JS regex literals as strings (e.g. '/^foo$/i'); support both.
    if (pattern.startsWith('/')) {
      return `faker.helpers.fromRegExp(${pattern})`;
    }
    // Use `new RegExp()` with a JSON-escaped string to avoid syntax errors.
    return `faker.helpers.fromRegExp(new RegExp(${JSON.stringify(pattern)}))`;
  }

  return `faker.lorem.words()`;
}
