/**
 * Shop Screen Implementation
 *
 * Implements the between-rounds shop with jokers, booster packs, and vouchers.
 *
 * @module balatro/ui/shop
 */

import type { Joker } from '../data/joker';
import { getRandomJoker, hasJokerSlot, MAX_JOKER_SLOTS } from '../data/joker';

// =============================================================================
// TYPES
// =============================================================================

export type ShopSection = 'jokers' | 'packs' | 'voucher' | 'actions';

export type PackType = 'standard' | 'arcana' | 'celestial' | 'spectral' | 'buffoon';

export interface BoosterPack {
	readonly id: string;
	readonly type: PackType;
	readonly name: string;
	readonly description: string;
	readonly price: number;
	readonly cardCount: number;
	readonly chooseCount: number;
}

export type VoucherType =
	| 'overstock' // +1 joker slot
	| 'clearance_sale' // Cards cost less
	| 'hone' // Upgrade hand levels
	| 'reroll_surplus' // First reroll free
	| 'crystal_ball' // See future cards
	| 'telescope'; // See boss blind earlier

export interface Voucher {
	readonly id: string;
	readonly type: VoucherType;
	readonly name: string;
	readonly description: string;
	readonly price: number;
}

export interface ShopJokerSlot {
	readonly joker: Joker | null;
	readonly price: number;
	readonly sold: boolean;
}

export interface ShopPackSlot {
	readonly pack: BoosterPack | null;
	readonly sold: boolean;
}

export interface ShopVoucherSlot {
	readonly voucher: Voucher | null;
	readonly sold: boolean;
}

export interface ShopState {
	readonly jokerSlots: readonly ShopJokerSlot[];
	readonly packSlots: readonly ShopPackSlot[];
	readonly voucherSlot: ShopVoucherSlot;
	readonly rerollCost: number;
	readonly rerollCount: number;
	readonly selectedSection: ShopSection;
	readonly selectedIndex: number;
}

export type ShopAction =
	| { type: 'buy_joker'; index: number }
	| { type: 'buy_pack'; index: number }
	| { type: 'buy_voucher' }
	| { type: 'reroll' }
	| { type: 'next_round' }
	| { type: 'none' };

export type ShopInput =
	| { type: 'navigate'; direction: 'up' | 'down' | 'left' | 'right' }
	| { type: 'select' }
	| { type: 'reroll' }
	| { type: 'next_round' };

