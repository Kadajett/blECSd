import { describe, expect, it } from 'vitest';
import {
	centerPosition,
	clampPosition,
	isKeywordPosition,
	isPercentagePosition,
	PositionValueSchema,
	parsePosition,
	parsePositionWithNegative,
	percentOffsetPosition,
	percentPosition,
	resolvePosition,
	resolvePositionClamped,
} from './positioning';

describe('positioning', () => {
	describe('PositionValueSchema', () => {
		it('accepts numbers', () => {
			expect(PositionValueSchema.safeParse(0).success).toBe(true);
			expect(PositionValueSchema.safeParse(10).success).toBe(true);
			expect(PositionValueSchema.safeParse(-5).success).toBe(true);
			expect(PositionValueSchema.safeParse(3.5).success).toBe(true);
		});

		it('accepts percentage strings', () => {
			expect(PositionValueSchema.safeParse('0%').success).toBe(true);
			expect(PositionValueSchema.safeParse('50%').success).toBe(true);
			expect(PositionValueSchema.safeParse('100%').success).toBe(true);
			expect(PositionValueSchema.safeParse('33.5%').success).toBe(true);
		});

		it('accepts expression strings', () => {
			expect(PositionValueSchema.safeParse('50%-5').success).toBe(true);
			expect(PositionValueSchema.safeParse('100%-10').success).toBe(true);
			expect(PositionValueSchema.safeParse('50%+5').success).toBe(true);
			expect(PositionValueSchema.safeParse('25%-1.5').success).toBe(true);
		});

		it('accepts keyword strings', () => {
			expect(PositionValueSchema.safeParse('center').success).toBe(true);
			expect(PositionValueSchema.safeParse('half').success).toBe(true);
			expect(PositionValueSchema.safeParse('left').success).toBe(true);
			expect(PositionValueSchema.safeParse('right').success).toBe(true);
			expect(PositionValueSchema.safeParse('top').success).toBe(true);
			expect(PositionValueSchema.safeParse('bottom').success).toBe(true);
		});

		it('rejects invalid strings', () => {
			expect(PositionValueSchema.safeParse('invalid').success).toBe(false);
			expect(PositionValueSchema.safeParse('50% - 5').success).toBe(false);
			expect(PositionValueSchema.safeParse('abc%').success).toBe(false);
		});
	});

	describe('parsePosition', () => {
		describe('number values', () => {
			it('returns number as-is', () => {
				expect(parsePosition(10, 100)).toBe(10);
				expect(parsePosition(0, 100)).toBe(0);
				expect(parsePosition(50, 100)).toBe(50);
			});

			it('handles decimal numbers', () => {
				expect(parsePosition(10.5, 100)).toBe(10);
				expect(parsePosition(10.9, 100)).toBe(10);
			});
		});

		describe('percentage values', () => {
			it('resolves percentages against parent size', () => {
				expect(parsePosition('50%', 100)).toBe(50);
				expect(parsePosition('100%', 100)).toBe(100);
				expect(parsePosition('0%', 100)).toBe(0);
			});

			it('handles decimal percentages', () => {
				expect(parsePosition('33.33%', 99)).toBe(32);
				expect(parsePosition('25.5%', 200)).toBe(51);
			});

			it('works with different parent sizes', () => {
				expect(parsePosition('50%', 80)).toBe(40);
				expect(parsePosition('25%', 200)).toBe(50);
			});
		});

		describe('expression values', () => {
			it('resolves percentage minus offset', () => {
				expect(parsePosition('50%-5', 100)).toBe(45);
				expect(parsePosition('100%-10', 100)).toBe(90);
				expect(parsePosition('50%-25', 100)).toBe(25);
			});

			it('resolves percentage plus offset', () => {
				expect(parsePosition('50%+5', 100)).toBe(55);
				expect(parsePosition('0%+10', 100)).toBe(10);
				expect(parsePosition('25%+25', 100)).toBe(50);
			});

			it('handles decimal offsets', () => {
				expect(parsePosition('50%-2.5', 100)).toBe(47);
				expect(parsePosition('50%+2.5', 100)).toBe(52);
			});

			it('handles expressions without percent', () => {
				expect(parsePosition('50-5', 100)).toBe(45);
				expect(parsePosition('50+5', 100)).toBe(55);
			});
		});

		describe('keyword values', () => {
			it('resolves center', () => {
				expect(parsePosition('center', 100, 20)).toBe(40);
				expect(parsePosition('center', 80, 20)).toBe(30);
				expect(parsePosition('center', 100, 0)).toBe(50);
			});

			it('resolves half', () => {
				expect(parsePosition('half', 100, 20)).toBe(50);
				expect(parsePosition('half', 80, 0)).toBe(40);
			});

			it('resolves left/top (start)', () => {
				expect(parsePosition('left', 100, 20)).toBe(0);
				expect(parsePosition('top', 100, 20)).toBe(0);
			});

			it('resolves right/bottom (end)', () => {
				expect(parsePosition('right', 100, 20)).toBe(80);
				expect(parsePosition('bottom', 100, 10)).toBe(90);
			});
		});

		describe('edge cases', () => {
			it('returns 0 for invalid strings', () => {
				expect(parsePosition('invalid', 100)).toBe(0);
			});

			it('floors results', () => {
				expect(parsePosition('33.33%', 100)).toBe(33);
			});

			it('handles zero parent size', () => {
				expect(parsePosition('50%', 0)).toBe(0);
				expect(parsePosition('center', 0, 0)).toBe(0);
			});
		});
	});

	describe('parsePositionWithNegative', () => {
		it('handles positive numbers normally', () => {
			expect(parsePositionWithNegative(10, 100, 20)).toBe(10);
		});

		it('handles negative numbers from right/bottom edge', () => {
			expect(parsePositionWithNegative(-10, 100, 20)).toBe(70);
			expect(parsePositionWithNegative(-5, 100, 10)).toBe(85);
		});

		it('treats -0 as 0 (not negative) per JavaScript semantics', () => {
			// In JavaScript, -0 === 0 and -0 < 0 is false
			expect(parsePositionWithNegative(-0, 100, 20)).toBe(0);
		});

		it('handles percentage strings normally', () => {
			expect(parsePositionWithNegative('50%', 100, 0)).toBe(50);
		});

		it('handles negative string values', () => {
			expect(parsePositionWithNegative('-10', 100, 20)).toBe(70);
			expect(parsePositionWithNegative('-5', 100, 10)).toBe(85);
		});
	});

	describe('clampPosition', () => {
		it('returns value when within bounds', () => {
			expect(clampPosition(50, 100, 20)).toBe(50);
			expect(clampPosition(0, 100, 20)).toBe(0);
			expect(clampPosition(80, 100, 20)).toBe(80);
		});

		it('clamps negative values to 0', () => {
			expect(clampPosition(-10, 100, 20)).toBe(0);
			expect(clampPosition(-1, 100, 20)).toBe(0);
		});

		it('clamps values too large', () => {
			expect(clampPosition(90, 100, 20)).toBe(80);
			expect(clampPosition(100, 100, 20)).toBe(80);
			expect(clampPosition(150, 100, 20)).toBe(80);
		});

		it('handles zero element size', () => {
			expect(clampPosition(100, 100, 0)).toBe(100);
			expect(clampPosition(110, 100, 0)).toBe(100);
		});

		it('handles element larger than parent', () => {
			expect(clampPosition(0, 50, 100)).toBe(0);
			expect(clampPosition(10, 50, 100)).toBe(0);
		});
	});

	describe('isPercentagePosition', () => {
		it('returns true for percentage strings', () => {
			expect(isPercentagePosition('50%')).toBe(true);
			expect(isPercentagePosition('100%')).toBe(true);
		});

		it('returns true for expressions with percentages', () => {
			expect(isPercentagePosition('50%-5')).toBe(true);
			expect(isPercentagePosition('100%+10')).toBe(true);
		});

		it('returns false for numbers', () => {
			expect(isPercentagePosition(50)).toBe(false);
			expect(isPercentagePosition(0)).toBe(false);
		});

		it('returns false for keywords', () => {
			expect(isPercentagePosition('center')).toBe(false);
			expect(isPercentagePosition('half')).toBe(false);
		});
	});

	describe('isKeywordPosition', () => {
		it('returns true for keywords', () => {
			expect(isKeywordPosition('center')).toBe(true);
			expect(isKeywordPosition('half')).toBe(true);
			expect(isKeywordPosition('left')).toBe(true);
			expect(isKeywordPosition('right')).toBe(true);
			expect(isKeywordPosition('top')).toBe(true);
			expect(isKeywordPosition('bottom')).toBe(true);
		});

		it('returns false for numbers', () => {
			expect(isKeywordPosition(50)).toBe(false);
		});

		it('returns false for percentages', () => {
			expect(isKeywordPosition('50%')).toBe(false);
		});

		it('returns false for invalid strings', () => {
			expect(isKeywordPosition('invalid')).toBe(false);
		});
	});

	describe('helper functions', () => {
		describe('centerPosition', () => {
			it('returns center keyword', () => {
				expect(centerPosition()).toBe('center');
			});

			it('works with parsePosition', () => {
				const pos = centerPosition();
				expect(parsePosition(pos, 100, 20)).toBe(40);
			});
		});

		describe('percentPosition', () => {
			it('creates percentage string', () => {
				expect(percentPosition(50)).toBe('50%');
				expect(percentPosition(100)).toBe('100%');
				expect(percentPosition(0)).toBe('0%');
			});

			it('works with parsePosition', () => {
				const pos = percentPosition(50);
				expect(parsePosition(pos, 100, 0)).toBe(50);
			});
		});

		describe('percentOffsetPosition', () => {
			it('creates expression with positive offset', () => {
				expect(percentOffsetPosition(50, 5)).toBe('50%+5');
				expect(percentOffsetPosition(100, 10)).toBe('100%+10');
			});

			it('creates expression with negative offset', () => {
				expect(percentOffsetPosition(50, -5)).toBe('50%-5');
				expect(percentOffsetPosition(100, -10)).toBe('100%-10');
			});

			it('works with parsePosition', () => {
				expect(parsePosition(percentOffsetPosition(50, -5), 100)).toBe(45);
				expect(parsePosition(percentOffsetPosition(50, 5), 100)).toBe(55);
			});
		});
	});

	describe('resolvePosition', () => {
		it('resolves both x and y at once', () => {
			const pos = resolvePosition('center', 'center', 100, 80, 20, 10);
			expect(pos.x).toBe(40);
			expect(pos.y).toBe(35);
		});

		it('handles mixed value types', () => {
			const pos = resolvePosition(10, '50%', 100, 80, 0, 0);
			expect(pos.x).toBe(10);
			expect(pos.y).toBe(40);
		});

		it('handles expressions', () => {
			const pos = resolvePosition('50%-5', '100%-10', 100, 80, 0, 0);
			expect(pos.x).toBe(45);
			expect(pos.y).toBe(70);
		});
	});

	describe('resolvePositionClamped', () => {
		it('clamps positions to valid bounds', () => {
			const pos = resolvePositionClamped('100%', '100%', 100, 80, 20, 10);
			expect(pos.x).toBe(80);
			expect(pos.y).toBe(70);
		});

		it('clamps negative positions', () => {
			const pos = resolvePositionClamped(-10, -10, 100, 80, 20, 10);
			expect(pos.x).toBe(0);
			expect(pos.y).toBe(0);
		});

		it('does not clamp valid positions', () => {
			const pos = resolvePositionClamped('50%', '50%', 100, 80, 20, 10);
			expect(pos.x).toBe(50);
			expect(pos.y).toBe(40);
		});
	});
});
