/**
 * Tests for consumable cards (Tarot and Planet)
 */

import { describe, expect, it } from 'vitest';
import {
	TAROT_CARDS,
	MAX_CONSUMABLE_SLOTS,
	getTarotById,
	getRandomTarot,
	getTarotTargetCount,
	createConsumableState,
	hasEmptySlot,
	getEmptySlotIndex,
	addConsumable,
	removeConsumable,
	getConsumable,
	getFilledSlotCount,
	canUseTarot,
	increaseRank,
	useTarotCard,
	useConsumableSlot,
	getTarotColor,
	formatConsumableSlot,
} from './consumable';
import type { ConsumableSlot, TarotCard } from './consumable';
import type { Card } from './card';

function createCard(rank: string, suit: string): Card {
	return {
		id: `${rank}-${suit}`,
		rank: rank as Card['rank'],
		suit: suit as Card['suit'],
	};
}

function createTarotSlot(tarot: TarotCard): ConsumableSlot {
	return { type: 'tarot', card: tarot };
}

describe('TAROT_CARDS', () => {
	it('has 10 tarot cards', () => {
		expect(TAROT_CARDS).toHaveLength(10);
	});

	it('all have unique IDs', () => {
		const ids = TAROT_CARDS.map(t => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('all have descriptions', () => {
		for (const tarot of TAROT_CARDS) {
			expect(tarot.description).toBeTruthy();
		}
	});
});

describe('getTarotById', () => {
	it('finds tarot by ID', () => {
		const tarot = getTarotById('tarot_magician');

		expect(tarot).toBeDefined();
		expect(tarot?.name).toBe('The Magician');
	});

	it('returns undefined for invalid ID', () => {
		expect(getTarotById('nonexistent')).toBeUndefined();
	});
});

describe('getRandomTarot', () => {
	it('returns a tarot', () => {
		const tarot = getRandomTarot();
		expect(tarot).not.toBeNull();
	});

	it('excludes specified IDs', () => {
		for (let i = 0; i < 20; i++) {
			const tarot = getRandomTarot(['tarot_fool']);
			if (tarot) {
				expect(tarot.id).not.toBe('tarot_fool');
			}
		}
	});

	it('returns null when all excluded', () => {
		const allIds = TAROT_CARDS.map(t => t.id);
		expect(getRandomTarot(allIds)).toBeNull();
	});
});

describe('getTarotTargetCount', () => {
	it('returns target count for card-targeting tarot', () => {
		const tarot = getTarotById('tarot_magician')!;
		expect(getTarotTargetCount(tarot)).toBe(2);
	});

	it('returns 0 for no-target tarot', () => {
		const tarot = getTarotById('tarot_fool')!;
		expect(getTarotTargetCount(tarot)).toBe(0);
	});
});

describe('createConsumableState', () => {
	it('creates initial state with empty slots', () => {
		const state = createConsumableState();

		expect(state.slots).toHaveLength(MAX_CONSUMABLE_SLOTS);
		expect(state.slots.every(s => s === null)).toBe(true);
		expect(state.maxSlots).toBe(MAX_CONSUMABLE_SLOTS);
		expect(state.lastTarotUsed).toBeNull();
	});

	it('accepts custom max slots', () => {
		const state = createConsumableState(4);
		expect(state.slots).toHaveLength(4);
	});
});

describe('hasEmptySlot', () => {
	it('returns true for empty state', () => {
		const state = createConsumableState();
		expect(hasEmptySlot(state)).toBe(true);
	});

	it('returns false when full', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));
		state = addConsumable(state, createTarotSlot(tarot));

		expect(hasEmptySlot(state)).toBe(false);
	});
});

describe('getEmptySlotIndex', () => {
	it('returns 0 for empty state', () => {
		const state = createConsumableState();
		expect(getEmptySlotIndex(state)).toBe(0);
	});

	it('returns next empty index', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));

		expect(getEmptySlotIndex(state)).toBe(1);
	});

	it('returns -1 when full', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));
		state = addConsumable(state, createTarotSlot(tarot));

		expect(getEmptySlotIndex(state)).toBe(-1);
	});
});

