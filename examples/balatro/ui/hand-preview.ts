/**
 * Hand Preview Display
 *
 * Shows what poker hand would be made from selected cards,
 * with scoring breakdown and highlighting.
 *
 * @module balatro/ui/hand-preview
 */

import type { Card } from '../data/card';
import type { HandResult, ScoreResult } from '../data/hand';
import { evaluateHand, calculateScore, getHandName } from '../data/hand';

// =============================================================================
// TYPES
// =============================================================================

export type PreviewState =
	| { readonly type: 'empty' }
	| { readonly type: 'too_few'; readonly count: number }
	| { readonly type: 'too_many'; readonly count: number }
	| { readonly type: 'valid'; readonly result: HandResult; readonly score: ScoreResult };

export interface HandPreview {
	readonly state: PreviewState;
	readonly selectedCardIds: readonly string[];
	readonly scoringCardIds: readonly string[];
}

export interface PreviewRenderData {
	readonly title: string;
	readonly lines: readonly string[];
	readonly titleColor: number;
	readonly isValid: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum cards required to play */
const MIN_CARDS = 1;

/** Maximum cards allowed to play */
const MAX_CARDS = 5;

/** Colors for preview states */
export const PREVIEW_COLORS = {
	valid: 0x44ff88_ff, // Green for valid hand
	invalid: 0xff6644_ff, // Red for invalid
	empty: 0x888888_ff, // Gray for no selection
	chips: 0x44aaff_ff, // Blue for chips
	mult: 0xff6644_ff, // Red/orange for mult
	total: 0xffdd44_ff, // Gold for total
} as const;

// =============================================================================
// PREVIEW CALCULATION
// =============================================================================

/**
 * Creates a hand preview from selected cards.
 *
 * @param selectedCards - Cards currently selected
 * @returns HandPreview with state and scoring info
 */
export function createHandPreview(selectedCards: readonly Card[]): HandPreview {
	const selectedCardIds = selectedCards.map(c => c.id);

	// Check for empty selection
	if (selectedCards.length === 0) {
		return {
			state: { type: 'empty' },
			selectedCardIds,
			scoringCardIds: [],
		};
	}

	// Check for too few cards
	if (selectedCards.length < MIN_CARDS) {
		return {
			state: { type: 'too_few', count: selectedCards.length },
			selectedCardIds,
			scoringCardIds: [],
		};
	}

	// Check for too many cards
	if (selectedCards.length > MAX_CARDS) {
		return {
			state: { type: 'too_many', count: selectedCards.length },
			selectedCardIds,
			scoringCardIds: [],
		};
	}

	// Valid selection - evaluate hand
	const result = evaluateHand(selectedCards);
	const score = calculateScore(result);

	return {
		state: { type: 'valid', result, score },
		selectedCardIds,
		scoringCardIds: result.scoringCards.map(c => c.id),
	};
}

/**
 * Checks if a card is a scoring card in the current preview.
 */
export function isScoring(preview: HandPreview, cardId: string): boolean {
	return preview.scoringCardIds.includes(cardId);
}

/**
 * Checks if the preview represents a valid playable hand.
 */
export function isValidHand(preview: HandPreview): boolean {
	return preview.state.type === 'valid';
}

/**
 * Gets the score total if valid, or 0.
 */
export function getPreviewScore(preview: HandPreview): number {
	if (preview.state.type !== 'valid') return 0;
	return preview.state.score.total;
}

// =============================================================================
// RENDER DATA
// =============================================================================

/**
 * Generates render data for the preview panel.
 *
 * @param preview - Current hand preview
 * @returns Data for rendering the preview
 */
export function getPreviewRenderData(preview: HandPreview): PreviewRenderData {
	switch (preview.state.type) {
		case 'empty':
			return {
				title: 'Select Cards',
				lines: ['Choose 1-5 cards to play'],
				titleColor: PREVIEW_COLORS.empty,
				isValid: false,
			};

		case 'too_few':
			return {
				title: 'Too Few Cards',
				lines: [`Selected: ${preview.state.count} (need at least ${MIN_CARDS})`],
				titleColor: PREVIEW_COLORS.invalid,
				isValid: false,
			};

		case 'too_many':
			return {
				title: 'Too Many Cards',
				lines: [`Selected: ${preview.state.count} (max ${MAX_CARDS})`],
				titleColor: PREVIEW_COLORS.invalid,
				isValid: false,
			};

		case 'valid': {
			const { result, score } = preview.state;
			const handName = getHandName(result.type);

			return {
				title: handName,
				lines: [
					`Chips: ${score.baseChips} + ${score.cardChips} = ${score.baseChips + score.cardChips}`,
					`Mult: ×${score.mult}`,
					`Total: ${score.total} pts`,
				],
				titleColor: PREVIEW_COLORS.valid,
				isValid: true,
			};
		}
	}
}

/**
 * Formats preview as a single line (for status bar).
 *
 * @param preview - Current hand preview
 * @returns Single line string representation
 */
export function getPreviewStatusLine(preview: HandPreview): string {
	switch (preview.state.type) {
		case 'empty':
			return 'Select cards...';

		case 'too_few':
			return `${preview.state.count} cards (need ${MIN_CARDS}+)`;

		case 'too_many':
			return `${preview.state.count} cards (max ${MAX_CARDS})`;

		case 'valid': {
			const { result, score } = preview.state;
			const handName = getHandName(result.type);
			return `${handName}: ${score.total} pts`;
		}
	}
}

// =============================================================================
// PREVIEW BOX RENDERING
// =============================================================================

export interface PreviewBox {
	readonly lines: readonly string[];
	readonly width: number;
	readonly height: number;
}

/**
 * Creates a bordered preview box.
 *
 * @param preview - Current hand preview
 * @param minWidth - Minimum box width
 * @returns Box with border characters
 */
export function createPreviewBox(preview: HandPreview, minWidth: number = 23): PreviewBox {
	const data = getPreviewRenderData(preview);

	// Calculate content width
	const contentLines = [data.title, ...data.lines];
	const maxContentWidth = Math.max(
		minWidth - 4, // Account for border and padding
		...contentLines.map(line => line.length),
	);
	const boxWidth = maxContentWidth + 4; // Border + padding

	// Create lines
	const lines: string[] = [];

	// Top border
	lines.push('┌' + '─'.repeat(boxWidth - 2) + '┐');

	// Title
	lines.push('│ ' + centerText(data.title, maxContentWidth) + ' │');

	// Separator
	lines.push('├' + '─'.repeat(boxWidth - 2) + '┤');

	// Content lines
	for (const line of data.lines) {
		lines.push('│ ' + padRight(line, maxContentWidth) + ' │');
	}

	// Bottom border
	lines.push('└' + '─'.repeat(boxWidth - 2) + '┘');

	return {
		lines,
		width: boxWidth,
		height: lines.length,
	};
}

/**
 * Centers text within a given width.
 */
function centerText(text: string, width: number): string {
	if (text.length >= width) return text.slice(0, width);
	const leftPad = Math.floor((width - text.length) / 2);
	const rightPad = width - text.length - leftPad;
	return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

/**
 * Pads text to the right.
 */
function padRight(text: string, width: number): string {
	if (text.length >= width) return text.slice(0, width);
	return text + ' '.repeat(width - text.length);
}

// =============================================================================
// CARD HIGHLIGHTING
// =============================================================================

export type CardHighlight = 'none' | 'selected' | 'scoring' | 'dimmed';

/**
 * Determines the highlight state for a card.
 *
 * @param preview - Current hand preview
 * @param cardId - Card to check
 * @param isSelected - Whether the card is currently selected
 * @returns Highlight state for rendering
 */
export function getCardHighlight(
	preview: HandPreview,
	cardId: string,
	isSelected: boolean,
): CardHighlight {
	if (!isSelected) {
		return 'none';
	}

	// If valid hand and card is scoring, highlight it
	if (preview.state.type === 'valid') {
		return preview.scoringCardIds.includes(cardId) ? 'scoring' : 'dimmed';
	}

	// Invalid hand - just show as selected
	return 'selected';
}

/**
 * Gets the color modifier for a card based on highlight state.
 *
 * @param highlight - Card highlight state
 * @returns Color modifier (1.0 = normal, >1 = brighter, <1 = dimmer)
 */
export function getHighlightBrightness(highlight: CardHighlight): number {
	switch (highlight) {
		case 'scoring':
			return 1.2; // Slightly brighter
		case 'dimmed':
			return 0.6; // Dimmer
		case 'selected':
		case 'none':
		default:
			return 1.0;
	}
}
