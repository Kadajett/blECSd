import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '../core/types';
import {
	attachSelectBehavior,
	clearSelectCallbacks,
	clearSelectDisplay,
	clearSelection,
	closeSelect,
	DEFAULT_CLOSED_INDICATOR,
	DEFAULT_OPEN_INDICATOR,
	DEFAULT_SELECTED_MARK,
	DEFAULT_SEPARATOR,
	disableSelect,
	enableSelect,
	getHighlightedIndex,
	getOptionAt,
	getOptionCount,
	getSelectDisplay,
	getSelectedIndex,
	getSelectedLabel,
	getSelectedOption,
	getSelectedValue,
	getSelectIndicator,
	getSelectOptions,
	getSelectState,
	handleSelectKeyPress,
	highlightNext,
	highlightPrev,
	isSelect,
	isSelectDisabled,
	isSelectInState,
	isSelectOpen,
	onSelectChange,
	onSelectClose,
	onSelectOpen,
	openSelect,
	resetSelectStore,
	SELECT_STATE_MACHINE_CONFIG,
	type SelectOption,
	selectHighlighted,
	selectOptionByIndex,
	selectOptionByValue,
	selectStore,
	setHighlightedIndex,
	setSelectDisplay,
	setSelectOptions,
	toggleSelect,
} from './select';
import { StateMachineStore } from './stateMachine';

