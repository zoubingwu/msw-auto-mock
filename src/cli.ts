import cac from 'cac';

import { generate } from './generate';
import { version } from '../package.json';

const cli = cac();

cli
  .command(
    '<spec>',
    'Generate MSW mock definitions from an OpenAPI spec (faker by default; generative AI optional via config).',
  )
  .option('-o, --output <directory>', `Output to a folder.`)
  .option('-m, --max-array-length <number>', `Max array length, default to 20.`)
  .option('-t, --includes <keywords>', `Include the request path with given string, can be seperated with comma.`)
  .option('-e, --excludes <keywords>', `Exclude the request path with given string, can be seperated with comma.`)
  .option('--base-url [baseUrl]', `Use the one you specified or server url in OpenAPI description as base url.`)
  .option('--static', 'By default it will generate dynamic mocks, use this flag if you want generate static mocks.')
  .option('-c, --codes <keywords>', 'Comma separated list of status codes to generate responses for')
  .option('--typescript', 'Generate TypeScript files instead of JavaScript files')
  .option('--echo-request-body', 'Merge JSON request body into JSON response body for write requests (POST/PUT/PATCH)')
  .example('msw-auto-mock ./githubapi.yaml -o mock.js')
  .example('msw-auto-mock ./githubapi.yaml -o mock.js -t /admin,/repo -m 30')
  .example('msw-auto-mock ./githubapi.yaml -o mock.js --typescript')
  .example(
    'package.json: { "msw-auto-mock": { "ai": { "enable": true, "provider": "openai", "openai": { "apiKey": "process.env.OPENAI_API_KEY", "model": "gpt-4o" } } } }',
  )
  .action(async (spec, options) => {
    await generate(spec, options).catch(console.error);
  });

cli.help();
cli.version(version);

cli.parse();
