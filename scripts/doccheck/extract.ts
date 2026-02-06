import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { resolve } from "node:path";
import type { CodeBlock } from "./types.ts";

const FENCE_OPEN = /^```(?:typescript|ts)\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const IMPORT_LINE = /^\s*import\s/;
const IGNORE_COMMENT = "<!-- blecsd-doccheck:ignore -->";

export async function extractBlocks(
  fileGlob: string,
  rootDir: string
): Promise<readonly CodeBlock[]> {
  const pattern = resolve(rootDir, fileGlob);
  const filePaths: string[] = [];

  for await (const entry of glob(pattern)) {
    filePaths.push(entry);
  }

  filePaths.sort();

  const allBlocks: CodeBlock[] = [];

  for (const filePath of filePaths) {
    const content = await readFile(filePath, "utf-8");
    const blocks = parseMarkdown(content, filePath);
    allBlocks.push(...blocks);
  }

  return allBlocks;
}

function parseMarkdown(content: string, filePath: string): CodeBlock[] {
  const lines = content.split("\n");
  const blocks: CodeBlock[] = [];
  let blockIndex = 0;

  let inBlock = false;
  let blockStart = 0;
  let language = "";
  let blockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inBlock && FENCE_OPEN.test(line)) {
      inBlock = true;
      blockStart = i + 1; // 1-indexed line number
      language = line.includes("typescript") ? "typescript" : "ts";
      blockLines = [];
      continue;
    }

    if (inBlock && FENCE_CLOSE.test(line)) {
      inBlock = false;
      const source = blockLines.join("\n");
      const hasImport = blockLines.some((l) => IMPORT_LINE.test(l));
      const ignored = isIgnored(lines, blockStart - 1);

      blocks.push({
        source,
        filePath,
        lineNumber: blockStart + 1, // line after the fence
        blockIndex,
        language,
        hasImport,
        ignored,
      });
      blockIndex++;
      continue;
    }

    if (inBlock) {
      blockLines.push(line);
    }
  }

  return blocks;
}

function isIgnored(lines: string[], fenceLineIndex: number): boolean {
  // Check the line immediately before the fence
  const prev1 = fenceLineIndex - 1;
  if (prev1 >= 0 && lines[prev1].trim() === IGNORE_COMMENT) {
    return true;
  }

  // Check two lines up (allowing a blank line between comment and fence)
  const prev2 = fenceLineIndex - 2;
  if (
    prev2 >= 0 &&
    lines[prev2].trim() === IGNORE_COMMENT &&
    lines[prev1].trim() === ""
  ) {
    return true;
  }

  return false;
}
