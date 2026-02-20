import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { resolve, relative } from "node:path";
import type { CodeBlock, FactorySignature, SignatureWarning } from "./types.ts";

// ---------------------------------------------------------------------------
// Signature extraction
// ---------------------------------------------------------------------------

const FACTORY_DECL =
  /export\s+function\s+(create\w+)\s*\(/g;

/**
 * Reads forward from `startIndex` in `source` to find the matching `)` for
 * the opening `(` that ends at `startIndex`. Returns the substring between
 * `(` and `)` (exclusive).
 */
function readParamList(source: string, startIndex: number): string {
  let depth = 1;
  let i = startIndex;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth > 0) i++;
  }
  return source.slice(startIndex, i);
}

interface ParsedParam {
  readonly name: string;
  readonly type: string;
  readonly hasDefault: boolean;
}

/**
 * Splits a raw param-list string into individual parameters, handling nested
 * generics, objects, and arrays so commas inside them are not treated as
 * separators.
 */
function splitParams(raw: string): string[] {
  const params: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of raw) {
    if (ch === "(" || ch === "<" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === ">" || ch === "]" || ch === "}") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      params.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  const last = current.trim();
  if (last) params.push(last);
  return params;
}

function parseParam(raw: string): ParsedParam {
  const hasDefault = raw.includes("=");
  // Strip default value
  const withoutDefault = raw.split("=")[0].trim();
  // Split on first `:` to get name and type
  const colonIndex = withoutDefault.indexOf(":");
  if (colonIndex === -1) {
    return { name: withoutDefault, type: "unknown", hasDefault };
  }
  const name = withoutDefault.slice(0, colonIndex).trim();
  const type = withoutDefault.slice(colonIndex + 1).trim();
  return { name, type, hasDefault };
}

export async function extractFactorySignatures(
  rootDir: string
): Promise<FactorySignature[]> {
  const patterns = [
    resolve(rootDir, "src/widgets/**/factory.ts"),
    resolve(rootDir, "src/core/entities/factories.ts"),
  ];

  const filePaths: string[] = [];
  for (const pattern of patterns) {
    for await (const entry of glob(pattern)) {
      // Skip test files
      if (entry.endsWith(".test.ts")) continue;
      filePaths.push(entry);
    }
  }

  filePaths.sort();

  const signaturesByName = new Map<string, FactorySignature>();

  for (const filePath of filePaths) {
    const source = await readFile(filePath, "utf-8");
    const sigs = extractSignaturesFromSource(source, filePath);

    for (const sig of sigs) {
      const existing = signaturesByName.get(sig.name);
      // Prefer decomposed factory.ts files (in widget dirs) over flat factories.ts
      if (!existing || filePath.includes("/widgets/")) {
        signaturesByName.set(sig.name, sig);
      }
    }
  }

  return [...signaturesByName.values()];
}

/**
 * Extracts factory signatures from a single source string. Exported for
 * testing.
 */
