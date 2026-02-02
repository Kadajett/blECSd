/**
 * Terminfo binary format parser.
 *
 * Parses compiled terminfo database files (.tic format) into structured data.
 * Supports both legacy 16-bit and extended 32-bit formats.
 *
 * @module terminal/terminfo/parser
 *
 * @example
 * ```typescript
 * import { parseTerminfo, readTerminfoFile } from 'blecsd';
 * import { readFileSync } from 'fs';
 *
 * // Parse from buffer
 * const buffer = readFileSync('/usr/share/terminfo/x/xterm');
 * const data = parseTerminfo(buffer);
 *
 * // Or read by terminal name
 * const data2 = readTerminfoFile('xterm-256color');
 * ```
 */

import type { TerminfoData } from './tput';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Legacy terminfo magic number (16-bit numbers) */
export const TERMINFO_MAGIC_LEGACY = 0x011a;

/** Extended terminfo magic number (32-bit numbers) */
export const TERMINFO_MAGIC_EXTENDED = 0x021e;

/** Absent capability marker for booleans */
const ABSENT_BOOLEAN = 0;

/** Absent capability marker for numbers (16-bit) */
const ABSENT_NUMBER_16 = 0xffff;

/** Absent capability marker for numbers (32-bit) */
const ABSENT_NUMBER_32 = 0xffffffff;

/** Absent/cancelled capability marker for strings */
const ABSENT_STRING = 0xffff;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Terminfo binary file header structure.
 * Describes the layout of data sections in the file.
 */
export interface TerminfoHeader {
	/** Magic number (0x011a for legacy, 0x021e for extended) */
	readonly magic: number;
	/** Size of names section in bytes */
	readonly nameSize: number;
	/** Number of boolean capabilities */
	readonly boolCount: number;
	/** Number of numeric capabilities */
	readonly numCount: number;
	/** Number of string capabilities */
	readonly stringCount: number;
	/** Size of string table in bytes */
	readonly stringTableSize: number;
}

/**
 * Extended terminfo section (NCurses 5+ extension).
 * Contains user-defined capabilities beyond the standard set.
 */
export interface TerminfoExtended {
	/** Extended boolean capabilities */
	readonly booleans: Readonly<Record<string, boolean>>;
	/** Extended numeric capabilities */
	readonly numbers: Readonly<Record<string, number>>;
	/** Extended string capabilities */
	readonly strings: Readonly<Record<string, string>>;
}

/**
 * Parser result containing parsed terminfo data.
 */
export interface ParsedTerminfo {
	/** Primary terminal name */
	readonly name: string;
	/** All terminal name aliases */
	readonly names: readonly string[];
	/** Terminal description */
	readonly description: string;
	/** Boolean capabilities */
	readonly booleans: Readonly<Record<string, boolean>>;
	/** Numeric capabilities */
	readonly numbers: Readonly<Record<string, number>>;
	/** String capabilities */
	readonly strings: Readonly<Record<string, string>>;
	/** Extended capabilities (if present) */
	readonly extended?: TerminfoExtended;
}

/**
 * Parser error types for better error handling.
 */
export type ParserErrorType =
	| 'INVALID_MAGIC'
	| 'TRUNCATED_HEADER'
	| 'TRUNCATED_NAMES'
	| 'TRUNCATED_BOOLEANS'
	| 'TRUNCATED_NUMBERS'
	| 'TRUNCATED_STRINGS'
	| 'INVALID_STRING_OFFSET';

/**
 * Parser result with success/failure status.
 */
export type ParseResult =
	| { readonly success: true; readonly data: ParsedTerminfo }
	| { readonly success: false; readonly error: ParserErrorType; readonly message: string };

// =============================================================================
// CAPABILITY NAME MAPPINGS
// =============================================================================

/**
 * Standard boolean capability names in terminfo order.
 * Order matters - index corresponds to position in binary file.
 */
