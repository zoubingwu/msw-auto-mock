import type { Options } from 'tsup';

export const tsup: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
  format: ['cjs', 'esm'],
  dts: true,
  entryPoints: ['src/cli.ts'],
};
