/**
 * Tests for card selection lift animation
 */

import { describe, expect, it } from 'vitest';
import {
	createLiftAnimationState,
	createCardLiftState,
	addCardToLiftState,
	removeCardFromLiftState,
	updateCardBaseY,
	setCardSelected,
	setCardHovered,
	setCardCursor,
	moveCursor,
	clearHover,
	toggleCardSelection,
	clearSelections,
	setSelectedCards,
	updateLiftAnimation,
	getCardY,
	getCardLift,
	isCardSelected,
	getSelectedCardIds,
	isAnimating,
	getCardLiftState,
	DEFAULT_LIFT_CONFIG,
} from './card-lift';

describe('createLiftAnimationState', () => {
	it('creates empty state', () => {
		const state = createLiftAnimationState();
		expect(state.cards).toHaveLength(0);
	});
});

describe('createCardLiftState', () => {
	it('creates card state at base position', () => {
		const card = createCardLiftState('card-1', 20);

		expect(card.cardId).toBe('card-1');
		expect(card.baseY).toBe(20);
		expect(card.currentY).toBe(20);
		expect(card.targetY).toBe(20);
		expect(card.velocityY).toBe(0);
		expect(card.isSelected).toBe(false);
		expect(card.isHovered).toBe(false);
		expect(card.isCursor).toBe(false);
	});
});

describe('addCardToLiftState', () => {
	it('adds card to state', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);

		expect(state.cards).toHaveLength(1);
		expect(state.cards[0]?.cardId).toBe('card-1');
	});

	it('does not add duplicate cards', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = addCardToLiftState(state, 'card-1', 20);

		expect(state.cards).toHaveLength(1);
	});
});

describe('removeCardFromLiftState', () => {
	it('removes card from state', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = addCardToLiftState(state, 'card-2', 20);
		state = removeCardFromLiftState(state, 'card-1');

		expect(state.cards).toHaveLength(1);
		expect(state.cards[0]?.cardId).toBe('card-2');
	});
});

describe('updateCardBaseY', () => {
	it('updates base Y position', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = updateCardBaseY(state, 'card-1', 30);

		expect(state.cards[0]?.baseY).toBe(30);
	});
});

describe('setCardSelected', () => {
	it('sets card as selected and updates target', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardSelected(state, 'card-1', true);

		const card = state.cards[0];
		expect(card?.isSelected).toBe(true);
		expect(card?.targetY).toBe(20 - DEFAULT_LIFT_CONFIG.liftHeight);
	});

	it('sets card as deselected and updates target', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardSelected(state, 'card-1', true);
		state = setCardSelected(state, 'card-1', false);

		const card = state.cards[0];
		expect(card?.isSelected).toBe(false);
		expect(card?.targetY).toBe(20);
	});
});

describe('setCardHovered', () => {
	it('sets hover lift when not selected', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardHovered(state, 'card-1', true);

		const card = state.cards[0];
		expect(card?.isHovered).toBe(true);
		expect(card?.targetY).toBe(20 - DEFAULT_LIFT_CONFIG.hoverLiftHeight);
	});

	it('selection takes priority over hover', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardSelected(state, 'card-1', true);
		state = setCardHovered(state, 'card-1', true);

		const card = state.cards[0];
		// Should use selection lift height, not hover
		expect(card?.targetY).toBe(20 - DEFAULT_LIFT_CONFIG.liftHeight);
	});
});

describe('setCardCursor', () => {
	it('sets cursor lift when not selected or hovered', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardCursor(state, 'card-1', true);

		const card = state.cards[0];
		expect(card?.isCursor).toBe(true);
		expect(card?.targetY).toBe(20 - DEFAULT_LIFT_CONFIG.cursorLiftHeight);
	});
});

describe('moveCursor', () => {
	it('moves cursor to new card', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = addCardToLiftState(state, 'card-2', 20);
		state = setCardCursor(state, 'card-1', true);
		state = moveCursor(state, 'card-2');

		expect(state.cards.find(c => c.cardId === 'card-1')?.isCursor).toBe(false);
		expect(state.cards.find(c => c.cardId === 'card-2')?.isCursor).toBe(true);
	});
});

describe('clearHover', () => {
	it('clears hover from all cards', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = addCardToLiftState(state, 'card-2', 20);
		state = setCardHovered(state, 'card-1', true);
		state = setCardHovered(state, 'card-2', true);
		state = clearHover(state);

		expect(state.cards.every(c => !c.isHovered)).toBe(true);
	});
});

