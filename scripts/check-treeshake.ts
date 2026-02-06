#!/usr/bin/env tsx
/**
 * Verifies that tree-shaking works for minimal imports.
 * Bundles a tiny import with esbuild and checks the output size.
 */

import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const MAX_CORE_BUNDLE_KB = 50;

const tmpDir = mkdtempSync(join(tmpdir(), 'blecsd-treeshake-'));

const testFile = join(tmpDir, 'test.ts');
writeFileSync(
	testFile,
	`import { createWorld, addEntity } from '${join(process.cwd(), 'dist', 'core', 'index.js')}';\nconsole.log(createWorld, addEntity);\n`,
);

const outFile = join(tmpDir, 'out.js');

try {
	execSync(
		`npx esbuild ${testFile} --bundle --format=esm --outfile=${outFile} --platform=node --external:bitecs --external:zod`,
		{ stdio: 'pipe' },
	);

	const stats = readFileSync(outFile);
	const sizeKB = Math.round(stats.length / 1024);

	console.log(`Core-only bundle size: ${sizeKB} KB (limit: ${MAX_CORE_BUNDLE_KB} KB)`);

	if (sizeKB > MAX_CORE_BUNDLE_KB) {
		console.error(`FAIL: Core bundle exceeds ${MAX_CORE_BUNDLE_KB} KB threshold`);
		process.exitCode = 1;
	} else {
		console.log('PASS: Tree-shaking working correctly');
	}
} catch (err) {
	console.error('Failed to run esbuild bundle check:', err);
	process.exitCode = 1;
} finally {
	rmSync(tmpDir, { recursive: true, force: true });
}
