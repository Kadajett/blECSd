/**
 * Terminal capabilities (Tput) interface.
 *
 * Provides access to terminal capabilities through the terminfo database.
 * Uses functional patterns instead of classes per project requirements.
 *
 * @module terminal/terminfo/tput
 */

// =============================================================================
// CAPABILITY TYPES
// =============================================================================

/**
 * Boolean capability names from terminfo.
 * These indicate presence/absence of terminal features.
 */
export type BooleanCapability =
	| 'auto_left_margin'
	| 'auto_right_margin'
	| 'back_color_erase'
	| 'can_change'
	| 'ceol_standout_glitch'
	| 'col_addr_glitch'
	| 'cpi_changes_res'
	| 'cr_cancels_micro_mode'
	| 'dest_tabs_magic_smso'
	| 'eat_newline_glitch'
	| 'erase_overstrike'
	| 'generic_type'
	| 'hard_copy'
	| 'hard_cursor'
	| 'has_meta_key'
	| 'has_print_wheel'
	| 'has_status_line'
	| 'hue_lightness_saturation'
	| 'insert_null_glitch'
	| 'lpi_changes_res'
	| 'memory_above'
	| 'memory_below'
	| 'move_insert_mode'
	| 'move_standout_mode'
	| 'needs_xon_xoff'
	| 'no_esc_ctlc'
	| 'no_pad_char'
	| 'non_dest_scroll_region'
	| 'non_rev_rmcup'
	| 'over_strike'
	| 'prtr_silent'
	| 'row_addr_glitch'
	| 'semi_auto_right_margin'
	| 'status_line_esc_ok'
	| 'tilde_glitch'
	| 'transparent_underline'
	| 'xon_xoff';

/**
 * Numeric capability names from terminfo.
 * These represent numeric values like dimensions and counts.
 */
export type NumberCapability =
	| 'columns'
	| 'init_tabs'
	| 'label_height'
	| 'label_width'
	| 'lines'
	| 'lines_of_memory'
	| 'magic_cookie_glitch'
	| 'max_attributes'
	| 'max_colors'
	| 'max_pairs'
	| 'maximum_windows'
	| 'no_color_video'
	| 'num_labels'
	| 'padding_baud_rate'
	| 'virtual_terminal'
	| 'width_status_line'
	| 'bit_image_entwining'
	| 'bit_image_type'
	| 'buffer_capacity'
	| 'buttons'
	| 'dot_horz_spacing'
	| 'dot_vert_spacing'
	| 'max_micro_address'
	| 'max_micro_jump'
	| 'micro_col_size'
	| 'micro_line_size'
	| 'number_of_pins'
	| 'output_res_char'
	| 'output_res_horz_inch'
	| 'output_res_line'
	| 'output_res_vert_inch'
	| 'print_rate'
	| 'wide_char_size';

/**
 * String capability names from terminfo.
 * These represent control sequences for terminal operations.
 */
