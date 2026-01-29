import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { generate } from '../src/generate';

const TEST_OUTPUT_DIR = 'test-output';
const TEST_SPEC_PATH = './test/fixture/test.yaml';

describe('TypeScript file generation', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      const files = fs.readdirSync(TEST_OUTPUT_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(TEST_OUTPUT_DIR, file));
      });
      fs.rmdirSync(TEST_OUTPUT_DIR);
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      const files = fs.readdirSync(TEST_OUTPUT_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(TEST_OUTPUT_DIR, file));
      });
      fs.rmdirSync(TEST_OUTPUT_DIR);
    }
  });

  it('should generate JavaScript files by default', async () => {
    await generate(TEST_SPEC_PATH, { output: TEST_OUTPUT_DIR });

    expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'handlers.js'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'browser.js'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'node.js'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'native.js'))).toBe(true);
  });

  it('should generate TypeScript files when typescript option is true', async () => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      const files = fs.readdirSync(TEST_OUTPUT_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(TEST_OUTPUT_DIR, file));
      });
    }

    await generate(TEST_SPEC_PATH, { output: TEST_OUTPUT_DIR, typescript: true });

    expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'handlers.ts'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'browser.ts'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'node.ts'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'native.ts'))).toBe(true);

    // Ensure the generated React Native integration file compiles.
    // This catches TS4094 when exporting inferred class types with private/protected members.
    fs.writeFileSync(
      path.join(TEST_OUTPUT_DIR, 'tsconfig.test.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
            noEmit: true,
          },
          include: ['./*.ts'],
        },
        null,
        2,
      ),
    );

    execSync('npx tsc -p tsconfig.test.json', {
      cwd: TEST_OUTPUT_DIR,
      stdio: 'pipe',
    });
  });
});
