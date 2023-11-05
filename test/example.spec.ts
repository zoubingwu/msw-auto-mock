import { execSync } from 'child_process';
import { describe, expect, test } from 'vitest';

function generateExample(name, args = '') {
  const fixture = `./test/fixture/${name}.yaml`;
  const output = `./example/test${args.replace(/\s+/g, '-')}.js`;
  const command = `node ./dist/cli.js ${fixture} --output ${output} ${args}`;
  execSync(command, { cwd: '.' });
  return output;
}

describe('example', () => {
  test.each([
    generateExample('githubapi', '--node'),
    generateExample('githubapi', '--react-native'),
  ])('%s should be valid', async (example) => {
    await expect(import(example)).resolves.toMatchObject({});
  });
});
