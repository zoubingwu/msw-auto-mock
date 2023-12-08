import get from 'lodash/get';
import keys from 'lodash/keys';
import { OpenAPIV3 } from 'openapi-types';
import { beforeAll, describe, it, expect } from 'vitest';

import { getV3Doc } from '../src/swagger';
import { generateOperationCollection } from '../src/generate';
import { mockTemplate } from '../src/template';
import { prettify } from '../src/utils';

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
});

describe('generate:mockTemplate', () => {
  let code: string;
  beforeAll(async () => {
    const collection = await generateCollectionFromSpec('./test/fixture/test.yaml');
    code = await prettify(null, mockTemplate(collection, '', { output: '' }));
  });

  it('should include expected properties', async () => {
    const expected = `
          id: faker.number.int({ min: 1, max: undefined }),
          created_at: faker.date.past(),
          creator: {
            name: faker.person.fullName(),
          },
          name: faker.person.fullName(),
  `;
    expect(code).toContain(expected);
  });
});
