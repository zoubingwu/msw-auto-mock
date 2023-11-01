import { describe, expect, test } from 'vitest';

describe('example', () => {
  test.each([
    './example/ghapi.js',
    './example/src/mock.js',
  ])('%s should be valid', async (example) => {
    await expect(import(example)).resolves.toMatchObject({});
  });
});
