/**
 * Tests for ANSI color block graphics backend.
 */

import { describe, expect, it } from 'vitest';
import {
	ANSI_BACKEND_NAME,
	clearAnsiImage,
	createAnsiBackend,
	cursorPosition,
	renderAnsiImage,
} from './ansi';
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

describe('renderAnsiImage', () => {
	it('renders a small 2x2 image', () => {
		const imageData = {
			width: 2,
			height: 2,
			data: new Uint8Array([
				255,
				0,
				0,
				255, // Red pixel
				0,
				255,
				0,
				255, // Green pixel
				0,
				0,
				255,
				255, // Blue pixel
				255,
				255,
				255,
				255, // White pixel
			]),
			format: 'rgba' as const,
		};

		const result = renderAnsiImage(imageData, { x: 0, y: 0 });

		// Should contain cursor positioning
		expect(result).toContain('\x1b[1;1H');
		// Should contain ANSI color escape sequences
		expect(result).toContain('\x1b[');
		// Should end with reset
		expect(result).toContain('\x1b[0m');
	});

	it('positions image at specified coordinates', () => {
		const imageData = {
			width: 1,
			height: 1,
			data: new Uint8Array([255, 0, 0, 255]),
			format: 'rgba' as const,
		};

		const result = renderAnsiImage(imageData, { x: 10, y: 5 });

		// Should position at x=10, y=5 (1-based: 11, 6)
		expect(result).toContain('\x1b[6;11H');
	});

	it('scales image when width and height are specified', () => {
		const imageData = {
			width: 4,
			height: 4,
			data: new Uint8Array(4 * 4 * 4).fill(255),
			format: 'rgba' as const,
		};

		const result = renderAnsiImage(imageData, { x: 0, y: 0, width: 2, height: 2 });

		// Should render and contain ANSI sequences
		expect(result).toContain('\x1b[');
		expect(result.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// CLEAR HELPER
// =============================================================================

describe('clearAnsiImage', () => {
	it('returns empty string when no options provided', () => {
		expect(clearAnsiImage()).toBe('');
	});

	it('generates space-filled clear sequence', () => {
		const result = clearAnsiImage({ x: 0, y: 0, width: 3, height: 2 });

		// Should contain cursor positioning for row 0
		expect(result).toContain('\x1b[1;1H');
		// Should contain cursor positioning for row 1
		expect(result).toContain('\x1b[2;1H');
		// Should contain spaces
		expect(result).toContain('   ');
	});

	it('clears area at specified position', () => {
		const result = clearAnsiImage({ x: 10, y: 5, width: 2, height: 2 });

		// Should position at x=10, y=5 (1-based: 11, 6)
		expect(result).toContain('\x1b[6;11H');
		// Should position at x=10, y=6 (1-based: 11, 7)
		expect(result).toContain('\x1b[7;11H');
	});
});

// =============================================================================
// BACKEND FACTORY
// =============================================================================

describe('createAnsiBackend', () => {
	it('creates backend with correct name', () => {
		const backend = createAnsiBackend();
		expect(backend.name).toBe(ANSI_BACKEND_NAME);
		expect(backend.name).toBe('ansi');
	});

	it('creates backend with correct capabilities', () => {
		const backend = createAnsiBackend();
		expect(backend.capabilities.staticImages).toBe(true);
		expect(backend.capabilities.animation).toBe(false);
		expect(backend.capabilities.alphaChannel).toBe(true);
		expect(backend.capabilities.maxWidth).toBe(null);
		expect(backend.capabilities.maxHeight).toBe(null);
	});

	it('reports supported for 256-color terminals', () => {
		const env = createMockEnv({ TERM: 'xterm-256color' });
		const backend = createAnsiBackend(env);
		expect(backend.isSupported()).toBe(true);
	});

	it('reports unsupported when NO_COLOR is set', () => {
		const env = createMockEnv({ NO_COLOR: '1' });
		const backend = createAnsiBackend(env);
		expect(backend.isSupported()).toBe(false);
	});

	it('has render function', () => {
		const backend = createAnsiBackend();
		expect(typeof backend.render).toBe('function');
	});

	it('has clear function', () => {
		const backend = createAnsiBackend();
		expect(typeof backend.clear).toBe('function');
		// Clear returns empty string for ANSI backend
		expect(backend.clear()).toBe('');
	});
});
