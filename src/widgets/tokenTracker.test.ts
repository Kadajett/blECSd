import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	createTokenState,
	createTokenTracker,
	DEFAULT_MODEL_PRICING,
	formatTokenDisplay,
	getTokenStats,
	isTokenTracker,
	recordTokens,
	resetTokenState,
	resetTokenTrackerStore,
	type TokenTrackerConfig,
} from './tokenTracker';

describe('tokenTracker', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetTokenTrackerStore();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('createTokenState', () => {
		it('creates initial state with defaults', () => {
			const state = createTokenState();

			expect(state.inputTokens).toBe(0);
			expect(state.outputTokens).toBe(0);
			expect(state.throughputHistory).toEqual([]);
			expect(state.maxHistorySamples).toBe(20);
			expect(state.pricing.name).toBe('claude-sonnet-4-5');
		});

		it('creates state with custom model pricing', () => {
			const state = createTokenState({ model: 'claude-opus-4-6' });

			expect(state.pricing.name).toBe('claude-opus-4-6');
			expect(state.pricing.inputCostPer1k).toBe(0.015);
			expect(state.pricing.outputCostPer1k).toBe(0.075);
		});

		it('creates state with custom pricing object', () => {
			const customPricing = {
				name: 'custom-model',
				inputCostPer1k: 0.001,
				outputCostPer1k: 0.002,
			};
			const state = createTokenState({ pricing: customPricing });

			expect(state.pricing).toEqual(customPricing);
		});

		it('creates state with custom max history samples', () => {
			const state = createTokenState({ maxHistorySamples: 50 });

			expect(state.maxHistorySamples).toBe(50);
		});

		it('sets start time and last update time', () => {
			const now = Date.now();
			vi.setSystemTime(now);

			const state = createTokenState();

			expect(state.startTime).toBe(now);
			expect(state.lastUpdateTime).toBe(now);
		});
	});

	describe('recordTokens', () => {
		it('accumulates input and output tokens', () => {
			let state = createTokenState();

			state = recordTokens(state, 100, 50);
			expect(state.inputTokens).toBe(100);
			expect(state.outputTokens).toBe(50);

			state = recordTokens(state, 200, 100);
			expect(state.inputTokens).toBe(300);
			expect(state.outputTokens).toBe(150);
		});

		it('calculates instantaneous throughput', () => {
			vi.setSystemTime(1000);
			let state = createTokenState();

			vi.setSystemTime(2000); // 1 second later
			state = recordTokens(state, 100, 50); // 150 tokens in 1 second

			expect(state.throughputHistory[0]).toBe(150); // 150 tok/s
		});

		it('maintains throughput history within max samples', () => {
			let state = createTokenState({ maxHistorySamples: 3 });

			vi.setSystemTime(1000);
			state = recordTokens(state, 10, 10);

			vi.setSystemTime(2000);
			state = recordTokens(state, 10, 10);

			vi.setSystemTime(3000);
			state = recordTokens(state, 10, 10);

			expect(state.throughputHistory).toHaveLength(3);

			vi.setSystemTime(4000);
			state = recordTokens(state, 10, 10);

			expect(state.throughputHistory).toHaveLength(3);
			// First sample should be removed
		});

		it('updates last update time', () => {
			vi.setSystemTime(1000);
			let state = createTokenState();

			vi.setSystemTime(2000);
			state = recordTokens(state, 10, 10);

			expect(state.lastUpdateTime).toBe(2000);
		});

		it('handles zero elapsed time gracefully', () => {
			vi.setSystemTime(1000);
			let state = createTokenState();
			state = recordTokens(state, 100, 50);

			expect(state.throughputHistory[0]).toBe(0);
		});
	});

	describe('getTokenStats', () => {
		it('calculates total tokens', () => {
			let state = createTokenState();
			state = recordTokens(state, 100, 50);

			const stats = getTokenStats(state);

			expect(stats.totalTokens).toBe(150);
		});

		it('calculates estimated cost correctly', () => {
			const state = createTokenState({ model: 'claude-sonnet-4-5' });
			// claude-sonnet-4-5: $0.003 per 1k input, $0.015 per 1k output
			const updatedState = recordTokens(state, 1000, 1000);

			const stats = getTokenStats(updatedState);

			// (1000/1000 * 0.003) + (1000/1000 * 0.015) = 0.003 + 0.015 = 0.018
			expect(stats.estimatedCost).toBeCloseTo(0.018);
		});

		it('calculates overall tokens per second', () => {
			vi.setSystemTime(1000);
			let state = createTokenState();

			vi.setSystemTime(2000);
			state = recordTokens(state, 50, 50);

			vi.setSystemTime(3000);
			state = recordTokens(state, 50, 50);

			const stats = getTokenStats(state);

			// 200 total tokens in 2 seconds (from 1000 to 3000) = 100 tok/s
			expect(stats.tokensPerSecond).toBeCloseTo(100);
		});

		it('returns copy of throughput history', () => {
			let state = createTokenState();
			vi.setSystemTime(1000);
			state = recordTokens(state, 100, 50);

			const stats = getTokenStats(state);
			const history = stats.throughputHistory;

			expect(history).toEqual(state.throughputHistory);
			expect(history).not.toBe(state.throughputHistory); // Different reference
		});

		it('calculates elapsed time', () => {
			vi.setSystemTime(1000);
			const state = createTokenState();

			vi.setSystemTime(3000);
			const stats = getTokenStats(state);

			expect(stats.elapsedMs).toBe(2000);
		});

		it('handles zero elapsed time', () => {
			vi.setSystemTime(1000);
			const state = createTokenState();

			const stats = getTokenStats(state);

			expect(stats.tokensPerSecond).toBe(0);
			expect(stats.elapsedMs).toBe(0);
		});
	});

	describe('resetTokenState', () => {
		it('resets counters to zero', () => {
			let state = createTokenState();
			state = recordTokens(state, 100, 50);

			state = resetTokenState(state);

			expect(state.inputTokens).toBe(0);
			expect(state.outputTokens).toBe(0);
		});

		it('clears throughput history', () => {
			let state = createTokenState();
			vi.setSystemTime(1000);
			state = recordTokens(state, 100, 50);

			state = resetTokenState(state);

			expect(state.throughputHistory).toEqual([]);
		});

		it('resets start time and last update time', () => {
			vi.setSystemTime(1000);
			let state = createTokenState();

			vi.setSystemTime(2000);
			state = resetTokenState(state);

			expect(state.startTime).toBe(2000);
			expect(state.lastUpdateTime).toBe(2000);
		});

		it('preserves pricing configuration', () => {
			const customPricing = {
				name: 'custom',
				inputCostPer1k: 0.001,
				outputCostPer1k: 0.002,
			};
			let state = createTokenState({ pricing: customPricing });
			state = recordTokens(state, 100, 50);

			state = resetTokenState(state);

			expect(state.pricing).toEqual(customPricing);
		});

		it('preserves max history samples', () => {
			let state = createTokenState({ maxHistorySamples: 50 });
			state = recordTokens(state, 100, 50);

			state = resetTokenState(state);

			expect(state.maxHistorySamples).toBe(50);
		});
	});

	describe('formatTokenDisplay', () => {
		it('formats token counts with locale separators', () => {
			const stats = {
				inputTokens: 1000,
				outputTokens: 2000,
				totalTokens: 3000,
				estimatedCost: 0.045,
				tokensPerSecond: 150.5,
				throughputHistory: [],
				elapsedMs: 1000,
			};

			const lines = formatTokenDisplay(stats, { showCost: false, showThroughput: false });

			expect(lines[0]).toContain('1,000');
			expect(lines[1]).toContain('2,000');
			expect(lines[2]).toContain('3,000');
		});

		it('includes cost when showCost is true', () => {
			const stats = {
				inputTokens: 1000,
				outputTokens: 1000,
				totalTokens: 2000,
				estimatedCost: 0.018,
				tokensPerSecond: 100,
				throughputHistory: [],
				elapsedMs: 1000,
			};

			const lines = formatTokenDisplay(stats, { showCost: true, showThroughput: false });

			expect(lines).toHaveLength(4);
			expect(lines[3]).toContain('$0.0180');
		});

		it('includes throughput when showThroughput is true', () => {
			const stats = {
				inputTokens: 100,
				outputTokens: 50,
				totalTokens: 150,
				estimatedCost: 0.001,
				tokensPerSecond: 75.8,
				throughputHistory: [],
				elapsedMs: 1000,
			};

			const lines = formatTokenDisplay(stats, { showCost: false, showThroughput: true });

			expect(lines).toHaveLength(4);
			expect(lines[3]).toContain('75.8 tok/s');
		});

		it('includes both cost and throughput when both are true', () => {
			const stats = {
				inputTokens: 100,
				outputTokens: 50,
				totalTokens: 150,
				estimatedCost: 0.001,
				tokensPerSecond: 75,
				throughputHistory: [],
				elapsedMs: 1000,
			};

			const lines = formatTokenDisplay(stats, { showCost: true, showThroughput: true });

			expect(lines).toHaveLength(5);
			expect(lines[3]).toContain('$');
			expect(lines[4]).toContain('tok/s');
		});
	});

	describe('createTokenTracker widget', () => {
		it('creates widget with default config', () => {
			const tracker = createTokenTracker(world);

			expect(tracker.eid).toBeGreaterThanOrEqual(0);
			expect(isTokenTracker(world, tracker.eid)).toBe(true);
		});

		it('creates widget with custom config', () => {
			const config: TokenTrackerConfig = {
				x: 10,
				y: 5,
				width: 50,
				height: 8,
				model: 'claude-opus-4-6',
				showCost: true,
				showThroughput: true,
				showSparkline: true,
			};

			const tracker = createTokenTracker(world, config);

			expect(isTokenTracker(world, tracker.eid)).toBe(true);
		});

		it('addTokens records token usage', () => {
			const tracker = createTokenTracker(world);

			tracker.addTokens(100, 50);
			const stats = tracker.getStats();

			expect(stats.inputTokens).toBe(100);
			expect(stats.outputTokens).toBe(50);
			expect(stats.totalTokens).toBe(150);
		});

		it('addTokens is chainable', () => {
			const tracker = createTokenTracker(world);

			const result = tracker.addTokens(100, 50).addTokens(50, 25);

			expect(result).toBe(tracker);
			expect(tracker.getStats().totalTokens).toBe(225);
		});

		it('setModelPricing updates pricing', () => {
			const tracker = createTokenTracker(world, { model: 'claude-sonnet-4-5' });

			tracker.addTokens(1000, 1000);
			const beforeCost = tracker.getStats().estimatedCost;

			tracker.setModelPricing('claude-opus-4-6', 0.015, 0.075);
			const afterCost = tracker.getStats().estimatedCost;

			expect(afterCost).not.toBe(beforeCost);
			// New cost: (1000/1000 * 0.015) + (1000/1000 * 0.075) = 0.09
			expect(afterCost).toBeCloseTo(0.09);
		});

		it('setModelPricing is chainable', () => {
			const tracker = createTokenTracker(world);

			const result = tracker.setModelPricing('custom', 0.001, 0.002);

			expect(result).toBe(tracker);
		});

		it('getStats returns current statistics', () => {
			vi.setSystemTime(1000);
			const tracker = createTokenTracker(world);

			vi.setSystemTime(2000);
			tracker.addTokens(100, 50);

			const stats = tracker.getStats();

			expect(stats.inputTokens).toBe(100);
			expect(stats.outputTokens).toBe(50);
			expect(stats.totalTokens).toBe(150);
			expect(stats.estimatedCost).toBeGreaterThan(0);
			expect(stats.elapsedMs).toBe(1000);
		});

		it('reset clears all counters', () => {
			const tracker = createTokenTracker(world);

			tracker.addTokens(100, 50);
			tracker.reset();

			const stats = tracker.getStats();

			expect(stats.inputTokens).toBe(0);
			expect(stats.outputTokens).toBe(0);
			expect(stats.totalTokens).toBe(0);
			expect(stats.throughputHistory).toEqual([]);
		});

		it('reset is chainable', () => {
			const tracker = createTokenTracker(world);

			const result = tracker.reset();

			expect(result).toBe(tracker);
		});

		it('destroy removes the widget', () => {
			const tracker = createTokenTracker(world);
			const eid = tracker.eid;

			tracker.destroy();

			expect(isTokenTracker(world, eid)).toBe(false);
		});
	});

	describe('DEFAULT_MODEL_PRICING', () => {
		it('includes claude-opus-4-6 pricing', () => {
			const pricing = DEFAULT_MODEL_PRICING['claude-opus-4-6'];

			expect(pricing).toBeDefined();
			expect(pricing?.inputCostPer1k).toBe(0.015);
			expect(pricing?.outputCostPer1k).toBe(0.075);
		});

		it('includes claude-sonnet-4-5 pricing', () => {
			const pricing = DEFAULT_MODEL_PRICING['claude-sonnet-4-5'];

			expect(pricing).toBeDefined();
			expect(pricing?.inputCostPer1k).toBe(0.003);
			expect(pricing?.outputCostPer1k).toBe(0.015);
		});

		it('includes claude-haiku-4-5 pricing', () => {
			const pricing = DEFAULT_MODEL_PRICING['claude-haiku-4-5'];

			expect(pricing).toBeDefined();
			expect(pricing?.inputCostPer1k).toBe(0.0008);
			expect(pricing?.outputCostPer1k).toBe(0.004);
		});

		it('includes gpt-4o pricing', () => {
			const pricing = DEFAULT_MODEL_PRICING['gpt-4o'];

			expect(pricing).toBeDefined();
			expect(pricing?.inputCostPer1k).toBe(0.0025);
			expect(pricing?.outputCostPer1k).toBe(0.01);
		});

		it('includes gpt-4o-mini pricing', () => {
			const pricing = DEFAULT_MODEL_PRICING['gpt-4o-mini'];

			expect(pricing).toBeDefined();
			expect(pricing?.inputCostPer1k).toBe(0.00015);
			expect(pricing?.outputCostPer1k).toBe(0.0006);
		});
	});

	describe('isTokenTracker', () => {
		it('returns true for token tracker entities', () => {
			const tracker = createTokenTracker(world);

			expect(isTokenTracker(world, tracker.eid)).toBe(true);
		});

		it('returns false for non-token-tracker entities', () => {
			expect(isTokenTracker(world, 999)).toBe(false);
		});

		it('returns false after widget is destroyed', () => {
			const tracker = createTokenTracker(world);
			const eid = tracker.eid;

			tracker.destroy();

			expect(isTokenTracker(world, eid)).toBe(false);
		});
	});

	describe('integration scenarios', () => {
		it('tracks multiple token additions accurately', () => {
			const tracker = createTokenTracker(world, { model: 'claude-sonnet-4-5' });

			tracker.addTokens(100, 50).addTokens(200, 100).addTokens(50, 25);

			const stats = tracker.getStats();

			expect(stats.inputTokens).toBe(350);
			expect(stats.outputTokens).toBe(175);
			expect(stats.totalTokens).toBe(525);
		});

		it('calculates accurate cost for multiple models', () => {
			const opusTracker = createTokenTracker(world, { model: 'claude-opus-4-6' });
			const sonnetTracker = createTokenTracker(world, { model: 'claude-sonnet-4-5' });

			opusTracker.addTokens(1000, 1000);
			sonnetTracker.addTokens(1000, 1000);

			const opusStats = opusTracker.getStats();
			const sonnetStats = sonnetTracker.getStats();

			// Opus: (1000/1000 * 0.015) + (1000/1000 * 0.075) = 0.09
			expect(opusStats.estimatedCost).toBeCloseTo(0.09);

			// Sonnet: (1000/1000 * 0.003) + (1000/1000 * 0.015) = 0.018
			expect(sonnetStats.estimatedCost).toBeCloseTo(0.018);
		});

		it('maintains separate state for multiple widgets', () => {
			const tracker1 = createTokenTracker(world);
			const tracker2 = createTokenTracker(world);

			tracker1.addTokens(100, 50);
			tracker2.addTokens(200, 100);

			expect(tracker1.getStats().totalTokens).toBe(150);
			expect(tracker2.getStats().totalTokens).toBe(300);
		});
	});
});
