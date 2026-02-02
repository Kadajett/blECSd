import { createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { World } from '../core/types';
import { createBoxEntity } from '../core/entities';
import { StateMachineStore } from './stateMachine';
import {
	attachRadioButtonBehavior,
	attachRadioSetBehavior,
	clearRadioButtonDisplay,
	clearRadioSetCallbacks,
	DEFAULT_RADIO_SELECTED_CHAR,
	DEFAULT_RADIO_UNSELECTED_CHAR,
	deselectRadioButton,
	disableRadioButton,
	enableRadioButton,
	getRadioButtonChar,
	getRadioButtonDisplay,
	getRadioButtonsInSet,
	getRadioButtonState,
	getRadioSet,
	getRadioValue,
	getSelectedButton,
	getSelectedValue,
	handleRadioButtonKeyPress,
	isRadioButton,
	isRadioButtonDisabled,
	isRadioSelected,
	isRadioSet,
	onRadioSelect,
	resetRadioButtonStore,
	selectRadioButton,
	selectRadioByValue,
	setRadioButtonDisplay,
	setRadioSet,
	setRadioValue,
} from './radioButton';

describe('RadioButton Component', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		resetRadioButtonStore();
		StateMachineStore.clear();
	});

	describe('RadioSet', () => {
		it('marks an entity as a radio set', () => {
			const eid = createBoxEntity(world);
			attachRadioSetBehavior(world, eid);

			expect(isRadioSet(world, eid)).toBe(true);
		});

		it('starts with no selection', () => {
			const eid = createBoxEntity(world);
			attachRadioSetBehavior(world, eid);

			expect(getSelectedButton(eid)).toBe(0);
			expect(getSelectedValue(eid)).toBeNull();
		});

		it('tracks selected button', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const button = createBoxEntity(world);
			attachRadioButtonBehavior(world, button, radioSet);
			setRadioValue(button, 'option1');

			selectRadioButton(world, button);

			expect(getSelectedButton(radioSet)).toBe(button);
			expect(getSelectedValue(radioSet)).toBe('option1');
		});

		it('calls selection callback', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const callback = vi.fn();
			onRadioSelect(radioSet, callback);

			const button = createBoxEntity(world);
			attachRadioButtonBehavior(world, button, radioSet);
			setRadioValue(button, 'test');

			selectRadioButton(world, button);

			expect(callback).toHaveBeenCalledWith('test', button);
		});

		it('unsubscribes from callback', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const callback = vi.fn();
			const unsubscribe = onRadioSelect(radioSet, callback);
			unsubscribe();

			const button = createBoxEntity(world);
			attachRadioButtonBehavior(world, button, radioSet);
			selectRadioButton(world, button);

			expect(callback).not.toHaveBeenCalled();
		});

		it('clears callbacks', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const callback = vi.fn();
			onRadioSelect(radioSet, callback);
			clearRadioSetCallbacks(radioSet);

			const button = createBoxEntity(world);
			attachRadioButtonBehavior(world, button, radioSet);
			selectRadioButton(world, button);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('RadioButton Behavior', () => {
		it('marks an entity as a radio button', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			expect(isRadioButton(world, eid)).toBe(true);
		});

		it('starts unselected', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			expect(getRadioButtonState(world, eid)).toBe('unselected');
			expect(isRadioSelected(world, eid)).toBe(false);
		});

		it('tracks radio set parent', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const button = createBoxEntity(world);
			attachRadioButtonBehavior(world, button, radioSet);

			expect(getRadioSet(button)).toBe(radioSet);
		});

		it('can set radio set after creation', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const button = createBoxEntity(world);
			attachRadioButtonBehavior(world, button);
			setRadioSet(button, radioSet);

			expect(getRadioSet(button)).toBe(radioSet);
		});
	});

	describe('Selection', () => {
		it('selects a radio button', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			selectRadioButton(world, eid);

			expect(isRadioSelected(world, eid)).toBe(true);
			expect(getRadioButtonState(world, eid)).toBe('selected');
		});

		it('enforces mutual exclusion in set', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const button1 = createBoxEntity(world);
			const button2 = createBoxEntity(world);
			attachRadioButtonBehavior(world, button1, radioSet);
			attachRadioButtonBehavior(world, button2, radioSet);

			selectRadioButton(world, button1);
			expect(isRadioSelected(world, button1)).toBe(true);

			selectRadioButton(world, button2);
			expect(isRadioSelected(world, button1)).toBe(false);
			expect(isRadioSelected(world, button2)).toBe(true);
		});

		it('deselects a radio button', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			selectRadioButton(world, eid);
			deselectRadioButton(world, eid);

			expect(isRadioSelected(world, eid)).toBe(false);
		});

		it('selects by value', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const button1 = createBoxEntity(world);
			const button2 = createBoxEntity(world);
			attachRadioButtonBehavior(world, button1, radioSet);
			attachRadioButtonBehavior(world, button2, radioSet);
			setRadioValue(button1, 'opt1');
			setRadioValue(button2, 'opt2');

			selectRadioByValue(world, radioSet, 'opt2');

			expect(isRadioSelected(world, button2)).toBe(true);
			expect(getSelectedValue(radioSet)).toBe('opt2');
		});
	});

	describe('Value', () => {
		it('gets and sets value', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			setRadioValue(eid, 'testValue');

			expect(getRadioValue(eid)).toBe('testValue');
		});
	});

	describe('Disable/Enable', () => {
		it('disables a radio button', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			disableRadioButton(world, eid);

			expect(isRadioButtonDisabled(world, eid)).toBe(true);
			expect(getRadioButtonState(world, eid)).toBe('disabled');
		});

		it('enables a radio button', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			disableRadioButton(world, eid);
			enableRadioButton(world, eid);

			expect(isRadioButtonDisabled(world, eid)).toBe(false);
		});

		it('cannot select disabled button', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			disableRadioButton(world, eid);
			selectRadioButton(world, eid);

			expect(isRadioSelected(world, eid)).toBe(false);
		});
	});

	describe('Display', () => {
		it('gets default display', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			const display = getRadioButtonDisplay(eid);

			expect(display.selectedChar).toBe(DEFAULT_RADIO_SELECTED_CHAR);
			expect(display.unselectedChar).toBe(DEFAULT_RADIO_UNSELECTED_CHAR);
		});

		it('sets custom display', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			setRadioButtonDisplay(eid, {
				selectedChar: '(x)',
				unselectedChar: '( )',
			});

			const display = getRadioButtonDisplay(eid);
			expect(display.selectedChar).toBe('(x)');
			expect(display.unselectedChar).toBe('( )');
		});

		it('gets correct character based on state', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			expect(getRadioButtonChar(world, eid)).toBe(DEFAULT_RADIO_UNSELECTED_CHAR);

			selectRadioButton(world, eid);

			expect(getRadioButtonChar(world, eid)).toBe(DEFAULT_RADIO_SELECTED_CHAR);
		});

		it('clears display', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			setRadioButtonDisplay(eid, { selectedChar: '(x)' });
			clearRadioButtonDisplay(eid);

			const display = getRadioButtonDisplay(eid);
			expect(display.selectedChar).toBe(DEFAULT_RADIO_SELECTED_CHAR);
		});
	});

	describe('Key Handling', () => {
		it('selects on space', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			const handled = handleRadioButtonKeyPress(world, eid, 'space');

			expect(handled).toBe(true);
			expect(isRadioSelected(world, eid)).toBe(true);
		});

		it('selects on enter', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			const handled = handleRadioButtonKeyPress(world, eid, 'return');

			expect(handled).toBe(true);
			expect(isRadioSelected(world, eid)).toBe(true);
		});

		it('ignores when disabled', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			disableRadioButton(world, eid);
			const handled = handleRadioButtonKeyPress(world, eid, 'space');

			expect(handled).toBe(false);
			expect(isRadioSelected(world, eid)).toBe(false);
		});

		it('ignores unrelated keys', () => {
			const eid = createBoxEntity(world);
			attachRadioButtonBehavior(world, eid);

			const handled = handleRadioButtonKeyPress(world, eid, 'a');

			expect(handled).toBe(false);
		});
	});

	describe('getRadioButtonsInSet', () => {
		it('returns all buttons in a set', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const button1 = createBoxEntity(world);
			const button2 = createBoxEntity(world);
			const button3 = createBoxEntity(world);
			attachRadioButtonBehavior(world, button1, radioSet);
			attachRadioButtonBehavior(world, button2, radioSet);
			attachRadioButtonBehavior(world, button3, radioSet);

			const buttons = getRadioButtonsInSet(radioSet);

			expect(buttons).toContain(button1);
			expect(buttons).toContain(button2);
			expect(buttons).toContain(button3);
			expect(buttons.length).toBe(3);
		});

		it('returns empty array for empty set', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const buttons = getRadioButtonsInSet(radioSet);

			expect(buttons.length).toBe(0);
		});
	});

	describe('resetRadioButtonStore', () => {
		it('resets all data', () => {
			const radioSet = createBoxEntity(world);
			attachRadioSetBehavior(world, radioSet);

			const button = createBoxEntity(world);
			attachRadioButtonBehavior(world, button, radioSet);

			resetRadioButtonStore();

			expect(isRadioSet(world, radioSet)).toBe(false);
			expect(isRadioButton(world, button)).toBe(false);
		});
	});
});
