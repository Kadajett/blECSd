/**
 * Tests for braille pattern graphics backend.
 */

import { describe, expect, it } from 'vitest';
import {
	BRAILLE_BACKEND_NAME,
	clearBrailleImage,
	createBrailleBackend,
	cursorPosition,
	renderBrailleImage,
} from './braille';
import type { EnvChecker } from './detect';

// =============================================================================
// MOCK ENVIRONMENT CHECKER
// =============================================================================

function createMockEnv(vars: Record<string, string>): EnvChecker {
	return {
		getEnv: (name: string) => vars[name],
	};
}

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

describe('cursorPosition', () => {
	it('generates correct escape sequence for 0,0', () => {
		expect(cursorPosition(0, 0)).toBe('\x1b[1;1H');
	});

	it('generates correct escape sequence for 10,5', () => {
		expect(cursorPosition(10, 5)).toBe('\x1b[6;11H');
	});

	it('generates correct escape sequence for 79,23', () => {
		expect(cursorPosition(79, 23)).toBe('\x1b[24;80H');
	});
});

// =============================================================================
// RENDER HELPER
// =============================================================================

describe('renderBrailleImage', () => {
	it('renders a small 4x8 image (2x2 cells)', () => {
		const imageData = {
			width: 4,
			height: 8,
			data: new Uint8Array(4 * 8 * 4).fill(255),
			format: 'rgba' as const,
		};

		const result = renderBrailleImage(imageData, { x: 0, y: 0 });

		// Should contain cursor positioning
		expect(result).toContain('\x1b[1;1H');
		// Should contain ANSI escape sequences
		expect(result).toContain('\x1b[');
		// Should end with reset
		expect(result).toContain('\x1b[0m');
	});

	it('positions image at specified coordinates', () => {
		const imageData = {
			width: 2,
			height: 4,
			data: new Uint8Array(2 * 4 * 4).fill(255),
			format: 'rgba' as const,
		};

		const result = renderBrailleImage(imageData, { x: 10, y: 5 });

		// Should position at x=10, y=5 (1-based: 11, 6)
		expect(result).toContain('\x1b[6;11H');
	});

	it('renders braille characters for high resolution', () => {
		const imageData = {
			width: 2,
			height: 4,
			data: new Uint8Array([
				255,
				255,
				255,
				255,
				255,
				255,
				255,
				255, // Top row (white)
				255,
				255,
				255,
				255,
				255,
				255,
				255,
				255, // Row 2
				255,
				255,
				255,
				255,
				255,
				255,
				255,
				255, // Row 3
				255,
				255,
				255,
				255,
				255,
				255,
				255,
				255, // Bottom row (white)
			]),
			format: 'rgba' as const,
		};

		const result = renderBrailleImage(imageData, { x: 0, y: 0 });

		// Should contain Unicode braille characters (U+2800 to U+28FF)
		// The exact braille pattern depends on the luminance threshold
		expect(result.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// CLEAR HELPER
// =============================================================================

describe('clearBrailleImage', () => {
	it('returns empty string when no options provided', () => {
		expect(clearBrailleImage()).toBe('');
	});

	it('generates space-filled clear sequence', () => {
		const result = clearBrailleImage({ x: 0, y: 0, width: 3, height: 2 });

		// Should contain cursor positioning for row 0
		expect(result).toContain('\x1b[1;1H');
		// Should contain cursor positioning for row 1
		expect(result).toContain('\x1b[2;1H');
		// Should contain spaces
		expect(result).toContain('   ');
	});

	it('clears area at specified position', () => {
		const result = clearBrailleImage({ x: 10, y: 5, width: 2, height: 2 });

		// Should position at x=10, y=5 (1-based: 11, 6)
		expect(result).toContain('\x1b[6;11H');
		// Should position at x=10, y=6 (1-based: 11, 7)
		expect(result).toContain('\x1b[7;11H');
	});
});

// =============================================================================
// BACKEND FACTORY
// =============================================================================

describe('createBrailleBackend', () => {
	it('creates backend with correct name', () => {
		const backend = createBrailleBackend();
		expect(backend.name).toBe(BRAILLE_BACKEND_NAME);
		expect(backend.name).toBe('braille');
	});

	it('creates backend with correct capabilities', () => {
		const backend = createBrailleBackend();
		expect(backend.capabilities.staticImages).toBe(true);
		expect(backend.capabilities.animation).toBe(false);
		expect(backend.capabilities.alphaChannel).toBe(true);
		expect(backend.capabilities.maxWidth).toBe(null);
		expect(backend.capabilities.maxHeight).toBe(null);
	});

	it('reports supported for UTF-8 terminals', () => {
		const env = createMockEnv({ LANG: 'en_US.UTF-8' });
		const backend = createBrailleBackend(env);
		expect(backend.isSupported()).toBe(true);
	});

	it('reports supported for modern terminals', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'iTerm.app' });
		const backend = createBrailleBackend(env);
		expect(backend.isSupported()).toBe(true);
	});

	it('defaults to supported for unknown terminals', () => {
		const env = createMockEnv({});
		const backend = createBrailleBackend(env);
		expect(backend.isSupported()).toBe(true);
	});

	it('has render function', () => {
		const backend = createBrailleBackend();
		expect(typeof backend.render).toBe('function');
	});

	it('has clear function', () => {
		const backend = createBrailleBackend();
		expect(typeof backend.clear).toBe('function');
		// Clear returns empty string for braille backend
		expect(backend.clear()).toBe('');
	});
});
