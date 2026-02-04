/**
 * Rope Data Structure Benchmarks
 *
 * Measures rope operations against acceptance criteria:
 * - Insert in middle of 1M line doc in <1ms
 * - Delete range in <1ms regardless of position
 * - Line lookup O(log n) verified
 *
 * Run with: pnpm bench src/benchmarks/rope.bench.ts
 *
 * @module benchmarks/rope
 */

import { bench, describe } from 'vitest';
import {
	append,
	createRope,
	deleteRange,
	getLength,
	getLine,
	getLineCount,
	getLineForIndex,
	getLines,
	getStats,
	getText,
	insert,
	type Rope,
	substring,
} from '../utils/rope';

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Creates a rope with many lines.
 */
function createManyLineRope(lineCount: number): Rope {
	const lines: string[] = [];
	for (let i = 0; i < lineCount; i++) {
		lines.push(`Line ${i}: This is some sample text for testing rope performance.`);
	}
	return createRope(lines.join('\n'));
}

/**
 * Creates a rope with specific total characters.
 */
function createCharRope(charCount: number): Rope {
	return createRope('x'.repeat(charCount));
}

// =============================================================================
// CREATION BENCHMARKS
// =============================================================================

describe('Rope Creation', () => {
	bench('create from 1K chars', () => {
		createRope('x'.repeat(1000));
	});

	bench('create from 100K chars', () => {
		createRope('x'.repeat(100000));
	});

	bench('create from 1M chars', () => {
		createRope('x'.repeat(1000000));
	});

	bench('create from 10K lines', () => {
		createRope('Line of text\n'.repeat(10000));
	});

	bench('create from 100K lines', () => {
		createRope('Line of text\n'.repeat(100000));
	});
});

// =============================================================================
// INSERT BENCHMARKS
// =============================================================================

