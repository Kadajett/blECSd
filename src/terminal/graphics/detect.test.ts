/**
 * Tests for terminal graphics capability detection.
 */

import { describe, expect, it } from 'vitest';
import {
	detectAnsiSupport,
	detectBrailleSupport,
	detectGraphicsSupport,
	detectITerm2Support,
	detectKittySupport,
	detectSixelSupport,
	type EnvChecker,
	getBestBackendName,
} from './detect';

// =============================================================================
// MOCK ENVIRONMENT CHECKER
// =============================================================================

function createMockEnv(vars: Record<string, string>): EnvChecker {
	return {
		getEnv: (name: string) => vars[name],
	};
}

// =============================================================================
// KITTY DETECTION
// =============================================================================

describe('detectKittySupport', () => {
	it('detects Kitty via TERM=xterm-kitty', () => {
		const env = createMockEnv({ TERM: 'xterm-kitty' });
		expect(detectKittySupport(env)).toBe(true);
	});

	it('detects Kitty via TERM_PROGRAM=kitty', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'kitty' });
		expect(detectKittySupport(env)).toBe(true);
	});

	it('detects Kitty via KITTY_WINDOW_ID', () => {
		const env = createMockEnv({ KITTY_WINDOW_ID: '1' });
		expect(detectKittySupport(env)).toBe(true);
	});

	it('returns false for non-Kitty terminals', () => {
		const env = createMockEnv({ TERM: 'xterm-256color' });
		expect(detectKittySupport(env)).toBe(false);
	});

	it('returns false for empty environment', () => {
		const env = createMockEnv({});
		expect(detectKittySupport(env)).toBe(false);
	});
});

// =============================================================================
// ITERM2 DETECTION
// =============================================================================

describe('detectITerm2Support', () => {
	it('detects iTerm2 via TERM_PROGRAM=iTerm.app', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'iTerm.app' });
		expect(detectITerm2Support(env)).toBe(true);
	});

	it('detects WezTerm via TERM_PROGRAM', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'WezTerm' });
		expect(detectITerm2Support(env)).toBe(true);
	});

	it('detects mintty via TERM_PROGRAM', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'mintty' });
		expect(detectITerm2Support(env)).toBe(true);
	});

	it('detects iTerm2 via LC_TERMINAL', () => {
		const env = createMockEnv({ LC_TERMINAL: 'iTerm.app' });
		expect(detectITerm2Support(env)).toBe(true);
	});

	it('returns false for non-iTerm2 terminals', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'xterm' });
		expect(detectITerm2Support(env)).toBe(false);
	});
});

// =============================================================================
// SIXEL DETECTION
// =============================================================================

describe('detectSixelSupport', () => {
	it('detects xterm with XTERM_VERSION', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'xterm', XTERM_VERSION: '370' });
		expect(detectSixelSupport(env)).toBe(true);
	});

	it('detects mlterm via TERM_PROGRAM', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'mlterm' });
		expect(detectSixelSupport(env)).toBe(true);
	});

	it('detects foot via TERM_PROGRAM', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'foot' });
		expect(detectSixelSupport(env)).toBe(true);
	});

	it('detects contour via TERM_PROGRAM', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'contour' });
		expect(detectSixelSupport(env)).toBe(true);
	});

	it('detects WezTerm via TERM_PROGRAM', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'WezTerm' });
		expect(detectSixelSupport(env)).toBe(true);
	});

	it('detects via TERM containing sixel', () => {
		const env = createMockEnv({ TERM: 'xterm-sixel' });
		expect(detectSixelSupport(env)).toBe(true);
	});

	it('detects mlterm via TERM', () => {
		const env = createMockEnv({ TERM: 'mlterm' });
		expect(detectSixelSupport(env)).toBe(true);
	});

	it('returns false for non-sixel terminals', () => {
		const env = createMockEnv({ TERM: 'xterm-256color' });
		expect(detectSixelSupport(env)).toBe(false);
	});
});

// =============================================================================
// ANSI DETECTION
// =============================================================================

