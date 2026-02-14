/**
 * Tests for slow frame detection utilities.
 */

import { describe, expect, it } from 'vitest';
import {
	createSlowFrameDetector,
	renderSlowFrameWarning,
	type SlowFrameConfig,
	SlowFrameConfigSchema,
} from './slowFrame';

describe('SlowFrameConfigSchema', () => {
	it('validates valid config', () => {
		const config: SlowFrameConfig = {
			budgetMs: 16.67,
			historySize: 120,
			warningThreshold: 1.5,
		};
		expect(() => SlowFrameConfigSchema.parse(config)).not.toThrow();
	});

	it('rejects negative budgetMs', () => {
		const config = {
			budgetMs: -1,
			historySize: 120,
			warningThreshold: 1.5,
		};
		expect(() => SlowFrameConfigSchema.parse(config)).toThrow();
	});

	it('rejects non-integer historySize', () => {
		const config = {
			budgetMs: 16.67,
			historySize: 120.5,
			warningThreshold: 1.5,
		};
		expect(() => SlowFrameConfigSchema.parse(config)).toThrow();
	});

	it('rejects negative warningThreshold', () => {
		const config = {
			budgetMs: 16.67,
			historySize: 120,
			warningThreshold: -0.5,
		};
		expect(() => SlowFrameConfigSchema.parse(config)).toThrow();
	});

	it('rejects infinite budgetMs', () => {
		const config = {
			budgetMs: Number.POSITIVE_INFINITY,
			historySize: 120,
			warningThreshold: 1.5,
		};
		expect(() => SlowFrameConfigSchema.parse(config)).toThrow();
	});
});

describe('createSlowFrameDetector', () => {
	it('creates detector with default config', () => {
		const detector = createSlowFrameDetector();
		const stats = detector.getStats();

		expect(stats.worstFrameMs).toBe(0);
		expect(stats.averageFrameMs).toBe(0);
		expect(stats.slowFrameCount).toBe(0);
		expect(stats.totalFrames).toBe(0);
		expect(stats.isCurrentlySlow).toBe(false);
		expect(stats.histogram).toEqual([]);
	});

	it('creates detector with custom config', () => {
		const detector = createSlowFrameDetector({
			budgetMs: 33.33, // 30fps
			historySize: 60,
			warningThreshold: 2.0,
		});

		// Fast frame (under budget)
		const isSlow = detector.check(20);
		expect(isSlow).toBe(false);
	});

	it('detects slow frames above threshold', () => {
		const detector = createSlowFrameDetector({
			budgetMs: 16.67,
			warningThreshold: 1.5,
		});

		// Fast frame
		expect(detector.check(10)).toBe(false);

		// Slow frame (16.67 * 1.5 = 25.0ms threshold)
		expect(detector.check(30)).toBe(true);

		const stats = detector.getStats();
		expect(stats.isCurrentlySlow).toBe(true);
		expect(stats.slowFrameCount).toBe(1);
		expect(stats.totalFrames).toBe(2);
	});

	it('tracks frame history', () => {
		const detector = createSlowFrameDetector({
			historySize: 3,
		});

		detector.check(10);
		detector.check(15);
		detector.check(20);

		const stats = detector.getStats();
		expect(stats.histogram).toEqual([10, 15, 20]);
		expect(stats.totalFrames).toBe(3);
	});

	it('trims history to max size', () => {
		const detector = createSlowFrameDetector({
			historySize: 3,
		});

		detector.check(10);
		detector.check(15);
		detector.check(20);
		detector.check(25); // Should push out 10

		const stats = detector.getStats();
		expect(stats.histogram).toEqual([15, 20, 25]);
		expect(stats.histogram.length).toBe(3);
	});

	it('calculates average frame time correctly', () => {
		const detector = createSlowFrameDetector();

		detector.check(10);
		detector.check(20);
		detector.check(30);

		const stats = detector.getStats();
		expect(stats.averageFrameMs).toBe(20);
	});

	it('tracks worst frame time', () => {
		const detector = createSlowFrameDetector();

		detector.check(10);
		detector.check(50);
		detector.check(20);
		detector.check(30);

		const stats = detector.getStats();
		expect(stats.worstFrameMs).toBe(50);
	});

	it('resets all state', () => {
		const detector = createSlowFrameDetector();

		detector.check(10);
		detector.check(50);
		detector.check(20);

		detector.reset();

		const stats = detector.getStats();
		expect(stats.worstFrameMs).toBe(0);
		expect(stats.averageFrameMs).toBe(0);
		expect(stats.slowFrameCount).toBe(0);
		expect(stats.totalFrames).toBe(0);
		expect(stats.isCurrentlySlow).toBe(false);
		expect(stats.histogram).toEqual([]);
	});

	it('handles 0ms frames', () => {
		const detector = createSlowFrameDetector();

		const isSlow = detector.check(0);
		expect(isSlow).toBe(false);

		const stats = detector.getStats();
		expect(stats.averageFrameMs).toBe(0);
		expect(stats.worstFrameMs).toBe(0);
	});

	it('handles huge frame times', () => {
		const detector = createSlowFrameDetector();

		const isSlow = detector.check(1000);
		expect(isSlow).toBe(true);

		const stats = detector.getStats();
		expect(stats.worstFrameMs).toBe(1000);
		expect(stats.averageFrameMs).toBe(1000);
	});

	it('updates isCurrentlySlow correctly', () => {
		const detector = createSlowFrameDetector({
			budgetMs: 16.67,
			warningThreshold: 1.5,
		});

		// Fast frame
		detector.check(10);
		expect(detector.getStats().isCurrentlySlow).toBe(false);

		// Slow frame
		detector.check(30);
		expect(detector.getStats().isCurrentlySlow).toBe(true);

		// Fast frame again
		detector.check(10);
		expect(detector.getStats().isCurrentlySlow).toBe(false);
	});

	it('counts slow frames correctly', () => {
		const detector = createSlowFrameDetector({
			budgetMs: 16.67,
			warningThreshold: 1.5,
		});

		detector.check(10); // fast
		detector.check(30); // slow
		detector.check(15); // fast
		detector.check(40); // slow
		detector.check(50); // slow

		const stats = detector.getStats();
		expect(stats.slowFrameCount).toBe(3);
		expect(stats.totalFrames).toBe(5);
	});
});

