#!/usr/bin/env tsx
/**
 * Benchmark Report Generator
 *
 * Runs vitest bench, parses output into JSON, and maintains historical results.
 * Outputs to docs/performance/benchmark-data/ for the HTML dashboard.
 *
 * Usage: pnpm bench:report
 *        pnpm bench:report -- src/benchmarks/entity.bench.ts  (single file)
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ── Config ───────────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname, '..');
const DATA_DIR = join(ROOT, 'docs', 'performance', 'benchmark-data');
const HISTORY_FILE = join(DATA_DIR, 'history.json');
const LATEST_FILE = join(DATA_DIR, 'latest.json');
const MAX_HISTORY = 50; // keep last N runs

// ── Types ────────────────────────────────────────────────────────────────────

interface BenchResult {
	name: string;
	group: string;
	file: string;
	hz: number;
	mean: number; // ms per op
	min: number;
	max: number;
	p75: number;
	p99: number;
	p995: number;
	p999: number;
	rme: number; // relative margin of error %
	samples: number;
}

interface BenchRun {
	timestamp: string;
	commit: string;
	branch: string;
	results: BenchResult[];
}

interface HistoryData {
	runs: BenchRun[];
}

// ── Parse vitest bench output ────────────────────────────────────────────────

function parseVitestBenchOutput(output: string): BenchResult[] {
	const results: BenchResult[] = [];
	let currentFile = '';
	let currentGroup = '';

	for (const line of output.split('\n')) {
		// Match file + group header: " ✓ src/benchmarks/entity.bench.ts > Entity Creation > single entity creation"
		const headerMatch = line.match(
			/[✓✗]\s+(src\/benchmarks\/\S+\.bench\.ts)\s*>\s*(.+?)(?:\s+\d+ms)?$/
		);
		if (headerMatch) {
			currentFile = headerMatch[1];
			currentGroup = headerMatch[2].trim();
			continue;
		}

		// Match result row: "   · minimal entity (Position only)  352,360.99  0.0009  ..."
		const resultMatch = line.match(
			/^\s+·\s+(.+?)\s{2,}([\d,.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+[±]?([\d.]+)%\s+([\d,]+)/
		);
		if (resultMatch && currentFile) {
			results.push({
				name: resultMatch[1].trim(),
				group: currentGroup,
				file: currentFile,
				hz: parseFloat(resultMatch[2].replace(/,/g, '')),
				min: parseFloat(resultMatch[3]),
				max: parseFloat(resultMatch[4]),
				mean: parseFloat(resultMatch[5]),
				p75: parseFloat(resultMatch[6]),
				p99: parseFloat(resultMatch[7]),
				p995: parseFloat(resultMatch[8]),
				p999: parseFloat(resultMatch[9]),
				rme: parseFloat(resultMatch[10]),
				samples: parseInt(resultMatch[11].replace(/,/g, ''), 10),
			});
		}
	}

	return results;
}

// ── Git info ─────────────────────────────────────────────────────────────────

function getGitInfo(): { commit: string; branch: string } {
	try {
		const commit = execSync('git rev-parse --short HEAD', {
			cwd: ROOT,
			encoding: 'utf-8',
		}).trim();
		const branch = execSync('git rev-parse --abbrev-ref HEAD', {
			cwd: ROOT,
			encoding: 'utf-8',
		}).trim();
		return { commit, branch };
	} catch {
		return { commit: 'unknown', branch: 'unknown' };
	}
}

// ── Historical comparison ────────────────────────────────────────────────────

interface Comparison {
	name: string;
	group: string;
	current: number;
	previous: number | null;
	changePercent: number | null;
	status: 'faster' | 'slower' | 'stable' | 'new';
}

function compareWithPrevious(
	current: BenchResult[],
	history: HistoryData
): Comparison[] {
	const previousRun = history.runs[history.runs.length - 1];
	if (!previousRun) {
		return current.map((r) => ({
			name: r.name,
			group: r.group,
			current: r.hz,
			previous: null,
			changePercent: null,
			status: 'new' as const,
		}));
	}

	const prevMap = new Map(
		previousRun.results.map((r) => [`${r.group}::${r.name}`, r.hz])
	);

	return current.map((r) => {
		const key = `${r.group}::${r.name}`;
		const prev = prevMap.get(key) ?? null;
		let changePercent: number | null = null;
		let status: Comparison['status'] = 'new';

		if (prev !== null) {
			changePercent = ((r.hz - prev) / prev) * 100;
			if (changePercent > 5) status = 'faster';
			else if (changePercent < -5) status = 'slower';
			else status = 'stable';
		}

		return {
			name: r.name,
			group: r.group,
			current: r.hz,
			previous: prev,
			changePercent,
			status,
		};
	});
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
	const extraArgs = process.argv.slice(2).join(' ');
	console.log('🏃 Running benchmarks...\n');

	// Run vitest bench and capture output
	let output: string;
	try {
		const cmd = `npx vitest bench --run ${extraArgs}`;
		output = execSync(cmd, {
			cwd: ROOT,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
			timeout: 600_000, // 10 min
			env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
		});
	} catch (err: unknown) {
		// vitest may exit non-zero but still produce output
		const execErr = err as { stdout?: string; stderr?: string };
		output = execErr.stdout ?? '';
		if (!output) {
			console.error('❌ Benchmark run failed:', execErr.stderr);
			process.exit(1);
		}
	}

	const results = parseVitestBenchOutput(output);
	if (results.length === 0) {
		console.error('❌ No benchmark results parsed. Raw output:\n', output.slice(0, 2000));
		process.exit(1);
	}

	console.log(`✅ Parsed ${results.length} benchmark results\n`);

	// Ensure data dir exists
	mkdirSync(DATA_DIR, { recursive: true });

	// Load history
	let history: HistoryData = { runs: [] };
	if (existsSync(HISTORY_FILE)) {
		try {
			history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
		} catch {
			// corrupted, start fresh
		}
	}

	// Compare with previous
	const comparison = compareWithPrevious(results, history);

	// Print comparison
	console.log('📊 Results:\n');
	const grouped = Map.groupBy(comparison, (c) => c.group);
	for (const [group, items] of grouped) {
		console.log(`  ${group}:`);
		for (const item of items!) {
			const arrow =
				item.status === 'faster'
					? '🟢 ↑'
					: item.status === 'slower'
						? '🔴 ↓'
						: item.status === 'stable'
							? '⚪ ='
							: '🆕  ';
			const change =
				item.changePercent !== null
					? ` (${item.changePercent > 0 ? '+' : ''}${item.changePercent.toFixed(1)}%)`
					: '';
			console.log(
				`    ${arrow} ${item.name}: ${formatHz(item.current)} ops/s${change}`
			);
		}
	}

	// Build run entry
	const git = getGitInfo();
	const run: BenchRun = {
		timestamp: new Date().toISOString(),
		commit: git.commit,
		branch: git.branch,
		results,
	};

	// Update history (keep last N)
	history.runs.push(run);
	if (history.runs.length > MAX_HISTORY) {
		history.runs = history.runs.slice(-MAX_HISTORY);
	}

	// Write files
	writeFileSync(LATEST_FILE, JSON.stringify(run, null, 2));
	writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

	console.log(`\n💾 Results saved to:`);
	console.log(`   ${LATEST_FILE}`);
	console.log(`   ${HISTORY_FILE}`);
	console.log(`\n📈 Open docs/performance/index.html to view the dashboard`);

	// Check for regressions
	const regressions = comparison.filter((c) => c.status === 'slower');
	if (regressions.length > 0) {
		console.log(`\n⚠️  ${regressions.length} regression(s) detected:`);
		for (const r of regressions) {
			console.log(
				`   🔴 ${r.group} > ${r.name}: ${r.changePercent!.toFixed(1)}%`
			);
		}
	}
}

function formatHz(hz: number): string {
	if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)}M`;
	if (hz >= 1_000) return `${(hz / 1_000).toFixed(2)}K`;
	return hz.toFixed(2);
}

main();
