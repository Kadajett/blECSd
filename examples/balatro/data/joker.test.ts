/**
 * Tests for Joker system
 */

import { describe, expect, it } from 'vitest';
import {
	STARTER_JOKERS,
	MAX_JOKER_SLOTS,
	getJokerById,
	getJokersByRarity,
	getRandomJoker,
	checkCondition,
	applyJokerEffect,
	applyJokerEffects,
	createJokerInstance,
	getJokerSellValue,
	getJokerDescription,
	hasJokerSlot,
	calculateFinalScore,
} from './joker';
import type { JokerCondition } from './joker';
import type { HandResult } from './hand';
import type { Card } from './card';

// Helper to create mock cards
function createMockCard(rank: string, suit: string): Card {
	return {
		id: `${rank}-${suit}`,
		rank: rank as Card['rank'],
		suit: suit as Card['suit'],
	};
}

// Helper to create a mock hand result
function createMockHandResult(type: string, scoringCards: readonly Card[]): HandResult {
	return {
		type: type as HandResult['type'],
		scoringCards,
		kickers: [],
	};
}

describe('STARTER_JOKERS', () => {
	it('has at least 10 jokers', () => {
		expect(STARTER_JOKERS.length).toBeGreaterThanOrEqual(10);
	});

	it('all jokers have required fields', () => {
		for (const joker of STARTER_JOKERS) {
			expect(joker.id).toBeTruthy();
			expect(joker.name).toBeTruthy();
			expect(joker.description).toBeTruthy();
			expect(joker.rarity).toBeTruthy();
			expect(joker.effect).toBeTruthy();
			expect(joker.sellValue).toBeGreaterThan(0);
		}
	});

	it('has jokers of different rarities', () => {
		const commons = STARTER_JOKERS.filter(j => j.rarity === 'common');
		const uncommons = STARTER_JOKERS.filter(j => j.rarity === 'uncommon');
		const rares = STARTER_JOKERS.filter(j => j.rarity === 'rare');

		expect(commons.length).toBeGreaterThan(0);
		expect(uncommons.length).toBeGreaterThan(0);
		expect(rares.length).toBeGreaterThan(0);
	});
});

describe('getJokerById', () => {
	it('returns joker for valid ID', () => {
		const joker = getJokerById('joker_greedy');

		expect(joker).toBeDefined();
		expect(joker?.name).toBe('Greedy Joker');
	});

	it('returns undefined for invalid ID', () => {
		const joker = getJokerById('nonexistent');

		expect(joker).toBeUndefined();
	});
});

describe('getJokersByRarity', () => {
	it('returns jokers of specified rarity', () => {
		const commons = getJokersByRarity('common');

		expect(commons.length).toBeGreaterThan(0);
		expect(commons.every(j => j.rarity === 'common')).toBe(true);
	});
});

describe('getRandomJoker', () => {
	it('returns a joker', () => {
		const joker = getRandomJoker();

		expect(joker).not.toBeNull();
		expect(joker?.id).toBeTruthy();
	});

	it('excludes specified IDs', () => {
		const excludeIds = STARTER_JOKERS.slice(0, 10).map(j => j.id);
		const joker = getRandomJoker(excludeIds);

		if (joker) {
			expect(excludeIds).not.toContain(joker.id);
		}
	});

	it('returns null when all excluded', () => {
		const allIds = STARTER_JOKERS.map(j => j.id);
		const joker = getRandomJoker(allIds);

		expect(joker).toBeNull();
	});
});

