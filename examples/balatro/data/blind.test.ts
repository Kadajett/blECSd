/**
 * Tests for blind and ante progression
 */

import { describe, expect, it } from 'vitest';
import {
	createBlind,
	getChipRequirement,
	getBossModifier,
	isCardDebuffed,
	getModifiedHandSize,
	getModifiedDiscards,
	isValidPlay,
	getScoringCards,
	getNextBlindType,
	isBossBlind,
	getAnteBlinds,
} from './blind';
import { createCard } from './card';

describe('createBlind', () => {
	it('creates small blind without modifier', () => {
		const blind = createBlind(1, 'small');

		expect(blind.type).toBe('small');
		expect(blind.name).toBe('Small Blind');
		expect(blind.chipTarget).toBeGreaterThan(0);
		expect(blind.bossModifier).toBeNull();
	});

	it('creates big blind with higher chip target', () => {
		const small = createBlind(1, 'small');
		const big = createBlind(1, 'big');

		expect(big.chipTarget).toBeGreaterThan(small.chipTarget);
		expect(big.bossModifier).toBeNull();
	});

	it('creates boss blind with modifier', () => {
		const boss = createBlind(1, 'boss');

		expect(boss.type).toBe('boss');
		expect(boss.bossModifier).not.toBeNull();
		expect(boss.name).toBe(boss.bossModifier!.name);
	});
});

describe('getChipRequirement', () => {
	it('scales with ante', () => {
		const ante1 = getChipRequirement(1, 'small');
		const ante2 = getChipRequirement(2, 'small');
		const ante3 = getChipRequirement(3, 'small');

		expect(ante2).toBeGreaterThan(ante1);
		expect(ante3).toBeGreaterThan(ante2);
	});

	it('scales with blind type', () => {
		const small = getChipRequirement(1, 'small');
		const big = getChipRequirement(1, 'big');
		const boss = getChipRequirement(1, 'boss');

		expect(big).toBeGreaterThan(small);
		expect(boss).toBeGreaterThan(big);
	});

	it('handles boundary antes', () => {
		// Ante 1
		expect(getChipRequirement(1, 'small')).toBeGreaterThan(0);
		// Ante 8
		expect(getChipRequirement(8, 'small')).toBeGreaterThan(0);
		// Beyond 8 should clamp
		expect(getChipRequirement(10, 'small')).toBe(getChipRequirement(8, 'small'));
	});
});

describe('getBossModifier', () => {
	it('returns a modifier for each ante', () => {
		for (let ante = 1; ante <= 8; ante++) {
			const modifier = getBossModifier(ante);
			expect(modifier).toBeDefined();
			expect(modifier.type).toBeDefined();
			expect(modifier.name).toBeDefined();
			expect(modifier.description).toBeDefined();
		}
	});

	it('cycles through modifiers deterministically', () => {
		const mod1 = getBossModifier(1);
		const mod2 = getBossModifier(2);

		// Different antes should potentially have different modifiers
		expect(mod1).toBeDefined();
		expect(mod2).toBeDefined();
	});
});

describe('isCardDebuffed', () => {
	it('returns false when no modifier', () => {
		const card = createCard('hearts', 'K');
		expect(isCardDebuffed(card, null)).toBe(false);
	});

	it('debuffs face cards with FACE_CARDS_DEBUFFED', () => {
		const modifier = { type: 'FACE_CARDS_DEBUFFED' as const, name: 'Test', description: 'Test' };

		expect(isCardDebuffed(createCard('hearts', 'J'), modifier)).toBe(true);
		expect(isCardDebuffed(createCard('hearts', 'Q'), modifier)).toBe(true);
		expect(isCardDebuffed(createCard('hearts', 'K'), modifier)).toBe(true);
		expect(isCardDebuffed(createCard('hearts', 'A'), modifier)).toBe(false);
		expect(isCardDebuffed(createCard('hearts', '10'), modifier)).toBe(false);
	});

	it('debuffs specific suit with ONE_SUIT_DEBUFFED', () => {
		const modifier = {
			type: 'ONE_SUIT_DEBUFFED' as const,
			name: 'Test',
			description: 'Test',
			debuffedSuit: 'spades' as const,
		};

		expect(isCardDebuffed(createCard('spades', 'A'), modifier)).toBe(true);
		expect(isCardDebuffed(createCard('hearts', 'A'), modifier)).toBe(false);
	});

	it('debuffs clubs and spades with CLUBS_SPADES_NO_SCORE', () => {
		const modifier = { type: 'CLUBS_SPADES_NO_SCORE' as const, name: 'Test', description: 'Test' };

		expect(isCardDebuffed(createCard('clubs', 'A'), modifier)).toBe(true);
		expect(isCardDebuffed(createCard('spades', 'A'), modifier)).toBe(true);
		expect(isCardDebuffed(createCard('hearts', 'A'), modifier)).toBe(false);
		expect(isCardDebuffed(createCard('diamonds', 'A'), modifier)).toBe(false);
	});
});