export type StringCapability =
	// Cursor movement
	| 'cursor_address'
	| 'cursor_down'
	| 'cursor_home'
	| 'cursor_left'
	| 'cursor_right'
	| 'cursor_up'
	| 'cursor_invisible'
	| 'cursor_normal'
	| 'cursor_visible'
	// Screen manipulation
	| 'clear_screen'
	| 'clr_eol'
	| 'clr_eos'
	| 'scroll_forward'
	| 'scroll_reverse'
	| 'change_scroll_region'
	| 'insert_line'
	| 'delete_line'
	| 'parm_insert_line'
	| 'parm_delete_line'
	// Character attributes
	| 'enter_bold_mode'
	| 'enter_dim_mode'
	| 'enter_blink_mode'
	| 'enter_reverse_mode'
	| 'enter_standout_mode'
	| 'enter_underline_mode'
	| 'exit_attribute_mode'
	| 'exit_standout_mode'
	| 'exit_underline_mode'
	| 'set_attributes'
	// Colors
	| 'set_a_foreground'
	| 'set_a_background'
	| 'set_foreground'
	| 'set_background'
	| 'orig_pair'
	| 'orig_colors'
	| 'initialize_color'
	| 'initialize_pair'
	// Alternate screen
	| 'enter_ca_mode'
	| 'exit_ca_mode'
	// Keypad mode
	| 'keypad_local'
	| 'keypad_xmit'
	// Mouse
	| 'key_mouse'
	// Bell
	| 'bell'
	| 'flash_screen'
	// Insert/delete
	| 'insert_character'
	| 'delete_character'
	| 'parm_ich'
	| 'parm_dch'
	| 'enter_insert_mode'
	| 'exit_insert_mode'
	// ACS (Alternate Character Set)
	| 'acs_chars'
	| 'enter_alt_charset_mode'
	| 'exit_alt_charset_mode'
	// Tab
	| 'tab'
	| 'back_tab'
	| 'clear_all_tabs'
	| 'set_tab'
	// Other
	| 'newline'
	| 'carriage_return'
	| 'reset_1string'
	| 'reset_2string'
	| 'init_1string'
	| 'init_2string'
	| 'init_3string'
	// Repeat
	| 'repeat_char';

// =============================================================================
// TERMINFO DATA TYPES
// =============================================================================

/**
 * Raw terminfo data structure.
 */
export interface TerminfoData {
	readonly name: string;
	readonly names: readonly string[];
	readonly description: string;
	readonly booleans: Readonly<Record<string, boolean>>;
	readonly numbers: Readonly<Record<string, number>>;
	readonly strings: Readonly<Record<string, string>>;
}

/**
 * Tput instance configuration.
 */
export interface TputConfig {
	/** Terminal name (defaults to $TERM) */
	readonly terminal?: string;
	/** Custom terminfo data (bypasses file lookup) */
	readonly data?: TerminfoData;
	/** Whether to use extended capabilities */
	readonly extended?: boolean;
}

/**
 * Tput API interface.
 * Provides access to terminal capabilities.
 */
export interface Tput {
	/** Terminal name */
	readonly terminal: string;
	/** Raw terminfo data */
	readonly data: TerminfoData;

	/**
	 * Checks if a boolean capability is present.
	 *
	 * @param cap - Boolean capability name
	 * @returns true if capability is present
	 *
	 * @example
	 * ```typescript
	 * if (tput.has('has_meta_key')) {
	 *   // Terminal supports meta key
	 * }
	 * ```
	 */
	has(cap: BooleanCapability): boolean;

	/**
	 * Gets a numeric capability value.
	 *
	 * @param cap - Numeric capability name
	 * @returns Capability value or null if not present
	 *
	 * @example
	 * ```typescript
	 * const colors = tput.getNumber('max_colors');
	 * console.log(`Terminal supports ${colors} colors`);
	 * ```
	 */
	getNumber(cap: NumberCapability): number | null;

	/**
	 * Gets a string capability value.
	 *
	 * @param cap - String capability name
	 * @returns Capability string or null if not present
	 *
	 * @example
	 * ```typescript
	 * const clearSeq = tput.getString('clear_screen');
	 * if (clearSeq) {
	 *   process.stdout.write(clearSeq);
	 * }
	 * ```
	 */
	getString(cap: StringCapability): string | null;

	/**
	 * Formats a parameterized string capability.
	 * Replaces parameter placeholders with actual values.
	 *
	 * @param cap - String capability name
	 * @param params - Parameters to substitute
	 * @returns Formatted string or null if capability not present
	 *
	 * @example
	 * ```typescript
	 * // Move cursor to row 10, column 5
	 * const seq = tput.tparm('cursor_address', 10, 5);
	 * if (seq) {
	 *   process.stdout.write(seq);
	 * }
	 * ```
	 */
	tparm(cap: StringCapability, ...params: number[]): string | null;

