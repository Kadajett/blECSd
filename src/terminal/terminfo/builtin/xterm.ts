/**
 * Builtin xterm-256color terminfo data.
 *
 * Provides hardcoded terminal capabilities for xterm and xterm-256color
 * when terminfo files are not available on the system.
 *
 * @module terminal/terminfo/builtin/xterm
 */

import type { TerminfoData } from '../tput';

/**
 * Standard xterm-256color capabilities.
 *
 * This data matches the output of `infocmp xterm-256color` on most systems.
 * Used as fallback when terminfo database is not available.
 */
export const XTERM_256COLOR: TerminfoData = {
	name: 'xterm-256color',
	names: ['xterm-256color', 'xterm with 256 colors'],
	description: 'xterm with 256 colors',
	booleans: {
		auto_left_margin: false,
		auto_right_margin: true,
		back_color_erase: true,
		can_change: false,
		ceol_standout_glitch: false,
		col_addr_glitch: false,
		eat_newline_glitch: true,
		erase_overstrike: false,
		generic_type: false,
		hard_copy: false,
		hard_cursor: false,
		has_meta_key: true,
		has_print_wheel: false,
		has_status_line: false,
		insert_null_glitch: false,
		memory_above: false,
		memory_below: false,
		move_insert_mode: true,
		move_standout_mode: true,
		needs_xon_xoff: false,
		no_esc_ctlc: false,
		no_pad_char: true,
		non_dest_scroll_region: false,
		non_rev_rmcup: false,
		over_strike: false,
		prtr_silent: false,
		row_addr_glitch: false,
		semi_auto_right_margin: false,
		status_line_esc_ok: false,
		tilde_glitch: false,
		transparent_underline: false,
		xon_xoff: false,
	},
	numbers: {
		columns: 80,
		init_tabs: 8,
		lines: 24,
		max_colors: 256,
		max_pairs: 65536,
	},
	strings: {
		// Cursor movement
		cursor_address: '\x1b[%i%p1%d;%p2%dH',
		cursor_down: '\n',
		cursor_home: '\x1b[H',
		cursor_left: '\b',
		cursor_right: '\x1b[C',
		cursor_up: '\x1b[A',
		cursor_invisible: '\x1b[?25l',
		cursor_normal: '\x1b[?12l\x1b[?25h',
		cursor_visible: '\x1b[?12;25h',

		// Screen manipulation
		clear_screen: '\x1b[H\x1b[2J',
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
		exit_attribute_mode: '\x1b(B\x1b[m',
		exit_standout_mode: '\x1b[27m',
		exit_underline_mode: '\x1b[24m',
		set_attributes:
			'\x1b[0%?%p6%t;1%;%?%p2%t;4%;%?%p1%p3%|%t;7%;%?%p4%t;5%;%?%p7%t;8%;m%?%p9%t\x1b(0%e\x1b(B%;',

		// Colors (256-color support with fallback)
		set_a_foreground: '\x1b[%?%p1%{8}%<%t3%p1%d%e%p1%{16}%<%t9%p1%{8}%-%d%e38;5;%p1%d%;m',
		set_a_background: '\x1b[%?%p1%{8}%<%t4%p1%d%e%p1%{16}%<%t10%p1%{8}%-%d%e48;5;%p1%d%;m',
		orig_pair: '\x1b[39;49m',
		orig_colors: '\x1b]104\x07',
		initialize_color:
			'\x1b]4;%p1%d;rgb:%p2%{255}%*%{1000}%/%2.2X/%p3%{255}%*%{1000}%/%2.2X/%p4%{255}%*%{1000}%/%2.2X\x1b\\',

		// Alternate screen
		enter_ca_mode: '\x1b[?1049h\x1b[22;0;0t',
		exit_ca_mode: '\x1b[?1049l\x1b[23;0;0t',

		// Keypad mode
		keypad_local: '\x1b[?1l\x1b>',
		keypad_xmit: '\x1b[?1h\x1b=',

		// Mouse
		key_mouse: '\x1b[<',

		// Bell
		bell: '\x07',
		flash_screen: '\x1b[?5h$<100/>\x1b[?5l',

		// Insert/delete characters
		insert_character: '\x1b[@',
		delete_character: '\x1b[P',
		parm_ich: '\x1b[%p1%d@',
		parm_dch: '\x1b[%p1%dP',
		enter_insert_mode: '\x1b[4h',
		exit_insert_mode: '\x1b[4l',

		// ACS (Alternate Character Set) for box drawing
		acs_chars: '``aaffggiijjkkllmmnnooppqqrrssttuuvvwwxxyyzz{{||}}~~',
		enter_alt_charset_mode: '\x1b(0',
		exit_alt_charset_mode: '\x1b(B',

		// Tabs
		tab: '\t',
		back_tab: '\x1b[Z',
		clear_all_tabs: '\x1b[3g',
		set_tab: '\x1bH',

		// Other
		newline: '\n',
		carriage_return: '\r',
		reset_1string: '\x1bc',
		reset_2string: '\x1b[!p\x1b[?3;4l\x1b[4l\x1b>',
		init_2string: '\x1b[!p\x1b[?3;4l\x1b[4l\x1b>',

		// Repeat character
		repeat_char: '\x1b[%p1%d%p2%c',

		// Save/restore cursor
		save_cursor: '\x1b7',
		restore_cursor: '\x1b8',

		// Parm cursor movement
		parm_down_cursor: '\x1b[%p1%dB',
		parm_left_cursor: '\x1b[%p1%dD',
		parm_right_cursor: '\x1b[%p1%dC',
		parm_up_cursor: '\x1b[%p1%dA',

		// Column/row addressing
		column_address: '\x1b[%i%p1%dG',
		row_address: '\x1b[%i%p1%dd',

		// Key definitions
		key_up: '\x1bOA',
		key_down: '\x1bOB',
		key_right: '\x1bOC',
		key_left: '\x1bOD',
		key_home: '\x1bOH',
		key_end: '\x1bOF',
		key_ic: '\x1b[2~',
		key_dc: '\x1b[3~',
		key_ppage: '\x1b[5~',
		key_npage: '\x1b[6~',
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
		key_backspace: '\x7f',
		key_enter: '\r',
	},
};

/**
 * Basic xterm (8-color) capabilities.
 *
 * For terminals that only support 8 colors.
 */
export const XTERM: TerminfoData = {
	...XTERM_256COLOR,
	name: 'xterm',
	names: ['xterm'],
	description: 'xterm terminal emulator (X Window System)',
	numbers: {
		...XTERM_256COLOR.numbers,
		max_colors: 8,
		max_pairs: 64,
	},
	strings: {
		...XTERM_256COLOR.strings,
		// Simpler color sequences for 8-color mode
		set_a_foreground: '\x1b[3%p1%dm',
		set_a_background: '\x1b[4%p1%dm',
	},
};

/**
 * xterm-16color capabilities.
 */
export const XTERM_16COLOR: TerminfoData = {
	...XTERM_256COLOR,
	name: 'xterm-16color',
	names: ['xterm-16color'],
	description: 'xterm with 16 colors',
	numbers: {
		...XTERM_256COLOR.numbers,
		max_colors: 16,
		max_pairs: 256,
	},
	strings: {
		...XTERM_256COLOR.strings,
		// 16-color sequences
		set_a_foreground: '\x1b[%?%p1%{8}%<%t3%p1%d%e9%p1%{8}%-%d%;m',
		set_a_background: '\x1b[%?%p1%{8}%<%t4%p1%d%e10%p1%{8}%-%d%;m',
	},
};
