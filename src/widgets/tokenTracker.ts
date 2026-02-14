/**
 * Token Tracker Widget
 *
 * A widget for tracking LLM token usage in real time, displaying input/output
 * tokens, estimated cost, throughput, and optional sparkline history.
 *
 * @module widgets/tokenTracker
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, setStyle } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Model pricing configuration.
 */
export interface ModelPricing {
	/** Model name/identifier */
	readonly name: string;
	/** Cost per 1000 input tokens in USD */
	readonly inputCostPer1k: number;
	/** Cost per 1000 output tokens in USD */
	readonly outputCostPer1k: number;
}

/**
 * Token usage statistics.
 */
export interface TokenStats {
	/** Total input tokens */
	readonly inputTokens: number;
	/** Total output tokens */
	readonly outputTokens: number;
	/** Total tokens (input + output) */
	readonly totalTokens: number;
	/** Estimated cost in USD */
	readonly estimatedCost: number;
	/** Tokens per second throughput */
	readonly tokensPerSecond: number;
	/** Recent throughput samples */
	readonly throughputHistory: readonly number[];
	/** Elapsed time in milliseconds */
	readonly elapsedMs: number;
}

/**
 * Configuration for creating a Token Tracker widget.
 */
export interface TokenTrackerConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width in characters (default: 40) */
	readonly width?: number;
	/** Height in lines (default: 6) */
	readonly height?: number;
	/** Model name for default pricing (optional) */
	readonly model?: string;
	/** Custom pricing configuration (optional) */
	readonly pricing?: ModelPricing;
	/** Show estimated cost (default: true) */
	readonly showCost?: boolean;
	/** Show throughput (default: true) */
	readonly showThroughput?: boolean;
	/** Show sparkline throughput history (default: false) */
	readonly showSparkline?: boolean;
	/** Maximum number of throughput history samples (default: 20) */
	readonly maxHistorySamples?: number;
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
}

/**
 * Token Tracker widget interface providing chainable methods.
 */
export interface TokenTrackerWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Records token usage */
	addTokens(input: number, output: number): TokenTrackerWidget;

	/** Sets the model pricing */
	setModelPricing(
		model: string,
		inputCostPer1k: number,
		outputCostPer1k: number,
	): TokenTrackerWidget;

	/** Gets current statistics */
	getStats(): TokenStats;

	/** Resets all counters */
	reset(): TokenTrackerWidget;

	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for model pricing.
 */
const ModelPricingSchema = z.object({
	name: z.string(),
	inputCostPer1k: z.number().nonnegative(),
	outputCostPer1k: z.number().nonnegative(),
});

/**
 * Zod schema for token tracker configuration.
 */
export const TokenTrackerConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(6),
	model: z.string().optional(),
	pricing: ModelPricingSchema.optional(),
	showCost: z.boolean().default(true),
	showThroughput: z.boolean().default(true),
	showSparkline: z.boolean().default(false),
	maxHistorySamples: z.number().int().positive().default(20),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Built-in model pricing (cost per 1000 tokens in USD).
 */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
	'claude-opus-4-6': {
		name: 'claude-opus-4-6',
		inputCostPer1k: 0.015,
		outputCostPer1k: 0.075,
	},
	'claude-sonnet-4-5': {
		name: 'claude-sonnet-4-5',
		inputCostPer1k: 0.003,
		outputCostPer1k: 0.015,
	},
	'claude-haiku-4-5': {
		name: 'claude-haiku-4-5',
		inputCostPer1k: 0.0008,
		outputCostPer1k: 0.004,
	},
	'gpt-4o': {
		name: 'gpt-4o',
		inputCostPer1k: 0.0025,
		outputCostPer1k: 0.01,
	},
	'gpt-4o-mini': {
		name: 'gpt-4o-mini',
		inputCostPer1k: 0.00015,
		outputCostPer1k: 0.0006,
	},
};

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * TokenTracker component marker.
 */