	/**
	 * Shortcut for cursor positioning.
	 *
	 * @param row - Row (0-indexed)
	 * @param col - Column (0-indexed)
	 * @returns Cursor movement sequence
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(tput.cup(10, 5));
	 * ```
	 */
	cup(row: number, col: number): string;

	/**
	 * Shortcut for setting graphics rendition (SGR).
	 *
	 * @param attrs - Attribute flags
	 * @returns SGR sequence
	 */
	sgr(attrs: number): string;

	/**
	 * Shortcut for setting ANSI foreground color.
	 *
	 * @param color - Color number (0-255)
	 * @returns Color sequence
	 *
	 * @example
	 * ```typescript
	 * // Set foreground to red (color 1)
	 * process.stdout.write(tput.setaf(1));
	 * ```
	 */
	setaf(color: number): string;

	/**
	 * Shortcut for setting ANSI background color.
	 *
	 * @param color - Color number (0-255)
	 * @returns Color sequence
	 *
	 * @example
	 * ```typescript
	 * // Set background to blue (color 4)
	 * process.stdout.write(tput.setab(4));
	 * ```
	 */
	setab(color: number): string;
}

// =============================================================================
// DEFAULT TERMINFO DATA
// =============================================================================

/**
 * Default xterm-256color terminfo data.
 * Used as fallback when terminfo database is not available.
 */
const DEFAULT_XTERM_DATA: TerminfoData = {
	name: 'xterm-256color',
	names: ['xterm-256color', 'xterm'],
	description: 'xterm with 256 colors',
	booleans: {
		auto_left_margin: false,
		auto_right_margin: true,
		back_color_erase: true,
		has_meta_key: true,
		move_insert_mode: true,
		move_standout_mode: true,
	},
	numbers: {
		columns: 80,
		lines: 24,
		max_colors: 256,
		max_pairs: 65536,
		init_tabs: 8,
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
		// Screen
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
		// Attributes
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
		// Colors
		set_a_foreground: '\x1b[%?%p1%{8}%<%t3%p1%d%e%p1%{16}%<%t9%p1%{8}%-%d%e38;5;%p1%d%;m',
		set_a_background: '\x1b[%?%p1%{8}%<%t4%p1%d%e%p1%{16}%<%t10%p1%{8}%-%d%e48;5;%p1%d%;m',
		orig_pair: '\x1b[39;49m',
		orig_colors: '\x1b]104\x07',
		// Alternate screen
		enter_ca_mode: '\x1b[?1049h\x1b[22;0;0t',
		exit_ca_mode: '\x1b[?1049l\x1b[23;0;0t',
		// Keypad
		keypad_local: '\x1b[?1l\x1b>',
		keypad_xmit: '\x1b[?1h\x1b=',
		// Bell
		bell: '\x07',
		flash_screen: '\x1b[?5h$<100/>\x1b[?5l',
		// Insert/delete
		insert_character: '\x1b[@',
		delete_character: '\x1b[P',
		parm_ich: '\x1b[%p1%d@',
		parm_dch: '\x1b[%p1%dP',
		enter_insert_mode: '\x1b[4h',
		exit_insert_mode: '\x1b[4l',
		// ACS
		acs_chars: '``aaffggiijjkkllmmnnooppqqrrssttuuvvwwxxyyzz{{||}}~~',
		enter_alt_charset_mode: '\x1b(0',
		exit_alt_charset_mode: '\x1b(B',
		// Tabs
		tab: '\t',
		back_tab: '\x1b[Z',
		// Other
		newline: '\n',
		carriage_return: '\r',
		reset_1string: '\x1bc',
		init_2string: '\x1b[!p\x1b[?3;4l\x1b[4l\x1b>',
		// Repeat
		repeat_char: '\x1b[%p1%d%p2%c',
	},
};

// =============================================================================
// PARAMETER FORMATTING
// =============================================================================

/**
 * Parser state for terminfo parameter processing.
 */
interface ParamParserState {
	stack: number[];
	params: number[];
	index: number;
	result: string;
}

