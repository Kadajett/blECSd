/**
 * Tests for shop screen implementation
 */

import { describe, expect, it } from 'vitest';
import {
	createShopState,
	generateShopInventory,
	calculateJokerPrice,
	getRandomPack,
	getRandomVoucher,
	getRerollCost,
	canAffordSelected,
	getSelectedPrice,
	navigateUp,
	navigateDown,
	navigateLeft,
	navigateRight,
	navigate,
	buyJoker,
	buyPack,
	buyVoucher,
	rerollShop,
	processShopInput,
	keyToShopInput,
	getShopRenderData,
	hasUnsoldItems,
	getAvailableJokers,
	getAvailablePacks,
	SHOP_JOKER_SLOTS,
	SHOP_PACK_SLOTS,
	BASE_REROLL_COST,
	REROLL_COST_INCREMENT,
} from './shop';
import type { ShopState } from './shop';
import { getJokerById } from '../data/joker';

// Helper to create a populated shop state
function createPopulatedShop(): ShopState {
	return generateShopInventory(1, [], []);
}

describe('createShopState', () => {
	it('creates empty initial state', () => {
		const state = createShopState();

		expect(state.jokerSlots).toHaveLength(0);
		expect(state.packSlots).toHaveLength(0);
		expect(state.voucherSlot.voucher).toBeNull();
		expect(state.rerollCost).toBe(BASE_REROLL_COST);
		expect(state.rerollCount).toBe(0);
		expect(state.selectedSection).toBe('jokers');
		expect(state.selectedIndex).toBe(0);
	});
});

describe('generateShopInventory', () => {
	it('generates correct number of slots', () => {
		const state = generateShopInventory(1);

		expect(state.jokerSlots).toHaveLength(SHOP_JOKER_SLOTS);
		expect(state.packSlots).toHaveLength(SHOP_PACK_SLOTS);
	});

	it('generates jokers in slots', () => {
		const state = generateShopInventory(1);

		expect(state.jokerSlots.every(s => s.joker !== null)).toBe(true);
		expect(state.jokerSlots.every(s => s.price > 0)).toBe(true);
		expect(state.jokerSlots.every(s => !s.sold)).toBe(true);
	});

	it('generates packs in slots', () => {
		const state = generateShopInventory(1);

		expect(state.packSlots.every(s => s.pack !== null)).toBe(true);
		expect(state.packSlots.every(s => !s.sold)).toBe(true);
	});

	it('generates a voucher', () => {
		const state = generateShopInventory(1);

		expect(state.voucherSlot.voucher).not.toBeNull();
		expect(state.voucherSlot.sold).toBe(false);
	});

	it('excludes owned jokers', () => {
		const joker = getJokerById('joker_greedy')!;
		const state = generateShopInventory(1, [joker.id]);

		const jokerIds = state.jokerSlots.map(s => s.joker?.id);
		expect(jokerIds).not.toContain(joker.id);
	});

	it('excludes owned vouchers', () => {
		// Generate many times to ensure voucher exclusion works
		for (let i = 0; i < 10; i++) {
			const state = generateShopInventory(1, [], ['voucher_overstock']);
			if (state.voucherSlot.voucher) {
				expect(state.voucherSlot.voucher.id).not.toBe('voucher_overstock');
			}
		}
	});
});

describe('calculateJokerPrice', () => {
	it('prices common jokers', () => {
		const joker = getJokerById('joker_greedy')!;
		expect(joker.rarity).toBe('common');

		const price = calculateJokerPrice(joker, 1);
		expect(price).toBe(4);
	});

	it('prices uncommon jokers', () => {
		const joker = getJokerById('joker_wrathful')!;
		expect(joker.rarity).toBe('uncommon');

		const price = calculateJokerPrice(joker, 1);
		expect(price).toBe(6);
	});

	it('prices rare jokers', () => {
		const joker = getJokerById('joker_ace_hunter')!;
		expect(joker.rarity).toBe('rare');

		const price = calculateJokerPrice(joker, 1);
		expect(price).toBe(8);
	});

	it('increases price at higher antes', () => {
		const joker = getJokerById('joker_greedy')!;
		const priceAnte1 = calculateJokerPrice(joker, 1);
		const priceAnte4 = calculateJokerPrice(joker, 4);

		expect(priceAnte4).toBeGreaterThan(priceAnte1);
	});
});

describe('getRandomPack', () => {
	it('returns a pack', () => {
		const pack = getRandomPack();
		expect(pack).not.toBeNull();
		expect(pack?.id).toBeTruthy();
	});

	it('excludes specified packs', () => {
		for (let i = 0; i < 20; i++) {
			const pack = getRandomPack(['pack_standard_1']);
			if (pack) {
				expect(pack.id).not.toBe('pack_standard_1');
			}
		}
	});
});

