/**
 * Message widget tests
 * @module widgets/message.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { isVisible } from '../components/renderable';
import { createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	createMessage,
	DEFAULT_MESSAGE_PADDING,
	DEFAULT_MESSAGE_STYLES,
	DEFAULT_MESSAGE_TIMEOUT,
	handleMessageClick,
	handleMessageKey,
	isDismissOnClick,
	isDismissOnKey,
	isMessage,
	Message,
	resetMessageStore,
	showError,
	showInfo,
	showSuccess,
	showWarning,
} from './message';

describe('Message Widget', () => {
	let world: World;

	beforeEach(() => {
		vi.useFakeTimers();
		world = createWorld();
		resetMessageStore();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetMessageStore();
	});

	describe('createMessage', () => {
		it('should create a message entity', () => {
			const msg = createMessage(world, { content: 'Test message' });

			expect(msg.eid).toBeDefined();
			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should set default timeout', () => {
			expect(DEFAULT_MESSAGE_TIMEOUT).toBe(3000);
		});

		it('should set default padding', () => {
			expect(DEFAULT_MESSAGE_PADDING).toBe(1);
		});

		it('should auto-calculate dimensions from content', () => {
			const msg = createMessage(world, { content: 'Hello World' });
			const dims = getDimensions(world, msg.eid);

			// "Hello World" is 11 chars + 2 padding + 2 border = 15
			expect(dims?.width).toBeGreaterThanOrEqual(14);
			// 1 line + 2 padding + 2 border = 5
			expect(dims?.height).toBeGreaterThanOrEqual(5);
		});

		it('should use explicit dimensions when provided', () => {
			const msg = createMessage(world, {
				content: 'Test',
				width: 50,
				height: 10,
			});
			const dims = getDimensions(world, msg.eid);

			expect(dims?.width).toBe(50);
			expect(dims?.height).toBe(10);
		});

		it('should enable dismiss on click by default', () => {
			const msg = createMessage(world, { content: 'Test' });

			expect(isDismissOnClick(world, msg.eid)).toBe(true);
		});

		it('should enable dismiss on key by default', () => {
			const msg = createMessage(world, { content: 'Test' });

			expect(isDismissOnKey(world, msg.eid)).toBe(true);
		});

		it('should disable dismiss on click when specified', () => {
			const msg = createMessage(world, {
				content: 'Test',
				dismissOnClick: false,
			});

			expect(isDismissOnClick(world, msg.eid)).toBe(false);
		});

		it('should disable dismiss on key when specified', () => {
			const msg = createMessage(world, {
				content: 'Test',
				dismissOnKey: false,
			});

			expect(isDismissOnKey(world, msg.eid)).toBe(false);
		});

		it('should set position', () => {
			const msg = createMessage(world, {
				content: 'Test',
				left: 10,
				top: 5,
			});
			const pos = getPosition(world, msg.eid);

			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});
	});

	describe('message types', () => {
		it('should have default styles for info type', () => {
			expect(DEFAULT_MESSAGE_STYLES.info).toBeDefined();
			expect(DEFAULT_MESSAGE_STYLES.info.fg).toBe('#ffffff');
			expect(DEFAULT_MESSAGE_STYLES.info.bg).toBe('#2196f3');
		});

		it('should have default styles for warning type', () => {
			expect(DEFAULT_MESSAGE_STYLES.warning).toBeDefined();
			expect(DEFAULT_MESSAGE_STYLES.warning.fg).toBe('#000000');
			expect(DEFAULT_MESSAGE_STYLES.warning.bg).toBe('#ff9800');
		});

		it('should have default styles for error type', () => {
			expect(DEFAULT_MESSAGE_STYLES.error).toBeDefined();
			expect(DEFAULT_MESSAGE_STYLES.error.fg).toBe('#ffffff');
			expect(DEFAULT_MESSAGE_STYLES.error.bg).toBe('#f44336');
		});

		it('should have default styles for success type', () => {
			expect(DEFAULT_MESSAGE_STYLES.success).toBeDefined();
			expect(DEFAULT_MESSAGE_STYLES.success.fg).toBe('#ffffff');
			expect(DEFAULT_MESSAGE_STYLES.success.bg).toBe('#4caf50');
		});

		it('should create info message', () => {
			const msg = createMessage(world, {
				content: 'Info',
				type: 'info',
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should create warning message', () => {
			const msg = createMessage(world, {
				content: 'Warning',
				type: 'warning',
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should create error message', () => {
			const msg = createMessage(world, {
				content: 'Error',
				type: 'error',
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should create success message', () => {
			const msg = createMessage(world, {
				content: 'Success',
				type: 'success',
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});
	});

	describe('content management', () => {
		it('should set content', () => {
			const msg = createMessage(world, { content: 'Initial' });

			msg.setContent('Updated');

			expect(msg.getContent()).toBe('Updated');
		});

		it('should get content', () => {
			const msg = createMessage(world, { content: 'Test content' });

			expect(msg.getContent()).toBe('Test content');
		});

		it('should update content through widget API', () => {
			const msg = createMessage(world, { content: 'Initial' });
			expect(msg.getContent()).toBe('Initial');

			msg.setContent('Updated');

			expect(msg.getContent()).toBe('Updated');
		});
	});

	describe('visibility', () => {
		it('should show message', () => {
			const msg = createMessage(world, { content: 'Test' });
			msg.hide();

			msg.show();

			expect(isVisible(world, msg.eid)).toBe(true);
		});

		it('should hide message', () => {
			const msg = createMessage(world, { content: 'Test' });

			msg.hide();

			expect(isVisible(world, msg.eid)).toBe(false);
		});
	});

	describe('positioning', () => {
		it('should move by delta', () => {
			const msg = createMessage(world, {
				content: 'Test',
				left: 10,
				top: 5,
			});

			msg.move(5, 3);

			const pos = getPosition(world, msg.eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(8);
		});

		it('should set absolute position', () => {
			const msg = createMessage(world, {
				content: 'Test',
				left: 10,
				top: 5,
			});

			msg.setPosition(20, 15);

			const pos = getPosition(world, msg.eid);
			expect(pos?.x).toBe(20);
			expect(pos?.y).toBe(15);
		});

		it('should center on screen', () => {
			const msg = createMessage(world, {
				content: 'Test',
				width: 20,
				height: 10,
			});

			msg.center(80, 24);

			const pos = getPosition(world, msg.eid);
			expect(pos?.x).toBe(30); // (80 - 20) / 2
			expect(pos?.y).toBe(7); // (24 - 10) / 2
		});
	});

	describe('auto-dismiss', () => {
		it('should auto-dismiss after timeout', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 1000,
			});

			expect(msg.isDismissed()).toBe(false);

			vi.advanceTimersByTime(1000);

			expect(msg.isDismissed()).toBe(true);
		});

		it('should use default timeout', () => {
			const msg = createMessage(world, { content: 'Test' });

			expect(msg.isDismissed()).toBe(false);

			vi.advanceTimersByTime(DEFAULT_MESSAGE_TIMEOUT);

			expect(msg.isDismissed()).toBe(true);
		});

		it('should not auto-dismiss when timeout is 0', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
			});

			vi.advanceTimersByTime(10000);

			expect(msg.isDismissed()).toBe(false);
		});

		it('should hide message on dismiss', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 1000,
			});

			vi.advanceTimersByTime(1000);

			expect(isVisible(world, msg.eid)).toBe(false);
		});
	});

	describe('manual dismiss', () => {
		it('should dismiss message', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
			});

			msg.dismiss();

			expect(msg.isDismissed()).toBe(true);
		});

		it('should clear timer on manual dismiss', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 5000,
			});

			msg.dismiss();

			// Timer should be cleared, so advancing time shouldn't cause issues
			vi.advanceTimersByTime(10000);

			expect(msg.isDismissed()).toBe(true);
		});

		it('should only dismiss once', () => {
			const callback = vi.fn();
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
			});
			msg.onDismiss(callback);

			msg.dismiss();
			msg.dismiss();
			msg.dismiss();

			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe('dismiss callbacks', () => {
		it('should call onDismiss callback', () => {
			const callback = vi.fn();
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
			});

			msg.onDismiss(callback);
			msg.dismiss();

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should call onDismiss on auto-dismiss', () => {
			const callback = vi.fn();
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 1000,
			});

			msg.onDismiss(callback);
			vi.advanceTimersByTime(1000);

			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe('handleMessageClick', () => {
		it('should dismiss message on click', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
				dismissOnClick: true,
			});

			const result = handleMessageClick(world, msg.eid);

			expect(result).toBe(true);
			expect(msg.isDismissed()).toBe(true);
		});

		it('should not dismiss when dismissOnClick is false', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
				dismissOnClick: false,
			});

			const result = handleMessageClick(world, msg.eid);

			expect(result).toBe(false);
			expect(msg.isDismissed()).toBe(false);
		});

		it('should return false for non-message entity', () => {
			const result = handleMessageClick(world, 99999 as Entity);

			expect(result).toBe(false);
		});

		it('should return false for already dismissed message', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
			});
			msg.dismiss();

			const result = handleMessageClick(world, msg.eid);

			expect(result).toBe(false);
		});
	});

	describe('handleMessageKey', () => {
		it('should dismiss message on key', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
				dismissOnKey: true,
			});

			const result = handleMessageKey(world, msg.eid);

			expect(result).toBe(true);
			expect(msg.isDismissed()).toBe(true);
		});

		it('should not dismiss when dismissOnKey is false', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
				dismissOnKey: false,
			});

			const result = handleMessageKey(world, msg.eid);

			expect(result).toBe(false);
			expect(msg.isDismissed()).toBe(false);
		});

		it('should return false for non-message entity', () => {
			const result = handleMessageKey(world, 99999 as Entity);

			expect(result).toBe(false);
		});

		it('should return false for already dismissed message', () => {
			const msg = createMessage(world, {
				content: 'Test',
				timeout: 0,
			});
			msg.dismiss();

			const result = handleMessageKey(world, msg.eid);

			expect(result).toBe(false);
		});
	});

	describe('convenience functions', () => {
		it('should show info message', () => {
			const msg = showInfo(world, 'Info message');

			expect(isMessage(world, msg.eid)).toBe(true);
			expect(msg.getContent()).toBe('Info message');
		});

		it('should show warning message', () => {
			const msg = showWarning(world, 'Warning message');

			expect(isMessage(world, msg.eid)).toBe(true);
			expect(msg.getContent()).toBe('Warning message');
		});

		it('should show error message', () => {
			const msg = showError(world, 'Error message');

			expect(isMessage(world, msg.eid)).toBe(true);
			expect(msg.getContent()).toBe('Error message');
		});

		it('should show success message', () => {
			const msg = showSuccess(world, 'Success message');

			expect(isMessage(world, msg.eid)).toBe(true);
			expect(msg.getContent()).toBe('Success message');
		});

		it('should pass options to convenience functions', () => {
			const msg = showInfo(world, 'Test', {
				timeout: 5000,
				left: 10,
				top: 5,
			});

			const pos = getPosition(world, msg.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});
	});

	describe('widget chaining', () => {
		it('should support method chaining', () => {
			const msg = createMessage(world, { content: 'Test', timeout: 0 });

			const result = msg.setContent('Updated').setPosition(10, 5).show().hide().move(1, 1);

			expect(result).toBe(msg);
		});
	});

	describe('destroy', () => {
		it('should clean up on destroy', () => {
			const msg = createMessage(world, { content: 'Test', timeout: 5000 });
			const eid = msg.eid;

			msg.destroy();

			expect(Message.isMessage[eid]).toBe(0);
		});

		it('should clear timer on destroy', () => {
			const callback = vi.fn();
			const msg = createMessage(world, { content: 'Test', timeout: 5000 });
			msg.onDismiss(callback);

			msg.destroy();
			vi.advanceTimersByTime(10000);

			// Callback should not be called because destroy cleared the timer
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('border configuration', () => {
		it('should support single border', () => {
			const msg = createMessage(world, {
				content: 'Test',
				border: { ch: 'single' },
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should support double border', () => {
			const msg = createMessage(world, {
				content: 'Test',
				border: { ch: 'double' },
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should support rounded border', () => {
			const msg = createMessage(world, {
				content: 'Test',
				border: { ch: 'rounded' },
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should support bold border', () => {
			const msg = createMessage(world, {
				content: 'Test',
				border: { ch: 'bold' },
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should support ascii border', () => {
			const msg = createMessage(world, {
				content: 'Test',
				border: { ch: 'ascii' },
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should support border type', () => {
			const msg = createMessage(world, {
				content: 'Test',
				border: { type: 'line' },
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});
	});

	describe('custom styles', () => {
		it('should allow custom fg color', () => {
			const msg = createMessage(world, {
				content: 'Test',
				fg: '#ff0000',
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should allow custom bg color', () => {
			const msg = createMessage(world, {
				content: 'Test',
				bg: '#00ff00',
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should allow custom style per type', () => {
			const msg = createMessage(world, {
				content: 'Test',
				type: 'info',
				infoStyle: {
					fg: '#123456',
					bg: '#654321',
				},
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});

		it('should allow padding configuration', () => {
			const msg = createMessage(world, {
				content: 'Test',
				padding: 2,
			});

			expect(isMessage(world, msg.eid)).toBe(true);
		});
	});

	describe('multiline content', () => {
		it('should handle multiline content', () => {
			const msg = createMessage(world, {
				content: 'Line 1\nLine 2\nLine 3',
			});
			const dims = getDimensions(world, msg.eid);

			// 3 lines + 2 padding + 2 border = 7
			expect(dims?.height).toBeGreaterThanOrEqual(7);
		});

		it('should calculate width from longest line', () => {
			const msg = createMessage(world, {
				content: 'Short\nThis is a longer line\nMed',
			});
			const dims = getDimensions(world, msg.eid);

			// "This is a longer line" = 21 chars + 2 padding + 2 border = 25
			expect(dims?.width).toBeGreaterThanOrEqual(25);
		});
	});
});
