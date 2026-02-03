/**
 * Tests for keyboard input handling
 */

import { describe, expect, it } from 'vitest';
import {
	parseKeyEvent,
	createInputState,
	getActionForKey,
	processAction,
	clearPendingActions,
	clearSelections,
	getNextPendingAction,
	consumePendingAction,
	createKeyboardHandler,
	getDefaultBindings,
} from './keyboard';

describe('parseKeyEvent', () => {
	it('parses regular characters', () => {
		const event = parseKeyEvent('a');
		expect(event.key).toBe('a');
		expect(event.ctrl).toBe(false);
	});

	it('parses uppercase as shift', () => {
		const event = parseKeyEvent('A');
		expect(event.key).toBe('a');
		expect(event.shift).toBe(true);
	});

	it('parses arrow keys', () => {
		expect(parseKeyEvent('\x1b[A').key).toBe('up');
		expect(parseKeyEvent('\x1b[B').key).toBe('down');
		expect(parseKeyEvent('\x1b[C').key).toBe('right');
		expect(parseKeyEvent('\x1b[D').key).toBe('left');
	});

	it('parses special keys', () => {
		expect(parseKeyEvent('\r').key).toBe('return');
		expect(parseKeyEvent('\n').key).toBe('return');
		expect(parseKeyEvent('\t').key).toBe('tab');
		expect(parseKeyEvent(' ').key).toBe('space');
		expect(parseKeyEvent('\x1b').key).toBe('escape');
	});

	it('parses number keys', () => {
		expect(parseKeyEvent('1').key).toBe('1');
		expect(parseKeyEvent('5').key).toBe('5');
	});
});

describe('getActionForKey', () => {
	it('maps number keys to selection', () => {
		expect(getActionForKey(parseKeyEvent('1'))).toBe('SELECT_1');
		expect(getActionForKey(parseKeyEvent('5'))).toBe('SELECT_5');
		expect(getActionForKey(parseKeyEvent('8'))).toBe('SELECT_8');
	});

	it('maps arrow keys to cursor movement', () => {
		expect(getActionForKey(parseKeyEvent('\x1b[D'))).toBe('CURSOR_LEFT');
		expect(getActionForKey(parseKeyEvent('\x1b[C'))).toBe('CURSOR_RIGHT');
	});

	it('maps vim keys to cursor movement', () => {
		expect(getActionForKey(parseKeyEvent('h'))).toBe('CURSOR_LEFT');
		expect(getActionForKey(parseKeyEvent('l'))).toBe('CURSOR_RIGHT');
	});

	it('maps game action keys', () => {
		expect(getActionForKey(parseKeyEvent('\r'))).toBe('PLAY_CARDS');
		expect(getActionForKey(parseKeyEvent('d'))).toBe('DISCARD_CARDS');
		expect(getActionForKey(parseKeyEvent('n'))).toBe('DRAW_CARDS');
	});

	it('maps navigation keys', () => {
		expect(getActionForKey(parseKeyEvent('\x1b'))).toBe('CANCEL');
		expect(getActionForKey(parseKeyEvent('q'))).toBe('QUIT');
		expect(getActionForKey(parseKeyEvent('?'))).toBe('HELP');
	});

	it('returns null for unmapped keys', () => {
		expect(getActionForKey(parseKeyEvent('x'))).toBeNull();
		expect(getActionForKey(parseKeyEvent('z'))).toBeNull();
	});
});

