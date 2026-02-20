import { describe, it, expect } from "vitest";
import {
  extractSignaturesFromSource,
  countArguments,
  validateCallSites,
} from "./signatures.ts";
import type { CodeBlock, FactorySignature } from "./types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlock(source: string, overrides: Partial<CodeBlock> = {}): CodeBlock {
  return {
    source,
    filePath: "docs/test.md",
    lineNumber: 1,
    blockIndex: 0,
    language: "typescript",
    hasImport: true,
    ignored: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// extractSignaturesFromSource
// ---------------------------------------------------------------------------

describe("extractSignaturesFromSource", () => {
  it("extracts a simple factory with required params", () => {
    const source = `export function createPanel(world: World, entity: Entity, config: PanelConfig = {}): PanelWidget {`;
    const sigs = extractSignaturesFromSource(source, "src/widgets/panel/factory.ts");
    expect(sigs).toHaveLength(1);
    expect(sigs[0]).toEqual({
      name: "createPanel",
      paramCount: 3,
      requiredParams: 2,
      paramTypes: ["World", "Entity", "PanelConfig"],
      sourceFile: "src/widgets/panel/factory.ts",
    });
  });

  it("extracts a factory with all required params", () => {
    const source = `export function createScreenEntity(world: World, config: ScreenConfig): Entity {`;
    const sigs = extractSignaturesFromSource(source, "src/core/entities/factories.ts");
    expect(sigs).toHaveLength(1);
    expect(sigs[0]).toEqual({
      name: "createScreenEntity",
      paramCount: 2,
      requiredParams: 2,
      paramTypes: ["World", "ScreenConfig"],
      sourceFile: "src/core/entities/factories.ts",
    });
  });

  it("extracts a factory with all defaulted params", () => {
    const source = `export function createBoxEntity(world: World, config: BoxConfig = {}): Entity {`;
    const sigs = extractSignaturesFromSource(source, "src/core/entities/factories.ts");
    expect(sigs).toHaveLength(1);
    expect(sigs[0].requiredParams).toBe(1);
    expect(sigs[0].paramCount).toBe(2);
  });

  it("extracts multiple factories from one file", () => {
    const source = `
export function createBoxEntity(world: World, config: BoxConfig = {}): Entity { }
export function createTextEntity(world: World, config: TextConfig = {}): Entity { }
export function createButtonEntity(world: World, config: ButtonConfig = {}): Entity { }
`;
    const sigs = extractSignaturesFromSource(source, "factories.ts");
    expect(sigs).toHaveLength(3);
    expect(sigs.map((s) => s.name)).toEqual([
      "createBoxEntity",
      "createTextEntity",
      "createButtonEntity",
    ]);
  });

  it("handles multi-line parameter lists", () => {
    const source = `export function createFlexContainer(
  world: World,
  entity: Entity,
  config: FlexContainerConfig = {},
): FlexContainerWidget {`;
    const sigs = extractSignaturesFromSource(source, "factory.ts");
    expect(sigs).toHaveLength(1);
    expect(sigs[0].paramCount).toBe(3);
    expect(sigs[0].requiredParams).toBe(2);
  });

  it("handles generic type parameters", () => {
    const source = `export function createWidget(world: World, config: Config<Partial<Options>> = {}): Widget {`;
    const sigs = extractSignaturesFromSource(source, "factory.ts");
    expect(sigs).toHaveLength(1);
    expect(sigs[0].paramCount).toBe(2);
    expect(sigs[0].paramTypes[1]).toBe("Config<Partial<Options>>");
  });

  it("ignores non-create functions", () => {
    const source = `
export function isPanel(world: World, eid: Entity): boolean { }
export function getPanelTitle(world: World, eid: Entity): string { }
`;
    const sigs = extractSignaturesFromSource(source, "factory.ts");
    expect(sigs).toHaveLength(0);
  });

  it("ignores non-exported create functions", () => {
    const source = `function createInternalHelper(x: number): void { }`;
    const sigs = extractSignaturesFromSource(source, "factory.ts");
    expect(sigs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// countArguments
// ---------------------------------------------------------------------------

describe("countArguments", () => {
  it("counts simple arguments", () => {
    const src = "world, entity, config)";
    expect(countArguments(src, 0)).toBe(3);
  });

  it("counts a single argument", () => {
    const src = "world)";
    expect(countArguments(src, 0)).toBe(1);
  });

  it("returns 0 for empty arguments", () => {
    const src = ")";
    expect(countArguments(src, 0)).toBe(0);
  });

  it("returns 0 for whitespace-only arguments", () => {
    const src = "   )";
    expect(countArguments(src, 0)).toBe(0);
  });

  it("handles nested parentheses", () => {
    const src = "world, addEntity(world), { x: 1 })";
    expect(countArguments(src, 0)).toBe(3);
  });

  it("handles nested brackets and braces", () => {
    const src = "world, [1, 2, 3], { a: 1, b: 2 })";
    expect(countArguments(src, 0)).toBe(3);
  });

  it("handles deeply nested calls", () => {
    const src = "world, createEntity(addComponent(world, pos)), config)";
    expect(countArguments(src, 0)).toBe(3);
  });

  it("handles string literals with commas", () => {
    const src = `world, "hello, world", config)`;
    expect(countArguments(src, 0)).toBe(3);
  });

  it("handles single-quoted strings with commas", () => {
    const src = `world, 'a, b', config)`;
    expect(countArguments(src, 0)).toBe(3);
  });

  it("handles template literals with commas", () => {
    const src = "world, `${x}, ${y}`, config)";
    expect(countArguments(src, 0)).toBe(3);
  });

  it("handles escaped characters in strings", () => {
    const src = `world, "it\\'s, fine", config)`;
    expect(countArguments(src, 0)).toBe(3);
  });

  it("skips line comments", () => {
    const src = "world, // this is a comment\nentity, config)";
    expect(countArguments(src, 0)).toBe(3);
  });

  it("skips block comments", () => {
    const src = "world, /* a, b, c */ entity)";
    expect(countArguments(src, 0)).toBe(2);
  });

  it("handles trailing commas", () => {
    const src = "world, entity, config, )";
    expect(countArguments(src, 0)).toBe(3);
  });

  it("returns -1 for spread arguments", () => {
    const src = "world, ...args)";
    expect(countArguments(src, 0)).toBe(-1);
  });

  it("handles multi-line arguments", () => {
    const src = `world,\n  entity,\n  {\n    title: 'Hello',\n    width: 40\n  }\n)`;
    expect(countArguments(src, 0)).toBe(3);
  });

  it("handles object with nested objects", () => {
    const src = "world, entity, { style: { border: { fg: 0xff } } })";
    expect(countArguments(src, 0)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// validateCallSites
// ---------------------------------------------------------------------------

describe("validateCallSites", () => {
  const signatures: FactorySignature[] = [
    {
      name: "createPanel",
      paramCount: 3,
      requiredParams: 2,
      paramTypes: ["World", "Entity", "PanelConfig"],
      sourceFile: "src/widgets/panel/factory.ts",
    },
    {
      name: "createBoxEntity",
      paramCount: 2,
      requiredParams: 1,
      paramTypes: ["World", "BoxConfig"],
      sourceFile: "src/core/entities/factories.ts",
    },
    {
      name: "createMessage",
      paramCount: 2,
      requiredParams: 1,
      paramTypes: ["World", "MessageConfig"],
      sourceFile: "src/widgets/message/factory.ts",
    },
  ];

  it("reports too few arguments", () => {
    const block = makeBlock(`const panel = createPanel(world);`);
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].functionName).toBe("createPanel");
    expect(warnings[0].actualArgs).toBe(1);
    expect(warnings[0].expectedArgsMin).toBe(2);
    expect(warnings[0].expectedArgsMax).toBe(3);
  });

  it("reports too many arguments", () => {
    const block = makeBlock(
      `const panel = createPanel(world, eid, config, extra);`
    );
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].actualArgs).toBe(4);
  });

  it("accepts correct argument count (exact)", () => {
    const block = makeBlock(`const panel = createPanel(world, eid, {});`);
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(0);
  });

  it("accepts correct argument count (minimum required)", () => {
    const block = makeBlock(`const panel = createPanel(world, eid);`);
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(0);
  });

  it("accepts factory with only required arg", () => {
    const block = makeBlock(`const box = createBoxEntity(world);`);
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(0);
  });

  it("accepts factory with both required and optional args", () => {
    const block = makeBlock(`const box = createBoxEntity(world, { width: 10 });`);
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(0);
  });

  it("reports wrong arity for 2-arg factory called with 3", () => {
    const block = makeBlock(
      `const box = createBoxEntity(world, entity, {});`
    );
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].functionName).toBe("createBoxEntity");
    expect(warnings[0].actualArgs).toBe(3);
  });

  it("skips spread calls", () => {
    const block = makeBlock(`const panel = createPanel(...args);`);
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(0);
  });

  it("skips function declarations", () => {
    const block = makeBlock(
      `function createPanel(world: World, entity: Entity): void { }`
    );
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(0);
  });

  it("finds multiple call sites in one block", () => {
    const block = makeBlock(
      `const p = createPanel(world);\nconst b = createBoxEntity(world, eid, extra);`
    );
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(2);
  });

  it("scans ignored blocks", () => {
    const block = makeBlock(`const panel = createPanel(world);`, {
      ignored: true,
    });
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(1);
  });

  it("handles nested call as argument", () => {
    const block = makeBlock(
      `const panel = createPanel(world, addEntity(world), {});`
    );
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(0);
  });

  it("reports correct line number within block", () => {
    const block = makeBlock(
      `// line 1\n// line 2\nconst panel = createPanel(world);`
    );
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].lineInBlock).toBe(3);
  });

  it("returns no warnings for empty signatures", () => {
    const block = makeBlock(`const panel = createPanel(world);`);
    const warnings = validateCallSites([block], []);
    expect(warnings).toHaveLength(0);
  });

  it("returns no warnings for empty blocks", () => {
    const warnings = validateCallSites([], signatures);
    expect(warnings).toHaveLength(0);
  });

  it("handles calls with no args to a factory requiring at least 1", () => {
    const block = makeBlock(`const box = createBoxEntity();`);
    const warnings = validateCallSites([block], signatures);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].actualArgs).toBe(0);
    expect(warnings[0].expectedArgsMin).toBe(1);
  });
});