const BOOLEAN_NAMES: readonly string[] = [
	'auto_left_margin',
	'auto_right_margin',
	'no_esc_ctlc',
	'ceol_standout_glitch',
	'eat_newline_glitch',
	'erase_overstrike',
	'generic_type',
	'hard_copy',
	'has_meta_key',
	'has_status_line',
	'insert_null_glitch',
	'memory_above',
	'memory_below',
	'move_insert_mode',
	'move_standout_mode',
	'over_strike',
	'status_line_esc_ok',
	'dest_tabs_magic_smso',
	'tilde_glitch',
	'transparent_underline',
	'xon_xoff',
	'needs_xon_xoff',
	'prtr_silent',
	'hard_cursor',
	'non_rev_rmcup',
	'no_pad_char',
	'non_dest_scroll_region',
	'can_change',
	'back_color_erase',
	'hue_lightness_saturation',
	'col_addr_glitch',
	'cr_cancels_micro_mode',
	'has_print_wheel',
	'row_addr_glitch',
	'semi_auto_right_margin',
	'cpi_changes_res',
	'lpi_changes_res',
];

/**
 * Standard numeric capability names in terminfo order.
 */
const NUMBER_NAMES: readonly string[] = [
	'columns',
	'init_tabs',
	'lines',
	'lines_of_memory',
	'magic_cookie_glitch',
	'padding_baud_rate',
	'virtual_terminal',
	'width_status_line',
	'num_labels',
	'label_height',
	'label_width',
	'max_attributes',
	'maximum_windows',
	'max_colors',
	'max_pairs',
	'no_color_video',
	'buffer_capacity',
	'dot_vert_spacing',
	'dot_horz_spacing',
	'max_micro_address',
	'max_micro_jump',
	'micro_col_size',
	'micro_line_size',
	'number_of_pins',
	'output_res_char',
	'output_res_line',
	'output_res_horz_inch',
	'output_res_vert_inch',
	'print_rate',
	'wide_char_size',
	'buttons',
	'bit_image_entwining',
	'bit_image_type',
];

/**
 * Standard string capability names in terminfo order.
 */
