import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { TransformResult } from "./transform.ts";
import type { ExecutionResult } from "./types.ts";

const TMP_DIR = ".doccheck-tmp";

function hashSource(source: string): string {
  return createHash("sha256").update(source).digest("hex").slice(0, 16);
}

function runBlock(
  filePath: string,
  rootDir: string,
  timeoutMs: number
): Promise<{ exitCode: number | null; stderr: string; durationMs: number }> {
  return new Promise((resolvePromise) => {
    const start = performance.now();
    const tsxBin = resolve(rootDir, "node_modules/.bin/tsx");
    const child = spawn(tsxBin, [filePath], {
      cwd: rootDir,
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
      detached: true,
    });

    let stderr = "";
    let timedOut = false;

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 600) {
        stderr += chunk.toString();
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      // Kill the entire process group to handle spawned subprocesses
      try {
        if (child.pid) {
          process.kill(-child.pid, "SIGKILL");
        }
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Math.round(performance.now() - start);
      if (timedOut) {
        resolvePromise({ exitCode: null, stderr: "Timed out", durationMs });
      } else {
        resolvePromise({
          exitCode: code,
          stderr: stderr.slice(0, 500),
          durationMs,
        });
      }
    });
  });
}

export async function executeBlocks(
  transforms: readonly TransformResult[],
  rootDir: string,
  concurrency: number,
  timeoutMs: number,
  cleanup: boolean
): Promise<readonly ExecutionResult[]> {
  const tmpDir = resolve(rootDir, TMP_DIR);
  await mkdir(tmpDir, { recursive: true });

  const results: ExecutionResult[] = [];

  // Separate skipped from executable
  const skipped: ExecutionResult[] = transforms
    .filter((t) => t.transformed === null)
    .map((t) => ({
      block: t.block,
      status: "skip" as const,
      durationMs: 0,
      stderr: t.skipReason,
      exitCode: null,
    }));

  const executable = transforms.filter((t) => t.transformed !== null);

  // Write all temp files
  const tasks: Array<{
    transform: TransformResult;
    tmpFile: string;
  }> = [];

  for (const t of executable) {
    const hash = hashSource(t.transformed as string);
    const tmpFile = join(tmpDir, `block-${hash}.ts`);
    await writeFile(tmpFile, t.transformed as string, "utf-8");
    tasks.push({ transform: t, tmpFile });
  }

  // Execute with concurrency limit
  let taskIndex = 0;

  async function worker(): Promise<ExecutionResult[]> {
    const workerResults: ExecutionResult[] = [];
    while (taskIndex < tasks.length) {
      const idx = taskIndex++;
      const task = tasks[idx];
      const { exitCode, stderr, durationMs } = await runBlock(
        task.tmpFile,
        rootDir,
        timeoutMs
      );

      let status: ExecutionResult["status"];
      if (exitCode === null) {
        status = "timeout";
      } else if (exitCode === 0) {
        status = "pass";
      } else {
        status = "fail";
      }

      workerResults.push({
        block: task.transform.block,
        status,
        durationMs,
        stderr,
        exitCode,
      });
    }
    return workerResults;
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  const workerResults = await Promise.all(workers);

  for (const wr of workerResults) {
    results.push(...wr);
  }

  // Sort results by file path + line number for consistent output
  results.sort((a, b) => {
    const fileCmp = a.block.filePath.localeCompare(b.block.filePath);
    if (fileCmp !== 0) return fileCmp;
    return a.block.lineNumber - b.block.lineNumber;
  });

  if (cleanup) {
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }

  return [...skipped, ...results];
}
