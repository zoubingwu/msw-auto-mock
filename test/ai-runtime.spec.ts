import { describe, expect, it, vi } from 'vitest';

import { createAiGenerateText } from '../src/template';

// This test runs the generated `ask()` function with mocked dependencies.
// It ensures the generated runtime awaits the AI call and parses JSON correctly.
describe('ai runtime: generated ask()', () => {
  it('awaits generateText() and returns parsed JSON', async () => {
    const code = createAiGenerateText({
      output: '',
      ai: {
        enable: true,
        provider: 'openai',
        openai: {
          apiKey: 'process.env.OPENAI_API_KEY',
          model: "'gpt-5.2'",
        },
      },
    } as any);

    // Strip ESM imports so we can eval the function in this test environment.
    const body = code
      .split('\n')
      .filter(line => !line.startsWith('import '))
      .join('\n');

    const createOpenAI = vi.fn(() => () => 'mock-model');
    const generateText = vi.fn(async () => ({ text: '{"hello":"world"}' }));

    // The generated code expects a `createPrompt()` function.
    function createPrompt(_operation: unknown) {
      return 'prompt';
    }

    // Evaluate the generated `ask()` and grab it back.
    // eslint-disable-next-line no-eval
    const ask = eval(`(() => {\n${body}\n; return ask; })()`);

    const result = await ask({});

    expect(createOpenAI).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ hello: 'world' });
  });
});