describe('Select Component', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		resetSelectStore();
		StateMachineStore.clear();
	});

	describe('attachSelectBehavior', () => {
		it('marks entity as a select', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			expect(isSelect(world, eid)).toBe(true);
		});

		it('initializes with provided options', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'Option 1', value: 'opt1' },
				{ label: 'Option 2', value: 'opt2' },
			];
			attachSelectBehavior(world, eid, options);

			expect(getOptionCount(eid)).toBe(2);
			expect(getSelectOptions(eid)).toEqual(options);
		});

		it('initializes with selected index', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'Option 1', value: 'opt1' },
				{ label: 'Option 2', value: 'opt2' },
			];
			attachSelectBehavior(world, eid, options, 1);

			expect(getSelectedIndex(eid)).toBe(1);
			expect(getHighlightedIndex(eid)).toBe(1);
		});

		it('defaults to closed state', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			expect(getSelectState(world, eid)).toBe('closed');
		});
	});

	describe('State Machine', () => {
		it('has correct state machine configuration', () => {
			expect(SELECT_STATE_MACHINE_CONFIG.initial).toBe('closed');
			expect(SELECT_STATE_MACHINE_CONFIG.states.closed.on?.open).toBe('open');
			expect(SELECT_STATE_MACHINE_CONFIG.states.open.on?.close).toBe('closed');
			expect(SELECT_STATE_MACHINE_CONFIG.states.disabled.on?.enable).toBe('closed');
		});

		it('transitions from closed to open', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			expect(isSelectOpen(world, eid)).toBe(false);
			openSelect(world, eid);
			expect(isSelectOpen(world, eid)).toBe(true);
		});

		it('transitions from open to closed', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			openSelect(world, eid);
			expect(isSelectOpen(world, eid)).toBe(true);

			closeSelect(world, eid);
			expect(isSelectOpen(world, eid)).toBe(false);
		});

		it('toggles open/closed state', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			expect(isSelectOpen(world, eid)).toBe(false);
			toggleSelect(world, eid);
			expect(isSelectOpen(world, eid)).toBe(true);
			toggleSelect(world, eid);
			expect(isSelectOpen(world, eid)).toBe(false);
		});

		it('can be disabled and enabled', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			disableSelect(world, eid);
			expect(isSelectDisabled(world, eid)).toBe(true);

			enableSelect(world, eid);
			expect(isSelectDisabled(world, eid)).toBe(false);
		});

		it('cannot open when disabled', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			disableSelect(world, eid);
			const result = openSelect(world, eid);

			expect(result).toBe(false);
			expect(isSelectOpen(world, eid)).toBe(false);
		});

		it('checks if select is in specific state', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			expect(isSelectInState(world, eid, 'closed')).toBe(true);
			expect(isSelectInState(world, eid, 'open')).toBe(false);

			openSelect(world, eid);
			expect(isSelectInState(world, eid, 'closed')).toBe(false);
			expect(isSelectInState(world, eid, 'open')).toBe(true);
		});
	});

	describe('Options Management', () => {
		it('gets option by index', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			];
			attachSelectBehavior(world, eid, options);

			expect(getOptionAt(eid, 0)).toEqual({ label: 'A', value: 'a' });
			expect(getOptionAt(eid, 1)).toEqual({ label: 'B', value: 'b' });
			expect(getOptionAt(eid, 2)).toBeUndefined();
		});

		it('sets new options', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'Old', value: 'old' }]);

			const newOptions: SelectOption[] = [
				{ label: 'New 1', value: 'new1' },
				{ label: 'New 2', value: 'new2' },
			];
			setSelectOptions(world, eid, newOptions);

			expect(getOptionCount(eid)).toBe(2);
			expect(getSelectOptions(eid)).toEqual(newOptions);
		});

		it('resets selection when options change', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			];
			attachSelectBehavior(world, eid, options, 1);

			setSelectOptions(world, eid, [{ label: 'Only', value: 'only' }]);

			// Should reset to 0 since previous selection (1) is out of bounds
			expect(getSelectedIndex(eid)).toBe(0);
		});
	});

	describe('Selection', () => {
		it('selects option by index', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			];
			attachSelectBehavior(world, eid, options);

			selectOptionByIndex(world, eid, 1);

			expect(getSelectedIndex(eid)).toBe(1);
			expect(getSelectedOption(eid)).toEqual({ label: 'B', value: 'b' });
			expect(getSelectedValue(eid)).toBe('b');
			expect(getSelectedLabel(eid)).toBe('B');
		});

		it('selects option by value', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			];
			attachSelectBehavior(world, eid, options);

			selectOptionByValue(world, eid, 'b');

			expect(getSelectedIndex(eid)).toBe(1);
		});

		it('returns false for invalid selection', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);

			expect(selectOptionByIndex(world, eid, 5)).toBe(false);
			expect(selectOptionByValue(world, eid, 'invalid')).toBe(false);
		});

		it('clears selection', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [{ label: 'A', value: 'a' }];
			attachSelectBehavior(world, eid, options, 0);

			clearSelection(world, eid);

			expect(getSelectedIndex(eid)).toBe(-1);
			expect(getSelectedOption(eid)).toBeUndefined();
		});

		it('closes dropdown after selection', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			];
			attachSelectBehavior(world, eid, options);

			openSelect(world, eid);
			selectOptionByIndex(world, eid, 1);

			expect(isSelectOpen(world, eid)).toBe(false);
		});
	});

	describe('Highlighting (Keyboard Navigation)', () => {
		it('gets and sets highlighted index', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
				{ label: 'C', value: 'c' },
			];
			attachSelectBehavior(world, eid, options);

			setHighlightedIndex(world, eid, 2);
			expect(getHighlightedIndex(eid)).toBe(2);
		});

		it('clamps highlighted index to valid range', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			]);

			setHighlightedIndex(world, eid, 10);
			expect(getHighlightedIndex(eid)).toBe(1);

			setHighlightedIndex(world, eid, -5);
			expect(getHighlightedIndex(eid)).toBe(0);
		});

		it('highlights next option', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
				{ label: 'C', value: 'c' },
			]);

			expect(getHighlightedIndex(eid)).toBe(0);
			highlightNext(world, eid);
			expect(getHighlightedIndex(eid)).toBe(1);
		});

		it('wraps around when highlighting next at end', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			]);

			setHighlightedIndex(world, eid, 1);
			highlightNext(world, eid, true);
			expect(getHighlightedIndex(eid)).toBe(0);
		});

		it('does not wrap when wrap is false', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			]);

			setHighlightedIndex(world, eid, 1);
			highlightNext(world, eid, false);
			expect(getHighlightedIndex(eid)).toBe(1);
		});

		it('highlights previous option', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
				{ label: 'C', value: 'c' },
			]);

			setHighlightedIndex(world, eid, 2);
			highlightPrev(world, eid);
			expect(getHighlightedIndex(eid)).toBe(1);
		});

		it('wraps around when highlighting prev at start', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			]);

			highlightPrev(world, eid, true);
			expect(getHighlightedIndex(eid)).toBe(1);
		});

		it('selects highlighted option', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			]);

			setHighlightedIndex(world, eid, 1);
			selectHighlighted(world, eid);

			expect(getSelectedIndex(eid)).toBe(1);
		});
	});

	describe('Display Configuration', () => {
		it('has default display values', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			const display = getSelectDisplay(eid);
			expect(display.closedIndicator).toBe(DEFAULT_CLOSED_INDICATOR);
			expect(display.openIndicator).toBe(DEFAULT_OPEN_INDICATOR);
			expect(display.selectedMark).toBe(DEFAULT_SELECTED_MARK);
			expect(display.separator).toBe(DEFAULT_SEPARATOR);
		});

		it('sets custom display values', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			setSelectDisplay(eid, {
				closedIndicator: 'v',
				openIndicator: '^',
				selectedMark: '*',
				separator: ' | ',
			});

			const display = getSelectDisplay(eid);
			expect(display.closedIndicator).toBe('v');
			expect(display.openIndicator).toBe('^');
			expect(display.selectedMark).toBe('*');
			expect(display.separator).toBe(' | ');
		});

		it('gets correct indicator based on state', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			expect(getSelectIndicator(world, eid)).toBe(DEFAULT_CLOSED_INDICATOR);

			openSelect(world, eid);
			expect(getSelectIndicator(world, eid)).toBe(DEFAULT_OPEN_INDICATOR);
		});

		it('clears display configuration', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);
			setSelectDisplay(eid, { closedIndicator: 'X' });

			clearSelectDisplay(eid);

			const display = getSelectDisplay(eid);
			expect(display.closedIndicator).toBe(DEFAULT_CLOSED_INDICATOR);
		});
	});

	describe('Callbacks', () => {
		it('fires change callback on selection', () => {
			const eid = addEntity(world) as Entity;
			const options: SelectOption[] = [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			];
			attachSelectBehavior(world, eid, options);

			const callback = vi.fn();
			onSelectChange(eid, callback);

			selectOptionByIndex(world, eid, 1);

			expect(callback).toHaveBeenCalledWith('b', 'B', 1);
		});

		it('fires open callback when dropdown opens', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			const callback = vi.fn();
			onSelectOpen(eid, callback);

			openSelect(world, eid);

			expect(callback).toHaveBeenCalled();
		});

		it('fires close callback when dropdown closes', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			const callback = vi.fn();
			onSelectClose(eid, callback);

			openSelect(world, eid);
			closeSelect(world, eid);

			expect(callback).toHaveBeenCalled();
		});

		it('unsubscribes change callback', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);

			const callback = vi.fn();
			const unsubscribe = onSelectChange(eid, callback);

			unsubscribe();
			selectOptionByIndex(world, eid, 0);

			expect(callback).not.toHaveBeenCalled();
		});

		it('clears all callbacks', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);

			const changeCallback = vi.fn();
			const openCallback = vi.fn();
			onSelectChange(eid, changeCallback);
			onSelectOpen(eid, openCallback);

			clearSelectCallbacks(eid);

			openSelect(world, eid);
			selectOptionByIndex(world, eid, 0);

			expect(changeCallback).not.toHaveBeenCalled();
			expect(openCallback).not.toHaveBeenCalled();
		});
	});

	describe('Key Handling', () => {
		it('opens dropdown on enter when closed', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);

			const action = handleSelectKeyPress(world, eid, 'enter');
			expect(action).toEqual({ type: 'open' });
		});

		it('selects highlighted on enter when open', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [
				{ label: 'A', value: 'a' },
				{ label: 'B', value: 'b' },
			]);
			openSelect(world, eid);
			setHighlightedIndex(world, eid, 1);

			const action = handleSelectKeyPress(world, eid, 'enter');
			expect(action).toEqual({ type: 'select', index: 1 });
		});

		it('closes dropdown on escape when open', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);
			openSelect(world, eid);

			const action = handleSelectKeyPress(world, eid, 'escape');
			expect(action).toEqual({ type: 'close' });
		});

		it('returns null on escape when closed', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			const action = handleSelectKeyPress(world, eid, 'escape');
			expect(action).toBeNull();
		});

		it('highlights next on down when open', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);
			openSelect(world, eid);

			const action = handleSelectKeyPress(world, eid, 'down');
			expect(action).toEqual({ type: 'highlightNext' });
		});

		it('opens dropdown on down when closed', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);

			const action = handleSelectKeyPress(world, eid, 'down');
			expect(action).toEqual({ type: 'open' });
		});

		it('highlights prev on up when open', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);
			openSelect(world, eid);

			const action = handleSelectKeyPress(world, eid, 'up');
			expect(action).toEqual({ type: 'highlightPrev' });
		});

		it('handles home and end keys when open', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);
			openSelect(world, eid);

			expect(handleSelectKeyPress(world, eid, 'home')).toEqual({ type: 'highlightFirst' });
			expect(handleSelectKeyPress(world, eid, 'end')).toEqual({ type: 'highlightLast' });
		});

		it('returns null for disabled select', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid);
			disableSelect(world, eid);

			expect(handleSelectKeyPress(world, eid, 'enter')).toBeNull();
		});

		it('returns null for non-select entity', () => {
			const eid = addEntity(world) as Entity;
			// Don't attach select behavior
			expect(handleSelectKeyPress(world, eid, 'enter')).toBeNull();
		});
	});

	describe('Store Reset', () => {
		it('resets all select data', () => {
			const eid = addEntity(world) as Entity;
			attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }], 0);
			setSelectDisplay(eid, { closedIndicator: 'X' });
			onSelectChange(eid, vi.fn());

			resetSelectStore();

			expect(selectStore.isSelect[eid]).toBe(0);
			expect(selectStore.selectedIndex[eid]).toBe(-1);
			expect(getSelectOptions(eid)).toEqual([]);
		});
	});
});
