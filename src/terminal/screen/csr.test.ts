/**
 * Tests for CSR (Change Scroll Region) Optimization
 */

import { describe, expect, it } from 'vitest';
import {
	canUseCSR,
	computeLineHashes,
	createCSRContext,
	deleteLine,
	detectScrollOperation,
	getDeleteLineSequence,
	getInsertLineSequence,
	getScrollSequence,
	hasCleanSides,
	hashLine,
	insertLine,
	moveCursor,
	resetScrollRegion,
	resizeCSRContext,
	scrollDown,
	scrollUp,
	scrollWithCSR,
	setScrollRegion,
} from './csr';

describe('CSR Context', () => {
	describe('createCSRContext', () => {
		it('creates context with default capabilities', () => {
			const ctx = createCSRContext({ width: 80, height: 24 });

			expect(ctx.width).toBe(80);
			expect(ctx.height).toBe(24);
			expect(ctx.supportsCSR).toBe(true);
			expect(ctx.supportsInsertDelete).toBe(true);
			expect(ctx.destroysOutsideContent).toBe(false);
		});

		it('creates context with custom capabilities', () => {
			const ctx = createCSRContext({
				width: 120,
				height: 40,
				supportsCSR: false,
				supportsInsertDelete: false,
				destroysOutsideContent: true,
			});

			expect(ctx.width).toBe(120);
			expect(ctx.height).toBe(40);
			expect(ctx.supportsCSR).toBe(false);
			expect(ctx.supportsInsertDelete).toBe(false);
			expect(ctx.destroysOutsideContent).toBe(true);
		});
	});

	describe('resizeCSRContext', () => {
		it('updates dimensions while preserving capabilities', () => {
			const original = createCSRContext({
				width: 80,
				height: 24,
				supportsCSR: true,
			});

			const resized = resizeCSRContext(original, 120, 40);

			expect(resized.width).toBe(120);
			expect(resized.height).toBe(40);
			expect(resized.supportsCSR).toBe(true);
		});
	});
});

describe('Escape Sequence Generation', () => {
	describe('setScrollRegion', () => {
		it('generates scroll region sequence', () => {
			expect(setScrollRegion(1, 24)).toBe('\x1b[1;24r');
			expect(setScrollRegion(5, 15)).toBe('\x1b[5;15r');
		});
	});

	describe('resetScrollRegion', () => {
		it('generates reset sequence', () => {
			expect(resetScrollRegion()).toBe('\x1b[r');
		});
	});

	describe('scrollUp', () => {
		it('generates scroll up sequence', () => {
			expect(scrollUp()).toBe('\x1b[S');
			expect(scrollUp(1)).toBe('\x1b[S');
			expect(scrollUp(3)).toBe('\x1b[3S');
			expect(scrollUp(10)).toBe('\x1b[10S');
		});

		it('returns empty for non-positive lines', () => {
			expect(scrollUp(0)).toBe('');
			expect(scrollUp(-1)).toBe('');
		});
	});

	describe('scrollDown', () => {
		it('generates scroll down sequence', () => {
			expect(scrollDown()).toBe('\x1b[T');
			expect(scrollDown(1)).toBe('\x1b[T');
			expect(scrollDown(3)).toBe('\x1b[3T');
			expect(scrollDown(10)).toBe('\x1b[10T');
		});

		it('returns empty for non-positive lines', () => {
			expect(scrollDown(0)).toBe('');
			expect(scrollDown(-1)).toBe('');
		});
	});

	describe('insertLine', () => {
		it('generates insert line sequence', () => {
			expect(insertLine()).toBe('\x1b[L');
			expect(insertLine(1)).toBe('\x1b[L');
			expect(insertLine(5)).toBe('\x1b[5L');
		});

		it('returns empty for non-positive count', () => {
			expect(insertLine(0)).toBe('');
			expect(insertLine(-1)).toBe('');
		});
	});

	describe('deleteLine', () => {
		it('generates delete line sequence', () => {
			expect(deleteLine()).toBe('\x1b[M');
			expect(deleteLine(1)).toBe('\x1b[M');
			expect(deleteLine(5)).toBe('\x1b[5M');
		});

		it('returns empty for non-positive count', () => {
			expect(deleteLine(0)).toBe('');
			expect(deleteLine(-1)).toBe('');
		});
	});

	describe('moveCursor', () => {
		it('generates cursor position sequence', () => {
			expect(moveCursor(1, 1)).toBe('\x1b[1;1H');
			expect(moveCursor(10, 20)).toBe('\x1b[10;20H');
		});
	});
});

