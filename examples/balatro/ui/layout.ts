/**
 * Game UI Layout System
 *
 * Calculates positions for all UI elements based on terminal size.
 * Supports responsive layouts for different screen dimensions.
 *
 * @module balatro/ui/layout
 */

import { CARD_WIDTH, CARD_HEIGHT } from '../render';

// =============================================================================
// TYPES
// =============================================================================

export interface Position {
	readonly x: number;
	readonly y: number;
}

export interface Rect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface Layout {
	/** Total screen dimensions */
	readonly screen: { readonly width: number; readonly height: number };

	/** Header area (ante, blind info) */
	readonly header: Rect;

	/** Play area (where cards are played) */
	readonly playArea: Rect;

	/** Score display area */
	readonly scoreDisplay: Rect;

	/** Status bar (hands, discards remaining) */
	readonly statusBar: Rect;

	/** Hand area (cards in hand) */
	readonly handArea: Rect;

	/** Action buttons area */
	readonly actionBar: Rect;

	/** Deck position */
	readonly deckPosition: Position;

	/** Card overlap amount in hand */
	readonly cardOverlap: number;

	/** Spacing between played cards */
	readonly playedCardSpacing: number;
}

export interface LayoutConfig {
	/** Minimum screen width */
	readonly minWidth: number;
	/** Minimum screen height */
	readonly minHeight: number;
	/** Header height */
	readonly headerHeight: number;
	/** Status bar height */
	readonly statusBarHeight: number;
	/** Action bar height */
	readonly actionBarHeight: number;
	/** Padding from screen edges */
	readonly padding: number;
	/** Hand area height */
	readonly handAreaHeight: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
	minWidth: 80,
	minHeight: 24,
	headerHeight: 1,
	statusBarHeight: 1,
	actionBarHeight: 1,
	padding: 2,
	handAreaHeight: CARD_HEIGHT + 3, // Card height + selection lift + margin
};

/** Card overlap in hand (pixels between card left edges) */
const BASE_CARD_OVERLAP = 5;

/** Minimum overlap to keep cards readable */
const MIN_CARD_OVERLAP = 3;

/** Spacing between played cards */
const BASE_PLAYED_SPACING = 2;

// =============================================================================
// LAYOUT CALCULATION
// =============================================================================

/**
 * Calculates the full UI layout based on screen size.
 *
 * @param width - Screen width in characters
 * @param height - Screen height in characters
 * @param config - Layout configuration
 * @returns Complete layout with all areas positioned
 */
export function calculateLayout(
	width: number,
	height: number,
	config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): Layout {
	// Clamp to minimum dimensions
	const screenWidth = Math.max(width, config.minWidth);
	const screenHeight = Math.max(height, config.minHeight);

	// Calculate vertical zones
	const headerY = 0;
	const headerHeight = config.headerHeight;

	const actionBarY = screenHeight - config.actionBarHeight;
	const actionBarHeight = config.actionBarHeight;

	const handAreaY = actionBarY - config.handAreaHeight;
	const handAreaHeight = config.handAreaHeight;

	const statusBarY = handAreaY - config.statusBarHeight;
	const statusBarHeight = config.statusBarHeight;

	// Everything between header and status bar is the play area
	const playAreaY = headerY + headerHeight + 1;
	const playAreaHeight = statusBarY - playAreaY - 1;

	// Score display is at the bottom of the play area
	const scoreDisplayHeight = 3;
	const scoreDisplayY = playAreaY + playAreaHeight - scoreDisplayHeight;

	// Horizontal padding
	const contentWidth = screenWidth - config.padding * 2;

	// Calculate card overlap based on screen width
	const cardOverlap = calculateCardOverlap(screenWidth);

	// Deck position (top left, below header)
	const deckPosition: Position = {
		x: config.padding,
		y: playAreaY,
	};

	return {
		screen: { width: screenWidth, height: screenHeight },

		header: {
			x: 0,
			y: headerY,
			width: screenWidth,
			height: headerHeight,
		},

		playArea: {
			x: config.padding,
			y: playAreaY,
			width: contentWidth,
			height: playAreaHeight - scoreDisplayHeight,
		},

		scoreDisplay: {
			x: config.padding,
			y: scoreDisplayY,
			width: contentWidth,
			height: scoreDisplayHeight,
		},

		statusBar: {
			x: 0,
			y: statusBarY,
			width: screenWidth,
			height: statusBarHeight,
		},

		handArea: {
			x: config.padding,
			y: handAreaY,
			width: contentWidth,
			height: handAreaHeight,
		},

		actionBar: {
			x: 0,
			y: actionBarY,
			width: screenWidth,
			height: actionBarHeight,
		},

		deckPosition,

		cardOverlap,

		playedCardSpacing: calculatePlayedSpacing(screenWidth),
	};
}

/**
 * Calculates card overlap based on screen width.
 * Wider screens allow more overlap (cards more spread out).
 */
function calculateCardOverlap(screenWidth: number): number {
	if (screenWidth >= 120) return BASE_CARD_OVERLAP + 2;
	if (screenWidth >= 100) return BASE_CARD_OVERLAP + 1;
	if (screenWidth >= 80) return BASE_CARD_OVERLAP;
	return MIN_CARD_OVERLAP;
}

/**
 * Calculates spacing between played cards.
 */
function calculatePlayedSpacing(screenWidth: number): number {
	if (screenWidth >= 120) return BASE_PLAYED_SPACING + 2;
	if (screenWidth >= 100) return BASE_PLAYED_SPACING + 1;
	return BASE_PLAYED_SPACING;
}

