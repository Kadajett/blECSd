/**
 * Builtin VT100 terminfo data.
 *
 * Provides hardcoded terminal capabilities for VT100 and compatible terminals.
 * VT100 is the most basic common denominator for terminal emulation.
 *
 * @module terminal/terminfo/builtin/vt100
 */

import type { TerminfoData } from '../tput';

/**
 * VT100 terminal capabilities.
 *
 * Basic capabilities shared by virtually all terminal emulators.
 * No color support, limited cursor control.
 */
export const VT100: TerminfoData = {
	name: 'vt100',
	names: ['vt100', 'vt100-am', 'dec vt100'],
	description: 'DEC VT100',
	booleans: {
		auto_right_margin: true,
		eat_newline_glitch: true,
		move_standout_mode: true,
		xon_xoff: true,
	},
	numbers: {
		columns: 80,
		init_tabs: 8,
		lines: 24,
	},
	strings: {
		// Cursor movement
		cursor_address: '\x1b[%i%p1%d;%p2%dH',
		cursor_down: '\n',
		cursor_home: '\x1b[H',
		cursor_left: '\b',
		cursor_right: '\x1b[C',
		cursor_up: '\x1b[A',

		// Screen manipulation
		clear_screen: '\x1b[H\x1b[J',
		clr_eol: '\x1b[K',
		clr_eos: '\x1b[J',
		scroll_forward: '\n',
		scroll_reverse: '\x1bM',
		change_scroll_region: '\x1b[%i%p1%d;%p2%dr',

		// Character attributes
		enter_bold_mode: '\x1b[1m',
		enter_blink_mode: '\x1b[5m',
		enter_reverse_mode: '\x1b[7m',
		enter_standout_mode: '\x1b[7m',
		enter_underline_mode: '\x1b[4m',
		exit_attribute_mode: '\x1b[m',
		exit_standout_mode: '\x1b[m',
		exit_underline_mode: '\x1b[m',

		// Keypad
		keypad_local: '\x1b[?1l\x1b>',
		keypad_xmit: '\x1b[?1h\x1b=',

		// Bell
		bell: '\x07',

		// Other
		newline: '\r\n',
		carriage_return: '\r',

		// Save/restore cursor
		save_cursor: '\x1b7',
		restore_cursor: '\x1b8',

		// Key definitions
		key_up: '\x1bOA',
		key_down: '\x1bOB',
		key_right: '\x1bOC',
		key_left: '\x1bOD',
		key_backspace: '\b',
		key_enter: '\r',
	},
};

/**
 * VT220 terminal capabilities.
 *
 * Extended VT100 with additional features like insert/delete.
 */
export const VT220: TerminfoData = {
	...VT100,
	name: 'vt220',
	names: ['vt220', 'vt200', 'dec vt220'],
	description: 'DEC VT220',
	booleans: {
		...VT100.booleans,
		has_meta_key: true,
	},
	strings: {
		...VT100.strings,
		// Additional cursor control
		cursor_invisible: '\x1b[?25l',
		cursor_normal: '\x1b[?25h',

		// Insert/delete
		insert_character: '\x1b[@',
		delete_character: '\x1b[P',
		insert_line: '\x1b[L',
		delete_line: '\x1b[M',
		parm_ich: '\x1b[%p1%d@',
		parm_dch: '\x1b[%p1%dP',
		parm_insert_line: '\x1b[%p1%dL',
		parm_delete_line: '\x1b[%p1%dM',

		// Function keys
		key_f1: '\x1bOP',
		key_f2: '\x1bOQ',
		key_f3: '\x1bOR',
		key_f4: '\x1bOS',
		key_f5: '\x1b[15~',
		key_f6: '\x1b[17~',
		key_f7: '\x1b[18~',
		key_f8: '\x1b[19~',
		key_f9: '\x1b[20~',
		key_f10: '\x1b[21~',
		key_f11: '\x1b[23~',
		key_f12: '\x1b[24~',

		// Navigation
		key_home: '\x1b[1~',
		key_ic: '\x1b[2~',
		key_dc: '\x1b[3~',
		key_end: '\x1b[4~',
		key_ppage: '\x1b[5~',
		key_npage: '\x1b[6~',
	},
};
