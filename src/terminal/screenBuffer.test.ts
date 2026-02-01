/**
 * Tests for ScreenBuffer
 */

import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenBuffer } from './screenBuffer';

describe('ScreenBuffer', () => {
	let output: PassThrough;
	let buffer: ScreenBuffer;
	let written: string;

	beforeEach(() => {
		written = '';
		output = new PassThrough();
		output.on('data', (chunk) => {
			written += chunk.toString();
		});
		buffer = new ScreenBuffer(output);
	});

	afterEach(() => {
		buffer.destroy();
	});

	describe('isAlternate', () => {
		it('is false by default', () => {
			expect(buffer.isAlternate).toBe(false);
		});

		it('is true after enterAlternateScreen', () => {
			buffer.enterAlternateScreen();
			expect(buffer.isAlternate).toBe(true);
		});

		it('is false after exitAlternateScreen', () => {
			buffer.enterAlternateScreen();
			buffer.exitAlternateScreen();
			expect(buffer.isAlternate).toBe(false);
		});
	});

	describe('enterAlternateScreen', () => {
		it('writes alternate screen enter sequence', () => {
			buffer.enterAlternateScreen();
			expect(written).toBe('\x1b[?1049h');
		});

		it('does not write if already in alternate screen', () => {
			buffer.enterAlternateScreen();
			written = '';
			buffer.enterAlternateScreen();
			expect(written).toBe('');
		});
	});

	describe('exitAlternateScreen', () => {
		it('writes alternate screen exit sequence', () => {
			buffer.enterAlternateScreen();
			written = '';
			buffer.exitAlternateScreen();
			expect(written).toBe('\x1b[?1049l');
		});

		it('does not write if not in alternate screen', () => {
			buffer.exitAlternateScreen();
			expect(written).toBe('');
		});
	});

	describe('cleanup', () => {
		it('exits alternate screen', () => {
			buffer.enterAlternateScreen();
			written = '';
			buffer.cleanup();
			expect(written).toBe('\x1b[?1049l');
		});

		it('calls registered cleanup handlers', () => {
			const handler = vi.fn();
			buffer.onCleanup(handler);
			buffer.cleanup();
			expect(handler).toHaveBeenCalledOnce();
		});

		it('calls multiple cleanup handlers', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			buffer.onCleanup(handler1);
			buffer.onCleanup(handler2);
			buffer.cleanup();
			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it('continues cleanup even if handler throws', () => {
			const handler1 = vi.fn(() => {
				throw new Error('oops');
			});
			const handler2 = vi.fn();
			buffer.onCleanup(handler1);
			buffer.onCleanup(handler2);
			buffer.cleanup();
			expect(handler2).toHaveBeenCalledOnce();
		});
	});

	describe('onCleanup', () => {
		it('returns unsubscribe function', () => {
			const handler = vi.fn();
			const unsubscribe = buffer.onCleanup(handler);
			unsubscribe();
			buffer.cleanup();
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('destroy', () => {
		it('performs cleanup', () => {
			const handler = vi.fn();
			buffer.onCleanup(handler);
			buffer.destroy();
			expect(handler).toHaveBeenCalledOnce();
		});

		it('clears handlers after destroy', () => {
			const handler = vi.fn();
			buffer.onCleanup(handler);
			buffer.destroy();
			handler.mockClear();
			buffer.cleanup();
			expect(handler).not.toHaveBeenCalled();
		});
	});
});

describe('screen.enterAlt and screen.exitAlt', () => {
	it('enterAlt returns smcup sequence', async () => {
		const { screen } = await import('./ansi');
		expect(screen.enterAlt()).toBe('\x1b[?1049h');
	});

	it('exitAlt returns rmcup sequence', async () => {
		const { screen } = await import('./ansi');
		expect(screen.exitAlt()).toBe('\x1b[?1049l');
	});

	it('enterAlt matches alternateOn', async () => {
		const { screen } = await import('./ansi');
		expect(screen.enterAlt()).toBe(screen.alternateOn());
	});

	it('exitAlt matches alternateOff', async () => {
		const { screen } = await import('./ansi');
		expect(screen.exitAlt()).toBe(screen.alternateOff());
	});
});