/**
 * Handles %i increment of first two parameters.
 */
function handleIncrement(state: ParamParserState): void {
	if (state.params.length > 0 && state.params[0] !== undefined) state.params[0]++;
	if (state.params.length > 1 && state.params[1] !== undefined) state.params[1]++;
}

/**
 * Handles %p parameter push.
 */
function handleParamPush(state: ParamParserState, format: string): number {
	state.index++;
	if (state.index < format.length) {
		const paramNum = Number.parseInt(format[state.index] ?? '0', 10);
		state.stack.push(state.params[paramNum - 1] ?? 0);
	}
	return state.index;
}

/**
 * Handles %{ integer constant push.
 */
function handleIntConstant(state: ParamParserState, format: string): number {
	let numStr = '';
	state.index++;
	while (state.index < format.length && format[state.index] !== '}') {
		numStr += format[state.index];
		state.index++;
	}
	state.stack.push(Number.parseInt(numStr, 10) || 0);
	return state.index;
}

/**
 * Handles binary arithmetic operations.
 */
function handleBinaryOp(state: ParamParserState, op: string): void {
	const b = state.stack.pop() ?? 0;
	const a = state.stack.pop() ?? 0;
	switch (op) {
		case '+':
			state.stack.push(a + b);
			break;
		case '-':
			state.stack.push(a - b);
			break;
		case '*':
			state.stack.push(a * b);
			break;
		case '/':
			state.stack.push(b !== 0 ? Math.floor(a / b) : 0);
			break;
		case 'm':
			state.stack.push(b !== 0 ? a % b : 0);
			break;
		case '=':
			state.stack.push(a === b ? 1 : 0);
			break;
		case '<':
			state.stack.push(a < b ? 1 : 0);
			break;
		case '>':
			state.stack.push(a > b ? 1 : 0);
			break;
	}
}

/**
 * Skips to matching %; or %e in conditional.
 */
function skipConditional(format: string, startIndex: number, stopOnElse: boolean): number {
	let depth = 1;
	let i = startIndex;
	while (i < format.length && depth > 0) {
		i++;
		if (format[i] === '%') {
			i++;
			if (format[i] === '?') depth++;
			else if (format[i] === ';') depth--;
			else if (format[i] === 'e' && depth === 1 && stopOnElse) {
				return i;
			}
		}
	}
	return i;
}

/**
 * Handles %t then branch.
 */
function handleThen(state: ParamParserState, format: string): number {
	const cond = state.stack.pop() ?? 0;
	if (!cond) {
		state.index = skipConditional(format, state.index, true);
	}
	return state.index;
}

/**
 * Handles %e else branch.
 */
function handleElse(state: ParamParserState, format: string): number {
	state.index = skipConditional(format, state.index, false);
	return state.index;
}

/**
 * Processes a single escape code.
 */
function processEscapeCode(state: ParamParserState, format: string, code: string): void {
	switch (code) {
		case '%':
			state.result += '%';
			break;
		case 'i':
			handleIncrement(state);
			break;
		case 'p':
			state.index = handleParamPush(state, format);
			break;
		case 'd':
			state.result += String(state.stack.pop() ?? 0);
			break;
		case 's':
		case 'c':
			state.result += String.fromCharCode(state.stack.pop() ?? 0);
			break;
		case '{':
			state.index = handleIntConstant(state, format);
			break;
		case '+':
		case '-':
		case '*':
		case '/':
		case 'm':
		case '=':
		case '<':
		case '>':
			handleBinaryOp(state, code);
			break;
		case '?':
			// Start conditional - no action needed
			break;
		case 't':
			state.index = handleThen(state, format);
			break;
		case 'e':
			state.index = handleElse(state, format);
			break;
		case ';':
			// End conditional - no action needed
			break;
	}
}

/**
 * Processes terminfo parameterized strings.
 * Implements a subset of the terminfo parameter language.
 *
 * @param format - Format string with parameter placeholders
 * @param params - Parameter values
 * @returns Processed string
 */