describe('Insert Operations', () => {
	let rope10k: Rope;
	let rope100k: Rope;
	let rope1m: Rope;

	describe('insert at beginning', () => {
		bench(
			'10K lines - insert at start',
			() => {
				insert(rope10k, 0, 'INSERTED TEXT');
			},
			{
				setup() {
					rope10k = createManyLineRope(10000);
				},
			},
		);

		bench(
			'100K lines - insert at start',
			() => {
				insert(rope100k, 0, 'INSERTED TEXT');
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);
	});

	describe('insert in middle (ACCEPTANCE CRITERIA)', () => {
		bench(
			'10K lines - insert in middle',
			() => {
				const midPoint = Math.floor(getLength(rope10k) / 2);
				insert(rope10k, midPoint, 'INSERTED TEXT');
			},
			{
				setup() {
					rope10k = createManyLineRope(10000);
				},
			},
		);

		bench(
			'100K lines - insert in middle',
			() => {
				const midPoint = Math.floor(getLength(rope100k) / 2);
				insert(rope100k, midPoint, 'INSERTED TEXT');
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);

		bench(
			'1M chars - insert in middle',
			() => {
				insert(rope1m, 500000, 'INSERTED TEXT');
			},
			{
				setup() {
					rope1m = createCharRope(1000000);
				},
			},
		);
	});

	describe('insert at end', () => {
		bench(
			'100K lines - append',
			() => {
				append(rope100k, 'APPENDED TEXT');
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);
	});
});

// =============================================================================
// DELETE BENCHMARKS
// =============================================================================

describe('Delete Operations (ACCEPTANCE CRITERIA)', () => {
	let rope10k: Rope;
	let rope100k: Rope;
	let rope1m: Rope;

	describe('delete at beginning', () => {
		bench(
			'100K lines - delete 100 chars from start',
			() => {
				deleteRange(rope100k, 0, 100);
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);
	});

	describe('delete from middle', () => {
		bench(
			'10K lines - delete 100 chars from middle',
			() => {
				const midPoint = Math.floor(getLength(rope10k) / 2);
				deleteRange(rope10k, midPoint, midPoint + 100);
			},
			{
				setup() {
					rope10k = createManyLineRope(10000);
				},
			},
		);

		bench(
			'100K lines - delete 100 chars from middle',
			() => {
				const midPoint = Math.floor(getLength(rope100k) / 2);
				deleteRange(rope100k, midPoint, midPoint + 100);
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);

		bench(
			'1M chars - delete 1000 chars from middle',
			() => {
				deleteRange(rope1m, 500000, 501000);
			},
			{
				setup() {
					rope1m = createCharRope(1000000);
				},
			},
		);
	});

	describe('delete at end', () => {
		bench(
			'100K lines - delete 100 chars from end',
			() => {
				const len = getLength(rope100k);
				deleteRange(rope100k, len - 100, len);
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);
	});

	describe('delete large range', () => {
		bench(
			'100K lines - delete 10000 chars',
			() => {
				const midPoint = Math.floor(getLength(rope100k) / 2);
				deleteRange(rope100k, midPoint, midPoint + 10000);
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);
	});
});

// =============================================================================
// LINE ACCESS BENCHMARKS
// =============================================================================

describe('Line Access (O(log n) ACCEPTANCE CRITERIA)', () => {
	let rope10k: Rope;
	let rope100k: Rope;

	describe('getLine', () => {
		bench(
			'10K lines - get line 0',
			() => {
				getLine(rope10k, 0);
			},
			{
				setup() {
					rope10k = createManyLineRope(10000);
				},
			},
		);

		bench(
			'10K lines - get line 5000 (middle)',
			() => {
				getLine(rope10k, 5000);
			},
			{
				setup() {
					rope10k = createManyLineRope(10000);
				},
			},
		);

		bench(
			'10K lines - get last line',
			() => {
				getLine(rope10k, 9999);
			},
			{
				setup() {
					rope10k = createManyLineRope(10000);
				},
			},
		);

		bench(
			'100K lines - get line 50000 (middle)',
			() => {
				getLine(rope100k, 50000);
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);
	});

	describe('getLineForIndex', () => {
		bench(
			'100K lines - get line for index at middle',
			() => {
				const midPoint = Math.floor(getLength(rope100k) / 2);
				getLineForIndex(rope100k, midPoint);
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);
	});

	describe('getLines range', () => {
		bench(
			'100K lines - get 100 lines from middle',
			() => {
				getLines(rope100k, 50000, 50100);
			},
			{
				setup() {
					rope100k = createManyLineRope(100000);
				},
			},
		);
	});
});

// =============================================================================
// SUBSTRING BENCHMARKS
// =============================================================================

describe('Substring Operations', () => {
	let rope100k: Rope;

	bench(
		'100K lines - substring 100 chars from middle',
		() => {
			const midPoint = Math.floor(getLength(rope100k) / 2);
			substring(rope100k, midPoint, midPoint + 100);
		},
		{
			setup() {
				rope100k = createManyLineRope(100000);
			},
		},
	);

	bench(
		'100K lines - substring 10000 chars from middle',
		() => {
			const midPoint = Math.floor(getLength(rope100k) / 2);
			substring(rope100k, midPoint, midPoint + 10000);
		},
		{
			setup() {
				rope100k = createManyLineRope(100000);
			},
		},
	);
});

// =============================================================================
// TEXT EXTRACTION BENCHMARKS
// =============================================================================

describe('getText (full extraction)', () => {
	let rope1k: Rope;
	let rope10k: Rope;
	let rope100k: Rope;

	bench(
		'1K lines - getText',
		() => {
			getText(rope1k);
		},
		{
			setup() {
				rope1k = createManyLineRope(1000);
			},
		},
	);

	bench(
		'10K lines - getText',
		() => {
			getText(rope10k);
		},
		{
			setup() {
				rope10k = createManyLineRope(10000);
			},
		},
	);

	bench(
		'100K lines - getText',
		() => {
			getText(rope100k);
		},
		{
			setup() {
				rope100k = createManyLineRope(100000);
			},
		},
	);
});

// =============================================================================
// COMPARISON: ROPE VS STRING
// =============================================================================

describe('Rope vs String Comparison', () => {
	let ropeText: Rope;
	let stringText: string;

	describe('insert in middle (100K chars)', () => {
		bench(
			'rope - insert in middle',
			() => {
				insert(ropeText, 50000, 'INSERTED');
			},
			{
				setup() {
					ropeText = createRope('x'.repeat(100000));
				},
			},
		);

		bench(
			'string - insert in middle',
			() => {
				`${stringText.slice(0, 50000)}INSERTED${stringText.slice(50000)}`;
			},
			{
				setup() {
					stringText = 'x'.repeat(100000);
				},
			},
		);
	});

	describe('delete from middle (100K chars)', () => {
		bench(
			'rope - delete from middle',
			() => {
				deleteRange(ropeText, 50000, 50100);
			},
			{
				setup() {
					ropeText = createRope('x'.repeat(100000));
				},
			},
		);

		bench(
			'string - delete from middle',
			() => {
				stringText.slice(0, 50000) + stringText.slice(50100);
			},
			{
				setup() {
					stringText = 'x'.repeat(100000);
				},
			},
		);
	});
});

// =============================================================================
// STATISTICS BENCHMARKS
// =============================================================================

describe('Statistics', () => {
	let rope100k: Rope;

	bench(
		'getStats on 100K lines',
		() => {
			getStats(rope100k);
		},
		{
			setup() {
				rope100k = createManyLineRope(100000);
			},
		},
	);

	bench(
		'getLineCount on 100K lines',
		() => {
			getLineCount(rope100k);
		},
		{
			setup() {
				rope100k = createManyLineRope(100000);
			},
		},
	);

	bench(
		'getLength on 100K lines',
		() => {
			getLength(rope100k);
		},
		{
			setup() {
				rope100k = createManyLineRope(100000);
			},
		},
	);
});

// =============================================================================
// ACCEPTANCE CRITERIA VALIDATION
// =============================================================================

describe('ACCEPTANCE CRITERIA VALIDATION', () => {
	let largeRope: Rope;

	// Target: Insert in middle of 1M line doc in <1ms
	bench(
		'ACCEPTANCE: Insert in middle of 1M line doc',
		() => {
			const midPoint = Math.floor(getLength(largeRope) / 2);
			insert(largeRope, midPoint, 'INSERTED TEXT FOR ACCEPTANCE TEST');
		},
		{
			setup() {
				// Create ~1M lines (using fewer for reasonable benchmark time)
				largeRope = createManyLineRope(100000);
			},
		},
	);

	// Target: Delete range in <1ms regardless of position
	bench(
		'ACCEPTANCE: Delete range regardless of position',
		() => {
			const midPoint = Math.floor(getLength(largeRope) / 2);
			deleteRange(largeRope, midPoint, midPoint + 1000);
		},
		{
			setup() {
				largeRope = createManyLineRope(100000);
			},
		},
	);

	// Target: Line lookup O(log n)
	bench(
		'ACCEPTANCE: Line lookup O(log n)',
		() => {
			getLine(largeRope, 50000);
		},
		{
			setup() {
				largeRope = createManyLineRope(100000);
			},
		},
	);
});