describe('getRandomVoucher', () => {
	it('returns a voucher', () => {
		const voucher = getRandomVoucher();
		expect(voucher).not.toBeNull();
		expect(voucher?.id).toBeTruthy();
	});

	it('excludes specified vouchers', () => {
		for (let i = 0; i < 20; i++) {
			const voucher = getRandomVoucher(['voucher_overstock']);
			if (voucher) {
				expect(voucher.id).not.toBe('voucher_overstock');
			}
		}
	});
});

describe('getRerollCost', () => {
	it('returns base cost initially', () => {
		const state = createPopulatedShop();
		expect(getRerollCost(state)).toBe(BASE_REROLL_COST);
	});

	it('returns 0 when free first reroll and count is 0', () => {
		const state = createPopulatedShop();
		expect(getRerollCost(state, true)).toBe(0);
	});

	it('returns normal cost after first reroll with free first', () => {
		let state = createPopulatedShop();
		const result = rerollShop(state, 100, 1, [], true);
		state = result.newState;

		// After first reroll, cost should be base + increment
		expect(getRerollCost(state, true)).toBe(BASE_REROLL_COST + REROLL_COST_INCREMENT);
	});
});

describe('canAffordSelected', () => {
	it('returns true when can afford joker', () => {
		const state = createPopulatedShop();
		const price = state.jokerSlots[0]?.price ?? 0;

		expect(canAffordSelected(state, price + 10)).toBe(true);
	});

	it('returns false when cannot afford joker', () => {
		const state = createPopulatedShop();
		expect(canAffordSelected(state, 0)).toBe(false);
	});

	it('returns false for sold slot', () => {
		let state = createPopulatedShop();
		const result = buyJoker(state, 0, 100, 0);
		state = result.newState;

		expect(canAffordSelected(state, 100)).toBe(false);
	});
});

describe('getSelectedPrice', () => {
	it('returns joker price when joker selected', () => {
		const state = createPopulatedShop();
		const expected = state.jokerSlots[0]?.price ?? 0;

		expect(getSelectedPrice(state)).toBe(expected);
	});

	it('returns pack price when pack selected', () => {
		let state = createPopulatedShop();
		state = { ...state, selectedSection: 'packs', selectedIndex: 0 };

		const expected = state.packSlots[0]?.pack?.price ?? 0;
		expect(getSelectedPrice(state)).toBe(expected);
	});

	it('returns voucher price when voucher selected', () => {
		let state = createPopulatedShop();
		state = { ...state, selectedSection: 'voucher', selectedIndex: 0 };

		const expected = state.voucherSlot.voucher?.price ?? 0;
		expect(getSelectedPrice(state)).toBe(expected);
	});
});

describe('navigation', () => {
	describe('navigateUp', () => {
		it('moves from packs to jokers', () => {
			let state = createPopulatedShop();
			state = { ...state, selectedSection: 'packs' };

			const newState = navigateUp(state);
			expect(newState.selectedSection).toBe('jokers');
		});

		it('does nothing at top', () => {
			const state = createPopulatedShop();
			const newState = navigateUp(state);
			expect(newState.selectedSection).toBe('jokers');
		});
	});

	describe('navigateDown', () => {
		it('moves from jokers to packs', () => {
			const state = createPopulatedShop();
			const newState = navigateDown(state);
			expect(newState.selectedSection).toBe('packs');
		});

		it('does nothing at bottom', () => {
			let state = createPopulatedShop();
			state = { ...state, selectedSection: 'actions' };

			const newState = navigateDown(state);
			expect(newState.selectedSection).toBe('actions');
		});
	});

	describe('navigateLeft', () => {
		it('decreases index', () => {
			let state = createPopulatedShop();
			state = { ...state, selectedIndex: 1 };

			const newState = navigateLeft(state);
			expect(newState.selectedIndex).toBe(0);
		});

		it('does nothing at leftmost', () => {
			const state = createPopulatedShop();
			const newState = navigateLeft(state);
			expect(newState.selectedIndex).toBe(0);
		});
	});

	describe('navigateRight', () => {
		it('increases index', () => {
			const state = createPopulatedShop();
			const newState = navigateRight(state);
			expect(newState.selectedIndex).toBe(1);
		});

		it('does nothing at rightmost', () => {
			let state = createPopulatedShop();
			state = { ...state, selectedIndex: SHOP_JOKER_SLOTS - 1 };

			const newState = navigateRight(state);
			expect(newState.selectedIndex).toBe(SHOP_JOKER_SLOTS - 1);
		});
	});

	describe('navigate', () => {
		it('handles all directions', () => {
			let state = createPopulatedShop();

			state = navigate(state, 'right');
			expect(state.selectedIndex).toBe(1);

			state = navigate(state, 'left');
			expect(state.selectedIndex).toBe(0);

			state = navigate(state, 'down');
			expect(state.selectedSection).toBe('packs');

			state = navigate(state, 'up');
			expect(state.selectedSection).toBe('jokers');
		});
	});
});

