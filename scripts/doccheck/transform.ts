import type { CodeBlock } from "./types.ts";

export interface TransformResult {
  readonly block: CodeBlock;
  readonly transformed: string | null; // null = skip
  readonly skipReason: string;
}

const RELATIVE_IMPORT = /from\s+['"]\.\.?\//;
const VITEST_IMPORT = /from\s+['"]vitest['"]/;

const IMPORT_START = /^\s*import\s/;
const IMPORT_FROM = /from\s+['"]/;
const IMPORT_SIDE_EFFECT = /^\s*import\s+['"]/;
const DECLARATION = /(?:const|let|var|function|class)\s+(\w+)/g;

const STDIN_PREAMBLE = `
// doccheck: neutralize stdin to prevent hangs
Object.defineProperty(process.stdin, 'setRawMode', { value: () => process.stdin, writable: true, configurable: true });
process.stdin.resume = () => process.stdin;
process.stdin.on = (() => process.stdin);
process.stdin.pause();
// doccheck: stub test globals for doc examples that show test patterns
function describe(_name, fn) { try { fn(); } catch(_e) {} }
function it(_name, fn) { try { fn(); } catch(_e) {} }
const test = it;
function beforeEach(_fn) {}
function afterEach(_fn) {}
function beforeAll(_fn) {}
function afterAll(_fn) {}
function expect(_val) { return { toBe() {}, toEqual() {}, toBeNull() {}, toBeTruthy() {}, toBeFalsy() {}, toContain() {}, toThrow() {}, not: { toBe() {}, toEqual() {}, toBeNull() {}, toBeTruthy() {}, toBeFalsy() {} } }; }
`.trim();

const EXIT_SUFFIX = `
// doccheck: force exit to prevent event loop hangs
setTimeout(() => process.exit(0), 100);
`.trim();

// ---------------------------------------------------------------------------
// Per-block transform (legacy, still used for individual block execution)
// ---------------------------------------------------------------------------

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

  const { imports, code } = splitImportsAndCode(block.source);
  const stubLines = buildStubs(block.source);

  const transformed = [
    ...imports,
    "",
    STDIN_PREAMBLE,
    ...(stubLines.length > 0 ? ["", ...stubLines] : []),
    ...code,
    "",
    EXIT_SUFFIX,
  ].join("\n");

  return { block, transformed, skipReason: "" };
}

// ---------------------------------------------------------------------------
// Per-page transform (combines all blocks from a single doc page)
// ---------------------------------------------------------------------------

/**
 * Groups blocks by file path and creates one TransformResult per page.
 * Non-ignored blocks are combined into a single executable script.
 * Each block's code is wrapped in `{ }` when the page has conflicting
 * declarations, or concatenated directly for sequential pages.
 */
export function transformPages(
  allBlocks: readonly CodeBlock[]
): TransformResult[] {
  // Group by file path
  const byFile = new Map<string, CodeBlock[]>();
  for (const block of allBlocks) {
    const existing = byFile.get(block.filePath) ?? [];
    existing.push(block);
    byFile.set(block.filePath, existing);
  }

  const results: TransformResult[] = [];

  for (const [filePath, blocks] of byFile) {
    const result = transformSinglePage(filePath, blocks);
    results.push(result);
  }

  return results;
}

function transformSinglePage(
  _filePath: string,
  blocks: CodeBlock[]
): TransformResult {
  // Use first block as the representative for reporting
  const representative = blocks[0];

  // Include ALL blocks (even ignored ones) for per-page combination.
  // The ignore flag was designed for per-block execution; per-page
  // combination gives these blocks the import context they need.
  const candidates = blocks;

  // Collect imports and code from each block, skipping blocks with
  // relative/vitest imports entirely
  const allImports: string[] = [];
  const codeSegments: string[][] = [];
  const importSet = new Set<string>();

  for (const block of candidates) {
    const { imports, code } = splitImportsAndCode(block.source);

    // Hoist any import statements that ended up in the code section.
    // This happens when docs have imports scattered among code lines.
    const { hoisted, remaining } = hoistImportsFromCode(code);

    // Check if this block's imports are usable
    const topImportText = imports.join("\n");
    const hasRelativeOrVitest =
      RELATIVE_IMPORT.test(topImportText) ||
      VITEST_IMPORT.test(topImportText);

    if (!hasRelativeOrVitest) {
      // Deduplicate imports by complete statement (not per-line).
      // Per-line dedup breaks multi-line imports that share wrapper
      // lines like `import {` and `} from 'blecsd';`.
      for (const stmt of groupImportStatements(imports)) {
        const key = stmt.map((l) => l.trim()).join("\n");
        if (!importSet.has(key)) {
          importSet.add(key);
          allImports.push(...stmt);
        }
      }
    }

    // Also add hoisted imports (check each individually for relative/vitest)
    for (const stmt of hoisted) {
      const stmtText = stmt.join("\n");
      if (RELATIVE_IMPORT.test(stmtText) || VITEST_IMPORT.test(stmtText)) {
        continue;
      }
      const key = stmt.map((l) => l.trim()).join("\n");
      if (!importSet.has(key)) {
        importSet.add(key);
        allImports.push(...stmt);
      }
    }

    const trimmed = remaining.join("\n").trim();
    if (trimmed) codeSegments.push(remaining);
  }

  // Skip if no imports available at all
  if (allImports.length === 0) {
    return {
      block: representative,
      transformed: null,
      skipReason: "no valid imports on page",
    };
  }

  // Skip if no code to run
  if (codeSegments.length === 0) {
    return {
      block: representative,
      transformed: null,
      skipReason: "no code on page",
    };
  }

  // Sanitize segments: fix type-only declarations, bare returns, etc.
  const sanitizedSegments = codeSegments.map(sanitizeSegment);

  // Detect conflicting declarations or TDZ hazards across segments.
  // TDZ hazard: variable used in segment N but declared in segment M > N.
  const needsScoping =
    hasConflictingDeclarations(sanitizedSegments) ||
    hasTDZHazard(sanitizedSegments);

  // Build combined code sections
  const combinedCode: string[] = [];
  let anyScopeNeedsStubs = false;
  for (let i = 0; i < sanitizedSegments.length; i++) {
    const segment = sanitizedSegments[i];
    if (needsScoping) {
      combinedCode.push(`{ // block ${i + 1}`);
      // Inject per-scope stubs for world/eid/entity when needed
      const scopeSource = segment.join("\n");
      const scopeStubs = buildScopeStubs(scopeSource);
      if (scopeStubs.length > 0) {
        anyScopeNeedsStubs = true;
        combinedCode.push(...scopeStubs);
      }
      combinedCode.push(...segment);
      combinedCode.push("}");
    } else {
      if (i > 0) combinedCode.push("");
      combinedCode.push(...segment);
    }
  }

  // Build stubs: when scoped, add helper imports at top level for scope stubs;
  // when not scoped, add full stubs as before
  const combinedSource = combinedCode.join("\n");
  // Include all imports in the source so buildStubs can check what's imported
  const fullSource = allImports.join("\n") + "\n" + combinedSource;
  const stubLines: string[] = [];
  if (needsScoping) {
    if (anyScopeNeedsStubs) {
      // Add helper function imports for use by per-scope stubs
      stubLines.push(
        "import { createWorld as __doccheck_cw, addEntity as __doccheck_ae } from 'blecsd';",
        "import { addEntity as __doccheck_ae2 } from 'blecsd';"
      );
    }
    // Also add stubs for scoped pages
    stubLines.push(...buildStubs(fullSource));
  } else {
    stubLines.push(...buildStubs(fullSource));
  }

  const transformed = [
    ...allImports,
    "",
    STDIN_PREAMBLE,
    ...(stubLines.length > 0 ? ["", ...stubLines] : []),
    "",
    ...combinedCode,
    "",
    EXIT_SUFFIX,
  ].join("\n");

  return { block: representative, transformed, skipReason: "" };
}

// ---------------------------------------------------------------------------
// Segment sanitization
// ---------------------------------------------------------------------------

/**
 * Checks if a line is an assignment or arrow function expression.
 * Distinguishes `foo(x) => ...` (arrow, keep) from
 * `foo(x: (y) => void): Type` (method sig with arrow type in params, comment out).
 * An arrow function has `=>` OUTSIDE the outermost parens.
 */
function isAssignmentOrArrow(line: string): boolean {
  // Quick check: contains = but not inside a type annotation
  const trimmed = line.trim();
  // If there's an `=` before the first `(`, it's an assignment like `const x = ...`
  const parenIdx = trimmed.indexOf("(");
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx >= 0 && (parenIdx < 0 || eqIdx < parenIdx)) {
    return true;
  }
  // Check for `=>` after closing all parens
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    // If we're at depth 0 and see `=>`, it's an actual arrow
    if (
      depth === 0 &&
      ch === "=" &&
      trimmed[i + 1] === ">" &&
      i > 0
    ) {
      return true;
    }
  }
  return false;
}

/** Pattern for uninitialized const/let: starts with `const/let NAME:` */
const UNINITIALIZED_CONST_START = /^(\s*)(const|let)\s+(\w+)\s*:/;
/** Assignment operator (not `=>` or `==` or `===`) */
const HAS_ASSIGNMENT = /=(?![>=])/;
/** Pattern for bare return statements at the top level */
const BARE_RETURN = /^\s*return\b/;
/** Pattern for interface/type/enum declarations */
const TYPE_DECL_START =
  /^(\s*)(?:export\s+)?(?:interface|type|enum|abstract\s+class)\s+\w+/;
/** Pattern for function signature without body: `function foo(...): Type;` */
const FUNC_SIG_ONLY = /^(\s*)(?:export\s+)?(?:declare\s+)?function\s+\w+[^{]*;\s*$/;
/** Pattern for bare export keyword at start of line */
const EXPORT_PREFIX = /^(\s*)export\s+(const|let|var|function|async\s+function)\b/;
/**
 * Pattern for bare method signatures (no `function` keyword):
 * `registerPhase(name: string): string;`
 * `log(...args: unknown[]): LogWidget`
 * Must have typed params (`: Type`) or typed return (after `): Type`).
 */
const BARE_METHOD_SIG =
  /^\s*(?:readonly\s+)?\w+\s*\(.*\)\s*:\s*\w/;
/**
 * Pattern for pseudocode function signatures with TS optional params:
 * `createValidationError(code, message, options?)`
 * The `?` before `)` or `,` is invalid JS, indicating a TS signature.
 */
const OPTIONAL_PARAM_SIG = /^\s*\w+\s*\([^)]*\?\s*[,)]/;
/** Pattern for readonly property declarations: `readonly eid: Entity` */
const READONLY_PROP = /^\s*readonly\s+\w+\s*:/;
/** Pattern for `declare` statements: `declare const x: Type;` */
const DECLARE_STMT = /^\s*declare\s+/;

/**
 * Sanitizes a code segment to make it executable:
 * - Comments out interface/type/enum declarations (multi-line aware)
 * - Converts `const x: Type;` to `const x: any = undefined as any;`
 * - Removes bare `return` statements (invalid at module top level)
 * - Strips `export` keyword from const/function declarations
 * - Converts function-signature-only lines to empty functions
 */
function sanitizeSegment(segment: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < segment.length) {
    const line = segment[i];

    // Comment out multi-line interface/type/enum/abstract class declarations
    if (TYPE_DECL_START.test(line)) {
      // Find the end of the declaration (track braces AND parens for function types)
      let braceDepth = 0;
      let parenDepth = 0;
      let j = i;
      // Handle generic type parameters: type Foo<T extends Bar> = ...
      const isTypeAlias = /^\s*(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=/.test(line);
      // Function-type alias: `type Foo = (params) => RetType;`
      const isFuncType =
        isTypeAlias && /=\s*\(/.test(line) && !line.includes("{");
      while (j < segment.length) {
        const l = segment[j];
        for (const ch of l) {
          if (ch === "{") braceDepth++;
          else if (ch === "}") braceDepth--;
          else if (ch === "(") parenDepth++;
          else if (ch === ")") parenDepth--;
        }
        result.push(`// ${l}`);
        j++;
        if (isFuncType) {
          // For function types, track parens and continue until we see `=>`
          // after parens close, then the return type ends at `;` or end of line
          if (parenDepth === 0 && j > i + 1) {
            // Check if this or subsequent lines have `=>` (the return type arrow)
            const soFar = segment
              .slice(i, j)
              .join("\n");
            if (soFar.includes("=>")) {
              // Continue commenting until line ends with `;` or no continuation
              const nextLine = segment[j]?.trim();
              if (
                nextLine?.startsWith("|") ||
                nextLine?.startsWith("&")
              ) {
                continue;
              }
              break;
            }
            // Haven't seen `=>` yet, keep going
            continue;
          }
          continue;
        }
        if (braceDepth === 0) {
          // For type aliases (no braces), continue while next line starts
          // with `|` or `&` (union/intersection continuation)
          if (isTypeAlias && j < segment.length) {
            const nextLine = segment[j]?.trim();
            if (nextLine?.startsWith("|") || nextLine?.startsWith("&")) {
              continue;
            }
          }
          break;
        }
      }
      i = j;
      continue;
    }

    // Fix function-signature-only lines (no body)
    if (FUNC_SIG_ONLY.test(line)) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Comment out bare method signatures (no `function` keyword):
    // `registerPhase(name: string): string;` etc.
    // Allow `=>` inside params (type annotations) but not top-level arrows.
    if (BARE_METHOD_SIG.test(line) && !isAssignmentOrArrow(line)) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Comment out pseudocode signatures with TS optional params:
    // `createValidationError(code, message, options?)`
    if (OPTIONAL_PARAM_SIG.test(line) && !isAssignmentOrArrow(line)) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Comment out readonly property declarations: `readonly eid: Entity`
    if (READONLY_PROP.test(line)) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Comment out `declare` statements: `declare const x: Type;`
    if (DECLARE_STMT.test(line)) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Fix uninitialized const/let declarations: `const x: Type;` or `const x: Type`
    // Check: starts with `const/let NAME:` and has no assignment `= value`
    const uninitMatch = line.match(UNINITIALIZED_CONST_START);
    if (uninitMatch && !HAS_ASSIGNMENT.test(line)) {
      const [, indent, keyword, name] = uninitMatch;
      result.push(`${indent}${keyword} ${name}: any = undefined as any;`);
      i++;
      continue;
    }

    // Comment out `new Constructor(param: Type)` pseudocode
    if (/^\s*new\s+\w+\s*\(.*:/.test(line) && !HAS_ASSIGNMENT.test(line)) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Comment out object method signatures: `obj.method(param: Type): RetType;`
    if (/^\s*\w+\.\w+\s*\(.*\)\s*:\s*\w/.test(line) && !HAS_ASSIGNMENT.test(line)) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Comment out object method call signatures with typed params: `obj.method(param: Type)`
    if (/^\s*\w+\.\w+\s*\([^)]*:\s*\w/.test(line) && !HAS_ASSIGNMENT.test(line) && line.trim().endsWith(")")) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Strip bare return statements: `return expr` -> `expr`
    // When the result starts with `{`, wrap in `()` to prevent object literal
    // being parsed as a block statement with labels.
    if (BARE_RETURN.test(line)) {
      const stripped = line.replace(/^(\s*)return\s*/, "$1");
      if (stripped.trim() === "" || stripped.trim() === ";") {
        result.push(`// ${line.trim()} // doccheck: removed bare return`);
      } else if (stripped.trim().startsWith("{")) {
        // Multi-line object literal: wrap in parens and track depth
        result.push(stripped.replace(/^(\s*)(\{.*)$/, "$1($2"));
        // Check if single-line
        if (stripped.trim().endsWith(";")) {
          const lastLine = result[result.length - 1];
          result[result.length - 1] = lastLine.replace(/;\s*$/, ");");
        } else {
          // Multi-line: track brace depth to find closing `}`
          let depth = 0;
          for (const ch of stripped) {
            if (ch === "{") depth++;
            else if (ch === "}") depth--;
          }
          i++;
          while (i < segment.length && depth > 0) {
            const nextLine = segment[i];
            for (const ch of nextLine) {
              if (ch === "{") depth++;
              else if (ch === "}") depth--;
            }
            if (depth === 0) {
              // This line closes the object. Add `)` after `}`
              result.push(nextLine.replace(/(\}\s*);?\s*$/, "$1);"));
            } else {
              result.push(nextLine);
            }
            i++;
          }
          continue; // Skip the i++ at end
        }
      } else {
        result.push(stripped);
      }
      i++;
      continue;
    }

    // Comment out orphaned union/intersection continuation lines
    if (/^\s*[|&]\s+/.test(line)) {
      result.push(`// ${line}`);
      i++;
      continue;
    }

    // Comment out lines with `this.` or `!this.` (OOP patterns in examples)
    if (/\bthis\./.test(line)) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Comment out `async methodName(): Promise<Type>` bare method sigs
    if (/^\s*async\s+\w+\s*\(/.test(line) && /\)\s*:\s*\w/.test(line) && !line.includes("{")) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Comment out multi-line function call signatures with typed params:
    // `rectangle.setAttrs(\n  top: number,\n  left: number,\n)` etc.
    if (/^\s*\w+(?:\.\w+)?\s*\(\s*$/.test(line)) {
      // Peek ahead to see if next line has typed params
      const nextLine = segment[i + 1]?.trim() ?? "";
      if (/^\w+\s*[?:]/.test(nextLine)) {
        // This is a multi-line pseudocode signature - comment out until closing `)`
        let depth = 0;
        let j = i;
        while (j < segment.length) {
          const l = segment[j];
          for (const ch of l) {
            if (ch === "(") depth++;
            else if (ch === ")") depth--;
          }
          result.push(`// ${l.trim()}`);
          j++;
          if (depth <= 0) break;
        }
        // Also comment out return type annotation after `)` if on same or next line
        if (j < segment.length && /^\s*\)\s*:\s*\w/.test(segment[j - 1])) {
          // Already commented
        } else if (j < segment.length && /^\s*:\s*\w/.test(segment[j]?.trim() ?? "")) {
          result.push(`// ${segment[j].trim()}`);
          j++;
        }
        i = j;
        continue;
      }
    }

    // Strip `export default` to just the expression
    if (/^\s*export\s+default\b/.test(line)) {
      result.push(line.replace(/^(\s*)export\s+default\s+/, "$1"));
      i++;
      continue;
    }

    // Strip export keyword from declarations
    const exportMatch = line.match(EXPORT_PREFIX);
    if (exportMatch) {
      result.push(line.replace(/^(\s*)export\s+/, "$1"));
      i++;
      continue;
    }

    // Comment out pseudocode spread/rest at top level: `SGR.FG_BRIGHT_BLACK, ...`
    if (/,\s*\.\.\.\s*$/.test(line.trim())) {
      result.push(`// ${line.trim()}`);
      i++;
      continue;
    }

    // Replace pseudocode `[...]` with `[]` and `(...)` with `()`
    if (/\[\s*\.\.\.\s*\]/.test(line)) {
      result.push(line.replace(/\[\s*\.\.\.\s*\]/g, '[]'));
      i++;
      continue;
    }
    if (/\(\s*\.\.\.\s*\)/.test(line)) {
      result.push(line.replace(/\(\s*\.\.\.\s*\)/g, '()'));
      i++;
      continue;
    }

    result.push(line);
    i++;
  }

  return result;
}

/**
 * Checks whether a variable name is imported in an import statement.
 * Handles: `import { name }`, `import { name as x }`, `import name`, `import * as name`.
 */
function isImportedInSource(source: string, name: string): boolean {
  // Named import: import { ..., name, ... } or import { ..., name as alias }
  // We want to check if `name` appears as an imported binding (not an alias target)
  const namedRe = /import\s+\{([^}]+)\}\s+from/g;
  let m: RegExpExecArray | null;
  while ((m = namedRe.exec(source)) !== null) {
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      // Handle `name as alias` (binding is `name`) and plain `name`
      const asIdx = trimmed.indexOf(" as ");
      const binding = asIdx >= 0 ? trimmed.slice(0, asIdx).trim() : trimmed;
      if (binding === name) return true;
    }
  }
  // Default import: import name from ...
  const defaultRe = new RegExp(`import\\s+${name}\\s+from`);
  if (defaultRe.test(source)) return true;
  // Namespace import: import * as name from ...
  const namespaceRe = new RegExp(`import\\s+\\*\\s+as\\s+${name}\\b`);
  if (namespaceRe.test(source)) return true;
  return false;
}

/**
 * Checks whether a variable name is declared anywhere in source,
 * including inside destructuring patterns like `const { x, y }` or `const [a, b]`.
 */
function isDeclaredInSource(source: string, name: string): boolean {
  // Simple declaration: const/let/var/function name
  const simpleRe = new RegExp(`(?:const|let|var|function)\\s+${name}\\b`);
  if (simpleRe.test(source)) return true;
  // Object destructuring: const { ..., name, ... } or { old: name }
  const destructRe = /(?:const|let|var)\s+\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = destructRe.exec(source)) !== null) {
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(":");
      const n = colonIdx >= 0 ? trimmed.slice(colonIdx + 1).trim() : trimmed;
      const eqIdx = n.indexOf("=");
      const finalName = eqIdx >= 0 ? n.slice(0, eqIdx).trim() : n;
      if (finalName === name) return true;
    }
  }
  // Array destructuring: const [name, ...]
  const arrRe = /(?:const|let|var)\s+\[([^\]]+)\]/g;
  while ((m = arrRe.exec(source)) !== null) {
    for (const part of m[1].split(",")) {
      const n = part.trim().replace(/=.*$/, "").trim();
      if (n === name) return true;
    }
  }
  // for-of/for-in: for (const name of ...)
  const forRe = new RegExp(`for\\s*\\((?:const|let|var)\\s+${name}\\b`);
  if (forRe.test(source)) return true;
  return false;
}

