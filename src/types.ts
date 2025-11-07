export interface CliOptions {
  output: string;
  maxArrayLength?: number;
  includes?: string;
  excludes?: string;
  baseUrl?: string | true;
  codes?: string;
  static?: boolean;
  typescript?: boolean;
  regex?: boolean;
}

export type ConfigOptions = CliOptions & {
  typescript?: boolean;
  ai?: {
    enable?: boolean;
    provider: 'openai' | 'azure' | 'anthropic';
    openai?: {
      baseURL?: string;
      /**
       * defaults to `OPENAI_API_KEY`
       */
      apiKey?: string;
      model?: string;
    };
    azure?: {
      /**
       * defaults to `AZURE_API_KEY`
       */
      apiKey?: string;
      resource?: string;
      deployment?: string;
    };
    anthropic?: {
      /**
       * defaults to `ANTHROPIC_API_KEY`
       */
      apiKey?: string;
      model?: string;
    };
  };
};
