#!/usr/bin/env tsx
/**
 * Update Performance Baseline Script
 *
 * Runs CI benchmarks and stores the results as the new baseline
 * for performance regression detection.
 *
 * Usage:
 *   tsx scripts/update-baseline.ts [results-file]
 *
 * @example
 * ```bash
 * # Run benchmarks and update baseline
 * pnpm bench:update-baseline
 * ```
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

interface BenchmarkResult {
	name: string;
	hz: number; // operations per second
	mean: number; // nanoseconds per operation
	variance: number;
}

interface BaselineData {
	timestamp: string;
	benchmarks: Record<string, BenchmarkResult>;
}

const BASELINE_DIR = path.join(process.cwd(), 'benchmarks', 'baselines');
const BASELINE_FILE = path.join(BASELINE_DIR, 'ci.json');

/**
 * Ensures the baseline directory exists.
 */
function ensureBaselineDir(): void {
	if (!fs.existsSync(BASELINE_DIR)) {
		fs.mkdirSync(BASELINE_DIR, { recursive: true });
	}
}

/**
 * Runs CI benchmarks and returns the results file path.
 */
function runBenchmarks(): string {
	console.log('🏃 Running CI benchmarks...\n');

	const resultsPath = 'benchmark-results-temp.json';

	try {
		execSync(`pnpm vitest bench benchmarks/ci.bench.ts --run --outputFile=${resultsPath}`, {
			stdio: 'inherit',
		});
	} catch (error) {
		console.error('\n❌ Benchmarks failed to run');
		process.exit(1);
	}

	return resultsPath;
}

/**
 * Parses Vitest benchmark results file.
 *
 * @param resultsPath - Path to benchmark results JSON file
 * @returns Record of benchmark results keyed by name
 */
function parseResults(resultsPath: string): Record<string, BenchmarkResult> {
	if (!fs.existsSync(resultsPath)) {
		throw new Error(`Results file not found: ${resultsPath}`);
	}

	const content = fs.readFileSync(resultsPath, 'utf-8');
	const data = JSON.parse(content);

	const benchmarks: Record<string, BenchmarkResult> = {};

	// Parse Vitest bench output format
	if (data.testResults) {
		for (const testFile of data.testResults) {
			for (const result of testFile.assertionResults || []) {
				if (result.title && result.duration !== undefined) {
					// Convert duration (ms) to hz (ops/sec) and mean (ns/op)
					const durationSec = result.duration / 1000;
					const hz = 1 / durationSec;
					const mean = durationSec * 1_000_000_000;

					benchmarks[result.title] = {
						name: result.title,
						hz,
						mean,
						variance: 0, // Not available in basic Vitest output
					};
				}
			}
		}
	}

	return benchmarks;
}

/**
 * Saves baseline data to file.
 */
function saveBaseline(benchmarks: Record<string, BenchmarkResult>): void {
	const baseline: BaselineData = {
		timestamp: new Date().toISOString(),
		benchmarks,
	};

	fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));

	console.log(`\n✅ Baseline saved to: ${BASELINE_FILE}`);
	console.log(`   Timestamp: ${baseline.timestamp}`);
	console.log(`   Benchmarks: ${Object.keys(benchmarks).length}`);
}

/**
 * Main function
 */
function main(): void {
	const args = process.argv.slice(2);
	let resultsPath: string;
	let cleanupResults = false;

	ensureBaselineDir();

	if (args.length > 0) {
		// Use provided results file
		resultsPath = args[0] as string;
		console.log(`📁 Using results file: ${resultsPath}\n`);
	} else {
		// Run benchmarks
		resultsPath = runBenchmarks();
		cleanupResults = true;
	}

	// Parse results
	console.log('\n📊 Parsing benchmark results...');
	const benchmarks = parseResults(resultsPath);
	console.log(`✅ Parsed ${Object.keys(benchmarks).length} benchmarks`);

	// Save baseline
	saveBaseline(benchmarks);

	// Cleanup temp results file
	if (cleanupResults && fs.existsSync(resultsPath)) {
		fs.unlinkSync(resultsPath);
	}

	console.log('\n✨ Baseline updated successfully!\n');
}

main();