export const TokenTracker = {
	/** Tag indicating this is a token tracker widget (1 = yes) */
	isTokenTracker: new Uint8Array(DEFAULT_CAPACITY),
	/** Show cost (1 = yes) */
	showCost: new Uint8Array(DEFAULT_CAPACITY),
	/** Show throughput (1 = yes) */
	showThroughput: new Uint8Array(DEFAULT_CAPACITY),
	/** Show sparkline (1 = yes) */
	showSparkline: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Token tracker state stored outside ECS.
 */
interface TokenTrackerState {
	/** Input tokens */
	inputTokens: number;
	/** Output tokens */
	outputTokens: number;
	/** Model pricing */
	pricing: ModelPricing;
	/** Throughput history samples */
	throughputHistory: number[];
	/** Maximum history samples */
	maxHistorySamples: number;
	/** Start timestamp */
	startTime: number;
	/** Last update timestamp */
	lastUpdateTime: number;
}

/** Map of entity to token tracker state */
const tokenTrackerStateMap = new Map<Entity, TokenTrackerState>();

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial token tracker state.
 *
 * @param config - Configuration options
 * @returns Initial state
 */
export function createTokenState(config?: Partial<TokenTrackerConfig>): TokenTrackerState {
	const validated = TokenTrackerConfigSchema.partial().parse(config ?? {});

	let pricing: ModelPricing;
	if (validated.pricing) {
		pricing = validated.pricing;
	} else if (validated.model && DEFAULT_MODEL_PRICING[validated.model]) {
		pricing = DEFAULT_MODEL_PRICING[validated.model] as ModelPricing;
	} else {
		// Default to claude-sonnet-4-5
		pricing = DEFAULT_MODEL_PRICING['claude-sonnet-4-5'] as ModelPricing;
	}

	const now = Date.now();
	return {
		inputTokens: 0,
		outputTokens: 0,
		pricing,
		throughputHistory: [],
		maxHistorySamples: validated.maxHistorySamples ?? 20,
		startTime: now,
		lastUpdateTime: now,
	};
}

/**
 * Records token usage and updates throughput.
 *
 * @param state - Current state
 * @param input - Input tokens to add
 * @param output - Output tokens to add
 * @returns Updated state
 */
export function recordTokens(
	state: TokenTrackerState,
	input: number,
	output: number,
): TokenTrackerState {
	const now = Date.now();
	const elapsedMs = now - state.lastUpdateTime;
	const totalNewTokens = input + output;

	// Calculate instantaneous throughput (tokens per second)
	const tokensPerSecond = elapsedMs > 0 ? (totalNewTokens / elapsedMs) * 1000 : 0;

	// Update throughput history
	const newHistory = [...state.throughputHistory, tokensPerSecond];
	if (newHistory.length > state.maxHistorySamples) {
		newHistory.shift();
	}

	return {
		...state,
		inputTokens: state.inputTokens + input,
		outputTokens: state.outputTokens + output,
		throughputHistory: newHistory,
		lastUpdateTime: now,
	};
}

/**
 * Gets computed token statistics.
 *
 * @param state - Current state
 * @returns Token statistics
 */
export function getTokenStats(state: TokenTrackerState): TokenStats {
	const totalTokens = state.inputTokens + state.outputTokens;
	const estimatedCost =
		(state.inputTokens / 1000) * state.pricing.inputCostPer1k +
		(state.outputTokens / 1000) * state.pricing.outputCostPer1k;

	const elapsedMs = Date.now() - state.startTime;
	const tokensPerSecond = elapsedMs > 0 ? (totalTokens / elapsedMs) * 1000 : 0;

	return {
		inputTokens: state.inputTokens,
		outputTokens: state.outputTokens,
		totalTokens,
		estimatedCost,
		tokensPerSecond,
		throughputHistory: [...state.throughputHistory],
		elapsedMs,
	};
}

/**
 * Resets token tracking state.
 *
 * @param state - Current state
 * @returns Reset state
 */
export function resetTokenState(state: TokenTrackerState): TokenTrackerState {
	const now = Date.now();
	return {
		...state,
		inputTokens: 0,
		outputTokens: 0,
		throughputHistory: [],
		startTime: now,
		lastUpdateTime: now,
	};
}

/**
 * Formats token statistics for display.
 *
 * @param stats - Token statistics
 * @param config - Display configuration
 * @returns Array of formatted lines
 */
export function formatTokenDisplay(
	stats: TokenStats,
	config: { showCost: boolean; showThroughput: boolean },
): string[] {
	const lines: string[] = [];

	lines.push(`Input:  ${stats.inputTokens.toLocaleString()} tokens`);
	lines.push(`Output: ${stats.outputTokens.toLocaleString()} tokens`);
	lines.push(`Total:  ${stats.totalTokens.toLocaleString()} tokens`);

	if (config.showCost) {
		lines.push(`Cost:   $${stats.estimatedCost.toFixed(4)}`);
	}

	if (config.showThroughput) {
		lines.push(`Rate:   ${stats.tokensPerSecond.toFixed(1)} tok/s`);
	}

	return lines;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders simple sparkline using ASCII characters.
 * @internal
 */
function renderSimpleSparkline(history: readonly number[], width: number): string {
	if (history.length === 0) {
		return ' '.repeat(width);
	}

	const max = Math.max(...history);
	if (max === 0) {
		return '_'.repeat(width);
	}

	const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
	const output: string[] = [];

	for (let i = 0; i < width; i++) {
		const dataIdx = Math.floor((i / width) * history.length);
		const value = history[dataIdx] ?? 0;
		const normalized = value / max;
		const blockIdx = Math.min(blocks.length - 1, Math.floor(normalized * blocks.length));
		output.push(blocks[blockIdx] ?? ' ');
	}

	return output.join('');
}

/**
 * Updates the token tracker content.
 * @internal
 */
function updateTokenTrackerContent(world: World, eid: Entity): void {
	const state = tokenTrackerStateMap.get(eid);
	if (!state) return;

	const dims = getDimensions(world, eid);
	if (!dims) return;

	const stats = getTokenStats(state);
	const showCost = TokenTracker.showCost[eid] === 1;
	const showThroughput = TokenTracker.showThroughput[eid] === 1;
	const showSparkline = TokenTracker.showSparkline[eid] === 1;

	const lines = formatTokenDisplay(stats, { showCost, showThroughput });

	// Add sparkline if enabled
	if (showSparkline && state.throughputHistory.length > 0) {
		const sparkline = renderSimpleSparkline(state.throughputHistory, dims.width);
		lines.push(sparkline);
	}

	// Pad or truncate to match height
	while (lines.length < dims.height) {
		lines.push(' '.repeat(dims.width));
	}
	const content = lines
		.slice(0, dims.height)
		.map((line) => line.padEnd(dims.width).slice(0, dims.width))
		.join('\n');

	setContent(world, eid, content);
	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Token Tracker widget with the given configuration.
 *
 * The Token Tracker widget displays LLM token usage in real time with
 * input/output tokens, estimated cost, throughput, and optional sparkline history.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Token Tracker widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createTokenTracker } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * const tracker = createTokenTracker(world, {
 *   x: 0,
 *   y: 0,
 *   width: 40,
 *   model: 'claude-sonnet-4-5',
 *   showCost: true,
 *   showThroughput: true,
 *   showSparkline: true,
 * });
 *
 * // Record token usage
 * tracker.addTokens(100, 50);
 *
 * // Get statistics
 * const stats = tracker.getStats();
 * console.log(stats.estimatedCost);
 * ```
 */
export function createTokenTracker(
	world: World,
	config: TokenTrackerConfig = {},
): TokenTrackerWidget {
	const validated = TokenTrackerConfigSchema.parse(config);
	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions
	setDimensions(world, eid, validated.width, validated.height);

	// Set component flags
	TokenTracker.isTokenTracker[eid] = 1;
	TokenTracker.showCost[eid] = validated.showCost ? 1 : 0;
	TokenTracker.showThroughput[eid] = validated.showThroughput ? 1 : 0;
	TokenTracker.showSparkline[eid] = validated.showSparkline ? 1 : 0;

	// Initialize state
	const state = createTokenState({
		...(validated.model !== undefined && { model: validated.model }),
		...(validated.pricing !== undefined && { pricing: validated.pricing }),
		maxHistorySamples: validated.maxHistorySamples,
	});
	tokenTrackerStateMap.set(eid, state);

	// Set style
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	// Initial render
	updateTokenTrackerContent(world, eid);

	// Create the widget object
	const widget: TokenTrackerWidget = {
		eid,

		addTokens(input: number, output: number): TokenTrackerWidget {
			const currentState = tokenTrackerStateMap.get(eid);
			if (currentState) {
				const newState = recordTokens(currentState, input, output);
				tokenTrackerStateMap.set(eid, newState);
				updateTokenTrackerContent(world, eid);
			}
			return widget;
		},

		setModelPricing(
			model: string,
			inputCostPer1k: number,
			outputCostPer1k: number,
		): TokenTrackerWidget {
			const currentState = tokenTrackerStateMap.get(eid);
			if (currentState) {
				const newState: TokenTrackerState = {
					...currentState,
					pricing: { name: model, inputCostPer1k, outputCostPer1k },
				};
				tokenTrackerStateMap.set(eid, newState);
				updateTokenTrackerContent(world, eid);
			}
			return widget;
		},

		getStats(): TokenStats {
			const currentState = tokenTrackerStateMap.get(eid);
			if (!currentState) {
				return {
					inputTokens: 0,
					outputTokens: 0,
					totalTokens: 0,
					estimatedCost: 0,
					tokensPerSecond: 0,
					throughputHistory: [],
					elapsedMs: 0,
				};
			}
			return getTokenStats(currentState);
		},

		reset(): TokenTrackerWidget {
			const currentState = tokenTrackerStateMap.get(eid);
			if (currentState) {
				const newState = resetTokenState(currentState);
				tokenTrackerStateMap.set(eid, newState);
				updateTokenTrackerContent(world, eid);
			}
			return widget;
		},

		destroy(): void {
			TokenTracker.isTokenTracker[eid] = 0;
			TokenTracker.showCost[eid] = 0;
			TokenTracker.showThroughput[eid] = 0;
			TokenTracker.showSparkline[eid] = 0;
			tokenTrackerStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a token tracker widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a token tracker widget
 */
export function isTokenTracker(_world: World, eid: Entity): boolean {
	return TokenTracker.isTokenTracker[eid] === 1;
}

/**
 * Resets the TokenTracker component store. Useful for testing.
 * @internal
 */
export function resetTokenTrackerStore(): void {
	TokenTracker.isTokenTracker.fill(0);
	TokenTracker.showCost.fill(0);
	TokenTracker.showThroughput.fill(0);
	TokenTracker.showSparkline.fill(0);
	tokenTrackerStateMap.clear();
}
