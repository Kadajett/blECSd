/**
 * Tests for Toast widget
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getContent } from '../components/content';
import { isVisible } from '../components/renderable';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import {
	createToast,
	isToast,
	resetToastStore,
	showErrorToast,
	showInfoToast,
	showSuccessToast,
	showWarningToast,
} from './toast';

describe('Toast Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetToastStore();
	});

	afterEach(() => {
		resetToastStore();
	});

	describe('createToast', () => {
		it('should create a toast with default config', () => {
			const toast = createToast(world, {}, 80, 24);

			expect(isToast(world, toast.eid)).toBe(true);
			expect(toast.isDismissed()).toBe(false);
		});

		it('should use custom content', () => {
			const toast = createToast(world, { content: 'Test message' }, 80, 24);
			expect(getContent(world, toast.eid)).toBe('Test message');
		});

		it('should be visible by default', () => {
			const toast = createToast(world, {}, 80, 24);
			expect(isVisible(world, toast.eid)).toBe(true);
		});
	});

	describe('dismiss', () => {
		it('should dismiss the toast', () => {
			const toast = createToast(world, { timeout: 0 }, 80, 24);

			expect(toast.isDismissed()).toBe(false);
			toast.dismiss();
			expect(toast.isDismissed()).toBe(true);
			expect(isVisible(world, toast.eid)).toBe(false);
		});

		it('should call onDismiss callback', () => {
			const toast = createToast(world, { timeout: 0 }, 80, 24);
			const callback = vi.fn();

			toast.onDismiss(callback);
			toast.dismiss();

			expect(callback).toHaveBeenCalledOnce();
		});
	});

	describe('auto-dismiss', () => {
		it('should auto-dismiss after timeout', async () => {
			const toast = createToast(world, { timeout: 10 }, 80, 24);
			const callback = vi.fn();
			toast.onDismiss(callback);

			expect(toast.isDismissed()).toBe(false);

			await new Promise((resolve) => setTimeout(resolve, 20));

			expect(toast.isDismissed()).toBe(true);
			expect(callback).toHaveBeenCalledOnce();
		});

		it('should not auto-dismiss when timeout is 0', async () => {
			const toast = createToast(world, { timeout: 0 }, 80, 24);

			await new Promise((resolve) => setTimeout(resolve, 20));

			expect(toast.isDismissed()).toBe(false);
		});
	});

	describe('content', () => {
		it('should get and set content', () => {
			const toast = createToast(world, { content: 'Initial' }, 80, 24);

			expect(toast.getContent()).toBe('Initial');

			toast.setContent('Updated');
			expect(toast.getContent()).toBe('Updated');
			expect(getContent(world, toast.eid)).toBe('Updated');
		});
	});

	describe('visibility', () => {
		it('should show and hide', () => {
			const toast = createToast(world, {}, 80, 24);

			toast.hide();
			expect(isVisible(world, toast.eid)).toBe(false);

			toast.show();
			expect(isVisible(world, toast.eid)).toBe(true);
		});
	});

	describe('convenience functions', () => {
		it('should create info toast', () => {
			const toast = showInfoToast(world, 'Info message', {}, 80, 24);
			expect(isToast(world, toast.eid)).toBe(true);
			expect(toast.getContent()).toBe('Info message');
		});

		it('should create success toast', () => {
			const toast = showSuccessToast(world, 'Success message', {}, 80, 24);
			expect(isToast(world, toast.eid)).toBe(true);
		});

		it('should create warning toast', () => {
			const toast = showWarningToast(world, 'Warning message', {}, 80, 24);
			expect(isToast(world, toast.eid)).toBe(true);
		});

		it('should create error toast', () => {
			const toast = showErrorToast(world, 'Error message', {}, 80, 24);
			expect(isToast(world, toast.eid)).toBe(true);
		});
	});

	describe('destroy', () => {
		it('should clean up the toast', () => {
			const toast = createToast(world, {}, 80, 24);

			toast.destroy();

			expect(isToast(world, toast.eid)).toBe(false);
		});
	});
});