describe('addConsumable', () => {
	it('adds to first empty slot', () => {
		const state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		const newState = addConsumable(state, createTarotSlot(tarot));

		expect(newState.slots[0]).not.toBeNull();
		expect(newState.slots[0]?.card.name).toBe('The Magician');
	});

	it('does not add when full', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));
		state = addConsumable(state, createTarotSlot(tarot));

		const newState = addConsumable(state, createTarotSlot(tarot));
		expect(newState).toBe(state);
	});
});

describe('removeConsumable', () => {
	it('removes from slot', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));

		const newState = removeConsumable(state, 0);
		expect(newState.slots[0]).toBeNull();
	});

	it('handles empty slot', () => {
		const state = createConsumableState();
		const newState = removeConsumable(state, 0);
		expect(newState).toBe(state);
	});

	it('handles invalid index', () => {
		const state = createConsumableState();
		const newState = removeConsumable(state, -1);
		expect(newState).toBe(state);
	});
});

describe('getConsumable', () => {
	it('returns consumable from slot', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));

		const slot = getConsumable(state, 0);
		expect(slot).not.toBeNull();
		expect(slot?.card.name).toBe('The Magician');
	});

	it('returns null for empty slot', () => {
		const state = createConsumableState();
		expect(getConsumable(state, 0)).toBeNull();
	});
});

describe('getFilledSlotCount', () => {
	it('returns 0 for empty state', () => {
		const state = createConsumableState();
		expect(getFilledSlotCount(state)).toBe(0);
	});

	it('counts filled slots', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));

		expect(getFilledSlotCount(state)).toBe(1);
	});
});

describe('canUseTarot', () => {
	it('returns true for no-target tarot', () => {
		const tarot = getTarotById('tarot_fool')!;
		expect(canUseTarot(tarot, [])).toBe(true);
	});

	it('returns true with valid targets', () => {
		const tarot = getTarotById('tarot_magician')!;
		const cards = [createCard('A', 'hearts'), createCard('K', 'spades')];

		expect(canUseTarot(tarot, cards)).toBe(true);
	});

	it('returns false with no targets when needed', () => {
		const tarot = getTarotById('tarot_magician')!;
		expect(canUseTarot(tarot, [])).toBe(false);
	});

	it('returns false with too many targets', () => {
		const tarot = getTarotById('tarot_chariot')!; // 1 target
		const cards = [createCard('A', 'hearts'), createCard('K', 'spades')];

		expect(canUseTarot(tarot, cards)).toBe(false);
	});
});

describe('increaseRank', () => {
	it('increases rank by 1', () => {
		const card = createCard('5', 'hearts');
		const increased = increaseRank(card);

		expect(increased.rank).toBe('6');
	});

	it('wraps A to 2', () => {
		const card = createCard('A', 'hearts');
		const increased = increaseRank(card);

		expect(increased.rank).toBe('2');
	});

	it('increases K to A', () => {
		const card = createCard('K', 'hearts');
		const increased = increaseRank(card);

		expect(increased.rank).toBe('A');
	});

	it('updates card ID', () => {
		const card = createCard('5', 'hearts');
		const increased = increaseRank(card);

		expect(increased.id).toBe('6-hearts');
	});
});

