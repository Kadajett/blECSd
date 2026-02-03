/**
 * Tests for game UI layout system
 */

import { describe, expect, it } from 'vitest';
import {
	calculateLayout,
	getHandCardPositions,
	getPlayedCardPositions,
	getPlayAreaCenter,
	getScoreDisplayPosition,
	getButtonLayout,
	isScreenLargeEnough,
	getMinSizeMessage,
	isPositionInRect,
	getCardIndexAtPosition,
	DEFAULT_LAYOUT_CONFIG,
} from './layout';
import { CARD_WIDTH, CARD_HEIGHT } from '../render';

describe('calculateLayout', () => {
	it('creates layout for standard terminal', () => {
		const layout = calculateLayout(80, 24);

		expect(layout.screen.width).toBe(80);
		expect(layout.screen.height).toBe(24);
		expect(layout.header).toBeDefined();
		expect(layout.playArea).toBeDefined();
		expect(layout.handArea).toBeDefined();
		expect(layout.actionBar).toBeDefined();
	});

	it('clamps to minimum dimensions', () => {
		const layout = calculateLayout(40, 10);

		expect(layout.screen.width).toBe(DEFAULT_LAYOUT_CONFIG.minWidth);
		expect(layout.screen.height).toBe(DEFAULT_LAYOUT_CONFIG.minHeight);
	});

	it('uses full spacing with 1-cell gap between cards', () => {
		const layout = calculateLayout(80, 24);

		// All screens at or above minWidth (80) use CARD_WIDTH + 1 = 8 spacing
		expect(layout.cardOverlap).toBe(CARD_WIDTH + 1);

		// Wide screens use the same spacing
		const wideLayout = calculateLayout(120, 24);
		expect(wideLayout.cardOverlap).toBe(CARD_WIDTH + 1);
	});

	it('positions zones without overlap', () => {
		const layout = calculateLayout(80, 24);

		// Header should be at top
		expect(layout.header.y).toBe(0);

		// Action bar should be at bottom
		expect(layout.actionBar.y + layout.actionBar.height).toBe(layout.screen.height);

		// Hand area should be above action bar
		expect(layout.handArea.y + layout.handArea.height).toBeLessThanOrEqual(layout.actionBar.y);

		// Status bar should be above hand area
		expect(layout.statusBar.y + layout.statusBar.height).toBeLessThanOrEqual(layout.handArea.y);
	});

	it('includes deck position', () => {
		const layout = calculateLayout(80, 24);

		expect(layout.deckPosition).toBeDefined();
		expect(layout.deckPosition.x).toBeGreaterThanOrEqual(0);
		expect(layout.deckPosition.y).toBeGreaterThanOrEqual(0);
	});
});

describe('getHandCardPositions', () => {
	it('returns empty array for no cards', () => {
		const layout = calculateLayout(80, 24);
		const positions = getHandCardPositions(layout, 0);

		expect(positions).toHaveLength(0);
	});

	it('returns single centered position for one card', () => {
		const layout = calculateLayout(80, 24);
		const positions = getHandCardPositions(layout, 1);

		expect(positions).toHaveLength(1);
		// Should be roughly centered (within 1 char due to rounding)
		const centerX = layout.handArea.x + layout.handArea.width / 2;
		const expectedX = Math.floor(centerX - CARD_WIDTH / 2);
		expect(Math.abs(positions[0]!.x - expectedX)).toBeLessThanOrEqual(1);
	});

	it('returns evenly spaced positions for multiple cards', () => {
		const layout = calculateLayout(80, 24);
		const positions = getHandCardPositions(layout, 5);

		expect(positions).toHaveLength(5);

		// Check spacing
		for (let i = 1; i < positions.length; i++) {
			const spacing = positions[i]!.x - positions[i - 1]!.x;
			expect(spacing).toBe(layout.cardOverlap);
		}
	});

	it('positions cards at bottom of hand area', () => {
		const layout = calculateLayout(80, 24);
		const positions = getHandCardPositions(layout, 3);

		// All cards should be at the same Y
		const y = positions[0]!.y;
		expect(positions.every(p => p.y === y)).toBe(true);

		// Should be near bottom of hand area
		expect(y + CARD_HEIGHT).toBeLessThanOrEqual(layout.handArea.y + layout.handArea.height);
	});
});

describe('getPlayedCardPositions', () => {
	it('returns empty array for no cards', () => {
		const layout = calculateLayout(80, 24);
		const positions = getPlayedCardPositions(layout, 0);

		expect(positions).toHaveLength(0);
	});

	it('centers single played card', () => {
		const layout = calculateLayout(80, 24);
		const positions = getPlayedCardPositions(layout, 1);

		expect(positions).toHaveLength(1);

		// Should be centered in play area (within 1 char due to rounding)
		const centerX = layout.playArea.x + layout.playArea.width / 2;
		const expectedX = Math.floor(centerX - CARD_WIDTH / 2);
		expect(Math.abs(positions[0]!.x - expectedX)).toBeLessThanOrEqual(1);
	});

	it('spaces played cards with gaps', () => {
		const layout = calculateLayout(80, 24);
		const positions = getPlayedCardPositions(layout, 3);

		expect(positions).toHaveLength(3);

		// Played cards should have gaps (not overlapping like hand)
		for (let i = 1; i < positions.length; i++) {
			const spacing = positions[i]!.x - positions[i - 1]!.x;
			expect(spacing).toBe(CARD_WIDTH + layout.playedCardSpacing);
		}
	});
});