describe('processAction', () => {
	describe('cursor movement', () => {
		it('moves cursor left', () => {
			const state = { ...createInputState(), cursorPosition: 3 };
			const newState = processAction(state, 'CURSOR_LEFT', 8);

			expect(newState.cursorPosition).toBe(2);
		});

		it('moves cursor right', () => {
			const state = createInputState();
			const newState = processAction(state, 'CURSOR_RIGHT', 8);

			expect(newState.cursorPosition).toBe(1);
		});

		it('clamps cursor at boundaries', () => {
			const stateAtStart = createInputState();
			const leftResult = processAction(stateAtStart, 'CURSOR_LEFT', 8);
			expect(leftResult.cursorPosition).toBe(0);

			const stateAtEnd = { ...createInputState(), cursorPosition: 7 };
			const rightResult = processAction(stateAtEnd, 'CURSOR_RIGHT', 8);
			expect(rightResult.cursorPosition).toBe(7);
		});

		it('cycles through cards with tab', () => {
			const state = { ...createInputState(), cursorPosition: 7 };
			const newState = processAction(state, 'CYCLE_NEXT', 8);

			expect(newState.cursorPosition).toBe(0);
		});
	});

	describe('card selection', () => {
		it('selects card by number', () => {
			const state = createInputState();
			const newState = processAction(state, 'SELECT_3', 8);

			expect(newState.selectedCards).toContain(2);
			expect(newState.cursorPosition).toBe(2);
		});

		it('toggles card selection off', () => {
			const state = {
				...createInputState(),
				selectedCards: [2],
			};
			const newState = processAction(state, 'SELECT_3', 8);

			expect(newState.selectedCards).not.toContain(2);
		});

		it('ignores selection beyond hand size', () => {
			const state = createInputState();
			const newState = processAction(state, 'SELECT_8', 5);

			expect(newState.selectedCards).toHaveLength(0);
		});

		it('toggles current cursor position', () => {
			const state = { ...createInputState(), cursorPosition: 4 };
			const newState = processAction(state, 'TOGGLE_CURRENT', 8);

			expect(newState.selectedCards).toContain(4);
		});

		it('selects all cards', () => {
			const state = createInputState();
			const newState = processAction(state, 'SELECT_ALL', 5);

			expect(newState.selectedCards).toEqual([0, 1, 2, 3, 4]);
		});

		it('clears all selections', () => {
			const state = {
				...createInputState(),
				selectedCards: [1, 2, 3],
			};
			const newState = processAction(state, 'SELECT_NONE', 8);

			expect(newState.selectedCards).toHaveLength(0);
		});
	});

	describe('game actions', () => {
		it('queues play cards action', () => {
			const state = createInputState();
			const newState = processAction(state, 'PLAY_CARDS', 8);

			expect(newState.pendingActions).toContain('PLAY_CARDS');
		});

		it('queues multiple actions in order', () => {
			let state = createInputState();
			state = processAction(state, 'PLAY_CARDS', 8);
			state = processAction(state, 'DISCARD_CARDS', 8);

			expect(state.pendingActions).toEqual(['PLAY_CARDS', 'DISCARD_CARDS']);
		});
	});
});

describe('pending action management', () => {
	it('gets next pending action', () => {
		const state = {
			...createInputState(),
			pendingActions: ['PLAY_CARDS', 'DISCARD_CARDS'] as const,
		};

		expect(getNextPendingAction(state)).toBe('PLAY_CARDS');
	});

	it('returns null when no pending actions', () => {
		expect(getNextPendingAction(createInputState())).toBeNull();
	});

	it('consumes pending action', () => {
		const state = {
			...createInputState(),
			pendingActions: ['PLAY_CARDS', 'DISCARD_CARDS'] as const,
		};
		const newState = consumePendingAction(state);

		expect(newState.pendingActions).toEqual(['DISCARD_CARDS']);
	});

	it('clears all pending actions', () => {
		const state = {
			...createInputState(),
			pendingActions: ['PLAY_CARDS', 'DISCARD_CARDS'] as const,
		};
		const newState = clearPendingActions(state);

		expect(newState.pendingActions).toHaveLength(0);
	});
});

describe('clearSelections', () => {
	it('clears selected cards', () => {
		const state = {
			...createInputState(),
			selectedCards: [1, 2, 3],
		};
		const newState = clearSelections(state);

		expect(newState.selectedCards).toHaveLength(0);
	});
});

describe('createKeyboardHandler', () => {
	it('processes input and updates state', () => {
		const handler = createKeyboardHandler();

		handler.processInput('1');
		expect(handler.state.selectedCards).toContain(0);

		handler.processInput('3');
		expect(handler.state.selectedCards).toContain(2);
	});

	it('adjusts cursor when hand size changes', () => {
		const handler = createKeyboardHandler();

		// Move cursor to position 7
		for (let i = 0; i < 7; i++) {
			handler.processInput('\x1b[C'); // right arrow
		}
		expect(handler.state.cursorPosition).toBe(7);

		// Reduce hand size
		handler.setHandSize(5);
		expect(handler.state.cursorPosition).toBe(4);
	});

	it('removes invalid selections when hand size changes', () => {
		const handler = createKeyboardHandler();

		handler.processInput('7');
		handler.processInput('8');
		expect(handler.state.selectedCards).toContain(6);
		expect(handler.state.selectedCards).toContain(7);

		handler.setHandSize(5);
		expect(handler.state.selectedCards).not.toContain(6);
		expect(handler.state.selectedCards).not.toContain(7);
	});
});

describe('getDefaultBindings', () => {
	it('returns bindings array', () => {
		const bindings = getDefaultBindings();
		expect(Array.isArray(bindings)).toBe(true);
		expect(bindings.length).toBeGreaterThan(0);
	});
});
