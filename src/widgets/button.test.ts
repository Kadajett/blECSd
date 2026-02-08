/**
 * Button widget tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import { createButton, isButtonWidget, resetButtonWidgetStore } from './button';

describe('Button Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetButtonWidgetStore();
	});

	describe('createButton', () => {
		it('creates a button widget with default config', () => {
			const button = createButton(world);

			expect(button).toBeDefined();
			expect(button.eid).toBeGreaterThan(0);
			expect(isButtonWidget(world, button.eid)).toBe(true);
		});

		it('creates a button with custom label', () => {
			const button = createButton(world, {
				label: 'Click Me',
			});

			expect(button.getLabel()).toBe('Click Me');
		});

		it('creates a button with custom position', () => {
			const button = createButton(world, {
				x: 10,
				y: 5,
			});

			const pos = getPosition(world, button.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('creates a button with custom dimensions', () => {
			const button = createButton(world, {
				width: 20,
				height: 3,
			});

			const dims = getDimensions(world, button.eid);
			expect(dims?.width).toBe(20);
			expect(dims?.height).toBe(3);
		});

		it('auto-sizes width based on label', () => {
			const button = createButton(world, {
				label: 'Submit',
			});

			const dims = getDimensions(world, button.eid);
			expect((dims?.width ?? 0) >= 'Submit'.length).toBe(true);
		});
	});

	describe('onClick callback', () => {
		it('calls onClick when button is clicked', () => {
			const button = createButton(world);
			let clicked = false;

			button.onClick(() => {
				clicked = true;
			});

			button.click();
			expect(clicked).toBe(true);
		});

		it('supports multiple onClick callbacks', () => {
			const button = createButton(world);
			const calls: number[] = [];

			button.onClick(() => calls.push(1));
			button.onClick(() => calls.push(2));

			button.click();
			expect(calls).toEqual([1, 2]);
		});

		it('does not call onClick when button is disabled', () => {
			const button = createButton(world);
			let clicked = false;

			button.onClick(() => {
				clicked = true;
			});

			button.setDisabled(true);
			button.click();

			expect(clicked).toBe(false);
		});
	});

	describe('disabled state', () => {
		it('can disable a button', () => {
			const button = createButton(world);

			button.setDisabled(true);
			expect(button.isDisabled()).toBe(true);
		});

		it('can enable a disabled button', () => {
			const button = createButton(world);

			button.setDisabled(true);
			button.setDisabled(false);

			expect(button.isDisabled()).toBe(false);
		});

		it('cannot click when disabled', () => {
			const button = createButton(world);
			let clicked = false;

			button.onClick(() => {
				clicked = true;
			});

			button.setDisabled(true);
			button.click();

			expect(clicked).toBe(false);
		});
	});

	describe('label', () => {
		it('sets and gets label', () => {
			const button = createButton(world, {
				label: 'Save',
			});

			expect(button.getLabel()).toBe('Save');

			button.setLabel('Save Changes');
			expect(button.getLabel()).toBe('Save Changes');
		});

		it('updates width when label changes', () => {
			const button = createButton(world, {
				label: 'OK',
			});

			const dims1 = getDimensions(world, button.eid);

			button.setLabel('A Much Longer Label');

			const dims2 = getDimensions(world, button.eid);
			expect((dims2?.width ?? 0) > (dims1?.width ?? 0)).toBe(true);
		});
	});

	describe('focus support', () => {
		it('supports keyboard navigation', () => {
			const button = createButton(world, {
				focusable: true,
			});

			button.focus();
			expect(button.isFocused()).toBe(true);

			button.blur();
			expect(button.isFocused()).toBe(false);
		});

		it('can activate with keyboard when focused', () => {
			const button = createButton(world, {
				focusable: true,
			});
			let clicked = false;

			button.onClick(() => {
				clicked = true;
			});

			button.focus();
			const handled = button.handleKey('enter');

			expect(handled).toBe(true);
			expect(clicked).toBe(true);
		});

		it('does not handle keys when not focused', () => {
			const button = createButton(world, {
				focusable: true,
			});
			let clicked = false;

			button.onClick(() => {
				clicked = true;
			});

			const handled = button.handleKey('enter');

			expect(handled).toBe(false);
			expect(clicked).toBe(false);
		});
	});

	describe('chainable API', () => {
		it('supports method chaining', () => {
			const button = createButton(world);

			const result = button.setPosition(10, 5).setLabel('Submit').setDisabled(false);

			expect(result).toBe(button);
			expect(button.getLabel()).toBe('Submit');
		});
	});

	describe('cleanup', () => {
		it('destroys button and cleans up resources', () => {
			const button = createButton(world);
			const eid = button.eid;

			button.destroy();

			expect(isButtonWidget(world, eid)).toBe(false);
		});

		it('cleans up onClick callbacks on destroy', () => {
			const button = createButton(world);
			let called = false;

			button.onClick(() => {
				called = true;
			});

			button.destroy();

			// Recreate with same entity ID won't trigger old callback
			const button2 = createButton(world);
			button2.click();
			expect(called).toBe(false);
		});
	});

	describe('position methods', () => {
		it('sets position', () => {
			const button = createButton(world);

			button.setPosition(15, 8);

			const pos = getPosition(world, button.eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(8);
		});

		it('moves by delta', () => {
			const button = createButton(world, { x: 10, y: 5 });

			button.move(3, -2);

			const pos = getPosition(world, button.eid);
			expect(pos?.x).toBe(13);
			expect(pos?.y).toBe(3);
		});

		it('gets current position', () => {
			const button = createButton(world, { x: 7, y: 12 });

			const pos = button.getPosition();

			expect(pos.x).toBe(7);
			expect(pos.y).toBe(12);
		});
	});

	describe('state methods', () => {
		it('checks if button is hovered', () => {
			const button = createButton(world);

			// Initially not hovered
			expect(button.isHovered()).toBe(false);
		});

		it('checks if button is pressed', () => {
			const button = createButton(world);

			// Initially not pressed
			expect(button.isPressed()).toBe(false);
		});
	});
});
