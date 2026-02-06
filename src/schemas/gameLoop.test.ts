import { describe, expect, it } from 'vitest';
import { FixedTimestepConfigSchema, GameLoopOptionsSchema, LoopStatsSchema } from './gameLoop';

describe('Game Loop Schemas', () => {
	describe('FixedTimestepConfigSchema', () => {
		it('should accept valid config', () => {
			expect(() =>
				FixedTimestepConfigSchema.parse({
					tickRate: 60,
					maxUpdatesPerFrame: 5,
					interpolate: true,
				}),
			).not.toThrow();
		});

		it('should accept boundary values', () => {
			expect(() =>
				FixedTimestepConfigSchema.parse({
					tickRate: 1,
					maxUpdatesPerFrame: 1,
					interpolate: false,
				}),
			).not.toThrow();
			expect(() =>
				FixedTimestepConfigSchema.parse({
					tickRate: 240,
					maxUpdatesPerFrame: 30,
					interpolate: true,
				}),
			).not.toThrow();
		});

		it('should reject tickRate out of range', () => {
			expect(() =>
				FixedTimestepConfigSchema.parse({
					tickRate: 0,
					maxUpdatesPerFrame: 5,
					interpolate: true,
				}),
			).toThrow();
			expect(() =>
				FixedTimestepConfigSchema.parse({
					tickRate: 241,
					maxUpdatesPerFrame: 5,
					interpolate: true,
				}),
			).toThrow();
		});

		it('should reject maxUpdatesPerFrame out of range', () => {
			expect(() =>
				FixedTimestepConfigSchema.parse({
					tickRate: 60,
					maxUpdatesPerFrame: 0,
					interpolate: true,
				}),
			).toThrow();
			expect(() =>
				FixedTimestepConfigSchema.parse({
					tickRate: 60,
					maxUpdatesPerFrame: 31,
					interpolate: true,
				}),
			).toThrow();
		});

		it('should reject non-integer tickRate', () => {
			expect(() =>
				FixedTimestepConfigSchema.parse({
					tickRate: 59.5,
					maxUpdatesPerFrame: 5,
					interpolate: true,
				}),
			).toThrow();
		});
	});

	describe('GameLoopOptionsSchema', () => {
		it('should accept valid options', () => {
			expect(() =>
				GameLoopOptionsSchema.parse({
					targetFPS: 60,
					fixedTimestep: true,
					maxDeltaTime: 0.1,
				}),
			).not.toThrow();
		});

		it('should accept empty options', () => {
			expect(() => GameLoopOptionsSchema.parse({})).not.toThrow();
		});

		it('should accept uncapped FPS', () => {
			expect(() => GameLoopOptionsSchema.parse({ targetFPS: 0 })).not.toThrow();
		});

		it('should accept fixed timestep mode', () => {
			expect(() =>
				GameLoopOptionsSchema.parse({
					fixedTimestepMode: {
						tickRate: 60,
						maxUpdatesPerFrame: 5,
						interpolate: true,
					},
				}),
			).not.toThrow();
		});

		it('should reject negative targetFPS', () => {
			expect(() => GameLoopOptionsSchema.parse({ targetFPS: -1 })).toThrow();
		});

		it('should reject targetFPS over 240', () => {
			expect(() => GameLoopOptionsSchema.parse({ targetFPS: 300 })).toThrow();
		});

		it('should reject maxDeltaTime over 1 second', () => {
			expect(() => GameLoopOptionsSchema.parse({ maxDeltaTime: 2 })).toThrow();
		});

		it('should reject non-positive maxDeltaTime', () => {
			expect(() => GameLoopOptionsSchema.parse({ maxDeltaTime: 0 })).toThrow();
			expect(() => GameLoopOptionsSchema.parse({ maxDeltaTime: -0.1 })).toThrow();
		});
	});

	describe('LoopStatsSchema', () => {
		it('should accept valid stats', () => {
			expect(() =>
				LoopStatsSchema.parse({
					fps: 60,
					frameTime: 16.67,
					frameCount: 3600,
					runningTime: 60,
					tickCount: 3600,
					ticksPerSecond: 60,
					interpolationAlpha: 0.5,
					skippedUpdates: 0,
				}),
			).not.toThrow();
		});

		it('should accept zero values', () => {
			expect(() =>
				LoopStatsSchema.parse({
					fps: 0,
					frameTime: 0,
					frameCount: 0,
					runningTime: 0,
					tickCount: 0,
					ticksPerSecond: 0,
					interpolationAlpha: 0,
					skippedUpdates: 0,
				}),
			).not.toThrow();
		});

		it('should reject negative fps', () => {
			expect(() =>
				LoopStatsSchema.parse({
					fps: -1,
					frameTime: 0,
					frameCount: 0,
					runningTime: 0,
					tickCount: 0,
					ticksPerSecond: 0,
					interpolationAlpha: 0,
					skippedUpdates: 0,
				}),
			).toThrow();
		});

		it('should reject interpolationAlpha out of range', () => {
			expect(() =>
				LoopStatsSchema.parse({
					fps: 60,
					frameTime: 16,
					frameCount: 0,
					runningTime: 0,
					tickCount: 0,
					ticksPerSecond: 0,
					interpolationAlpha: 1.5,
					skippedUpdates: 0,
				}),
			).toThrow();
		});
	});
});
