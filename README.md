# msw-auto-mock

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/zoubingwu/msw-auto-mock/Test)
![npm](https://img.shields.io/npm/v/msw-auto-mock)

A cli tool to generate random mock data from OpenAPI descriptions for [msw](https://github.com/mswjs/msw).

## Why

We already have all the type definitions from OpenAPI spec so hand-writing every response resolver is completely unnecessary.

## Usage

**This tool also requires @faker-js/faker >= v7.**

Install:

```sh
yarn add msw-auto-mock @faker-js/faker -D
```

Read from your OpenAPI descriptions and output generated code:

```sh
# can be http url or a file path on your machine, support both yaml and json.
npx msw-auto-mock http://your_openapi.json -o ./mock.js
```

See [here for generated code with Github API example](https://raw.githubusercontent.com/zoubingwu/msw-auto-mock/master/example/src/mock.ts). The msw mocking handlers was generated by following command:

```sh
npx msw-auto-mock https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/ghes-3.3/ghes-3.3.json --output ./example/src/mock.ts
```

Integrate with msw, see [Mock Service Worker's doc](https://mswjs.io/docs/getting-started/integrate/browser) for more detail:

```sh
# Install msw
yarn add msw --dev

# Init service worker
npx msw init public/ --save
```

Then import those mock definitions in you app entry:

```js
import { startWorker } from './mock';

if (process.env.NODE_ENV === 'development') {
  startWorker();
}
```

Run you app then you'll see a successful activation message from Mock Service Worker in your browser's console.


## Options

 - `-o, --output`: specify output file path or output to stdout.
 - `-m, --max-array-length <number>`: specify max array length in response, it'll cost some time if you want to generate a huge chunk of random data.
 - `-t, --include <keywords>`: specify keywords to match if you want to generate mock data only for certain requests, multiple keywords can be seperated with comma.
 - `-e, --exclude <keywords>`: specify keywords to exclude, multiple keywords can be seperated with comma.
 - `--base-url`: output code with specified base url or fallback to server host specified in OpenAPI.
 - `-h, --help`: show help info.
