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
    schema = get(collection, [0, 'response', '0', 'responses', 'application/json', 'allOf', 1]);
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

  describe('filters', () => {
    let apiDoc: OpenAPIV3.Document;

    beforeAll(async () => {
      apiDoc = await getV3Doc('./test/fixture/filters.yaml');
    });

    it.each<[string, number]>([
      ['/test', 1],
      ['/test,/test2/test', 2],
    ])('should include string filter %s', (filter, results) => {
      const collection = generateOperationCollection(apiDoc, { output: '', includes: filter });
      expect(collection).toHaveLength(results);
    });

    it.each<[string, number]>([
      ['^/test$', 1],
      ['/test\\d/.+', 2],
    ])('should include regex filter %s', (filter, results) => {
      const collection = generateOperationCollection(apiDoc, { output: '', includes: filter, regex: true });
      expect(collection).toHaveLength(results);
    });

    it.each<[string, number]>([
      ['/test', 2],
      ['/test,/test2/test', 1],
    ])('should exclude string filter %s', (filter, results) => {
      const collection = generateOperationCollection(apiDoc, { output: '', excludes: filter });
      expect(collection).toHaveLength(results);
    });

    it.each<[string, number]>([
      ['^/test$', 2],
      ['/test\\d/.+', 1],
    ])('should exclude regex filter %s', (filter, results) => {
      const collection = generateOperationCollection(apiDoc, { output: '', excludes: filter, regex: true });
      expect(collection).toHaveLength(results);
    });
  });
});
