import * as fs from 'fs';

import toJsonSchema from '@openapi-contrib/openapi-schema-to-json-schema';
import ApiGenerator from 'oazapfts/lib/codegen/generate';
import { OpenAPIV3 } from 'openapi-types';

import { getV3Doc } from './swagger';
import { toExpressLikePath } from './utils';
import { OperationCollection, transformToHandlerCode } from './transform';
import { browserMockTemplate } from './template';
import { JSONSchema4 } from './types';

export async function generate(spec: string, output?: string) {
  let code: string;
  const apiDoc = await getV3Doc(spec);

  const apiGen = new ApiGenerator(apiDoc, {});
  const operationDefinitions = getOperationDefinitions(apiDoc);
  const operationCollection: OperationCollection = operationDefinitions.map(
    operationDefinition => {
      const { verb, path, responses } = operationDefinition;

      const responseMap = Object.entries(responses).map(([code, response]) => {
        const content = apiGen.resolve(response).content;
        if (!content) {
          return { code };
        }

        const resolvedResponse = Object.keys(content).reduce(
          (resolved, type) => {
            resolved[type] = toJsonSchema(
              recursiveResolveSchema(content[type].schema)!
            ) as JSONSchema4;
            return resolved;
          },
          {} as JSONSchema4
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
    }
  );

  code = browserMockTemplate(transformToHandlerCode(operationCollection));

  if (output) {
    fs.writeFileSync(output, code);
  } else {
    console.log(code);
  }

  function recursiveResolveSchema(schema: any) {
    const resolvedSchema = apiGen.resolve(schema);
    if (resolvedSchema.properties) {
      resolvedSchema.properties = Object.entries(
        resolvedSchema.properties
      ).reduce((resolved, [key, value]) => {
        resolved[key] = recursiveResolveSchema(value);
        return resolved;
      }, {} as any);
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
