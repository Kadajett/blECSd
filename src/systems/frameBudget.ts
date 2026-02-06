/**
 * Frame budget manager and profiling.
 *
 * Measures per-system timing, tracks rolling statistics, and enforces
 * configurable frame time budgets per phase. Optional on-screen debug overlay.
 *
 * @module systems/frameBudget
 */

import type { System, World } from '../core/types';
import { LoopPhase } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the frame budget manager.
 */
export interface FrameBudgetConfig {
	/** Target frame time in ms (default: 16.67 = 60fps) */
	readonly targetFrameMs: number;
	/** Per-phase budget overrides in ms (phase -> budget) */
	readonly phaseBudgets: Readonly<Partial<Record<LoopPhase, number>>>;
	/** Number of frames to keep in rolling stats (default: 120) */
	readonly rollingWindowSize: number;
	/** Whether to emit warnings on budget overruns (default: true) */
	readonly warnOnOverrun: boolean;
}

/**
 * Per-system timing record.
 */
export interface SystemTiming {
	readonly name: string;
	readonly lastMs: number;
	readonly avgMs: number;
	readonly minMs: number;
	readonly maxMs: number;
	readonly p50Ms: number;
	readonly p95Ms: number;
	readonly p99Ms: number;
	readonly count: number;
}

/**
 * Frame-level statistics.
 */
export interface FrameStats {
	readonly frameTimeMs: number;
	readonly avgFrameMs: number;
	readonly p50FrameMs: number;
	readonly p95FrameMs: number;
	readonly p99FrameMs: number;
	readonly fps: number;
	readonly avgFps: number;
	readonly totalFrames: number;
	readonly budgetOverruns: number;
	readonly systemTimings: readonly SystemTiming[];
	readonly phaseTimings: Readonly<Record<string, number>>;
}

/**
 * Budget alert emitted when a phase exceeds its budget.
 */
export interface BudgetAlert {
	readonly phase: LoopPhase;
	readonly budgetMs: number;
	readonly actualMs: number;
	readonly frame: number;
}

/**
 * Frame budget manager state.
 */
export interface FrameBudgetManager {
	readonly config: FrameBudgetConfig;
	readonly stats: FrameStats;
	readonly alerts: readonly BudgetAlert[];
}

// =============================================================================
// INTERNAL STATE
// =============================================================================

interface MutableTimingSamples {
	samples: number[];
	idx: number;
	count: number;
	total: number;
	min: number;
	max: number;
}

interface ManagerState {
	config: FrameBudgetConfig;
	systemSamples: Map<string, MutableTimingSamples>;
	phaseTotals: Map<LoopPhase, number>;
	frameSamples: MutableTimingSamples;
	totalFrames: number;
	budgetOverruns: number;
	alerts: BudgetAlert[];
	onAlert: ((alert: BudgetAlert) => void) | null;
}

const DEFAULT_CONFIG: FrameBudgetConfig = {
	targetFrameMs: 16.67,
	phaseBudgets: {},
	rollingWindowSize: 120,
	warnOnOverrun: true,
};

let managerState: ManagerState | null = null;

// =============================================================================
// HELPERS
// =============================================================================

function createSamples(windowSize: number): MutableTimingSamples {
	return {
		samples: Array.from({ length: windowSize }, () => 0),
		idx: 0,
		count: 0,
		total: 0,
		min: Number.POSITIVE_INFINITY,
		max: 0,
	};
}

function addSample(s: MutableTimingSamples, value: number): void {
	const old = s.samples[s.idx % s.samples.length] ?? 0;
	s.samples[s.idx % s.samples.length] = value;
	s.idx++;
	if (s.count < s.samples.length) {
		s.count++;
		s.total += value;
	} else {
		s.total += value - old;
	}
	if (value < s.min) s.min = value;
	if (value > s.max) s.max = value;
}

function getPercentile(s: MutableTimingSamples, percentile: number): number {
	if (s.count === 0) return 0;
	const sorted = s.samples.slice(0, s.count).sort((a, b) => a - b);
	const idx = Math.min(Math.floor(sorted.length * percentile), sorted.length - 1);
	return sorted[idx] ?? 0;
}

