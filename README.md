# msw-auto-mock

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/zoubingwu/msw-auto-mock/release.yaml?branch=master)
![npm](https://img.shields.io/npm/v/msw-auto-mock)
![npm](https://img.shields.io/npm/dw/msw-auto-mock)

A cli tool to generate random mock data from OpenAPI descriptions for [msw](https://github.com/mswjs/msw).

## Why

We already have all the type definitions from OpenAPI spec so hand-writing every response resolver is completely unnecessary.

## Generative AI Support

Since v0.19.0, msw-auto-mock support using generative AI to generate the mock data instead of fakerjs. To enable this feature, you need to setup the related config in your `package.json`:

```json
{
  "msw-auto-mock": {
    "ai": {
      "enable": true,
      "provider": "openai",
      "openai": {
        "apiKey": "process.env.OPENAI_API_KEY",
      }
    }
  }
}
```

Currently, only `openai`, `azure`, `anthropic` are supported. The Configuration is like below:

```ts
interface Config {
  ai?: {
    enable?: boolean;
    provider: 'openai' | 'azure' | 'anthropic';
    openai?: {
      baseURL?: string;
      apiKey?: string;
      model?: string;
    };
    azure?: {
      apiKey?: string;
      resource?: string;
      deployment?: string;
    };
    anthropic?: {
      apiKey?: string;
      model?: string;
    };
  };
};
```

> [!IMPORTANT]
> For security issue, it is recommended to put your api keys in the `.env` files, and only leave the env key in the settings, for example if you are using vite, the setting should be `"apiKey": "import.meta.env.VITE_OPENAI_API_KEY"` since this is the way how vite loaded env variables, for Next.js, you could just use `"apiKey": "process.env.PUBLIC_OPENAI_API_KEY"`. If you want to use plain value in the setting, make sure they are **quoted** like `"model": "'gpt-4o'"`

## Usage

**This tool also requires @faker-js/faker >= 8 and msw >= 2.**

Install:

```sh
yarn add msw-auto-mock @faker-js/faker -D
```

Read from your OpenAPI descriptions and output generated code:

```sh
# can be http url or a file path on your machine, support both yaml and json.
npx msw-auto-mock http://your_openapi.json -o ./mock
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
import { worker } from './mock/browser.js';

await worker.start();
```

For conditional mocking:

```js
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  const { worker } = await import('./mock/browser');
  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and ready to intercept requests.
  return worker.start();
}

function mountApp() {
  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
}

enableMocking().then(mountApp);
```

For Node.js integration, you can import from `your_output/node.js`:

```js
import { worker } from './mock/node.js';
```

For React Native integration, you can import from `your_output/native.js`:

```js
import { worker } from './mock/native.js';
```

Run you app then you'll see a successful activation message from Mock Service Worker in your browser's console.

## Options

- `-o, --output`: specify output file path or output to stdout.
- `-m, --max-array-length <number>`: specify max array length in response, default value is `20`, it'll cost some time if you want to generate a huge chunk of random data.
- `-t, --includes <keywords>`: specify keywords to match if you want to generate mock data only for certain requests, multiple keywords can be seperated with comma.
- `-e, --excludes <keywords>`: specify keywords to exclude, multiple keywords can be seperated with comma.
- `--base-url`: output code with specified base url or fallback to server host specified in OpenAPI.
- `--static`: By default it will generate dynamic mocks, use this flag if you need it to be static.
- `-c, --codes <keywords>`: comma separated list of status codes to generate responses for
- `-h, --help`: show help info.
