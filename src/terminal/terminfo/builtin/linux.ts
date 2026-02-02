/**
 * Builtin Linux console terminfo data.
 *
 * Provides hardcoded terminal capabilities for the Linux console (tty).
 *
 * @module terminal/terminfo/builtin/linux
 */

import type { TerminfoData } from '../tput';

/**
 * Linux console terminal capabilities.
 *
 * The native Linux virtual console (not a terminal emulator).
 * Supports 8 colors and basic VT102-compatible sequences.
 */
export const LINUX: TerminfoData = {
	name: 'linux',
	names: ['linux', 'linux console'],
	description: 'Linux console',
	booleans: {
		auto_right_margin: true,
		back_color_erase: true,
		can_change: true,
		eat_newline_glitch: true,
		has_meta_key: true,
		move_insert_mode: true,
		move_standout_mode: true,
	},
	numbers: {
		columns: 80,
		init_tabs: 8,
		lines: 25,
		max_colors: 8,
		max_pairs: 64,
	},
	strings: {
		// Cursor movement
		cursor_address: '\x1b[%i%p1%d;%p2%dH',
		cursor_down: '\n',
		cursor_home: '\x1b[H',
		cursor_left: '\b',
		cursor_right: '\x1b[C',
		cursor_up: '\x1b[A',
		cursor_invisible: '\x1b[?25l\x1b[?1c',
		cursor_normal: '\x1b[?25h\x1b[?0c',
		cursor_visible: '\x1b[?25h\x1b[?8c',

		// Screen manipulation
		clear_screen: '\x1b[H\x1b[J',
		clr_eol: '\x1b[K',
		clr_eos: '\x1b[J',
		scroll_forward: '\n',
		scroll_reverse: '\x1bM',
		change_scroll_region: '\x1b[%i%p1%d;%p2%dr',
		insert_line: '\x1b[L',
		delete_line: '\x1b[M',
		parm_insert_line: '\x1b[%p1%dL',
		parm_delete_line: '\x1b[%p1%dM',

		// Character attributes
		enter_bold_mode: '\x1b[1m',
		enter_dim_mode: '\x1b[2m',
		enter_blink_mode: '\x1b[5m',
		enter_reverse_mode: '\x1b[7m',
		enter_standout_mode: '\x1b[7m',
		enter_underline_mode: '\x1b[4m',
		exit_attribute_mode: '\x1b[m\x0f',
		exit_standout_mode: '\x1b[27m',
		exit_underline_mode: '\x1b[24m',

		// Colors (8-color)
		set_a_foreground: '\x1b[3%p1%dm',
		set_a_background: '\x1b[4%p1%dm',
		orig_pair: '\x1b[39;49m',
		initialize_color:
			'\x1b]P%p1%x%p2%{255}%*%{1000}%/%02x%p3%{255}%*%{1000}%/%02x%p4%{255}%*%{1000}%/%02x',

		// ACS for box drawing
		acs_chars:
			'+\x10,\x11-\x18.\x190\xdb`\x04a\xb1f\xf8g\xf1h\xb0i\xcfj\xd9k\xbfl\xdam\xc0n\xc5o~p\xc4q\xc4r\xc4s_t\xc3u\xb4v\xc1w\xc2x\xb3y\xf3z\xf2{\xe3|\xd8}\x9c~\xfe',
		enter_alt_charset_mode: '\x1b[11m',
		exit_alt_charset_mode: '\x1b[10m',

		// Keypad
		keypad_local: '',
		keypad_xmit: '',

		// Bell
		bell: '\x07',
		flash_screen: '\x1b[?5h\x1b[?5l',

		// Insert/delete
		insert_character: '\x1b[@',
		delete_character: '\x1b[P',
		parm_ich: '\x1b[%p1%d@',
		parm_dch: '\x1b[%p1%dP',

		// Tabs
		tab: '\t',
		back_tab: '\x1b[Z',

		// Other
		newline: '\n',
		carriage_return: '\r',
		reset_1string: '\x1bc',
		init_2string: '\x1b[?25h\x1b[?0c',

		// Key definitions
		key_up: '\x1b[A',
		key_down: '\x1b[B',
		key_right: '\x1b[C',
		key_left: '\x1b[D',
		key_home: '\x1b[1~',
		key_ic: '\x1b[2~',
		key_dc: '\x1b[3~',
		key_end: '\x1b[4~',
		key_ppage: '\x1b[5~',
		key_npage: '\x1b[6~',
		key_f1: '\x1b[[A',
		key_f2: '\x1b[[B',
		key_f3: '\x1b[[C',
		key_f4: '\x1b[[D',
		key_f5: '\x1b[[E',
		key_f6: '\x1b[17~',
		key_f7: '\x1b[18~',
		key_f8: '\x1b[19~',
		key_f9: '\x1b[20~',
		key_f10: '\x1b[21~',
		key_f11: '\x1b[23~',
		key_f12: '\x1b[24~',
		key_backspace: '\x7f',
		key_enter: '\r',
	},
};