describe('CSR Detection', () => {
	describe('canUseCSR', () => {
		it('returns true when CSR is beneficial', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });

			// Scrolling 3 lines in a 20-line region
			expect(canUseCSR(ctx, 0, 20, 3, 'up')).toBe(true);
		});

		it('returns false when terminal does not support CSR', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: false });

			expect(canUseCSR(ctx, 0, 20, 3, 'up')).toBe(false);
		});

		it('returns false for invalid bounds', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });

			// Negative top
			expect(canUseCSR(ctx, -1, 20, 3, 'up')).toBe(false);

			// Bottom exceeds height
			expect(canUseCSR(ctx, 0, 30, 3, 'up')).toBe(false);

			// Top >= bottom
			expect(canUseCSR(ctx, 10, 10, 3, 'up')).toBe(false);
			expect(canUseCSR(ctx, 15, 10, 3, 'up')).toBe(false);
		});

		it('returns false for non-positive scroll amount', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });

			expect(canUseCSR(ctx, 0, 20, 0, 'up')).toBe(false);
			expect(canUseCSR(ctx, 0, 20, -1, 'up')).toBe(false);
		});

		it('returns false when scrolling entire region', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });

			// Scroll amount equals or exceeds region height
			expect(canUseCSR(ctx, 0, 10, 10, 'up')).toBe(false);
			expect(canUseCSR(ctx, 0, 10, 15, 'up')).toBe(false);
		});
	});

	describe('hasCleanSides', () => {
		it('returns true when both sides are clean', () => {
			expect(hasCleanSides(true, true)).toBe(true);
		});

		it('returns false when any side is not clean', () => {
			expect(hasCleanSides(false, true)).toBe(false);
			expect(hasCleanSides(true, false)).toBe(false);
			expect(hasCleanSides(false, false)).toBe(false);
		});
	});
});

describe('Scroll Sequence Generation', () => {
	describe('getScrollSequence', () => {
		it('generates scroll up sequence', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });
			const result = getScrollSequence(ctx, 5, 20, 3, 'up');

			expect(result.usedCSR).toBe(true);
			expect(result.sequences.length).toBeGreaterThan(0);

			// Should set scroll region, position cursor, scroll, reset
			expect(result.sequences.join('')).toContain('\x1b[6;20r'); // Set region (1-indexed)
			expect(result.sequences.join('')).toContain('\x1b[3S'); // Scroll up 3
			expect(result.sequences.join('')).toContain('\x1b[r'); // Reset region

			// Lines to redraw are the bottom 3 lines (newly exposed)
			expect(result.linesToRedraw).toEqual([17, 18, 19]);
		});

		it('generates scroll down sequence', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });
			const result = getScrollSequence(ctx, 5, 20, 2, 'down');

			expect(result.usedCSR).toBe(true);
			expect(result.sequences.length).toBeGreaterThan(0);

			// Should scroll down
			expect(result.sequences.join('')).toContain('\x1b[2T'); // Scroll down 2

			// Lines to redraw are the top 2 lines (newly exposed)
			expect(result.linesToRedraw).toEqual([5, 6]);
		});

		it('returns empty result when CSR cannot be used', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: false });
			const result = getScrollSequence(ctx, 5, 20, 3, 'up');

			expect(result.usedCSR).toBe(false);
			expect(result.sequences).toEqual([]);
			expect(result.linesToRedraw).toEqual([]);
		});
	});

	describe('scrollWithCSR', () => {
		it('accepts scroll operation object', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });
			const result = scrollWithCSR(ctx, {
				top: 5,
				bottom: 20,
				lines: 3,
				direction: 'up',
			});

			expect(result.usedCSR).toBe(true);
			expect(result.linesToRedraw).toEqual([17, 18, 19]);
		});
	});
});