describe('getModifiedHandSize', () => {
	it('returns base size when no modifier', () => {
		expect(getModifiedHandSize(8, null)).toBe(8);
	});

	it('reduces size with MINUS_HAND_SIZE', () => {
		const modifier = { type: 'MINUS_HAND_SIZE' as const, name: 'Test', description: 'Test' };
		expect(getModifiedHandSize(8, modifier)).toBe(7);
	});

	it('does not reduce below 1', () => {
		const modifier = { type: 'MINUS_HAND_SIZE' as const, name: 'Test', description: 'Test' };
		expect(getModifiedHandSize(1, modifier)).toBe(1);
	});
});

describe('getModifiedDiscards', () => {
	it('returns base discards when no modifier', () => {
		expect(getModifiedDiscards(3, null)).toBe(3);
	});

	it('returns 0 with NO_DISCARDS', () => {
		const modifier = { type: 'NO_DISCARDS' as const, name: 'Test', description: 'Test' };
		expect(getModifiedDiscards(3, modifier)).toBe(0);
	});
});

describe('isValidPlay', () => {
	it('allows 1-5 cards normally', () => {
		expect(isValidPlay(1, null)).toBe(true);
		expect(isValidPlay(3, null)).toBe(true);
		expect(isValidPlay(5, null)).toBe(true);
		expect(isValidPlay(0, null)).toBe(false);
		expect(isValidPlay(6, null)).toBe(false);
	});

	it('requires exactly 4 cards with PLAY_EXACTLY_4', () => {
		const modifier = { type: 'PLAY_EXACTLY_4' as const, name: 'Test', description: 'Test' };

		expect(isValidPlay(4, modifier)).toBe(true);
		expect(isValidPlay(3, modifier)).toBe(false);
		expect(isValidPlay(5, modifier)).toBe(false);
	});
});

describe('getScoringCards', () => {
	it('returns all cards when no modifier', () => {
		const cards = [
			createCard('hearts', 'A'),
			createCard('spades', 'K'),
		];
		const scoring = getScoringCards(cards, null);
		expect(scoring).toHaveLength(2);
	});

	it('filters debuffed cards', () => {
		const cards = [
			createCard('hearts', 'A'),
			createCard('spades', 'K'),
			createCard('clubs', 'Q'),
		];
		const modifier = { type: 'CLUBS_SPADES_NO_SCORE' as const, name: 'Test', description: 'Test' };
		const scoring = getScoringCards(cards, modifier);

		expect(scoring).toHaveLength(1);
		expect(scoring[0]!.suit).toBe('hearts');
	});
});

describe('getNextBlindType', () => {
	it('progresses small -> big -> boss -> small', () => {
		expect(getNextBlindType('small')).toBe('big');
		expect(getNextBlindType('big')).toBe('boss');
		expect(getNextBlindType('boss')).toBe('small');
	});
});

describe('isBossBlind', () => {
	it('identifies boss blinds', () => {
		expect(isBossBlind('boss')).toBe(true);
		expect(isBossBlind('small')).toBe(false);
		expect(isBossBlind('big')).toBe(false);
	});
});

describe('getAnteBlinds', () => {
	it('returns 3 blinds for an ante', () => {
		const blinds = getAnteBlinds(1);

		expect(blinds).toHaveLength(3);
		expect(blinds[0]!.type).toBe('small');
		expect(blinds[1]!.type).toBe('big');
		expect(blinds[2]!.type).toBe('boss');
	});

	it('scales chip targets correctly', () => {
		const ante1 = getAnteBlinds(1);
		const ante5 = getAnteBlinds(5);

		expect(ante5[0]!.chipTarget).toBeGreaterThan(ante1[0]!.chipTarget);
	});
});
