/**
 * Tests for ProgressBar widget
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createProgressBar, resetProgressBarStore } from './progressBar';

describe('ProgressBar Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetProgressBarStore();
	});

	describe('createProgressBar', () => {
		it('should create a progress bar with default config', () => {
			const bar = createProgressBar(world);

			expect(bar.eid).toBeGreaterThanOrEqual(0);
			expect(bar.getValue()).toBe(0);
		});

		it('should create a progress bar with initial value', () => {
			const bar = createProgressBar(world, { value: 50 });

			expect(bar.getValue()).toBe(50);
		});

		it('should clamp initial value to 0-100 range', () => {
			const bar1 = createProgressBar(world, { value: -10 });
			expect(bar1.getValue()).toBe(0);

			const bar2 = createProgressBar(world, { value: 150 });
			expect(bar2.getValue()).toBe(100);
		});

		it('should create with custom fill character', () => {
			const bar = createProgressBar(world, { fillChar: '█' });

			expect(bar.getFillChar()).toBe('█');
		});

		it('should create with custom empty character', () => {
			const bar = createProgressBar(world, { emptyChar: '░' });

			expect(bar.getEmptyChar()).toBe('░');
		});

		it('should create with custom width', () => {
			const bar = createProgressBar(world, { width: 50 });

			expect(bar.getPosition()).toMatchObject({ width: 50 });
		});
	});

	describe('setValue', () => {
		it('should set progress value', () => {
			const bar = createProgressBar(world, { value: 0 });

			bar.setValue(75);

			expect(bar.getValue()).toBe(75);
		});

		it('should clamp value to 0-100 range', () => {
			const bar = createProgressBar(world);

			bar.setValue(-20);
			expect(bar.getValue()).toBe(0);

			bar.setValue(150);
			expect(bar.getValue()).toBe(100);
		});

		it('should be chainable', () => {
			const bar = createProgressBar(world);

			const result = bar.setValue(50);

			expect(result).toBe(bar);
		});
	});

	describe('increment', () => {
		it('should increment progress by amount', () => {
			const bar = createProgressBar(world, { value: 20 });

			bar.increment(30);

			expect(bar.getValue()).toBe(50);
		});

		it('should clamp at 100', () => {
			const bar = createProgressBar(world, { value: 90 });

			bar.increment(20);

			expect(bar.getValue()).toBe(100);
		});

		it('should handle negative increments (decrement)', () => {
			const bar = createProgressBar(world, { value: 50 });

			bar.increment(-20);

			expect(bar.getValue()).toBe(30);
		});

		it('should clamp at 0 when decrementing', () => {
			const bar = createProgressBar(world, { value: 10 });

			bar.increment(-20);

			expect(bar.getValue()).toBe(0);
		});

		it('should be chainable', () => {
			const bar = createProgressBar(world);

			const result = bar.increment(10);

			expect(result).toBe(bar);
		});
	});

	describe('setLabel', () => {
		it('should set custom label', () => {
			const bar = createProgressBar(world);

			bar.setLabel('Loading...');

			expect(bar.getLabel()).toBe('Loading...');
		});

		it('should clear label when set to empty string', () => {
			const bar = createProgressBar(world);

			bar.setLabel('Test');
			bar.setLabel('');

			expect(bar.getLabel()).toBe('');
		});

		it('should be chainable', () => {
			const bar = createProgressBar(world);

			const result = bar.setLabel('Test');

			expect(result).toBe(bar);
		});
	});

	describe('showPercentage', () => {
		it('should enable percentage display', () => {
			const bar = createProgressBar(world, { showPercentage: false });

			bar.showPercentage(true);

			expect(bar.isPercentageShown()).toBe(true);
		});

		it('should disable percentage display', () => {
			const bar = createProgressBar(world, { showPercentage: true });

			bar.showPercentage(false);

			expect(bar.isPercentageShown()).toBe(false);
		});

		it('should be chainable', () => {
			const bar = createProgressBar(world);

			const result = bar.showPercentage(false);

			expect(result).toBe(bar);
		});
	});

	describe('setIndeterminate', () => {
		it('should enable indeterminate mode', () => {
			const bar = createProgressBar(world);

			bar.setIndeterminate(true);

			expect(bar.isIndeterminate()).toBe(true);
		});

		it('should disable indeterminate mode', () => {
			const bar = createProgressBar(world, { indeterminate: true });

			bar.setIndeterminate(false);

			expect(bar.isIndeterminate()).toBe(false);
		});

		it('should be chainable', () => {
			const bar = createProgressBar(world);

			const result = bar.setIndeterminate(true);

			expect(result).toBe(bar);
		});
	});

	describe('onChange', () => {
		it('should call callback when value changes', () => {
			const bar = createProgressBar(world);
			let calledWith: number | undefined;

			bar.onChange((value) => {
				calledWith = value;
			});

			bar.setValue(50);

			expect(calledWith).toBe(50);
		});

		it('should call callback on increment', () => {
			const bar = createProgressBar(world, { value: 20 });
			let calledWith: number | undefined;

			bar.onChange((value) => {
				calledWith = value;
			});

			bar.increment(30);

			expect(calledWith).toBe(50);
		});
	});

	describe('position and movement', () => {
		it('should set position', () => {
			const bar = createProgressBar(world, { x: 5, y: 10 });

			expect(bar.getPosition()).toMatchObject({ x: 5, y: 10 });
		});

		it('should update position', () => {
			const bar = createProgressBar(world);

			bar.setPosition(15, 20);

			expect(bar.getPosition()).toMatchObject({ x: 15, y: 20 });
		});

		it('should move by offset', () => {
			const bar = createProgressBar(world, { x: 10, y: 10 });

			bar.move(5, -3);

			expect(bar.getPosition()).toMatchObject({ x: 15, y: 7 });
		});
	});

	describe('destroy', () => {
		it('should clean up widget state', () => {
			const bar = createProgressBar(world);

			bar.destroy();

			// Attempting to get value should return undefined or default
			expect(() => bar.getValue()).not.toThrow();
		});

		it('should remove callbacks', () => {
			const bar = createProgressBar(world);

			bar.onChange(() => {
				// Callback registered
			});

			bar.destroy();

			// No error should occur even if we try to set value
			expect(() => bar.setValue(50)).not.toThrow();
		});
	});
});
