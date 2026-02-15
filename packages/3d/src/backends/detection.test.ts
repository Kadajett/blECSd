import { describe, expect, it } from 'vitest';
import { createBackendByType, detectBestBackend } from './detection';

describe('Backend detection', () => {
	describe('detectBestBackend', () => {
		it('returns kitty backend for kitty-capable terminal', () => {
			const backend = detectBestBackend({ graphics: 'kitty', truecolor: true });
			expect(backend.type).toBe('kitty');
		});

		it('returns sixel backend for sixel-capable terminal', () => {
			const backend = detectBestBackend({ graphics: 'sixel', truecolor: true });
			expect(backend.type).toBe('sixel');
		});

		it('returns sextant for truecolor terminal without graphics protocol', () => {
			const backend = detectBestBackend({ graphics: 'none', truecolor: true });
			expect(backend.type).toBe('sextant');
		});

		it('returns sextant for truecolor with graphics=false', () => {
			const backend = detectBestBackend({ graphics: false, truecolor: true });
			expect(backend.type).toBe('sextant');
		});

		it('returns braille for minimal terminal', () => {
			const backend = detectBestBackend({ graphics: false, truecolor: false });
			expect(backend.type).toBe('braille');
		});

		it('returns braille for non-truecolor, no graphics', () => {
			const backend = detectBestBackend({ graphics: 'none', truecolor: false });
			expect(backend.type).toBe('braille');
		});

		it('uses preferred when forceBackend=true', () => {
			const backend = detectBestBackend(
				{ graphics: 'kitty', truecolor: true },
				{ preferred: 'braille', forceBackend: true },
			);
			expect(backend.type).toBe('braille');
		});

		it('uses preferred type directly when not auto', () => {
			const backend = detectBestBackend(
				{ graphics: false, truecolor: false },
				{ preferred: 'sixel' },
			);
			expect(backend.type).toBe('sixel');
		});

		it('uses custom fallback when detection produces braille', () => {
			const backend = detectBestBackend(
				{ graphics: false, truecolor: false },
				{ fallback: 'halfblock' },
			);
			expect(backend.type).toBe('halfblock');
		});

		it('uses default preferences when none provided', () => {
			const backend = detectBestBackend({ graphics: false, truecolor: false });
			expect(backend.type).toBe('braille');
		});
	});

	describe('createBackendByType', () => {
		it('creates braille backend', () => {
			expect(createBackendByType('braille').type).toBe('braille');
		});

		it('creates halfblock backend', () => {
			expect(createBackendByType('halfblock').type).toBe('halfblock');
		});

		it('creates sextant backend', () => {
			expect(createBackendByType('sextant').type).toBe('sextant');
		});

		it('creates sixel backend', () => {
			expect(createBackendByType('sixel').type).toBe('sixel');
		});

		it('creates kitty backend', () => {
			expect(createBackendByType('kitty').type).toBe('kitty');
		});

		it('rejects invalid type', () => {
			expect(() => createBackendByType('webgl' as never)).toThrow();
		});
	});
});
