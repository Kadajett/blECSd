/**
 * Type definitions for Token Tracker widget.
 * @module widgets/tokenTracker/types
 */

import type { Entity } from 'blecsd/core';

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
