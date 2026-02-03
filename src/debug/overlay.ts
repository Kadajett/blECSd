/**
 * Debug overlay widget for visual debugging.
 *
 * Displays real-time debugging information:
 * - FPS counter
 * - Entity count
 * - System timings
 * - Memory usage
 * - Input events
 *
 * @module debug/overlay
 */

import { addEntity, removeEntity } from 'bitecs';

import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { setStyle, show as showEntity, hide as hideEntity } from '../components/renderable';
import type { GameLoop } from '../core/gameLoop';
import type { Entity, World } from '../core/types';
import { setEntityData } from '../core/entityData';
import {
	enableSystemTiming,
	getPerformanceStats,
	getSystemTimings,
	isSystemTimingEnabled,
	type PerformanceStats,
} from './index';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Debug overlay configuration.
 */
export interface DebugOverlayConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width (default: 35) */
	readonly width?: number;
	/** Toggle key (default: 'F12') */
	readonly toggleKey?: string;
	/** Whether to show FPS (default: true) */
	readonly showFPS?: boolean;
	/** Whether to show entity count (default: true) */
	readonly showEntityCount?: boolean;
	/** Whether to show memory usage (default: true) */
	readonly showMemory?: boolean;
	/** Whether to show system timings (default: true) */
	readonly showSystemTimings?: boolean;
	/** Maximum number of systems to show (default: 5) */
	readonly maxSystemsShown?: number;
	/** Background color (default: dark blue) */
	readonly bgColor?: number;
	/** Foreground color (default: white) */
	readonly fgColor?: number;
	/** Whether visible on start (default: false) */
	readonly visibleOnStart?: boolean;
}

/**
 * Debug overlay state.
 */
