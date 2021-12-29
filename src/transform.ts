import { JSONSchema4 } from './types';

export type OperationCollection = {
  verb: string;
  path: string;
  responseMap: {
    code: string;
    responses?: JSONSchema4;
  }[];
}[];

export function transformToHandlerCode(
  operationCollection: OperationCollection
): string {
  return operationCollection
    .map(op => {
      return `rest.${op.verb}('${op.path}', (req, res, ctx) => {}),\n`;
    })
    .join('  ')
    .trimEnd();
}
