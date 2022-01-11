import cac from 'cac';

import { generate } from './generate';
import { version } from '../package.json';

const cli = cac();

cli
  .command('<spec>', 'Generating msw mock definitions with random fake data.')
  .option(
    '-o, --output <file>',
    `Output file path such as \`./mock.js\`, without it'll output to stdout.`
  )
  .option('-m, --max-array-length <number>', `Max array length, default to 20.`)
  .option(
    '-t, --match <keywords>',
    `Match the request path with given string, can be seperated with comma.`
  )
  .example('msw-auto-mock ./githubapi.yaml -o mock.js')
  .example('msw-auto-mock ./githubapi.yaml -o mock.js -t /admin,/repo -m 30')
  .action(async (spec, options) => {
    await generate(spec, options).catch(console.error);
  });

cli.help();
cli.version(version);

cli.parse();