export interface DebugOverlay {
	/** Whether the overlay is currently visible */
	readonly visible: boolean;
	/** The overlay entity (null if not created) */
	readonly entity: Entity | null;
	/** Configuration */
	readonly config: Required<DebugOverlayConfig>;
	/** Show the overlay */
	show(): void;
	/** Hide the overlay */
	hide(): void;
	/** Toggle visibility */
	toggle(): void;
	/** Update overlay content */
	update(world: World, loop?: GameLoop): void;
	/** Destroy the overlay */
	destroy(): void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: Required<DebugOverlayConfig> = {
	x: 0,
	y: 0,
	width: 35,
	toggleKey: 'F12',
	showFPS: true,
	showEntityCount: true,
	showMemory: true,
	showSystemTimings: true,
	maxSystemsShown: 5,
	bgColor: 0x000080ff, // Navy blue
	fgColor: 0xffffffff, // White
	visibleOnStart: false,
};

// =============================================================================
// OVERLAY IMPLEMENTATION
// =============================================================================

/**
 * Creates a debug overlay for the given world.
 *
 * The overlay displays real-time debugging information and can be
 * toggled with a configurable key (default: F12).
 *
 * @param world - The ECS world
 * @param config - Optional configuration
 * @returns Debug overlay controller
 *
 * @example
 * ```typescript
 * import { createDebugOverlay } from 'blecsd/debug';
 *
 * const overlay = createDebugOverlay(world, {
 *   toggleKey: 'F12',
 *   showSystemTimings: true,
 * });
 *
 * // In game loop
 * game.onUpdate(() => {
 *   overlay.update(world, loop);
 * });
 *
 * // Toggle with key
 * game.onKey('F12', () => overlay.toggle());
 * ```
 */
export function createDebugOverlay(
	world: World,
	config: DebugOverlayConfig = {},
): DebugOverlay {
	const cfg: Required<DebugOverlayConfig> = { ...DEFAULT_CONFIG, ...config };

	let visible = cfg.visibleOnStart;
	let entity: Entity | null = null;

	// Enable system timing if we want to show it
	if (cfg.showSystemTimings && !isSystemTimingEnabled()) {
		enableSystemTiming(true);
	}

	/**
	 * Creates the overlay entity.
	 */
	function createEntity(): Entity {
		const eid = addEntity(world);

		setPosition(world, eid, cfg.x, cfg.y, 9999); // Very high z-index
		setDimensions(world, eid, cfg.width, 10); // Height will be dynamic
		setStyle(world, eid, {
			fg: cfg.fgColor,
			bg: cfg.bgColor,
		});
		showEntity(world, eid);
		setContent(world, eid, 'Loading...');
		setEntityData(eid, 'name', '__debug_overlay__');

		return eid;
	}

	/**
	 * Builds the overlay content string.
	 */
	function buildContent(stats: PerformanceStats): string {
		const lines: string[] = [];

		lines.push('┌─ Debug ─────────────────────┐');

		if (cfg.showFPS) {
			const fpsColor = stats.fps >= 55 ? '32' : stats.fps >= 30 ? '33' : '31';
			lines.push(`│ FPS: \x1b[${fpsColor}m${stats.fps.toString().padStart(3)}\x1b[0m (${stats.frameTime.toFixed(1)}ms)`);
		}

		if (cfg.showEntityCount) {
			lines.push(`│ Entities: ${stats.entityCount}`);
		}

		if (cfg.showMemory && stats.memoryUsageMB !== null) {
			const memStr = stats.memoryUsageMB.toFixed(1);
			lines.push(`│ Memory: ${memStr}MB`);
		}

		if (cfg.showSystemTimings) {
			const timings = getSystemTimings();
			const entries = Object.entries(timings)
				.filter(([, time]) => time > 0)
				.sort(([, a], [, b]) => b - a)
				.slice(0, cfg.maxSystemsShown);

			if (entries.length > 0) {
				lines.push('├─ Systems ─────────────────┤');
				for (const [name, time] of entries) {
					const timeStr = time.toFixed(2).padStart(6);
					const shortName = name.length > 20 ? name.slice(0, 17) + '...' : name;
					lines.push(`│ ${shortName.padEnd(20)} ${timeStr}ms`);
				}
			}
		}

		lines.push(`│ Frame: ${stats.frameCount}`);
		lines.push(`│ Time: ${stats.runningTime.toFixed(1)}s`);
		lines.push('└────────────────────────────┘');

		return lines.join('\n');
	}

	const overlay: DebugOverlay = {
		get visible() {
			return visible;
		},

		get entity() {
			return entity;
		},

		get config() {
			return cfg;
		},

		show() {
			visible = true;
			if (!entity) {
				entity = createEntity();
			}
			showEntity(world, entity);
		},

		hide() {
			visible = false;
			if (entity) {
				hideEntity(world, entity);
			}
		},

		toggle() {
			if (visible) {
				overlay.hide();
			} else {
				overlay.show();
			}
		},

		update(w: World, loop?: GameLoop) {
			if (!visible || !entity) return;

			// Get stats
			const stats = getPerformanceStats(w, loop);

			// Build and set content
			const content = buildContent(stats);
			setContent(w, entity, content);

			// Update height based on content
			const lineCount = content.split('\n').length;
			setDimensions(w, entity, cfg.width, lineCount);
		},

		destroy() {
			if (entity) {
				removeEntity(world, entity);
				entity = null;
			}
			visible = false;
		},
	};

	// Create entity if visible on start
	if (visible) {
		entity = createEntity();
	}

	return overlay;
}

// =============================================================================
// INPUT LOG
// =============================================================================

/**
 * Input event log entry.
 */
interface InputLogEntry {
	readonly type: 'key' | 'mouse';
	readonly detail: string;
	readonly timestamp: number;
}

/**
 * Input event logger state.
 */
interface InputLogger {
	readonly entries: readonly InputLogEntry[];
	readonly maxEntries: number;
	log(type: 'key' | 'mouse', detail: string): void;
	clear(): void;
	getRecentEntries(count?: number): readonly InputLogEntry[];
}

/**
 * Creates an input event logger for debugging.
 *
 * @param maxEntries - Maximum entries to keep (default: 20)
 * @returns Input logger
 *
 * @example
 * ```typescript
 * import { createInputLogger } from 'blecsd/debug';
 *
 * const logger = createInputLogger(10);
 *
 * // In input handler
 * game.onAnyKey((event) => {
 *   logger.log('key', `${event.name} ${event.ctrl ? '+Ctrl' : ''}`);
 * });
 *
 * game.onMouse((event) => {
 *   logger.log('mouse', `${event.action} @ ${event.x},${event.y}`);
 * });
 *
 * // Get recent entries
 * console.log(logger.getRecentEntries(5));
 * ```
 */
export function createInputLogger(maxEntries = 20): InputLogger {
	const entries: InputLogEntry[] = [];

	return {
		get entries() {
			return entries as readonly InputLogEntry[];
		},

		get maxEntries() {
			return maxEntries;
		},

		log(type: 'key' | 'mouse', detail: string) {
			entries.push({
				type,
				detail,
				timestamp: Date.now(),
			});

			// Trim to max entries
			while (entries.length > maxEntries) {
				entries.shift();
			}
		},

		clear() {
			entries.length = 0;
		},

		getRecentEntries(count = 5): readonly InputLogEntry[] {
			return entries.slice(-count);
		},
	};
}

// =============================================================================
// MINI PROFILER
// =============================================================================

/**
 * Mini profiler for measuring code sections.
 */
export interface MiniProfiler {
	/** Start timing a section */
	start(name: string): void;
	/** End timing a section */
	end(name: string): number;
	/** Get average time for a section */
	getAverage(name: string): number;
	/** Get all timings */
	getAll(): Record<string, { avg: number; min: number; max: number; count: number }>;
	/** Reset all timings */
	reset(): void;
}

/**
 * Creates a mini profiler for measuring code sections.
 *
 * @returns Mini profiler instance
 *
 * @example
 * ```typescript
 * import { createMiniProfiler } from 'blecsd/debug';
 *
 * const profiler = createMiniProfiler();
 *
 * profiler.start('render');
 * // ... render code ...
 * const elapsed = profiler.end('render');
 *
 * console.log(`Render avg: ${profiler.getAverage('render').toFixed(2)}ms`);
 * ```
 */
export function createMiniProfiler(): MiniProfiler {
	const starts = new Map<string, number>();
	const timings = new Map<
		string,
		{ total: number; min: number; max: number; count: number }
	>();

	return {
		start(name: string) {
			starts.set(name, performance.now());
		},

		end(name: string): number {
			const start = starts.get(name);
			if (start === undefined) {
				return 0;
			}

			const elapsed = performance.now() - start;
			starts.delete(name);

			const existing = timings.get(name);
			if (existing) {
				existing.total += elapsed;
				existing.min = Math.min(existing.min, elapsed);
				existing.max = Math.max(existing.max, elapsed);
				existing.count++;
			} else {
				timings.set(name, {
					total: elapsed,
					min: elapsed,
					max: elapsed,
					count: 1,
				});
			}

			return elapsed;
		},

		getAverage(name: string): number {
			const entry = timings.get(name);
			if (!entry || entry.count === 0) return 0;
			return entry.total / entry.count;
		},

		getAll(): Record<string, { avg: number; min: number; max: number; count: number }> {
			const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};

			for (const [name, entry] of timings) {
				result[name] = {
					avg: entry.count > 0 ? entry.total / entry.count : 0,
					min: entry.min,
					max: entry.max,
					count: entry.count,
				};
			}

			return result;
		},

		reset() {
			starts.clear();
			timings.clear();
		},
	};
}