function getAvg(s: MutableTimingSamples): number {
	return s.count > 0 ? s.total / s.count : 0;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Creates and activates the frame budget manager.
 *
 * @param config - Optional configuration overrides
 * @returns The frame budget manager
 *
 * @example
 * ```typescript
 * import { createFrameBudgetManager } from 'blecsd';
 *
 * const manager = createFrameBudgetManager({ targetFrameMs: 16.67 });
 * ```
 */
export function createFrameBudgetManager(config?: Partial<FrameBudgetConfig>): FrameBudgetManager {
	const merged: FrameBudgetConfig = { ...DEFAULT_CONFIG, ...config };
	managerState = {
		config: merged,
		systemSamples: new Map(),
		phaseTotals: new Map(),
		frameSamples: createSamples(merged.rollingWindowSize),
		totalFrames: 0,
		budgetOverruns: 0,
		alerts: [],
		onAlert: null,
	};
	return getFrameBudgetStats();
}

/**
 * Records the execution time of a named system.
 *
 * @param name - The system name
 * @param timeMs - Execution time in milliseconds
 */
export function recordFrameBudgetSystemTime(name: string, timeMs: number): void {
	if (!managerState) return;
	let samples = managerState.systemSamples.get(name);
	if (!samples) {
		samples = createSamples(managerState.config.rollingWindowSize);
		managerState.systemSamples.set(name, samples);
	}
	addSample(samples, timeMs);
}

/**
 * Records phase completion time and checks budget.
 *
 * @param phase - The loop phase
 * @param timeMs - Phase execution time in milliseconds
 */
export function recordPhaseTime(phase: LoopPhase, timeMs: number): void {
	if (!managerState) return;
	managerState.phaseTotals.set(phase, timeMs);
	const budget = managerState.config.phaseBudgets[phase];
	if (budget !== undefined && timeMs > budget) {
		const alert: BudgetAlert = {
			phase,
			budgetMs: budget,
			actualMs: timeMs,
			frame: managerState.totalFrames,
		};
		managerState.alerts.push(alert);
		if (managerState.alerts.length > 100) managerState.alerts.shift();
		managerState.budgetOverruns++;
		if (managerState.onAlert) managerState.onAlert(alert);
	}
}

/**
 * Records a complete frame time.
 *
 * @param frameTimeMs - Total frame time in milliseconds
 */
export function recordFrameTime(frameTimeMs: number): void {
	if (!managerState) return;
	addSample(managerState.frameSamples, frameTimeMs);
	managerState.totalFrames++;
}

/**
 * Wraps a system with automatic timing.
 *
 * @param name - The system name for profiling
 * @param system - The system function to wrap
 * @returns A wrapped system that records its execution time
 *
 * @example
 * ```typescript
 * import { profiledSystem } from 'blecsd';
 *
 * const timedMovement = profiledSystem('movement', movementSystem);
 * scheduler.registerSystem(LoopPhase.UPDATE, timedMovement);
 * ```
 */
export function profiledSystem(name: string, system: System): System {
	return (world: World): World => {
		const start = performance.now();
		const result = system(world);
		recordFrameBudgetSystemTime(name, performance.now() - start);
		return result;
	};
}

/**
 * Gets current frame budget statistics.
 *
 * @returns The current stats snapshot
 */
export function getFrameBudgetStats(): FrameBudgetManager {
	if (!managerState) {
		return {
			config: DEFAULT_CONFIG,
			stats: {
				frameTimeMs: 0,
				avgFrameMs: 0,
				p50FrameMs: 0,
				p95FrameMs: 0,
				p99FrameMs: 0,
				fps: 0,
				avgFps: 0,
				totalFrames: 0,
				budgetOverruns: 0,
				systemTimings: [],
				phaseTimings: {},
			},
			alerts: [],
		};
	}

	const s = managerState;
	const systemTimings: SystemTiming[] = [];
	for (const [name, samples] of s.systemSamples) {
		systemTimings.push({
			name,
			lastMs:
				samples.count > 0
					? (samples.samples[(samples.idx - 1 + samples.samples.length) % samples.samples.length] ??
						0)
					: 0,
			avgMs: getAvg(samples),
			minMs: samples.min === Number.POSITIVE_INFINITY ? 0 : samples.min,
			maxMs: samples.max,
			p50Ms: getPercentile(samples, 0.5),
			p95Ms: getPercentile(samples, 0.95),
			p99Ms: getPercentile(samples, 0.99),
			count: samples.count,
		});
	}

	const phaseTimings: Record<string, number> = {};
	for (const [phase, time] of s.phaseTotals) phaseTimings[LoopPhase[phase] ?? 'unknown'] = time;

	const lastFrame =
		s.frameSamples.count > 0
			? (s.frameSamples.samples[
					(s.frameSamples.idx - 1 + s.frameSamples.samples.length) % s.frameSamples.samples.length
				] ?? 0)
			: 0;
	const avgFrame = getAvg(s.frameSamples);

	return {
		config: s.config,
		stats: {
			frameTimeMs: lastFrame,
			avgFrameMs: avgFrame,
			p50FrameMs: getPercentile(s.frameSamples, 0.5),
			p95FrameMs: getPercentile(s.frameSamples, 0.95),
			p99FrameMs: getPercentile(s.frameSamples, 0.99),
			fps: lastFrame > 0 ? 1000 / lastFrame : 0,
			avgFps: avgFrame > 0 ? 1000 / avgFrame : 0,
			totalFrames: s.totalFrames,
			budgetOverruns: s.budgetOverruns,
			systemTimings,
			phaseTimings,
		},
		alerts: [...s.alerts],
	};
}

/**
 * Registers a callback for budget overrun alerts.
 *
 * @param callback - Alert handler
 */
export function onBudgetAlert(callback: (alert: BudgetAlert) => void): void {
	if (managerState) managerState.onAlert = callback;
}

/**
 * Resets all profiling data.
 */
export function resetFrameBudget(): void {
	if (!managerState) return;
	managerState.systemSamples.clear();
	managerState.phaseTotals.clear();
	managerState.frameSamples = createSamples(managerState.config.rollingWindowSize);
	managerState.totalFrames = 0;
	managerState.budgetOverruns = 0;
	managerState.alerts = [];
}

/**
 * Destroys the frame budget manager.
 */
export function destroyFrameBudgetManager(): void {
	managerState = null;
}

/**
 * Exports metrics as a JSON-serializable object for external analysis.
 *
 * @returns Metrics data
 */
export function exportFrameBudgetMetrics(): Record<string, unknown> {
	const stats = getFrameBudgetStats();
	return {
		config: stats.config,
		stats: stats.stats,
		alerts: stats.alerts,
		exportedAt: Date.now(),
	};
}
