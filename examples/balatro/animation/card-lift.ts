/**
 * Card Selection Lift Animation
 *
 * Implements the signature Balatro card lift effect when cards are selected.
 * Selected cards lift up with satisfying spring physics.
 *
 * @module balatro/animation/card-lift
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CardLiftState {
	readonly cardId: string;
	readonly isSelected: boolean;
	readonly isHovered: boolean;
	readonly isCursor: boolean;
	readonly currentY: number;
	readonly targetY: number;
	readonly velocityY: number;
	readonly baseY: number;
}

export interface CardLiftConfig {
	/** How high selected cards lift (in characters) */
	readonly liftHeight: number;
	/** Subtle lift for hover preview */
	readonly hoverLiftHeight: number;
	/** Very subtle lift for cursor highlight */
	readonly cursorLiftHeight: number;
	/** Spring stiffness for lift animation (higher = snappier) */
	readonly stiffness: number;
	/** Spring damping (0-1, higher = less bounce) */
	readonly damping: number;
	/** Position threshold for "arrived" */
	readonly arrivalThreshold: number;
	/** Velocity threshold for "arrived" */
	readonly velocityThreshold: number;
}

export interface LiftAnimationState {
	readonly cards: readonly CardLiftState[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_LIFT_CONFIG: CardLiftConfig = {
	liftHeight: 2,
	hoverLiftHeight: 0.5,
	cursorLiftHeight: 0.3,
	stiffness: 20, // High stiffness for snappy feel
	damping: 0.6, // Some damping but allow slight overshoot
	arrivalThreshold: 0.05,
	velocityThreshold: 0.1,
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates an empty lift animation state.
 */
export function createLiftAnimationState(): LiftAnimationState {
	return {
		cards: [],
	};
}

/**
 * Creates a card lift state for a new card.
 *
 * @param cardId - Unique card identifier
 * @param baseY - Base Y position when not lifted
 */
export function createCardLiftState(cardId: string, baseY: number): CardLiftState {
	return {
		cardId,
		isSelected: false,
		isHovered: false,
		isCursor: false,
		currentY: baseY,
		targetY: baseY,
		velocityY: 0,
		baseY,
	};
}

/**
 * Adds a card to the lift animation state.
 */
export function addCardToLiftState(
	state: LiftAnimationState,
	cardId: string,
	baseY: number,
): LiftAnimationState {
	// Check if already exists
	if (state.cards.some(c => c.cardId === cardId)) {
		return state;
	}

	return {
		cards: [...state.cards, createCardLiftState(cardId, baseY)],
	};
}

/**
 * Removes a card from the lift animation state.
 */
export function removeCardFromLiftState(
	state: LiftAnimationState,
	cardId: string,
): LiftAnimationState {
	return {
		cards: state.cards.filter(c => c.cardId !== cardId),
	};
}

/**
 * Updates the base Y position for a card.
 */
export function updateCardBaseY(
	state: LiftAnimationState,
	cardId: string,
	baseY: number,
): LiftAnimationState {
	return {
		cards: state.cards.map(card =>
			card.cardId === cardId
				? { ...card, baseY }
				: card,
		),
	};
}

// =============================================================================
// SELECTION STATE
// =============================================================================

/**
 * Updates selection state for a card.
 */
export function setCardSelected(
	state: LiftAnimationState,
	cardId: string,
	isSelected: boolean,
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	return {
		cards: state.cards.map(card =>
			card.cardId === cardId
				? updateCardTarget(card, isSelected, card.isHovered, card.isCursor, config)
				: card,
		),
	};
}

/**
 * Updates hover state for a card.
 */
export function setCardHovered(
	state: LiftAnimationState,
	cardId: string,
	isHovered: boolean,
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	return {
		cards: state.cards.map(card =>
			card.cardId === cardId
				? updateCardTarget(card, card.isSelected, isHovered, card.isCursor, config)
				: card,
		),
	};
}

/**
 * Updates cursor state for a card.
 */
export function setCardCursor(
	state: LiftAnimationState,
	cardId: string,
	isCursor: boolean,
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	return {
		cards: state.cards.map(card =>
			card.cardId === cardId
				? updateCardTarget(card, card.isSelected, card.isHovered, isCursor, config)
				: card,
		),
	};
}

/**
 * Clears cursor from all cards and sets on new card.
 */
export function moveCursor(
	state: LiftAnimationState,
	cardId: string,
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	return {
		cards: state.cards.map(card => {
			const isCursor = card.cardId === cardId;
			if (card.isCursor === isCursor) return card;
			return updateCardTarget(card, card.isSelected, card.isHovered, isCursor, config);
		}),
	};
}

/**
 * Clears hover from all cards.
 */
export function clearHover(
	state: LiftAnimationState,
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	return {
		cards: state.cards.map(card =>
			card.isHovered
				? updateCardTarget(card, card.isSelected, false, card.isCursor, config)
				: card,
		),
	};
}

/**
 * Toggles selection for a card.
 */
export function toggleCardSelection(
	state: LiftAnimationState,
	cardId: string,
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	const card = state.cards.find(c => c.cardId === cardId);
	if (!card) return state;

	return setCardSelected(state, cardId, !card.isSelected, config);
}

/**
 * Clears all selections.
 */
export function clearSelections(
	state: LiftAnimationState,
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	return {
		cards: state.cards.map(card =>
			card.isSelected
				? updateCardTarget(card, false, card.isHovered, card.isCursor, config)
				: card,
		),
	};
}

/**
 * Sets selection state for multiple cards.
 */
export function setSelectedCards(
	state: LiftAnimationState,
	selectedIds: readonly string[],
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	return {
		cards: state.cards.map(card => {
			const shouldBeSelected = selectedIds.includes(card.cardId);
			if (card.isSelected === shouldBeSelected) return card;
			return updateCardTarget(card, shouldBeSelected, card.isHovered, card.isCursor, config);
		}),
	};
}

// =============================================================================
// ANIMATION HELPERS
// =============================================================================

/**
 * Calculates the target Y for a card based on its state.
 */
function calculateTargetY(
	baseY: number,
	isSelected: boolean,
	isHovered: boolean,
	isCursor: boolean,
	config: CardLiftConfig,
): number {
	// Selection takes priority
	if (isSelected) {
		return baseY - config.liftHeight;
	}

	// Hover preview
	if (isHovered) {
		return baseY - config.hoverLiftHeight;
	}

	// Cursor highlight
	if (isCursor) {
		return baseY - config.cursorLiftHeight;
	}

	// No lift
	return baseY;
}

/**
 * Updates a card's target based on new state.
 */
function updateCardTarget(
	card: CardLiftState,
	isSelected: boolean,
	isHovered: boolean,
	isCursor: boolean,
	config: CardLiftConfig,
): CardLiftState {
	const targetY = calculateTargetY(card.baseY, isSelected, isHovered, isCursor, config);

	return {
		...card,
		isSelected,
		isHovered,
		isCursor,
		targetY,
	};
}

// =============================================================================
// ANIMATION UPDATE
// =============================================================================

/**
 * Updates all card positions using spring physics.
 *
 * @param state - Current lift animation state
 * @param deltaTime - Time since last frame (in seconds)
 * @param config - Lift configuration
 * @returns Updated state
 */
export function updateLiftAnimation(
	state: LiftAnimationState,
	deltaTime: number,
	config: CardLiftConfig = DEFAULT_LIFT_CONFIG,
): LiftAnimationState {
	return {
		cards: state.cards.map(card => updateCardSpring(card, deltaTime, config)),
	};
}

/**
 * Updates a single card's spring animation.
 */
function updateCardSpring(
	card: CardLiftState,
	deltaTime: number,
	config: CardLiftConfig,
): CardLiftState {
	const displacement = card.targetY - card.currentY;
	const distance = Math.abs(displacement);
	const speed = Math.abs(card.velocityY);

	// Check if arrived at target
	if (distance < config.arrivalThreshold && speed < config.velocityThreshold) {
		return {
			...card,
			currentY: card.targetY,
			velocityY: 0,
		};
	}

	// Spring force: F = k * displacement
	const springForce = config.stiffness * displacement;

	// Update velocity
	let velocityY = card.velocityY + springForce * deltaTime;

	// Apply damping
	velocityY *= Math.pow(1 - config.damping, deltaTime * 60);

	// Update position
	const currentY = card.currentY + velocityY * deltaTime * 60;

	return {
		...card,
		currentY,
		velocityY,
	};
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Gets the current Y position for a card.
 */
export function getCardY(state: LiftAnimationState, cardId: string): number | null {
	const card = state.cards.find(c => c.cardId === cardId);
	return card?.currentY ?? null;
}

/**
 * Gets the lift amount for a card (distance from base).
 */
export function getCardLift(state: LiftAnimationState, cardId: string): number {
	const card = state.cards.find(c => c.cardId === cardId);
	if (!card) return 0;
	return card.baseY - card.currentY;
}

/**
 * Checks if a card is currently selected.
 */
export function isCardSelected(state: LiftAnimationState, cardId: string): boolean {
	const card = state.cards.find(c => c.cardId === cardId);
	return card?.isSelected ?? false;
}

/**
 * Gets all selected card IDs.
 */
export function getSelectedCardIds(state: LiftAnimationState): readonly string[] {
	return state.cards.filter(c => c.isSelected).map(c => c.cardId);
}

/**
 * Checks if any cards are animating.
 */
export function isAnimating(state: LiftAnimationState): boolean {
	return state.cards.some(card =>
		Math.abs(card.currentY - card.targetY) > 0.01 ||
		Math.abs(card.velocityY) > 0.01,
	);
}

/**
 * Gets the card state by ID.
 */
export function getCardLiftState(
	state: LiftAnimationState,
	cardId: string,
): CardLiftState | null {
	return state.cards.find(c => c.cardId === cardId) ?? null;
}
