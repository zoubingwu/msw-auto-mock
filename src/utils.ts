import * as prettier from 'prettier';
import * as path from 'path';
import camelCase from 'lodash/camelCase';

export const DEFAULT_MAX_ARRAY_LENGTH = 20;

export const normalizeNonNegativeInt = (value: unknown, fallback?: number) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const raw = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  const normalized = Math.floor(raw);
  if (normalized < 0) {
    return 0;
  }
  return normalized;
};

const EXTENSION_TO_PARSER: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'babel',
  jsx: 'babel',
  'js.flow': 'flow',
  flow: 'flow',
  gql: 'graphql',
  graphql: 'graphql',
  css: 'postcss',
  scss: 'postcss',
  less: 'postcss',
  stylus: 'postcss',
  markdown: 'markdown',
  md: 'markdown',
  json: 'json',
};

export async function prettify(filePath: string | null, content: string): Promise<string> {
  let config = null;
  let parser = 'typescript';

  if (filePath) {
    const fileExtension = path.extname(filePath).slice(1);
    parser = EXTENSION_TO_PARSER[fileExtension];
    config = await prettier.resolveConfig(process.cwd(), {
      useCache: true,
      editorconfig: true,
    });
  }

  try {
    return prettier.format(content, {
      parser,
      ...config,

      // disable plugins
      plugins: [],
    });
  } catch (e) {
    // ignore error
    return content;
  }
}

export const toExpressLikePath = (path: string) =>
  // use `.+?` for lazy match
  path.replace(/{(.+?)}/g, (_match, p1: string) => `:${camelCase(p1)}`);

export const isValidRegExp = (regExpCandidate: string) => {
  var isValid = true;
  try {
    new RegExp(regExpCandidate);
  } catch (e) {
    isValid = false;
  }
  return isValid;
};
