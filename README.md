# msw-auto-mock

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/zoubingwu/msw-auto-mock/release.yaml?branch=master)
![npm](https://img.shields.io/npm/v/msw-auto-mock)
![npm](https://img.shields.io/npm/dw/msw-auto-mock)

A cli tool to generate random mock data from OpenAPI descriptions for [msw](https://github.com/mswjs/msw).

## Why

We already have all the type definitions from OpenAPI spec so hand-writing every response resolver is completely unnecessary.

## Generative AI Support

Since v0.19.0, msw-auto-mock can use generative AI to generate mock data instead of faker.

AI is configured via your `package.json` (or any config file supported by cosmiconfig) under the `msw-auto-mock` key:

```json
{
  "msw-auto-mock": {
    "ai": {
      "enable": true,
      "provider": "openai",
      "openai": {
        "apiKey": "process.env.OPENAI_API_KEY",
        "model": "gpt-4o"
      }
    }
  }
}
```

### Providers and Required Fields

Currently supported providers: `openai`, `azure`, `anthropic`.

When `ai.enable` is `true`, you must provide the model/deployment for the selected provider:

- `provider: "openai"` requires `ai.openai.model`
- `provider: "azure"` requires `ai.azure.deployment`
- `provider: "anthropic"` requires `ai.anthropic.model`

If a required field is missing, generation fails fast with a clear error (instead of generating broken code).

### How Config Values Are Interpreted

The AI config values are strings in JSON, but they are used to generate JavaScript code.
msw-auto-mock supports two styles:

- **Expression strings**: values that start with `process.env.` or `import.meta.env.` (or `Deno.env.`) are treated as JavaScript expressions and injected as-is.
- **Literal strings**: everything else is treated as a string literal and will be automatically quoted in the generated code.

This means you can write:

- `"model": "gpt-4o"` (literal string; recommended)
- `"apiKey": "process.env.OPENAI_API_KEY"` (expression string)

### Full Type Definition

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
}
```

> [!IMPORTANT]
> For security, keep API keys in environment variables and reference them via `process.env.*` / `import.meta.env.*` in your config.
> You no longer need to wrap model names in extra quotes; `"model": "gpt-4o"` is valid.

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
    return;
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
- `--typescript`: Generate TypeScript files instead of JavaScript files.
- `-h, --help`: show help info.
