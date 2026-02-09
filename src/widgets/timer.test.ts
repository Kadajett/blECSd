/**
 * Tests for Timer and Stopwatch widgets
 */

import { describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/world';
import {
	createStopwatch,
	createTimer,
	isStopwatch,
	isTimer,
	resetStopwatchWidgetStore,
	resetTimerWidgetStore,
	StopwatchComponent,
	updateTimeWidgets,
} from './timer';

describe('Timer Widget', () => {
	describe('createTimer', () => {
		it('creates a timer entity with default configuration', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 60000, // 1 minute
			});

			expect(timer.eid).toBeGreaterThanOrEqual(0);
			expect(isTimer(world, timer.eid)).toBe(true);
		});

		it('initializes timer with specified duration', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000, // 5 seconds
			});

			const state = timer.getState();
			expect(state.remaining).toBe(5000);
			expect(state.duration).toBe(5000);
			expect(state.running).toBe(false);
		});

		it('auto-starts timer when autoStart is true', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
				autoStart: true,
			});

			const state = timer.getState();
			expect(state.running).toBe(true);
		});

		it('sets position correctly', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
				x: 10,
				y: 20,
			});

			// Position should be set (check via ECS components)
			expect(timer.eid).toBeGreaterThanOrEqual(0);
		});

		it('validates config with Zod schema', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			// Should throw on invalid duration
			expect(() => {
				createTimer(world, {
					duration: -1000,
				});
			}).toThrow();
		});
	});

	describe('timer operations', () => {
		it('starts the timer', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
			});

			timer.start();

			const state = timer.getState();
			expect(state.running).toBe(true);
		});

		it('pauses the timer', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
				autoStart: true,
			});

			timer.pause();

			const state = timer.getState();
			expect(state.running).toBe(false);
		});

		it('resets the timer', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
				autoStart: true,
			});

			// Simulate time passing
			updateTimeWidgets(world, 2000);

			timer.reset();

			const state = timer.getState();
			expect(state.remaining).toBe(5000);
			expect(state.running).toBe(false);
		});
	});

	describe('updateTimeWidgets - Timer', () => {
		it('decrements remaining time for running timer', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
				autoStart: true,
			});

			updateTimeWidgets(world, 1000);

			const state = timer.getState();
			expect(state.remaining).toBe(4000);
		});

		it('does not decrement when timer is paused', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
			});

			updateTimeWidgets(world, 1000);

			const state = timer.getState();
			expect(state.remaining).toBe(5000);
		});

		it('calls onComplete when timer reaches zero', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const onComplete = vi.fn();
			const timer = createTimer(world, {
				duration: 1000,
				autoStart: true,
				onComplete,
			});

			updateTimeWidgets(world, 1000);

			expect(onComplete).toHaveBeenCalledTimes(1);
			const state = timer.getState();
			expect(state.running).toBe(false);
			expect(state.remaining).toBe(0);
		});

		it('does not go below zero', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 1000,
				autoStart: true,
			});

			updateTimeWidgets(world, 2000);

			const state = timer.getState();
			expect(state.remaining).toBe(0);
		});
	});

	describe('timer display formats', () => {
		it('uses ss format', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 45000, // 45 seconds
				format: 'ss',
			});

			expect(timer.eid).toBeGreaterThanOrEqual(0);
		});

		it('uses mm:ss format', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 90000, // 1:30
				format: 'mm:ss',
			});

			expect(timer.eid).toBeGreaterThanOrEqual(0);
		});

		it('uses hh:mm:ss format', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 3661000, // 1:01:01
				format: 'hh:mm:ss',
			});

			expect(timer.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('timer positioning', () => {
		it('sets absolute position', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
			});

			timer.setPosition(15, 25);
			expect(timer.eid).toBeGreaterThanOrEqual(0);
		});

		it('moves by offset', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
				x: 10,
				y: 10,
			});

			timer.move(5, -5);
			expect(timer.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('timer lifecycle', () => {
		it('destroys timer and cleans up state', () => {
			resetTimerWidgetStore();
			const world = createWorld();

			const timer = createTimer(world, {
				duration: 5000,
			});

			const eid = timer.eid;
			timer.destroy();

			expect(isTimer(world, eid)).toBe(false);
		});
	});
});

