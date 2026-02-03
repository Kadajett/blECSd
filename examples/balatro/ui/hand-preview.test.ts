/**
 * Tests for hand preview display
 */

import { describe, expect, it } from 'vitest';
import {
	createHandPreview,
	isScoring,
	isValidHand,
	getPreviewScore,
	getPreviewRenderData,
	getPreviewStatusLine,
	createPreviewBox,
	getCardHighlight,
	getHighlightBrightness,
	PREVIEW_COLORS,
} from './hand-preview';
import { createCard } from '../data/card';

// Helper to create test cards
const card = (rank: string, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') =>
	createCard(suit, rank as any);

describe('createHandPreview', () => {
	it('returns empty state for no cards', () => {
		const preview = createHandPreview([]);

		expect(preview.state.type).toBe('empty');
		expect(preview.selectedCardIds).toHaveLength(0);
		expect(preview.scoringCardIds).toHaveLength(0);
	});

	it('returns too_many state for 6+ cards', () => {
		const cards = [
			card('A', 'spades'),
			card('K', 'hearts'),
			card('Q', 'diamonds'),
			card('J', 'clubs'),
			card('10', 'spades'),
			card('9', 'hearts'),
		];
		const preview = createHandPreview(cards);

		expect(preview.state.type).toBe('too_many');
		if (preview.state.type === 'too_many') {
			expect(preview.state.count).toBe(6);
		}
	});

	it('returns valid state for 1-5 cards', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
		];
		const preview = createHandPreview(cards);

		expect(preview.state.type).toBe('valid');
	});

	it('identifies scoring cards for a pair', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
			card('K', 'diamonds'),
		];
		const preview = createHandPreview(cards);

		expect(preview.state.type).toBe('valid');
		expect(preview.scoringCardIds).toHaveLength(2);

		// Both Aces should be scoring
		const aceSpades = cards.find(c => c.rank === 'A' && c.suit === 'spades')!;
		const aceHearts = cards.find(c => c.rank === 'A' && c.suit === 'hearts')!;
		expect(preview.scoringCardIds).toContain(aceSpades.id);
		expect(preview.scoringCardIds).toContain(aceHearts.id);
	});

	it('calculates correct score for flush', () => {
		const cards = [
			card('A', 'hearts'),
			card('K', 'hearts'),
			card('Q', 'hearts'),
			card('J', 'hearts'),
			card('9', 'hearts'),
		];
		const preview = createHandPreview(cards);

		expect(preview.state.type).toBe('valid');
		if (preview.state.type === 'valid') {
			expect(preview.state.result.type).toBe('FLUSH');
			expect(preview.state.score.total).toBeGreaterThan(0);
		}
	});
});

describe('isScoring', () => {
	it('returns true for scoring cards', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
			card('K', 'diamonds'),
		];
		const preview = createHandPreview(cards);

		const aceSpades = cards.find(c => c.rank === 'A' && c.suit === 'spades')!;
		expect(isScoring(preview, aceSpades.id)).toBe(true);
	});

	it('returns false for non-scoring cards', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
			card('K', 'diamonds'),
		];
		const preview = createHandPreview(cards);

		const king = cards.find(c => c.rank === 'K')!;
		expect(isScoring(preview, king.id)).toBe(false);
	});
});

describe('isValidHand', () => {
	it('returns true for valid selection', () => {
		const cards = [card('A', 'spades')];
		const preview = createHandPreview(cards);

		expect(isValidHand(preview)).toBe(true);
	});

	it('returns false for empty selection', () => {
		const preview = createHandPreview([]);
		expect(isValidHand(preview)).toBe(false);
	});

	it('returns false for too many cards', () => {
		const cards = Array.from({ length: 6 }, (_, i) =>
			card(String(i + 2) as any, 'hearts'),
		);
		const preview = createHandPreview(cards);

		expect(isValidHand(preview)).toBe(false);
	});
});

describe('getPreviewScore', () => {
	it('returns score for valid hand', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
		];
		const preview = createHandPreview(cards);

		expect(getPreviewScore(preview)).toBeGreaterThan(0);
	});

	it('returns 0 for invalid hand', () => {
		const preview = createHandPreview([]);
		expect(getPreviewScore(preview)).toBe(0);
	});
});

