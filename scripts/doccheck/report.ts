import { relative } from "node:path";
import type { CliOptions, ExecutionResult, Report } from "./types.ts";

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
  totalFiles: number
): Report {
  const withImports = results.filter((r) => r.block.hasImport).length;
  const ignoredCount = results.filter((r) => r.block.ignored).length;
  const skippedCount = results.filter((r) => r.status === "skip").length;

  return {
    totalBlocks,
    totalFiles,
    withImports,
    ignoredCount,
    skippedCount,
    results,
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
      durationMs,
      results: executed.map((r) => ({
        file: relPath(r.block.filePath, rootDir),
        line: r.block.lineNumber,
        blockIndex: r.block.blockIndex,
        status: r.status,
        durationMs: r.durationMs,
        stderr: r.stderr || undefined,
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
  lines.push(`Executing ${executed.length} blocks...`);
  lines.push("");

  // Show failures and timeouts
  for (const r of failed) {
    const path = relPath(r.block.filePath, rootDir);
    const loc = `${path}:${r.block.lineNumber}`;
    const label = `(block ${r.block.blockIndex + 1})`;
    const dur = `${r.durationMs}ms`;
    lines.push(`[FAIL] ${loc} ${label}  ${dur}`);
    if (r.stderr) {
      lines.push(`       ${extractErrorLine(r.stderr)}`);
    }
    lines.push("");
  }

  for (const r of timedOut) {
    const path = relPath(r.block.filePath, rootDir);
    const loc = `${path}:${r.block.lineNumber}`;
    const label = `(block ${r.block.blockIndex + 1})`;
    const dur = `${r.durationMs}ms`;
    lines.push(`[TIMEOUT] ${loc} ${label}  ${dur}`);
    lines.push("");
  }

  // Show passes in verbose mode
  if (options.verbose) {
    for (const r of passed) {
      const path = relPath(r.block.filePath, rootDir);
      const loc = `${path}:${r.block.lineNumber}`;
      const label = `(block ${r.block.blockIndex + 1})`;
      const dur = `${r.durationMs}ms`;
      lines.push(`[PASS] ${loc} ${label}  ${dur}`);
    }
    if (passed.length > 0) {
      lines.push("");
    }
  }

  const durationSec = (durationMs / 1000).toFixed(1);
  lines.push(
    `Summary: ${passed.length} passed, ${failed.length} failed, ${timedOut.length} timed out, ${report.skippedCount} skipped`
  );
  lines.push(`Duration: ${durationSec}s`);

  return lines.join("\n");
}

export function hasFailures(report: Report): boolean {
  return report.results.some(
    (r) => r.status === "fail" || r.status === "timeout"
  );
}
