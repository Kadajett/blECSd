/**
 * Tests for poker hand evaluation
 */

import { describe, expect, it } from 'vitest';
import { createCard } from './card';
import { evaluateHand, calculateScore, getHandName } from './hand';

// Helper to create cards quickly
const card = (rank: string, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') =>
	createCard(suit, rank as any);

describe('evaluateHand', () => {
	describe('high card', () => {
		it('returns high card for no matches', () => {
			const cards = [
				card('A', 'spades'),
				card('K', 'hearts'),
				card('Q', 'diamonds'),
				card('J', 'clubs'),
				card('9', 'spades'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('HIGH_CARD');
			expect(result.scoringCards).toHaveLength(1);
			expect(result.scoringCards[0]?.rank).toBe('A');
		});
	});

	describe('pair', () => {
		it('detects a pair', () => {
			const cards = [
				card('A', 'spades'),
				card('A', 'hearts'),
				card('K', 'diamonds'),
				card('Q', 'clubs'),
				card('J', 'spades'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('PAIR');
			expect(result.scoringCards).toHaveLength(2);
			expect(result.scoringCards.every(c => c.rank === 'A')).toBe(true);
		});
	});

	describe('two pair', () => {
		it('detects two pair', () => {
			const cards = [
				card('A', 'spades'),
				card('A', 'hearts'),
				card('K', 'diamonds'),
				card('K', 'clubs'),
				card('Q', 'spades'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('TWO_PAIR');
			expect(result.scoringCards).toHaveLength(4);
		});
	});

	describe('three of a kind', () => {
		it('detects three of a kind', () => {
			const cards = [
				card('A', 'spades'),
				card('A', 'hearts'),
				card('A', 'diamonds'),
				card('K', 'clubs'),
				card('Q', 'spades'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('THREE_OF_A_KIND');
			expect(result.scoringCards).toHaveLength(3);
		});
	});

	describe('straight', () => {
		it('detects a straight', () => {
			const cards = [
				card('A', 'spades'),
				card('K', 'hearts'),
				card('Q', 'diamonds'),
				card('J', 'clubs'),
				card('10', 'spades'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('STRAIGHT');
			expect(result.scoringCards).toHaveLength(5);
		});

		it('detects wheel straight (A-2-3-4-5)', () => {
			const cards = [
				card('A', 'spades'),
				card('2', 'hearts'),
				card('3', 'diamonds'),
				card('4', 'clubs'),
				card('5', 'spades'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('STRAIGHT');
			expect(result.scoringCards).toHaveLength(5);
		});
	});

	describe('flush', () => {
		it('detects a flush', () => {
			const cards = [
				card('A', 'hearts'),
				card('K', 'hearts'),
				card('Q', 'hearts'),
				card('J', 'hearts'),
				card('9', 'hearts'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('FLUSH');
			expect(result.scoringCards).toHaveLength(5);
		});
	});

	describe('full house', () => {
		it('detects a full house', () => {
			const cards = [
				card('A', 'spades'),
				card('A', 'hearts'),
				card('A', 'diamonds'),
				card('K', 'clubs'),
				card('K', 'spades'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('FULL_HOUSE');
			expect(result.scoringCards).toHaveLength(5);
		});
	});

	describe('four of a kind', () => {
		it('detects four of a kind', () => {
			const cards = [
				card('A', 'spades'),
				card('A', 'hearts'),
				card('A', 'diamonds'),
				card('A', 'clubs'),
				card('K', 'spades'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('FOUR_OF_A_KIND');
			expect(result.scoringCards).toHaveLength(4);
		});
	});

	describe('straight flush', () => {
		it('detects a straight flush', () => {
			const cards = [
				card('9', 'hearts'),
				card('8', 'hearts'),
				card('7', 'hearts'),
				card('6', 'hearts'),
				card('5', 'hearts'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('STRAIGHT_FLUSH');
			expect(result.scoringCards).toHaveLength(5);
		});
	});

	describe('royal flush', () => {
		it('detects a royal flush', () => {
			const cards = [
				card('A', 'hearts'),
				card('K', 'hearts'),
				card('Q', 'hearts'),
				card('J', 'hearts'),
				card('10', 'hearts'),
			];
			const result = evaluateHand(cards);
			expect(result.type).toBe('ROYAL_FLUSH');
			expect(result.scoringCards).toHaveLength(5);
		});
	});
});

describe('calculateScore', () => {
	it('calculates score for a pair', () => {
		const cards = [
			card('A', 'spades'),
			card('A', 'hearts'),
			card('K', 'diamonds'),
			card('Q', 'clubs'),
			card('J', 'spades'),
		];
		const result = evaluateHand(cards);
		const score = calculateScore(result);

		expect(score.handType).toBe('PAIR');
		expect(score.baseChips).toBe(10); // Pair base
		expect(score.cardChips).toBe(22); // A (11) + A (11)
		expect(score.mult).toBe(2); // Pair mult
		expect(score.total).toBe(64); // (10 + 22) × 2
	});

	it('calculates score for four of a kind', () => {
		const cards = [
			card('K', 'spades'),
			card('K', 'hearts'),
			card('K', 'diamonds'),
			card('K', 'clubs'),
			card('Q', 'spades'),
		];
		const result = evaluateHand(cards);
		const score = calculateScore(result);

		expect(score.handType).toBe('FOUR_OF_A_KIND');
		expect(score.baseChips).toBe(60);
		expect(score.cardChips).toBe(40); // K (10) × 4
		expect(score.mult).toBe(7);
		expect(score.total).toBe(700); // (60 + 40) × 7
	});
});

describe('getHandName', () => {
	it('returns correct names', () => {
		expect(getHandName('HIGH_CARD')).toBe('High Card');
		expect(getHandName('PAIR')).toBe('Pair');
		expect(getHandName('ROYAL_FLUSH')).toBe('Royal Flush');
	});
});