describe('getPreviewRenderData', () => {
	it('returns empty state data', () => {
		const preview = createHandPreview([]);
		const data = getPreviewRenderData(preview);

		expect(data.title).toBe('Select Cards');
		expect(data.isValid).toBe(false);
		expect(data.titleColor).toBe(PREVIEW_COLORS.empty);
	});

	it('returns too_many state data', () => {
		const cards = Array.from({ length: 6 }, (_, i) =>
			card(String(i + 2) as any, 'hearts'),
		);
		const preview = createHandPreview(cards);
		const data = getPreviewRenderData(preview);

		expect(data.title).toBe('Too Many Cards');
		expect(data.isValid).toBe(false);
		expect(data.titleColor).toBe(PREVIEW_COLORS.invalid);
	});

	it('returns valid hand data with breakdown', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
		];
		const preview = createHandPreview(cards);
		const data = getPreviewRenderData(preview);

		expect(data.title).toBe('Pair');
		expect(data.isValid).toBe(true);
		expect(data.titleColor).toBe(PREVIEW_COLORS.valid);
		expect(data.lines.length).toBeGreaterThan(0);
		expect(data.lines.some(l => l.includes('Chips'))).toBe(true);
		expect(data.lines.some(l => l.includes('Mult'))).toBe(true);
		expect(data.lines.some(l => l.includes('Total'))).toBe(true);
	});
});

describe('getPreviewStatusLine', () => {
	it('returns status for empty', () => {
		const preview = createHandPreview([]);
		expect(getPreviewStatusLine(preview)).toBe('Select cards...');
	});

	it('returns status for too many', () => {
		const cards = Array.from({ length: 6 }, (_, i) =>
			card(String(i + 2) as any, 'hearts'),
		);
		const preview = createHandPreview(cards);
		expect(getPreviewStatusLine(preview)).toContain('6 cards');
		expect(getPreviewStatusLine(preview)).toContain('max 5');
	});

	it('returns hand name and score for valid', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
		];
		const preview = createHandPreview(cards);
		const status = getPreviewStatusLine(preview);

		expect(status).toContain('Pair');
		expect(status).toContain('pts');
	});
});

describe('createPreviewBox', () => {
	it('creates box with borders', () => {
		const preview = createHandPreview([card('A', 'spades')]);
		const box = createPreviewBox(preview);

		expect(box.lines[0]?.startsWith('┌')).toBe(true);
		expect(box.lines[0]?.endsWith('┐')).toBe(true);
		expect(box.lines[box.lines.length - 1]?.startsWith('└')).toBe(true);
		expect(box.lines[box.lines.length - 1]?.endsWith('┘')).toBe(true);
	});

	it('includes title and content', () => {
		const cards = [card('A', 'spades'), card('A', 'hearts')];
		const preview = createHandPreview(cards);
		const box = createPreviewBox(preview);

		const content = box.lines.join('\n');
		expect(content).toContain('Pair');
		expect(content).toContain('Chips');
	});

	it('respects minimum width', () => {
		const preview = createHandPreview([]);
		const box = createPreviewBox(preview, 30);

		expect(box.width).toBeGreaterThanOrEqual(30);
	});
});

describe('getCardHighlight', () => {
	it('returns none for unselected cards', () => {
		const preview = createHandPreview([]);
		expect(getCardHighlight(preview, 'any-id', false)).toBe('none');
	});

	it('returns selected for selected cards with invalid hand', () => {
		const cards = Array.from({ length: 6 }, (_, i) =>
			card(String(i + 2) as any, 'hearts'),
		);
		const preview = createHandPreview(cards);

		expect(getCardHighlight(preview, cards[0]!.id, true)).toBe('selected');
	});

	it('returns scoring for scoring cards in valid hand', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
			card('K', 'diamonds'),
		];
		const preview = createHandPreview(cards);

		const aceSpades = cards.find(c => c.rank === 'A' && c.suit === 'spades')!;
		expect(getCardHighlight(preview, aceSpades.id, true)).toBe('scoring');
	});

	it('returns dimmed for non-scoring cards in valid hand', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
			card('K', 'diamonds'),
		];
		const preview = createHandPreview(cards);

		const king = cards.find(c => c.rank === 'K')!;
		expect(getCardHighlight(preview, king.id, true)).toBe('dimmed');
	});
});

describe('getHighlightBrightness', () => {
	it('returns 1.0 for none', () => {
		expect(getHighlightBrightness('none')).toBe(1.0);
	});

	it('returns 1.0 for selected', () => {
		expect(getHighlightBrightness('selected')).toBe(1.0);
	});

	it('returns higher value for scoring', () => {
		expect(getHighlightBrightness('scoring')).toBeGreaterThan(1.0);
	});

	it('returns lower value for dimmed', () => {
		expect(getHighlightBrightness('dimmed')).toBeLessThan(1.0);
	});
});