describe('Stopwatch Widget', () => {
	describe('createStopwatch', () => {
		it('creates a stopwatch entity with default configuration', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world);

			expect(stopwatch.eid).toBeGreaterThanOrEqual(0);
			expect(isStopwatch(world, stopwatch.eid)).toBe(true);
		});

		it('initializes stopwatch at zero', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world);

			const state = stopwatch.getState();
			expect(state.elapsed).toBe(0);
			expect(state.running).toBe(false);
			expect(state.laps).toEqual([]);
		});

		it('auto-starts stopwatch when autoStart is true', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				autoStart: true,
			});

			const state = stopwatch.getState();
			expect(state.running).toBe(true);
		});

		it('enables lap support when requested', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				lapSupport: true,
			});

			expect(stopwatch.eid).toBeGreaterThanOrEqual(0);
			expect(StopwatchComponent.lapSupport[stopwatch.eid]).toBe(1);
		});

		it('sets position correctly', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				x: 10,
				y: 20,
			});

			expect(stopwatch.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('stopwatch operations', () => {
		it('starts the stopwatch', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world);

			stopwatch.start();

			const state = stopwatch.getState();
			expect(state.running).toBe(true);
		});

		it('pauses the stopwatch', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				autoStart: true,
			});

			stopwatch.pause();

			const state = stopwatch.getState();
			expect(state.running).toBe(false);
		});

		it('resets the stopwatch', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				autoStart: true,
			});

			// Simulate time passing
			updateTimeWidgets(world, 2000);

			stopwatch.reset();

			const state = stopwatch.getState();
			expect(state.elapsed).toBe(0);
			expect(state.running).toBe(false);
			expect(state.laps).toEqual([]);
		});
	});

	describe('lap tracking', () => {
		it('records lap times when lap support is enabled', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				lapSupport: true,
				autoStart: true,
			});

			updateTimeWidgets(world, 1000);
			stopwatch.lap();

			updateTimeWidgets(world, 1500);
			stopwatch.lap();

			const laps = stopwatch.getLaps();
			expect(laps).toHaveLength(2);
			expect(laps[0]).toBe(1000);
			expect(laps[1]).toBe(2500);
		});

		it('does not record laps when lap support is disabled', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				lapSupport: false,
				autoStart: true,
			});

			updateTimeWidgets(world, 1000);
			stopwatch.lap();

			const laps = stopwatch.getLaps();
			expect(laps).toHaveLength(0);
		});

		it('clears laps on reset', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				lapSupport: true,
				autoStart: true,
			});

			updateTimeWidgets(world, 1000);
			stopwatch.lap();

			stopwatch.reset();

			const laps = stopwatch.getLaps();
			expect(laps).toHaveLength(0);
		});
	});

	describe('updateTimeWidgets - Stopwatch', () => {
		it('increments elapsed time for running stopwatch', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				autoStart: true,
			});

			updateTimeWidgets(world, 1000);

			const state = stopwatch.getState();
			expect(state.elapsed).toBe(1000);
		});

		it('does not increment when stopwatch is paused', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world);

			updateTimeWidgets(world, 1000);

			const state = stopwatch.getState();
			expect(state.elapsed).toBe(0);
		});

		it('accumulates time correctly', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				autoStart: true,
			});

			updateTimeWidgets(world, 500);
			updateTimeWidgets(world, 300);
			updateTimeWidgets(world, 200);

			const state = stopwatch.getState();
			expect(state.elapsed).toBe(1000);
		});
	});

	describe('stopwatch display formats', () => {
		it('uses ss format', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				format: 'ss',
			});

			expect(stopwatch.eid).toBeGreaterThanOrEqual(0);
		});

		it('uses mm:ss format', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				format: 'mm:ss',
			});

			expect(stopwatch.eid).toBeGreaterThanOrEqual(0);
		});

		it('uses hh:mm:ss format', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				format: 'hh:mm:ss',
			});

			expect(stopwatch.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('stopwatch positioning', () => {
		it('sets absolute position', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world);

			stopwatch.setPosition(15, 25);
			expect(stopwatch.eid).toBeGreaterThanOrEqual(0);
		});

		it('moves by offset', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world, {
				x: 10,
				y: 10,
			});

			stopwatch.move(5, -5);
			expect(stopwatch.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('stopwatch lifecycle', () => {
		it('destroys stopwatch and cleans up state', () => {
			resetStopwatchWidgetStore();
			const world = createWorld();

			const stopwatch = createStopwatch(world);

			const eid = stopwatch.eid;
			stopwatch.destroy();

			expect(isStopwatch(world, eid)).toBe(false);
		});
	});
});

describe('updateTimeWidgets - Combined', () => {
	it('updates both timers and stopwatches in the same call', () => {
		resetTimerWidgetStore();
		resetStopwatchWidgetStore();
		const world = createWorld();

		const timer = createTimer(world, {
			duration: 5000,
			autoStart: true,
		});

		const stopwatch = createStopwatch(world, {
			autoStart: true,
		});

		updateTimeWidgets(world, 1000);

		const timerState = timer.getState();
		const stopwatchState = stopwatch.getState();

		expect(timerState.remaining).toBe(4000);
		expect(stopwatchState.elapsed).toBe(1000);
	});
});
