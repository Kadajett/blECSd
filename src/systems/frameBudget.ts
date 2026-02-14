/**
 * Frame budget manager and profiling.
 *
 * Measures per-system timing, tracks rolling statistics, and enforces
 * configurable frame time budgets per phase. Optional on-screen debug overlay.
 *
 * @module systems/frameBudget
 */

import { z } from 'zod';
import type { System, World } from '../core/types';
import { LoopPhase } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Work priority levels for budget-aware scheduling.
 */
export enum WorkPriority {
	/** High priority work (input processing, critical updates) */
	HIGH = 0,
	/** Medium priority work (layout, rendering, standard updates) */
	MEDIUM = 1,
	/** Low priority work (animations, background tasks) */
	LOW = 2,
}

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
	/** EMA smoothing factor for adaptive budgets (default: 0.1) */
	readonly emaSmoothingFactor: number;
	/** Under-budget threshold for budget expansion (default: 0.8 = 80%) */
	readonly underBudgetThreshold: number;
	/** Over-budget threshold for budget tightening (default: 0.95 = 95%) */
	readonly overBudgetThreshold: number;
}

/**
 * Zod schema for FrameBudgetConfig validation.
 */
export const FrameBudgetConfigSchema = z.object({
	targetFrameMs: z.number().positive(),
	phaseBudgets: z.record(z.string(), z.number().positive()),
	rollingWindowSize: z.number().int().positive(),
	warnOnOverrun: z.boolean(),
	emaSmoothingFactor: z.number().min(0).max(1),
	underBudgetThreshold: z.number().min(0).max(1),
	overBudgetThreshold: z.number().min(0).max(1),
});

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
 * Deferred work item in the queue.
 */
export interface DeferredWorkItem {
	readonly id: string;
	readonly priority: WorkPriority;
	readonly deferralCount: number;
	readonly work: () => void;
}

/**
 * Frame health status based on performance metrics.
 */
export type FrameHealth = 'good' | 'warning' | 'critical';

/**
 * Frame telemetry data for performance analysis.
 */
export interface FrameTelemetry {
	/** Per-system timing breakdown */
	readonly systemTimings: readonly SystemTiming[];
	/** Per-phase budget utilization percentage (0-100+) */
	readonly budgetUtilization: Readonly<Record<string, number>>;
	/** Total deferred work items in queue */
	readonly deferralCount: number;
	/** Current frame health status */
	readonly health: FrameHealth;
	/** P95 frame time in milliseconds */
	readonly p95FrameMs: number;
	/** Average frame time in milliseconds */
	readonly avgFrameMs: number;
	/** Current FPS */
	readonly fps: number;
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
	// Adaptive budget tracking
	phaseEMA: Map<LoopPhase, number>;
	adaptiveBudgets: Map<LoopPhase, number>;
	// Deferred work queue
	deferredWork: DeferredWorkItem[];
	nextWorkId: number;
	currentFrameStartMs: number;
}

