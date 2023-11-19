import { OpenAPIV3 } from 'openapi-types';
import merge from 'lodash/merge';
import camelCase from 'lodash/camelCase';
import { faker } from '@faker-js/faker';
import { CliOptions } from './types';

type BasePropsType = {
  jsonSchema?: OpenAPIV3.SchemaObject;
  key?: string;
  config?: CliOptions;
};

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

export function transformToResObject(operationCollection: OperationCollection, config?: CliOptions): string {
  return operationCollection
    .map(op =>
      op.response
        .map(r => {
          const name = getResIdentifierName(r);
          if (!name) {
            return '';
          }
          return `export function ${getResIdentifierName(r)}() { return ${transformJSONSchemaToFakerCode({
            jsonSchema: r.responses?.['application/json'],
            config,
          })} };\n`;
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

type TransformJSONSchemaToFakerCodePropsType = BasePropsType & {};

function transformJSONSchemaToFakerCode({ jsonSchema, key, config }: TransformJSONSchemaToFakerCodePropsType): string {
  if (!jsonSchema) {
    return 'null';
  }

  if (jsonSchema.example) {
    return JSON.stringify(jsonSchema.example);
  }

  if (Array.isArray(jsonSchema.type)) {
    if (config?.static === true) {
      return `[${faker.helpers.arrayElement([
        jsonSchema.type
          .map(type => transformJSONSchemaToFakerCode({ jsonSchema: { ...jsonSchema, type }, config }))
          .join(','),
      ])}]`;
    }

    return `faker.helpers.arrayElement([${jsonSchema.type
      .map(type => transformJSONSchemaToFakerCode({ jsonSchema: { ...jsonSchema, type }, config }))
      .join(',')}])`;
  }

  if (jsonSchema.enum) {
    if (config?.static === true) {
      return `"${faker.helpers.arrayElement(jsonSchema.enum)}"`;
    }

    return `faker.helpers.arrayElement(${JSON.stringify(jsonSchema.enum)})`;
  }

  if (jsonSchema.allOf) {
    const schemas = jsonSchema.allOf as OpenAPIV3.SchemaObject[];

    return transformJSONSchemaToFakerCode({ jsonSchema: merge({}, ...schemas), config });
  }

  if (jsonSchema.oneOf) {
    const schemas = jsonSchema.oneOf as OpenAPIV3.SchemaObject[];

    if (config?.static === true) {
      return `${faker.helpers.arrayElement(
        schemas.map(i => transformJSONSchemaToFakerCode({ jsonSchema: i, config }))
      )}`;
    }

    return `faker.helpers.arrayElement([${schemas.map(i =>
      transformJSONSchemaToFakerCode({ jsonSchema: i, config })
    )}])`;
  }

  if (jsonSchema.anyOf) {
    const schemas = jsonSchema.anyOf as OpenAPIV3.SchemaObject[];

    if (config?.static === true) {
      return `${faker.helpers.arrayElement(
        schemas.map(i => transformJSONSchemaToFakerCode({ jsonSchema: i, config }))
      )}`;
    }

    return `faker.helpers.arrayElement([${schemas.map(i =>
      transformJSONSchemaToFakerCode({ jsonSchema: i, config })
    )}])`;
  }

  switch (jsonSchema.type) {
    case 'string':
      return transformStringBasedOnFormat({ format: jsonSchema.format, key, config });
    case 'number':
    case 'integer':
      if (config?.static === true) {
        return `${faker.number.int({ min: jsonSchema.minimum, max: jsonSchema.maximum })}`;
      }

      return `faker.number.int({ min: ${jsonSchema.minimum}, max: ${jsonSchema.maximum} })`;
    case 'boolean':
      if (config?.static === true) {
        return `${faker.datatype.boolean()}`;
      }

      return `faker.datatype.boolean()`;
    case 'object':
      if (!jsonSchema.properties && typeof jsonSchema.additionalProperties === 'object') {
        const _value = transformJSONSchemaToFakerCode({
          jsonSchema: jsonSchema.additionalProperties as OpenAPIV3.SchemaObject,
          config,
        });

        if (config?.static === true) {
          return `{${[...new Array(5).keys()].map(_ => `${faker.lorem.word()}: ${_value}`)}}`;
        }

        return `[...new Array(5).keys()].map(_ => ({ [faker.lorem.word()]: ${transformJSONSchemaToFakerCode({
          jsonSchema: jsonSchema.additionalProperties as OpenAPIV3.SchemaObject,
        })} })).reduce((acc, next) => Object.assign(acc, next), {})`;
      }

      return `{
        ${Object.entries(jsonSchema.properties ?? {})
          .map(([k, v]) => {
            return `${JSON.stringify(k)}: ${transformJSONSchemaToFakerCode({
              jsonSchema: v as OpenAPIV3.SchemaObject,
              key: k,
              config,
            })}`;
          })
          .join(',\n')}
      }`;
    case 'array':
      if (config?.static === true) {
        return `[${[
          ...new Array(
            faker.number.int({
              min: jsonSchema.minLength ?? 1,
              max: jsonSchema.maxLength ?? (config?.maxArrayLength || 20),
            })
          ).keys(),
        ].map(_ =>
          transformJSONSchemaToFakerCode({ jsonSchema: jsonSchema.items as OpenAPIV3.SchemaObject, config })
        )}]`;
      }

      return `[...(new Array(faker.number.int({ min: ${jsonSchema.minLength ?? 1}, max: ${
        jsonSchema.maxLength ?? 'MAX_ARRAY_LENGTH'
      } }))).keys()].map(_ => (${transformJSONSchemaToFakerCode({
        jsonSchema: jsonSchema.items as OpenAPIV3.SchemaObject,
        config,
      })}))`;
    default:
      return 'null';
  }
}

/**
 * See https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
 */
type TransformStringBasedOnFormatPropsType = Omit<BasePropsType, 'jsonSchema'> & {
  format?: string;
};

function transformStringBasedOnFormat({ format, key, config }: TransformStringBasedOnFormatPropsType) {
  if (['date-time', 'date', 'time'].includes(format ?? '') || key?.toLowerCase().endsWith('_at')) {
    if (config?.static === true) {
      return `"${faker.date.past()}"`;
    }

    return `faker.date.past()`;
  } else if (format === 'uuid') {
    if (config?.static === true) {
      return `"${faker.string.uuid()}"`;
    }

    return `faker.string.uuid()`;
  } else if (['idn-email', 'email'].includes(format ?? '') || key?.toLowerCase().endsWith('email')) {
    if (config?.static === true) {
      return `"${faker.internet.email()}"`;
    }

    return `faker.internet.email()`;
  } else if (['hostname', 'idn-hostname'].includes(format ?? '')) {
    if (config?.static === true) {
      return `"${faker.internet.domainName()}"`;
    }

    return `faker.internet.domainName()`;
  } else if (format === 'ipv4') {
    if (config?.static === true) {
      return `"${faker.internet.ip()}"`;
    }

    return `faker.internet.ip()`;
  } else if (format === 'ipv6') {
    if (config?.static === true) {
      return `"${faker.internet.ipv6()}"`;
    }

    return `faker.internet.ipv6()`;
  } else if (
    ['uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template'].includes(format ?? '') ||
    key?.toLowerCase().endsWith('url')
  ) {
    if (['photo', 'image', 'picture'].some(image => key?.toLowerCase().includes(image))) {
      if (config?.static === true) {
        return `"${faker.image.url()}"`;
      }

      return `faker.image.url()`;
    }

    if (config?.static === true) {
      return `"${faker.internet.url()}"`;
    }

    return `faker.internet.url()`;
  } else if (key?.toLowerCase().endsWith('name')) {
    if (config?.static === true) {
      return `"${faker.person.fullName()}"`;
    }

    return `faker.person.fullName()`;
  } else {
    if (config?.static === true) {
      return `"${faker.lorem.slug()}"`;
    }

    return `faker.lorem.slug(1)`;
  }
}
