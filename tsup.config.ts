import type { Options } from 'tsup';

export const tsup: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  format: ['cjs', 'esm'],
  dts: true,
  entryPoints: ['src/cli.ts'],
};
