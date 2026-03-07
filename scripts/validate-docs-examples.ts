#!/usr/bin/env tsx
/**
 * Extract and validate code examples from API documentation.
 * 
 * Validates that:
 * - Import paths are correct
 * - Function signatures match actual exports
 * - TypeScript types resolve correctly
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const DOCS_ROOT = join(process.cwd(), 'docs/api');
const TEMP_DIR = join(process.cwd(), '.tmp-docs-validation');

interface CodeExample {
  file: string;
  code: string;
  line: number;
}

const examples: CodeExample[] = [];

function extractCodeBlocks(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let inCodeBlock = false;
  let codeBlock: string[] = [];
  let blockStart = 0;
  
  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```typescript') || line.trim().startsWith('```ts')) {
      inCodeBlock = true;
      codeBlock = [];
      blockStart = idx + 1;
    } else if (line.trim() === '```' && inCodeBlock) {
      inCodeBlock = false;
      if (codeBlock.length > 0) {
        const code = codeBlock.join('\n');
        // Skip examples that are just type declarations or interfaces
        if (!code.includes('interface ') && !code.includes('type ') && !code.includes('enum ')) {
          examples.push({
            file: filePath,
            code,
            line: blockStart,
          });
        }
      }
    } else if (inCodeBlock) {
      codeBlock.push(line);
    }
  });
}

function walkDocs(dir: string) {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDocs(fullPath);
    } else if (entry.name.endsWith('.md')) {
      extractCodeBlocks(fullPath);
    }
  }
}

function validateExample(example: CodeExample, index: number): boolean {
  const testFile = join(TEMP_DIR, `test-${index}.ts`);
  
  // Wrap in a function to allow any code
  const wrapped = `
import { createWorld } from '../src/core/world';
${example.code}
`;
  
  try {
    writeFileSync(testFile, wrapped);
    
    // Run TypeScript compiler
    execSync(`npx tsc --noEmit --skipLibCheck ${testFile}`, {
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    
    return true;
  } catch (error: any) {
    console.error(`\n❌ ${example.file}:${example.line}`);
    console.error(error.stdout?.toString() || error.message);
    return false;
  }
}

console.log('=== Extracting code examples from docs ===\n');

walkDocs(DOCS_ROOT);

console.log(`Found ${examples.length} code examples to validate\n`);

// Create temp dir
try {
  execSync(`mkdir -p ${TEMP_DIR}`, { stdio: 'ignore' });
} catch {}

console.log('Validating examples...\n');

let passed = 0;
let failed = 0;

// Validate first 10 examples as a smoke test
const samplesToTest = examples.slice(0, 10);

for (let i = 0; i < samplesToTest.length; i++) {
  const example = samplesToTest[i];
  process.stdout.write(`[${i + 1}/${samplesToTest.length}] ${example.file}:${example.line}... `);
  
  if (validateExample(example, i)) {
    console.log('✓');
    passed++;
  } else {
    failed++;
  }
}

// Cleanup
try {
  execSync(`rm -rf ${TEMP_DIR}`, { stdio: 'ignore' });
} catch {}

console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${samplesToTest.length} (sampled from ${examples.length})`);

process.exit(failed > 0 ? 1 : 0);
