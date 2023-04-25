export interface CliOptions {
  output: string;
  maxArrayLength?: number;
  includes?: string;
  excludes?: string;
  baseUrl?: string | true;
  node?: boolean;
  codes?: string;
  responseConditions?: string
}

export type ResponseConditions = Record<string, Record<string, Record<string, string>>>