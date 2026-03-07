import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity } from '../core/ecs';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import { StateMachineStore } from './stateMachine';
import {
	attachTextInputBehavior,
	CursorMode,
	focusTextInput,
	getCursorMode,
	getCursorPos,
	getSelection,
	resetTextInputStore,
	setCursorPos,
	setTextInputConfig,
} from './textInput';
import {
	getViMode,
	getViModeIndicator,
	getViYankRegister,
	handleViKeyPress,
	isViModeEnabled,
	resetViModeStores,
	setViMode,
} from './textInput/viMode';

describe('Vi Mode', () => {
	let world: World;
	let eid: number;

	beforeEach(() => {
		world = createWorld();
		eid = addEntity(world);
		StateMachineStore.clear();
		resetTextInputStore();
		resetViModeStores();
		attachTextInputBehavior(world, eid);
		focusTextInput(world, eid);
	});

	describe('configuration', () => {
		it('should not be enabled by default', () => {
			expect(isViModeEnabled(world, eid)).toBe(false);
		});

		it('should enable vi mode', () => {
			setViMode(world, eid, true);
			expect(isViModeEnabled(world, eid)).toBe(true);
		});

		it('should start in normal mode when enabled', () => {
			setViMode(world, eid, true);
			expect(getViMode(world, eid)).toBe('normal');
		});

		it('should disable vi mode', () => {
			setViMode(world, eid, true);
			setViMode(world, eid, false);
			expect(isViModeEnabled(world, eid)).toBe(false);
			expect(getViMode(world, eid)).toBeNull();
		});

		it('should enable via setTextInputConfig viMode option', () => {
			setTextInputConfig(world, eid, { viMode: true });
			expect(isViModeEnabled(world, eid)).toBe(true);
		});
	});

	describe('mode indicator', () => {
		beforeEach(() => {
			setViMode(world, eid, true);
		});

		it('should show NORMAL indicator', () => {
			expect(getViModeIndicator(world, eid)).toBe('-- NORMAL --');
		});

		it('should show INSERT indicator after pressing i', () => {
			handleViKeyPress(world, eid, 'i', 'hello');
			expect(getViModeIndicator(world, eid)).toBe('-- INSERT --');
		});

		it('should show VISUAL indicator after pressing v', () => {
			handleViKeyPress(world, eid, 'v', 'hello');
			expect(getViModeIndicator(world, eid)).toBe('-- VISUAL --');
		});

		it('should return empty string when vi mode not enabled', () => {
			setViMode(world, eid, false);
			expect(getViModeIndicator(world, eid)).toBe('');
		});
	});

	describe('normal mode - basic motions', () => {
		beforeEach(() => {
			setViMode(world, eid, true);
			setCursorPos(world, eid, 5);
		});

		it('h should move left', () => {
			handleViKeyPress(world, eid, 'h', 'hello world');
			expect(getCursorPos(world, eid)).toBe(4);
		});

		it('l should move right', () => {
			handleViKeyPress(world, eid, 'l', 'hello world');
			expect(getCursorPos(world, eid)).toBe(6);
		});

		it('h should not go below 0', () => {
			setCursorPos(world, eid, 0);
			handleViKeyPress(world, eid, 'h', 'hello');
			expect(getCursorPos(world, eid)).toBe(0);
		});

		it('l should not go past end', () => {
			setCursorPos(world, eid, 4);
			handleViKeyPress(world, eid, 'l', 'hello');
			expect(getCursorPos(world, eid)).toBe(4);
		});

		it('0 should go to line start', () => {
			handleViKeyPress(world, eid, '0', 'hello world');
			expect(getCursorPos(world, eid)).toBe(0);
		});

		it('$ should go to line end', () => {
			setCursorPos(world, eid, 0);
			handleViKeyPress(world, eid, '$', 'hello world');
			expect(getCursorPos(world, eid)).toBe(10);
		});

		it('w should move to next word start', () => {
			setCursorPos(world, eid, 0);
			handleViKeyPress(world, eid, 'w', 'hello world');
			expect(getCursorPos(world, eid)).toBe(6);
		});

		it('b should move to previous word start', () => {
			setCursorPos(world, eid, 8);
			handleViKeyPress(world, eid, 'b', 'hello world');
			expect(getCursorPos(world, eid)).toBe(6);
		});

		it('e should move to end of word', () => {
			setCursorPos(world, eid, 0);
			handleViKeyPress(world, eid, 'e', 'hello world');
			expect(getCursorPos(world, eid)).toBe(4);
		});

		it('gg should go to beginning', () => {
			handleViKeyPress(world, eid, 'g', 'hello world');
			handleViKeyPress(world, eid, 'g', 'hello world');
			expect(getCursorPos(world, eid)).toBe(0);
		});

		it('G should go to end', () => {
			setCursorPos(world, eid, 0);
			handleViKeyPress(world, eid, 'G', 'hello world');
			expect(getCursorPos(world, eid)).toBe(10);
		});
	});

	describe('normal mode - count prefix', () => {
		beforeEach(() => {
			setViMode(world, eid, true);
			setCursorPos(world, eid, 0);
		});

		it('3l should move 3 right', () => {
			handleViKeyPress(world, eid, '3', 'hello world');
			handleViKeyPress(world, eid, 'l', 'hello world');
			expect(getCursorPos(world, eid)).toBe(3);
		});

		it('2w should move 2 words forward', () => {
			handleViKeyPress(world, eid, '2', 'one two three');
			handleViKeyPress(world, eid, 'w', 'one two three');
			expect(getCursorPos(world, eid)).toBe(8);
		});
	});

	describe('normal mode - mode switching', () => {
		beforeEach(() => {
			setViMode(world, eid, true);
			setCursorPos(world, eid, 5);
		});

		it('i should enter insert mode', () => {
			handleViKeyPress(world, eid, 'i', 'hello world');
			expect(getViMode(world, eid)).toBe('insert');
			// Cursor should stay at same position
			expect(getCursorPos(world, eid)).toBe(5);
		});

		it('a should enter insert mode and move cursor right', () => {
			handleViKeyPress(world, eid, 'a', 'hello world');
			expect(getViMode(world, eid)).toBe('insert');
			expect(getCursorPos(world, eid)).toBe(6);
		});

		it('v should enter visual mode', () => {
			handleViKeyPress(world, eid, 'v', 'hello world');
			expect(getViMode(world, eid)).toBe('visual');
		});

		it('cursor should be block in normal mode', () => {
			expect(getCursorMode(world, eid)).toBe(CursorMode.Block);
		});

		it('cursor should be line in insert mode', () => {
			handleViKeyPress(world, eid, 'i', 'hello world');
			expect(getCursorMode(world, eid)).toBe(CursorMode.Line);
		});
	});

	describe('insert mode', () => {
		beforeEach(() => {
			setViMode(world, eid, true);
			setCursorPos(world, eid, 5);
			handleViKeyPress(world, eid, 'i', 'hello world');
		});

		it('escape should return to normal mode', () => {
			handleViKeyPress(world, eid, 'escape', 'hello world');
			expect(getViMode(world, eid)).toBe('normal');
		});

		it('escape should move cursor back one', () => {
			handleViKeyPress(world, eid, 'escape', 'hello world');
			expect(getCursorPos(world, eid)).toBe(4);
		});

		it('regular keys should pass through (return undefined-ish)', () => {
			const result = handleViKeyPress(world, eid, 'a', 'hello world');
			// Insert mode passes through to normal keyboard handler
			// The result is undefined (cast to null type)
			expect(result).toBeUndefined();
		});
	});

	describe('normal mode - editing', () => {
		beforeEach(() => {
			setViMode(world, eid, true);
		});

		it('x should delete character at cursor', () => {
			setCursorPos(world, eid, 2);
			const action = handleViKeyPress(world, eid, 'x', 'hello');
			expect(action).toEqual({ type: 'delete', start: 2, end: 3 });
		});

		it('x should yank deleted character', () => {
			setCursorPos(world, eid, 2);
			handleViKeyPress(world, eid, 'x', 'hello');
			expect(getViYankRegister(world, eid)).toBe('l');
		});

		it('dd should delete entire line', () => {
			setCursorPos(world, eid, 2);
			handleViKeyPress(world, eid, 'd', 'hello');
			const action = handleViKeyPress(world, eid, 'd', 'hello');
			expect(action).toEqual({ type: 'delete', start: 0, end: 5 });
		});

		it('dd should yank deleted line', () => {
			setCursorPos(world, eid, 0);
			handleViKeyPress(world, eid, 'd', 'hello');
			handleViKeyPress(world, eid, 'd', 'hello');
			expect(getViYankRegister(world, eid)).toBe('hello');
		});

		it('dw should delete word', () => {
			setCursorPos(world, eid, 0);
			handleViKeyPress(world, eid, 'd', 'hello world');
			const action = handleViKeyPress(world, eid, 'w', 'hello world');
			expect(action).toEqual({ type: 'delete', start: 0, end: 6 });
		});

		it('yy should yank line without deleting', () => {
			setCursorPos(world, eid, 0);
			handleViKeyPress(world, eid, 'y', 'hello');
			const action = handleViKeyPress(world, eid, 'y', 'hello');
			expect(action).toBeNull();
			expect(getViYankRegister(world, eid)).toBe('hello');
		});

		it('p should paste after cursor', () => {
			setCursorPos(world, eid, 0);
			// Yank first
			handleViKeyPress(world, eid, 'y', 'hello');
			handleViKeyPress(world, eid, 'y', 'hello');
			// Now paste
			const action = handleViKeyPress(world, eid, 'p', 'hello');
			expect(action).toEqual({ type: 'insert', char: 'hello', position: 1 });
		});

		it('P should paste before cursor', () => {
			setCursorPos(world, eid, 3);
			// Yank first
			handleViKeyPress(world, eid, 'y', 'hello');
			handleViKeyPress(world, eid, 'y', 'hello');
			// Paste before
			const action = handleViKeyPress(world, eid, 'P', 'hello');
			expect(action).toEqual({ type: 'insert', char: 'hello', position: 3 });
		});

		it('cc should delete line and enter insert mode', () => {
			setCursorPos(world, eid, 2);
			handleViKeyPress(world, eid, 'c', 'hello');
			const action = handleViKeyPress(world, eid, 'c', 'hello');
			expect(action).toEqual({ type: 'delete', start: 0, end: 5 });
			expect(getViMode(world, eid)).toBe('insert');
		});

		it('o should insert newline below and enter insert mode', () => {
			setCursorPos(world, eid, 2);
			const action = handleViKeyPress(world, eid, 'o', 'hello');
			expect(action).toEqual({ type: 'insert', char: '\n', position: 5 });
			expect(getViMode(world, eid)).toBe('insert');
		});

		it('O should insert newline above and enter insert mode', () => {
			setCursorPos(world, eid, 2);
			const action = handleViKeyPress(world, eid, 'O', 'hello');
			expect(action).toEqual({ type: 'insert', char: '\n', position: 0 });
			expect(getViMode(world, eid)).toBe('insert');
		});
	});

	describe('visual mode', () => {
		beforeEach(() => {
			setViMode(world, eid, true);
			setCursorPos(world, eid, 3);
			handleViKeyPress(world, eid, 'v', 'hello world');
		});

		it('should enter visual mode', () => {
			expect(getViMode(world, eid)).toBe('visual');
		});

		it('motions should extend selection', () => {
			handleViKeyPress(world, eid, 'l', 'hello world');
			handleViKeyPress(world, eid, 'l', 'hello world');
			const sel = getSelection(world, eid);
			expect(sel).not.toBeNull();
			expect(sel![0]).toBe(3); // anchor
			expect(sel![1]).toBe(6); // current + 1
		});

		it('d should delete selection', () => {
			handleViKeyPress(world, eid, 'l', 'hello world');
			handleViKeyPress(world, eid, 'l', 'hello world');
			const action = handleViKeyPress(world, eid, 'd', 'hello world');
			expect(action).toEqual({ type: 'delete', start: 3, end: 6 });
			expect(getViMode(world, eid)).toBe('normal');
		});

		it('y should yank selection without deleting', () => {
			handleViKeyPress(world, eid, 'l', 'hello world');
			handleViKeyPress(world, eid, 'l', 'hello world');
			const action = handleViKeyPress(world, eid, 'y', 'hello world');
			expect(action).toBeNull();
			expect(getViYankRegister(world, eid)).toBe('lo ');
			expect(getViMode(world, eid)).toBe('normal');
		});

		it('escape should exit visual mode', () => {
			handleViKeyPress(world, eid, 'escape', 'hello world');
			expect(getViMode(world, eid)).toBe('normal');
		});
	});

	describe('cursor mode changes', () => {
		beforeEach(() => {
			setViMode(world, eid, true);
		});

		it('should use block cursor in normal mode', () => {
			expect(getCursorMode(world, eid)).toBe(CursorMode.Block);
		});

		it('should use line cursor in insert mode', () => {
			handleViKeyPress(world, eid, 'i', 'hello');
			expect(getCursorMode(world, eid)).toBe(CursorMode.Line);
		});

		it('should use block cursor in visual mode', () => {
			handleViKeyPress(world, eid, 'v', 'hello');
			expect(getCursorMode(world, eid)).toBe(CursorMode.Block);
		});

		it('should return to block cursor when exiting insert mode', () => {
			handleViKeyPress(world, eid, 'i', 'hello');
			handleViKeyPress(world, eid, 'escape', 'hello');
			expect(getCursorMode(world, eid)).toBe(CursorMode.Block);
		});
	});
});