describe('Insert/Delete Line Sequences', () => {
	describe('getInsertLineSequence', () => {
		it('generates insert line sequence', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsInsertDelete: true });
			const sequences = getInsertLineSequence(ctx, 5, 2, 20);

			expect(sequences.length).toBeGreaterThan(0);
			expect(sequences.join('')).toContain('\x1b[2L'); // Insert 2 lines
		});

		it('returns empty when insert/delete not supported', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsInsertDelete: false });
			const sequences = getInsertLineSequence(ctx, 5, 2, 20);

			expect(sequences).toEqual([]);
		});

		it('returns empty for invalid parameters', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsInsertDelete: true });

			expect(getInsertLineSequence(ctx, -1, 2, 20)).toEqual([]);
			expect(getInsertLineSequence(ctx, 30, 2, 20)).toEqual([]);
			expect(getInsertLineSequence(ctx, 5, 0, 20)).toEqual([]);
		});
	});

	describe('getDeleteLineSequence', () => {
		it('generates delete line sequence', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsInsertDelete: true });
			const sequences = getDeleteLineSequence(ctx, 5, 2, 20);

			expect(sequences.length).toBeGreaterThan(0);
			expect(sequences.join('')).toContain('\x1b[2M'); // Delete 2 lines
		});

		it('returns empty when insert/delete not supported', () => {
			const ctx = createCSRContext({ width: 80, height: 24, supportsInsertDelete: false });
			const sequences = getDeleteLineSequence(ctx, 5, 2, 20);

			expect(sequences).toEqual([]);
		});
	});
});

describe('Scroll Detection', () => {
	describe('hashLine', () => {
		it('generates consistent hashes', () => {
			const content = 'Hello, World!';
			expect(hashLine(content)).toBe(hashLine(content));
		});

		it('generates different hashes for different content', () => {
			expect(hashLine('Line 1')).not.toBe(hashLine('Line 2'));
		});

		it('handles empty string', () => {
			expect(hashLine('')).toBe(hashLine(''));
		});
	});

	describe('computeLineHashes', () => {
		it('computes hashes for all lines', () => {
			const lines = ['Line 1', 'Line 2', 'Line 3'];
			const hashes = computeLineHashes(lines);

			expect(hashes).toHaveLength(3);
			expect(hashes[0]).toBe(hashLine('Line 1'));
			expect(hashes[1]).toBe(hashLine('Line 2'));
			expect(hashes[2]).toBe(hashLine('Line 3'));
		});
	});

	describe('detectScrollOperation', () => {
		it('detects scroll up', () => {
			// Simulate scroll up by 2: lines 2,3,4,5 become lines 0,1,2,3
			const oldLines = ['A', 'B', 'C', 'D', 'E', 'F'].map(hashLine);
			const newLines = ['C', 'D', 'E', 'F', 'X', 'Y'].map(hashLine);

			const op = detectScrollOperation(oldLines, newLines, 0, 6);

			expect(op).not.toBeNull();
			expect(op?.direction).toBe('up');
			expect(op?.lines).toBe(2);
		});

		it('detects scroll down', () => {
			// Simulate scroll down by 2: lines 0,1,2,3 become lines 2,3,4,5
			const oldLines = ['A', 'B', 'C', 'D', 'E', 'F'].map(hashLine);
			const newLines = ['X', 'Y', 'A', 'B', 'C', 'D'].map(hashLine);

			const op = detectScrollOperation(oldLines, newLines, 0, 6);

			expect(op).not.toBeNull();
			expect(op?.direction).toBe('down');
			expect(op?.lines).toBe(2);
		});

		it('returns null when no scroll detected', () => {
			const oldLines = ['A', 'B', 'C', 'D'].map(hashLine);
			const newLines = ['W', 'X', 'Y', 'Z'].map(hashLine);

			const op = detectScrollOperation(oldLines, newLines, 0, 4);

			expect(op).toBeNull();
		});

		it('returns null for small regions', () => {
			const oldLines = ['A'].map(hashLine);
			const newLines = ['B'].map(hashLine);

			const op = detectScrollOperation(oldLines, newLines, 0, 1);

			expect(op).toBeNull();
		});

		it('detects scroll in sub-region', () => {
			// Scroll up by 1 in region 2-5
			const oldLines = ['A', 'B', 'C', 'D', 'E', 'F'].map(hashLine);
			const newLines = ['A', 'B', 'D', 'E', 'X', 'F'].map(hashLine);

			const op = detectScrollOperation(oldLines, newLines, 2, 5);

			expect(op).not.toBeNull();
			expect(op?.top).toBe(2);
			expect(op?.bottom).toBe(5);
			expect(op?.direction).toBe('up');
			expect(op?.lines).toBe(1);
		});
	});
});

describe('Integration', () => {
	it('full scroll workflow', () => {
		const ctx = createCSRContext({ width: 80, height: 24, supportsCSR: true });

		// Detect a scroll operation
		const oldHashes = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'].map(hashLine);
		const newHashes = ['Line 2', 'Line 3', 'Line 4', 'Line 5', 'New Line'].map(hashLine);

		const detected = detectScrollOperation(oldHashes, newHashes, 0, 5);
		expect(detected).not.toBeNull();
		expect(detected?.direction).toBe('up');
		expect(detected?.lines).toBe(1);

		// Generate scroll sequences
		if (detected) {
			const result = scrollWithCSR(ctx, detected);
			expect(result.usedCSR).toBe(true);
			expect(result.linesToRedraw).toEqual([4]); // Last line needs redraw
		}
	});
});

