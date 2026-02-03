/**
 * Tests for joker tray display and management
 */

import { describe, expect, it } from 'vitest';
import {
	createJokerTrayState,
	updateJokers,
	addJoker,
	removeJoker,
	reorderJokers,
	setMaxSlots,
	navigateLeft,
	navigateRight,
	setSelectedIndex,
	enterSellMode,
	enterReorderMode,
	exitMode,
	setHovered,
	processJokerTrayInput,
	keyToJokerTrayInput,
	calculateTrayDimensions,
	getJokerCardPosition,
	getJokerTrayRenderData,
	formatJokerEffect,
	getJokerRarityColor,
	getSellModeText,
	getTooltipContent,
	hasRoom,
	getJokerCount,
	getSelectedJoker,
	isInSellMode,
	isInReorderMode,
	getTotalSellValue,
	JOKER_CARD_WIDTH,
	JOKER_CARD_GAP,
} from './joker-tray';
import { getJokerById } from '../data/joker';
import type { Joker } from '../data/joker';

// Helper to get test jokers
function getTestJokers(count: number): Joker[] {
	const jokerIds = ['joker_greedy', 'joker_lusty', 'joker_wrathful', 'joker_clever', 'joker_joker'];
	return jokerIds.slice(0, count).map(id => getJokerById(id)!);
}

describe('createJokerTrayState', () => {
	it('creates empty initial state', () => {
		const state = createJokerTrayState();

		expect(state.jokers).toHaveLength(0);
		expect(state.selectedIndex).toBe(0);
		expect(state.mode).toBe('view');
		expect(state.maxSlots).toBe(5);
		expect(state.hoveredIndex).toBeNull();
		expect(state.dragSourceIndex).toBeNull();
	});

	it('initializes with jokers', () => {
		const jokers = getTestJokers(2);
		const state = createJokerTrayState(jokers);

		expect(state.jokers).toHaveLength(2);
	});

	it('accepts custom max slots', () => {
		const state = createJokerTrayState([], 8);
		expect(state.maxSlots).toBe(8);
	});
});

describe('updateJokers', () => {
	it('updates jokers', () => {
		const state = createJokerTrayState(getTestJokers(2));
		const newJokers = getTestJokers(3);
		const newState = updateJokers(state, newJokers);

		expect(newState.jokers).toHaveLength(3);
	});

	it('adjusts selected index when jokers removed', () => {
		let state = createJokerTrayState(getTestJokers(3));
		state = { ...state, selectedIndex: 2 };

		const newState = updateJokers(state, getTestJokers(1));
		expect(newState.selectedIndex).toBe(0);
	});
});

describe('addJoker', () => {
	it('adds joker to tray', () => {
		const state = createJokerTrayState();
		const joker = getJokerById('joker_greedy')!;
		const newState = addJoker(state, joker);

		expect(newState.jokers).toHaveLength(1);
		expect(newState.jokers[0]?.id).toBe(joker.id);
	});

	it('does not add when full', () => {
		const state = createJokerTrayState(getTestJokers(5));
		const joker = getJokerById('joker_ace_hunter')!;
		const newState = addJoker(state, joker);

		expect(newState.jokers).toHaveLength(5);
	});
});

describe('removeJoker', () => {
	it('removes joker by index', () => {
		const state = createJokerTrayState(getTestJokers(3));
		const newState = removeJoker(state, 1);

		expect(newState.jokers).toHaveLength(2);
	});

	it('adjusts selected index', () => {
		let state = createJokerTrayState(getTestJokers(3));
		state = { ...state, selectedIndex: 2 };

		const newState = removeJoker(state, 2);
		expect(newState.selectedIndex).toBe(1);
	});

	it('resets mode after removal', () => {
		let state = createJokerTrayState(getTestJokers(3));
		state = { ...state, mode: 'sell' };

		const newState = removeJoker(state, 0);
		expect(newState.mode).toBe('view');
	});

	it('handles invalid index', () => {
		const state = createJokerTrayState(getTestJokers(2));
		const newState = removeJoker(state, 10);

		expect(newState).toBe(state);
	});
});

