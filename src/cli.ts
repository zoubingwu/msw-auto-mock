import cac from 'cac';

import { generate } from './generate';
import { version } from '../package.json';

const cli = cac();

cli
  .command('[spec]', 'Generating msw mock definitions with random fake data.')
  .option(
    '-o, --output <file>',
    `Output file path such as \`./mock.js\`, without it'll output to stdout.`
  )
  .action((spec, options) => {
    generate(spec, options.output).catch(console.error);
  });

cli.help();
cli.version(version);

cli.parse();