// =============================================================================
// CARD POSITION CALCULATIONS
// =============================================================================

/**
 * Calculates positions for cards in hand.
 *
 * @param layout - Current layout
 * @param cardCount - Number of cards in hand
 * @returns Array of positions for each card
 */
export function getHandCardPositions(
	layout: Layout,
	cardCount: number,
): readonly Position[] {
	if (cardCount === 0) return [];

	const { handArea, cardOverlap } = layout;

	// Calculate total width of hand
	const totalWidth = cardCount === 1
		? CARD_WIDTH
		: (cardCount - 1) * cardOverlap + CARD_WIDTH;

	// Center the hand horizontally
	const startX = handArea.x + Math.floor((handArea.width - totalWidth) / 2);

	// Cards sit at the bottom of the hand area (with room for lift)
	const cardY = handArea.y + handArea.height - CARD_HEIGHT - 1;

	const positions: Position[] = [];
	for (let i = 0; i < cardCount; i++) {
		positions.push({
			x: startX + i * cardOverlap,
			y: cardY,
		});
	}

	return positions;
}

/**
 * Calculates positions for played cards.
 *
 * @param layout - Current layout
 * @param cardCount - Number of played cards
 * @returns Array of positions for each card
 */
export function getPlayedCardPositions(
	layout: Layout,
	cardCount: number,
): readonly Position[] {
	if (cardCount === 0) return [];

	const { playArea, playedCardSpacing } = layout;

	// Total width of played cards
	const totalWidth = cardCount === 1
		? CARD_WIDTH
		: (cardCount - 1) * (CARD_WIDTH + playedCardSpacing) + CARD_WIDTH;

	// Center horizontally in play area
	const startX = playArea.x + Math.floor((playArea.width - totalWidth) / 2);

	// Center vertically in play area
	const cardY = playArea.y + Math.floor((playArea.height - CARD_HEIGHT) / 2);

	const positions: Position[] = [];
	for (let i = 0; i < cardCount; i++) {
		positions.push({
			x: startX + i * (CARD_WIDTH + playedCardSpacing),
			y: cardY,
		});
	}

	return positions;
}

/**
 * Gets the center position of the play area (for score popups).
 */
export function getPlayAreaCenter(layout: Layout): Position {
	return {
		x: layout.playArea.x + Math.floor(layout.playArea.width / 2),
		y: layout.playArea.y + Math.floor(layout.playArea.height / 2),
	};
}

/**
 * Gets the score display position.
 */
export function getScoreDisplayPosition(layout: Layout): Position {
	return {
		x: layout.scoreDisplay.x + Math.floor(layout.scoreDisplay.width / 2),
		y: layout.scoreDisplay.y,
	};
}

// =============================================================================
// BUTTON POSITIONS
// =============================================================================

export interface ButtonLayout {
	readonly play: Rect;
	readonly discard: Rect;
	readonly sort: Rect;
}

/**
 * Calculates button positions in the action bar.
 *
 * @param layout - Current layout
 * @returns Button rectangles
 */
export function getButtonLayout(layout: Layout): ButtonLayout {
	const { actionBar } = layout;

	const buttonWidth = 12;
	const buttonSpacing = 4;
	const totalWidth = buttonWidth * 3 + buttonSpacing * 2;
	const startX = actionBar.x + Math.floor((actionBar.width - totalWidth) / 2);

	return {
		play: {
			x: startX,
			y: actionBar.y,
			width: buttonWidth,
			height: actionBar.height,
		},
		discard: {
			x: startX + buttonWidth + buttonSpacing,
			y: actionBar.y,
			width: buttonWidth,
			height: actionBar.height,
		},
		sort: {
			x: startX + (buttonWidth + buttonSpacing) * 2,
			y: actionBar.y,
			width: buttonWidth,
			height: actionBar.height,
		},
	};
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Checks if the screen is large enough for the game.
 */
export function isScreenLargeEnough(
	width: number,
	height: number,
	config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): boolean {
	return width >= config.minWidth && height >= config.minHeight;
}

/**
 * Gets the minimum screen size message.
 */
export function getMinSizeMessage(config: LayoutConfig = DEFAULT_LAYOUT_CONFIG): string {
	return `Terminal too small. Minimum: ${config.minWidth}x${config.minHeight}`;
}

// =============================================================================
// HIT TESTING HELPERS
// =============================================================================

/**
 * Checks if a position is within a rectangle.
 */
export function isPositionInRect(pos: Position, rect: Rect): boolean {
	return (
		pos.x >= rect.x &&
		pos.x < rect.x + rect.width &&
		pos.y >= rect.y &&
		pos.y < rect.y + rect.height
	);
}

/**
 * Gets the index of the card at a position (or -1 if none).
 *
 * @param pos - Position to check
 * @param cardPositions - Array of card positions
 * @param cardWidth - Width of each card
 * @param cardHeight - Height of each card
 * @returns Card index or -1
 */
export function getCardIndexAtPosition(
	pos: Position,
	cardPositions: readonly Position[],
	cardWidth: number = CARD_WIDTH,
	cardHeight: number = CARD_HEIGHT,
): number {
	// Check in reverse order (topmost cards first due to overlap)
	for (let i = cardPositions.length - 1; i >= 0; i--) {
		const cardPos = cardPositions[i];
		if (!cardPos) continue;

		if (
			pos.x >= cardPos.x &&
			pos.x < cardPos.x + cardWidth &&
			pos.y >= cardPos.y &&
			pos.y < cardPos.y + cardHeight
		) {
			return i;
		}
	}

	return -1;
}
