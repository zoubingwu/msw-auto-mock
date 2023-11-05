import { exec } from 'child_process';
import { describe, expect, test } from 'vitest';

async function generateExample(name, args = '') {
  const fixture = `./test/fixture/${name}.yaml`;
  const output = `./example/test-${name}${args.replace(/\s+/g, '-')}.js`;
  const command = `node ./dist/cli.js ${fixture} --output ${output} ${args}`;
  await exec(command, { cwd: '.' });
  return output;
}

describe('example', () => {
  test.each([
    { name: 'githubapi', args: '--node' },
    { name: 'githubapi', args: '--react-native' },
  ])('$name $args should be valid', async ({ name, args }) => {
    const example = await generateExample(name, args);
    await expect(import(example)).resolves.toMatchObject({});
  });
});
