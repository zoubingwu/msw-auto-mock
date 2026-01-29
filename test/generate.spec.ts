import get from 'lodash/get';
import keys from 'lodash/keys';
import { OpenAPIV3 } from 'openapi-types';
import { beforeAll, describe, it, expect } from 'vitest';

import { getV3Doc } from '../src/swagger';
import { generateOperationCollection } from '../src/generate';

const generateCollectionFromSpec = async (spec: string) => {
  const apiDoc = await getV3Doc(spec);
  return generateOperationCollection(apiDoc, { output: '' });
};

describe('generate:generateOperationCollection', () => {
  let schema: OpenAPIV3.SchemaObject;
  beforeAll(async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/test.yaml');
    schema = get(collection, [0, 'response', '0', 'responses', 'application/json; ; charset=utf-8;', 'allOf', 1]);
  });

  it('schema should be defined', () => {
    expect(schema).toBeDefined();
  });

  it('should resolve ref under allOf', async () => {
    const testEntity = get(schema, ['properties', 'data', 'properties', 'rows', 'items', 'allOf', 0]);
    expect(testEntity).toBeDefined();
    expect(testEntity.description).equal('TestEntity');
  });

  it("should resolve ref's allOf after it's resolving", async () => {
    const baseEntity = get(schema, [
      'properties',
      'data',
      'properties',
      'rows',
      'items',
      'allOf',
      0,
      'allOf',
      0,
      'allOf',
      0,
    ]);
    expect(baseEntity).toMatchObject({ type: 'object' });
    expect(baseEntity).not.haveOwnProperty('$ref');
  });

  it('should not resolve circular ref', async () => {
    const creatorBaseEntity = get(schema, [
      'properties',
      'data',
      'properties',
      'rows',
      'items',
      'allOf',
      0,
      'allOf',
      0,
      'allOf',
      0,
      'properties',
      'creator',
      'allOf',
      0,
    ]);
    expect(keys(creatorBaseEntity).length).toEqual(0);
  });

  it('should resolve type object allOf recursively', async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/test.yaml');
    const arrayEntity = get(collection, [
      1,
      'response',
      0,
      'responses',
      'application/json',
      'properties',
      'data',
      'items',
      'allOf',
      0,
    ]);
    expect(arrayEntity).toMatchObject({ type: 'object' });
  });

  it('should resolve $ref in example values', async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/test.yaml');
    const customerExample = get(collection, [
      2,
      'response',
      0,
      'responses',
      'application/json',
      'properties',
      'data',
      'items',
      'example',
    ]);
    expect(customerExample).toMatchObject({
      id: 'customer-id-test',
      createdAt: 1234567890,
      name: 'Customer name',
    });
  });
});

describe('generate:regex filtering', () => {
  it('should include only paths matching regex includes pattern', async () => {
    const apiDoc = await getV3Doc('./test/fixture/test.yaml');
    const collection = generateOperationCollection(apiDoc, {
      output: '',
      regex: true,
      includes: '^/test$'
    });

    expect(collection).toHaveLength(1);
    expect(collection[0].path).toBe('/test');
  });

  it('should include paths matching any of multiple regex includes patterns', async () => {
    const apiDoc = await getV3Doc('./test/fixture/test.yaml');
    const collection = generateOperationCollection(apiDoc, {
      output: '',
      regex: true,
      includes: '^/test$,^/test2$'
    });

    expect(collection).toHaveLength(2);
    expect(collection.map(op => op.path)).toContain('/test');
    expect(collection.map(op => op.path)).toContain('/test2');
  });

  it('should exclude paths matching regex excludes pattern', async () => {
    const apiDoc = await getV3Doc('./test/fixture/test.yaml');
    const collection = generateOperationCollection(apiDoc, {
      output: '',
      regex: true,
      excludes: '^/test$'
    });

    expect(collection).toHaveLength(1);
    expect(collection[0].path).toBe('/test2');
  });

  it('should work with complex regex patterns', async () => {
    const apiDoc = await getV3Doc('./test/fixture/test.yaml');
    const collection = generateOperationCollection(apiDoc, {
      output: '',
      regex: true,
      includes: '/test\\d+'
    });

    expect(collection).toHaveLength(1);
    expect(collection[0].path).toBe('/test2');
  });
});