// =============================================================================
// FRAME RATE GRAPH
// =============================================================================

/**
 * Frame rate graph data.
 */
export interface FrameRateGraph {
	/** Add a frame time sample */
	addSample(frameTimeMs: number): void;
	/** Get samples for rendering */
	getSamples(): readonly number[];
	/** Get current FPS */
	getCurrentFPS(): number;
	/** Get average FPS */
	getAverageFPS(): number;
	/** Get min/max FPS */
	getMinMaxFPS(): { min: number; max: number };
	/** Reset the graph */
	reset(): void;
}

/**
 * Creates a frame rate graph for visualizing performance over time.
 *
 * @param sampleCount - Number of samples to keep (default: 60)
 * @returns Frame rate graph
 *
 * @example
 * ```typescript
 * import { createFrameRateGraph } from 'blecsd/debug';
 *
 * const graph = createFrameRateGraph(120); // 2 seconds at 60fps
 *
 * // In game loop
 * game.onUpdate((dt) => {
 *   graph.addSample(dt * 1000);
 *
 *   // Render graph...
 *   const samples = graph.getSamples();
 *   // samples are frame times in ms, convert to FPS for display
 * });
 * ```
 */
export function createFrameRateGraph(sampleCount = 60): FrameRateGraph {
	const samples: number[] = [];
	let totalTime = 0;

	return {
		addSample(frameTimeMs: number) {
			samples.push(frameTimeMs);
			totalTime += frameTimeMs;

			while (samples.length > sampleCount) {
				const removed = samples.shift();
				if (removed !== undefined) {
					totalTime -= removed;
				}
			}
		},

		getSamples(): readonly number[] {
			return samples;
		},

		getCurrentFPS(): number {
			if (samples.length === 0) return 0;
			const lastSample = samples[samples.length - 1]!;
			return lastSample > 0 ? 1000 / lastSample : 0;
		},

		getAverageFPS(): number {
			if (samples.length === 0) return 0;
			const avgFrameTime = totalTime / samples.length;
			return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
		},

		getMinMaxFPS(): { min: number; max: number } {
			if (samples.length === 0) return { min: 0, max: 0 };

			let minTime = Number.MAX_VALUE;
			let maxTime = 0;

			for (const sample of samples) {
				minTime = Math.min(minTime, sample);
				maxTime = Math.max(maxTime, sample);
			}

			return {
				min: maxTime > 0 ? 1000 / maxTime : 0,
				max: minTime > 0 ? 1000 / minTime : 0,
			};
		},

		reset() {
			samples.length = 0;
			totalTime = 0;
		},
	};
}
