import { promisify } from 'util';
import { exec } from 'child_process';
import { describe, expect, test } from 'vitest';

const escapedCwd = process.cwd().replace(/\\/g, '\\\\');
const execAsync = promisify(exec);
const timeout = 20000;

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

async function generateExample(name, args = '') {
  const fixture = `./test/fixture/${name}.yaml`;
  const output = `./example/test-${name}${args.replace(/\s+/g, '-')}.js`;
  const command = `node ./dist/cli.js ${fixture} --output ${output} ${args}`;
  await execAsync(command, { cwd: '.' });
  return output;
}

describe('example', () => {
  test.each([
    { name: 'githubapi', args: '--node' },
    { name: 'githubapi', args: '--react-native' },
  ])(
    '$name $args should be valid',
    async ({ name, args }) => {
      const example = await generateExample(name, args);
      await expect(import(example)).resolves.toMatchSnapshot();
    },
    timeout
  );
});
