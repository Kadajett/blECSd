/**
 * Tests for card enhancement system
 */

import { describe, expect, it } from 'vitest';
import {
	applyEnhancement,
	applyEdition,
	applySeal,
	removeEnhancement,
	removeEdition,
	removeSeal,
	getEnhancementBonus,
	getPassiveBonus,
	getEndOfRoundBonus,
	getEditionBonus,
	getCombinedScoringBonus,
	getEnhancementName,
	getEnhancementDescription,
	getEditionName,
	getEditionDescription,
	getSealName,
	getSealDescription,
	getEnhancementColor,
	getEditionColor,
	isEnhanced,
	hasEdition,
	hasSeal,
	isModified,
	getAllEnhancementTypes,
	getAllEditionTypes,
	getAllSealTypes,
} from './enhancement';
import type { EnhancedCard } from './enhancement';
import type { Card } from './card';

// Helper to create a basic card
function createCard(rank: string, suit: string): Card {
	return {
		id: `${rank}-${suit}`,
		rank: rank as Card['rank'],
		suit: suit as Card['suit'],
	};
}

describe('applyEnhancement', () => {
	it('applies bonus enhancement', () => {
		const card = createCard('A', 'hearts');
		const enhanced = applyEnhancement(card, 'bonus');

		expect(enhanced.enhancement).toBe('bonus');
		expect(enhanced.rank).toBe('A');
		expect(enhanced.suit).toBe('hearts');
	});

	it('applies all enhancement types', () => {
		const card = createCard('K', 'spades');

		for (const type of getAllEnhancementTypes()) {
			const enhanced = applyEnhancement(card, type);
			expect(enhanced.enhancement).toBe(type);
		}
	});
});

describe('applyEdition', () => {
	it('applies foil edition', () => {
		const card = createCard('A', 'hearts');
		const edited = applyEdition(card, 'foil');

		expect(edited.edition).toBe('foil');
	});

	it('applies all edition types', () => {
		const card = createCard('K', 'spades');

		for (const type of getAllEditionTypes()) {
			const edited = applyEdition(card, type);
			expect(edited.edition).toBe(type);
		}
	});
});

describe('applySeal', () => {
	it('applies gold seal', () => {
		const card = createCard('A', 'hearts');
		const sealed = applySeal(card, 'gold');

		expect(sealed.seal).toBe('gold');
	});

	it('applies all seal types', () => {
		const card = createCard('K', 'spades');

		for (const type of getAllSealTypes()) {
			const sealed = applySeal(card, type);
			expect(sealed.seal).toBe(type);
		}
	});
});

describe('removeEnhancement', () => {
	it('removes enhancement', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'bonus');
		const removed = removeEnhancement(card);

		expect(removed.enhancement).toBeUndefined();
		expect(removed.rank).toBe('A');
	});
});

describe('removeEdition', () => {
	it('removes edition', () => {
		const card = applyEdition(createCard('A', 'hearts'), 'foil');
		const removed = removeEdition(card);

		expect(removed.edition).toBeUndefined();
	});
});

describe('removeSeal', () => {
	it('removes seal', () => {
		const card = applySeal(createCard('A', 'hearts'), 'gold');
		const removed = removeSeal(card);

		expect(removed.seal).toBeUndefined();
	});
});

