/**
 * Tests for Timer and Delay components.
 * @module components/timer.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	clearTimerCallbacks,
	getTimer,
	getTimerProgress,
	hasTimer,
	isTimerComplete,
	isTimerRunning,
	onTimerComplete,
	onTimerFire,
	pauseTimer,
	removeTimer,
	resetTimer,
	resetTimerStore,
	resumeTimer,
	setTimer,
	startTimer,
	stopTimer,
	TIMER_INFINITE,
	updateTimers,
} from './timer';

describe('Timer component', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetTimerStore();
	});

	afterEach(() => {
		resetTimerStore();
	});

	// =========================================================================
	// setTimer / getTimer
	// =========================================================================

	describe('setTimer', () => {
		it('creates a timer with specified duration', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 3 });

			const timer = getTimer(world, eid);
			expect(timer).toBeDefined();
			expect(timer!.duration).toBe(3);
			expect(timer!.remaining).toBe(3);
			expect(timer!.elapsed).toBe(0);
			expect(timer!.active).toBe(true);
			expect(timer!.paused).toBe(false);
		});

		it('sets repeat count', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1, repeat: 5 });

			const timer = getTimer(world, eid);
			expect(timer!.repeat).toBe(5);
			expect(timer!.repeatCount).toBe(0);
		});

		it('supports infinite repeat', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1, repeat: TIMER_INFINITE });

			const timer = getTimer(world, eid);
			expect(timer!.repeat).toBe(TIMER_INFINITE);
		});

		it('supports autoDestroy option', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1, autoDestroy: true });

			const timer = getTimer(world, eid);
			expect(timer!.autoDestroy).toBe(true);
		});

		it('can start inactive', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1, active: false });

			const timer = getTimer(world, eid);
			expect(timer!.active).toBe(false);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			const result = setTimer(world, eid, { duration: 1 });
			expect(result).toBe(eid);
		});
	});

	// =========================================================================
	// getTimer / hasTimer
	// =========================================================================

	describe('getTimer / hasTimer', () => {
		it('returns undefined for entity without timer', () => {
			const eid = addEntity(world);
			expect(getTimer(world, eid)).toBeUndefined();
		});

		it('hasTimer returns false for entity without timer', () => {
			const eid = addEntity(world);
			expect(hasTimer(world, eid)).toBe(false);
		});

		it('hasTimer returns true for entity with timer', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });
			expect(hasTimer(world, eid)).toBe(true);
		});
	});

	// =========================================================================
	// Timer controls
	// =========================================================================

	describe('startTimer / pauseTimer / resumeTimer / stopTimer / resetTimer', () => {
		it('pauses and resumes a timer', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 5 });

			pauseTimer(world, eid);
			expect(getTimer(world, eid)!.paused).toBe(true);

			resumeTimer(world, eid);
			expect(getTimer(world, eid)!.paused).toBe(false);
		});

		it('stops a timer and resets it', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 5 });

			updateTimers(world, 2);
			stopTimer(world, eid);

			const timer = getTimer(world, eid);
			expect(timer!.active).toBe(false);
			expect(timer!.elapsed).toBe(0);
			expect(timer!.remaining).toBe(5);
		});

		it('resets a timer and starts it', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 5 });

			updateTimers(world, 3);
			resetTimer(world, eid);

			const timer = getTimer(world, eid);
			expect(timer!.active).toBe(true);
			expect(timer!.elapsed).toBe(0);
			expect(timer!.remaining).toBe(5);
			expect(timer!.repeatCount).toBe(0);
		});

		it('startTimer activates an inactive timer', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1, active: false });

			startTimer(world, eid);
			expect(getTimer(world, eid)!.active).toBe(true);
		});

		it('control functions are no-ops for entities without timer', () => {
			const eid = addEntity(world);
			// Should not throw
			startTimer(world, eid);
			pauseTimer(world, eid);
			resumeTimer(world, eid);
			stopTimer(world, eid);
			resetTimer(world, eid);
		});
	});

	// =========================================================================
	// removeTimer
	// =========================================================================

	describe('removeTimer', () => {
		it('removes the timer component', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });
			expect(hasTimer(world, eid)).toBe(true);

			removeTimer(world, eid);
			expect(hasTimer(world, eid)).toBe(false);
		});

		it('clears callbacks on removal', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });
			const callback = vi.fn();
			onTimerFire(world, eid, callback);

			removeTimer(world, eid);

			// Re-add timer and update past duration: callback should not fire
			setTimer(world, eid, { duration: 1 });
			updateTimers(world, 2);
			expect(callback).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// isTimerRunning / isTimerComplete / getTimerProgress
	// =========================================================================

	describe('state queries', () => {
		it('isTimerRunning is true for active non-paused timers', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });
			expect(isTimerRunning(world, eid)).toBe(true);
		});

		it('isTimerRunning is false for paused timers', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });
			pauseTimer(world, eid);
			expect(isTimerRunning(world, eid)).toBe(false);
		});

		it('isTimerRunning is false for entities without timer', () => {
			const eid = addEntity(world);
			expect(isTimerRunning(world, eid)).toBe(false);
		});

		it('isTimerComplete returns true after timer finishes', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });
			updateTimers(world, 2);
			expect(isTimerComplete(world, eid)).toBe(true);
		});

		it('isTimerComplete returns false for entity without timer', () => {
			const eid = addEntity(world);
			expect(isTimerComplete(world, eid)).toBe(false);
		});

		it('getTimerProgress returns 0 to 1 range', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 10 });

			expect(getTimerProgress(world, eid)).toBeCloseTo(0, 2);

			updateTimers(world, 5);
			expect(getTimerProgress(world, eid)).toBeCloseTo(0.5, 2);

			updateTimers(world, 3);
			expect(getTimerProgress(world, eid)).toBeCloseTo(0.8, 2);
		});

		it('getTimerProgress returns 0 for entity without timer', () => {
			const eid = addEntity(world);
			expect(getTimerProgress(world, eid)).toBe(0);
		});

		it('getTimerProgress returns 0 for zero-duration timer', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 0 });
			expect(getTimerProgress(world, eid)).toBe(0);
		});
	});

	// =========================================================================
	// updateTimers
	// =========================================================================

	describe('updateTimers', () => {
		it('counts down active timers', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 5 });

			updateTimers(world, 2);

			const timer = getTimer(world, eid);
			expect(timer!.elapsed).toBeCloseTo(2);
			expect(timer!.remaining).toBeCloseTo(3);
		});

		it('fires one-shot timer when duration reached', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });

			const callback = vi.fn();
			onTimerFire(world, eid, callback);

			const fired = updateTimers(world, 1.5);

			expect(fired).toHaveLength(1);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(getTimer(world, eid)!.active).toBe(false);
		});

		it('does not count paused timers', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 5 });
			pauseTimer(world, eid);

			updateTimers(world, 3);

			const timer = getTimer(world, eid);
			expect(timer!.remaining).toBe(5);
			expect(timer!.elapsed).toBe(0);
		});

		it('does not count inactive timers', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 5, active: false });

			updateTimers(world, 3);

			const timer = getTimer(world, eid);
			expect(timer!.remaining).toBe(5);
		});

		it('handles repeating timers', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1, repeat: 2 });

			const callback = vi.fn();
			onTimerFire(world, eid, callback);

			// First fire
			updateTimers(world, 1.5);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(getTimer(world, eid)!.active).toBe(true);
			expect(getTimer(world, eid)!.repeatCount).toBe(1);

			// Second fire
			updateTimers(world, 1.5);
			expect(callback).toHaveBeenCalledTimes(2);
			expect(getTimer(world, eid)!.active).toBe(true);

			// Third fire (should complete: 3 fires total, repeat=2 means 1 initial + 2 repeats)
			updateTimers(world, 1.5);
			expect(callback).toHaveBeenCalledTimes(3);
			expect(getTimer(world, eid)!.active).toBe(false);
		});

		it('handles infinite repeating timers', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 0.5, repeat: TIMER_INFINITE });

			const callback = vi.fn();
			onTimerFire(world, eid, callback);

			for (let i = 0; i < 10; i++) {
				updateTimers(world, 1);
			}

			expect(callback).toHaveBeenCalledTimes(10);
			expect(getTimer(world, eid)!.active).toBe(true);
		});

		it('calls onComplete when timer finishes', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });

			const onComplete = vi.fn();
			onTimerComplete(world, eid, onComplete);

			updateTimers(world, 2);

			expect(onComplete).toHaveBeenCalledTimes(1);
		});

		it('auto-destroys timer when autoDestroy is set', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1, autoDestroy: true });

			updateTimers(world, 2);

			expect(hasTimer(world, eid)).toBe(false);
		});

		it('handles multiple timers simultaneously', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			setTimer(world, eid1, { duration: 1 });
			setTimer(world, eid2, { duration: 2 });

			const cb1 = vi.fn();
			const cb2 = vi.fn();
			onTimerFire(world, eid1, cb1);
			onTimerFire(world, eid2, cb2);

			updateTimers(world, 1.5);
			expect(cb1).toHaveBeenCalledTimes(1);
			expect(cb2).not.toHaveBeenCalled();

			updateTimers(world, 1);
			expect(cb2).toHaveBeenCalledTimes(1);
		});
	});

	// =========================================================================
	// Callbacks
	// =========================================================================

	describe('callbacks', () => {
		it('clearTimerCallbacks removes all callbacks', () => {
			const eid = addEntity(world);
			setTimer(world, eid, { duration: 1 });

			const callback = vi.fn();
			onTimerFire(world, eid, callback);
			clearTimerCallbacks(world, eid);

			updateTimers(world, 2);
			expect(callback).not.toHaveBeenCalled();
		});
	});
});