describe('reorderJokers', () => {
	it('moves joker to new position', () => {
		const state = createJokerTrayState(getTestJokers(3));
		const originalFirst = state.jokers[0]?.id;
		const newState = reorderJokers(state, 0, 2);

		expect(newState.jokers[2]?.id).toBe(originalFirst);
	});

	it('updates selected index to destination', () => {
		const state = createJokerTrayState(getTestJokers(3));
		const newState = reorderJokers(state, 0, 2);

		expect(newState.selectedIndex).toBe(2);
	});

	it('resets mode after reorder', () => {
		let state = createJokerTrayState(getTestJokers(3));
		state = { ...state, mode: 'reorder', dragSourceIndex: 0 };

		const newState = reorderJokers(state, 0, 2);
		expect(newState.mode).toBe('view');
		expect(newState.dragSourceIndex).toBeNull();
	});

	it('handles same index', () => {
		const state = createJokerTrayState(getTestJokers(3));
		const newState = reorderJokers(state, 1, 1);

		expect(newState).toBe(state);
	});

	it('handles invalid indices', () => {
		const state = createJokerTrayState(getTestJokers(3));

		expect(reorderJokers(state, -1, 1)).toBe(state);
		expect(reorderJokers(state, 0, 10)).toBe(state);
	});
});

describe('setMaxSlots', () => {
	it('updates max slots', () => {
		const state = createJokerTrayState();
		const newState = setMaxSlots(state, 8);

		expect(newState.maxSlots).toBe(8);
	});
});

describe('navigation', () => {
	describe('navigateLeft', () => {
		it('decreases selected index', () => {
			let state = createJokerTrayState(getTestJokers(3));
			state = { ...state, selectedIndex: 1 };

			const newState = navigateLeft(state);
			expect(newState.selectedIndex).toBe(0);
		});

		it('wraps to end', () => {
			const state = createJokerTrayState(getTestJokers(3));
			const newState = navigateLeft(state);

			expect(newState.selectedIndex).toBe(2);
		});

		it('does nothing when empty', () => {
			const state = createJokerTrayState();
			const newState = navigateLeft(state);

			expect(newState).toBe(state);
		});
	});

	describe('navigateRight', () => {
		it('increases selected index', () => {
			const state = createJokerTrayState(getTestJokers(3));
			const newState = navigateRight(state);

			expect(newState.selectedIndex).toBe(1);
		});

		it('wraps to start', () => {
			let state = createJokerTrayState(getTestJokers(3));
			state = { ...state, selectedIndex: 2 };

			const newState = navigateRight(state);
			expect(newState.selectedIndex).toBe(0);
		});
	});

	describe('setSelectedIndex', () => {
		it('sets index', () => {
			const state = createJokerTrayState(getTestJokers(3));
			const newState = setSelectedIndex(state, 2);

			expect(newState.selectedIndex).toBe(2);
		});

		it('ignores invalid index', () => {
			const state = createJokerTrayState(getTestJokers(3));
			const newState = setSelectedIndex(state, 10);

			expect(newState).toBe(state);
		});
	});
});

describe('mode management', () => {
	describe('enterSellMode', () => {
		it('enters sell mode', () => {
			const state = createJokerTrayState(getTestJokers(2));
			const newState = enterSellMode(state);

			expect(newState.mode).toBe('sell');
		});

		it('does nothing when empty', () => {
			const state = createJokerTrayState();
			const newState = enterSellMode(state);

			expect(newState).toBe(state);
		});
	});

	describe('enterReorderMode', () => {
		it('enters reorder mode', () => {
			const state = createJokerTrayState(getTestJokers(3));
			const newState = enterReorderMode(state);

			expect(newState.mode).toBe('reorder');
			expect(newState.dragSourceIndex).toBe(state.selectedIndex);
		});

		it('does nothing with < 2 jokers', () => {
			const state = createJokerTrayState(getTestJokers(1));
			const newState = enterReorderMode(state);

			expect(newState).toBe(state);
		});
	});

	describe('exitMode', () => {
		it('returns to view mode', () => {
			let state = createJokerTrayState(getTestJokers(2));
			state = { ...state, mode: 'sell' };

			const newState = exitMode(state);
			expect(newState.mode).toBe('view');
		});

		it('clears drag source', () => {
			let state = createJokerTrayState(getTestJokers(2));
			state = { ...state, mode: 'reorder', dragSourceIndex: 0 };

			const newState = exitMode(state);
			expect(newState.dragSourceIndex).toBeNull();
		});
	});

	describe('setHovered', () => {
		it('sets hovered index', () => {
			const state = createJokerTrayState(getTestJokers(2));
			const newState = setHovered(state, 1);

			expect(newState.hoveredIndex).toBe(1);
		});

		it('clears hovered index', () => {
			let state = createJokerTrayState(getTestJokers(2));
			state = { ...state, hoveredIndex: 1 };

			const newState = setHovered(state, null);
			expect(newState.hoveredIndex).toBeNull();
		});
	});
});

