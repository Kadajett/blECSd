import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import { createBoxEntity } from '../core/entities';
import type { World } from '../core/types';
import {
	attachProgressBarBehavior,
	clearProgressBarCallbacks,
	clearProgressBarDisplay,
	completeProgress,
	DEFAULT_EMPTY_CHAR,
	DEFAULT_FILL_CHAR,
	decrementProgress,
	getProgress,
	getProgressBarDisplay,
	getProgressMax,
	getProgressMin,
	getProgressOrientation,
	getProgressPercentage,
	incrementProgress,
	isProgressBar,
	isProgressComplete,
	isShowingPercentage,
	onProgressChange,
	onProgressComplete,
	ProgressOrientation,
	renderProgressString,
	resetProgress,
	resetProgressBarStore,
	setProgress,
	setProgressBarDisplay,
	setProgressOrientation,
	setProgressRange,
	setShowPercentage,
} from './progressBar';

describe('ProgressBar Component', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		resetProgressBarStore();
	});

	describe('attachProgressBarBehavior', () => {
		it('marks an entity as a progress bar', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			expect(isProgressBar(world, eid)).toBe(true);
		});

		it('sets default values', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			expect(getProgress(eid)).toBe(0);
			expect(getProgressMin(eid)).toBe(0);
			expect(getProgressMax(eid)).toBe(100);
			expect(getProgressOrientation(eid)).toBe(ProgressOrientation.Horizontal);
		});

		it('respects custom values', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, {
				value: 25,
				min: 10,
				max: 50,
				orientation: ProgressOrientation.Vertical,
			});

			expect(getProgress(eid)).toBe(25);
			expect(getProgressMin(eid)).toBe(10);
			expect(getProgressMax(eid)).toBe(50);
			expect(getProgressOrientation(eid)).toBe(ProgressOrientation.Vertical);
		});

		it('enables show percentage when specified', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { showPercentage: true });

			expect(isShowingPercentage(eid)).toBe(true);
		});
	});

	describe('isProgressBar', () => {
		it('returns false for non-progress bar entities', () => {
			const eid = createBoxEntity(world);

			expect(isProgressBar(world, eid)).toBe(false);
		});

		it('returns true for progress bar entities', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			expect(isProgressBar(world, eid)).toBe(true);
		});
	});

	describe('Progress Values', () => {
		it('gets progress value', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 42 });

			expect(getProgress(eid)).toBe(42);
		});

		it('sets progress value', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			setProgress(world, eid, 50);

			expect(getProgress(eid)).toBe(50);
		});

		it('clamps value to min', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { min: 10, max: 100 });

			setProgress(world, eid, 5);

			expect(getProgress(eid)).toBe(10);
		});

		it('clamps value to max', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { min: 0, max: 100 });

			setProgress(world, eid, 150);

			expect(getProgress(eid)).toBe(100);
		});

		it('calculates percentage correctly', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50, min: 0, max: 100 });

			expect(getProgressPercentage(eid)).toBe(50);
		});

		it('calculates percentage with custom range', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 30, min: 20, max: 40 });

			expect(getProgressPercentage(eid)).toBe(50); // (30-20) / (40-20) * 100
		});

		it('handles zero range gracefully', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 0, min: 0, max: 0 });

			expect(getProgressPercentage(eid)).toBe(0);
		});
	});

	describe('incrementProgress', () => {
		it('increments by default amount of 1', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 10 });

			incrementProgress(world, eid);

			expect(getProgress(eid)).toBe(11);
		});

		it('increments by custom amount', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 10 });

			incrementProgress(world, eid, 5);

			expect(getProgress(eid)).toBe(15);
		});

		it('clamps to max', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 95, max: 100 });

			incrementProgress(world, eid, 10);

			expect(getProgress(eid)).toBe(100);
		});
	});

	describe('decrementProgress', () => {
		it('decrements by default amount of 1', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 10 });

			decrementProgress(world, eid);

			expect(getProgress(eid)).toBe(9);
		});

		it('decrements by custom amount', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 10 });

			decrementProgress(world, eid, 5);

			expect(getProgress(eid)).toBe(5);
		});

		it('clamps to min', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 5, min: 0 });

			decrementProgress(world, eid, 10);

			expect(getProgress(eid)).toBe(0);
		});
	});

	describe('resetProgress', () => {
		it('resets to minimum value', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50, min: 10 });

			resetProgress(world, eid);

			expect(getProgress(eid)).toBe(10);
		});
	});

	describe('completeProgress', () => {
		it('sets to maximum value', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50, max: 100 });

			completeProgress(world, eid);

			expect(getProgress(eid)).toBe(100);
		});
	});

	describe('isProgressComplete', () => {
		it('returns false when not at max', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50, max: 100 });

			expect(isProgressComplete(eid)).toBe(false);
		});

		it('returns true when at max', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 100, max: 100 });

			expect(isProgressComplete(eid)).toBe(true);
		});
	});

	describe('Display Configuration', () => {
		it('gets default display config', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			const display = getProgressBarDisplay(eid);

			expect(display.fillChar).toBe(DEFAULT_FILL_CHAR);
			expect(display.emptyChar).toBe(DEFAULT_EMPTY_CHAR);
		});

		it('sets custom display config', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			setProgressBarDisplay(eid, {
				fillChar: '=',
				emptyChar: '-',
				fillFg: 0x00ff00ff,
			});

			const display = getProgressBarDisplay(eid);
			expect(display.fillChar).toBe('=');
			expect(display.emptyChar).toBe('-');
			expect(display.fillFg).toBe(0x00ff00ff);
		});

		it('clears display config', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			setProgressBarDisplay(eid, { fillChar: '=' });
			clearProgressBarDisplay(eid);

			const display = getProgressBarDisplay(eid);
			expect(display.fillChar).toBe(DEFAULT_FILL_CHAR);
		});
	});

	describe('renderProgressString', () => {
		it('renders empty progress bar', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 0 });

			const bar = renderProgressString(eid, 10);

			expect(bar).toBe('░░░░░░░░░░');
		});

		it('renders full progress bar', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 100 });

			const bar = renderProgressString(eid, 10);

			expect(bar).toBe('██████████');
		});

		it('renders partial progress bar', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50 });

			const bar = renderProgressString(eid, 10);

			expect(bar).toBe('█████░░░░░');
		});

		it('renders with custom characters', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50 });
			setProgressBarDisplay(eid, { fillChar: '=', emptyChar: '-' });

			const bar = renderProgressString(eid, 10);

			expect(bar).toBe('=====-----');
		});
	});

	describe('Callbacks', () => {
		it('calls complete callback when reaching max', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 99, max: 100 });

			const callback = vi.fn();
			onProgressComplete(eid, callback);

			setProgress(world, eid, 100);

			expect(callback).toHaveBeenCalled();
		});

		it('does not call complete callback when not reaching max', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50, max: 100 });

			const callback = vi.fn();
			onProgressComplete(eid, callback);

			setProgress(world, eid, 60);

			expect(callback).not.toHaveBeenCalled();
		});

		it('unsubscribes from complete callback', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 99, max: 100 });

			const callback = vi.fn();
			const unsubscribe = onProgressComplete(eid, callback);
			unsubscribe();

			setProgress(world, eid, 100);

			expect(callback).not.toHaveBeenCalled();
		});

		it('calls change callback on value change', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 0 });

			const callback = vi.fn();
			onProgressChange(eid, callback);

			setProgress(world, eid, 50);

			expect(callback).toHaveBeenCalledWith(50, 50);
		});

		it('does not call change callback when value unchanged', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50 });

			const callback = vi.fn();
			onProgressChange(eid, callback);

			setProgress(world, eid, 50);

			expect(callback).not.toHaveBeenCalled();
		});

		it('clears all callbacks', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 99 });

			const completeCallback = vi.fn();
			const changeCallback = vi.fn();
			onProgressComplete(eid, completeCallback);
			onProgressChange(eid, changeCallback);

			clearProgressBarCallbacks(eid);

			setProgress(world, eid, 100);

			expect(completeCallback).not.toHaveBeenCalled();
			expect(changeCallback).not.toHaveBeenCalled();
		});
	});

	describe('Orientation', () => {
		it('gets orientation', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, {
				orientation: ProgressOrientation.Vertical,
			});

			expect(getProgressOrientation(eid)).toBe(ProgressOrientation.Vertical);
		});

		it('sets orientation', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			setProgressOrientation(world, eid, ProgressOrientation.Vertical);

			expect(getProgressOrientation(eid)).toBe(ProgressOrientation.Vertical);
		});
	});

	describe('setProgressRange', () => {
		it('sets min and max', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			setProgressRange(world, eid, 10, 200);

			expect(getProgressMin(eid)).toBe(10);
			expect(getProgressMax(eid)).toBe(200);
		});

		it('re-clamps current value', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50 });

			setProgressRange(world, eid, 60, 100);

			expect(getProgress(eid)).toBe(60);
		});
	});

	describe('setShowPercentage', () => {
		it('enables percentage display', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid);

			setShowPercentage(world, eid, true);

			expect(isShowingPercentage(eid)).toBe(true);
		});

		it('disables percentage display', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { showPercentage: true });

			setShowPercentage(world, eid, false);

			expect(isShowingPercentage(eid)).toBe(false);
		});
	});

	describe('resetProgressBarStore', () => {
		it('resets all progress bar data', () => {
			const eid = createBoxEntity(world);
			attachProgressBarBehavior(world, eid, { value: 50 });

			resetProgressBarStore();

			expect(isProgressBar(world, eid)).toBe(false);
		});
	});
});