describe('buyJoker', () => {
	it('successfully buys joker', () => {
		const state = createPopulatedShop();
		const result = buyJoker(state, 0, 100, 0);

		expect(result.success).toBe(true);
		expect(result.joker).not.toBeNull();
		expect(result.cost).toBeGreaterThan(0);
		expect(result.newState.jokerSlots[0]?.sold).toBe(true);
	});

	it('fails with insufficient money', () => {
		const state = createPopulatedShop();
		const result = buyJoker(state, 0, 0, 0);

		expect(result.success).toBe(false);
		expect(result.joker).toBeNull();
	});

	it('fails when joker slots full', () => {
		const state = createPopulatedShop();
		const result = buyJoker(state, 0, 100, 5, 5);

		expect(result.success).toBe(false);
	});

	it('fails for already sold slot', () => {
		let state = createPopulatedShop();
		buyJoker(state, 0, 100, 0);
		state = { ...state, jokerSlots: state.jokerSlots.map((s, i) => (i === 0 ? { ...s, sold: true } : s)) };

		const result = buyJoker(state, 0, 100, 0);
		expect(result.success).toBe(false);
	});
});

describe('buyPack', () => {
	it('successfully buys pack', () => {
		const state = createPopulatedShop();
		const result = buyPack(state, 0, 100);

		expect(result.success).toBe(true);
		expect(result.pack).not.toBeNull();
		expect(result.cost).toBeGreaterThan(0);
		expect(result.newState.packSlots[0]?.sold).toBe(true);
	});

	it('fails with insufficient money', () => {
		const state = createPopulatedShop();
		const result = buyPack(state, 0, 0);

		expect(result.success).toBe(false);
	});
});

describe('buyVoucher', () => {
	it('successfully buys voucher', () => {
		const state = createPopulatedShop();
		const result = buyVoucher(state, 100);

		expect(result.success).toBe(true);
		expect(result.voucher).not.toBeNull();
		expect(result.cost).toBeGreaterThan(0);
		expect(result.newState.voucherSlot.sold).toBe(true);
	});

	it('fails with insufficient money', () => {
		const state = createPopulatedShop();
		const result = buyVoucher(state, 0);

		expect(result.success).toBe(false);
	});
});

describe('rerollShop', () => {
	it('rerolls jokers', () => {
		const state = createPopulatedShop();
		const result = rerollShop(state, 100, 1);

		expect(result.success).toBe(true);
		expect(result.cost).toBe(BASE_REROLL_COST);
		// Check that reroll count incremented
		expect(result.newState.rerollCount).toBe(1);
		// Joker slots should still be populated
		expect(result.newState.jokerSlots.every(s => s.joker !== null)).toBe(true);
	});

	it('increases reroll cost', () => {
		const state = createPopulatedShop();
		const result = rerollShop(state, 100, 1);

		expect(result.newState.rerollCost).toBe(BASE_REROLL_COST + REROLL_COST_INCREMENT);
	});

	it('fails with insufficient money', () => {
		const state = createPopulatedShop();
		const result = rerollShop(state, 0, 1);

		expect(result.success).toBe(false);
	});

	it('keeps sold slots as sold', () => {
		let state = createPopulatedShop();
		const buyResult = buyJoker(state, 0, 100, 0);
		state = buyResult.newState;

		const result = rerollShop(state, 100, 1);
		expect(result.newState.jokerSlots[0]?.sold).toBe(true);
	});
});

describe('processShopInput', () => {
	it('handles navigation', () => {
		const state = createPopulatedShop();
		const [newState, action] = processShopInput(
			state,
			{ type: 'navigate', direction: 'right' },
			100,
			0,
		);

		expect(newState.selectedIndex).toBe(1);
		expect(action.type).toBe('none');
	});

	it('returns buy_joker action on select', () => {
		const state = createPopulatedShop();
		const [, action] = processShopInput(state, { type: 'select' }, 100, 0);

		expect(action.type).toBe('buy_joker');
	});

	it('returns buy_pack action when pack selected', () => {
		let state = createPopulatedShop();
		state = { ...state, selectedSection: 'packs', selectedIndex: 0 };

		const [, action] = processShopInput(state, { type: 'select' }, 100, 0);

		expect(action.type).toBe('buy_pack');
	});

	it('returns buy_voucher action when voucher selected', () => {
		let state = createPopulatedShop();
		state = { ...state, selectedSection: 'voucher', selectedIndex: 0 };

		const [, action] = processShopInput(state, { type: 'select' }, 100, 0);

		expect(action.type).toBe('buy_voucher');
	});

	it('returns reroll action', () => {
		const state = createPopulatedShop();
		const [, action] = processShopInput(state, { type: 'reroll' }, 100, 0);

		expect(action.type).toBe('reroll');
	});

	it('returns next_round action', () => {
		const state = createPopulatedShop();
		const [, action] = processShopInput(state, { type: 'next_round' }, 100, 0);

		expect(action.type).toBe('next_round');
	});
});