const DEFAULT_CONFIG: FrameBudgetConfig = {
	targetFrameMs: 16.67,
	phaseBudgets: {},
	rollingWindowSize: 120,
	warnOnOverrun: true,
	emaSmoothingFactor: 0.1,
	underBudgetThreshold: 0.8,
	overBudgetThreshold: 0.95,
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
	const merged = { ...DEFAULT_CONFIG, ...config };
	const validated = FrameBudgetConfigSchema.parse(merged) as FrameBudgetConfig;
	managerState = {
		config: validated,
		systemSamples: new Map(),
		phaseTotals: new Map(),
		frameSamples: createSamples(merged.rollingWindowSize),
		totalFrames: 0,
		budgetOverruns: 0,
		alerts: [],
		onAlert: null,
		phaseEMA: new Map(),
		adaptiveBudgets: new Map(),
		deferredWork: [],
		nextWorkId: 0,
		currentFrameStartMs: 0,
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
	managerState.phaseEMA.clear();
	managerState.adaptiveBudgets.clear();
	managerState.deferredWork = [];
	managerState.currentFrameStartMs = 0;
}

/**
 * Destroys the frame budget manager.
 */
export function destroyFrameBudgetManager(): void {
	managerState = null;
}

/**
 * Marks the start of a new frame for budget tracking.
 * Call this at the beginning of your frame loop.
 */
export function beginFrame(): void {
	if (!managerState) return;
	managerState.currentFrameStartMs = performance.now();
}

/**
 * Updates the exponential moving average for a phase and adjusts adaptive budgets.
 * Call this after recording phase time to enable adaptive budgeting.
 *
 * @param phase - The loop phase that just completed
 */
export function updateAdaptiveBudget(phase: LoopPhase): void {
	if (!managerState) return;

	const actualTime = managerState.phaseTotals.get(phase);
	if (actualTime === undefined) return;

	const configBudget = managerState.config.phaseBudgets[phase];
	if (configBudget === undefined) return;

	// Update EMA
	const alpha = managerState.config.emaSmoothingFactor;
	const prevEMA = managerState.phaseEMA.get(phase) ?? actualTime;
	const newEMA = alpha * actualTime + (1 - alpha) * prevEMA;
	managerState.phaseEMA.set(phase, newEMA);

	// Calculate utilization ratio
	const utilization = newEMA / configBudget;

	// Adjust adaptive budget
	let adaptiveBudget = managerState.adaptiveBudgets.get(phase) ?? configBudget;

	if (utilization < managerState.config.underBudgetThreshold) {
		// Under budget: allow more work (increase by 5%)
		adaptiveBudget = Math.min(configBudget * 1.2, adaptiveBudget * 1.05);
	} else if (utilization > managerState.config.overBudgetThreshold) {
		// Over budget: tighten (decrease by 5%)
		adaptiveBudget = Math.max(configBudget * 0.8, adaptiveBudget * 0.95);
	}
	// Otherwise, keep current adaptive budget

	managerState.adaptiveBudgets.set(phase, adaptiveBudget);
}

/**
 * Gets the current adaptive budget for a phase.
 * Falls back to configured budget if adaptive budgeting is not active.
 *
 * @param phase - The loop phase
 * @returns The current adaptive budget in milliseconds
 */
export function getAdaptiveBudget(phase: LoopPhase): number {
	if (!managerState) return 0;
	const adaptive = managerState.adaptiveBudgets.get(phase);
	if (adaptive !== undefined) return adaptive;
	return managerState.config.phaseBudgets[phase] ?? 0;
}

/**
 * Checks if work at the given priority level can run within the current frame budget.
 *
 * @param priority - Work priority level
 * @returns True if the work should run, false if it should be deferred
 */
export function canRunWork(priority: WorkPriority): boolean {
	if (!managerState) return true;

	const elapsed = performance.now() - managerState.currentFrameStartMs;
	const budget = managerState.config.targetFrameMs;

	// Calculate remaining budget percentage
	const remaining = budget - elapsed;
	const remainingPct = remaining / budget;

	// Priority thresholds
	switch (priority) {
		case WorkPriority.HIGH:
			// High priority always runs
			return true;
		case WorkPriority.MEDIUM:
			// Medium priority runs if at least 20% budget remains
			return remainingPct > 0.2;
		case WorkPriority.LOW:
			// Low priority runs only if at least 40% budget remains
			return remainingPct > 0.4;
		default:
			return true;
	}
}

/**
 * Defers work to be executed in a future frame when budget allows.
 *
 * @param priority - Work priority level
 * @param work - The work function to defer
 * @returns A unique ID for the deferred work item
 */
export function deferWork(priority: WorkPriority, work: () => void): string {
	if (!managerState) {
		// If no manager, execute immediately
		work();
		return '';
	}

	const id = `work-${managerState.nextWorkId++}`;
	managerState.deferredWork.push({
		id,
		priority,
		deferralCount: 0,
		work,
	});

	return id;
}

/**
 * Processes deferred work items that fit within the current frame budget.
 * Items deferred multiple times get priority boosted to prevent starvation.
 * Call this during idle time in your frame loop.
 *
 * @returns The number of work items processed
 */
export function processDeferredWork(): number {
	if (!managerState || managerState.deferredWork.length === 0) return 0;

	// Sort by effective priority (original priority - deferral count)
	// Lower effective priority runs first
	const sortedWork = [...managerState.deferredWork].sort((a, b) => {
		const aEffective = a.priority - Math.min(a.deferralCount * 0.5, 2);
		const bEffective = b.priority - Math.min(b.deferralCount * 0.5, 2);
		return aEffective - bEffective;
	});

	let processed = 0;
	const remaining: DeferredWorkItem[] = [];

	for (const item of sortedWork) {
		const effectivePriority = Math.max(
			0,
			item.priority - Math.floor(item.deferralCount / 2),
		) as WorkPriority;

		if (canRunWork(effectivePriority)) {
			try {
				item.work();
				processed++;
			} catch (err) {
				// Log error but continue processing other work
				console.error(`Deferred work ${item.id} failed:`, err);
				remaining.push(item);
			}
		} else {
			// Can't run this item, increment deferral count
			remaining.push({
				...item,
				deferralCount: item.deferralCount + 1,
			});
		}
	}

	managerState.deferredWork = remaining;
	return processed;
}

/**
 * Cancels a deferred work item by ID.
 *
 * @param id - The work item ID returned from deferWork
 * @returns True if the item was found and cancelled
 */
export function cancelDeferredWork(id: string): boolean {
	if (!managerState) return false;

	const initialLength = managerState.deferredWork.length;
	managerState.deferredWork = managerState.deferredWork.filter((item) => item.id !== id);
	return managerState.deferredWork.length < initialLength;
}

/**
 * Gets the current deferred work queue size.
 *
 * @returns The number of deferred work items
 */
export function getDeferredWorkCount(): number {
	if (!managerState) return 0;
	return managerState.deferredWork.length;
}

/**
 * Determines frame health status based on P95 frame time.
 *
 * @param p95FrameMs - P95 frame time in milliseconds
 * @param targetFrameMs - Target frame time in milliseconds
 * @returns Frame health status
 */
function calculateFrameHealth(p95FrameMs: number, targetFrameMs: number): FrameHealth {
	const ratio = p95FrameMs / targetFrameMs;

	if (ratio <= 1.0) return 'good';
	if (ratio <= 1.5) return 'warning';
	return 'critical';
}

/**
 * Gets comprehensive frame telemetry for performance monitoring and debugging.
 *
 * @returns Frame telemetry data including timing, budget utilization, and health status
 *
 * @example
 * ```typescript
 * import { getFrameTelemetry } from 'blecsd';
 *
 * const telemetry = getFrameTelemetry();
 * console.log(`Frame health: ${telemetry.health}`);
 * console.log(`Deferred work: ${telemetry.deferralCount}`);
 * for (const [phase, util] of Object.entries(telemetry.budgetUtilization)) {
 *   console.log(`${phase}: ${util.toFixed(1)}%`);
 * }
 * ```
 */
export function getFrameTelemetry(): FrameTelemetry {
	const stats = getFrameBudgetStats();

	const budgetUtilization: Record<string, number> = {};
	for (const [phaseStr, actualMs] of Object.entries(stats.stats.phaseTimings)) {
		// Find phase enum value
		const phaseNum = Object.entries(LoopPhase).find(([_k, v]) => {
			return typeof v === 'number' && LoopPhase[v] === phaseStr;
		})?.[1] as LoopPhase | undefined;

		if (phaseNum !== undefined) {
			const budget = getAdaptiveBudget(phaseNum);
			if (budget > 0) {
				budgetUtilization[phaseStr] = (actualMs / budget) * 100;
			}
		}
	}

	const health = calculateFrameHealth(stats.stats.p95FrameMs, stats.config.targetFrameMs);

	return {
		systemTimings: stats.stats.systemTimings,
		budgetUtilization,
		deferralCount: getDeferredWorkCount(),
		health,
		p95FrameMs: stats.stats.p95FrameMs,
		avgFrameMs: stats.stats.avgFrameMs,
		fps: stats.stats.fps,
	};
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
