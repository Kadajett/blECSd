/**
 * Checkbox widget tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import { createCheckbox, isCheckboxWidget, resetCheckboxWidgetStore } from './checkbox';

describe('Checkbox Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetCheckboxWidgetStore();
	});

	describe('createCheckbox', () => {
		it('creates a checkbox widget with default config', () => {
			const checkbox = createCheckbox(world);

			expect(checkbox).toBeDefined();
			expect(checkbox.eid).toBeGreaterThan(0);
			expect(isCheckboxWidget(world, checkbox.eid)).toBe(true);
		});

		it('creates a checkbox with custom label', () => {
			const checkbox = createCheckbox(world, {
				label: 'Accept Terms',
			});

			expect(checkbox.getLabel()).toBe('Accept Terms');
		});

		it('creates a checkbox in checked state', () => {
			const checkbox = createCheckbox(world, {
				checked: true,
			});

			expect(checkbox.isChecked()).toBe(true);
		});

		it('creates a checkbox in unchecked state by default', () => {
			const checkbox = createCheckbox(world);

			expect(checkbox.isChecked()).toBe(false);
		});

		it('creates a checkbox with custom position', () => {
			const checkbox = createCheckbox(world, {
				x: 10,
				y: 5,
			});

			const pos = getPosition(world, checkbox.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('creates a checkbox with custom characters', () => {
			const checkbox = createCheckbox(world, {
				checkedChar: '[X]',
				uncheckedChar: '[ ]',
			});

			expect(checkbox.getChar()).toBe('[ ]');
			checkbox.setChecked(true);
			expect(checkbox.getChar()).toBe('[X]');
		});

		it('creates a checkbox with custom dimensions', () => {
			const checkbox = createCheckbox(world, {
				width: 20,
				height: 3,
			});

			const dims = getDimensions(world, checkbox.eid);
			expect(dims?.width).toBe(20);
			expect(dims?.height).toBe(3);
		});
	});

	describe('checkbox state', () => {
		it('toggles checkbox state', () => {
			const checkbox = createCheckbox(world);

			expect(checkbox.isChecked()).toBe(false);

			checkbox.toggle();
			expect(checkbox.isChecked()).toBe(true);

			checkbox.toggle();
			expect(checkbox.isChecked()).toBe(false);
		});

		it('sets checked state explicitly', () => {
			const checkbox = createCheckbox(world);

			checkbox.setChecked(true);
			expect(checkbox.isChecked()).toBe(true);

			checkbox.setChecked(false);
			expect(checkbox.isChecked()).toBe(false);
		});

		it('returns correct character for state', () => {
			const checkbox = createCheckbox(world, {
				checkedChar: '✓',
				uncheckedChar: '○',
			});

			expect(checkbox.getChar()).toBe('○');

			checkbox.setChecked(true);
			expect(checkbox.getChar()).toBe('✓');
		});
	});

	describe('onChange callback', () => {
		it('calls onChange when checkbox is toggled', () => {
			const checkbox = createCheckbox(world);
			let callbackValue: boolean | null = null;

			checkbox.onChange((checked) => {
				callbackValue = checked;
			});

			checkbox.toggle();
			expect(callbackValue).toBe(true);

			checkbox.toggle();
			expect(callbackValue).toBe(false);
		});

		it('calls onChange when setChecked is used', () => {
			const checkbox = createCheckbox(world);
			let callbackCount = 0;

			checkbox.onChange(() => {
				callbackCount++;
			});

			checkbox.setChecked(true);
			expect(callbackCount).toBe(1);

			checkbox.setChecked(false);
			expect(callbackCount).toBe(2);
		});

		it('supports multiple onChange callbacks', () => {
			const checkbox = createCheckbox(world);
			const calls: number[] = [];

			checkbox.onChange(() => calls.push(1));
			checkbox.onChange(() => calls.push(2));

			checkbox.toggle();
			expect(calls).toEqual([1, 2]);
		});
	});

	describe('disabled state', () => {
		it('can disable a checkbox', () => {
			const checkbox = createCheckbox(world);

			checkbox.setDisabled(true);
			expect(checkbox.isDisabled()).toBe(true);
		});

		it('cannot toggle when disabled', () => {
			const checkbox = createCheckbox(world, { checked: false });

			checkbox.setDisabled(true);
			checkbox.toggle();

			expect(checkbox.isChecked()).toBe(false);
		});

		it('can enable a disabled checkbox', () => {
			const checkbox = createCheckbox(world);

			checkbox.setDisabled(true);
			expect(checkbox.isDisabled()).toBe(true);

			checkbox.setDisabled(false);
			expect(checkbox.isDisabled()).toBe(false);
		});
	});

	describe('chainable API', () => {
		it('supports method chaining', () => {
			const checkbox = createCheckbox(world);

			const result = checkbox.setPosition(10, 5).setChecked(true).toggle();

			expect(result).toBe(checkbox);
			expect(checkbox.isChecked()).toBe(false);
		});
	});

	describe('cleanup', () => {
		it('destroys checkbox and cleans up resources', () => {
			const checkbox = createCheckbox(world);
			const eid = checkbox.eid;

			checkbox.destroy();

			expect(isCheckboxWidget(world, eid)).toBe(false);
		});

		it('cleans up onChange callbacks on destroy', () => {
			const checkbox = createCheckbox(world);
			let called = false;

			checkbox.onChange(() => {
				called = true;
			});

			checkbox.destroy();

			// Recreate with same entity ID won't trigger old callback
			const checkbox2 = createCheckbox(world);
			checkbox2.toggle();
			expect(called).toBe(false);
		});
	});

	describe('focus support', () => {
		it('supports keyboard navigation', () => {
			const checkbox = createCheckbox(world, {
				focusable: true,
			});

			checkbox.focus();
			expect(checkbox.isFocused()).toBe(true);

			checkbox.blur();
			expect(checkbox.isFocused()).toBe(false);
		});

		it('can toggle with keyboard when focused', () => {
			const checkbox = createCheckbox(world, {
				focusable: true,
			});

			checkbox.focus();
			const handled = checkbox.handleKey('space');

			expect(handled).toBe(true);
			expect(checkbox.isChecked()).toBe(true);
		});

		it('does not handle keys when not focused', () => {
			const checkbox = createCheckbox(world, {
				focusable: true,
			});

			const handled = checkbox.handleKey('space');

			expect(handled).toBe(false);
			expect(checkbox.isChecked()).toBe(false);
		});
	});

	describe('label and layout', () => {
		it('sets and gets label', () => {
			const checkbox = createCheckbox(world, {
				label: 'Remember me',
			});

			expect(checkbox.getLabel()).toBe('Remember me');

			checkbox.setLabel('Stay signed in');
			expect(checkbox.getLabel()).toBe('Stay signed in');
		});

		it('auto-sizes width based on label', () => {
			const checkbox = createCheckbox(world, {
				label: 'Short',
			});

			const dims1 = getDimensions(world, checkbox.eid);

			checkbox.setLabel('This is a much longer label');

			const dims2 = getDimensions(world, checkbox.eid);
			expect((dims2?.width ?? 0) > (dims1?.width ?? 0)).toBe(true);
		});
	});

	describe('position methods', () => {
		it('sets position', () => {
			const checkbox = createCheckbox(world);

			checkbox.setPosition(15, 8);

			const pos = getPosition(world, checkbox.eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(8);
		});

		it('moves by delta', () => {
			const checkbox = createCheckbox(world, { x: 10, y: 5 });

			checkbox.move(3, -2);

			const pos = getPosition(world, checkbox.eid);
			expect(pos?.x).toBe(13);
			expect(pos?.y).toBe(3);
		});

		it('gets current position', () => {
			const checkbox = createCheckbox(world, { x: 7, y: 12 });

			const pos = checkbox.getPosition();

			expect(pos.x).toBe(7);
			expect(pos.y).toBe(12);
		});
	});
});