describe('getEnhancementBonus', () => {
	it('returns bonus chips for bonus card', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'bonus');
		const bonus = getEnhancementBonus(card);

		expect(bonus.addedChips).toBe(30);
		expect(bonus.addedMult).toBe(0);
		expect(bonus.multMultiplier).toBe(1);
	});

	it('returns mult for mult card', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'mult');
		const bonus = getEnhancementBonus(card);

		expect(bonus.addedMult).toBe(4);
		expect(bonus.addedChips).toBe(0);
	});

	it('returns multiplier for glass card', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'glass');
		const bonus = getEnhancementBonus(card, 0.5); // No break (0.5 > 0.25)

		expect(bonus.multMultiplier).toBe(2);
		expect(bonus.destroyed).toBe(false);
	});

	it('glass card can break', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'glass');
		const bonus = getEnhancementBonus(card, 0.1); // Break (0.1 < 0.25)

		expect(bonus.multMultiplier).toBe(2);
		expect(bonus.destroyed).toBe(true);
	});

	it('returns no bonus for steel (passive)', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'steel');
		const bonus = getEnhancementBonus(card);

		expect(bonus.addedChips).toBe(0);
		expect(bonus.addedMult).toBe(0);
	});

	it('returns no bonus for gold (passive)', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'gold');
		const bonus = getEnhancementBonus(card);

		expect(bonus.addedMoney).toBe(0);
	});

	it('returns mult for lucky card when triggered', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'lucky');
		const bonus = getEnhancementBonus(card, 0.1); // 0.1 <= 0.2 = triggered

		expect(bonus.addedMult).toBe(20);
	});

	it('returns no bonus for lucky card when not triggered', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'lucky');
		const bonus = getEnhancementBonus(card, 0.5); // 0.5 > 0.2 = not triggered

		expect(bonus.addedMult).toBe(0);
	});

	it('returns no bonus for plain card', () => {
		const card = createCard('A', 'hearts') as EnhancedCard;
		const bonus = getEnhancementBonus(card);

		expect(bonus.addedChips).toBe(0);
		expect(bonus.addedMult).toBe(0);
		expect(bonus.multMultiplier).toBe(1);
	});
});

describe('getPassiveBonus', () => {
	it('returns mult for steel card', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'steel');
		const bonus = getPassiveBonus(card);

		expect(bonus.addedMult).toBe(1);
	});

	it('returns money for gold card', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'gold');
		const bonus = getPassiveBonus(card);

		expect(bonus.addedMoney).toBe(3);
	});

	it('returns no bonus for non-passive cards', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'bonus');
		const bonus = getPassiveBonus(card);

		expect(bonus.addedChips).toBe(0);
		expect(bonus.addedMult).toBe(0);
	});
});

describe('getEndOfRoundBonus', () => {
	it('returns money for gold card', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'gold');
		expect(getEndOfRoundBonus(card)).toBe(3);
	});

	it('returns 0 for non-gold cards', () => {
		const card = applyEnhancement(createCard('A', 'hearts'), 'bonus');
		expect(getEndOfRoundBonus(card)).toBe(0);
	});

	it('returns 0 for plain cards', () => {
		const card = createCard('A', 'hearts') as EnhancedCard;
		expect(getEndOfRoundBonus(card)).toBe(0);
	});
});

describe('getEditionBonus', () => {
	it('returns chips for foil', () => {
		const card = applyEdition(createCard('A', 'hearts'), 'foil');
		const bonus = getEditionBonus(card);

		expect(bonus.addedChips).toBe(50);
	});

	it('returns mult for holographic', () => {
		const card = applyEdition(createCard('A', 'hearts'), 'holographic');
		const bonus = getEditionBonus(card);

		expect(bonus.addedMult).toBe(10);
	});

	it('returns multiplier for polychrome', () => {
		const card = applyEdition(createCard('A', 'hearts'), 'polychrome');
		const bonus = getEditionBonus(card);

		expect(bonus.multMultiplier).toBe(1.5);
	});

	it('returns no bonus for plain card', () => {
		const card = createCard('A', 'hearts') as EnhancedCard;
		const bonus = getEditionBonus(card);

		expect(bonus.addedChips).toBe(0);
		expect(bonus.addedMult).toBe(0);
		expect(bonus.multMultiplier).toBe(1);
	});
});

describe('getCombinedScoringBonus', () => {
	it('combines enhancement and edition', () => {
		let card: EnhancedCard = applyEnhancement(createCard('A', 'hearts'), 'bonus');
		card = { ...card, edition: 'foil' as const };

		const bonus = getCombinedScoringBonus(card);

		expect(bonus.addedChips).toBe(80); // 30 + 50
	});

	it('includes gold seal money', () => {
		let card: EnhancedCard = applyEnhancement(createCard('A', 'hearts'), 'bonus');
		card = { ...card, seal: 'gold' as const };

		const bonus = getCombinedScoringBonus(card);

		expect(bonus.addedMoney).toBe(3);
	});

	it('sets retrigger for red seal', () => {
		let card: EnhancedCard = applyEnhancement(createCard('A', 'hearts'), 'bonus');
		card = { ...card, seal: 'red' as const };

		const bonus = getCombinedScoringBonus(card);

		expect(bonus.retrigger).toBe(true);
	});

	it('multiplies mult multipliers', () => {
		let card: EnhancedCard = applyEnhancement(createCard('A', 'hearts'), 'glass');
		card = { ...card, edition: 'polychrome' as const };

		const bonus = getCombinedScoringBonus(card, 0.5); // No break

		expect(bonus.multMultiplier).toBe(3); // 2 * 1.5
	});

	it('includes descriptions', () => {
		let card: EnhancedCard = applyEnhancement(createCard('A', 'hearts'), 'bonus');
		card = { ...card, edition: 'foil' as const, seal: 'gold' as const };

		const bonus = getCombinedScoringBonus(card);

		expect(bonus.descriptions.length).toBe(3);
	});
});

