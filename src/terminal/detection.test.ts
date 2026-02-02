/**
 * Tests for terminal detection
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	getColorDepth,
	getTerminalInfo,
	getTerminalVersion,
	isAlacritty,
	isBracketedPasteSupported,
	isColorSupported,
	isITerm2,
	isKitty,
	isMouseSupported,
	isScreen,
	isTmux,
	isTrueColorSupported,
	isUnicodeSupported,
	isVSCode,
	isVTE,
	isWindowsTerminal,
	isXterm,
} from './detection';

describe('terminal detection', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset environment
		process.env = { ...originalEnv };
		// Clear specific detection vars
		process.env.TMUX = undefined;
		process.env.STY = undefined;
		process.env.TERM = undefined;
		process.env.TERM_PROGRAM = undefined;
		process.env.TERM_PROGRAM_VERSION = undefined;
		process.env.VTE_VERSION = undefined;
		process.env.COLORTERM = undefined;
		process.env.NO_COLOR = undefined;
		process.env.FORCE_COLOR = undefined;
		process.env.WT_SESSION = undefined;
		process.env.KITTY_WINDOW_ID = undefined;
		process.env.LANG = undefined;
		process.env.LC_ALL = undefined;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('isTmux', () => {
		it('returns true when TMUX is set', () => {
			process.env.TMUX = '/tmp/tmux-1000/default,12345,0';
			expect(isTmux()).toBe(true);
		});

		it('returns false when TMUX is not set', () => {
			expect(isTmux()).toBe(false);
		});
	});

	describe('isScreen', () => {
		it('returns true when TERM starts with screen', () => {
			process.env.TERM = 'screen-256color';
			expect(isScreen()).toBe(true);
		});

		it('returns true when STY is set', () => {
			process.env.STY = '12345.pts-0.hostname';
			expect(isScreen()).toBe(true);
		});

		it('returns false when neither is set', () => {
			process.env.TERM = 'xterm-256color';
			expect(isScreen()).toBe(false);
		});
	});

	describe('isVSCode', () => {
		it('returns true when TERM_PROGRAM is vscode', () => {
			process.env.TERM_PROGRAM = 'vscode';
			expect(isVSCode()).toBe(true);
		});

		it('returns false otherwise', () => {
			process.env.TERM_PROGRAM = 'iTerm.app';
			expect(isVSCode()).toBe(false);
		});
	});

	describe('isXterm', () => {
		it('returns true for xterm TERM', () => {
			process.env.TERM = 'xterm-256color';
			expect(isXterm()).toBe(true);
		});

		it('returns true for Apple Terminal', () => {
			process.env.TERM_PROGRAM = 'Apple_Terminal';
			expect(isXterm()).toBe(true);
		});

		it('returns false for non-xterm', () => {
			process.env.TERM = 'linux';
			expect(isXterm()).toBe(false);
		});
	});

	describe('isVTE', () => {
		it('returns true when VTE_VERSION is set', () => {
			process.env.VTE_VERSION = '6003';
			expect(isVTE()).toBe(true);
		});

		it('returns false when VTE_VERSION is not set', () => {
			expect(isVTE()).toBe(false);
		});
	});

	describe('isITerm2', () => {
		it('returns true for iTerm.app', () => {
			process.env.TERM_PROGRAM = 'iTerm.app';
			expect(isITerm2()).toBe(true);
		});

		it('returns false otherwise', () => {
			expect(isITerm2()).toBe(false);
		});
	});

	describe('isAlacritty', () => {
		it('returns true for alacritty TERM', () => {
			process.env.TERM = 'alacritty';
			expect(isAlacritty()).toBe(true);
		});

		it('returns false otherwise', () => {
			process.env.TERM = 'xterm';
			expect(isAlacritty()).toBe(false);
		});
	});

	describe('isKitty', () => {
		it('returns true for xterm-kitty TERM', () => {
			process.env.TERM = 'xterm-kitty';
			expect(isKitty()).toBe(true);
		});

		it('returns true when KITTY_WINDOW_ID is set', () => {
			process.env.KITTY_WINDOW_ID = '1';
			expect(isKitty()).toBe(true);
		});

		it('returns false otherwise', () => {
			process.env.TERM = 'xterm';
			expect(isKitty()).toBe(false);
		});
	});

	describe('isWindowsTerminal', () => {
		it('returns true when WT_SESSION is set', () => {
			process.env.WT_SESSION = 'some-guid';
			expect(isWindowsTerminal()).toBe(true);
		});

		it('returns false otherwise', () => {
			expect(isWindowsTerminal()).toBe(false);
		});
	});
});

describe('color detection', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.NO_COLOR = undefined;
		process.env.FORCE_COLOR = undefined;
		process.env.COLORTERM = undefined;
		process.env.TERM = undefined;
		process.env.TERM_PROGRAM = undefined;
		process.env.VTE_VERSION = undefined;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('getColorDepth', () => {
		it('returns 2 when NO_COLOR is set', () => {
			process.env.NO_COLOR = '1';
			expect(getColorDepth()).toBe(2);
		});

		it('respects FORCE_COLOR=0', () => {
			process.env.FORCE_COLOR = '0';
			expect(getColorDepth()).toBe(2);
		});

		it('respects FORCE_COLOR=1', () => {
			process.env.FORCE_COLOR = '1';
			expect(getColorDepth()).toBe(16);
		});

		it('respects FORCE_COLOR=2', () => {
			process.env.FORCE_COLOR = '2';
			expect(getColorDepth()).toBe(256);
		});

		it('respects FORCE_COLOR=3', () => {
			process.env.FORCE_COLOR = '3';
			expect(getColorDepth()).toBe('truecolor');
		});

		it('returns truecolor for COLORTERM=truecolor', () => {
			process.env.COLORTERM = 'truecolor';
			expect(getColorDepth()).toBe('truecolor');
		});

		it('returns truecolor for COLORTERM=24bit', () => {
			process.env.COLORTERM = '24bit';
			expect(getColorDepth()).toBe('truecolor');
		});

		it('returns truecolor for iTerm2', () => {
			process.env.TERM_PROGRAM = 'iTerm.app';
			expect(getColorDepth()).toBe('truecolor');
		});

		it('returns truecolor for modern VTE', () => {
			process.env.VTE_VERSION = '5000';
			expect(getColorDepth()).toBe('truecolor');
		});

		it('returns 256 for 256color TERM', () => {
			process.env.TERM = 'xterm-256color';
			expect(getColorDepth()).toBe(256);
		});

		it('returns 256 for xterm TERM', () => {
			process.env.TERM = 'xterm';
			expect(getColorDepth()).toBe(256);
		});
	});

	describe('isColorSupported', () => {
		it('returns true for 256 colors', () => {
			process.env.TERM = 'xterm-256color';
			expect(isColorSupported()).toBe(true);
		});

		it('returns false when NO_COLOR is set', () => {
			process.env.NO_COLOR = '1';
			expect(isColorSupported()).toBe(false);
		});
	});

	describe('isTrueColorSupported', () => {
		it('returns true for truecolor', () => {
			process.env.COLORTERM = 'truecolor';
			expect(isTrueColorSupported()).toBe(true);
		});

		it('returns false for 256 colors', () => {
			process.env.TERM = 'xterm-256color';
			expect(isTrueColorSupported()).toBe(false);
		});
	});
});

describe('feature detection', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.LANG = undefined;
		process.env.LC_ALL = undefined;
		process.env.TERM = undefined;
		process.env.TERM_PROGRAM = undefined;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('isUnicodeSupported', () => {
		it('returns true for UTF-8 LANG', () => {
			process.env.LANG = 'en_US.UTF-8';
			expect(isUnicodeSupported()).toBe(true);
		});

		it('returns true for UTF-8 LC_ALL', () => {
			process.env.LC_ALL = 'en_US.UTF-8';
			expect(isUnicodeSupported()).toBe(true);
		});

		it('returns true for modern terminals', () => {
			process.env.TERM_PROGRAM = 'iTerm.app';
			expect(isUnicodeSupported()).toBe(true);
		});
	});

	describe('isMouseSupported', () => {
		it('returns true for xterm', () => {
			process.env.TERM = 'xterm-256color';
			expect(isMouseSupported()).toBe(true);
		});

		it('returns true for VTE', () => {
			process.env.VTE_VERSION = '5000';
			expect(isMouseSupported()).toBe(true);
		});
	});

	describe('isBracketedPasteSupported', () => {
		it('returns true for xterm', () => {
			process.env.TERM = 'xterm-256color';
			expect(isBracketedPasteSupported()).toBe(true);
		});

		it('returns true for VTE', () => {
			process.env.VTE_VERSION = '5000';
			expect(isBracketedPasteSupported()).toBe(true);
		});
	});
});

describe('getTerminalVersion', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.VTE_VERSION = undefined;
		process.env.TERM_PROGRAM = undefined;
		process.env.TERM_PROGRAM_VERSION = undefined;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('parses VTE version', () => {
		process.env.VTE_VERSION = '6003';
		expect(getTerminalVersion()).toBe('0.60.3');
	});

	it('returns iTerm2 version', () => {
		process.env.TERM_PROGRAM = 'iTerm.app';
		process.env.TERM_PROGRAM_VERSION = '3.4.19';
		expect(getTerminalVersion()).toBe('3.4.19');
	});

	it('returns undefined when no version available', () => {
		expect(getTerminalVersion()).toBeUndefined();
	});
});

describe('getTerminalInfo', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.TERM = 'xterm-256color';
		process.env.LANG = 'en_US.UTF-8';
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('returns complete terminal info', () => {
		const info = getTerminalInfo();

		expect(info).toHaveProperty('name');
		expect(info).toHaveProperty('colorSupport');
		expect(info).toHaveProperty('unicodeSupport');
		expect(info).toHaveProperty('mouseSupport');
		expect(info).toHaveProperty('bracketedPaste');
		expect(info).toHaveProperty('tmux');
		expect(info).toHaveProperty('screen');
		expect(info).toHaveProperty('vscode');
		expect(info).toHaveProperty('cols');
		expect(info).toHaveProperty('rows');
	});

	it('detects iTerm2 correctly', () => {
		process.env.TERM_PROGRAM = 'iTerm.app';
		const info = getTerminalInfo();
		expect(info.name).toBe('iTerm2');
		expect(info.colorSupport).toBe('truecolor');
	});

	it('detects tmux correctly', () => {
		process.env.TMUX = '/tmp/tmux-1000/default,12345,0';
		const info = getTerminalInfo();
		expect(info.tmux).toBe(true);
	});
});
