/**
 * RadioButton and RadioGroup widget tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getPosition } from '../components/position';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import {
	createRadioButton,
	createRadioGroup,
	isRadioButtonWidget,
	isRadioGroupWidget,
	resetRadioWidgetStore,
} from './radioButton';

describe('RadioGroup Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetRadioWidgetStore();
	});

	describe('createRadioGroup', () => {
		it('creates a radio group with default config', () => {
			const group = createRadioGroup(world);

			expect(group).toBeDefined();
			expect(group.eid).toBeGreaterThan(0);
			expect(isRadioGroupWidget(world, group.eid)).toBe(true);
		});

		it('creates a radio group with custom position', () => {
			const group = createRadioGroup(world, {
				x: 5,
				y: 10,
			});

			const pos = getPosition(world, group.eid);
			expect(pos?.x).toBe(5);
			expect(pos?.y).toBe(10);
		});
	});

	describe('selected value', () => {
		it('starts with no selection', () => {
			const group = createRadioGroup(world);

			expect(group.getSelectedValue()).toBeNull();
		});

		it('returns selected value after selection', () => {
			const group = createRadioGroup(world);
			const button = group.addOption('option1', 'Option 1');

			button.select();

			expect(group.getSelectedValue()).toBe('option1');
		});

		it('updates selection when different button is selected', () => {
			const group = createRadioGroup(world);
			const button1 = group.addOption('opt1', 'First');
			const button2 = group.addOption('opt2', 'Second');

			button1.select();
			expect(group.getSelectedValue()).toBe('opt1');

			button2.select();
			expect(group.getSelectedValue()).toBe('opt2');
		});
	});

	describe('onChange callback', () => {
		it('calls onChange when selection changes', () => {
			const group = createRadioGroup(world);
			let selectedValue: string | null = null;

			group.onChange((value) => {
				selectedValue = value;
			});

			const button = group.addOption('test', 'Test');
			button.select();

			expect(selectedValue).toBe('test');
		});

		it('supports multiple onChange callbacks', () => {
			const group = createRadioGroup(world);
			const calls: (string | null)[] = [];

			group.onChange((value) => calls.push(value));
			group.onChange((value) => calls.push(value));

			const button = group.addOption('val', 'Value');
			button.select();

			expect(calls).toEqual(['val', 'val']);
		});
	});

	describe('addOption', () => {
		it('creates radio buttons with addOption', () => {
			const group = createRadioGroup(world);

			const button1 = group.addOption('opt1', 'Option 1');
			const button2 = group.addOption('opt2', 'Option 2');

			expect(button1).toBeDefined();
			expect(button2).toBeDefined();
			expect(button1.eid).not.toBe(button2.eid);
		});

		it('auto-positions buttons vertically', () => {
			const group = createRadioGroup(world, { x: 5, y: 10 });

			const button1 = group.addOption('opt1', 'First');
			const button2 = group.addOption('opt2', 'Second');

			const pos1 = button1.getPosition();
			const pos2 = button2.getPosition();

			expect(pos1.x).toBe(5);
			expect(pos1.y).toBe(10);
			expect(pos2.x).toBe(5);
			expect(pos2.y).toBe(11);
		});
	});

	describe('exclusive selection', () => {
		it('deselects other buttons when one is selected', () => {
			const group = createRadioGroup(world);
			const button1 = group.addOption('opt1', 'First');
			const button2 = group.addOption('opt2', 'Second');

			button1.select();
			expect(button1.isSelected()).toBe(true);
			expect(button2.isSelected()).toBe(false);

			button2.select();
			expect(button1.isSelected()).toBe(false);
			expect(button2.isSelected()).toBe(true);
		});
	});
});

describe('RadioButton Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetRadioWidgetStore();
	});

	describe('createRadioButton', () => {
		it('creates a radio button with default config', () => {
			const button = createRadioButton(world);

			expect(button).toBeDefined();
			expect(button.eid).toBeGreaterThan(0);
			expect(isRadioButtonWidget(world, button.eid)).toBe(true);
		});

		it('creates a radio button with custom label', () => {
			const button = createRadioButton(world, {
				label: 'Option A',
			});

			expect(button.getLabel()).toBe('Option A');
		});

		it('creates a radio button with custom value', () => {
			const button = createRadioButton(world, {
				value: 'custom-value',
			});

			expect(button.getValue()).toBe('custom-value');
		});

		it('creates a radio button with custom characters', () => {
			const button = createRadioButton(world, {
				selectedChar: '(x)',
				unselectedChar: '( )',
			});

			expect(button.getChar()).toBe('( )');
			button.select();
			expect(button.getChar()).toBe('(x)');
		});
	});

	describe('selection state', () => {
		it('starts unselected', () => {
			const button = createRadioButton(world);

			expect(button.isSelected()).toBe(false);
		});

		it('can be selected', () => {
			const button = createRadioButton(world);

			button.select();

			expect(button.isSelected()).toBe(true);
		});

		it('can be deselected', () => {
			const button = createRadioButton(world);

			button.select();
			button.deselect();

			expect(button.isSelected()).toBe(false);
		});

		it('returns correct character for state', () => {
			const button = createRadioButton(world, {
				selectedChar: '●',
				unselectedChar: '○',
			});

			expect(button.getChar()).toBe('○');

			button.select();
			expect(button.getChar()).toBe('●');
		});
	});

	describe('disabled state', () => {
		it('can disable a radio button', () => {
			const button = createRadioButton(world);

			button.setDisabled(true);

			expect(button.isDisabled()).toBe(true);
		});

		it('cannot select when disabled', () => {
			const button = createRadioButton(world);

			button.setDisabled(true);
			button.select();

			expect(button.isSelected()).toBe(false);
		});

		it('can enable a disabled radio button', () => {
			const button = createRadioButton(world);

			button.setDisabled(true);
			button.setDisabled(false);

			expect(button.isDisabled()).toBe(false);
		});
	});

	describe('focus support', () => {
		it('supports keyboard navigation', () => {
			const button = createRadioButton(world, {
				focusable: true,
			});

			button.focus();
			expect(button.isFocused()).toBe(true);

			button.blur();
			expect(button.isFocused()).toBe(false);
		});

		it('can select with keyboard when focused', () => {
			const button = createRadioButton(world, {
				focusable: true,
			});

			button.focus();
			const handled = button.handleKey('space');

			expect(handled).toBe(true);
			expect(button.isSelected()).toBe(true);
		});
	});

	describe('chainable API', () => {
		it('supports method chaining', () => {
			const button = createRadioButton(world);

			const result = button.setPosition(10, 5).select().setLabel('New Label');

			expect(result).toBe(button);
			expect(button.isSelected()).toBe(true);
			expect(button.getLabel()).toBe('New Label');
		});
	});

	describe('cleanup', () => {
		it('destroys radio button and cleans up resources', () => {
			const button = createRadioButton(world);
			const eid = button.eid;

			button.destroy();

			expect(isRadioButtonWidget(world, eid)).toBe(false);
		});
	});

	describe('position methods', () => {
		it('sets position', () => {
			const button = createRadioButton(world);

			button.setPosition(15, 8);

			const pos = getPosition(world, button.eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(8);
		});

		it('moves by delta', () => {
			const button = createRadioButton(world, { x: 10, y: 5 });

			button.move(3, -2);

			const pos = getPosition(world, button.eid);
			expect(pos?.x).toBe(13);
			expect(pos?.y).toBe(3);
		});
	});
});