describe('display functions', () => {
	it('gets enhancement names', () => {
		expect(getEnhancementName('bonus')).toBe('Bonus');
		expect(getEnhancementName('glass')).toBe('Glass');
	});

	it('gets enhancement descriptions', () => {
		expect(getEnhancementDescription('bonus')).toContain('Chips');
		expect(getEnhancementDescription('mult')).toContain('Mult');
	});

	it('gets edition names', () => {
		expect(getEditionName('foil')).toBe('Foil');
		expect(getEditionName('polychrome')).toBe('Polychrome');
	});

	it('gets edition descriptions', () => {
		expect(getEditionDescription('foil')).toContain('Chips');
		expect(getEditionDescription('holographic')).toContain('Mult');
	});

	it('gets seal names', () => {
		expect(getSealName('gold')).toBe('Gold Seal');
		expect(getSealName('red')).toBe('Red Seal');
	});

	it('gets seal descriptions', () => {
		expect(getSealDescription('gold')).toContain('$3');
		expect(getSealDescription('red')).toContain('Retrigger');
	});
});

describe('color functions', () => {
	it('returns enhancement colors', () => {
		expect(getEnhancementColor('bonus')).toBe(0x5588ff);
		expect(getEnhancementColor('mult')).toBe(0xff5555);
		expect(getEnhancementColor('gold')).toBe(0xffdd00);
	});

	it('returns edition colors', () => {
		expect(getEditionColor('foil')).toBe(0x55aaff);
		expect(getEditionColor('holographic')).toBe(0xff55ff);
	});
});

describe('helper functions', () => {
	describe('isEnhanced', () => {
		it('returns true for enhanced card', () => {
			const card = applyEnhancement(createCard('A', 'hearts'), 'bonus');
			expect(isEnhanced(card)).toBe(true);
		});

		it('returns false for plain card', () => {
			const card = createCard('A', 'hearts') as EnhancedCard;
			expect(isEnhanced(card)).toBe(false);
		});
	});

	describe('hasEdition', () => {
		it('returns true for card with edition', () => {
			const card = applyEdition(createCard('A', 'hearts'), 'foil');
			expect(hasEdition(card)).toBe(true);
		});

		it('returns false for plain card', () => {
			const card = createCard('A', 'hearts') as EnhancedCard;
			expect(hasEdition(card)).toBe(false);
		});
	});

	describe('hasSeal', () => {
		it('returns true for card with seal', () => {
			const card = applySeal(createCard('A', 'hearts'), 'gold');
			expect(hasSeal(card)).toBe(true);
		});

		it('returns false for plain card', () => {
			const card = createCard('A', 'hearts') as EnhancedCard;
			expect(hasSeal(card)).toBe(false);
		});
	});

	describe('isModified', () => {
		it('returns true for any modification', () => {
			expect(isModified(applyEnhancement(createCard('A', 'hearts'), 'bonus'))).toBe(true);
			expect(isModified(applyEdition(createCard('A', 'hearts'), 'foil'))).toBe(true);
			expect(isModified(applySeal(createCard('A', 'hearts'), 'gold'))).toBe(true);
		});

		it('returns false for plain card', () => {
			const card = createCard('A', 'hearts') as EnhancedCard;
			expect(isModified(card)).toBe(false);
		});
	});

	describe('getAllEnhancementTypes', () => {
		it('returns 6 types', () => {
			expect(getAllEnhancementTypes()).toHaveLength(6);
		});
	});

	describe('getAllEditionTypes', () => {
		it('returns 3 types', () => {
			expect(getAllEditionTypes()).toHaveLength(3);
		});
	});

	describe('getAllSealTypes', () => {
		it('returns 4 types', () => {
			expect(getAllSealTypes()).toHaveLength(4);
		});
	});
});
