import { execSync } from 'child_process';
import { describe, expect, test } from 'vitest';

function generateNodeExample(output) {
  const fixture = './test/fixture/githubapi.yaml';
  const command = `node ./dist/cli.js ${fixture} --node --output ${output}`;
  return execSync(command, { cwd: '.' });
}

describe('example', () => {
  const output = './example/node.js';
  generateNodeExample(output);
  test.each([
    output,
  ])('%s should be valid', async (example) => {
    await expect(import(example)).resolves.toMatchObject({});
  });
});