const STRING_NAMES: readonly string[] = [
	'back_tab',
	'bell',
	'carriage_return',
	'change_scroll_region',
	'clear_all_tabs',
	'clear_screen',
	'clr_eol',
	'clr_eos',
	'column_address',
	'command_character',
	'cursor_address',
	'cursor_down',
	'cursor_home',
	'cursor_invisible',
	'cursor_left',
	'cursor_mem_address',
	'cursor_normal',
	'cursor_right',
	'cursor_to_ll',
	'cursor_up',
	'cursor_visible',
	'delete_character',
	'delete_line',
	'dis_status_line',
	'down_half_line',
	'enter_alt_charset_mode',
	'enter_blink_mode',
	'enter_bold_mode',
	'enter_ca_mode',
	'enter_delete_mode',
	'enter_dim_mode',
	'enter_insert_mode',
	'enter_secure_mode',
	'enter_protected_mode',
	'enter_reverse_mode',
	'enter_standout_mode',
	'enter_underline_mode',
	'erase_chars',
	'exit_alt_charset_mode',
	'exit_attribute_mode',
	'exit_ca_mode',
	'exit_delete_mode',
	'exit_insert_mode',
	'exit_standout_mode',
	'exit_underline_mode',
	'flash_screen',
	'form_feed',
	'from_status_line',
	'init_1string',
	'init_2string',
	'init_3string',
	'init_file',
	'insert_character',
	'insert_line',
	'insert_padding',
	'key_backspace',
	'key_catab',
	'key_clear',
	'key_ctab',
	'key_dc',
	'key_dl',
	'key_down',
	'key_eic',
	'key_eol',
	'key_eos',
	'key_f0',
	'key_f1',
	'key_f10',
	'key_f2',
	'key_f3',
	'key_f4',
	'key_f5',
	'key_f6',
	'key_f7',
	'key_f8',
	'key_f9',
	'key_home',
	'key_ic',
	'key_il',
	'key_left',
	'key_ll',
	'key_npage',
	'key_ppage',
	'key_right',
	'key_sf',
	'key_sr',
	'key_stab',
	'key_up',
	'keypad_local',
	'keypad_xmit',
	'lab_f0',
	'lab_f1',
	'lab_f10',
	'lab_f2',
	'lab_f3',
	'lab_f4',
	'lab_f5',
	'lab_f6',
	'lab_f7',
	'lab_f8',
	'lab_f9',
	'meta_off',
	'meta_on',
	'newline',
	'pad_char',
	'parm_dch',
	'parm_delete_line',
	'parm_down_cursor',
	'parm_ich',
	'parm_index',
	'parm_insert_line',
	'parm_left_cursor',
	'parm_right_cursor',
	'parm_rindex',
	'parm_up_cursor',
	'pkey_key',
	'pkey_local',
	'pkey_xmit',
	'print_screen',
	'prtr_off',
	'prtr_on',
	'repeat_char',
	'reset_1string',
	'reset_2string',
	'reset_3string',
	'reset_file',
	'restore_cursor',
	'row_address',
	'save_cursor',
	'scroll_forward',
	'scroll_reverse',
	'set_attributes',
	'set_tab',
	'set_window',
	'tab',
	'to_status_line',
	'underline_char',
	'up_half_line',
	'init_prog',
	'key_a1',
	'key_a3',
	'key_b2',
	'key_c1',
	'key_c3',
	'prtr_non',
	'char_padding',
	'acs_chars',
	'plab_norm',
	'key_btab',
	'enter_xon_mode',
	'exit_xon_mode',
	'enter_am_mode',
	'exit_am_mode',
	'xon_character',
	'xoff_character',
	'ena_acs',
	'label_on',
	'label_off',
	'key_beg',
	'key_cancel',
	'key_close',
	'key_command',
	'key_copy',
	'key_create',
	'key_end',
	'key_enter',
	'key_exit',
	'key_find',
	'key_help',
	'key_mark',
	'key_message',
	'key_move',
	'key_next',
	'key_open',
	'key_options',
	'key_previous',
	'key_print',
	'key_redo',
	'key_reference',
	'key_refresh',
	'key_replace',
	'key_restart',
	'key_resume',
	'key_save',
	'key_suspend',
	'key_undo',
	'key_sbeg',
	'key_scancel',
	'key_scommand',
	'key_scopy',
	'key_screate',
	'key_sdc',
	'key_sdl',
	'key_select',
	'key_send',
	'key_seol',
	'key_sexit',
	'key_sfind',
	'key_shelp',
	'key_shome',
	'key_sic',
	'key_sleft',
	'key_smessage',
	'key_smove',
	'key_snext',
	'key_soptions',
	'key_sprevious',
	'key_sprint',
	'key_sredo',
	'key_sreplace',
	'key_sright',
	'key_srsume',
	'key_ssave',
	'key_ssuspend',
	'key_sundo',
	'req_for_input',
	'key_f11',
	'key_f12',
	'key_f13',
	'key_f14',
	'key_f15',
	'key_f16',
	'key_f17',
	'key_f18',
	'key_f19',
	'key_f20',
	'key_f21',
	'key_f22',
	'key_f23',
	'key_f24',
	'key_f25',
	'key_f26',
	'key_f27',
	'key_f28',
	'key_f29',
	'key_f30',
	'key_f31',
	'key_f32',
	'key_f33',
	'key_f34',
	'key_f35',
	'key_f36',
	'key_f37',
	'key_f38',
	'key_f39',
	'key_f40',
	'key_f41',
	'key_f42',
	'key_f43',
	'key_f44',
	'key_f45',
	'key_f46',
	'key_f47',
	'key_f48',
	'key_f49',
	'key_f50',
	'key_f51',
	'key_f52',
	'key_f53',
	'key_f54',
	'key_f55',
	'key_f56',
	'key_f57',
	'key_f58',
	'key_f59',
	'key_f60',
	'key_f61',
	'key_f62',
	'key_f63',
	'clr_bol',
	'clear_margins',
	'set_left_margin',
	'set_right_margin',
	'label_format',
	'set_clock',
	'display_clock',
	'remove_clock',
	'create_window',
	'goto_window',
	'hangup',
	'dial_phone',
	'quick_dial',
	'tone',
	'pulse',
	'flash_hook',
	'fixed_pause',
	'wait_tone',
	'user0',
	'user1',
	'user2',
	'user3',
	'user4',
	'user5',
	'user6',
	'user7',
	'user8',
	'user9',
	'orig_pair',
	'orig_colors',
	'initialize_color',
	'initialize_pair',
	'set_color_pair',
	'set_foreground',
	'set_background',
	'change_char_pitch',
	'change_line_pitch',
	'change_res_horz',
	'change_res_vert',
	'define_char',
	'enter_doublewide_mode',
	'enter_draft_quality',
	'enter_italics_mode',
	'enter_leftward_mode',
	'enter_micro_mode',
	'enter_near_letter_quality',
	'enter_normal_quality',
	'enter_shadow_mode',
	'enter_subscript_mode',
	'enter_superscript_mode',
	'enter_upward_mode',
	'exit_doublewide_mode',
	'exit_italics_mode',
	'exit_leftward_mode',
	'exit_micro_mode',
	'exit_shadow_mode',
	'exit_subscript_mode',
	'exit_superscript_mode',
	'exit_upward_mode',
	'micro_column_address',
	'micro_down',
	'micro_left',
	'micro_right',
	'micro_row_address',
	'micro_up',
	'order_of_pins',
	'parm_down_micro',
	'parm_left_micro',
	'parm_right_micro',
	'parm_up_micro',
	'select_char_set',
	'set_bottom_margin',
	'set_bottom_margin_parm',
	'set_left_margin_parm',
	'set_right_margin_parm',
	'set_top_margin',
	'set_top_margin_parm',
	'start_bit_image',
	'start_char_set_def',
	'stop_bit_image',
	'stop_char_set_def',
	'subscript_characters',
	'superscript_characters',
	'these_cause_cr',
	'zero_motion',
	'char_set_names',
	'key_mouse',
	'mouse_info',
	'req_mouse_pos',
	'get_mouse',
	'set_a_foreground',
	'set_a_background',
	'pkey_plab',
	'device_type',
	'code_set_init',
	'set0_des_seq',
	'set1_des_seq',
	'set2_des_seq',
	'set3_des_seq',
	'set_lr_margin',
	'set_tb_margin',
	'bit_image_repeat',
	'bit_image_newline',
	'bit_image_carriage_return',
	'color_names',
	'define_bit_image_region',
	'end_bit_image_region',
	'set_color_band',
	'set_page_length',
	'display_pc_char',
	'enter_pc_charset_mode',
	'exit_pc_charset_mode',
	'enter_scancode_mode',
	'exit_scancode_mode',
	'pc_term_options',
	'scancode_escape',
	'alt_scancode_esc',
	'enter_horizontal_hl_mode',
	'enter_left_hl_mode',
	'enter_low_hl_mode',
	'enter_right_hl_mode',
	'enter_top_hl_mode',
	'enter_vertical_hl_mode',
	'set_a_attributes',
	'set_pglen_inch',
	'termcap_init2',
	'termcap_reset',
	'linefeed_if_not_lf',
	'backspace_if_not_bs',
	'other_non_function_keys',
	'arrow_key_map',
	'acs_ulcorner',
	'acs_llcorner',
	'acs_urcorner',
	'acs_lrcorner',
	'acs_ltee',
	'acs_rtee',
	'acs_btee',
	'acs_ttee',
	'acs_hline',
	'acs_vline',
	'acs_plus',
	'memory_lock',
	'memory_unlock',
	'box_chars_1',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Reads a 16-bit little-endian integer from buffer.
 */
function readInt16LE(buffer: Buffer, offset: number): number {
	return buffer.readUInt16LE(offset);
}

/**
 * Reads a 32-bit little-endian integer from buffer.
 */
function readInt32LE(buffer: Buffer, offset: number): number {
	return buffer.readInt32LE(offset);
}

/**
 * Reads a null-terminated string from buffer.
 */
function readNullTerminatedString(buffer: Buffer, offset: number, maxLength: number): string {
	let end = offset;
	const limit = Math.min(offset + maxLength, buffer.length);
	while (end < limit && buffer[end] !== 0) {
		end++;
	}
	return buffer.subarray(offset, end).toString('latin1');
}

/**
 * Parses the names section of terminfo.
 * Names are pipe-separated with description after last pipe.
 */
function parseNames(namesStr: string): { names: string[]; description: string } {
	const parts = namesStr.split('|');
	if (parts.length === 0) {
		return { names: ['unknown'], description: '' };
	}

	// Last part is typically the description
	const description = parts.length > 1 ? parts[parts.length - 1] ?? '' : '';
	const names = parts.length > 1 ? parts.slice(0, -1) : parts;

	return {
		names: names.filter((n) => n.length > 0),
		description: description.trim(),
	};
}

// =============================================================================
// PARSER IMPLEMENTATION
// =============================================================================

/**
 * Parses the terminfo header from buffer.
 *
 * @param buffer - Buffer containing terminfo data
 * @returns ParseResult with header or error
 */
function parseHeader(buffer: Buffer): ParseResult | { header: TerminfoHeader; offset: number } {
	if (buffer.length < 12) {
		return {
			success: false,
			error: 'TRUNCATED_HEADER',
			message: `Buffer too small for header: ${buffer.length} bytes (need 12)`,
		};
	}

	const magic = readInt16LE(buffer, 0);

	if (magic !== TERMINFO_MAGIC_LEGACY && magic !== TERMINFO_MAGIC_EXTENDED) {
		return {
			success: false,
			error: 'INVALID_MAGIC',
			message: `Invalid magic number: 0x${magic.toString(16)} (expected 0x011a or 0x021e)`,
		};
	}

	const header: TerminfoHeader = {
		magic,
		nameSize: readInt16LE(buffer, 2),
		boolCount: readInt16LE(buffer, 4),
		numCount: readInt16LE(buffer, 6),
		stringCount: readInt16LE(buffer, 8),
		stringTableSize: readInt16LE(buffer, 10),
	};

	return { header, offset: 12 };
}

/**
 * Parses boolean capabilities.
 */
function parseBooleans(
	buffer: Buffer,
	offset: number,
	count: number,
): { booleans: Record<string, boolean>; offset: number } | ParseResult {
	const booleans: Record<string, boolean> = {};

	if (offset + count > buffer.length) {
		return {
			success: false,
			error: 'TRUNCATED_BOOLEANS',
			message: `Buffer truncated in boolean section at offset ${offset}`,
		};
	}

	for (let i = 0; i < count; i++) {
		const value = buffer[offset + i];
		if (value !== ABSENT_BOOLEAN && i < BOOLEAN_NAMES.length) {
			const name = BOOLEAN_NAMES[i];
			if (name) {
				booleans[name] = true;
			}
		}
	}

	// Align to even boundary for number section
	let newOffset = offset + count;
	if (newOffset % 2 !== 0) {
		newOffset++;
	}

	return { booleans, offset: newOffset };
}

/**
 * Parses numeric capabilities.
 */
function parseNumbers(
	buffer: Buffer,
	offset: number,
	count: number,
	is32bit: boolean,
): { numbers: Record<string, number>; offset: number } | ParseResult {
	const numbers: Record<string, number> = {};
	const size = is32bit ? 4 : 2;
	const absent = is32bit ? ABSENT_NUMBER_32 : ABSENT_NUMBER_16;

	if (offset + count * size > buffer.length) {
		return {
			success: false,
			error: 'TRUNCATED_NUMBERS',
			message: `Buffer truncated in numeric section at offset ${offset}`,
		};
	}

	for (let i = 0; i < count; i++) {
		const value = is32bit ? readInt32LE(buffer, offset + i * size) : readInt16LE(buffer, offset + i * size);

		if (value !== absent && value >= 0 && i < NUMBER_NAMES.length) {
			const name = NUMBER_NAMES[i];
			if (name) {
				numbers[name] = value;
			}
		}
	}

	return { numbers, offset: offset + count * size };
}

/**
 * Parses string capabilities.
 */
function parseStrings(
	buffer: Buffer,
	offset: number,
	count: number,
	tableSize: number,
): { strings: Record<string, string>; offset: number } | ParseResult {
	const strings: Record<string, string> = {};
	const offsetsSize = count * 2;

	if (offset + offsetsSize + tableSize > buffer.length) {
		return {
			success: false,
			error: 'TRUNCATED_STRINGS',
			message: `Buffer truncated in string section at offset ${offset}`,
		};
	}

	const tableStart = offset + offsetsSize;

	for (let i = 0; i < count; i++) {
		const strOffset = readInt16LE(buffer, offset + i * 2);

		if (strOffset !== ABSENT_STRING && strOffset >= 0 && strOffset < tableSize) {
			if (i < STRING_NAMES.length) {
				const name = STRING_NAMES[i];
				if (name) {
					const str = readNullTerminatedString(buffer, tableStart + strOffset, tableSize - strOffset);
					if (str.length > 0) {
						strings[name] = str;
					}
				}
			}
		}
	}

	return { strings, offset: tableStart + tableSize };
}

/**
 * Parses extended capabilities section (NCurses 5+ extension).
 */
function parseExtended(
	buffer: Buffer,
	offset: number,
	is32bit: boolean,
): { extended: TerminfoExtended; offset: number } | null {
	// Align to even boundary
	if (offset % 2 !== 0) {
		offset++;
	}

	// Need at least 10 bytes for extended header
	if (offset + 10 > buffer.length) {
		return null;
	}

	const extBoolCount = readInt16LE(buffer, offset);
	const extNumCount = readInt16LE(buffer, offset + 2);
	const extStrCount = readInt16LE(buffer, offset + 4);
	const extStrTableCount = readInt16LE(buffer, offset + 6);
	const extStrTableSize = readInt16LE(buffer, offset + 8);

	offset += 10;

	const extended: TerminfoExtended = {
		booleans: {},
		numbers: {},
		strings: {},
	};

	// Skip extended capabilities parsing for now - return empty extended
	// Full implementation would read extended booleans, numbers, strings, and name table
	// This is complex and rarely needed for basic terminal operations

	return { extended, offset: offset + extBoolCount + extNumCount * (is32bit ? 4 : 2) + extStrTableSize };
}

/**
 * Parses a terminfo binary buffer.
 *
 * Supports both legacy (16-bit) and extended (32-bit) formats.
 *
 * @param buffer - Buffer containing compiled terminfo data
 * @returns ParseResult with parsed data or error
 *
 * @example
 * ```typescript
 * import { parseTerminfo } from 'blecsd';
 * import { readFileSync } from 'fs';
 *
 * const buffer = readFileSync('/usr/share/terminfo/x/xterm-256color');
 * const result = parseTerminfo(buffer);
 *
 * if (result.success) {
 *   console.log(`Terminal: ${result.data.name}`);
 *   console.log(`Max colors: ${result.data.numbers['max_colors']}`);
 * } else {
 *   console.error(`Parse error: ${result.message}`);
 * }
 * ```
 */
export function parseTerminfo(buffer: Buffer): ParseResult {
	// Parse header
	const headerResult = parseHeader(buffer);
	if ('success' in headerResult && !headerResult.success) {
		return headerResult;
	}
	if (!('header' in headerResult)) {
		return headerResult as ParseResult;
	}

	const { header } = headerResult;
	let offset = headerResult.offset;
	const is32bit = header.magic === TERMINFO_MAGIC_EXTENDED;

	// Parse names section
	if (offset + header.nameSize > buffer.length) {
		return {
			success: false,
			error: 'TRUNCATED_NAMES',
			message: `Buffer truncated in names section at offset ${offset}`,
		};
	}

	const namesStr = readNullTerminatedString(buffer, offset, header.nameSize);
	const { names, description } = parseNames(namesStr);
	offset += header.nameSize;

	// Parse booleans
	const boolResult = parseBooleans(buffer, offset, header.boolCount);
	if ('success' in boolResult && !boolResult.success) {
		return boolResult;
	}
	if (!('booleans' in boolResult)) {
		return boolResult as ParseResult;
	}
	const { booleans } = boolResult;
	offset = boolResult.offset;

	// Parse numbers
	const numResult = parseNumbers(buffer, offset, header.numCount, is32bit);
	if ('success' in numResult && !numResult.success) {
		return numResult;
	}
	if (!('numbers' in numResult)) {
		return numResult as ParseResult;
	}
	const { numbers } = numResult;
	offset = numResult.offset;

	// Parse strings
	const strResult = parseStrings(buffer, offset, header.stringCount, header.stringTableSize);
	if ('success' in strResult && !strResult.success) {
		return strResult;
	}
	if (!('strings' in strResult)) {
		return strResult as ParseResult;
	}
	const { strings } = strResult;
	offset = strResult.offset;

	// Parse extended section if present
	let extended: TerminfoExtended | undefined;
	if (offset < buffer.length) {
		const extResult = parseExtended(buffer, offset, is32bit);
		if (extResult) {
			extended = extResult.extended;
		}
	}

	const data: ParsedTerminfo = {
		name: names[0] ?? 'unknown',
		names,
		description,
		booleans,
		numbers,
		strings,
		...(extended ? { extended } : {}),
	};

	return { success: true, data };
}

/**
 * Converts ParsedTerminfo to TerminfoData format.
 * TerminfoData is the format used by the Tput interface.
 *
 * @param parsed - Parsed terminfo data
 * @returns TerminfoData compatible format
 *
 * @example
 * ```typescript
 * import { parseTerminfo, toTerminfoData } from 'blecsd';
 *
 * const result = parseTerminfo(buffer);
 * if (result.success) {
 *   const data = toTerminfoData(result.data);
 *   const tput = createTput({ data });
 * }
 * ```
 */
export function toTerminfoData(parsed: ParsedTerminfo): TerminfoData {
	return {
		name: parsed.name,
		names: parsed.names,
		description: parsed.description,
		booleans: parsed.booleans,
		numbers: parsed.numbers,
		strings: parsed.strings,
	};
}

/**
 * Validates that a buffer contains valid terminfo data.
 * Does a quick check without full parsing.
 *
 * @param buffer - Buffer to validate
 * @returns true if buffer appears to be valid terminfo
 *
 * @example
 * ```typescript
 * import { isValidTerminfo } from 'blecsd';
 *
 * if (isValidTerminfo(buffer)) {
 *   const result = parseTerminfo(buffer);
 * }
 * ```
 */
export function isValidTerminfo(buffer: Buffer): boolean {
	if (buffer.length < 12) {
		return false;
	}

	const magic = readInt16LE(buffer, 0);
	return magic === TERMINFO_MAGIC_LEGACY || magic === TERMINFO_MAGIC_EXTENDED;
}

/**
 * Gets the terminfo format version from a buffer.
 *
 * @param buffer - Buffer to check
 * @returns 'legacy' for 16-bit, 'extended' for 32-bit, null if invalid
 *
 * @example
 * ```typescript
 * import { getTerminfoFormat } from 'blecsd';
 *
 * const format = getTerminfoFormat(buffer);
 * console.log(`Format: ${format}`); // 'legacy' or 'extended'
 * ```
 */
export function getTerminfoFormat(buffer: Buffer): 'legacy' | 'extended' | null {
	if (buffer.length < 2) {
		return null;
	}

	const magic = readInt16LE(buffer, 0);

	if (magic === TERMINFO_MAGIC_LEGACY) {
		return 'legacy';
	}
	if (magic === TERMINFO_MAGIC_EXTENDED) {
		return 'extended';
	}
	return null;
}
