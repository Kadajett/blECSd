/**
 * Card Rendering
 *
 * Functions for rendering playing cards to a cell buffer.
 * Cards are 7 characters wide and 5 characters tall.
 *
 * @module balatro/render/card
 */

import type { CellBuffer } from 'blecsd';
import type { Card, Suit } from '../data';
import { getSuitSymbol, isRedSuit } from '../data';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Card dimensions in terminal cells */
export const CARD_WIDTH = 7;
export const CARD_HEIGHT = 5;

/** Colors (RGBA packed as 0xRRGGBBAA) */
export const COLORS = {
	CARD_BG: 0xffffff_ff,
	CARD_BORDER: 0x444444_ff,
	RED_SUIT: 0xcc2222_ff,
	BLACK_SUIT: 0x222222_ff,
	SHADOW: 0x000000_88,
} as const;

// =============================================================================
// CARD RENDERING
// =============================================================================

/**
 * Gets the foreground color for a suit.
 */
function getSuitColor(suit: Suit): number {
	return isRedSuit(suit) ? COLORS.RED_SUIT : COLORS.BLACK_SUIT;
}

/**
 * Renders a single playing card to the buffer.
 *
 * Card layout (7x5):
 * ```
 * ┌─────┐
 * │A    │
 * │  ♠  │
 * │    A│
 * └─────┘
 * ```
 *
 * @param buffer - Cell buffer to render to
 * @param card - Card data to render
 * @param x - Left position
 * @param y - Top position
 * @param selected - Whether card is selected (lifted)
 */
export function renderCard(
	buffer: CellBuffer,
	card: Card,
	x: number,
	y: number,
	selected = false,
): void {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const suitColor = getSuitColor(card.suit);
	const suitSymbol = getSuitSymbol(card.suit);
	const rank = card.rank;

	// Card background color (yellow tint when selected)
	const bgColor = selected ? 0xffffdd_ff : COLORS.CARD_BG;

	// Draw card background
	for (let dy = 0; dy < CARD_HEIGHT; dy++) {
		for (let dx = 0; dx < CARD_WIDTH; dx++) {
			buffer.setCell(ix + dx, iy + dy, ' ', COLORS.CARD_BORDER, bgColor);
		}
	}

	// Draw border
	// Top row
	buffer.setCell(ix, iy, '┌', COLORS.CARD_BORDER, bgColor);
	for (let dx = 1; dx < CARD_WIDTH - 1; dx++) {
		buffer.setCell(ix + dx, iy, '─', COLORS.CARD_BORDER, bgColor);
	}
	buffer.setCell(ix + CARD_WIDTH - 1, iy, '┐', COLORS.CARD_BORDER, bgColor);

	// Middle rows (vertical borders)
	for (let dy = 1; dy < CARD_HEIGHT - 1; dy++) {
		buffer.setCell(ix, iy + dy, '│', COLORS.CARD_BORDER, bgColor);
		buffer.setCell(ix + CARD_WIDTH - 1, iy + dy, '│', COLORS.CARD_BORDER, bgColor);
	}

	// Bottom row
	buffer.setCell(ix, iy + CARD_HEIGHT - 1, '└', COLORS.CARD_BORDER, bgColor);
	for (let dx = 1; dx < CARD_WIDTH - 1; dx++) {
		buffer.setCell(ix + dx, iy + CARD_HEIGHT - 1, '─', COLORS.CARD_BORDER, bgColor);
	}
	buffer.setCell(ix + CARD_WIDTH - 1, iy + CARD_HEIGHT - 1, '┘', COLORS.CARD_BORDER, bgColor);

	// Draw rank in top-left (handle 10 which is 2 chars)
	if (rank === '10') {
		buffer.setCell(ix + 1, iy + 1, '1', suitColor, bgColor);
		buffer.setCell(ix + 2, iy + 1, '0', suitColor, bgColor);
	} else {
		buffer.setCell(ix + 1, iy + 1, rank, suitColor, bgColor);
	}

	// Draw suit symbol in center
	buffer.setCell(ix + 3, iy + 2, suitSymbol, suitColor, bgColor);

	// Draw rank in bottom-right (upside down conceptually, handle 10)
	if (rank === '10') {
		buffer.setCell(ix + CARD_WIDTH - 4, iy + CARD_HEIGHT - 2, '1', suitColor, bgColor);
		buffer.setCell(ix + CARD_WIDTH - 3, iy + CARD_HEIGHT - 2, '0', suitColor, bgColor);
	} else {
		buffer.setCell(ix + CARD_WIDTH - 2, iy + CARD_HEIGHT - 2, rank, suitColor, bgColor);
	}
}

/**
 * Renders a card's shadow.
 * Call this before rendering the card itself.
 *
 * @param buffer - Cell buffer to render to
 * @param x - Card's left position
 * @param y - Card's top position
 * @param offsetX - Shadow offset X (default 1)
 * @param offsetY - Shadow offset Y (default 1)
 */
export function renderCardShadow(
	buffer: CellBuffer,
	x: number,
	y: number,
	offsetX = 1,
	offsetY = 1,
): void {
	const ix = Math.floor(x) + offsetX;
	const iy = Math.floor(y) + offsetY;

	// Draw shadow as a filled rectangle
	for (let dy = 0; dy < CARD_HEIGHT; dy++) {
		for (let dx = 0; dx < CARD_WIDTH; dx++) {
			const px = ix + dx;
			const py = iy + dy;
			if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
				buffer.setCell(px, py, '░', COLORS.SHADOW, COLORS.SHADOW);
			}
		}
	}
}

/**
 * Renders the back of a card (face down).
 *
 * @param buffer - Cell buffer to render to
 * @param x - Left position
 * @param y - Top position
 */
export function renderCardBack(
	buffer: CellBuffer,
	x: number,
	y: number,
): void {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const bgColor = 0x2244aa_ff; // Blue card back
	const patternColor = 0x1133aa_ff;

	// Draw card background with pattern
	for (let dy = 0; dy < CARD_HEIGHT; dy++) {
		for (let dx = 0; dx < CARD_WIDTH; dx++) {
			const isPattern = (dx + dy) % 2 === 0;
			const char = isPattern ? '▓' : '▒';
			buffer.setCell(ix + dx, iy + dy, char, patternColor, bgColor);
		}
	}

	// Draw border
	buffer.setCell(ix, iy, '┌', 0xffffff_ff, bgColor);
	for (let dx = 1; dx < CARD_WIDTH - 1; dx++) {
		buffer.setCell(ix + dx, iy, '─', 0xffffff_ff, bgColor);
	}
	buffer.setCell(ix + CARD_WIDTH - 1, iy, '┐', 0xffffff_ff, bgColor);

	for (let dy = 1; dy < CARD_HEIGHT - 1; dy++) {
		buffer.setCell(ix, iy + dy, '│', 0xffffff_ff, bgColor);
		buffer.setCell(ix + CARD_WIDTH - 1, iy + dy, '│', 0xffffff_ff, bgColor);
	}

	buffer.setCell(ix, iy + CARD_HEIGHT - 1, '└', 0xffffff_ff, bgColor);
	for (let dx = 1; dx < CARD_WIDTH - 1; dx++) {
		buffer.setCell(ix + dx, iy + CARD_HEIGHT - 1, '─', 0xffffff_ff, bgColor);
	}
	buffer.setCell(ix + CARD_WIDTH - 1, iy + CARD_HEIGHT - 1, '┘', 0xffffff_ff, bgColor);
}
