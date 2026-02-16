/**
 * State management for Token Tracker widget.
 * @module widgets/tokenTracker/state
 */

import type { Entity } from 'blecsd/core';
import { DEFAULT_CAPACITY, DEFAULT_MODEL_PRICING, TokenTrackerConfigSchema } from './config';
import type { ModelPricing, TokenStats, TokenTrackerConfig } from './types';

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
export interface TokenTrackerState {
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
export const tokenTrackerStateMap = new Map<Entity, TokenTrackerState>();

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
