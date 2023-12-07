import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import { describe, expect, test } from 'vitest';

const escapedCwd = process.cwd().replace(/\\/g, '\\\\');
const execAsync = promisify(exec);
const timeout = 60000;

expect.addSnapshotSerializer({
  serialize(val, config, indentation, depth, refs, printer) {
    return printer(val, { ...config, plugins: [] }, indentation, depth, refs)
      .split(escapedCwd)
      .join('.')
      .replace(/\\\\/g, '/');
  },
  test(val) {
    return val && Object.prototype.hasOwnProperty.call(val, 'startWorker');
  },
});

async function generateExample(name: string, args = '') {
  const fixture = `./test/fixture/${name}.yaml`;
  const output = `./example/test-${name}${args.replace(/\s+/g, '-')}.js`;
  const command = `node ./dist/cli.js ${fixture} --output ${output} ${args}`;
  await execAsync(command, { cwd: '.' });
  return output;
}

describe('try generate with fixture', () => {
  test.each([
    { name: 'githubapi', args: '--node' },
    { name: 'githubapi', args: '--react-native' },
    { name: 'githubapi', args: '--static' },
  ])(
    'generated result should match snapshot',
    async ({ name, args }) => {
      const example = await generateExample(name, args);
      await expect(import(example)).resolves.toMatchSnapshot();
    },
    timeout
  );
});