// =============================================================================
// SMART CSR TESTS
// =============================================================================

import {
	analyzeBufferForCSR,
	analyzeCSR,
	calculateCSREfficiency,
	checkEdges,
	createSmartCSRContext,
	DEFAULT_SMART_CSR_CONFIG,
	isSmartCSREnabled,
	smartScroll,
	type SmartCSRBuffer,
	type SmartCSRCell,
	updateSmartCSRConfig,
} from './csr';

// Helper to create a mock buffer
function createMockBuffer(
	width: number,
	height: number,
	lines: string[],
	emptyCells: Set<string> = new Set(),
): SmartCSRBuffer {
	return {
		width,
		height,
		getCell(x: number, y: number): SmartCSRCell | undefined {
			if (x < 0 || x >= width || y < 0 || y >= height) return undefined;
			const key = `${x},${y}`;
			const line = lines[y] ?? '';
			const char = line[x] ?? ' ';
			return {
				char,
				isEmpty: emptyCells.has(key) || char === ' ',
			};
		},
		getLineContent(y: number): string {
			return lines[y] ?? '';
		},
	};
}

describe('Smart CSR', () => {
	describe('createSmartCSRContext', () => {
		it('creates context with default config', () => {
			const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });

			expect(ctx.width).toBe(80);
			expect(ctx.height).toBe(24);
			expect(ctx.supportsCSR).toBe(true);
			expect(ctx.config).toEqual(DEFAULT_SMART_CSR_CONFIG);
		});

		it('creates context with custom config', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ minRegionHeight: 8, maxScrollRatio: 0.3 },
			);

			expect(ctx.config.minRegionHeight).toBe(8);
			expect(ctx.config.maxScrollRatio).toBe(0.3);
			expect(ctx.config.enabled).toBe(true); // Default preserved
		});
	});

	describe('updateSmartCSRConfig', () => {
		it('updates configuration', () => {
			const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
			const updated = updateSmartCSRConfig(ctx, { minRegionHeight: 6 });

			expect(updated.config.minRegionHeight).toBe(6);
			expect(updated.config.enabled).toBe(true); // Preserved
			expect(ctx.config.minRegionHeight).toBe(4); // Original unchanged
		});
	});

	describe('isSmartCSREnabled', () => {
		it('returns true when enabled and terminal supports CSR', () => {
			const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
			expect(isSmartCSREnabled(ctx)).toBe(true);
		});

		it('returns false when config disabled', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ enabled: false },
			);
			expect(isSmartCSREnabled(ctx)).toBe(false);
		});

		it('returns false when terminal does not support CSR', () => {
			const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: false });
			expect(isSmartCSREnabled(ctx)).toBe(false);
		});
	});

	describe('checkEdges', () => {
		it('detects clean edges', () => {
			const buffer = createMockBuffer(
				10,
				5,
				[
					'  hello   ',
					'  world   ',
					'  test    ',
					'  lines   ',
					'  here    ',
				],
			);

			const edges = checkEdges(buffer, 0, 5);
			expect(edges.leftClean).toBe(true);
			expect(edges.rightClean).toBe(true);
		});

		it('detects dirty left edge', () => {
			const buffer = createMockBuffer(
				10,
				5,
				[
					'X hello   ',
					'  world   ',
					'  test    ',
					'  lines   ',
					'  here    ',
				],
			);

			const edges = checkEdges(buffer, 0, 5);
			expect(edges.leftClean).toBe(false);
			expect(edges.rightClean).toBe(true);
		});

		it('detects dirty right edge', () => {
			const buffer = createMockBuffer(
				10,
				5,
				[
					'  hello   ',
					'  world  X',
					'  test    ',
					'  lines   ',
					'  here    ',
				],
			);

			const edges = checkEdges(buffer, 0, 5);
			expect(edges.leftClean).toBe(true);
			expect(edges.rightClean).toBe(false);
		});

		it('checks only specified region', () => {
			const buffer = createMockBuffer(
				10,
				5,
				[
					'X         ', // Outside region
					'  hello   ',
					'  world   ',
					'  test    ',
					'         X', // Outside region
				],
			);

			// Check only rows 1-4 (exclusive)
			const edges = checkEdges(buffer, 1, 4);
			expect(edges.leftClean).toBe(true);
			expect(edges.rightClean).toBe(true);
		});
	});

	describe('analyzeCSR', () => {
		it('recommends CSR when beneficial', () => {
			const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: true });
			const analysis = analyzeCSR(ctx, 0, 20, 3, 'up');

			expect(analysis.shouldUseCSR).toBe(true);
			expect(analysis.reason).toBe('csr_beneficial');
			expect(analysis.bytesSaved).toBeGreaterThan(0);
			expect(analysis.linesPreserved).toBe(17);
		});

		it('rejects when disabled', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ enabled: false },
			);
			const analysis = analyzeCSR(ctx, 0, 20, 3, 'up');

			expect(analysis.shouldUseCSR).toBe(false);
			expect(analysis.reason).toBe('csr_disabled');
		});

		it('rejects when terminal does not support CSR', () => {
			const ctx = createSmartCSRContext({ width: 80, height: 24, supportsCSR: false });
			const analysis = analyzeCSR(ctx, 0, 20, 3, 'up');

			expect(analysis.shouldUseCSR).toBe(false);
			expect(analysis.reason).toBe('terminal_no_csr');
		});

		it('rejects when region too small', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ minRegionHeight: 10 },
			);
			const analysis = analyzeCSR(ctx, 0, 5, 2, 'up');

			expect(analysis.shouldUseCSR).toBe(false);
			expect(analysis.reason).toBe('region_too_small');
		});

		it('rejects when scroll too large', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ maxScrollRatio: 0.3 },
			);
			// Scrolling 10 lines in 20-line region = 50%, exceeds 30% max
			const analysis = analyzeCSR(ctx, 0, 20, 10, 'up');

			expect(analysis.shouldUseCSR).toBe(false);
			expect(analysis.reason).toBe('scroll_too_large');
		});

		it('rejects when too few lines preserved', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ minLinesPreserved: 10, maxScrollRatio: 0.9 },
			);
			// Scrolling 12 lines in 20-line region preserves only 8
			// Scroll ratio = 60% which is under 90% limit
			const analysis = analyzeCSR(ctx, 0, 20, 12, 'up');

			expect(analysis.shouldUseCSR).toBe(false);
			expect(analysis.reason).toBe('too_few_lines_preserved');
		});

		it('rejects when edges not clean and required', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ requireCleanSides: true },
			);
			const analysis = analyzeCSR(ctx, 0, 20, 3, 'up', false);

			expect(analysis.shouldUseCSR).toBe(false);
			expect(analysis.reason).toBe('edges_not_clean');
		});

		it('provides accurate cost calculations', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ bytesPerCell: 10, csrOverhead: 30 },
			);
			const analysis = analyzeCSR(ctx, 0, 20, 3, 'up');

			// 17 lines preserved * 80 width * 10 bytes/cell = 13600 bytes redraw cost
			// CSR overhead = 30 bytes
			expect(analysis.redrawCost).toBe(17 * 80 * 10);
			expect(analysis.csrCost).toBe(30);
			expect(analysis.bytesSaved).toBe(analysis.redrawCost - analysis.csrCost);
		});
	});

	describe('analyzeBufferForCSR', () => {
		it('detects scroll and recommends CSR', () => {
			const ctx = createSmartCSRContext({ width: 10, height: 10, supportsCSR: true });

			const oldBuffer = createMockBuffer(10, 10, [
				'Line 0    ',
				'Line 1    ',
				'Line 2    ',
				'Line 3    ',
				'Line 4    ',
				'Line 5    ',
				'Line 6    ',
				'Line 7    ',
				'Line 8    ',
				'Line 9    ',
			]);

			// Scroll up by 2
			const newBuffer = createMockBuffer(10, 10, [
				'Line 2    ',
				'Line 3    ',
				'Line 4    ',
				'Line 5    ',
				'Line 6    ',
				'Line 7    ',
				'Line 8    ',
				'Line 9    ',
				'New Line A',
				'New Line B',
			]);

			const analysis = analyzeBufferForCSR(ctx, oldBuffer, newBuffer);

			expect(analysis.shouldUseCSR).toBe(true);
			expect(analysis.scrollOperation).not.toBeNull();
			expect(analysis.scrollOperation?.direction).toBe('up');
			expect(analysis.scrollOperation?.lines).toBe(2);
		});

		it('returns no scroll when content completely different', () => {
			const ctx = createSmartCSRContext({ width: 10, height: 10, supportsCSR: true });

			const oldBuffer = createMockBuffer(10, 10, [
				'AAAAAAAAAA',
				'BBBBBBBBBB',
				'CCCCCCCCCC',
				'DDDDDDDDDD',
				'EEEEEEEEEE',
				'FFFFFFFFFF',
				'GGGGGGGGGG',
				'HHHHHHHHHH',
				'IIIIIIIIII',
				'JJJJJJJJJJ',
			]);

			const newBuffer = createMockBuffer(10, 10, [
				'0000000000',
				'1111111111',
				'2222222222',
				'3333333333',
				'4444444444',
				'5555555555',
				'6666666666',
				'7777777777',
				'8888888888',
				'9999999999',
			]);

			const analysis = analyzeBufferForCSR(ctx, oldBuffer, newBuffer);

			expect(analysis.shouldUseCSR).toBe(false);
			expect(analysis.reason).toBe('no_scroll_detected');
		});

		it('respects disabled config', () => {
			const ctx = createSmartCSRContext(
				{ width: 10, height: 10, supportsCSR: true },
				{ enabled: false },
			);

			const lines = Array.from({ length: 10 }, (_, i) => `Line ${i}    `);
			const buffer = createMockBuffer(10, 10, lines);
			const analysis = analyzeBufferForCSR(ctx, buffer, buffer);

			expect(analysis.shouldUseCSR).toBe(false);
			expect(analysis.reason).toBe('csr_disabled');
		});
	});

	describe('smartScroll', () => {
		it('returns CSR result when beneficial', () => {
			const ctx = createSmartCSRContext({ width: 10, height: 10, supportsCSR: true });

			const oldBuffer = createMockBuffer(10, 10, [
				'Line 0    ',
				'Line 1    ',
				'Line 2    ',
				'Line 3    ',
				'Line 4    ',
				'Line 5    ',
				'Line 6    ',
				'Line 7    ',
				'Line 8    ',
				'Line 9    ',
			]);

			// Scroll up by 1
			const newBuffer = createMockBuffer(10, 10, [
				'Line 1    ',
				'Line 2    ',
				'Line 3    ',
				'Line 4    ',
				'Line 5    ',
				'Line 6    ',
				'Line 7    ',
				'Line 8    ',
				'Line 9    ',
				'New Line  ',
			]);

			const result = smartScroll(ctx, oldBuffer, newBuffer);

			expect(result.usedCSR).toBe(true);
			expect(result.sequences.length).toBeGreaterThan(0);
			expect(result.linesToRedraw).toContain(9); // Last line needs redraw
		});

		it('returns empty result when CSR not beneficial', () => {
			const ctx = createSmartCSRContext({ width: 10, height: 10, supportsCSR: false });

			const lines = Array.from({ length: 10 }, (_, i) => `Line ${i}    `);
			const buffer = createMockBuffer(10, 10, lines);
			const result = smartScroll(ctx, buffer, buffer);

			expect(result.usedCSR).toBe(false);
			expect(result.sequences).toEqual([]);
		});
	});

	describe('calculateCSREfficiency', () => {
		it('returns high efficiency for large regions with small scroll', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ bytesPerCell: 10, csrOverhead: 30 },
			);

			// Large region (20 lines), small scroll (2 lines)
			// Preserves 18 lines = 18 * 80 * 10 = 14400 bytes
			// CSR cost = 30 bytes
			// Efficiency = 14400 / 30 = 480
			const efficiency = calculateCSREfficiency(ctx, 20, 2);
			expect(efficiency).toBeGreaterThan(100);
		});

		it('returns low efficiency for small regions', () => {
			const ctx = createSmartCSRContext(
				{ width: 10, height: 24, supportsCSR: true },
				{ bytesPerCell: 10, csrOverhead: 30 },
			);

			// Small region, large scroll
			// Preserves only 1 line = 1 * 10 * 10 = 100 bytes
			// CSR cost = 30 bytes
			// Efficiency = 100 / 30 = 3.33
			const efficiency = calculateCSREfficiency(ctx, 5, 4);
			expect(efficiency).toBeLessThan(5);
		});

		it('returns infinity when CSR overhead is zero', () => {
			const ctx = createSmartCSRContext(
				{ width: 80, height: 24, supportsCSR: true },
				{ csrOverhead: 0 },
			);

			const efficiency = calculateCSREfficiency(ctx, 20, 2);
			expect(efficiency).toBe(Number.POSITIVE_INFINITY);
		});
	});
});