describe('renderSlowFrameWarning', () => {
	it('returns empty string when not currently slow', () => {
		const stats = {
			worstFrameMs: 10,
			averageFrameMs: 10,
			slowFrameCount: 0,
			totalFrames: 1,
			isCurrentlySlow: false,
			histogram: [10],
		};

		const warning = renderSlowFrameWarning(stats);
		expect(warning).toBe('');
	});

	it('returns ANSI-formatted warning when currently slow', () => {
		const stats = {
			worstFrameMs: 50,
			averageFrameMs: 30,
			slowFrameCount: 1,
			totalFrames: 2,
			isCurrentlySlow: true,
			histogram: [10, 50],
		};

		const warning = renderSlowFrameWarning(stats);
		expect(warning).toContain('SLOW FRAME');
		expect(warning).toContain('50.00ms');
		expect(warning).toContain('avg: 30.00ms');
		expect(warning).toContain('worst: 50.00ms');
		expect(warning).toContain('\x1b[31m'); // Red color
		expect(warning).toContain('\x1b[1m'); // Bold
		expect(warning).toContain('\x1b[0m'); // Reset
	});

	it('formats timing values correctly', () => {
		const stats = {
			worstFrameMs: 123.456,
			averageFrameMs: 45.678,
			slowFrameCount: 1,
			totalFrames: 1,
			isCurrentlySlow: true,
			histogram: [123.456],
		};

		const warning = renderSlowFrameWarning(stats);
		expect(warning).toContain('123.46ms'); // 2 decimal places
		expect(warning).toContain('avg: 45.68ms');
		expect(warning).toContain('worst: 123.46ms');
	});

	it('handles empty histogram gracefully', () => {
		const stats = {
			worstFrameMs: 0,
			averageFrameMs: 0,
			slowFrameCount: 0,
			totalFrames: 0,
			isCurrentlySlow: true, // Edge case: slow but empty
			histogram: [],
		};

		const warning = renderSlowFrameWarning(stats);
		expect(warning).toContain('0.00ms');
	});
});
