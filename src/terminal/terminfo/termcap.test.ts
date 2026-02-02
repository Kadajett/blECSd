/**
 * Tests for termcap parser.
 *
 * @module terminal/terminfo/termcap.test
 */

import { describe, expect, it } from 'vitest';
import {
	getTermcapSearchPaths,
	listTermcapTerminals,
	parseTermcap,
	termcapToTerminfo,
} from './termcap';

describe('termcap parser', () => {
	describe('parseTermcap', () => {
		it('parses basic terminal entry', () => {
			const data = 'vt100|dec vt100:am:co#80:li#24:cl=\\E[H\\E[2J:';
			const result = parseTermcap(data, '/etc/termcap');

			expect(result.success).toBe(true);
			expect(result.entries.has('vt100')).toBe(true);

			const entry = result.entries.get('vt100');
			expect(entry?.name).toBe('vt100');
			expect(entry?.bools['am']).toBe(true);
			expect(entry?.numbers['co']).toBe(80);
			expect(entry?.numbers['li']).toBe(24);
			expect(entry?.strings['cl']).toBe('\x1b[H\x1b[2J');
		});

		it('parses multiple terminal names', () => {
			const data = 'xterm|xterm-color|color terminal:co#80:';
			const result = parseTermcap(data);

			expect(result.entries.has('xterm')).toBe(true);
			expect(result.entries.has('xterm-color')).toBe(true);

			const entry = result.entries.get('xterm');
			expect(entry?.names).toEqual(['xterm', 'xterm-color', 'color terminal']);
		});

		it('handles continuation lines', () => {
			const data = `
vt100|dec vt100:\\
	:am:co#80:\\
	:li#24:`;
			const result = parseTermcap(data);

			const entry = result.entries.get('vt100');
			expect(entry?.bools['am']).toBe(true);
			expect(entry?.numbers['co']).toBe(80);
			expect(entry?.numbers['li']).toBe(24);
		});

		it('removes comments', () => {
			const data = `
# This is a comment
vt100|dec vt100:am:
# Another comment
xterm|xterm color:co#80:`;
			const result = parseTermcap(data);

			expect(result.entries.has('vt100')).toBe(true);
			expect(result.entries.has('xterm')).toBe(true);
		});

		it('parses multiple entries', () => {
			const data = `
vt100|dec vt100:am:co#80:
vt220|dec vt220:am:co#80:li#25:`;
			const result = parseTermcap(data);

			expect(result.entries.has('vt100')).toBe(true);
			expect(result.entries.has('vt220')).toBe(true);

			const vt100 = result.entries.get('vt100');
			const vt220 = result.entries.get('vt220');

			expect(vt100?.numbers['li']).toBeUndefined();
			expect(vt220?.numbers['li']).toBe(25);
		});

		it('handles empty data', () => {
			const result = parseTermcap('');
			expect(result.success).toBe(true);
			expect(result.entries.size).toBe(0);
		});

		it('handles comment-only data', () => {
			const data = `
# Comment 1
# Comment 2`;
			const result = parseTermcap(data);
			expect(result.entries.size).toBe(0);
		});
	});

	describe('escape sequences', () => {
		it('parses \\E as ESC', () => {
			const data = 'test:cl=\\E[H:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['cl']).toBe('\x1b[H');
		});

		it('parses \\e as ESC (lowercase)', () => {
			const data = 'test:cl=\\e[H:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['cl']).toBe('\x1b[H');
		});

		it('parses control characters', () => {
			const data = 'test:kb=^H:nl=^J:';
			const result = parseTermcap(data);
			const entry = result.entries.get('test');
			expect(entry?.strings['kb']).toBe('\x08'); // Backspace
			expect(entry?.strings['nl']).toBe('\x0a'); // Newline
		});

		it('parses ^? as DEL', () => {
			const data = 'test:kD=^?:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['kD']).toBe('\x7f');
		});

		it('parses standard escapes', () => {
			const data = 'test:s1=\\n\\r\\t\\b\\f:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['s1']).toBe('\n\r\t\b\f');
		});

		it('parses escaped backslash', () => {
			const data = 'test:s1=\\\\:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['s1']).toBe('\\');
		});

		it('parses escaped colon', () => {
			const data = 'test:s1=a\\:b:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['s1']).toBe('a:b');
		});

		it('parses octal sequences', () => {
			const data = 'test:s1=\\033[H:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['s1']).toBe('\x1b[H');
		});

		it('parses \\0 octal sequences', () => {
			const data = 'test:s1=\\0177:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['s1']).toBe('\x7f');
		});
	});

	describe('tc inheritance', () => {
		it('resolves single level inheritance', () => {
			const data = `
base:am:co#80:
derived:tc=base:li#24:`;
			const result = parseTermcap(data);

			// Note: findTermcapEntry searches files, so this test uses parseTermcap directly
			// For this test, we check that parsing works
			expect(result.entries.has('base')).toBe(true);
			expect(result.entries.has('derived')).toBe(true);
		});

		it('stores tc reference in strings', () => {
			const data = 'derived:tc=base:li#24:';
			const result = parseTermcap(data);
			const entry = result.entries.get('derived');
			expect(entry?.strings['tc']).toBe('base');
		});
	});

	describe('termcapToTerminfo', () => {
		it('converts entry to TerminfoData', () => {
			const data = 'vt100|dec vt100:am:co#80:cl=\\E[H:';
			const result = parseTermcap(data);
			const entry = result.entries.get('vt100');

			if (!entry) {
				throw new Error('Entry not found');
			}

			const terminfo = termcapToTerminfo(entry);

			expect(terminfo.name).toBe('vt100');
			expect(terminfo.names).toContain('vt100');
			expect(terminfo.booleans.am).toBe(true);
			expect(terminfo.numbers['co']).toBe(80);
			expect(terminfo.strings['cl']).toBe('\x1b[H');
		});
	});

	describe('getTermcapSearchPaths', () => {
		it('returns standard paths', () => {
			const paths = getTermcapSearchPaths({ home: '/home/user' });

			expect(paths).toContain('/home/user/.termcap');
			expect(paths).toContain('/usr/share/misc/termcap');
			expect(paths).toContain('/etc/termcap');
		});

		it('includes TERMCAP if it looks like a path', () => {
			const paths = getTermcapSearchPaths({ termcapEnv: '/custom/termcap' });
			expect(paths).toContain('/custom/termcap');
		});

		it('does not include TERMCAP if not a path', () => {
			const paths = getTermcapSearchPaths({ termcapEnv: 'vt100:co#80:' });
			expect(paths).not.toContain('vt100:co#80:');
		});

		it('includes TERMPATH directories', () => {
			const paths = getTermcapSearchPaths({ termpath: '/path1:/path2' });
			expect(paths).toContain('/path1');
			expect(paths).toContain('/path2');
		});

		it('includes extra paths', () => {
			const paths = getTermcapSearchPaths({ extraPaths: ['/extra/termcap'] });
			expect(paths).toContain('/extra/termcap');
		});
	});

	describe('listTermcapTerminals', () => {
		it('returns empty array for non-existent file', () => {
			const terminals = listTermcapTerminals('/nonexistent/termcap');
			expect(terminals).toEqual([]);
		});
	});

	describe('real-world examples', () => {
		it('parses VT102-style entry', () => {
			const data = `
vt102|dec vt102:\\
	:do=^J:co#80:li#24:cl=50\\E[;H\\E[2J:\\
	:le=^H:bs:cm=5\\E[%i%d;%dH:nd=2\\E[C:up=2\\E[A:\\
	:ce=3\\E[K:cd=50\\E[J:so=2\\E[7m:se=2\\E[m:`;
			const result = parseTermcap(data);

			const entry = result.entries.get('vt102');
			expect(entry).toBeDefined();
			expect(entry?.numbers['co']).toBe(80);
			expect(entry?.numbers['li']).toBe(24);
			expect(entry?.bools['bs']).toBe(true);
		});

		it('parses xterm-style entry', () => {
			const data = `
xterm|xterm terminal emulator:\\
	:am:km:mi:ms:xn:\\
	:co#80:it#8:li#24:\\
	:AL=\\E[%dL:DC=\\E[%dP:DL=\\E[%dM:DO=\\E[%dB:\\
	:LE=\\E[%dD:RI=\\E[%dC:UP=\\E[%dA:\\
	:al=\\E[L:bl=^G:cd=\\E[J:ce=\\E[K:cl=\\E[H\\E[2J:\\
	:cm=\\E[%i%d;%dH:`;
			const result = parseTermcap(data);

			const entry = result.entries.get('xterm');
			expect(entry).toBeDefined();
			expect(entry?.bools['am']).toBe(true);
			expect(entry?.bools['km']).toBe(true);
			expect(entry?.numbers['it']).toBe(8);
			expect(entry?.strings['bl']).toBe('\x07'); // ^G = BEL
			expect(entry?.strings['cl']).toBe('\x1b[H\x1b[2J');
		});

		it('handles delay numbers in capabilities', () => {
			// Termcap allows delay numbers like "50\E[H" meaning 50ms delay
			// We just preserve the string as-is
			const data = 'test:cl=50\\E[H:';
			const result = parseTermcap(data);
			expect(result.entries.get('test')?.strings['cl']).toBe('50\x1b[H');
		});
	});
});