describe('useTarotCard', () => {
	it('enhances cards with The Magician', () => {
		const tarot = getTarotById('tarot_magician')!;
		const cards = [createCard('A', 'hearts'), createCard('K', 'spades')];
		const result = useTarotCard(tarot, cards);

		expect(result.success).toBe(true);
		expect(result.modifiedCards).toHaveLength(2);
		expect(result.modifiedCards[0]?.enhancement).toBe('lucky');
	});

	it('enhances card with The Chariot (steel)', () => {
		const tarot = getTarotById('tarot_chariot')!;
		const cards = [createCard('A', 'hearts')];
		const result = useTarotCard(tarot, cards);

		expect(result.success).toBe(true);
		expect(result.modifiedCards[0]?.enhancement).toBe('steel');
	});

	it('destroys cards with The Hanged Man', () => {
		const tarot = getTarotById('tarot_hangedman')!;
		const cards = [createCard('A', 'hearts'), createCard('K', 'spades')];
		const result = useTarotCard(tarot, cards);

		expect(result.success).toBe(true);
		expect(result.destroyedCards).toHaveLength(2);
	});

	it('converts suit with Death', () => {
		const tarot = getTarotById('tarot_death')!;
		const cards = [createCard('A', 'hearts'), createCard('K', 'spades')];
		const result = useTarotCard(tarot, cards);

		expect(result.success).toBe(true);
		expect(result.modifiedCards).toHaveLength(1);
		expect(result.modifiedCards[0]?.suit).toBe('spades'); // Converted to right card's suit
	});

	it('increases rank with Strength', () => {
		const tarot = getTarotById('tarot_strength')!;
		const cards = [createCard('5', 'hearts')];
		const result = useTarotCard(tarot, cards);

		expect(result.success).toBe(true);
		expect(result.modifiedCards[0]?.rank).toBe('6');
	});

	it('enhances with The Tower (glass)', () => {
		const tarot = getTarotById('tarot_tower')!;
		const cards = [createCard('A', 'hearts')];
		const result = useTarotCard(tarot, cards);

		expect(result.success).toBe(true);
		expect(result.modifiedCards[0]?.enhancement).toBe('glass');
	});

	it('fails with invalid targets', () => {
		const tarot = getTarotById('tarot_magician')!;
		const result = useTarotCard(tarot, []);

		expect(result.success).toBe(false);
	});

	it('handles The Fool (copy last)', () => {
		const tarot = getTarotById('tarot_fool')!;
		const result = useTarotCard(tarot, []);

		expect(result.success).toBe(true);
	});
});

describe('useConsumableSlot', () => {
	it('uses tarot and removes from slot', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));

		const cards = [createCard('A', 'hearts'), createCard('K', 'spades')];
		const { state: newState, result } = useConsumableSlot(state, 0, cards);

		expect(result?.success).toBe(true);
		expect(newState.slots[0]).toBeNull();
		expect(newState.lastTarotUsed).toBe(tarot);
	});

	it('returns null result for empty slot', () => {
		const state = createConsumableState();
		const { result } = useConsumableSlot(state, 0);

		expect(result).toBeNull();
	});

	it('does not remove on failed use', () => {
		let state = createConsumableState();
		const tarot = getTarotById('tarot_magician')!;
		state = addConsumable(state, createTarotSlot(tarot));

		const { state: newState, result } = useConsumableSlot(state, 0, []);

		expect(result?.success).toBe(false);
		expect(newState.slots[0]).not.toBeNull();
	});
});

describe('getTarotColor', () => {
	it('returns colors for different effect types', () => {
		const enhance = getTarotById('tarot_magician')!;
		const destroy = getTarotById('tarot_hangedman')!;
		const convert = getTarotById('tarot_death')!;

		expect(getTarotColor(enhance)).toBe(0xaa55ff);
		expect(getTarotColor(destroy)).toBe(0xff5555);
		expect(getTarotColor(convert)).toBe(0x55aaff);
	});
});

describe('formatConsumableSlot', () => {
	it('formats empty slot', () => {
		expect(formatConsumableSlot(null)).toBe('[Empty]');
	});

	it('formats filled slot', () => {
		const tarot = getTarotById('tarot_magician')!;
		const slot = createTarotSlot(tarot);
		const formatted = formatConsumableSlot(slot);

		expect(formatted).toContain('The Magician');
	});
});