describe('processJokerTrayInput', () => {
	it('handles navigation', () => {
		const state = createJokerTrayState(getTestJokers(3));
		const [newState, action] = processJokerTrayInput(state, { type: 'navigate', direction: 'right' });

		expect(newState.selectedIndex).toBe(1);
		expect(action.type).toBe('none');
	});

	it('handles sell mode toggle', () => {
		const state = createJokerTrayState(getTestJokers(2));
		const [newState] = processJokerTrayInput(state, { type: 'sell_mode' });

		expect(newState.mode).toBe('sell');
	});

	it('handles reorder mode toggle', () => {
		const state = createJokerTrayState(getTestJokers(3));
		const [newState] = processJokerTrayInput(state, { type: 'reorder_mode' });

		expect(newState.mode).toBe('reorder');
	});

	it('handles cancel', () => {
		let state = createJokerTrayState(getTestJokers(2));
		state = { ...state, mode: 'sell' };

		const [newState] = processJokerTrayInput(state, { type: 'cancel' });
		expect(newState.mode).toBe('view');
	});

	it('returns view_joker action in view mode', () => {
		const state = createJokerTrayState(getTestJokers(2));
		const [, action] = processJokerTrayInput(state, { type: 'select' });

		expect(action.type).toBe('view_joker');
	});

	it('returns sell action in sell mode', () => {
		let state = createJokerTrayState(getTestJokers(2));
		state = { ...state, mode: 'sell' };

		const [, action] = processJokerTrayInput(state, { type: 'select' });

		expect(action.type).toBe('sell');
		if (action.type === 'sell') {
			expect(action.jokerIndex).toBe(0);
			expect(action.sellValue).toBeGreaterThan(0);
		}
	});

	it('returns reorder action in reorder mode', () => {
		let state = createJokerTrayState(getTestJokers(3));
		state = { ...state, mode: 'reorder', dragSourceIndex: 0, selectedIndex: 2 };

		const [, action] = processJokerTrayInput(state, { type: 'select' });

		expect(action.type).toBe('reorder');
		if (action.type === 'reorder') {
			expect(action.fromIndex).toBe(0);
			expect(action.toIndex).toBe(2);
		}
	});
});

describe('keyToJokerTrayInput', () => {
	it('maps arrow keys', () => {
		expect(keyToJokerTrayInput('left')).toEqual({ type: 'navigate', direction: 'left' });
		expect(keyToJokerTrayInput('right')).toEqual({ type: 'navigate', direction: 'right' });
	});

	it('maps vim keys', () => {
		expect(keyToJokerTrayInput('h')).toEqual({ type: 'navigate', direction: 'left' });
		expect(keyToJokerTrayInput('l')).toEqual({ type: 'navigate', direction: 'right' });
	});

	it('maps action keys', () => {
		expect(keyToJokerTrayInput('s')).toEqual({ type: 'sell_mode' });
		expect(keyToJokerTrayInput('r')).toEqual({ type: 'reorder_mode' });
		expect(keyToJokerTrayInput('escape')).toEqual({ type: 'cancel' });
	});

	it('maps selection keys', () => {
		expect(keyToJokerTrayInput('return')).toEqual({ type: 'select' });
		expect(keyToJokerTrayInput('space')).toEqual({ type: 'select' });
	});

	it('returns null for unknown keys', () => {
		expect(keyToJokerTrayInput('x')).toBeNull();
	});
});

describe('calculateTrayDimensions', () => {
	it('calculates dimensions based on slots', () => {
		const { width, height } = calculateTrayDimensions(5);

		const expectedWidth = 5 * JOKER_CARD_WIDTH + 4 * JOKER_CARD_GAP + 4;
		expect(width).toBe(expectedWidth);
		expect(height).toBeGreaterThan(0);
	});
});

describe('getJokerCardPosition', () => {
	it('calculates card positions', () => {
		const pos0 = getJokerCardPosition(0, 0, 0);
		const pos1 = getJokerCardPosition(1, 0, 0);

		expect(pos0.x).toBe(2);
		expect(pos1.x).toBe(2 + JOKER_CARD_WIDTH + JOKER_CARD_GAP);
	});
});

describe('getJokerTrayRenderData', () => {
	it('returns render data', () => {
		const state = createJokerTrayState(getTestJokers(3));
		const data = getJokerTrayRenderData(state, 10, 5);

		expect(data.mode).toBe('view');
		expect(data.cards).toHaveLength(3);
		expect(data.emptySlots).toBe(2);
		expect(data.maxSlots).toBe(5);
		expect(data.trayX).toBe(10);
		expect(data.trayY).toBe(5);
	});

	it('marks selected card', () => {
		let state = createJokerTrayState(getTestJokers(3));
		state = { ...state, selectedIndex: 1 };

		const data = getJokerTrayRenderData(state, 0, 0);
		expect(data.cards[1]?.selected).toBe(true);
		expect(data.cards[0]?.selected).toBe(false);
	});

	it('includes selected joker', () => {
		const state = createJokerTrayState(getTestJokers(2));
		const data = getJokerTrayRenderData(state, 0, 0);

		expect(data.selectedJoker).not.toBeNull();
		expect(data.selectedJoker?.id).toBe(state.jokers[0]?.id);
	});
});

