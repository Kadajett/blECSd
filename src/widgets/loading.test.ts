/**
 * Tests for Loading widget.
 *
 * @module widgets/loading.test
 */

import { afterEach, describe, expect, it } from 'vitest';
import { resetSpinnerStore } from '../components/spinner';
import { createWorld } from '../core/ecs';
import {
	createLoading,
	hideLoading,
	isLoadingWidget,
	resetLoadingStore,
	setLoadingMessage,
	showLoading,
	updateLoadingAnimation,
} from './loading';

describe('loading widget', () => {
	afterEach(() => {
		resetLoadingStore();
		resetSpinnerStore();
	});

	describe('createLoading', () => {
		it('creates loading widget with defaults', () => {
			const world = createWorld();
			const loading = createLoading(world);

			expect(loading.eid).toBeDefined();
			expect(loading.getMessage()).toBe('Loading...');
			expect(loading.isVisible()).toBe(true);
		});

		it('creates loading with custom message', () => {
			const world = createWorld();
			const loading = createLoading(world, { message: 'Please wait...' });

			expect(loading.getMessage()).toBe('Please wait...');
		});

		it('creates loading with custom position', () => {
			const world = createWorld();
			const loading = createLoading(world, { x: 10, y: 5 });

			const pos = loading.getPosition();
			expect(pos.x).toBe(10);
			expect(pos.y).toBe(5);
		});

		it('creates loading with hidden state', () => {
			const world = createWorld();
			const loading = createLoading(world, { visible: false });

			expect(loading.isVisible()).toBe(false);
		});

		it('creates loading with custom spinner chars', () => {
			const world = createWorld();
			const loading = createLoading(world, {
				spinnerChars: ['X', 'Y', 'Z'],
			});

			expect(['X', 'Y', 'Z']).toContain(loading.getSpinnerChar());
		});
	});

	describe('visibility', () => {
		it('shows loading widget', () => {
			const world = createWorld();
			const loading = createLoading(world, { visible: false });

			loading.show();
			expect(loading.isVisible()).toBe(true);
		});

		it('hides loading widget', () => {
			const world = createWorld();
			const loading = createLoading(world);

			loading.hide();
			expect(loading.isVisible()).toBe(false);
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const loading = createLoading(world);

			expect(loading.show()).toBe(loading);
			expect(loading.hide()).toBe(loading);
		});
	});

	describe('position', () => {
		it('moves loading widget', () => {
			const world = createWorld();
			const loading = createLoading(world, { x: 10, y: 10 });

			loading.move(5, -3);

			const pos = loading.getPosition();
			expect(pos.x).toBe(15);
			expect(pos.y).toBe(7);
		});

		it('sets absolute position', () => {
			const world = createWorld();
			const loading = createLoading(world);

			loading.setPosition(20, 15);

			const pos = loading.getPosition();
			expect(pos.x).toBe(20);
			expect(pos.y).toBe(15);
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const loading = createLoading(world);

			expect(loading.move(1, 1)).toBe(loading);
			expect(loading.setPosition(0, 0)).toBe(loading);
		});
	});

	describe('message', () => {
		it('sets loading message', () => {
			const world = createWorld();
			const loading = createLoading(world);

			loading.setMessage('Processing...');
			expect(loading.getMessage()).toBe('Processing...');
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const loading = createLoading(world);

			expect(loading.setMessage('Test')).toBe(loading);
		});
	});

	describe('animation', () => {
		it('sets spinner characters', () => {
			const world = createWorld();
			const loading = createLoading(world);

			loading.setSpinnerChars(['A', 'B']);
			expect(['A', 'B']).toContain(loading.getSpinnerChar());
		});

		it('sets animation interval', () => {
			const world = createWorld();
			const loading = createLoading(world);

			// Should not throw
			loading.setInterval(200);
		});

		it('resets spinner', () => {
			const world = createWorld();
			const loading = createLoading(world, { spinnerChars: ['X', 'Y'] });

			// Advance spinner
			updateLoadingAnimation(world, loading.eid, 150);

			loading.reset();
			expect(loading.getSpinnerChar()).toBe('X'); // Back to first frame
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const loading = createLoading(world);

			expect(loading.setSpinnerChars(['X'])).toBe(loading);
			expect(loading.setInterval(100)).toBe(loading);
			expect(loading.reset()).toBe(loading);
		});
	});

	describe('destroy', () => {
		it('destroys loading widget', () => {
			const world = createWorld();
			const loading = createLoading(world);
			const eid = loading.eid;

			loading.destroy();

			expect(isLoadingWidget(world, eid)).toBe(false);
		});
	});

	describe('helper functions', () => {
		it('showLoading creates visible loading', () => {
			const world = createWorld();
			const loading = showLoading(world, 'Working...');

			expect(loading.isVisible()).toBe(true);
			expect(loading.getMessage()).toBe('Working...');
		});

		it('hideLoading destroys widget', () => {
			const world = createWorld();
			const loading = showLoading(world, 'Test');
			const eid = loading.eid;

			hideLoading(loading);

			expect(isLoadingWidget(world, eid)).toBe(false);
		});

		it('setLoadingMessage updates message', () => {
			const world = createWorld();
			const loading = showLoading(world, 'Initial');

			setLoadingMessage(loading, 'Updated');

			expect(loading.getMessage()).toBe('Updated');
		});
	});

	describe('isLoadingWidget', () => {
		it('returns true for loading widget', () => {
			const world = createWorld();
			const loading = createLoading(world);

			expect(isLoadingWidget(world, loading.eid)).toBe(true);
		});

		it('returns false for non-loading entity', () => {
			const world = createWorld();

			expect(isLoadingWidget(world, 999)).toBe(false);
		});
	});

	describe('updateLoadingAnimation', () => {
		it('updates spinner animation', () => {
			const world = createWorld();
			const loading = createLoading(world, {
				spinnerChars: ['A', 'B'],
				interval: 100,
			});

			const initial = loading.getSpinnerChar();

			// Not enough time to advance
			expect(updateLoadingAnimation(world, loading.eid, 50)).toBe(false);
			expect(loading.getSpinnerChar()).toBe(initial);

			// Enough time to advance
			expect(updateLoadingAnimation(world, loading.eid, 60)).toBe(true);
			expect(loading.getSpinnerChar()).not.toBe(initial);
		});

		it('returns false for non-loading entity', () => {
			const world = createWorld();

			expect(updateLoadingAnimation(world, 999, 100)).toBe(false);
		});
	});

	describe('method chaining', () => {
		it('supports chained operations', () => {
			const world = createWorld();
			const loading = createLoading(world);

			loading.setMessage('Step 1').setPosition(5, 5).setInterval(50).show();

			expect(loading.getMessage()).toBe('Step 1');
			expect(loading.getPosition()).toEqual({ x: 5, y: 5 });
			expect(loading.isVisible()).toBe(true);
		});
	});
});
