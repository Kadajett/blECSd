/**
 * Factory function for creating Token Tracker widgets.
 * @module widgets/tokenTracker/factory
 */

import {
	getDimensions,
	markDirty,
	setContent,
	setDimensions,
	setPosition,
	setStyle,
} from 'blecsd/components';
import type { World } from 'blecsd/core';
import { addEntity, removeEntity } from 'blecsd/core';
import { parseColor } from 'blecsd/utils';
import { TokenTrackerConfigSchema } from './config';
import { renderSimpleSparkline } from './helpers';
import {
	createTokenState,
	formatTokenDisplay,
	getTokenStats,
	recordTokens,
	resetTokenState,
	TokenTracker,
	tokenTrackerStateMap,
} from './state';
import type { TokenStats, TokenTrackerConfig, TokenTrackerWidget } from './types';

/**
 * Updates the token tracker content.
 * @internal
 */
function updateTokenTrackerContent(world: World, eid: number): void {
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
 * import { createWorld } from 'blecsd/core';
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
				const newState = {
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