describe('keyToShopInput', () => {
	it('maps arrow keys', () => {
		expect(keyToShopInput('up')).toEqual({ type: 'navigate', direction: 'up' });
		expect(keyToShopInput('down')).toEqual({ type: 'navigate', direction: 'down' });
		expect(keyToShopInput('left')).toEqual({ type: 'navigate', direction: 'left' });
		expect(keyToShopInput('right')).toEqual({ type: 'navigate', direction: 'right' });
	});

	it('maps vim keys', () => {
		expect(keyToShopInput('k')).toEqual({ type: 'navigate', direction: 'up' });
		expect(keyToShopInput('j')).toEqual({ type: 'navigate', direction: 'down' });
		expect(keyToShopInput('h')).toEqual({ type: 'navigate', direction: 'left' });
		expect(keyToShopInput('l')).toEqual({ type: 'navigate', direction: 'right' });
	});

	it('maps selection keys', () => {
		expect(keyToShopInput('return')).toEqual({ type: 'select' });
		expect(keyToShopInput('space')).toEqual({ type: 'select' });
	});

	it('maps action keys', () => {
		expect(keyToShopInput('r')).toEqual({ type: 'reroll' });
		expect(keyToShopInput('R')).toEqual({ type: 'reroll' });
		expect(keyToShopInput('n')).toEqual({ type: 'next_round' });
		expect(keyToShopInput('N')).toEqual({ type: 'next_round' });
	});

	it('returns null for unknown keys', () => {
		expect(keyToShopInput('x')).toBeNull();
		expect(keyToShopInput('z')).toBeNull();
	});
});

describe('getShopRenderData', () => {
	it('returns render data', () => {
		const state = createPopulatedShop();
		const data = getShopRenderData(state, 50, 0);

		expect(data.title).toBe('SHOP');
		expect(data.money).toBe(50);
		expect(data.jokerSlots).toHaveLength(SHOP_JOKER_SLOTS);
		expect(data.packSlots).toHaveLength(SHOP_PACK_SLOTS);
		expect(data.rerollCost).toBe(BASE_REROLL_COST);
		expect(data.canReroll).toBe(true);
	});

	it('sets canReroll false when insufficient money', () => {
		const state = createPopulatedShop();
		const data = getShopRenderData(state, 0, 0);

		expect(data.canReroll).toBe(false);
	});

	it('sets canBuySelected correctly', () => {
		const state = createPopulatedShop();
		const data = getShopRenderData(state, 100, 0);

		expect(data.canBuySelected).toBe(true);
	});

	it('sets canBuySelected false when joker slots full', () => {
		const state = createPopulatedShop();
		const data = getShopRenderData(state, 100, 5);

		expect(data.canBuySelected).toBe(false);
	});
});

describe('hasUnsoldItems', () => {
	it('returns true for fresh shop', () => {
		const state = createPopulatedShop();
		expect(hasUnsoldItems(state)).toBe(true);
	});

	it('returns false when all sold', () => {
		let state = createPopulatedShop();

		// Sell all jokers
		state = {
			...state,
			jokerSlots: state.jokerSlots.map(s => ({ ...s, sold: true })),
			packSlots: state.packSlots.map(s => ({ ...s, sold: true })),
			voucherSlot: { ...state.voucherSlot, sold: true },
		};

		expect(hasUnsoldItems(state)).toBe(false);
	});
});

describe('getAvailableJokers', () => {
	it('returns unsold jokers', () => {
		const state = createPopulatedShop();
		const jokers = getAvailableJokers(state);

		expect(jokers.length).toBe(SHOP_JOKER_SLOTS);
	});

	it('excludes sold jokers', () => {
		let state = createPopulatedShop();
		const result = buyJoker(state, 0, 100, 0);
		state = result.newState;

		const jokers = getAvailableJokers(state);
		expect(jokers.length).toBe(SHOP_JOKER_SLOTS - 1);
	});
});

describe('getAvailablePacks', () => {
	it('returns unsold packs', () => {
		const state = createPopulatedShop();
		const packs = getAvailablePacks(state);

		expect(packs.length).toBe(SHOP_PACK_SLOTS);
	});

	it('excludes sold packs', () => {
		let state = createPopulatedShop();
		const result = buyPack(state, 0, 100);
		state = result.newState;

		const packs = getAvailablePacks(state);
		expect(packs.length).toBe(SHOP_PACK_SLOTS - 1);
	});
});
