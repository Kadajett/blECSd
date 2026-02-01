/**
 * Tests for SynchronizedOutput
 */

import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bracketedPaste, sync } from './ansi';
import { isSyncOutputSupported, SynchronizedOutput } from './syncOutput';

describe('sync namespace', () => {
	describe('begin', () => {
		it('returns DEC 2026 enable sequence', () => {
			expect(sync.begin()).toBe('\x1b[?2026h');
		});
	});

	describe('end', () => {
		it('returns DEC 2026 disable sequence', () => {
			expect(sync.end()).toBe('\x1b[?2026l');
		});
	});

	describe('wrap', () => {
		it('wraps content in sync markers', () => {
			const content = 'Hello, World!';
			const wrapped = sync.wrap(content);
			expect(wrapped).toBe('\x1b[?2026hHello, World!\x1b[?2026l');
		});

		it('handles empty content', () => {
			expect(sync.wrap('')).toBe('\x1b[?2026h\x1b[?2026l');
		});
	});
});

describe('bracketedPaste namespace', () => {
	describe('enable', () => {
		it('returns enable sequence', () => {
			expect(bracketedPaste.enable()).toBe('\x1b[?2004h');
		});
	});

	describe('disable', () => {
		it('returns disable sequence', () => {
			expect(bracketedPaste.disable()).toBe('\x1b[?2004l');
		});
	});

	describe('markers', () => {
		it('defines start marker', () => {
			expect(bracketedPaste.START_MARKER).toBe('\x1b[200~');
		});

		it('defines end marker', () => {
			expect(bracketedPaste.END_MARKER).toBe('\x1b[201~');
		});
	});
});

describe('SynchronizedOutput', () => {
	let output: PassThrough;
	let syncOut: SynchronizedOutput;
	let written: string;

	beforeEach(() => {
		written = '';
		output = new PassThrough();
		output.on('data', (chunk) => {
			written += chunk.toString();
		});
		syncOut = new SynchronizedOutput(output);
	});

	describe('constructor', () => {
		it('creates with default options', () => {
			expect(syncOut.supported).toBe(true);
			expect(syncOut.autoSync).toBe(false);
		});

		it('respects supported option', () => {
			const s = new SynchronizedOutput(output, { supported: false });
			expect(s.supported).toBe(false);
		});

		it('respects autoSync option', () => {
			const s = new SynchronizedOutput(output, { autoSync: true });
			expect(s.autoSync).toBe(true);
		});
	});

	describe('beginFrame', () => {
		it('writes sync begin marker', () => {
			syncOut.beginFrame();
			expect(written).toBe('\x1b[?2026h');
		});

		it('sets inFrame flag', () => {
			expect(syncOut.inFrame).toBe(false);
			syncOut.beginFrame();
			expect(syncOut.inFrame).toBe(true);
		});

		it('does nothing if already in frame', () => {
			syncOut.beginFrame();
			written = '';
			syncOut.beginFrame();
			expect(written).toBe('');
		});

		it('does nothing if not supported', () => {
			syncOut.supported = false;
			syncOut.beginFrame();
			expect(written).toBe('');
		});
	});

	describe('endFrame', () => {
		it('writes sync end marker', () => {
			syncOut.beginFrame();
			written = '';
			syncOut.endFrame();
			expect(written).toBe('\x1b[?2026l');
		});

		it('clears inFrame flag', () => {
			syncOut.beginFrame();
			expect(syncOut.inFrame).toBe(true);
			syncOut.endFrame();
			expect(syncOut.inFrame).toBe(false);
		});

		it('does nothing if not in frame', () => {
			syncOut.endFrame();
			expect(written).toBe('');
		});

		it('does nothing if not supported', () => {
			syncOut.supported = false;
			syncOut.beginFrame();
			syncOut.endFrame();
			expect(written).toBe('');
		});
	});

	describe('renderFrame', () => {
		it('wraps render function in sync markers', () => {
			syncOut.renderFrame(() => {
				output.write('content');
			});
			expect(written).toBe('\x1b[?2026hcontent\x1b[?2026l');
		});

		it('ends frame even if render throws', () => {
			expect(() => {
				syncOut.renderFrame(() => {
					throw new Error('render error');
				});
			}).toThrow('render error');
			expect(syncOut.inFrame).toBe(false);
		});

		it('skips markers if not supported', () => {
			syncOut.supported = false;
			syncOut.renderFrame(() => {
				output.write('content');
			});
			expect(written).toBe('content');
		});
	});

	describe('renderFrameAsync', () => {
		it('wraps async render function in sync markers', async () => {
			await syncOut.renderFrameAsync(async () => {
				output.write('async content');
			});
			expect(written).toBe('\x1b[?2026hasync content\x1b[?2026l');
		});

		it('ends frame even if render rejects', async () => {
			await expect(
				syncOut.renderFrameAsync(async () => {
					throw new Error('async error');
				}),
			).rejects.toThrow('async error');
			expect(syncOut.inFrame).toBe(false);
		});
	});

	describe('writeFrame', () => {
		it('writes content wrapped in sync markers', () => {
			syncOut.writeFrame('frame content');
			expect(written).toBe('\x1b[?2026hframe content\x1b[?2026l');
		});

		it('writes without markers if not supported', () => {
			syncOut.supported = false;
			syncOut.writeFrame('frame content');
			expect(written).toBe('frame content');
		});
	});

	describe('write', () => {
		it('writes content directly by default', () => {
			syncOut.write('content');
			expect(written).toBe('content');
		});

		it('wraps in sync markers if autoSync enabled', () => {
			syncOut.autoSync = true;
			syncOut.write('content');
			expect(written).toBe('\x1b[?2026hcontent\x1b[?2026l');
		});

		it('does not double-wrap if already in frame', () => {
			syncOut.autoSync = true;
			syncOut.beginFrame();
			written = '';
			syncOut.write('content');
			expect(written).toBe('content');
		});
	});

	describe('getBeginMarker', () => {
		it('returns begin marker if supported', () => {
			expect(syncOut.getBeginMarker()).toBe('\x1b[?2026h');
		});

		it('returns empty string if not supported', () => {
			syncOut.supported = false;
			expect(syncOut.getBeginMarker()).toBe('');
		});
	});

	describe('getEndMarker', () => {
		it('returns end marker if supported', () => {
			expect(syncOut.getEndMarker()).toBe('\x1b[?2026l');
		});

		it('returns empty string if not supported', () => {
			syncOut.supported = false;
			expect(syncOut.getEndMarker()).toBe('');
		});
	});
});