describe('toggleCardSelection', () => {
	it('toggles selection state', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);

		state = toggleCardSelection(state, 'card-1');
		expect(state.cards[0]?.isSelected).toBe(true);

		state = toggleCardSelection(state, 'card-1');
		expect(state.cards[0]?.isSelected).toBe(false);
	});
});

describe('clearSelections', () => {
	it('clears all selections', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = addCardToLiftState(state, 'card-2', 20);
		state = setCardSelected(state, 'card-1', true);
		state = setCardSelected(state, 'card-2', true);
		state = clearSelections(state);

		expect(state.cards.every(c => !c.isSelected)).toBe(true);
	});
});

describe('setSelectedCards', () => {
	it('sets selection state for multiple cards', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = addCardToLiftState(state, 'card-2', 20);
		state = addCardToLiftState(state, 'card-3', 20);

		state = setSelectedCards(state, ['card-1', 'card-3']);

		expect(state.cards.find(c => c.cardId === 'card-1')?.isSelected).toBe(true);
		expect(state.cards.find(c => c.cardId === 'card-2')?.isSelected).toBe(false);
		expect(state.cards.find(c => c.cardId === 'card-3')?.isSelected).toBe(true);
	});
});

describe('updateLiftAnimation', () => {
	it('moves card toward target', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardSelected(state, 'card-1', true);

		// Card should start at 20, target is 18 (lift of 2)
		expect(state.cards[0]?.currentY).toBe(20);
		expect(state.cards[0]?.targetY).toBe(18);

		// Update animation
		state = updateLiftAnimation(state, 0.016); // ~60fps frame

		// Should have moved toward target
		expect(state.cards[0]?.currentY).toBeLessThan(20);
	});

	it('arrives at target eventually', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardSelected(state, 'card-1', true);

		// Simulate many frames
		for (let i = 0; i < 120; i++) {
			state = updateLiftAnimation(state, 0.016);
		}

		// Should be at or very close to target
		const card = state.cards[0];
		expect(card?.currentY).toBeCloseTo(card!.targetY, 1);
		expect(card?.velocityY).toBeCloseTo(0, 1);
	});
});

describe('getCardY', () => {
	it('returns current Y position', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);

		expect(getCardY(state, 'card-1')).toBe(20);
	});

	it('returns null for unknown card', () => {
		const state = createLiftAnimationState();
		expect(getCardY(state, 'unknown')).toBeNull();
	});
});

describe('getCardLift', () => {
	it('returns lift amount', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardSelected(state, 'card-1', true);

		// Simulate animation to completion
		for (let i = 0; i < 120; i++) {
			state = updateLiftAnimation(state, 0.016);
		}

		expect(getCardLift(state, 'card-1')).toBeCloseTo(DEFAULT_LIFT_CONFIG.liftHeight, 1);
	});

	it('returns 0 for unknown card', () => {
		const state = createLiftAnimationState();
		expect(getCardLift(state, 'unknown')).toBe(0);
	});
});

describe('isCardSelected', () => {
	it('returns selection state', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);

		expect(isCardSelected(state, 'card-1')).toBe(false);

		state = setCardSelected(state, 'card-1', true);
		expect(isCardSelected(state, 'card-1')).toBe(true);
	});
});

describe('getSelectedCardIds', () => {
	it('returns all selected card IDs', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = addCardToLiftState(state, 'card-2', 20);
		state = addCardToLiftState(state, 'card-3', 20);
		state = setCardSelected(state, 'card-1', true);
		state = setCardSelected(state, 'card-3', true);

		const selected = getSelectedCardIds(state);
		expect(selected).toContain('card-1');
		expect(selected).toContain('card-3');
		expect(selected).not.toContain('card-2');
	});
});

describe('isAnimating', () => {
	it('returns true when cards are moving', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardSelected(state, 'card-1', true);

		expect(isAnimating(state)).toBe(true);
	});

	it('returns false when cards are at rest', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);

		// Not selected, at target
		expect(isAnimating(state)).toBe(false);
	});
});

describe('getCardLiftState', () => {
	it('returns card state by ID', () => {
		let state = createLiftAnimationState();
		state = addCardToLiftState(state, 'card-1', 20);
		state = setCardSelected(state, 'card-1', true);

		const cardState = getCardLiftState(state, 'card-1');
		expect(cardState).not.toBeNull();
		expect(cardState?.isSelected).toBe(true);
	});

	it('returns null for unknown card', () => {
		const state = createLiftAnimationState();
		expect(getCardLiftState(state, 'unknown')).toBeNull();
	});
});