describe('getPlayAreaCenter', () => {
	it('returns center of play area', () => {
		const layout = calculateLayout(80, 24);
		const center = getPlayAreaCenter(layout);

		const expectedX = layout.playArea.x + Math.floor(layout.playArea.width / 2);
		const expectedY = layout.playArea.y + Math.floor(layout.playArea.height / 2);

		expect(center.x).toBe(expectedX);
		expect(center.y).toBe(expectedY);
	});
});

describe('getScoreDisplayPosition', () => {
	it('returns score display position', () => {
		const layout = calculateLayout(80, 24);
		const pos = getScoreDisplayPosition(layout);

		expect(pos.x).toBe(layout.scoreDisplay.x + Math.floor(layout.scoreDisplay.width / 2));
		expect(pos.y).toBe(layout.scoreDisplay.y);
	});
});

describe('getButtonLayout', () => {
	it('returns three buttons', () => {
		const layout = calculateLayout(80, 24);
		const buttons = getButtonLayout(layout);

		expect(buttons.play).toBeDefined();
		expect(buttons.discard).toBeDefined();
		expect(buttons.sort).toBeDefined();
	});

	it('positions buttons in action bar', () => {
		const layout = calculateLayout(80, 24);
		const buttons = getButtonLayout(layout);

		// All buttons should be at action bar Y
		expect(buttons.play.y).toBe(layout.actionBar.y);
		expect(buttons.discard.y).toBe(layout.actionBar.y);
		expect(buttons.sort.y).toBe(layout.actionBar.y);
	});

	it('orders buttons left to right', () => {
		const layout = calculateLayout(80, 24);
		const buttons = getButtonLayout(layout);

		expect(buttons.play.x).toBeLessThan(buttons.discard.x);
		expect(buttons.discard.x).toBeLessThan(buttons.sort.x);
	});
});

describe('isScreenLargeEnough', () => {
	it('returns true for adequate size', () => {
		expect(isScreenLargeEnough(80, 24)).toBe(true);
		expect(isScreenLargeEnough(120, 40)).toBe(true);
	});

	it('returns false for too small', () => {
		expect(isScreenLargeEnough(40, 24)).toBe(false);
		expect(isScreenLargeEnough(80, 10)).toBe(false);
		expect(isScreenLargeEnough(40, 10)).toBe(false);
	});

	it('returns true at exact minimum', () => {
		expect(isScreenLargeEnough(
			DEFAULT_LAYOUT_CONFIG.minWidth,
			DEFAULT_LAYOUT_CONFIG.minHeight,
		)).toBe(true);
	});
});

describe('getMinSizeMessage', () => {
	it('includes minimum dimensions', () => {
		const message = getMinSizeMessage();

		expect(message).toContain(DEFAULT_LAYOUT_CONFIG.minWidth.toString());
		expect(message).toContain(DEFAULT_LAYOUT_CONFIG.minHeight.toString());
	});
});

describe('isPositionInRect', () => {
	const rect = { x: 10, y: 20, width: 30, height: 40 };

	it('returns true for position inside', () => {
		expect(isPositionInRect({ x: 15, y: 25 }, rect)).toBe(true);
		expect(isPositionInRect({ x: 10, y: 20 }, rect)).toBe(true);
	});

	it('returns false for position outside', () => {
		expect(isPositionInRect({ x: 5, y: 25 }, rect)).toBe(false);
		expect(isPositionInRect({ x: 50, y: 25 }, rect)).toBe(false);
		expect(isPositionInRect({ x: 15, y: 100 }, rect)).toBe(false);
	});

	it('returns false on boundary (exclusive end)', () => {
		expect(isPositionInRect({ x: 40, y: 25 }, rect)).toBe(false); // x + width
		expect(isPositionInRect({ x: 15, y: 60 }, rect)).toBe(false); // y + height
	});
});

describe('getCardIndexAtPosition', () => {
	it('returns -1 for empty array', () => {
		expect(getCardIndexAtPosition({ x: 10, y: 10 }, [])).toBe(-1);
	});

	it('returns -1 for position outside all cards', () => {
		const positions = [
			{ x: 10, y: 10 },
			{ x: 20, y: 10 },
		];
		expect(getCardIndexAtPosition({ x: 100, y: 100 }, positions)).toBe(-1);
	});

	it('returns card index for position on card', () => {
		const positions = [
			{ x: 10, y: 10 },
			{ x: 20, y: 10 },
			{ x: 30, y: 10 },
		];

		// Position on first card
		expect(getCardIndexAtPosition({ x: 12, y: 12 }, positions)).toBe(0);

		// Position on second card
		expect(getCardIndexAtPosition({ x: 22, y: 12 }, positions)).toBe(1);
	});

	it('returns topmost card for overlapping positions', () => {
		// Overlapping cards (common with hand layout)
		const positions = [
			{ x: 10, y: 10 },
			{ x: 13, y: 10 }, // Overlaps with first
			{ x: 16, y: 10 }, // Overlaps with second
		];

		// Position in overlap area should return higher index (topmost card)
		// At x=14, this could hit card 0 or 1, should return 1
		expect(getCardIndexAtPosition({ x: 14, y: 12 }, positions)).toBe(1);
	});
});
