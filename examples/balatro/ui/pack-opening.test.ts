/**
 * Tests for booster pack opening
 */

import { describe, expect, it } from 'vitest';
import {
	generateStandardPackItems,
	generateArcanaPackItems,
	generateCelestialPackItems,
	generateBuffoonPackItems,
	generatePackItems,
	openPack,
	navigateLeft,
	navigateRight,
	selectItem,
	skipRemaining,
	processPackInput,
	keyToPackInput,
	getPackOpeningRenderData,
	isPackDone,
	getPicksRemaining,
	getSelectedItems,
	getItemName,
} from './pack-opening';
import type { BoosterPack } from './shop';

// Helper to create a test booster pack
function createTestPack(type: string, cardCount: number, chooseCount: number): BoosterPack {
	return {
		id: `test_pack_${type}`,
		type: type as BoosterPack['type'],
		name: `Test ${type} Pack`,
		description: `Test pack of ${type}`,
		price: 4,
		cardCount,
		chooseCount,
	};
}

describe('pack content generation', () => {
	describe('generateStandardPackItems', () => {
		it('generates correct number of cards', () => {
			const items = generateStandardPackItems(3);
			expect(items).toHaveLength(3);
			expect(items.every(i => i.type === 'card')).toBe(true);
		});

		it('generates actual cards', () => {
			const items = generateStandardPackItems(5);
			for (const item of items) {
				expect(item.card).toBeDefined();
				expect(item.card?.rank).toBeTruthy();
				expect(item.card?.suit).toBeTruthy();
			}
		});

		it('items start unselected', () => {
			const items = generateStandardPackItems(3);
			expect(items.every(i => !i.selected)).toBe(true);
		});
	});

	describe('generateArcanaPackItems', () => {
		it('generates tarot cards', () => {
			const items = generateArcanaPackItems(3);
			expect(items).toHaveLength(3);
			expect(items.every(i => i.type === 'tarot')).toBe(true);
		});

		it('generates unique tarots', () => {
			const items = generateArcanaPackItems(3);
			const ids = items.map(i => i.tarot?.id);
			expect(new Set(ids).size).toBe(3);
		});
	});

	describe('generateCelestialPackItems', () => {
		it('generates planet cards', () => {
			const items = generateCelestialPackItems(3);
			expect(items).toHaveLength(3);
			expect(items.every(i => i.type === 'planet')).toBe(true);
		});
	});

	describe('generateBuffoonPackItems', () => {
		it('generates jokers', () => {
			const items = generateBuffoonPackItems(2);
			expect(items).toHaveLength(2);
			expect(items.every(i => i.type === 'joker')).toBe(true);
		});

		it('excludes owned jokers', () => {
			const items = generateBuffoonPackItems(2, ['joker_greedy']);
			for (const item of items) {
				expect(item.joker?.id).not.toBe('joker_greedy');
			}
		});
	});

	describe('generatePackItems', () => {
		it('generates standard pack items', () => {
			const pack = createTestPack('standard', 3, 1);
			const items = generatePackItems(pack);
			expect(items).toHaveLength(3);
			expect(items.every(i => i.type === 'card')).toBe(true);
		});

		it('generates arcana pack items', () => {
			const pack = createTestPack('arcana', 3, 1);
			const items = generatePackItems(pack);
			expect(items).toHaveLength(3);
			expect(items.every(i => i.type === 'tarot')).toBe(true);
		});

		it('generates celestial pack items', () => {
			const pack = createTestPack('celestial', 3, 1);
			const items = generatePackItems(pack);
			expect(items).toHaveLength(3);
			expect(items.every(i => i.type === 'planet')).toBe(true);
		});

		it('generates buffoon pack items', () => {
			const pack = createTestPack('buffoon', 2, 1);
			const items = generatePackItems(pack);
			expect(items).toHaveLength(2);
			expect(items.every(i => i.type === 'joker')).toBe(true);
		});
	});
});

describe('openPack', () => {
	it('creates pack opening state', () => {
		const pack = createTestPack('standard', 3, 1);
		const state = openPack(pack);

		expect(state.pack).toBe(pack);
		expect(state.items).toHaveLength(3);
		expect(state.selectedCount).toBe(0);
		expect(state.maxSelections).toBe(1);
		expect(state.cursorIndex).toBe(0);
		expect(state.phase).toBe('selecting');
	});
});

describe('navigation', () => {
	it('navigates right', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);

		state = navigateRight(state);
		expect(state.cursorIndex).toBe(1);
	});

	it('wraps right to start', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);
		state = { ...state, cursorIndex: 2 };

		state = navigateRight(state);
		expect(state.cursorIndex).toBe(0);
	});

	it('navigates left', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);
		state = { ...state, cursorIndex: 1 };

		state = navigateLeft(state);
		expect(state.cursorIndex).toBe(0);
	});

	it('wraps left to end', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);

		state = navigateLeft(state);
		expect(state.cursorIndex).toBe(2);
	});
});

