import { describe, expect, it, vi } from 'vitest';

import { transformToGenerateResultFunctions, transformJSONSchemaToFakerCode } from '../src/transform';
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

describe('transform:transformJSONSchemaToFakerCode', () => {
  describe('Given a string schema', () => {
    it('Default case', () => {
      const expected = 'faker.lorem.words()';
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
      };
      expect(transformJSONSchemaToFakerCode(schema)).toBe(expected);
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

    it('Returns fromRegExp() if valid regexp pattern is provided', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        pattern: '/^S+@S+.S+$/',
      };
      expect(transformJSONSchemaToFakerCode(schema)).toBe('faker.helpers.fromRegExp(/^S+@S+.S+$/)');
    });

    it('Falls back if invalid regexp pattern is provided', () => {
      const expected = 'faker.lorem.words()';
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        pattern: '^\\',
      };
      expect(transformJSONSchemaToFakerCode(schema)).toBe(expected);
    });
  });
});
