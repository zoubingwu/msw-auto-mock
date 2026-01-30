import { describe, expect, it } from 'vitest';

import { mockTemplate } from '../src/template';

describe('template:ai config expressions', () => {
  it('treats plain model ids as string literals', () => {
    const out = mockTemplate([] as any, '', {
      output: '',
      ai: {
        enable: true,
        provider: 'openai',
        openai: {
          apiKey: 'process.env.OPENAI_API_KEY',
          model: 'gpt-4o',
        },
      },
    } as any);

    // apiKey stays as an expression
    expect(out).toContain('apiKey: process.env.OPENAI_API_KEY');
    // model becomes a quoted literal instead of invalid JS like `})(gpt-4o)`
    expect(out).toContain('})("gpt-4o")');
  });

  it('keeps explicit quoted values as-is', () => {
    const out = mockTemplate([] as any, '', {
      output: '',
      ai: {
        enable: true,
        provider: 'openai',
        openai: {
          model: "'gpt-4o'",
        },
      },
    } as any);

    expect(out).toContain("})('gpt-4o')");
  });

  it('throws if AI is enabled but provider model is missing', () => {
    expect(() =>
      mockTemplate([] as any, '', {
        output: '',
        ai: {
          enable: true,
          provider: 'openai',
          openai: {
            apiKey: 'process.env.OPENAI_API_KEY',
          },
        },
      } as any),
    ).toThrow(/ai\.openai\.model is missing/);
  });
});
