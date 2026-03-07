#!/usr/bin/env tsx
/**
 * Audit API documentation files for import path consistency.
 * 
 * Checks:
 * - Core exports should use 'blecsd/core'
 * - Component exports should use 'blecsd/components'
 * - System exports should use 'blecsd/systems'
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DOCS_ROOT = join(process.cwd(), 'docs/api');

interface ImportIssue {
  file: string;
  line: number;
  issue: string;
  suggestion: string;
}

const issues: ImportIssue[] = [];

function checkFile(filePath: string, category: 'core' | 'components' | 'systems') {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const expectedImport = `'blecsd/${category}'`;
  
  lines.forEach((line, idx) => {
    // Check for import statements
    if (line.includes('import') && line.includes('from')) {
      // Check for incorrect patterns
      if (category === 'core' && line.includes("from 'blecsd'") && !line.includes("from 'blecsd/")) {
        issues.push({
          file: filePath,
          line: idx + 1,
          issue: 'Using root blecsd import for core exports',
          suggestion: `Use ${expectedImport} instead`
        });
      }
      
      if (category === 'components' && line.includes('blecsd') && !line.includes(expectedImport)) {
        // Could be a core import, that's ok
        if (!line.includes("'blecsd/core'") && !line.includes("'blecsd/terminal'")) {
          issues.push({
            file: filePath,
            line: idx + 1,
            issue: 'Potential incorrect import path for components',
            suggestion: `Verify this should use ${expectedImport}`
          });
        }
      }
      
      if (category === 'systems' && line.includes('blecsd') && !line.includes(expectedImport)) {
        // Could be a core import, that's ok
        if (!line.includes("'blecsd/core'") && !line.includes("'blecsd/components'") && !line.includes("'blecsd/terminal'")) {
          issues.push({
            file: filePath,
            line: idx + 1,
            issue: 'Potential incorrect import path for systems',
            suggestion: `Verify this should use ${expectedImport}`
          });
        }
      }
    }
  });
}

function auditCategory(category: 'core' | 'components' | 'systems') {
  const dir = join(DOCS_ROOT, category);
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  
  console.log(`\nAuditing ${category} (${files.length} files)...`);
  
  files.forEach(file => {
    checkFile(join(dir, file), category);
  });
}

console.log('=== API Documentation Import Audit ===\n');

auditCategory('core');
auditCategory('components');
auditCategory('systems');

if (issues.length === 0) {
  console.log('\n✓ All imports look good!');
} else {
  console.log(`\n⚠ Found ${issues.length} potential issues:\n`);
  issues.forEach(issue => {
    console.log(`${issue.file}:${issue.line}`);
    console.log(`  Issue: ${issue.issue}`);
    console.log(`  Suggestion: ${issue.suggestion}\n`);
  });
}

process.exit(issues.length > 0 ? 1 : 0);