function processParameters(format: string, params: number[]): string {
	const state: ParamParserState = {
		stack: [],
		params: [...params],
		index: 0,
		result: '',
	};

	while (state.index < format.length) {
		const char = format[state.index];

		if (char !== '%') {
			state.result += char;
			state.index++;
			continue;
		}

		state.index++;
		if (state.index >= format.length) break;

		const code = format[state.index];
		if (code) {
			processEscapeCode(state, format, code);
		}
		state.index++;
	}

	return state.result;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Tput instance for terminal capability access.
 *
 * @param config - Tput configuration
 * @returns Tput instance
 *
 * @example
 * ```typescript
 * import { createTput } from 'blecsd';
 *
 * // Create with default terminal ($TERM)
 * const tput = createTput();
 *
 * // Check capabilities
 * console.log(`Max colors: ${tput.getNumber('max_colors')}`);
 *
 * // Move cursor
 * process.stdout.write(tput.cup(10, 5));
 *
 * // Set foreground color
 * process.stdout.write(tput.setaf(1)); // Red
 * console.log('This is red!');
 * process.stdout.write(tput.getString('orig_pair') ?? '');
 * ```
 */
export function createTput(config: TputConfig = {}): Tput {
	const terminal = config.terminal ?? process.env.TERM ?? 'xterm-256color';
	const data = config.data ?? DEFAULT_XTERM_DATA;

	const tput: Tput = {
		terminal,
		data,

		has(cap: BooleanCapability): boolean {
			return data.booleans[cap] === true;
		},

		getNumber(cap: NumberCapability): number | null {
			const value = data.numbers[cap];
			return value !== undefined ? value : null;
		},

		getString(cap: StringCapability): string | null {
			const value = data.strings[cap];
			return value !== undefined ? value : null;
		},

		tparm(cap: StringCapability, ...params: number[]): string | null {
			const format = data.strings[cap];
			if (format === undefined) return null;
			return processParameters(format, params);
		},

		cup(row: number, col: number): string {
			return tput.tparm('cursor_address', row, col) ?? `\x1b[${row + 1};${col + 1}H`;
		},

		sgr(attrs: number): string {
			// Basic SGR implementation
			return `\x1b[${attrs}m`;
		},

		setaf(color: number): string {
			const seq = tput.tparm('set_a_foreground', color);
			if (seq) return seq;

			// Fallback to ANSI sequences
			if (color < 8) return `\x1b[3${color}m`;
			if (color < 16) return `\x1b[9${color - 8}m`;
			return `\x1b[38;5;${color}m`;
		},

		setab(color: number): string {
			const seq = tput.tparm('set_a_background', color);
			if (seq) return seq;

			// Fallback to ANSI sequences
			if (color < 8) return `\x1b[4${color}m`;
			if (color < 16) return `\x1b[10${color - 8}m`;
			return `\x1b[48;5;${color}m`;
		},
	};

	return tput;
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Default Tput instance using $TERM.
 */
let defaultTput: Tput | null = null;

/**
 * Gets the default Tput instance.
 * Creates one on first call using the $TERM environment variable.
 *
 * @returns Default Tput instance
 *
 * @example
 * ```typescript
 * import { getDefaultTput } from 'blecsd';
 *
 * const tput = getDefaultTput();
 * console.log(`Terminal: ${tput.terminal}`);
 * ```
 */
export function getDefaultTput(): Tput {
	if (!defaultTput) {
		defaultTput = createTput();
	}
	return defaultTput;
}

/**
 * Resets the default Tput instance.
 * Useful for testing or when terminal changes.
 */
export function resetDefaultTput(): void {
	defaultTput = null;
}

/**
 * Gets the default xterm data.
 * Useful for testing or as a fallback.
 */
export function getDefaultXtermData(): TerminfoData {
	return DEFAULT_XTERM_DATA;
}
