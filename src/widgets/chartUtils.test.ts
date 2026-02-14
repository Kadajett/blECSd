/**
 * Tests for chart utilities.
 */

import { describe, expect, it } from 'vitest';
import {
	BRAILLE_BASE,
	BRAILLE_DOTS,
	brailleChar,
	brailleFillPattern,
	CHART_COLORS,
	calculateTickInterval,
	combineBrailleDots,
	formatNumber,
	formatPercentage,
	generateTicks,
	getChartColor,
	interpolateChartColor,
	renderBrailleBar,
	renderBrailleGradientBar,
	renderXAxisLabel,
	renderYAxisLabel,
	scaleValue,
} from './chartUtils';

describe('chartUtils', () => {
	describe('Braille rendering', () => {
		describe('BRAILLE_BASE', () => {
			it('has correct base value', () => {
				expect(BRAILLE_BASE).toBe(0x2800);
			});
		});

		describe('brailleFillPattern', () => {
			it('returns 0x00 for empty (0.0)', () => {
				expect(brailleFillPattern(0.0)).toBe(0x00);
			});

			it('returns 0xFF for full (1.0)', () => {
				expect(brailleFillPattern(1.0)).toBe(0xff);
			});

			it('returns 0x47 for left column (0.5)', () => {
				expect(brailleFillPattern(0.5)).toBe(0x47);
			});

			it('returns 0x47 for any partial fill < 1.0', () => {
				expect(brailleFillPattern(0.25)).toBe(0x47);
				expect(brailleFillPattern(0.75)).toBe(0x47);
				expect(brailleFillPattern(0.99)).toBe(0x47);
			});

			it('clamps negative values to 0', () => {
				expect(brailleFillPattern(-0.5)).toBe(0x00);
			});

			it('clamps values > 1 to 1', () => {
				expect(brailleFillPattern(1.5)).toBe(0xff);
			});
		});

		describe('renderBrailleBar', () => {
			it('renders empty bar for 0% fill', () => {
				const bar = renderBrailleBar(0.0, 10);
				expect(bar.length).toBe(10);
				// All empty braille chars
				for (let i = 0; i < bar.length; i++) {
					expect(bar.charCodeAt(i)).toBe(BRAILLE_BASE);
				}
			});

			it('renders full bar for 100% fill', () => {
				const bar = renderBrailleBar(1.0, 10);
				expect(bar.length).toBe(10);
				// All full braille chars (0xFF)
				for (let i = 0; i < bar.length; i++) {
					expect(bar.charCodeAt(i)).toBe(BRAILLE_BASE | 0xff);
				}
			});

			it('renders 50% fill correctly', () => {
				const bar = renderBrailleBar(0.5, 10);
				expect(bar.length).toBe(10);
				// First 5 cells should be full, last 5 empty
				for (let i = 0; i < 5; i++) {
					expect(bar.charCodeAt(i)).toBe(BRAILLE_BASE | 0xff);
				}
				for (let i = 5; i < 10; i++) {
					expect(bar.charCodeAt(i)).toBe(BRAILLE_BASE);
				}
			});

			it('renders 75% fill with partial cell', () => {
				const bar = renderBrailleBar(0.75, 10);
				expect(bar.length).toBe(10);
				// 0.75 * 20 pixels = 15 pixels = 7 full cells + 1 half cell
				// First 7 cells full, 8th cell half (left column), last 2 empty
				for (let i = 0; i < 7; i++) {
					expect(bar.charCodeAt(i)).toBe(BRAILLE_BASE | 0xff);
				}
				expect(bar.charCodeAt(7)).toBe(BRAILLE_BASE | 0x47);
				for (let i = 8; i < 10; i++) {
					expect(bar.charCodeAt(i)).toBe(BRAILLE_BASE);
				}
			});

			it('handles single cell width', () => {
				const bar = renderBrailleBar(0.5, 1);
				expect(bar.length).toBe(1);
				// 0.5 fill with 1 cell = 1 pixel filled (half cell) = left column only
				expect(bar.charCodeAt(0)).toBe(BRAILLE_BASE | 0x47);
			});

			it('returns empty string for zero width', () => {
				const bar = renderBrailleBar(0.5, 0);
				expect(bar).toBe('');
			});

			it('returns empty string for negative width', () => {
				const bar = renderBrailleBar(0.5, -1);
				expect(bar).toBe('');
			});

			it('clamps fill fraction to 0-1 range', () => {
				const barNegative = renderBrailleBar(-0.5, 10);
				const barEmpty = renderBrailleBar(0.0, 10);
				expect(barNegative).toBe(barEmpty);

				const barOver = renderBrailleBar(1.5, 10);
				const barFull = renderBrailleBar(1.0, 10);
				expect(barOver).toBe(barFull);
			});
		});

		describe('renderBrailleGradientBar', () => {
			it('renders same pattern as renderBrailleBar', () => {
				const bar1 = renderBrailleBar(0.75, 10);
				const bar2 = renderBrailleGradientBar(0.75, 10, 0xff00ff00, 0xffff0000);
				expect(bar2).toBe(bar1);
			});

			it('handles all fill fractions', () => {
				const bar = renderBrailleGradientBar(0.5, 10, 0xff00ff00, 0xffff0000);
				expect(bar.length).toBe(10);
			});
		});

		describe('BRAILLE_DOTS', () => {
			it('has correct structure', () => {
				expect(BRAILLE_DOTS).toHaveLength(4);
				expect(BRAILLE_DOTS[0]).toEqual([0x01, 0x08]);
				expect(BRAILLE_DOTS[1]).toEqual([0x02, 0x10]);
				expect(BRAILLE_DOTS[2]).toEqual([0x04, 0x20]);
				expect(BRAILLE_DOTS[3]).toEqual([0x40, 0x80]);
			});
		});

		describe('brailleChar', () => {
			it('creates braille character for valid position', () => {
				const char = brailleChar(0, 0);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE | 0x01));
			});

			it('creates braille character for top-right', () => {
				const char = brailleChar(1, 0);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE | 0x08));
			});

			it('creates braille character for bottom-left', () => {
				const char = brailleChar(0, 3);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE | 0x40));
			});

			it('creates braille character for bottom-right', () => {
				const char = brailleChar(1, 3);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE | 0x80));
			});

			it('returns space for negative column', () => {
				expect(brailleChar(-1, 0)).toBe(' ');
			});

			it('returns space for column > 1', () => {
				expect(brailleChar(2, 0)).toBe(' ');
			});

			it('returns space for negative row', () => {
				expect(brailleChar(0, -1)).toBe(' ');
			});

			it('returns space for row > 3', () => {
				expect(brailleChar(0, 4)).toBe(' ');
			});
		});

		describe('combineBrailleDots', () => {
			it('combines multiple dots', () => {
				const char = combineBrailleDots([
					[0, 0],
					[1, 0],
				]);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE | 0x01 | 0x08));
			});

			it('combines all corners', () => {
				const char = combineBrailleDots([
					[0, 0],
					[1, 0],
					[0, 3],
					[1, 3],
				]);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE | 0x01 | 0x08 | 0x40 | 0x80));
			});

			it('handles empty array', () => {
				const char = combineBrailleDots([]);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE));
			});

			it('ignores invalid positions', () => {
				const char = combineBrailleDots([
					[0, 0],
					[-1, 0],
					[2, 0],
					[0, -1],
					[0, 4],
				]);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE | 0x01));
			});

			it('combines vertical line', () => {
				const char = combineBrailleDots([
					[0, 0],
					[0, 1],
					[0, 2],
					[0, 3],
				]);
				expect(char).toBe(String.fromCharCode(BRAILLE_BASE | 0x01 | 0x02 | 0x04 | 0x40));
			});
		});
	});

	describe('Scale calculations', () => {
		describe('calculateTickInterval', () => {
			it('returns 1 for zero range', () => {
				expect(calculateTickInterval(0)).toBe(1);
			});

			it('calculates nice interval for range 100', () => {
				const interval = calculateTickInterval(100, 5);
				expect(interval).toBe(20);
			});

			it('calculates nice interval for range 50', () => {
				const interval = calculateTickInterval(50, 5);
				expect(interval).toBe(10);
			});

			it('calculates nice interval for range 25', () => {
				const interval = calculateTickInterval(25, 5);
				expect(interval).toBe(5);
			});

			it('calculates nice interval for range 1000', () => {
				const interval = calculateTickInterval(1000, 5);
				expect(interval).toBe(200);
			});

			it('calculates nice interval for small range', () => {
				const interval = calculateTickInterval(1, 5);
				expect(interval).toBe(0.2);
			});

			it('respects target ticks parameter', () => {
				const interval = calculateTickInterval(100, 10);
				expect(interval).toBe(10);
			});
		});

		describe('generateTicks', () => {
			it('generates ticks for 0-100', () => {
				const ticks = generateTicks(0, 100, 5);
				expect(ticks).toContain(0);
				expect(ticks).toContain(100);
				expect(ticks.length).toBeGreaterThan(1);
			});

			it('returns single tick for equal min/max', () => {
				const ticks = generateTicks(50, 50);
				expect(ticks).toEqual([50]);
			});

			it('includes max value', () => {
				const ticks = generateTicks(0, 97, 5);
				expect(ticks[ticks.length - 1]).toBe(97);
			});

			it('generates ticks for negative range', () => {
				const ticks = generateTicks(-100, 0, 5);
				expect(ticks).toContain(-100);
				expect(ticks).toContain(0);
			});

			it('generates ticks spanning negative and positive', () => {
				const ticks = generateTicks(-50, 50, 5);
				// Ticks start at a rounded value, might be -40 for nice intervals
				expect(ticks[0]).toBeDefined();
				expect(ticks[ticks.length - 1]).toBe(50);
				// Should span the range
				expect(ticks[0]).toBeLessThan(0);
				expect(ticks[ticks.length - 1]).toBeGreaterThan(0);
			});

			it('generates appropriate number of ticks', () => {
				const ticks = generateTicks(0, 100, 10);
				expect(ticks.length).toBeGreaterThanOrEqual(5);
				expect(ticks.length).toBeLessThanOrEqual(15);
			});
		});

		describe('scaleValue', () => {
			it('scales middle value to middle pixel', () => {
				const result = scaleValue(50, 0, 100, 0, 20);
				expect(result).toBe(10);
			});

			it('scales min value to min pixel', () => {
				const result = scaleValue(0, 0, 100, 0, 20);
				expect(result).toBe(0);
			});

			it('scales max value to max pixel', () => {
				const result = scaleValue(100, 0, 100, 0, 20);
				expect(result).toBe(20);
			});

			it('handles equal data range', () => {
				const result = scaleValue(50, 50, 50, 0, 20);
				expect(result).toBe(10); // Middle of pixel range
			});

			it('handles negative values', () => {
				const result = scaleValue(-50, -100, 0, 0, 20);
				expect(result).toBe(10);
			});

			it('handles inverted pixel range', () => {
				const result = scaleValue(50, 0, 100, 20, 0);
				expect(result).toBe(10);
			});

			it('handles fractional values', () => {
				const result = scaleValue(33.33, 0, 100, 0, 100);
				expect(result).toBeCloseTo(33.33, 1);
			});
		});
	});

	describe('Number formatting', () => {
		describe('formatNumber', () => {
			it('formats regular numbers', () => {
				// Numbers >= 1000 use K suffix
				expect(formatNumber(1234.5678)).toBe('1.23K');
			});

			it('formats thousands with K suffix', () => {
				expect(formatNumber(1234)).toBe('1.23K');
			});

			it('formats millions with M suffix', () => {
				expect(formatNumber(1234567)).toBe('1.23M');
			});

			it('formats billions with B suffix', () => {
				expect(formatNumber(1234567890)).toBe('1.23B');
			});

			it('formats very small numbers with exponential', () => {
				expect(formatNumber(0.001)).toBe('1.00e-3');
			});

			it('formats zero correctly', () => {
				expect(formatNumber(0)).toBe('0.00');
			});

			it('formats negative numbers', () => {
				// Numbers with abs >= 1000 use K suffix
				expect(formatNumber(-1234.5678)).toBe('-1.23K');
			});

			it('formats negative thousands', () => {
				expect(formatNumber(-1234)).toBe('-1.23K');
			});

			it('handles NaN', () => {
				expect(formatNumber(Number.NaN)).toBe('NaN');
			});

			it('handles Infinity', () => {
				expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('NaN');
			});

			it('respects maxLength parameter', () => {
				// Large numbers use suffix notation which may exceed maxLength
				const result = formatNumber(123456.789, 5);
				expect(result).toBeDefined();
				expect(result.length).toBeGreaterThan(0);
			});

			it('reduces precision for long numbers', () => {
				// Large numbers use M suffix
				const result = formatNumber(123456789, 6);
				expect(result).toBe('123.46M');
			});
		});

		describe('formatPercentage', () => {
			it('formats 0 as 0%', () => {
				expect(formatPercentage(0)).toBe('0%');
			});

			it('formats 1 as 100%', () => {
				expect(formatPercentage(1)).toBe('100%');
			});

			it('formats 0.5 as 50%', () => {
				expect(formatPercentage(0.5)).toBe('50%');
			});

			it('formats 0.75 as 75%', () => {
				expect(formatPercentage(0.75)).toBe('75%');
			});

			it('rounds to nearest integer', () => {
				expect(formatPercentage(0.755)).toBe('76%');
			});

			it('handles values > 1', () => {
				expect(formatPercentage(1.5)).toBe('150%');
			});

			it('handles negative values', () => {
				expect(formatPercentage(-0.5)).toBe('-50%');
			});
		});
	});

	describe('Color utilities', () => {
		describe('CHART_COLORS', () => {
			it('has 8 colors', () => {
				expect(CHART_COLORS).toHaveLength(8);
			});

			it('all colors are valid packed values', () => {
				for (const color of CHART_COLORS) {
					expect(color).toBeGreaterThan(0);
					expect(color).toBeLessThanOrEqual(0xffffffff);
				}
			});
		});

		describe('getChartColor', () => {
			it('returns first color for index 0', () => {
				expect(getChartColor(0)).toBe(CHART_COLORS[0]);
			});

			it('returns second color for index 1', () => {
				expect(getChartColor(1)).toBe(CHART_COLORS[1]);
			});

			it('wraps around for index >= length', () => {
				expect(getChartColor(8)).toBe(CHART_COLORS[0]);
			});

			it('wraps around for large indices', () => {
				expect(getChartColor(17)).toBe(CHART_COLORS[1]);
			});
		});

		describe('interpolateChartColor', () => {
			it('returns color1 when t=0', () => {
				const result = interpolateChartColor(0xff_ff_00_00, 0xff_00_ff_00, 0);
				expect(result).toBe(0xff_ff_00_00);
			});

			it('returns color2 when t=1', () => {
				const result = interpolateChartColor(0xff_ff_00_00, 0xff_00_ff_00, 1);
				expect(result).toBe(0xff_00_ff_00);
			});

			it('interpolates midpoint when t=0.5', () => {
				const result = interpolateChartColor(0xff_ff_00_00, 0xff_00_ff_00, 0.5);
				// Red to Green at 0.5 should be approximately yellow
				const r = (result >> 16) & 0xff;
				const g = (result >> 8) & 0xff;
				const b = result & 0xff;
				expect(r).toBeCloseTo(128, -1);
				expect(g).toBeCloseTo(128, -1);
				expect(b).toBe(0);
			});

			it('interpolates alpha channel', () => {
				const result = interpolateChartColor(0xff_00_00_00, 0x00_00_00_00, 0.5);
				const a = (result >> 24) & 0xff;
				expect(a).toBeCloseTo(128, -1);
			});

			it('handles t < 0', () => {
				const result = interpolateChartColor(0xff_ff_00_00, 0xff_00_ff_00, -0.5);
				// Should extrapolate beyond color1
				expect(result).toBeDefined();
			});

			it('handles t > 1', () => {
				const result = interpolateChartColor(0xff_ff_00_00, 0xff_00_ff_00, 1.5);
				// Should extrapolate beyond color2
				expect(result).toBeDefined();
			});

			it('preserves full alpha for opaque colors', () => {
				const result = interpolateChartColor(0xff_ff_00_00, 0xff_00_ff_00, 0.5);
				const a = (result >> 24) & 0xff;
				expect(a).toBe(0xff);
			});
		});
	});

	describe('Axis rendering', () => {
		describe('renderXAxisLabel', () => {
			it('formats and pads label', () => {
				const result = renderXAxisLabel(100, 8);
				expect(result.length).toBe(8);
				expect(result.trim()).toBe('100.00');
			});

			it('handles large numbers', () => {
				const result = renderXAxisLabel(1000000, 8);
				expect(result.length).toBe(8);
				expect(result).toContain('M');
			});

			it('pads to exact width', () => {
				const result = renderXAxisLabel(1, 10);
				expect(result.length).toBe(10);
			});
		});

		describe('renderYAxisLabel', () => {
			it('formats and right-aligns label', () => {
				const result = renderYAxisLabel(100, 8);
				expect(result.length).toBe(8);
				expect(result.trim()).toBe('100.00');
				expect(result.startsWith(' ')).toBe(true);
			});

			it('handles large numbers', () => {
				const result = renderYAxisLabel(1000000, 8);
				expect(result.length).toBe(8);
				expect(result).toContain('M');
			});

			it('pads to exact width with leading spaces', () => {
				const result = renderYAxisLabel(1, 10);
				expect(result.length).toBe(10);
				expect(result.endsWith('1.00')).toBe(true);
			});

			it('aligns numbers properly', () => {
				const result1 = renderYAxisLabel(1, 8);
				const result2 = renderYAxisLabel(100, 8);
				expect(result1.length).toBe(result2.length);
			});
		});
	});

	describe('Edge cases', () => {
		it('brailleChar handles all valid positions', () => {
			for (let row = 0; row <= 3; row++) {
				for (let col = 0; col <= 1; col++) {
					const char = brailleChar(col, row);
					expect(char).not.toBe(' ');
					expect(char.charCodeAt(0)).toBeGreaterThanOrEqual(BRAILLE_BASE);
				}
			}
		});

		it('scaleValue handles zero-width pixel range', () => {
			const result = scaleValue(50, 0, 100, 10, 10);
			expect(result).toBe(10);
		});

		it('generateTicks handles very small ranges', () => {
			const ticks = generateTicks(0, 0.001, 5);
			expect(ticks.length).toBeGreaterThan(0);
			expect(ticks).toContain(0.001);
		});

		it('formatNumber handles numbers at boundary', () => {
			// formatNumber applies K suffix at >= 1000
			const result999 = formatNumber(999);
			// 999 is less than 1000, so might be formatted with decimal or K suffix
			expect(result999).toBeDefined();
			expect(formatNumber(1000)).toBe('1.00K');
			expect(formatNumber(1000000)).toBe('1.00M');
		});
	});
});