export interface ShopRenderData {
	readonly title: string;
	readonly money: number;
	readonly jokerSlots: readonly ShopJokerSlot[];
	readonly packSlots: readonly ShopPackSlot[];
	readonly voucherSlot: ShopVoucherSlot;
	readonly rerollCost: number;
	readonly selectedSection: ShopSection;
	readonly selectedIndex: number;
	readonly canReroll: boolean;
	readonly canBuySelected: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Number of joker slots in shop */
export const SHOP_JOKER_SLOTS = 2;

/** Number of pack slots in shop */
export const SHOP_PACK_SLOTS = 2;

/** Base reroll cost */
export const BASE_REROLL_COST = 5;

/** Reroll cost increase per reroll */
export const REROLL_COST_INCREMENT = 1;

/** Base joker prices by rarity */
const JOKER_BASE_PRICES: Record<string, number> = {
	common: 4,
	uncommon: 6,
	rare: 8,
	legendary: 20,
};

// =============================================================================
// BOOSTER PACKS
// =============================================================================

const BOOSTER_PACKS: readonly BoosterPack[] = [
	{
		id: 'pack_standard_1',
		type: 'standard',
		name: 'Standard Pack',
		description: 'Choose 1 of 3 playing cards',
		price: 4,
		cardCount: 3,
		chooseCount: 1,
	},
	{
		id: 'pack_standard_2',
		type: 'standard',
		name: 'Jumbo Pack',
		description: 'Choose 1 of 5 playing cards',
		price: 6,
		cardCount: 5,
		chooseCount: 1,
	},
	{
		id: 'pack_arcana_1',
		type: 'arcana',
		name: 'Arcana Pack',
		description: 'Choose 1 of 3 Tarot cards',
		price: 4,
		cardCount: 3,
		chooseCount: 1,
	},
	{
		id: 'pack_celestial_1',
		type: 'celestial',
		name: 'Celestial Pack',
		description: 'Choose 1 of 3 Planet cards',
		price: 4,
		cardCount: 3,
		chooseCount: 1,
	},
	{
		id: 'pack_spectral_1',
		type: 'spectral',
		name: 'Spectral Pack',
		description: 'Choose 1 of 2 Spectral cards',
		price: 4,
		cardCount: 2,
		chooseCount: 1,
	},
	{
		id: 'pack_buffoon_1',
		type: 'buffoon',
		name: 'Buffoon Pack',
		description: 'Choose 1 of 2 Jokers',
		price: 6,
		cardCount: 2,
		chooseCount: 1,
	},
];

// =============================================================================
// VOUCHERS
// =============================================================================

const VOUCHERS: readonly Voucher[] = [
	{
		id: 'voucher_overstock',
		type: 'overstock',
		name: 'Overstock',
		description: '+1 Joker Slot',
		price: 10,
	},
	{
		id: 'voucher_clearance',
		type: 'clearance_sale',
		name: 'Clearance Sale',
		description: 'All shop items 25% off',
		price: 10,
	},
	{
		id: 'voucher_hone',
		type: 'hone',
		name: 'Hone',
		description: '+1 level to random hand type',
		price: 8,
	},
	{
		id: 'voucher_reroll',
		type: 'reroll_surplus',
		name: 'Reroll Surplus',
		description: 'First reroll each shop is free',
		price: 6,
	},
	{
		id: 'voucher_crystal',
		type: 'crystal_ball',
		name: 'Crystal Ball',
		description: 'See next blind requirements',
		price: 8,
	},
	{
		id: 'voucher_telescope',
		type: 'telescope',
		name: 'Telescope',
		description: 'See boss blind one ante early',
		price: 10,
	},
];

// =============================================================================
// SHOP GENERATION
// =============================================================================

/**
 * Calculates the price for a joker.
 *
 * @param joker - Joker to price
 * @param ante - Current ante (affects scaling)
 * @returns Price in dollars
 */
export function calculateJokerPrice(joker: Joker, ante: number): number {
	const basePrice = JOKER_BASE_PRICES[joker.rarity] ?? 4;
	// Slight price increase at higher antes
	const anteBonus = Math.floor(ante / 3);
	return basePrice + anteBonus;
}

/**
 * Generates a random booster pack.
 *
 * @param excludeIds - Pack IDs to exclude
 * @returns Random booster pack
 */
export function getRandomPack(excludeIds: readonly string[] = []): BoosterPack | null {
	const available = BOOSTER_PACKS.filter(p => !excludeIds.includes(p.id));
	if (available.length === 0) return null;
	const index = Math.floor(Math.random() * available.length);
	return available[index] ?? null;
}

/**
 * Generates a random voucher.
 *
 * @param excludeIds - Voucher IDs to exclude
 * @returns Random voucher
 */
export function getRandomVoucher(excludeIds: readonly string[] = []): Voucher | null {
	const available = VOUCHERS.filter(v => !excludeIds.includes(v.id));
	if (available.length === 0) return null;
	const index = Math.floor(Math.random() * available.length);
	return available[index] ?? null;
}

/**
 * Generates the shop inventory for a round.
 *
 * @param ante - Current ante
 * @param ownedJokerIds - IDs of jokers already owned
 * @param ownedVoucherIds - IDs of vouchers already owned
 * @returns Shop state
 */
export function generateShopInventory(
	ante: number,
	ownedJokerIds: readonly string[] = [],
	ownedVoucherIds: readonly string[] = [],
): ShopState {
	// Generate joker slots
	const jokerSlots: ShopJokerSlot[] = [];
	const usedJokerIds = [...ownedJokerIds];

	for (let i = 0; i < SHOP_JOKER_SLOTS; i++) {
		const joker = getRandomJoker(usedJokerIds);
		if (joker) {
			usedJokerIds.push(joker.id);
			jokerSlots.push({
				joker,
				price: calculateJokerPrice(joker, ante),
				sold: false,
			});
		} else {
			jokerSlots.push({ joker: null, price: 0, sold: false });
		}
	}

	// Generate pack slots
	const packSlots: ShopPackSlot[] = [];
	const usedPackIds: string[] = [];

	for (let i = 0; i < SHOP_PACK_SLOTS; i++) {
		const pack = getRandomPack(usedPackIds);
		if (pack) {
			usedPackIds.push(pack.id);
			packSlots.push({ pack, sold: false });
		} else {
			packSlots.push({ pack: null, sold: false });
		}
	}

	// Generate voucher
	const voucher = getRandomVoucher(ownedVoucherIds);

	return {
		jokerSlots,
		packSlots,
		voucherSlot: { voucher, sold: false },
		rerollCost: BASE_REROLL_COST,
		rerollCount: 0,
		selectedSection: 'jokers',
		selectedIndex: 0,
	};
}

// =============================================================================
// SHOP STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial shop state (empty).
 */
export function createShopState(): ShopState {
	return {
		jokerSlots: [],
		packSlots: [],
		voucherSlot: { voucher: null, sold: false },
		rerollCost: BASE_REROLL_COST,
		rerollCount: 0,
		selectedSection: 'jokers',
		selectedIndex: 0,
	};
}

/**
 * Gets the current reroll cost.
 *
 * @param state - Shop state
 * @param freeFirstReroll - Whether first reroll is free
 * @returns Current reroll cost
 */
export function getRerollCost(state: ShopState, freeFirstReroll: boolean = false): number {
	if (freeFirstReroll && state.rerollCount === 0) {
		return 0;
	}
	return state.rerollCost;
}

/**
 * Checks if player can afford to buy selected item.
 *
 * @param state - Shop state
 * @param money - Player's money
 * @returns True if can afford
 */
export function canAffordSelected(state: ShopState, money: number): boolean {
	switch (state.selectedSection) {
		case 'jokers': {
			const slot = state.jokerSlots[state.selectedIndex];
			if (!slot || slot.sold || !slot.joker) return false;
			return money >= slot.price;
		}
		case 'packs': {
			const slot = state.packSlots[state.selectedIndex];
			if (!slot || slot.sold || !slot.pack) return false;
			return money >= slot.pack.price;
		}
		case 'voucher': {
			const slot = state.voucherSlot;
			if (slot.sold || !slot.voucher) return false;
			return money >= slot.voucher.price;
		}
		case 'actions':
			return true;
		default:
			return false;
	}
}

/**
 * Gets the price of the currently selected item.
 *
 * @param state - Shop state
 * @returns Price or 0
 */
export function getSelectedPrice(state: ShopState): number {
	switch (state.selectedSection) {
		case 'jokers': {
			const slot = state.jokerSlots[state.selectedIndex];
			return slot?.price ?? 0;
		}
		case 'packs': {
			const slot = state.packSlots[state.selectedIndex];
			return slot?.pack?.price ?? 0;
		}
		case 'voucher':
			return state.voucherSlot.voucher?.price ?? 0;
		default:
			return 0;
	}
}

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * Gets the number of items in a section.
 */
function getSectionItemCount(state: ShopState, section: ShopSection): number {
	switch (section) {
		case 'jokers':
			return state.jokerSlots.length;
		case 'packs':
			return state.packSlots.length;
		case 'voucher':
			return 1;
		case 'actions':
			return 2; // Reroll and Next Round
		default:
			return 0;
	}
}

/**
 * Gets the sections in order.
 */
const SECTION_ORDER: readonly ShopSection[] = ['jokers', 'packs', 'voucher', 'actions'];

/**
 * Navigates up in the shop.
 */
export function navigateUp(state: ShopState): ShopState {
	const currentIndex = SECTION_ORDER.indexOf(state.selectedSection);
	if (currentIndex <= 0) return state;

	const newSection = SECTION_ORDER[currentIndex - 1];
	if (!newSection) return state;

	const maxIndex = getSectionItemCount(state, newSection) - 1;
	return {
		...state,
		selectedSection: newSection,
		selectedIndex: Math.min(state.selectedIndex, maxIndex),
	};
}

/**
 * Navigates down in the shop.
 */
export function navigateDown(state: ShopState): ShopState {
	const currentIndex = SECTION_ORDER.indexOf(state.selectedSection);
	if (currentIndex >= SECTION_ORDER.length - 1) return state;

	const newSection = SECTION_ORDER[currentIndex + 1];
	if (!newSection) return state;

	const maxIndex = getSectionItemCount(state, newSection) - 1;
	return {
		...state,
		selectedSection: newSection,
		selectedIndex: Math.min(state.selectedIndex, maxIndex),
	};
}

/**
 * Navigates left in the current section.
 */
export function navigateLeft(state: ShopState): ShopState {
	if (state.selectedIndex <= 0) return state;
	return { ...state, selectedIndex: state.selectedIndex - 1 };
}

/**
 * Navigates right in the current section.
 */
export function navigateRight(state: ShopState): ShopState {
	const maxIndex = getSectionItemCount(state, state.selectedSection) - 1;
	if (state.selectedIndex >= maxIndex) return state;
	return { ...state, selectedIndex: state.selectedIndex + 1 };
}

/**
 * Navigates in the shop.
 */
export function navigate(
	state: ShopState,
	direction: 'up' | 'down' | 'left' | 'right',
): ShopState {
	switch (direction) {
		case 'up':
			return navigateUp(state);
		case 'down':
			return navigateDown(state);
		case 'left':
			return navigateLeft(state);
		case 'right':
			return navigateRight(state);
		default:
			return state;
	}
}

// =============================================================================
// PURCHASES
// =============================================================================

export interface BuyJokerResult {
	readonly success: boolean;
	readonly newState: ShopState;
	readonly joker: Joker | null;
	readonly cost: number;
}

/**
 * Attempts to buy a joker.
 *
 * @param state - Shop state
 * @param index - Joker slot index
 * @param money - Player's money
 * @param currentJokerCount - Player's current joker count
 * @param maxJokerSlots - Maximum joker slots
 * @returns Result with new state and purchased joker
 */
export function buyJoker(
	state: ShopState,
	index: number,
	money: number,
	currentJokerCount: number,
	maxJokerSlots: number = MAX_JOKER_SLOTS,
): BuyJokerResult {
	const slot = state.jokerSlots[index];

	// Validate purchase
	if (!slot || slot.sold || !slot.joker) {
		return { success: false, newState: state, joker: null, cost: 0 };
	}
	if (money < slot.price) {
		return { success: false, newState: state, joker: null, cost: 0 };
	}
	if (!hasJokerSlot(currentJokerCount, maxJokerSlots)) {
		return { success: false, newState: state, joker: null, cost: 0 };
	}

	// Mark as sold
	const newSlots = state.jokerSlots.map((s, i) => (i === index ? { ...s, sold: true } : s));

	return {
		success: true,
		newState: { ...state, jokerSlots: newSlots },
		joker: slot.joker,
		cost: slot.price,
	};
}

export interface BuyPackResult {
	readonly success: boolean;
	readonly newState: ShopState;
	readonly pack: BoosterPack | null;
	readonly cost: number;
}

/**
 * Attempts to buy a booster pack.
 *
 * @param state - Shop state
 * @param index - Pack slot index
 * @param money - Player's money
 * @returns Result with new state and purchased pack
 */
export function buyPack(state: ShopState, index: number, money: number): BuyPackResult {
	const slot = state.packSlots[index];

	if (!slot || slot.sold || !slot.pack) {
		return { success: false, newState: state, pack: null, cost: 0 };
	}
	if (money < slot.pack.price) {
		return { success: false, newState: state, pack: null, cost: 0 };
	}

	const newSlots = state.packSlots.map((s, i) => (i === index ? { ...s, sold: true } : s));

	return {
		success: true,
		newState: { ...state, packSlots: newSlots },
		pack: slot.pack,
		cost: slot.pack.price,
	};
}

export interface BuyVoucherResult {
	readonly success: boolean;
	readonly newState: ShopState;
	readonly voucher: Voucher | null;
	readonly cost: number;
}

/**
 * Attempts to buy the voucher.
 *
 * @param state - Shop state
 * @param money - Player's money
 * @returns Result with new state and purchased voucher
 */
export function buyVoucher(state: ShopState, money: number): BuyVoucherResult {
	const slot = state.voucherSlot;

	if (slot.sold || !slot.voucher) {
		return { success: false, newState: state, voucher: null, cost: 0 };
	}
	if (money < slot.voucher.price) {
		return { success: false, newState: state, voucher: null, cost: 0 };
	}

	return {
		success: true,
		newState: { ...state, voucherSlot: { ...slot, sold: true } },
		voucher: slot.voucher,
		cost: slot.voucher.price,
	};
}

// =============================================================================
// REROLL
// =============================================================================

export interface RerollResult {
	readonly success: boolean;
	readonly newState: ShopState;
	readonly cost: number;
}

/**
 * Rerolls the shop jokers.
 *
 * @param state - Shop state
 * @param money - Player's money
 * @param ante - Current ante
 * @param ownedJokerIds - IDs of owned jokers
 * @param freeFirstReroll - Whether first reroll is free
 * @returns Result with new state
 */
export function rerollShop(
	state: ShopState,
	money: number,
	ante: number,
	ownedJokerIds: readonly string[] = [],
	freeFirstReroll: boolean = false,
): RerollResult {
	const cost = getRerollCost(state, freeFirstReroll);

	if (money < cost) {
		return { success: false, newState: state, cost: 0 };
	}

	// Generate new jokers (keep sold slots as sold)
	const usedIds = [...ownedJokerIds];
	const newJokerSlots = state.jokerSlots.map(slot => {
		if (slot.sold) return slot;

		const joker = getRandomJoker(usedIds);
		if (joker) {
			usedIds.push(joker.id);
			return {
				joker,
				price: calculateJokerPrice(joker, ante),
				sold: false,
			};
		}
		return { joker: null, price: 0, sold: false };
	});

	return {
		success: true,
		newState: {
			...state,
			jokerSlots: newJokerSlots,
			rerollCost: state.rerollCost + REROLL_COST_INCREMENT,
			rerollCount: state.rerollCount + 1,
		},
		cost,
	};
}

// =============================================================================
// INPUT PROCESSING
// =============================================================================

/**
 * Processes shop input and returns action.
 *
 * @param state - Shop state
 * @param input - Shop input
 * @param money - Player's money
 * @param currentJokerCount - Current joker count
 * @returns Tuple of new state and action
 */
export function processShopInput(
	state: ShopState,
	input: ShopInput,
	money: number,
	currentJokerCount: number,
): [ShopState, ShopAction] {
	switch (input.type) {
		case 'navigate':
			return [navigate(state, input.direction), { type: 'none' }];

		case 'select':
			return processSelect(state, money, currentJokerCount);

		case 'reroll':
			return [state, { type: 'reroll' }];

		case 'next_round':
			return [state, { type: 'next_round' }];

		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Processes selection action.
 */
function processSelect(
	state: ShopState,
	money: number,
	currentJokerCount: number,
): [ShopState, ShopAction] {
	switch (state.selectedSection) {
		case 'jokers': {
			const slot = state.jokerSlots[state.selectedIndex];
			if (!slot || slot.sold || !slot.joker) {
				return [state, { type: 'none' }];
			}
			if (money < slot.price) {
				return [state, { type: 'none' }];
			}
			if (!hasJokerSlot(currentJokerCount)) {
				return [state, { type: 'none' }];
			}
			return [state, { type: 'buy_joker', index: state.selectedIndex }];
		}

		case 'packs': {
			const slot = state.packSlots[state.selectedIndex];
			if (!slot || slot.sold || !slot.pack) {
				return [state, { type: 'none' }];
			}
			if (money < slot.pack.price) {
				return [state, { type: 'none' }];
			}
			return [state, { type: 'buy_pack', index: state.selectedIndex }];
		}

		case 'voucher': {
			const slot = state.voucherSlot;
			if (slot.sold || !slot.voucher) {
				return [state, { type: 'none' }];
			}
			if (money < slot.voucher.price) {
				return [state, { type: 'none' }];
			}
			return [state, { type: 'buy_voucher' }];
		}

		case 'actions':
			if (state.selectedIndex === 0) {
				return [state, { type: 'reroll' }];
			}
			return [state, { type: 'next_round' }];

		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Converts a key to shop input.
 *
 * @param key - Key name
 * @returns Shop input or null
 */
export function keyToShopInput(key: string): ShopInput | null {
	switch (key) {
		case 'up':
		case 'k':
			return { type: 'navigate', direction: 'up' };
		case 'down':
		case 'j':
			return { type: 'navigate', direction: 'down' };
		case 'left':
		case 'h':
			return { type: 'navigate', direction: 'left' };
		case 'right':
		case 'l':
			return { type: 'navigate', direction: 'right' };
		case 'return':
		case 'space':
			return { type: 'select' };
		case 'r':
		case 'R':
			return { type: 'reroll' };
		case 'n':
		case 'N':
			return { type: 'next_round' };
		default:
			return null;
	}
}

// =============================================================================
// RENDER DATA
// =============================================================================

/**
 * Gets render data for the shop screen.
 *
 * @param state - Shop state
 * @param money - Player's money
 * @param currentJokerCount - Current joker count
 * @param freeFirstReroll - Whether first reroll is free
 * @returns Render data
 */
export function getShopRenderData(
	state: ShopState,
	money: number,
	currentJokerCount: number,
	freeFirstReroll: boolean = false,
): ShopRenderData {
	const rerollCost = getRerollCost(state, freeFirstReroll);
	const canBuy = canAffordSelected(state, money);

	// Additional check for joker slots
	let canBuySelected = canBuy;
	if (state.selectedSection === 'jokers' && canBuy) {
		canBuySelected = hasJokerSlot(currentJokerCount);
	}

	return {
		title: 'SHOP',
		money,
		jokerSlots: state.jokerSlots,
		packSlots: state.packSlots,
		voucherSlot: state.voucherSlot,
		rerollCost,
		selectedSection: state.selectedSection,
		selectedIndex: state.selectedIndex,
		canReroll: money >= rerollCost,
		canBuySelected,
	};
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if shop has any unsold items.
 *
 * @param state - Shop state
 * @returns True if items remain
 */
export function hasUnsoldItems(state: ShopState): boolean {
	const hasJokers = state.jokerSlots.some(s => !s.sold && s.joker !== null);
	const hasPacks = state.packSlots.some(s => !s.sold && s.pack !== null);
	const hasVoucher = !state.voucherSlot.sold && state.voucherSlot.voucher !== null;
	return hasJokers || hasPacks || hasVoucher;
}

/**
 * Gets all jokers currently in shop (unsold).
 *
 * @param state - Shop state
 * @returns Array of available jokers
 */
export function getAvailableJokers(state: ShopState): readonly Joker[] {
	return state.jokerSlots
		.filter(s => !s.sold && s.joker !== null)
		.map(s => s.joker!);
}

/**
 * Gets all packs currently in shop (unsold).
 *
 * @param state - Shop state
 * @returns Array of available packs
 */
export function getAvailablePacks(state: ShopState): readonly BoosterPack[] {
	return state.packSlots
		.filter(s => !s.sold && s.pack !== null)
		.map(s => s.pack!);
}
