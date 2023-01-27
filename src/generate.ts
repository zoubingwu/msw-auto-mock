import * as fs from 'fs';
import * as path from 'path';

import ApiGenerator from 'oazapfts/lib/codegen/generate';
import { OpenAPIV3 } from 'openapi-types';
import camelCase from 'lodash/camelCase';

import { getV3Doc } from './swagger';
import { prettify, toExpressLikePath } from './utils';
import { OperationCollection } from './transform';
import { mockTemplate } from './template';
import { CliOptions } from './types';

export async function generate(spec: string, options: CliOptions) {
  const { output: outputFile } = options;
  let code: string;
  const apiDoc = await getV3Doc(spec);
  const apiGen = new ApiGenerator(apiDoc, {});

  const operationDefinitions = getOperationDefinitions(apiDoc);
  const includes = options?.includes?.split(',') ?? null;
  const excludes = options?.excludes?.split(',') ?? null;

  const operationCollection = operationDefinitions
    .filter(op => {
      if (includes && !includes.includes(op.path)) {
        return false;
      }
      if (excludes && excludes.includes(op.path)) {
        return false;
      }
      return true;
    })
    .map(definition => {
      const { verb, path, responses, id } = definition;

      const responseMap = Object.entries(responses).map(([code, response]) => {
        const content = apiGen.resolve(response).content;
        if (!content) {
          return { code, id: '', responses: {} };
        }

        const resolvedResponse = Object.keys(content).reduce(
          (resolved, type) => {
            const schema = content[type].schema;
            if (typeof schema !== 'undefined') {
              resolved[type] = recursiveResolveSchema(schema);
            }

            return resolved;
          },
          {} as Record<string, OpenAPIV3.SchemaObject>
        );

        return {
          code,
          id,
          responses: resolvedResponse,
        };
      });

      return {
        verb,
        path: toExpressLikePath(path),
        response: responseMap,
      };
    }) as OperationCollection;

  let baseURL = '';
  if (options.baseUrl === true) {
    baseURL = getServerUrl(apiDoc);
  } else if (typeof options.baseUrl === 'string') {
    baseURL = options.baseUrl;
  }
  code = mockTemplate(
    operationCollection,
    baseURL,
    options
  );

  if (outputFile) {
    fs.writeFileSync(
      path.resolve(process.cwd(), outputFile),
      await prettify(outputFile, code)
    );
  } else {
    console.log(await prettify(null, code));
  }

  function recursiveResolveSchema(
    schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
  ) {
    const resolvedSchema = apiGen.resolve(schema) as OpenAPIV3.SchemaObject;

    if (resolvedSchema.type === 'array') {
      resolvedSchema.items = apiGen.resolve(resolvedSchema.items);
      resolvedSchema.items = recursiveResolveSchema(resolvedSchema.items);
    } else if (resolvedSchema.type === 'object') {
      if (
        !resolvedSchema.properties &&
        typeof resolvedSchema.additionalProperties === 'object'
      ) {
        if ('$ref' in resolvedSchema.additionalProperties) {
          resolvedSchema.additionalProperties = recursiveResolveSchema(
            apiGen.resolve(resolvedSchema.additionalProperties)
          );
        }
      }

      if (resolvedSchema.properties) {
        resolvedSchema.properties = Object.entries(
          resolvedSchema.properties
        ).reduce((resolved, [key, value]) => {
          resolved[key] = recursiveResolveSchema(value);
          return resolved;
        }, {} as Record<string, OpenAPIV3.SchemaObject>);
      }
    } else if ('allOf' in schema) {
      resolvedSchema.allOf = apiGen.resolveArray(schema.allOf);
    } else if ('oneOf' in schema) {
      resolvedSchema.oneOf = apiGen.resolveArray(schema.oneOf);
    } else if ('anyOf' in schema) {
      resolvedSchema.anyOf = apiGen.resolveArray(schema.anyOf);
    }

    return resolvedSchema;
  }
}

function getServerUrl(apidoc: OpenAPIV3.Document) {
  let server = apidoc.servers?.at(0);
  let url = '';
  if (server) {
    url = server.url;
  }
  if (server?.variables) {
    Object.entries(server.variables).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value.default);
    });
  }

  return url;
}

const operationKeys = Object.values(
  OpenAPIV3.HttpMethods
) as OpenAPIV3.HttpMethods[];

type OperationDefinition = {
  path: string;
  verb: string;
  responses: OpenAPIV3.ResponsesObject;
  id: string;
};

function getOperationDefinitions(v3Doc: OpenAPIV3.Document): OperationDefinition[] {
  return Object.entries(v3Doc.paths).flatMap(([path, pathItem]) =>
    !pathItem
      ? []
      : Object.entries(pathItem)
          .filter((arg): arg is [string, OpenAPIV3.OperationObject] =>
            operationKeys.includes(arg[0] as any)
          )
          .map(([verb, operation]) => {
            const id = camelCase(operation.operationId ?? (verb + '/' + path));
            return {
              path,
              verb,
              id,
              responses: operation.responses,
            }
          })
  );
}
