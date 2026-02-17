import { relative } from "node:path";
import type {
  CliOptions,
  ExecutionResult,
  Report,
  SignatureWarning,
} from "./types.ts";

const ERROR_PATTERN =
  /^(?:TypeError|ReferenceError|SyntaxError|Error|RangeError|URIError|EvalError|AggregateError):/;
const MODULE_NOT_FOUND =
  /ERR_MODULE_NOT_FOUND|Cannot find module|does not provide an export/;

function relPath(filePath: string, rootDir: string): string {
  return relative(rootDir, filePath);
}

function extractErrorLine(stderr: string): string {
  const lines = stderr.split("\n");

  // Prefer a line with a recognized error type
  const errorLine = lines.find((l) => ERROR_PATTERN.test(l.trim()));
  if (errorLine) return errorLine.trim();

  // Fallback: module not found errors
  const moduleLine = lines.find((l) => MODULE_NOT_FOUND.test(l));
  if (moduleLine) return moduleLine.trim();

  // Last resort: first non-blank line
  const fallback = lines.find((l) => l.trim());
  return fallback?.trim() ?? stderr.trim();
}

export function buildReport(
  results: readonly ExecutionResult[],
  totalBlocks: number,
  totalFiles: number,
  signatureWarnings: readonly SignatureWarning[] = [],
  allBlocks?: readonly { hasImport: boolean; ignored: boolean }[]
): Report {
  // Use original blocks for accurate block-level stats (execution results
  // represent pages, not individual blocks)
  const withImports = allBlocks
    ? allBlocks.filter((b) => b.hasImport).length
    : results.filter((r) => r.block.hasImport).length;
  const ignoredCount = allBlocks
    ? allBlocks.filter((b) => b.ignored).length
    : results.filter((r) => r.block.ignored).length;
  const skippedCount = results.filter((r) => r.status === "skip").length;

  return {
    totalBlocks,
    totalFiles,
    withImports,
    ignoredCount,
    skippedCount,
    results,
    signatureWarnings,
  };
}

export function formatReport(
  report: Report,
  options: CliOptions,
  rootDir: string,
  durationMs: number
): string {
  if (options.json) {
    return formatJson(report, rootDir, durationMs);
  }
  return formatText(report, options, rootDir, durationMs);
}

function formatJson(
  report: Report,
  rootDir: string,
  durationMs: number
): string {
  const executed = report.results.filter((r) => r.status !== "skip");
  return JSON.stringify(
    {
      totalBlocks: report.totalBlocks,
      totalFiles: report.totalFiles,
      withImports: report.withImports,
      ignored: report.ignoredCount,
      skipped: report.skippedCount,
      executed: executed.length,
      passed: executed.filter((r) => r.status === "pass").length,
      failed: executed.filter((r) => r.status === "fail").length,
      timedOut: executed.filter((r) => r.status === "timeout").length,
      signatureBlocksChecked: report.totalBlocks,
      signatureWarningCount: report.signatureWarnings.length,
      durationMs,
      results: executed.map((r) => ({
        file: relPath(r.block.filePath, rootDir),
        line: r.block.lineNumber,
        blockIndex: r.block.blockIndex,
        status: r.status,
        durationMs: r.durationMs,
        stderr: r.stderr || undefined,
      })),
      signatureWarnings: report.signatureWarnings.map((w) => ({
        file: relPath(w.block.filePath, rootDir),
        line: w.block.lineNumber,
        blockIndex: w.block.blockIndex,
        functionName: w.functionName,
        expectedArgsMin: w.expectedArgsMin,
        expectedArgsMax: w.expectedArgsMax,
        actualArgs: w.actualArgs,
        lineInBlock: w.lineInBlock,
        callSite: w.callSite,
      })),
    },
    null,
    2
  );
}

function formatText(
  report: Report,
  options: CliOptions,
  rootDir: string,
  durationMs: number
): string {
  const lines: string[] = [];
  const executed = report.results.filter((r) => r.status !== "skip");
  const passed = executed.filter((r) => r.status === "pass");
  const failed = executed.filter((r) => r.status === "fail");
  const timedOut = executed.filter((r) => r.status === "timeout");

  lines.push("Documentation Code Check");
  lines.push("========================");
  lines.push(
    `Found ${report.totalBlocks} blocks in ${report.totalFiles} files (${report.withImports} with imports, ${report.ignoredCount} ignored)`
  );
  lines.push(`Signature check: ${report.totalBlocks} blocks scanned, ${report.signatureWarnings.length} warnings`);
  lines.push(`Execution check: ${executed.length} pages run (${report.skippedCount} skipped)`);
  lines.push("");

  // Show failures and timeouts
  for (const r of failed) {
    const path = relPath(r.block.filePath, rootDir);
    const dur = `${r.durationMs}ms`;
    lines.push(`[FAIL] ${path}  ${dur}`);
    if (r.stderr) {
      lines.push(`       ${extractErrorLine(r.stderr)}`);
    }
    lines.push("");
  }

  for (const r of timedOut) {
    const path = relPath(r.block.filePath, rootDir);
    const dur = `${r.durationMs}ms`;
    lines.push(`[TIMEOUT] ${path}  ${dur}`);
    lines.push("");
  }

  // Show passes in verbose mode
  if (options.verbose) {
    for (const r of passed) {
      const path = relPath(r.block.filePath, rootDir);
      const dur = `${r.durationMs}ms`;
      lines.push(`[PASS] ${path}  ${dur}`);
    }
    if (passed.length > 0) {
      lines.push("");
    }
  }

  // Show signature warnings
  if (report.signatureWarnings.length > 0) {
    lines.push("");
    lines.push("Signature Warnings");
    lines.push("------------------");
    for (const w of report.signatureWarnings) {
      const path = relPath(w.block.filePath, rootDir);
      const loc = `${path}:${w.block.lineNumber}`;
      const label = `(block ${w.block.blockIndex + 1})`;
      const range =
        w.expectedArgsMin === w.expectedArgsMax
          ? `${w.expectedArgsMin}`
          : `${w.expectedArgsMin}-${w.expectedArgsMax}`;
      lines.push(
        `[WARN] ${loc} ${label}`
      );
      lines.push(
        `       ${w.functionName}: called with ${w.actualArgs} args, expected ${range}`
      );
    }
    lines.push("");
  }

  const durationSec = (durationMs / 1000).toFixed(1);
  const sigWarnCount = report.signatureWarnings.length;
  lines.push(
    `Execution: ${passed.length} pages passed, ${failed.length} failed, ${timedOut.length} timed out`
  );
  lines.push(
    `Signatures: ${report.totalBlocks} checked, ${sigWarnCount} warnings`
  );
  lines.push(`Duration: ${durationSec}s`);

  return lines.join("\n");
}

export function hasFailures(report: Report): boolean {
  return report.results.some(
    (r) => r.status === "fail" || r.status === "timeout"
  );
}
