import { describe, expect, it, vi } from 'vitest';

import { transformToGenerateResultFunctions } from '../src/transform';
import { generateOperationCollection } from '../src/generate';
import { getV3Doc } from '../src/swagger';

describe('transform:transformToGenerateResultFunctions', () => {
  it('Generates a response function with epxected faker calls', async () => {
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
