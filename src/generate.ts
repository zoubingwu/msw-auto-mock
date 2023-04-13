import * as fs from 'fs';
import * as path from 'path';

import ApiGenerator, { isReference } from 'oazapfts/lib/codegen/generate';
import { OpenAPIV3 } from 'openapi-types';
import camelCase from 'lodash/camelCase';

import { getV3Doc } from './swagger';
import { prettify, toExpressLikePath } from './utils';
import { Operation } from './transform';
import { mockTemplate } from './template';
import { CliOptions } from './types';

export function generateOperationCollection(apiDoc: OpenAPIV3.Document, options: CliOptions) {
  const apiGen = new ApiGenerator(apiDoc, {});

  const operationDefinitions = getOperationDefinitions(apiDoc);
  return operationDefinitions
    .filter(op => operationFilter(op, options))
    .map(op => codeFilter(op, options))
    .map(definition => toOperation(definition, apiGen));
}

export async function generate(spec: string, options: CliOptions) {
  const { output: outputFile } = options;
  let code: string;
  const apiDoc = await getV3Doc(spec);

  const operationCollection = await generateOperationCollection(apiDoc, options);

  let baseURL = '';
  if (options.baseUrl === true) {
    baseURL = getServerUrl(apiDoc);
  } else if (typeof options.baseUrl === 'string') {
    baseURL = options.baseUrl;
  }
  code = mockTemplate(operationCollection, baseURL, options);

  if (outputFile) {
    fs.writeFileSync(path.resolve(process.cwd(), outputFile), await prettify(outputFile, code));
  } else {
    console.log(await prettify(null, code));
  }
}

function getServerUrl(apiDoc: OpenAPIV3.Document) {
  let server = apiDoc.servers?.at(0);
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

const operationKeys = Object.values(OpenAPIV3.HttpMethods) as OpenAPIV3.HttpMethods[];

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
          .filter((arg): arg is [string, OpenAPIV3.OperationObject] => operationKeys.includes(arg[0] as any))
          .map(([verb, operation]) => {
            const id = camelCase(operation.operationId ?? verb + '/' + path);
            return {
              path,
              verb,
              id,
              responses: operation.responses,
            };
          })
  );
}

function operationFilter(operation: OperationDefinition, options: CliOptions): boolean {
  const includes = options?.includes?.split(',') ?? null;
  const excludes = options?.excludes?.split(',') ?? null;

  if (includes && !includes.includes(operation.path)) {
    return false;
  }
  if (excludes && excludes.includes(operation.path)) {
    return false;
  }
  return true;
}

function codeFilter(operation: OperationDefinition, options: CliOptions): OperationDefinition {
  const codes = options?.codes?.split(',') ?? null;

  const responses = Object.entries(operation.responses)
    .filter(([code]) => {
      if (codes && !codes.includes(code)) {
        return false;
      }
      return true;
    })
    .map(([code, response]) => ({
      [code]: response,
    }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {} as OpenAPIV3.ResponsesObject);

  return {
    ...operation,
    responses,
  };
}

function toOperation(definition: OperationDefinition, apiGen: ApiGenerator): Operation {
  const { verb, path, responses, id } = definition;

  const responseMap = Object.entries(responses).map(([code, response]) => {
    const content = apiGen.resolve(response).content;
    if (!content) {
      return { code, id: '', responses: {} };
    }

    const resolvedResponse = Object.keys(content).reduce((resolved, type) => {
      const schema = content[type].schema;
      if (typeof schema !== 'undefined') {
        resolved[type] = recursiveResolveSchema(schema, apiGen);
      }

      return resolved;
    }, {} as Record<string, OpenAPIV3.SchemaObject>);

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
}

const resolvingRefs: string[] = [];

function autoPopRefs<T>(cb: () => T) {
  const n = resolvingRefs.length;
  const res = cb();
  resolvingRefs.length = n;
  return res;
}

function resolve(schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject, apiGen: ApiGenerator) {
  if (isReference(schema)) {
    if (resolvingRefs.includes(schema.$ref)) {
      console.warn(`circular reference for path ${[...resolvingRefs, schema.$ref].join(' -> ')} found`);
      return {};
    }
    resolvingRefs.push(schema.$ref);
  }
  return { ...apiGen.resolve(schema) };
}

function recursiveResolveSchema(schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject, apiGen: ApiGenerator) {
  return autoPopRefs(() => {
    const resolvedSchema = resolve(schema, apiGen) as OpenAPIV3.SchemaObject;

    if (resolvedSchema.type === 'array') {
      resolvedSchema.items = resolve(resolvedSchema.items, apiGen);
      resolvedSchema.items = recursiveResolveSchema(resolvedSchema.items, apiGen);
    } else if (resolvedSchema.type === 'object') {
      if (!resolvedSchema.properties && typeof resolvedSchema.additionalProperties === 'object') {
        if (isReference(resolvedSchema.additionalProperties)) {
          resolvedSchema.additionalProperties = recursiveResolveSchema(
            resolve(resolvedSchema.additionalProperties, apiGen),
            apiGen
          );
        }
      }

      if (resolvedSchema.properties) {
        resolvedSchema.properties = Object.entries(resolvedSchema.properties).reduce((resolved, [key, value]) => {
          resolved[key] = recursiveResolveSchema(value, apiGen);
          return resolved;
        }, {} as Record<string, OpenAPIV3.SchemaObject>);
      }
    } else if (resolvedSchema.allOf) {
      resolvedSchema.allOf = resolvedSchema.allOf.map(item => recursiveResolveSchema(item, apiGen));
    } else if (resolvedSchema.oneOf) {
      resolvedSchema.oneOf = resolvedSchema.oneOf.map(item => recursiveResolveSchema(item, apiGen));
    } else if (resolvedSchema.anyOf) {
      resolvedSchema.anyOf = resolvedSchema.anyOf.map(item => recursiveResolveSchema(item, apiGen));
    }

    return resolvedSchema;
  });
}
