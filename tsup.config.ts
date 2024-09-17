import type { Options } from 'tsup';

export const tsup: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  format: ['cjs'],
  dts: false,
  external: ['prettier'],
  entryPoints: ['src/cli.ts'],
};
