import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { extractBlocks } from "./doccheck/extract.ts";
import { executeBlocks } from "./doccheck/execute.ts";
import { buildReport, formatReport, hasFailures } from "./doccheck/report.ts";
import { transformBlock } from "./doccheck/transform.ts";
import type { CliOptions } from "./doccheck/types.ts";

function parseCli(): CliOptions {
  const { values } = parseArgs({
    options: {
      verbose: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      concurrency: { type: "string", default: "4" },
      timeout: { type: "string", default: "10000" },
      file: { type: "string", default: "docs/**/*.md" },
      "no-cleanup": { type: "boolean", default: false },
    },
    strict: true,
  });

  return {
    verbose: values.verbose ?? false,
    json: values.json ?? false,
    concurrency: Number.parseInt(values.concurrency ?? "4", 10),
    timeout: Number.parseInt(values.timeout ?? "10000", 10),
    file: values.file ?? "docs/**/*.md",
    noCleanup: values["no-cleanup"] ?? false,
  };
}

async function main(): Promise<void> {
  const options = parseCli();
  const rootDir = resolve(import.meta.dirname, "..");

  // Check that dist/ exists
  const distIndex = resolve(rootDir, "dist/index.js");
  if (!existsSync(distIndex)) {
    console.error(
      "Error: dist/index.js not found. Run `pnpm build` before doccheck."
    );
    process.exit(1);
  }

  const startTime = performance.now();

  // 1. Extract
  const blocks = await extractBlocks(options.file, rootDir);
  const uniqueFiles = new Set(blocks.map((b) => b.filePath)).size;

  if (blocks.length === 0) {
    console.log("No code blocks found.");
    process.exit(0);
  }

  // 2. Transform
  const transforms = blocks.map(transformBlock);

  // 3. Execute
  const results = await executeBlocks(
    transforms,
    rootDir,
    options.concurrency,
    options.timeout,
    !options.noCleanup
  );

  // 4. Report
  const report = buildReport(results, blocks.length, uniqueFiles);
  const durationMs = Math.round(performance.now() - startTime);
  const output = formatReport(report, options, rootDir, durationMs);

  console.log(output);

  if (hasFailures(report)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("doccheck failed:", err);
  process.exit(1);
});