/**
 * Builds stub declarations for world/eid/entity/screen/deltaTime within a
 * single scoped block. These are the minimal infrastructure variables that
 * nearly every blecsd doc example needs.
 */
function buildScopeStubs(source: string): string[] {
  const stubs: string[] = [];

  const needsWorld =
    /\bworld\b/.test(source) && !isDeclaredInSource(source, "world");
  const needsEid =
    /\beid\b/.test(source) && !isDeclaredInSource(source, "eid");
  const needsEntity =
    /\bentity\b/.test(source) && !isDeclaredInSource(source, "entity");

  if (needsWorld) {
    stubs.push("const world = __doccheck_cw();");
  }
  if (needsEid) {
    stubs.push(
      needsWorld
        ? "const eid = __doccheck_ae(world);"
        : "const eid = __doccheck_ae(__doccheck_cw());"
    );
  }
  if (needsEntity) {
    if (needsWorld) {
      stubs.push("const entity = __doccheck_ae2(world);");
    } else if (needsEid) {
      stubs.push("const entity = eid;");
    } else {
      stubs.push("const entity = __doccheck_ae2(__doccheck_cw());");
    }
  }

  // Stub for `screen` - very common in widget docs
  // Do NOT stub if screen is already imported (e.g. from 'blecsd/terminal')
  if (
    /\bscreen\b/.test(source) &&
    !isDeclaredInSource(source, "screen") &&
    !isImportedInSource(source, "screen")
  ) {
    if (needsWorld) {
      stubs.push(
        "const screen = __doccheck_ae2(world); // doccheck: screen stub"
      );
    } else {
      stubs.push(
        "const __dcw = __doccheck_cw();",
        "const screen = __doccheck_ae2(__dcw); // doccheck: screen stub"
      );
    }
  }

  // Stub for `deltaTime` - common in system/animation docs
  const DT_USAGE = /\bdeltaTime\b/;
  const DT_DECLARED = /(?:const|let|var)\s+deltaTime\b/;
  if (DT_USAGE.test(source) && !DT_DECLARED.test(source)) {
    stubs.push("const deltaTime = 16; // doccheck: deltaTime stub");
  }

  return stubs;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Hoists import statements from a code section. Docs often have import
 * statements scattered among code lines. When per-page combination wraps
 * code in `{ }` blocks, these become invalid (imports must be top-level).
 * Returns the hoisted import statements and the remaining code lines.
 */
function hoistImportsFromCode(code: string[]): {
  hoisted: string[][];
  remaining: string[];
} {
  const hoisted: string[][] = [];
  const remaining: string[] = [];
  let inImport = false;
  let currentImport: string[] = [];

  for (const line of code) {
    if (!inImport && IMPORT_START.test(line)) {
      inImport = true;
      currentImport = [line];
      if (IMPORT_FROM.test(line) || IMPORT_SIDE_EFFECT.test(line)) {
        hoisted.push(currentImport);
        currentImport = [];
        inImport = false;
      }
    } else if (inImport) {
      currentImport.push(line);
      if (IMPORT_FROM.test(line)) {
        hoisted.push(currentImport);
        currentImport = [];
        inImport = false;
      }
    } else {
      remaining.push(line);
    }
  }

  // If we were mid-import at end of code, treat as code (malformed)
  if (currentImport.length > 0) {
    remaining.push(...currentImport);
  }

  return { hoisted, remaining };
}

/**
 * Groups flat import lines into complete import statements.
 * A multi-line `import { A, B } from 'x';` becomes one statement array.
 * This prevents per-line deduplication from breaking multi-line imports
 * that share wrapper lines (`import {`, `} from 'x';`).
 */
function groupImportStatements(lines: string[]): string[][] {
  const statements: string[][] = [];
  let current: string[] = [];
  let inImport = false;

  for (const line of lines) {
    if (!inImport && IMPORT_START.test(line)) {
      // Flush any accumulated non-import lines as a statement
      if (current.length > 0) {
        statements.push(current);
        current = [];
      }
      inImport = true;
      current.push(line);
      // Check if this is a single-line import
      if (IMPORT_FROM.test(line) || IMPORT_SIDE_EFFECT.test(line)) {
        statements.push(current);
        current = [];
        inImport = false;
      }
    } else if (inImport) {
      current.push(line);
      if (IMPORT_FROM.test(line)) {
        statements.push(current);
        current = [];
        inImport = false;
      }
    }
    // Skip blank/non-import lines
  }

  if (current.length > 0) {
    statements.push(current);
  }

  return statements;
}

/**
 * Splits a block source into import lines and code lines, handling
 * multi-line imports correctly.
 */
function splitImportsAndCode(source: string): {
  imports: string[];
  code: string[];
} {
  const lines = source.split("\n");
  const imports: string[] = [];
  const code: string[] = [];
  let inImport = false;
  let pastImports = false;

  for (const line of lines) {
    if (!pastImports && IMPORT_START.test(line)) {
      inImport = true;
    }

    if (inImport) {
      imports.push(line);
      if (IMPORT_FROM.test(line) || IMPORT_SIDE_EFFECT.test(line)) {
        inImport = false;
      }
    } else if (!pastImports && line.trim() === "" && code.length === 0) {
      // Skip blank lines between imports and code
      imports.push(line);
    } else {
      pastImports = true;
      code.push(line);
    }
  }

  return { imports, code };
}

/**
 * Checks if code segments have declarations that would conflict when
 * concatenated (same variable name declared in multiple segments).
 */
function hasConflictingDeclarations(segments: string[][]): boolean {
  const seen = new Set<string>();
  for (const segment of segments) {
    const text = segment.join("\n");
    const names = new Set<string>();

    // Match simple declarations: const foo, let bar, function baz
    const simpleRe = /(?:const|let|var|function|class)\s+(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = simpleRe.exec(text)) !== null) {
      names.add(match[1]);
    }

    // Match destructured declarations: const { x, y } = ..., const [a, b] = ...
    const destructRe = /(?:const|let|var)\s+\{([^}]+)\}/g;
    while ((match = destructRe.exec(text)) !== null) {
      const inner = match[1];
      // Extract identifiers from destructuring (handles renaming: old: newName)
      for (const part of inner.split(",")) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        // Handle `oldName: newName` (use newName) and `name` (use name)
        const colonIdx = trimmed.indexOf(":");
        const name = colonIdx >= 0 ? trimmed.slice(colonIdx + 1).trim() : trimmed;
        // Strip default values: `name = default`
        const eqIdx = name.indexOf("=");
        const finalName = eqIdx >= 0 ? name.slice(0, eqIdx).trim() : name;
        if (/^\w+$/.test(finalName)) {
          names.add(finalName);
        }
      }
    }

    // Match array destructuring: const [a, b] = ...
    const arrayDestructRe = /(?:const|let|var)\s+\[([^\]]+)\]/g;
    while ((match = arrayDestructRe.exec(text)) !== null) {
      for (const part of match[1].split(",")) {
        const name = part.trim().replace(/=.*$/, "").trim();
        if (/^\w+$/.test(name)) {
          names.add(name);
        }
      }
    }

    for (const name of names) {
      if (seen.has(name)) return true;
      seen.add(name);
    }
  }
  return false;
}