describe('checkCondition', () => {
	it('checks hand_contains_type', () => {
		const cards = [
			createMockCard('A', 'hearts'),
			createMockCard('A', 'spades'),
		];
		const result = createMockHandResult('PAIR', cards);
		const condition: JokerCondition = { type: 'hand_contains_type', value: 'PAIR' };

		expect(checkCondition(condition, result, cards)).toBe(true);

		const wrongCondition: JokerCondition = { type: 'hand_contains_type', value: 'FLUSH' };
		expect(checkCondition(wrongCondition, result, cards)).toBe(false);
	});

	it('checks hand_contains_suit', () => {
		const cards = [
			createMockCard('A', 'hearts'),
			createMockCard('K', 'hearts'),
		];
		const result = createMockHandResult('HIGH_CARD', cards);
		const condition: JokerCondition = { type: 'hand_contains_suit', value: 'hearts' };

		expect(checkCondition(condition, result, cards)).toBe(true);

		const wrongCondition: JokerCondition = { type: 'hand_contains_suit', value: 'spades' };
		expect(checkCondition(wrongCondition, result, cards)).toBe(false);
	});

	it('checks hand_contains_rank', () => {
		const cards = [createMockCard('A', 'hearts')];
		const result = createMockHandResult('HIGH_CARD', cards);
		const condition: JokerCondition = { type: 'hand_contains_rank', value: 'A' };

		expect(checkCondition(condition, result, cards)).toBe(true);

		const wrongCondition: JokerCondition = { type: 'hand_contains_rank', value: 'K' };
		expect(checkCondition(wrongCondition, result, cards)).toBe(false);
	});

	it('checks hand_size', () => {
		const cards = [
			createMockCard('A', 'hearts'),
			createMockCard('K', 'hearts'),
		];
		const result = createMockHandResult('HIGH_CARD', cards);
		const condition: JokerCondition = { type: 'hand_size', value: 3 };

		expect(checkCondition(condition, result, cards)).toBe(true);

		const largerHand = [...cards, createMockCard('Q', 'hearts'), createMockCard('J', 'hearts')];
		expect(checkCondition(condition, result, largerHand)).toBe(false);
	});
});

describe('applyJokerEffect', () => {
	it('applies add_mult effect', () => {
		const joker = getJokerById('joker_greedy')!;
		const cards = [createMockCard('A', 'hearts')];
		const result = createMockHandResult('HIGH_CARD', cards);

		const applied = applyJokerEffect(joker, result, cards);

		expect(applied.modification.addedMult).toBe(4);
		expect(applied.description).toContain('+4');
	});

	it('applies add_chips effect', () => {
		const joker = getJokerById('joker_lusty')!;
		const cards = [createMockCard('A', 'hearts')];
		const result = createMockHandResult('HIGH_CARD', cards);

		const applied = applyJokerEffect(joker, result, cards);

		expect(applied.modification.addedChips).toBe(30);
	});

	it('applies per-card effects', () => {
		const joker = getJokerById('joker_wrathful')!; // +5 mult per card
		const cards = [
			createMockCard('A', 'hearts'),
			createMockCard('K', 'hearts'),
			createMockCard('Q', 'hearts'),
		];
		const result = createMockHandResult('HIGH_CARD', cards);

		const applied = applyJokerEffect(joker, result, cards);

		expect(applied.modification.addedMult).toBe(15); // 5 × 3 cards
	});

	it('applies conditional effects when condition met', () => {
		const joker = getJokerById('joker_clever')!; // +3 mult if pair
		const cards = [
			createMockCard('A', 'hearts'),
			createMockCard('A', 'spades'),
		];
		const result = createMockHandResult('PAIR', cards);

		const applied = applyJokerEffect(joker, result, cards);

		expect(applied.modification.addedMult).toBe(3);
	});

	it('returns no effect when condition not met', () => {
		const joker = getJokerById('joker_clever')!; // +3 mult if pair
		const cards = [createMockCard('A', 'hearts')];
		const result = createMockHandResult('HIGH_CARD', cards);

		const applied = applyJokerEffect(joker, result, cards);

		expect(applied.modification.addedMult).toBe(0);
		expect(applied.description).toBe('No effect');
	});

	it('applies mult_mult effect', () => {
		const joker = getJokerById('joker_ace_hunter')!; // ×1.5 if ace
		const cards = [createMockCard('A', 'hearts')];
		const result = createMockHandResult('HIGH_CARD', cards);

		const applied = applyJokerEffect(joker, result, cards);

		expect(applied.modification.multMultiplier).toBe(1.5);
	});

	it('applies suit-specific per-card effects', () => {
		const joker = getJokerById('joker_heart_lover')!; // +20 chips per heart
		const cards = [
			createMockCard('A', 'hearts'),
			createMockCard('K', 'hearts'),
			createMockCard('Q', 'spades'),
		];
		const result = createMockHandResult('HIGH_CARD', cards);

		const applied = applyJokerEffect(joker, result, cards);

		expect(applied.modification.addedChips).toBe(40); // 20 × 2 hearts
	});
});