export function extractSignaturesFromSource(
  source: string,
  filePath: string
): FactorySignature[] {
  const results: FactorySignature[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex in case the regex was used before
  FACTORY_DECL.lastIndex = 0;

  while ((match = FACTORY_DECL.exec(source)) !== null) {
    const name = match[1];
    const afterParen = match.index + match[0].length; // position right after `(`
    const paramListRaw = readParamList(source, afterParen);
    const paramStrings = splitParams(paramListRaw);

    const parsed = paramStrings.map(parseParam);
    const paramCount = parsed.length;
    const requiredParams = parsed.filter((p) => !p.hasDefault).length;
    const paramTypes = parsed.map((p) => p.type);

    results.push({
      name,
      paramCount,
      requiredParams,
      paramTypes,
      sourceFile: filePath,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Call-site validation
// ---------------------------------------------------------------------------

/**
 * Counts top-level arguments at a call site starting right after the opening
 * `(`. Returns -1 if a spread operator is detected (unknowable arity).
 * Returns 0 for an empty argument list `()`.
 */
export function countArguments(source: string, startIndex: number): number {
  let depth = 1;
  let commas = 0;
  let hasContentInSegment = false; // content in current segment (between commas or start/end)
  let hasAnyContent = false;
  let i = startIndex;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let templateDepth = 0;

  while (i < source.length && depth > 0) {
    const ch = source[i];
    const next = i + 1 < source.length ? source[i + 1] : "";

    // Handle string literals
    if (inSingleQuote) {
      if (ch === "\\" ) { i += 2; continue; }
      if (ch === "'") inSingleQuote = false;
      i++;
      continue;
    }
    if (inDoubleQuote) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === '"') inDoubleQuote = false;
      i++;
      continue;
    }
    if (inTemplate) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === "$" && next === "{") {
        templateDepth++;
        i += 2;
        continue;
      }
      if (ch === "}" && templateDepth > 0) {
        templateDepth--;
        i++;
        continue;
      }
      if (ch === "`" && templateDepth === 0) {
        inTemplate = false;
      }
      i++;
      continue;
    }

    // Enter string literals
    if (ch === "'") { inSingleQuote = true; hasContentInSegment = true; hasAnyContent = true; i++; continue; }
    if (ch === '"') { inDoubleQuote = true; hasContentInSegment = true; hasAnyContent = true; i++; continue; }
    if (ch === "`") { inTemplate = true; templateDepth = 0; hasContentInSegment = true; hasAnyContent = true; i++; continue; }

    // Skip line comments
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    // Skip block comments
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < source.length - 1) {
        if (source[i] === "*" && source[i + 1] === "/") {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    // Detect spread operator at depth 1
    if (
      depth === 1 &&
      ch === "." &&
      i + 2 < source.length &&
      source[i + 1] === "." &&
      source[i + 2] === "."
    ) {
      return -1;
    }

    // Track depth
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      hasContentInSegment = true;
      hasAnyContent = true;
      i++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) break;
      i++;
      continue;
    }

    // Count commas at depth 1
    if (ch === "," && depth === 1) {
      commas++;
      hasContentInSegment = false; // reset for next segment
      i++;
      continue;
    }

    // Track non-whitespace content in current segment
    if (ch !== " " && ch !== "\t" && ch !== "\n" && ch !== "\r") {
      hasContentInSegment = true;
      hasAnyContent = true;
    }

    i++;
  }

  if (!hasAnyContent) return 0;

  // If there's a trailing comma (commas > 0 but no content after the last comma),
  // the arg count is just `commas` (not commas + 1).
  if (commas > 0 && !hasContentInSegment) return commas;
  return commas + 1;
}

/**
 * Validates factory call sites in code blocks against known signatures.
 */
export function validateCallSites(
  blocks: readonly CodeBlock[],
  signatures: readonly FactorySignature[]
): SignatureWarning[] {
  if (signatures.length === 0) return [];

  // Build a lookup for fast matching
  const sigMap = new Map<string, FactorySignature>();
  for (const sig of signatures) {
    sigMap.set(sig.name, sig);
  }

  // Build a regex that matches any known factory name followed by `(`
  const names = signatures.map((s) => s.name);
  const namePattern = new RegExp(
    `\\b(${names.join("|")})\\s*\\(`,
    "g"
  );

  const warnings: SignatureWarning[] = [];

  for (const block of blocks) {
    const source = block.source;
    namePattern.lastIndex = 0;

    let callMatch: RegExpExecArray | null;
    while ((callMatch = namePattern.exec(source)) !== null) {
      const fnName = callMatch[1];
      const sig = sigMap.get(fnName);
      if (!sig) continue;

      // Position right after the `(`
      const afterParen = callMatch.index + callMatch[0].length;

      // Skip if this is a function declaration/definition rather than a call
      // (i.e., preceded by `function `)
      const before = source.slice(
        Math.max(0, callMatch.index - 20),
        callMatch.index
      );
      if (/function\s+$/.test(before)) continue;

      const argCount = countArguments(source, afterParen);

      // Skip spread calls (unknowable)
      if (argCount === -1) continue;

      // Check arity against [requiredParams, paramCount] range
      if (argCount < sig.requiredParams || argCount > sig.paramCount) {
        // Find the line number within the block
        const textBefore = source.slice(0, callMatch.index);
        const lineInBlock = textBefore.split("\n").length;

        // Extract the call site text (the line containing the call)
        const blockLines = source.split("\n");
        const callSite = blockLines[lineInBlock - 1]?.trim() ?? "";

        warnings.push({
          block,
          functionName: fnName,
          expectedArgsMin: sig.requiredParams,
          expectedArgsMax: sig.paramCount,
          actualArgs: argCount,
          callSite,
          lineInBlock,
        });
      }
    }
  }

  return warnings;
}