describe('isSyncOutputSupported', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.TERM = undefined;
		process.env.TERM_PROGRAM = undefined;
		process.env.TERM_PROGRAM_VERSION = undefined;
		process.env.KITTY_WINDOW_ID = undefined;
		process.env.TERMINAL_VERSION_STRING = undefined;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('returns true for kitty', () => {
		process.env.TERM = 'xterm-kitty';
		expect(isSyncOutputSupported()).toBe(true);
	});

	it('returns true for kitty via KITTY_WINDOW_ID', () => {
		process.env.KITTY_WINDOW_ID = '1';
		expect(isSyncOutputSupported()).toBe(true);
	});

	it('returns true for foot', () => {
		process.env.TERM = 'foot';
		expect(isSyncOutputSupported()).toBe(true);
	});

	it('returns true for WezTerm', () => {
		process.env.TERM_PROGRAM = 'WezTerm';
		expect(isSyncOutputSupported()).toBe(true);
	});

	it('returns true for iTerm2 3.5+', () => {
		process.env.TERM_PROGRAM = 'iTerm.app';
		process.env.TERM_PROGRAM_VERSION = '3.5.0';
		expect(isSyncOutputSupported()).toBe(true);
	});

	it('returns false for iTerm2 < 3.5', () => {
		process.env.TERM_PROGRAM = 'iTerm.app';
		process.env.TERM_PROGRAM_VERSION = '3.4.19';
		expect(isSyncOutputSupported()).toBe(false);
	});

	it('returns true for mintty', () => {
		process.env.TERM_PROGRAM = 'mintty';
		expect(isSyncOutputSupported()).toBe(true);
	});

	it('returns false by default', () => {
		process.env.TERM = 'xterm-256color';
		expect(isSyncOutputSupported()).toBe(false);
	});
});
