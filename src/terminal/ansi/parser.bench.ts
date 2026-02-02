/**
 * Performance benchmarks for ANSI SGR parser.
 *
 * Run with: pnpm test --run src/terminal/ansi/parser.bench.ts
 *
 * @module terminal/ansi/parser.bench
 */

import { bench, describe, expect } from 'vitest';
import {
	createAttribute,
	parseSgrString,
	parseSgrStringLegacy,
} from './parser';

// Test data generators
function generateSimpleSgr(count: number): string {
	let result = '';
	for (let i = 0; i < count; i++) {
		result += `\x1b[1;31mHello\x1b[0m `;
	}
	return result;
}

function generate256ColorSgr(count: number): string {
	let result = '';
	for (let i = 0; i < count; i++) {
		const color = i % 256;
		result += `\x1b[38;5;${color}mText\x1b[0m `;
	}
	return result;
}

function generateRgbSgr(count: number): string {
	let result = '';
	for (let i = 0; i < count; i++) {
		const r = i % 256;
		const g = (i * 2) % 256;
		const b = (i * 3) % 256;
		result += `\x1b[38;2;${r};${g};${b}mText\x1b[0m `;
	}
	return result;
}

function generateMixedSgr(count: number): string {
	let result = '';
	for (let i = 0; i < count; i++) {
		const variant = i % 4;
		switch (variant) {
			case 0:
				result += '\x1b[1;4;31mBold underline red\x1b[0m ';
				break;
			case 1:
				result += '\x1b[38;5;196mRed 256\x1b[0m ';
				break;
			case 2:
				result += '\x1b[38;2;255;128;0mOrange RGB\x1b[0m ';
				break;
			case 3:
				result += '\x1b[7;48;5;21mInverse blue bg\x1b[0m ';
				break;
		}
	}
	return result;
}

// Pre-generate test data to avoid benchmark overhead
const simpleSgr100 = generateSimpleSgr(100);
const simpleSgr1000 = generateSimpleSgr(1000);
const color256Sgr100 = generate256ColorSgr(100);
const color256Sgr1000 = generate256ColorSgr(1000);
const rgbSgr100 = generateRgbSgr(100);
const rgbSgr1000 = generateRgbSgr(1000);
const mixedSgr100 = generateMixedSgr(100);
const mixedSgr1000 = generateMixedSgr(1000);

describe('parseSgrString benchmarks', () => {
	describe('simple SGR codes (bold + color)', () => {
		bench('streaming parser - 100 sequences', () => {
			const attr = createAttribute();
			parseSgrString(simpleSgr100, attr);
		});

		bench('legacy parser - 100 sequences', () => {
			const attr = createAttribute();
			parseSgrStringLegacy(simpleSgr100, attr);
		});

		bench('streaming parser - 1000 sequences', () => {
			const attr = createAttribute();
			parseSgrString(simpleSgr1000, attr);
		});

		bench('legacy parser - 1000 sequences', () => {
			const attr = createAttribute();
			parseSgrStringLegacy(simpleSgr1000, attr);
		});
	});

	describe('256-color SGR codes', () => {
		bench('streaming parser - 100 sequences', () => {
			const attr = createAttribute();
			parseSgrString(color256Sgr100, attr);
		});

		bench('legacy parser - 100 sequences', () => {
			const attr = createAttribute();
			parseSgrStringLegacy(color256Sgr100, attr);
		});

		bench('streaming parser - 1000 sequences', () => {
			const attr = createAttribute();
			parseSgrString(color256Sgr1000, attr);
		});

		bench('legacy parser - 1000 sequences', () => {
			const attr = createAttribute();
			parseSgrStringLegacy(color256Sgr1000, attr);
		});
	});

	describe('RGB SGR codes', () => {
		bench('streaming parser - 100 sequences', () => {
			const attr = createAttribute();
			parseSgrString(rgbSgr100, attr);
		});

		bench('legacy parser - 100 sequences', () => {
			const attr = createAttribute();
			parseSgrStringLegacy(rgbSgr100, attr);
		});

		bench('streaming parser - 1000 sequences', () => {
			const attr = createAttribute();
			parseSgrString(rgbSgr1000, attr);
		});

		bench('legacy parser - 1000 sequences', () => {
			const attr = createAttribute();
			parseSgrStringLegacy(rgbSgr1000, attr);
		});
	});

	describe('mixed SGR codes (styles, 256, RGB)', () => {
		bench('streaming parser - 100 sequences', () => {
			const attr = createAttribute();
			parseSgrString(mixedSgr100, attr);
		});

		bench('legacy parser - 100 sequences', () => {
			const attr = createAttribute();
			parseSgrStringLegacy(mixedSgr100, attr);
		});

		bench('streaming parser - 1000 sequences', () => {
			const attr = createAttribute();
			parseSgrString(mixedSgr1000, attr);
		});

		bench('legacy parser - 1000 sequences', () => {
			const attr = createAttribute();
			parseSgrStringLegacy(mixedSgr1000, attr);
		});
	});
});

// Correctness verification (not a benchmark)
describe('parser correctness verification', () => {
	const testCases = [
		'\x1b[1;31mRed bold\x1b[0m',
		'\x1b[38;5;196mRed 256\x1b[0m',
		'\x1b[38;2;255;128;0mOrange RGB\x1b[0m',
		'\x1b[1;4;7;38;5;21;48;2;255;255;255mComplex\x1b[0m',
		'\x1b[mReset\x1b[0m',
		'No escapes at all',
		'\x1b[1mBold\x1b[22mNot bold\x1b[0m',
	];

	for (const input of testCases) {
		it(`streaming parser matches legacy for: ${input.replace(/\x1b/g, 'ESC')}`, () => {
			const attrStreaming = createAttribute();
			const attrLegacy = createAttribute();

			parseSgrString(input, attrStreaming);
			parseSgrStringLegacy(input, attrLegacy);

			expect(attrStreaming.fg).toEqual(attrLegacy.fg);
			expect(attrStreaming.bg).toEqual(attrLegacy.bg);
			expect(attrStreaming.styles).toEqual(attrLegacy.styles);
		});
	}
});