describe('applyJokerEffects', () => {
	it('combines multiple joker effects', () => {
		const jokers = [
			getJokerById('joker_greedy')!, // +4 mult
			getJokerById('joker_lusty')!, // +30 chips
		];
		const cards = [createMockCard('A', 'hearts')];
		const result = createMockHandResult('HIGH_CARD', cards);

		const { total, effects } = applyJokerEffects(jokers, result, cards);

		expect(total.addedMult).toBe(4);
		expect(total.addedChips).toBe(30);
		expect(effects.length).toBe(2);
	});

	it('multiplies mult_mult effects', () => {
		const jokers = [
			getJokerById('joker_ace_hunter')!, // ×1.5 if ace
			getJokerById('joker_half_joker')!, // ×1.5 if <= 3 cards
		];
		const cards = [createMockCard('A', 'hearts')];
		const result = createMockHandResult('HIGH_CARD', cards);

		const { total } = applyJokerEffects(jokers, result, cards);

		expect(total.multMultiplier).toBe(2.25); // 1.5 × 1.5
	});
});

describe('createJokerInstance', () => {
	it('creates unique instance ID', () => {
		const joker = getJokerById('joker_greedy')!;
		const instance1 = createJokerInstance(joker);
		const instance2 = createJokerInstance(joker);

		expect(instance1.id).not.toBe(joker.id);
		expect(instance1.id).not.toBe(instance2.id);
		expect(instance1.name).toBe(joker.name);
	});
});

describe('getJokerSellValue', () => {
	it('returns sell value', () => {
		const joker = getJokerById('joker_greedy')!;

		expect(getJokerSellValue(joker)).toBe(4);
	});
});

describe('getJokerDescription', () => {
	it('returns description', () => {
		const joker = getJokerById('joker_greedy')!;

		expect(getJokerDescription(joker)).toBe('+4 Mult');
	});
});

describe('hasJokerSlot', () => {
	it('returns true when slots available', () => {
		expect(hasJokerSlot(3)).toBe(true);
		expect(hasJokerSlot(0)).toBe(true);
	});

	it('returns false when full', () => {
		expect(hasJokerSlot(5)).toBe(false);
		expect(hasJokerSlot(MAX_JOKER_SLOTS)).toBe(false);
	});

	it('respects custom max slots', () => {
		expect(hasJokerSlot(3, 3)).toBe(false);
		expect(hasJokerSlot(3, 4)).toBe(true);
	});
});

describe('calculateFinalScore', () => {
	it('calculates without joker mods', () => {
		const score = calculateFinalScore(30, 20, 4, {
			addedChips: 0,
			addedMult: 0,
			multMultiplier: 1,
			addedMoney: 0,
		});

		expect(score).toBe(200); // (30 + 20) × 4
	});

	it('applies added chips', () => {
		const score = calculateFinalScore(30, 20, 4, {
			addedChips: 50,
			addedMult: 0,
			multMultiplier: 1,
			addedMoney: 0,
		});

		expect(score).toBe(400); // (30 + 20 + 50) × 4
	});

	it('applies added mult', () => {
		const score = calculateFinalScore(30, 20, 4, {
			addedChips: 0,
			addedMult: 6,
			multMultiplier: 1,
			addedMoney: 0,
		});

		expect(score).toBe(500); // (30 + 20) × (4 + 6)
	});

	it('applies mult multiplier', () => {
		const score = calculateFinalScore(30, 20, 4, {
			addedChips: 0,
			addedMult: 0,
			multMultiplier: 2,
			addedMoney: 0,
		});

		expect(score).toBe(400); // (30 + 20) × 4 × 2
	});

	it('combines all modifications', () => {
		const score = calculateFinalScore(30, 20, 4, {
			addedChips: 50,
			addedMult: 6,
			multMultiplier: 1.5,
			addedMoney: 0,
		});

		expect(score).toBe(1500); // (30 + 20 + 50) × (4 + 6) × 1.5
	});
});