describe('selectItem', () => {
	it('selects item at cursor', () => {
		const pack = createTestPack('standard', 3, 2);
		let state = openPack(pack);

		const [newState, action] = selectItem(state);

		expect(newState.selectedCount).toBe(1);
		expect(newState.items[0]?.selected).toBe(true);
		expect(action.type).toBe('take_card');
	});

	it('completes when max selections reached', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);

		const [newState, action] = selectItem(state);

		expect(newState.phase).toBe('closing');
		expect(action.type).toBe('done');
	});

	it('cannot select already selected item', () => {
		const pack = createTestPack('standard', 3, 2);
		let state = openPack(pack);

		const [state2] = selectItem(state);
		const [state3, action] = selectItem(state2);

		expect(state3.selectedCount).toBe(1);
		expect(action.type).toBe('none');
	});

	it('cannot select beyond max', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);

		const [state2] = selectItem(state);
		state = { ...state2, phase: 'selecting', cursorIndex: 1 };
		// Won't let us select since selectedCount >= maxSelections
		const [, action] = selectItem(state);

		expect(action.type).toBe('none');
	});

	it('handles joker selection', () => {
		const pack = createTestPack('buffoon', 2, 2);
		const state = openPack(pack);

		const [, action] = selectItem(state);
		expect(action.type).toBe('take_joker');
	});

	it('handles tarot selection', () => {
		const pack = createTestPack('arcana', 3, 2);
		const state = openPack(pack);

		const [, action] = selectItem(state);
		expect(action.type).toBe('take_tarot');
	});

	it('handles planet selection', () => {
		const pack = createTestPack('celestial', 3, 2);
		const state = openPack(pack);

		const [, action] = selectItem(state);
		expect(action.type).toBe('take_planet');
	});
});

describe('skipRemaining', () => {
	it('closes pack', () => {
		const pack = createTestPack('standard', 3, 2);
		let state = openPack(pack);

		const [newState, action] = skipRemaining(state);

		expect(newState.phase).toBe('closing');
		expect(action.type).toBe('skip_all');
	});

	it('does nothing if already closing', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);
		state = { ...state, phase: 'closing' };

		const [, action] = skipRemaining(state);
		expect(action.type).toBe('none');
	});
});

describe('processPackInput', () => {
	it('handles navigation', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);

		const [newState] = processPackInput(state, { type: 'navigate', direction: 'right' });
		expect(newState.cursorIndex).toBe(1);
	});

	it('handles select', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);

		const [, action] = processPackInput(state, { type: 'select' });
		expect(action.type).not.toBe('none');
	});

	it('handles skip', () => {
		const pack = createTestPack('standard', 3, 1);
		let state = openPack(pack);

		const [, action] = processPackInput(state, { type: 'skip' });
		expect(action.type).toBe('skip_all');
	});
});

describe('keyToPackInput', () => {
	it('maps arrow keys', () => {
		expect(keyToPackInput('left')).toEqual({ type: 'navigate', direction: 'left' });
		expect(keyToPackInput('right')).toEqual({ type: 'navigate', direction: 'right' });
	});

	it('maps vim keys', () => {
		expect(keyToPackInput('h')).toEqual({ type: 'navigate', direction: 'left' });
		expect(keyToPackInput('l')).toEqual({ type: 'navigate', direction: 'right' });
	});

	it('maps action keys', () => {
		expect(keyToPackInput('return')).toEqual({ type: 'select' });
		expect(keyToPackInput('space')).toEqual({ type: 'select' });
		expect(keyToPackInput('s')).toEqual({ type: 'skip' });
	});

	it('returns null for unknown keys', () => {
		expect(keyToPackInput('x')).toBeNull();
	});
});

describe('getPackOpeningRenderData', () => {
	it('returns render data', () => {
		const pack = createTestPack('standard', 3, 1);
		const state = openPack(pack);
		const data = getPackOpeningRenderData(state);

		expect(data.packName).toContain('standard');
		expect(data.items).toHaveLength(3);
		expect(data.selectedCount).toBe(0);
		expect(data.maxSelections).toBe(1);
		expect(data.picksRemaining).toBe(1);
		expect(data.phase).toBe('selecting');
	});
});

describe('helpers', () => {
	describe('isPackDone', () => {
		it('returns false during selection', () => {
			const state = openPack(createTestPack('standard', 3, 1));
			expect(isPackDone(state)).toBe(false);
		});

		it('returns true after closing', () => {
			let state = openPack(createTestPack('standard', 3, 1));
			const [newState] = selectItem(state);
			expect(isPackDone(newState)).toBe(true);
		});
	});

	describe('getPicksRemaining', () => {
		it('returns max initially', () => {
			const state = openPack(createTestPack('standard', 3, 2));
			expect(getPicksRemaining(state)).toBe(2);
		});

		it('decreases after selection', () => {
			let state = openPack(createTestPack('standard', 3, 2));
			const [newState] = selectItem(state);
			expect(getPicksRemaining(newState)).toBe(1);
		});
	});

	describe('getSelectedItems', () => {
		it('returns empty initially', () => {
			const state = openPack(createTestPack('standard', 3, 1));
			expect(getSelectedItems(state)).toHaveLength(0);
		});

		it('returns selected items', () => {
			let state = openPack(createTestPack('standard', 3, 2));
			const [newState] = selectItem(state);
			expect(getSelectedItems(newState)).toHaveLength(1);
		});
	});

	describe('getItemName', () => {
		it('formats card item', () => {
			const items = generateStandardPackItems(1);
			if (items[0]) {
				const name = getItemName(items[0]);
				expect(name).toContain('of');
			}
		});

		it('formats joker item', () => {
			const items = generateBuffoonPackItems(1);
			if (items[0]) {
				const name = getItemName(items[0]);
				expect(name).toBeTruthy();
			}
		});

		it('formats tarot item', () => {
			const items = generateArcanaPackItems(1);
			if (items[0]) {
				const name = getItemName(items[0]);
				expect(name).toBeTruthy();
			}
		});
	});
});
