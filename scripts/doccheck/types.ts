export interface CodeBlock {
  readonly source: string;
  readonly filePath: string;
  readonly lineNumber: number;
  readonly blockIndex: number;
  readonly language: string;
  readonly hasImport: boolean;
  readonly ignored: boolean;
}

export type BlockStatus = "pass" | "fail" | "timeout" | "skip";

export interface ExecutionResult {
  readonly block: CodeBlock;
  readonly status: BlockStatus;
  readonly durationMs: number;
  readonly stderr: string;
  readonly exitCode: number | null;
}

export interface Report {
  readonly totalBlocks: number;
  readonly totalFiles: number;
  readonly withImports: number;
  readonly ignoredCount: number;
  readonly skippedCount: number;
  readonly results: readonly ExecutionResult[];
}

export interface CliOptions {
  readonly verbose: boolean;
  readonly json: boolean;
  readonly concurrency: number;
  readonly timeout: number;
  readonly file: string;
  readonly noCleanup: boolean;
}
