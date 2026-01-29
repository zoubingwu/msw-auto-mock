import { describe, expect, it, vi } from 'vitest';

import {
  transformToGenerateResultFunctions,
  transformJSONSchemaToFakerCode,
  transformToHandlerCode,
} from '../src/transform';
import { generateOperationCollection } from '../src/generate';
import { getV3Doc } from '../src/swagger';
import { OpenAPIV3 } from 'openapi-types';

describe('transform:transformToGenerateResultFunctions', () => {
  it('Generates a response function with expected faker calls', async () => {
    const apiDoc = await getV3Doc('./test/fixture/strings.yaml');
    const schema = generateOperationCollection(apiDoc, { output: '' });

    const transform = transformToGenerateResultFunctions(schema, '');
    const src = transform.replace('export', '').replace('};', '}');

    {
      const faker = {
        string: {
          alpha: vi.fn(),
        },
      };

      const MAX_STRING_LENGTH = 897;

      // direct eval is safe here, we know the generated code
      // and we need the local scope
      const generateFunction = eval(`(${src})`);
      const generatedResponse = generateFunction();

      expect(faker.string.alpha).toHaveBeenNthCalledWith(1, { length: { min: 5, max: 10 } });
      expect(faker.string.alpha).toHaveBeenNthCalledWith(2, { length: { min: 3, max: MAX_STRING_LENGTH } });
      expect(faker.string.alpha).toHaveBeenNthCalledWith(3, { length: { min: 0, max: 7 } });
    }
  });
});

describe('transform:transformToHandlerCode', () => {
  it('sorts static paths before parameterized paths', () => {
    const ops = [
      {
        verb: 'get',
        path: '/users/:id',
        response: [{ code: '200', id: 'User', responses: { 'application/json': { type: 'object' } as any } }],
      },
      {
        verb: 'get',
        path: '/users/me',
        response: [{ code: '200', id: 'Me', responses: { 'application/json': { type: 'object' } as any } }],
      },
    ];

    const out = transformToHandlerCode(ops as any, { output: '' } as any);
    expect(out.indexOf('/users/me')).toBeLessThan(out.indexOf('/users/:id'));
  });
});

describe('transform:transformJSONSchemaToFakerCode', () => {
  describe('Given a string schema', () => {
    it('Default case', () => {
      const expected = 'faker.lorem.words()';
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
      };
      expect(transformJSONSchemaToFakerCode(schema)).toBe(expected);
    });

    it('Returns ISO strings for date-time format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date-time',
      };
      expect(transformJSONSchemaToFakerCode(schema)).toBe('faker.date.anytime().toISOString()');
    });

    it('Returns ISO strings for *_at keys', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
      };
      expect(transformJSONSchemaToFakerCode(schema, 'created_at')).toBe('faker.date.anytime().toISOString()');
    });

    it('Prioritises example value', () => {
      const expected = 'homerjsimpson@springfieldnuclear.org';
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        example: expected,
        pattern: '/^S+@S+.S+$/',
      };
      expect(transformJSONSchemaToFakerCode(schema)).toBe(JSON.stringify(expected));
    });

    it('Returns fromRegExp() if a JS regexp literal is provided', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        pattern: '/^S+@S+.S+$/',
      };
      expect(transformJSONSchemaToFakerCode(schema)).toBe('faker.helpers.fromRegExp(/^S+@S+.S+$/)');
    });

    it('Returns fromRegExp(new RegExp()) if a bare regexp pattern is provided', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        pattern: '^[a-zA-Z0-9-_]{2,50}$',
      };
      expect(transformJSONSchemaToFakerCode(schema)).toBe(
        'faker.helpers.fromRegExp(new RegExp("^[a-zA-Z0-9-_]{2,50}$"))',
      );
    });

    it('Falls back if invalid regexp pattern is provided', () => {
      const expected = 'faker.lorem.words()';
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        pattern: '^\\',
      };
      const result = transformJSONSchemaToFakerCode(schema);
      expect(result).toBe(expected);
    });
  });

  describe('Given an array schema', () => {
    const evaluateArraySchema = (schema: OpenAPIV3.SchemaObject, maxArrayLength: number) => {
      const faker = {
        number: {
          int: vi.fn(() => 0),
        },
        lorem: {
          words: vi.fn(() => 'word'),
        },
      };
      const MAX_ARRAY_LENGTH = maxArrayLength;
      // direct eval is safe here, we know the generated code
      // and we need the local scope
      eval(transformJSONSchemaToFakerCode(schema));
      return faker;
    };

    it('caps maxItems by MAX_ARRAY_LENGTH and respects minItems', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        minItems: 2,
        maxItems: 10,
        items: { type: 'string' },
      };
      const faker = evaluateArraySchema(schema, 3);
      expect(faker.number.int).toHaveBeenCalledWith({ min: 2, max: 3 });
    });

    it('handles maxItems=0', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        maxItems: 0,
        items: { type: 'string' },
      };
      const faker = evaluateArraySchema(schema, 5);
      expect(faker.number.int).toHaveBeenCalledWith({ min: 0, max: 0 });
    });

    it('clamps minItems when it exceeds MAX_ARRAY_LENGTH', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        minItems: 5,
        items: { type: 'string' },
      };
      const faker = evaluateArraySchema(schema, 3);
      expect(faker.number.int).toHaveBeenCalledWith({ min: 3, max: 3 });
    });

    it('floors non-integer minItems and maxItems', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        minItems: 2.9,
        maxItems: 4.1,
        items: { type: 'string' },
      };
      const faker = evaluateArraySchema(schema, 10);
      expect(faker.number.int).toHaveBeenCalledWith({ min: 2, max: 4 });
    });

    it('handles MAX_ARRAY_LENGTH=0', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        items: { type: 'string' },
      };
      const faker = evaluateArraySchema(schema, 0);
      expect(faker.number.int).toHaveBeenCalledWith({ min: 0, max: 0 });
    });
  });
});
