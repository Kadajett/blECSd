import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity } from '../core/ecs';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import {
	attachCheckboxBehavior,
	CHECKBOX_STATE_MACHINE_CONFIG,
	checkboxStore,
	checkCheckbox,
	clearCheckboxCallbacks,
	clearCheckboxDisplay,
	DEFAULT_CHECKED_CHAR,
	DEFAULT_UNCHECKED_CHAR,
	disableCheckbox,
	enableCheckbox,
	getCheckboxChar,
	getCheckboxDisplay,
	getCheckboxState,
	handleCheckboxKeyPress,
	isCheckbox,
	isCheckboxDisabled,
	isCheckboxInState,
	isChecked,
	isUnchecked,
	onCheckboxChange,
	resetCheckboxStore,
	sendCheckboxEvent,
	setCheckboxDisplay,
	setChecked,
	toggleCheckbox,
	uncheckCheckbox,
} from './checkbox';
import { StateMachineStore } from './stateMachine';

describe('Checkbox Component', () => {
	let world: World;
	let eid: number;

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
		StateMachineStore.clear();
		resetCheckboxStore();
	});

	describe('CHECKBOX_STATE_MACHINE_CONFIG', () => {
		it('should have unchecked as initial state', () => {
			expect(CHECKBOX_STATE_MACHINE_CONFIG.initial).toBe('unchecked');
		});

		it('should have all expected states', () => {
			const states = Object.keys(CHECKBOX_STATE_MACHINE_CONFIG.states);
			expect(states).toContain('unchecked');
			expect(states).toContain('checked');
			expect(states).toContain('disabled');
		});

		it('should have correct transitions from unchecked', () => {
			const uncheckedState = CHECKBOX_STATE_MACHINE_CONFIG.states.unchecked;
			expect(uncheckedState.on?.toggle).toBe('checked');
			expect(uncheckedState.on?.check).toBe('checked');
			expect(uncheckedState.on?.disable).toBe('disabled');
		});

		it('should have correct transitions from checked', () => {
			const checkedState = CHECKBOX_STATE_MACHINE_CONFIG.states.checked;
			expect(checkedState.on?.toggle).toBe('unchecked');
			expect(checkedState.on?.uncheck).toBe('unchecked');
			expect(checkedState.on?.disable).toBe('disabled');
		});

		it('should have correct transitions from disabled', () => {
			const disabledState = CHECKBOX_STATE_MACHINE_CONFIG.states.disabled;
			expect(disabledState.on?.enable).toBe('unchecked');
		});
	});

	describe('attachCheckboxBehavior', () => {
		it('should attach state machine to entity', () => {
			const machineId = attachCheckboxBehavior(world, eid);
			expect(machineId).toBeGreaterThan(0);
		});

		it('should mark entity as checkbox', () => {
			attachCheckboxBehavior(world, eid);
			expect(checkboxStore.isCheckbox[eid]).toBe(1);
		});

		it('should store machine ID', () => {
			const machineId = attachCheckboxBehavior(world, eid);
			expect(checkboxStore.machineId[eid]).toBe(machineId);
		});

		it('should start in unchecked state by default', () => {
			attachCheckboxBehavior(world, eid);
			expect(getCheckboxState(world, eid)).toBe('unchecked');
		});

		it('should start in checked state when initialChecked is true', () => {
			attachCheckboxBehavior(world, eid, true);
			expect(getCheckboxState(world, eid)).toBe('checked');
		});
	});

	describe('isCheckbox', () => {
		it('should return true for checkbox entities', () => {
			attachCheckboxBehavior(world, eid);
			expect(isCheckbox(world, eid)).toBe(true);
		});

		it('should return false for non-checkbox entities', () => {
			expect(isCheckbox(world, eid)).toBe(false);
		});

		it('should return false for entities with only isCheckbox flag', () => {
			checkboxStore.isCheckbox[eid] = 1;
			expect(isCheckbox(world, eid)).toBe(false);
		});
	});

	describe('getCheckboxState', () => {
		it('should return current state', () => {
			attachCheckboxBehavior(world, eid);
			expect(getCheckboxState(world, eid)).toBe('unchecked');
		});

		it('should return undefined for non-checkboxes', () => {
			expect(getCheckboxState(world, eid)).toBeUndefined();
		});

		it('should return updated state after transition', () => {
			attachCheckboxBehavior(world, eid);
			sendCheckboxEvent(world, eid, 'toggle');
			expect(getCheckboxState(world, eid)).toBe('checked');
		});
	});

	describe('sendCheckboxEvent', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
		});

		it('should transition from unchecked to checked on toggle', () => {
			const result = sendCheckboxEvent(world, eid, 'toggle');
			expect(result).toBe(true);
			expect(getCheckboxState(world, eid)).toBe('checked');
		});

		it('should transition from checked to unchecked on toggle', () => {
			sendCheckboxEvent(world, eid, 'toggle');
			const result = sendCheckboxEvent(world, eid, 'toggle');
			expect(result).toBe(true);
			expect(getCheckboxState(world, eid)).toBe('unchecked');
		});

		it('should transition from unchecked to checked on check', () => {
			const result = sendCheckboxEvent(world, eid, 'check');
			expect(result).toBe(true);
			expect(getCheckboxState(world, eid)).toBe('checked');
		});

		it('should transition from checked to unchecked on uncheck', () => {
			sendCheckboxEvent(world, eid, 'check');
			const result = sendCheckboxEvent(world, eid, 'uncheck');
			expect(result).toBe(true);
			expect(getCheckboxState(world, eid)).toBe('unchecked');
		});

		it('should return false for invalid transitions', () => {
			const result = sendCheckboxEvent(world, eid, 'uncheck');
			expect(result).toBe(false);
			expect(getCheckboxState(world, eid)).toBe('unchecked');
		});

		it('should return false for non-checkbox entities', () => {
			const nonCheckbox = addEntity(world);
			const result = sendCheckboxEvent(world, nonCheckbox, 'toggle');
			expect(result).toBe(false);
		});
	});

	describe('state check functions', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
		});

		describe('isCheckboxInState', () => {
			it('should return true when in specified state', () => {
				expect(isCheckboxInState(world, eid, 'unchecked')).toBe(true);
			});

			it('should return false when not in specified state', () => {
				expect(isCheckboxInState(world, eid, 'checked')).toBe(false);
			});

			it('should return false for non-checkboxes', () => {
				const nonCheckbox = addEntity(world);
				expect(isCheckboxInState(world, nonCheckbox, 'unchecked')).toBe(false);
			});
		});

		describe('isChecked', () => {
			it('should return false when unchecked', () => {
				expect(isChecked(world, eid)).toBe(false);
			});

			it('should return true when checked', () => {
				sendCheckboxEvent(world, eid, 'toggle');
				expect(isChecked(world, eid)).toBe(true);
			});
		});

		describe('isUnchecked', () => {
			it('should return true when unchecked', () => {
				expect(isUnchecked(world, eid)).toBe(true);
			});

			it('should return false when checked', () => {
				sendCheckboxEvent(world, eid, 'toggle');
				expect(isUnchecked(world, eid)).toBe(false);
			});
		});

		describe('isCheckboxDisabled', () => {
			it('should return false when not disabled', () => {
				expect(isCheckboxDisabled(world, eid)).toBe(false);
			});

			it('should return true when disabled', () => {
				sendCheckboxEvent(world, eid, 'disable');
				expect(isCheckboxDisabled(world, eid)).toBe(true);
			});
		});
	});

	describe('toggleCheckbox', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
		});

		it('should toggle from unchecked to checked', () => {
			const result = toggleCheckbox(world, eid);
			expect(result).toBe(true);
			expect(isChecked(world, eid)).toBe(true);
		});

		it('should toggle from checked to unchecked', () => {
			toggleCheckbox(world, eid);
			const result = toggleCheckbox(world, eid);
			expect(result).toBe(true);
			expect(isUnchecked(world, eid)).toBe(true);
		});

		it('should not toggle when disabled', () => {
			disableCheckbox(world, eid);
			const result = toggleCheckbox(world, eid);
			expect(result).toBe(false);
			expect(isCheckboxDisabled(world, eid)).toBe(true);
		});
	});

	describe('checkCheckbox', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
		});

		it('should check an unchecked checkbox', () => {
			const result = checkCheckbox(world, eid);
			expect(result).toBe(true);
			expect(isChecked(world, eid)).toBe(true);
		});

		it('should return false for already checked checkbox', () => {
			checkCheckbox(world, eid);
			const result = checkCheckbox(world, eid);
			expect(result).toBe(false);
		});
	});

	describe('uncheckCheckbox', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid, true);
		});

		it('should uncheck a checked checkbox', () => {
			const result = uncheckCheckbox(world, eid);
			expect(result).toBe(true);
			expect(isUnchecked(world, eid)).toBe(true);
		});

		it('should return false for already unchecked checkbox', () => {
			uncheckCheckbox(world, eid);
			const result = uncheckCheckbox(world, eid);
			expect(result).toBe(false);
		});
	});

	describe('disableCheckbox', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
		});

		it('should disable checkbox from unchecked state', () => {
			const result = disableCheckbox(world, eid);
			expect(result).toBe(true);
			expect(isCheckboxDisabled(world, eid)).toBe(true);
		});

		it('should disable checkbox from checked state', () => {
			checkCheckbox(world, eid);
			const result = disableCheckbox(world, eid);
			expect(result).toBe(true);
			expect(isCheckboxDisabled(world, eid)).toBe(true);
		});
	});

	describe('enableCheckbox', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
			disableCheckbox(world, eid);
		});

		it('should enable disabled checkbox', () => {
			const result = enableCheckbox(world, eid);
			expect(result).toBe(true);
			expect(getCheckboxState(world, eid)).toBe('unchecked');
		});

		it('should return false for non-disabled checkbox', () => {
			enableCheckbox(world, eid);
			const result = enableCheckbox(world, eid);
			expect(result).toBe(false);
		});
	});

	describe('setChecked', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
		});

		it('should check unchecked checkbox when set to true', () => {
			const result = setChecked(world, eid, true);
			expect(result).toBe(true);
			expect(isChecked(world, eid)).toBe(true);
		});

		it('should uncheck checked checkbox when set to false', () => {
			checkCheckbox(world, eid);
			const result = setChecked(world, eid, false);
			expect(result).toBe(true);
			expect(isUnchecked(world, eid)).toBe(true);
		});

		it('should return false when already in desired state', () => {
			const result = setChecked(world, eid, false);
			expect(result).toBe(false);
		});

		it('should return false for non-checkboxes', () => {
			const nonCheckbox = addEntity(world);
			const result = setChecked(world, nonCheckbox, true);
			expect(result).toBe(false);
		});

		it('should return false for disabled checkboxes', () => {
			disableCheckbox(world, eid);
			const result = setChecked(world, eid, true);
			expect(result).toBe(false);
		});
	});

	describe('onCheckboxChange', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
		});

		it('should register callback', () => {
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			toggleCheckbox(world, eid);

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should return unsubscribe function', () => {
			const callback = vi.fn();
			const unsubscribe = onCheckboxChange(eid, callback);

			unsubscribe();

			toggleCheckbox(world, eid);

			expect(callback).not.toHaveBeenCalled();
		});

		it('should support multiple callbacks', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			onCheckboxChange(eid, callback1);
			onCheckboxChange(eid, callback2);

			toggleCheckbox(world, eid);

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
		});

		it('should call callback with correct value on check', () => {
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			checkCheckbox(world, eid);

			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should call callback with correct value on uncheck', () => {
			checkCheckbox(world, eid);
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			uncheckCheckbox(world, eid);

			expect(callback).toHaveBeenCalledWith(false);
		});

		it('should call callback on each toggle', () => {
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			toggleCheckbox(world, eid);
			expect(callback).toHaveBeenLastCalledWith(true);

			toggleCheckbox(world, eid);
			expect(callback).toHaveBeenLastCalledWith(false);

			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should not call callback when disabled', () => {
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			disableCheckbox(world, eid);
			toggleCheckbox(world, eid);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('clearCheckboxCallbacks', () => {
		it('should remove all callbacks for entity', () => {
			attachCheckboxBehavior(world, eid);
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			clearCheckboxCallbacks(eid);

			toggleCheckbox(world, eid);

			expect(callback).not.toHaveBeenCalled();
		});

		it('should not affect other entities', () => {
			const eid2 = addEntity(world);
			attachCheckboxBehavior(world, eid);
			attachCheckboxBehavior(world, eid2);

			const callback1 = vi.fn();
			const callback2 = vi.fn();
			onCheckboxChange(eid, callback1);
			onCheckboxChange(eid2, callback2);

			clearCheckboxCallbacks(eid);

			toggleCheckbox(world, eid);
			toggleCheckbox(world, eid2);

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledTimes(1);
		});
	});

	describe('handleCheckboxKeyPress', () => {
		beforeEach(() => {
			attachCheckboxBehavior(world, eid);
		});

		it('should toggle on Enter', () => {
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			const result = handleCheckboxKeyPress(world, eid, 'enter');

			expect(result).toBe(true);
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should toggle on return', () => {
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			const result = handleCheckboxKeyPress(world, eid, 'return');

			expect(result).toBe(true);
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should toggle on Space', () => {
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			const result = handleCheckboxKeyPress(world, eid, 'space');

			expect(result).toBe(true);
			expect(callback).toHaveBeenCalledWith(true);
		});

		it('should return false for unhandled keys', () => {
			const result = handleCheckboxKeyPress(world, eid, 'a');
			expect(result).toBe(false);
		});

		it('should return false for disabled checkboxes', () => {
			disableCheckbox(world, eid);

			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			const result = handleCheckboxKeyPress(world, eid, 'enter');

			expect(result).toBe(false);
			expect(callback).not.toHaveBeenCalled();
		});

		it('should return false for non-checkboxes', () => {
			const nonCheckbox = addEntity(world);
			const result = handleCheckboxKeyPress(world, nonCheckbox, 'enter');
			expect(result).toBe(false);
		});
	});

	describe('resetCheckboxStore', () => {
		it('should reset all checkbox data', () => {
			attachCheckboxBehavior(world, eid);
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			resetCheckboxStore();

			expect(checkboxStore.isCheckbox[eid]).toBe(0);
			expect(checkboxStore.machineId[eid]).toBe(0);

			// Callbacks should also be cleared
			toggleCheckbox(world, eid);
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('complete checkbox interaction flow', () => {
		it('should handle full toggle cycle', () => {
			attachCheckboxBehavior(world, eid);
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			expect(getCheckboxState(world, eid)).toBe('unchecked');

			toggleCheckbox(world, eid);
			expect(getCheckboxState(world, eid)).toBe('checked');
			expect(callback).toHaveBeenLastCalledWith(true);

			toggleCheckbox(world, eid);
			expect(getCheckboxState(world, eid)).toBe('unchecked');
			expect(callback).toHaveBeenLastCalledWith(false);

			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should handle keyboard navigation flow', () => {
			attachCheckboxBehavior(world, eid);
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			expect(getCheckboxState(world, eid)).toBe('unchecked');

			handleCheckboxKeyPress(world, eid, 'space');
			expect(getCheckboxState(world, eid)).toBe('checked');
			expect(callback).toHaveBeenCalledTimes(1);

			handleCheckboxKeyPress(world, eid, 'enter');
			expect(getCheckboxState(world, eid)).toBe('unchecked');
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should handle disable/enable flow', () => {
			attachCheckboxBehavior(world, eid);
			const callback = vi.fn();
			onCheckboxChange(eid, callback);

			disableCheckbox(world, eid);
			expect(isCheckboxDisabled(world, eid)).toBe(true);

			// Cannot toggle when disabled
			toggleCheckbox(world, eid);
			expect(isCheckboxDisabled(world, eid)).toBe(true);
			expect(callback).not.toHaveBeenCalled();

			enableCheckbox(world, eid);
			expect(getCheckboxState(world, eid)).toBe('unchecked');

			// Can toggle after enabling
			toggleCheckbox(world, eid);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should preserve checked state through disable/enable', () => {
			attachCheckboxBehavior(world, eid, true);
			expect(isChecked(world, eid)).toBe(true);

			disableCheckbox(world, eid);
			expect(isCheckboxDisabled(world, eid)).toBe(true);

			// Note: Enable always returns to unchecked state by design
			enableCheckbox(world, eid);
			expect(isUnchecked(world, eid)).toBe(true);
		});
	});

	describe('display configuration', () => {
		describe('DEFAULT_CHECKED_CHAR', () => {
			it('should be the expected Unicode character', () => {
				expect(DEFAULT_CHECKED_CHAR).toBe('☑');
			});
		});

		describe('DEFAULT_UNCHECKED_CHAR', () => {
			it('should be the expected Unicode character', () => {
				expect(DEFAULT_UNCHECKED_CHAR).toBe('☐');
			});
		});

		describe('getCheckboxDisplay', () => {
			it('should return defaults for entity without custom display', () => {
				const display = getCheckboxDisplay(eid);

				expect(display.checkedChar).toBe(DEFAULT_CHECKED_CHAR);
				expect(display.uncheckedChar).toBe(DEFAULT_UNCHECKED_CHAR);
			});

			it('should return custom display after setCheckboxDisplay', () => {
				setCheckboxDisplay(eid, {
					checkedChar: '[X]',
					uncheckedChar: '[_]',
				});

				const display = getCheckboxDisplay(eid);
				expect(display.checkedChar).toBe('[X]');
				expect(display.uncheckedChar).toBe('[_]');
			});
		});

		describe('setCheckboxDisplay', () => {
			it('should set checked character only', () => {
				setCheckboxDisplay(eid, { checkedChar: '✓' });

				const display = getCheckboxDisplay(eid);
				expect(display.checkedChar).toBe('✓');
				expect(display.uncheckedChar).toBe(DEFAULT_UNCHECKED_CHAR);
			});

			it('should set unchecked character only', () => {
				setCheckboxDisplay(eid, { uncheckedChar: '○' });

				const display = getCheckboxDisplay(eid);
				expect(display.checkedChar).toBe(DEFAULT_CHECKED_CHAR);
				expect(display.uncheckedChar).toBe('○');
			});

			it('should set both characters', () => {
				setCheckboxDisplay(eid, {
					checkedChar: '●',
					uncheckedChar: '○',
				});

				const display = getCheckboxDisplay(eid);
				expect(display.checkedChar).toBe('●');
				expect(display.uncheckedChar).toBe('○');
			});

			it('should update existing display', () => {
				setCheckboxDisplay(eid, { checkedChar: 'A' });
				setCheckboxDisplay(eid, { checkedChar: 'B' });

				const display = getCheckboxDisplay(eid);
				expect(display.checkedChar).toBe('B');
			});

			it('should preserve other character when updating one', () => {
				setCheckboxDisplay(eid, {
					checkedChar: '✓',
					uncheckedChar: '✗',
				});
				setCheckboxDisplay(eid, { checkedChar: '●' });

				const display = getCheckboxDisplay(eid);
				expect(display.checkedChar).toBe('●');
				expect(display.uncheckedChar).toBe('✗');
			});
		});

		describe('getCheckboxChar', () => {
			beforeEach(() => {
				attachCheckboxBehavior(world, eid);
				setCheckboxDisplay(eid, {
					checkedChar: '[X]',
					uncheckedChar: '[_]',
				});
			});

			it('should return unchecked char when unchecked', () => {
				expect(getCheckboxChar(world, eid)).toBe('[_]');
			});

			it('should return checked char when checked', () => {
				toggleCheckbox(world, eid);
				expect(getCheckboxChar(world, eid)).toBe('[X]');
			});

			it('should return unchecked char when disabled', () => {
				disableCheckbox(world, eid);
				expect(getCheckboxChar(world, eid)).toBe('[_]');
			});

			it('should return default unchecked char for non-checkbox', () => {
				const otherEid = addEntity(world);
				expect(getCheckboxChar(world, otherEid)).toBe(DEFAULT_UNCHECKED_CHAR);
			});
		});

		describe('clearCheckboxDisplay', () => {
			it('should remove custom display', () => {
				setCheckboxDisplay(eid, {
					checkedChar: 'X',
					uncheckedChar: 'O',
				});

				clearCheckboxDisplay(eid);

				const display = getCheckboxDisplay(eid);
				expect(display.checkedChar).toBe(DEFAULT_CHECKED_CHAR);
				expect(display.uncheckedChar).toBe(DEFAULT_UNCHECKED_CHAR);
			});

			it('should not affect other entities', () => {
				const eid2 = addEntity(world);

				setCheckboxDisplay(eid, { checkedChar: 'A' });
				setCheckboxDisplay(eid2, { checkedChar: 'B' });

				clearCheckboxDisplay(eid);

				expect(getCheckboxDisplay(eid).checkedChar).toBe(DEFAULT_CHECKED_CHAR);
				expect(getCheckboxDisplay(eid2).checkedChar).toBe('B');
			});
		});

		describe('resetCheckboxStore', () => {
			it('should clear display store', () => {
				setCheckboxDisplay(eid, { checkedChar: 'X' });

				resetCheckboxStore();

				expect(getCheckboxDisplay(eid).checkedChar).toBe(DEFAULT_CHECKED_CHAR);
			});
		});
	});
});