describe('detectAnsiSupport', () => {
	it('returns false if NO_COLOR is set', () => {
		const env = createMockEnv({ NO_COLOR: '1' });
		expect(detectAnsiSupport(env)).toBe(false);
	});

	it('detects 256-color support via TERM', () => {
		const env = createMockEnv({ TERM: 'xterm-256color' });
		expect(detectAnsiSupport(env)).toBe(true);
	});

	it('detects iTerm2 support', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'iTerm.app' });
		expect(detectAnsiSupport(env)).toBe(true);
	});

	it('detects Kitty support', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'kitty' });
		expect(detectAnsiSupport(env)).toBe(true);
	});

	it('detects WezTerm support', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'WezTerm' });
		expect(detectAnsiSupport(env)).toBe(true);
	});

	it('detects Alacritty support', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'Alacritty' });
		expect(detectAnsiSupport(env)).toBe(true);
	});

	it('detects VSCode support', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'vscode' });
		expect(detectAnsiSupport(env)).toBe(true);
	});

	it('detects xterm derivatives', () => {
		const env = createMockEnv({ TERM: 'xterm' });
		expect(detectAnsiSupport(env)).toBe(true);
	});

	it('detects screen derivatives', () => {
		const env = createMockEnv({ TERM: 'screen' });
		expect(detectAnsiSupport(env)).toBe(true);
	});
});

// =============================================================================
// BRAILLE DETECTION
// =============================================================================

describe('detectBrailleSupport', () => {
	it('detects UTF-8 via LANG', () => {
		const env = createMockEnv({ LANG: 'en_US.UTF-8' });
		expect(detectBrailleSupport(env)).toBe(true);
	});

	it('detects utf8 (lowercase) via LANG', () => {
		const env = createMockEnv({ LANG: 'en_US.utf8' });
		expect(detectBrailleSupport(env)).toBe(true);
	});

	it('detects UTF-8 via LC_ALL', () => {
		const env = createMockEnv({ LC_ALL: 'en_US.UTF-8' });
		expect(detectBrailleSupport(env)).toBe(true);
	});

	it('detects modern terminals', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'iTerm.app' });
		expect(detectBrailleSupport(env)).toBe(true);
	});

	it('detects via TERM containing utf', () => {
		const env = createMockEnv({ TERM: 'xterm-utf8' });
		expect(detectBrailleSupport(env)).toBe(true);
	});

	it('defaults to true for empty environment', () => {
		const env = createMockEnv({});
		expect(detectBrailleSupport(env)).toBe(true);
	});
});

// =============================================================================
// COMBINED DETECTION
// =============================================================================

describe('detectGraphicsSupport', () => {
	it('returns all capabilities for Kitty', () => {
		const env = createMockEnv({ TERM: 'xterm-kitty', LANG: 'en_US.UTF-8' });
		const support = detectGraphicsSupport(env);
		expect(support.kitty).toBe(true);
		expect(support.iterm2).toBe(false);
		expect(support.sixel).toBe(false);
		expect(support.ansi).toBe(true);
		expect(support.braille).toBe(true);
	});

	it('returns all capabilities for iTerm2', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'iTerm.app', LANG: 'en_US.UTF-8' });
		const support = detectGraphicsSupport(env);
		expect(support.kitty).toBe(false);
		expect(support.iterm2).toBe(true);
		expect(support.sixel).toBe(false);
		expect(support.ansi).toBe(true);
		expect(support.braille).toBe(true);
	});

	it('returns minimal capabilities for basic terminal', () => {
		const env = createMockEnv({ TERM: 'xterm-256color', LANG: 'en_US.UTF-8' });
		const support = detectGraphicsSupport(env);
		expect(support.kitty).toBe(false);
		expect(support.iterm2).toBe(false);
		expect(support.sixel).toBe(false);
		expect(support.ansi).toBe(true);
		expect(support.braille).toBe(true);
	});
});

describe('getBestBackendName', () => {
	it('prefers Kitty over others', () => {
		const env = createMockEnv({ TERM: 'xterm-kitty', TERM_PROGRAM: 'iTerm.app' });
		expect(getBestBackendName(env)).toBe('kitty');
	});

	it('prefers iTerm2 when Kitty unavailable', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'iTerm.app' });
		expect(getBestBackendName(env)).toBe('iterm2');
	});

	it('prefers Sixel when Kitty and iTerm2 unavailable', () => {
		const env = createMockEnv({ TERM_PROGRAM: 'foot' });
		expect(getBestBackendName(env)).toBe('sixel');
	});

	it('prefers ANSI when native protocols unavailable', () => {
		const env = createMockEnv({ TERM: 'xterm-256color' });
		expect(getBestBackendName(env)).toBe('ansi');
	});

	it('falls back to braille when ANSI unavailable', () => {
		const env = createMockEnv({ NO_COLOR: '1', LANG: 'en_US.UTF-8' });
		expect(getBestBackendName(env)).toBe('braille');
	});

	it('defaults to braille for unknown terminals', () => {
		const env = createMockEnv({});
		expect(getBestBackendName(env)).toBe('braille');
	});
});