/**
 * Detects Temporal Dead Zone hazards: a variable is used in segment N
 * but first declared in a later segment M > N. Without scoping, this
 * causes a TDZ runtime error because `const` declarations are hoisted
 * but not initialized.
 */
function hasTDZHazard(segments: string[][]): boolean {
  // Collect declarations per segment (index of first declaration)
  const declaredIn = new Map<string, number>();
  for (let i = 0; i < segments.length; i++) {
    const text = segments[i].join("\n");
    const re = /(?:const|let|var|function)\s+(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (!declaredIn.has(match[1])) {
        declaredIn.set(match[1], i);
      }
    }
  }

  // Check if any segment uses a variable that's declared in a later segment
  // Only check common variable names to avoid false positives on keywords
  const commonVars = new Set([
    "world",
    "eid",
    "entity",
    "screen",
    "box",
    "panel",
    "table",
    "text",
    "list",
    "input",
    "button",
    "menu",
    "scheduler",
    "loop",
  ]);
  for (let i = 0; i < segments.length; i++) {
    const text = segments[i].join("\n");
    for (const name of commonVars) {
      const usage = new RegExp(`\\b${name}\\b`);
      if (usage.test(text)) {
        const declIdx = declaredIn.get(name);
        if (declIdx !== undefined && declIdx > i) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Builds stub declarations for world/eid/entity/screen/deltaTime when
 * the combined source uses them without declaring or importing them.
 * These are the minimal infrastructure variables that nearly every
 * blecsd doc example needs.
 */
function buildStubs(source: string): string[] {
  const stubLines: string[] = [];

  const WORLD_USAGE = /\bworld\b/;
  const WORLD_DECLARED = /(?:const|let|var)\s+world\b/;
  const WORLD_IMPORT = /import\s[^;]*\bworld\b/;
  const EID_USAGE = /\beid\b/;
  const EID_DECLARED = /(?:const|let|var)\s+eid\b/;
  const EID_IMPORT = /import\s[^;]*\beid\b/;
  const ENTITY_USAGE = /\bentity\b/;
  const ENTITY_DECLARED = /(?:const|let|var)\s+entity\b/;
  const ENTITY_IMPORT = /import\s[^;]*\bentity\b/;

  const needsWorld =
    WORLD_USAGE.test(source) &&
    !WORLD_DECLARED.test(source) &&
    !WORLD_IMPORT.test(source);

  const needsEid =
    EID_USAGE.test(source) &&
    !EID_DECLARED.test(source) &&
    !EID_IMPORT.test(source);

  const needsEntity =
    ENTITY_USAGE.test(source) &&
    !ENTITY_DECLARED.test(source) &&
    !ENTITY_IMPORT.test(source);

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

  // Stub for `screen` - very common in widget docs
  // Do NOT stub if screen is already imported (e.g. from 'blecsd/terminal')
  if (
    /\bscreen\b/.test(source) &&
    !isDeclaredInSource(source, "screen") &&
    !isImportedInSource(source, "screen")
  ) {
    if (needsWorld) {
      stubLines.push(
        "import { addEntity as __doccheck_aes } from 'blecsd';",
        "const screen = __doccheck_aes(world); // doccheck: screen stub"
      );
    } else {
      stubLines.push(
        "import { createWorld as __doccheck_cws, addEntity as __doccheck_aes } from 'blecsd';",
        "const __dcws = __doccheck_cws();",
        "const screen = __doccheck_aes(__dcws); // doccheck: screen stub"
      );
    }
  }

  // Stub for `deltaTime` - common in system/animation docs
  const DT_USAGE = /\bdeltaTime\b/;
  const DT_DECLARED = /(?:const|let|var)\s+deltaTime\b/;
  if (DT_USAGE.test(source) && !DT_DECLARED.test(source)) {
    stubLines.push("const deltaTime = 16; // doccheck: deltaTime stub");
  }

  return stubLines;
}
