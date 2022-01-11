import * as fs from 'fs';
import * as path from 'path';

import ApiGenerator from 'oazapfts/lib/codegen/generate';
import { OpenAPIV3 } from 'openapi-types';

import { getV3Doc } from './swagger';
import { prettify, toExpressLikePath } from './utils';
import { OperationCollection, transformToHandlerCode } from './transform';
import { browserMockTemplate } from './template';
import { CliOptions } from './types';

export async function generate(spec: string, options: CliOptions) {
  const { output: outputFile } = options;
  let code: string;
  const apiDoc = await getV3Doc(spec);
  const apiGen = new ApiGenerator(apiDoc, {});
  const operationDefinitions = getOperationDefinitions(apiDoc);
  const matchers = options?.match?.split(',') ?? null;
  const operationCollection: OperationCollection = operationDefinitions
    .map(operationDefinition => {
      const { verb, path, responses } = operationDefinition;

      const responseMap = Object.entries(responses).map(([code, response]) => {
        const content = apiGen.resolve(response).content;
        if (!content) {
          return { code };
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
          responses: resolvedResponse,
        };
      });

      return {
        verb,
        path: toExpressLikePath(path),
        responseMap,
      };
    })
    .filter(op =>
      matchers ? matchers.some(matcher => op.path.includes(matcher)) : true
    );

  code = browserMockTemplate(
    transformToHandlerCode(operationCollection),
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
      if (resolvedSchema.properties) {
        resolvedSchema.properties = Object.entries(
          resolvedSchema.properties
        ).reduce((resolved, [key, value]) => {
          resolved[key] = recursiveResolveSchema(value);
          return resolved;
        }, {} as Record<string, OpenAPIV3.SchemaObject>);
      }
    }

    return resolvedSchema;
  }
}

const operationKeys = Object.values(
  OpenAPIV3.HttpMethods
) as OpenAPIV3.HttpMethods[];

type OperationDefinition = {
  path: string;
  verb: string;
  responses: OpenAPIV3.ResponsesObject;
};

function getOperationDefinitions(
  v3Doc: OpenAPIV3.Document
): OperationDefinition[] {
  return Object.entries(v3Doc.paths).flatMap(([path, pathItem]) =>
    !pathItem
      ? []
      : Object.entries(pathItem)
          .filter((arg): arg is [string, OpenAPIV3.OperationObject] =>
            operationKeys.includes(arg[0] as any)
          )
          .map(([verb, operation]) => ({
            path,
            verb,
            responses: operation.responses,
          }))
  );
}
