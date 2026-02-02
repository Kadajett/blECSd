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
