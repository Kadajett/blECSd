import type { CodeBlock } from "./types.ts";

export interface TransformResult {
  readonly block: CodeBlock;
  readonly transformed: string | null; // null = skip
  readonly skipReason: string;
}

const RELATIVE_IMPORT = /from\s+['"]\.\.?\//;
const VITEST_IMPORT = /from\s+['"]vitest['"]/;

const WORLD_USAGE = /\bworld\b/;
const WORLD_DECLARED = /(?:const|let|var)\s+world\b/;
const WORLD_IMPORT = /import\s.*\bworld\b/;

const EID_USAGE = /\beid\b/;
const EID_DECLARED = /(?:const|let|var)\s+eid\b/;
const EID_IMPORT = /import\s.*\beid\b/;

const ENTITY_USAGE = /\bentity\b/;
const ENTITY_DECLARED = /(?:const|let|var)\s+entity\b/;
const ENTITY_IMPORT = /import\s.*\bentity\b/;

const STDIN_PREAMBLE = `
// doccheck: neutralize stdin to prevent hangs
Object.defineProperty(process.stdin, 'setRawMode', { value: () => process.stdin, writable: true, configurable: true });
process.stdin.resume = () => process.stdin;
process.stdin.on = (() => process.stdin);
process.stdin.pause();
`.trim();

const EXIT_SUFFIX = `
// doccheck: force exit to prevent event loop hangs
setTimeout(() => process.exit(0), 100);
`.trim();

export function transformBlock(block: CodeBlock): TransformResult {
  if (!block.hasImport) {
    return { block, transformed: null, skipReason: "no imports" };
  }

  if (block.ignored) {
    return { block, transformed: null, skipReason: "ignored" };
  }

  if (RELATIVE_IMPORT.test(block.source)) {
    return { block, transformed: null, skipReason: "relative import" };
  }

  if (VITEST_IMPORT.test(block.source)) {
    return { block, transformed: null, skipReason: "vitest import" };
  }

  const lines = block.source.split("\n");

  // Find the last import line to insert preamble and stubs after it.
  // Handle multi-line imports: track when we enter an import statement
  // and don't close it until we see the `from` clause.
  let lastImportIndex = -1;
  let inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*import\s/.test(line)) {
      inImport = true;
    }
    if (inImport) {
      lastImportIndex = i;
      // Single-line import or line with `from` closes the import
      if (/from\s+['"]/.test(line) || /^\s*import\s+['"]/.test(line)) {
        inImport = false;
      }
    }
  }

  const stubLines: string[] = [];

  const needsWorld =
    WORLD_USAGE.test(block.source) &&
    !WORLD_DECLARED.test(block.source) &&
    !WORLD_IMPORT.test(block.source);

  const needsEid =
    EID_USAGE.test(block.source) &&
    !EID_DECLARED.test(block.source) &&
    !EID_IMPORT.test(block.source);

  const needsEntity =
    ENTITY_USAGE.test(block.source) &&
    !ENTITY_DECLARED.test(block.source) &&
    !ENTITY_IMPORT.test(block.source);

  if (needsWorld) {
    stubLines.push(
      "import { createWorld as __doccheck_cw } from 'blecsd';",
      "const world = __doccheck_cw();"
    );
  }

  if (needsEid) {
    if (!needsWorld) {
      stubLines.push(
        "import { createWorld as __doccheck_cw, addEntity as __doccheck_ae } from 'blecsd';",
        "const __doccheck_w = __doccheck_cw();",
        "const eid = __doccheck_ae(__doccheck_w);"
      );
    } else {
      stubLines.push(
        "import { addEntity as __doccheck_ae } from 'blecsd';",
        "const eid = __doccheck_ae(world);"
      );
    }
  }

  if (needsEntity) {
    if (!needsWorld && !needsEid) {
      stubLines.push(
        "import { createWorld as __doccheck_cw2, addEntity as __doccheck_ae2 } from 'blecsd';",
        "const __doccheck_w2 = __doccheck_cw2();",
        "const entity = __doccheck_ae2(__doccheck_w2);"
      );
    } else if (needsWorld) {
      stubLines.push(
        "import { addEntity as __doccheck_ae2 } from 'blecsd';",
        "const entity = __doccheck_ae2(world);"
      );
    } else {
      stubLines.push("const entity = eid;");
    }
  }

  // Build the transformed source:
  // 1. Original imports
  // 2. Preamble (stdin neutralization) - must be after imports for ESM
  // 3. Stubs (after preamble)
  // 4. Rest of the code
  // 5. Exit suffix
  const imports = lines.slice(0, lastImportIndex + 1);
  const rest = lines.slice(lastImportIndex + 1);

  const transformed = [
    ...imports,
    "",
    STDIN_PREAMBLE,
    ...(stubLines.length > 0 ? ["", ...stubLines] : []),
    ...rest,
    "",
    EXIT_SUFFIX,
  ].join("\n");

  return { block, transformed, skipReason: "" };
}
