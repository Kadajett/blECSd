#!/usr/bin/env tsx
/**
 * Performance Regression Detection Script
 *
 * Compares benchmark results against stored baselines and fails
 * if any benchmark regresses beyond the configured threshold.
 *
 * Usage:
 *   tsx scripts/check-perf-regression.ts <results-file> [threshold]
 *
 * @example
 * ```bash
 * # Run benchmarks and check for regressions
 * pnpm bench:ci --run --outputFile=benchmark-results.json
 * tsx scripts/check-perf-regression.ts benchmark-results.json 20
 * ```
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

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

interface RegressionResult {
	name: string;
	baseline: BenchmarkResult;
	current: BenchmarkResult;
	percentChange: number;
	isRegression: boolean;
}

const BASELINE_DIR = path.join(process.cwd(), 'benchmarks', 'baselines');
const BASELINE_FILE = path.join(BASELINE_DIR, 'ci.json');

/**
 * Loads baseline benchmark data from the baseline file.
 *
 * @returns Baseline data or null if no baseline exists
 */
function loadBaseline(): BaselineData | null {
	if (!fs.existsSync(BASELINE_FILE)) {
		return null;
	}

	const content = fs.readFileSync(BASELINE_FILE, 'utf-8');
	return JSON.parse(content) as BaselineData;
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
 * Compares current results against baseline and detects regressions.
 *
 * @param baseline - Baseline benchmark data
 * @param current - Current benchmark results
 * @param threshold - Regression threshold percentage (default: 20)
 * @returns Array of regression results
 */
function detectRegressions(
	baseline: BaselineData,
	current: Record<string, BenchmarkResult>,
	threshold: number,
): RegressionResult[] {
	const results: RegressionResult[] = [];

	for (const [name, currentBench] of Object.entries(current)) {
		const baselineBench = baseline.benchmarks[name];

		if (!baselineBench) {
			console.warn(`⚠️  No baseline found for: ${name}`);
			continue;
		}

		// Calculate percentage change (negative = regression / slower)
		const percentChange = ((currentBench.hz - baselineBench.hz) / baselineBench.hz) * 100;

		// Regression is when performance drops (negative change) beyond threshold
		const isRegression = percentChange < -threshold;

		results.push({
			name,
			baseline: baselineBench,
			current: currentBench,
			percentChange,
			isRegression,
		});
	}

	return results;
}

/**
 * Formats a number with appropriate units (K, M, etc.).
 */
function formatNumber(num: number): string {
	if (num >= 1_000_000) {
		return `${(num / 1_000_000).toFixed(2)}M`;
	}
	if (num >= 1_000) {
		return `${(num / 1_000).toFixed(2)}K`;
	}
	return num.toFixed(2);
}

/**
 * Prints regression results to console.
 */
function printResults(results: RegressionResult[], threshold: number): void {
	console.log('\n📊 Performance Comparison Results\n');
	console.log('─'.repeat(80));

	let hasRegressions = false;

	for (const result of results) {
		const icon = result.isRegression ? '❌' : result.percentChange > 5 ? '✨' : '✅';
		const changeStr =
			result.percentChange > 0
				? `+${result.percentChange.toFixed(2)}%`
				: `${result.percentChange.toFixed(2)}%`;

		console.log(`${icon} ${result.name}`);
		console.log(
			`   Baseline: ${formatNumber(result.baseline.hz)} ops/sec | Current: ${formatNumber(result.current.hz)} ops/sec`,
		);
		console.log(`   Change: ${changeStr}`);

		if (result.isRegression) {
			hasRegressions = true;
			console.log(`   ⚠️  REGRESSION DETECTED (threshold: ${threshold}%)`);
		}

		console.log();
	}

	console.log('─'.repeat(80));

	if (hasRegressions) {
		console.error('\n❌ Performance regressions detected!\n');
		process.exit(1);
	}

	console.log('\n✅ No performance regressions detected!\n');
}

/**
 * Main function
 */
function main(): void {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error('Usage: tsx scripts/check-perf-regression.ts <results-file> [threshold]');
		console.error('');
		console.error('Example:');
		console.error('  tsx scripts/check-perf-regression.ts benchmark-results.json 20');
		process.exit(1);
	}

	const resultsPath = args[0] as string;
	const threshold = args[1] ? Number.parseFloat(args[1]) : 20;

	console.log(`📁 Results file: ${resultsPath}`);
	console.log(`📏 Threshold: ${threshold}%\n`);

	// Load baseline
	const baseline = loadBaseline();
	if (!baseline) {
		console.error('❌ No baseline found!');
		console.error(`   Expected baseline at: ${BASELINE_FILE}`);
		console.error('   Run "pnpm bench:update-baseline" to create a baseline.\n');
		process.exit(1);
	}

	console.log(`✅ Loaded baseline from: ${baseline.timestamp}\n`);

	// Parse current results
	const currentResults = parseResults(resultsPath);
	console.log(`✅ Parsed ${Object.keys(currentResults).length} benchmark results\n`);

	// Detect regressions
	const regressionResults = detectRegressions(baseline, currentResults, threshold);

	// Print results
	printResults(regressionResults, threshold);
}

main();