describe('formatJokerEffect', () => {
	it('formats add_mult effect', () => {
		const joker = getJokerById('joker_greedy')!;
		expect(formatJokerEffect(joker)).toBe('+4 Mult');
	});

	it('formats add_chips effect', () => {
		const joker = getJokerById('joker_lusty')!;
		expect(formatJokerEffect(joker)).toBe('+30 Chips');
	});

	it('formats mult_mult effect', () => {
		const joker = getJokerById('joker_ace_hunter')!;
		expect(formatJokerEffect(joker)).toBe('x1.5 Mult');
	});

	it('formats per-card effects', () => {
		const joker = getJokerById('joker_wrathful')!;
		expect(formatJokerEffect(joker)).toBe('+5 Mult/card');
	});
});

describe('getJokerRarityColor', () => {
	it('returns color for common', () => {
		const joker = getJokerById('joker_greedy')!;
		expect(getJokerRarityColor(joker)).toBe(0x808080);
	});

	it('returns color for uncommon', () => {
		const joker = getJokerById('joker_wrathful')!;
		expect(getJokerRarityColor(joker)).toBe(0x00aa00);
	});

	it('returns color for rare', () => {
		const joker = getJokerById('joker_ace_hunter')!;
		expect(getJokerRarityColor(joker)).toBe(0x5555ff);
	});
});

describe('getSellModeText', () => {
	it('returns sell text with value', () => {
		const joker = getJokerById('joker_greedy')!;
		const text = getSellModeText(joker);

		expect(text).toContain('SELL');
		expect(text).toContain('$');
	});
});

describe('getTooltipContent', () => {
	it('returns tooltip content', () => {
		const joker = getJokerById('joker_greedy')!;
		const content = getTooltipContent(joker);

		expect(content.name).toBe('Greedy Joker');
		expect(content.effect).toBe('+4 Mult');
		expect(content.description).toBe('+4 Mult');
		expect(content.rarity).toBe('Common');
		expect(content.sellValue).toContain('$');
	});
});

describe('helper functions', () => {
	describe('hasRoom', () => {
		it('returns true when room available', () => {
			const state = createJokerTrayState(getTestJokers(3));
			expect(hasRoom(state)).toBe(true);
		});

		it('returns false when full', () => {
			const state = createJokerTrayState(getTestJokers(5));
			expect(hasRoom(state)).toBe(false);
		});
	});

	describe('getJokerCount', () => {
		it('returns joker count', () => {
			const state = createJokerTrayState(getTestJokers(3));
			expect(getJokerCount(state)).toBe(3);
		});
	});

	describe('getSelectedJoker', () => {
		it('returns selected joker', () => {
			const state = createJokerTrayState(getTestJokers(2));
			const joker = getSelectedJoker(state);

			expect(joker).not.toBeNull();
			expect(joker?.id).toBe(state.jokers[0]?.id);
		});

		it('returns null when empty', () => {
			const state = createJokerTrayState();
			expect(getSelectedJoker(state)).toBeNull();
		});
	});

	describe('isInSellMode', () => {
		it('returns true in sell mode', () => {
			let state = createJokerTrayState(getTestJokers(2));
			state = { ...state, mode: 'sell' };

			expect(isInSellMode(state)).toBe(true);
		});

		it('returns false in other modes', () => {
			const state = createJokerTrayState(getTestJokers(2));
			expect(isInSellMode(state)).toBe(false);
		});
	});

	describe('isInReorderMode', () => {
		it('returns true in reorder mode', () => {
			let state = createJokerTrayState(getTestJokers(2));
			state = { ...state, mode: 'reorder' };

			expect(isInReorderMode(state)).toBe(true);
		});
	});

	describe('getTotalSellValue', () => {
		it('returns total sell value', () => {
			const state = createJokerTrayState(getTestJokers(3));
			const total = getTotalSellValue(state);

			expect(total).toBeGreaterThan(0);
		});

		it('returns 0 when empty', () => {
			const state = createJokerTrayState();
			expect(getTotalSellValue(state)).toBe(0);
		});
	});
});
