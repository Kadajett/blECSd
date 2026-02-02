/**
 * Terminfo capability name mappings and aliases.
 *
 * Provides complete capability name arrays, termcap-to-terminfo alias mappings,
 * and utility functions for capability name resolution.
 *
 * @module terminal/terminfo/capabilities
 *
 * @example
 * ```typescript
 * import {
 *   BOOLEAN_CAPS,
 *   NUMBER_CAPS,
 *   STRING_CAPS,
 *   resolveCapabilityName,
 *   getCapabilityType,
 * } from 'blecsd';
 *
 * // Check if a name is a valid capability
 * const resolved = resolveCapabilityName('cup');  // 'cursor_address'
 * const type = getCapabilityType('cursor_address');  // 'string'
 * ```
 */

// =============================================================================
// BOOLEAN CAPABILITIES
// =============================================================================

/**
 * Complete list of boolean capability names in terminfo order.
 * Order corresponds to the binary format index.
 */
export const BOOLEAN_CAPS = [
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
] as const;

/**
 * Boolean capability name type.
 */
export type BooleanCapName = (typeof BOOLEAN_CAPS)[number];

// =============================================================================
// NUMERIC CAPABILITIES
// =============================================================================

/**
 * Complete list of numeric capability names in terminfo order.
 */
export const NUMBER_CAPS = [
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
] as const;

/**
 * Numeric capability name type.
 */
export type NumberCapName = (typeof NUMBER_CAPS)[number];

// =============================================================================
// STRING CAPABILITIES
// =============================================================================

/**
 * Complete list of string capability names in terminfo order.
 */
export const STRING_CAPS = [
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
] as const;

/**
 * String capability name type.
 */
export type StringCapName = (typeof STRING_CAPS)[number];

// =============================================================================
// CAPABILITY ALIASES (TERMCAP -> TERMINFO)
// =============================================================================

/**
 * Termcap short names mapped to terminfo long names.
 * This allows resolving the common 2-character termcap names.
 */
export const CAPABILITY_ALIASES: Readonly<Record<string, string>> = {
	// Boolean capabilities
	bw: 'auto_left_margin',
	am: 'auto_right_margin',
	xb: 'no_esc_ctlc',
	xs: 'ceol_standout_glitch',
	xn: 'eat_newline_glitch',
	eo: 'erase_overstrike',
	gn: 'generic_type',
	hc: 'hard_copy',
	km: 'has_meta_key',
	hs: 'has_status_line',
	in: 'insert_null_glitch',
	da: 'memory_above',
	db: 'memory_below',
	mi: 'move_insert_mode',
	ms: 'move_standout_mode',
	os: 'over_strike',
	es: 'status_line_esc_ok',
	xt: 'dest_tabs_magic_smso',
	hz: 'tilde_glitch',
	ul: 'transparent_underline',
	xo: 'xon_xoff',
	nx: 'needs_xon_xoff',
	'5i': 'prtr_silent',
	HC: 'hard_cursor',
	NR: 'non_rev_rmcup',
	NP: 'no_pad_char',
	ND: 'non_dest_scroll_region',
	cc: 'can_change',
	ut: 'back_color_erase',
	hl: 'hue_lightness_saturation',

	// Numeric capabilities
	co: 'columns',
	it: 'init_tabs',
	li: 'lines',
	lm: 'lines_of_memory',
	sg: 'magic_cookie_glitch',
	pb: 'padding_baud_rate',
	vt: 'virtual_terminal',
	ws: 'width_status_line',
	Nl: 'num_labels',
	lh: 'label_height',
	lw: 'label_width',
	ma: 'max_attributes',
	MW: 'maximum_windows',
	Co: 'max_colors',
	pa: 'max_pairs',
	NC: 'no_color_video',
	BT: 'buttons',

	// String capabilities - cursor movement
	bt: 'back_tab',
	bl: 'bell',
	cr: 'carriage_return',
	cs: 'change_scroll_region',
	ct: 'clear_all_tabs',
	cl: 'clear_screen',
	ce: 'clr_eol',
	cd: 'clr_eos',
	ch: 'column_address',
	CC: 'command_character',
	cm: 'cursor_address',
	do: 'cursor_down',
	ho: 'cursor_home',
	vi: 'cursor_invisible',
	le: 'cursor_left',
	CM: 'cursor_mem_address',
	ve: 'cursor_normal',
	nd: 'cursor_right',
	ll: 'cursor_to_ll',
	up: 'cursor_up',
	vs: 'cursor_visible',

	// String capabilities - edit
	dc: 'delete_character',
	dl: 'delete_line',
	ds: 'dis_status_line',
	hd: 'down_half_line',
	as: 'enter_alt_charset_mode',
	mb: 'enter_blink_mode',
	md: 'enter_bold_mode',
	ti: 'enter_ca_mode',
	dm: 'enter_delete_mode',
	mh: 'enter_dim_mode',
	im: 'enter_insert_mode',
	mk: 'enter_secure_mode',
	mp: 'enter_protected_mode',
	mr: 'enter_reverse_mode',
	so: 'enter_standout_mode',
	us: 'enter_underline_mode',
	ec: 'erase_chars',
	ae: 'exit_alt_charset_mode',
	me: 'exit_attribute_mode',
	te: 'exit_ca_mode',
	ed: 'exit_delete_mode',
	ei: 'exit_insert_mode',
	se: 'exit_standout_mode',
	ue: 'exit_underline_mode',
	vb: 'flash_screen',
	ff: 'form_feed',
	fs: 'from_status_line',

	// String capabilities - init/reset
	i1: 'init_1string',
	is: 'init_2string',
	i3: 'init_3string',
	if: 'init_file',
	ic: 'insert_character',
	al: 'insert_line',
	ip: 'insert_padding',

	// String capabilities - keys
	kb: 'key_backspace',
	ka: 'key_catab',
	kC: 'key_clear',
	kt: 'key_ctab',
	kD: 'key_dc',
	kL: 'key_dl',
	kd: 'key_down',
	kM: 'key_eic',
	kE: 'key_eol',
	kS: 'key_eos',
	k0: 'key_f0',
	k1: 'key_f1',
	k2: 'key_f2',
	k3: 'key_f3',
	k4: 'key_f4',
	k5: 'key_f5',
	k6: 'key_f6',
	k7: 'key_f7',
	k8: 'key_f8',
	k9: 'key_f9',
	k10: 'key_f10',
	kh: 'key_home',
	kI: 'key_ic',
	kA: 'key_il',
	kl: 'key_left',
	kH: 'key_ll',
	kN: 'key_npage',
	kP: 'key_ppage',
	kr: 'key_right',
	kF: 'key_sf',
	kR: 'key_sr',
	kT: 'key_stab',
	ku: 'key_up',
	ke: 'keypad_local',
	ks: 'keypad_xmit',

	// String capabilities - labels
	l0: 'lab_f0',
	l1: 'lab_f1',
	l2: 'lab_f2',
	l3: 'lab_f3',
	l4: 'lab_f4',
	l5: 'lab_f5',
	l6: 'lab_f6',
	l7: 'lab_f7',
	l8: 'lab_f8',
	l9: 'lab_f9',
	la: 'lab_f10',

	// String capabilities - meta
	mm: 'meta_on',
	mo: 'meta_off',
	nw: 'newline',
	pc: 'pad_char',

	// String capabilities - parameterized
	DC: 'parm_dch',
	DL: 'parm_delete_line',
	DO: 'parm_down_cursor',
	IC: 'parm_ich',
	SF: 'parm_index',
	AL: 'parm_insert_line',
	LE: 'parm_left_cursor',
	RI: 'parm_right_cursor',
	SR: 'parm_rindex',
	UP: 'parm_up_cursor',

	// String capabilities - print
	pk: 'pkey_key',
	pl: 'pkey_local',
	px: 'pkey_xmit',
	ps: 'print_screen',
	pf: 'prtr_off',
	po: 'prtr_on',

	// String capabilities - misc
	rp: 'repeat_char',
	r1: 'reset_1string',
	r2: 'reset_2string',
	r3: 'reset_3string',
	rf: 'reset_file',
	rc: 'restore_cursor',
	cv: 'row_address',
	sc: 'save_cursor',
	sf: 'scroll_forward',
	sr: 'scroll_reverse',
	sa: 'set_attributes',
	st: 'set_tab',
	wi: 'set_window',
	ta: 'tab',
	ts: 'to_status_line',
	uc: 'underline_char',
	hu: 'up_half_line',
	iP: 'init_prog',

	// String capabilities - keypad
	K1: 'key_a1',
	K3: 'key_a3',
	K2: 'key_b2',
	K4: 'key_c1',
	K5: 'key_c3',
	pO: 'prtr_non',
	rP: 'char_padding',
	ac: 'acs_chars',
	pn: 'plab_norm',
	kB: 'key_btab',
	SX: 'enter_xon_mode',
	RX: 'exit_xon_mode',
	SA: 'enter_am_mode',
	RA: 'exit_am_mode',
	XN: 'xon_character',
	XF: 'xoff_character',
	eA: 'ena_acs',
	LO: 'label_on',
	LF: 'label_off',

	// String capabilities - extended keys
	'@1': 'key_beg',
	'@2': 'key_cancel',
	'@3': 'key_close',
	'@4': 'key_command',
	'@5': 'key_copy',
	'@6': 'key_create',
	'@7': 'key_end',
	'@8': 'key_enter',
	'@9': 'key_exit',
	'@0': 'key_find',
	'%1': 'key_help',
	'%2': 'key_mark',
	'%3': 'key_message',
	'%4': 'key_move',
	'%5': 'key_next',
	'%6': 'key_open',
	'%7': 'key_options',
	'%8': 'key_previous',
	'%9': 'key_print',
	'%0': 'key_redo',
	'&1': 'key_reference',
	'&2': 'key_refresh',
	'&3': 'key_replace',
	'&4': 'key_restart',
	'&5': 'key_resume',
	'&6': 'key_save',
	'&7': 'key_suspend',
	'&8': 'key_undo',
	'&9': 'key_sbeg',
	'&0': 'key_scancel',
	'*1': 'key_scommand',
	'*2': 'key_scopy',
	'*3': 'key_screate',
	'*4': 'key_sdc',
	'*5': 'key_sdl',
	'*6': 'key_select',
	'*7': 'key_send',
	'*8': 'key_seol',
	'*9': 'key_sexit',
	'*0': 'key_sfind',
	'#1': 'key_shelp',
	'#2': 'key_shome',
	'#3': 'key_sic',
	'#4': 'key_sleft',
	'%a': 'key_smessage',
	'%b': 'key_smove',
	'%c': 'key_snext',
	'%d': 'key_soptions',
	'%e': 'key_sprevious',
	'%f': 'key_sprint',
	'%g': 'key_sredo',
	'%h': 'key_sreplace',
	'%i': 'key_sright',
	'%j': 'key_srsume',
	'!1': 'key_ssave',
	'!2': 'key_ssuspend',
	'!3': 'key_sundo',
	RF: 'req_for_input',
	F1: 'key_f11',
	F2: 'key_f12',
	F3: 'key_f13',
	F4: 'key_f14',
	F5: 'key_f15',
	F6: 'key_f16',
	F7: 'key_f17',
	F8: 'key_f18',
	F9: 'key_f19',
	FA: 'key_f20',
	FB: 'key_f21',
	FC: 'key_f22',
	FD: 'key_f23',
	FE: 'key_f24',
	FF: 'key_f25',
	FG: 'key_f26',
	FH: 'key_f27',
	FI: 'key_f28',
	FJ: 'key_f29',
	FK: 'key_f30',
	FL: 'key_f31',
	FM: 'key_f32',
	FN: 'key_f33',
	FO: 'key_f34',
	FP: 'key_f35',
	FQ: 'key_f36',
	FR: 'key_f37',
	FS: 'key_f38',
	FT: 'key_f39',
	FU: 'key_f40',
	FV: 'key_f41',
	FW: 'key_f42',
	FX: 'key_f43',
	FY: 'key_f44',
	FZ: 'key_f45',
	Fa: 'key_f46',
	Fb: 'key_f47',
	Fc: 'key_f48',
	Fd: 'key_f49',
	Fe: 'key_f50',
	Ff: 'key_f51',
	Fg: 'key_f52',
	Fh: 'key_f53',
	Fi: 'key_f54',
	Fj: 'key_f55',
	Fk: 'key_f56',
	Fl: 'key_f57',
	Fm: 'key_f58',
	Fn: 'key_f59',
	Fo: 'key_f60',
	Fp: 'key_f61',
	Fq: 'key_f62',
	Fr: 'key_f63',

	// String capabilities - more
	cb: 'clr_bol',
	MC: 'clear_margins',
	ML: 'set_left_margin',
	MR: 'set_right_margin',
	Lf: 'label_format',
	SC: 'set_clock',
	DK: 'display_clock',
	RC: 'remove_clock',
	CW: 'create_window',
	WG: 'goto_window',
	HU: 'hangup',
	DI: 'dial_phone',
	QD: 'quick_dial',
	TO: 'tone',
	PU: 'pulse',
	fh: 'flash_hook',
	PA: 'fixed_pause',
	WA: 'wait_tone',
	u0: 'user0',
	u1: 'user1',
	u2: 'user2',
	u3: 'user3',
	u4: 'user4',
	u5: 'user5',
	u6: 'user6',
	u7: 'user7',
	u8: 'user8',
	u9: 'user9',
	op: 'orig_pair',
	oc: 'orig_colors',
	Ic: 'initialize_color',
	Ip: 'initialize_pair',
	sp: 'set_color_pair',
	Sf: 'set_foreground',
	Sb: 'set_background',
	ZA: 'change_char_pitch',
	ZB: 'change_line_pitch',
	ZC: 'change_res_horz',
	ZD: 'change_res_vert',
	ZE: 'define_char',
	ZF: 'enter_doublewide_mode',
	ZG: 'enter_draft_quality',
	ZH: 'enter_italics_mode',
	ZI: 'enter_leftward_mode',
	ZJ: 'enter_micro_mode',
	ZK: 'enter_near_letter_quality',
	ZL: 'enter_normal_quality',
	ZM: 'enter_shadow_mode',
	ZN: 'enter_subscript_mode',
	ZO: 'enter_superscript_mode',
	ZP: 'enter_upward_mode',
	ZQ: 'exit_doublewide_mode',
	ZR: 'exit_italics_mode',
	ZS: 'exit_leftward_mode',
	ZT: 'exit_micro_mode',
	ZU: 'exit_shadow_mode',
	ZV: 'exit_subscript_mode',
	ZW: 'exit_superscript_mode',
	ZX: 'exit_upward_mode',
	ZY: 'micro_column_address',
	ZZ: 'micro_down',
	Za: 'micro_left',
	Zb: 'micro_right',
	Zc: 'micro_row_address',
	Zd: 'micro_up',
	Ze: 'order_of_pins',
	Zf: 'parm_down_micro',
	Zg: 'parm_left_micro',
	Zh: 'parm_right_micro',
	Zi: 'parm_up_micro',
	Zj: 'select_char_set',
	Zk: 'set_bottom_margin',
	Zl: 'set_bottom_margin_parm',
	Zm: 'set_left_margin_parm',
	Zn: 'set_right_margin_parm',
	Zo: 'set_top_margin',
	Zp: 'set_top_margin_parm',
	Zq: 'start_bit_image',
	Zr: 'start_char_set_def',
	Zs: 'stop_bit_image',
	Zt: 'stop_char_set_def',
	Zu: 'subscript_characters',
	Zv: 'superscript_characters',
	Zw: 'these_cause_cr',
	Zx: 'zero_motion',
	Zy: 'char_set_names',
	Km: 'key_mouse',
	Mi: 'mouse_info',
	RQ: 'req_mouse_pos',
	Gm: 'get_mouse',
	AF: 'set_a_foreground',
	AB: 'set_a_background',
	xl: 'pkey_plab',
	dv: 'device_type',
	ci: 'code_set_init',
	s0: 'set0_des_seq',
	s1: 'set1_des_seq',
	s2: 'set2_des_seq',
	s3: 'set3_des_seq',
	ML_: 'set_lr_margin',
	MT: 'set_tb_margin',
	Xy: 'bit_image_repeat',
	Zz: 'bit_image_newline',
	Yv: 'bit_image_carriage_return',
	Yw: 'color_names',
	Yx: 'define_bit_image_region',
	Yy: 'end_bit_image_region',
	Yz: 'set_color_band',
	YZ: 'set_page_length',
	S1: 'display_pc_char',
	S2: 'enter_pc_charset_mode',
	S3: 'exit_pc_charset_mode',
	S4: 'enter_scancode_mode',
	S5: 'exit_scancode_mode',
	S6: 'pc_term_options',
	S7: 'scancode_escape',
	S8: 'alt_scancode_esc',
	Xh: 'enter_horizontal_hl_mode',
	Xl: 'enter_left_hl_mode',
	Xo: 'enter_low_hl_mode',
	Xr: 'enter_right_hl_mode',
	Xt: 'enter_top_hl_mode',
	Xv: 'enter_vertical_hl_mode',
	sA: 'set_a_attributes',
	YI: 'set_pglen_inch',
} as const;

// =============================================================================
// REVERSE ALIAS LOOKUP
// =============================================================================

/**
 * Terminfo long names mapped to termcap short names.
 * Generated from CAPABILITY_ALIASES.
 */
export const CAPABILITY_REVERSE_ALIASES: Readonly<Record<string, string>> = Object.fromEntries(
	Object.entries(CAPABILITY_ALIASES).map(([short, long]) => [long, short]),
);

// =============================================================================
// LOOKUP MAPS (for performance)
// =============================================================================

const booleanCapSet = new Set<string>(BOOLEAN_CAPS);
const numberCapSet = new Set<string>(NUMBER_CAPS);
const stringCapSet = new Set<string>(STRING_CAPS);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Capability type identifier.
 */
export type CapabilityType = 'boolean' | 'number' | 'string';

/**
 * Resolves a capability name, handling termcap aliases.
 *
 * @param name - Capability name (terminfo or termcap)
 * @returns Resolved terminfo name, or original if not found
 *
 * @example
 * ```typescript
 * import { resolveCapabilityName } from 'blecsd';
 *
 * resolveCapabilityName('cup');  // 'cursor_address'
 * resolveCapabilityName('cursor_address');  // 'cursor_address'
 * resolveCapabilityName('unknown');  // 'unknown'
 * ```
 */
export function resolveCapabilityName(name: string): string {
	return CAPABILITY_ALIASES[name] ?? name;
}

/**
 * Gets the termcap short name for a terminfo capability.
 *
 * @param name - Terminfo capability name
 * @returns Termcap short name, or null if no alias exists
 *
 * @example
 * ```typescript
 * import { getTermcapName } from 'blecsd';
 *
 * getTermcapName('cursor_address');  // 'cup'
 * getTermcapName('unknown');  // null
 * ```
 */
export function getTermcapName(name: string): string | null {
	return CAPABILITY_REVERSE_ALIASES[name] ?? null;
}

/**
 * Gets the type of a capability.
 *
 * @param name - Capability name (resolved to terminfo name)
 * @returns Capability type, or null if not found
 *
 * @example
 * ```typescript
 * import { getCapabilityType } from 'blecsd';
 *
 * getCapabilityType('cursor_address');  // 'string'
 * getCapabilityType('max_colors');  // 'number'
 * getCapabilityType('auto_right_margin');  // 'boolean'
 * ```
 */
export function getCapabilityType(name: string): CapabilityType | null {
	const resolved = resolveCapabilityName(name);

	if (booleanCapSet.has(resolved)) return 'boolean';
	if (numberCapSet.has(resolved)) return 'number';
	if (stringCapSet.has(resolved)) return 'string';

	return null;
}

/**
 * Checks if a name is a valid capability name.
 *
 * @param name - Name to check
 * @returns true if valid capability
 *
 * @example
 * ```typescript
 * import { isCapabilityName } from 'blecsd';
 *
 * isCapabilityName('cursor_address');  // true
 * isCapabilityName('cup');  // true (alias)
 * isCapabilityName('invalid');  // false
 * ```
 */
export function isCapabilityName(name: string): boolean {
	return getCapabilityType(name) !== null;
}

/**
 * Checks if a name is a boolean capability.
 */
export function isBooleanCapability(name: string): name is BooleanCapName {
	const resolved = resolveCapabilityName(name);
	return booleanCapSet.has(resolved);
}

/**
 * Checks if a name is a numeric capability.
 */
export function isNumberCapability(name: string): name is NumberCapName {
	const resolved = resolveCapabilityName(name);
	return numberCapSet.has(resolved);
}

/**
 * Checks if a name is a string capability.
 */
export function isStringCapability(name: string): name is StringCapName {
	const resolved = resolveCapabilityName(name);
	return stringCapSet.has(resolved);
}

/**
 * Gets the index of a capability in its category array.
 * Useful for binary format parsing.
 *
 * @param name - Capability name
 * @returns Index in the appropriate array, or -1 if not found
 *
 * @example
 * ```typescript
 * import { getCapabilityIndex } from 'blecsd';
 *
 * getCapabilityIndex('cursor_address');  // 10 (in STRING_CAPS)
 * getCapabilityIndex('max_colors');  // 13 (in NUMBER_CAPS)
 * ```
 */
export function getCapabilityIndex(name: string): number {
	const resolved = resolveCapabilityName(name);

	let idx = BOOLEAN_CAPS.indexOf(resolved as BooleanCapName);
	if (idx !== -1) return idx;

	idx = NUMBER_CAPS.indexOf(resolved as NumberCapName);
	if (idx !== -1) return idx;

	idx = STRING_CAPS.indexOf(resolved as StringCapName);
	return idx;
}

/**
 * Gets all capability names of a given type.
 *
 * @param type - Capability type
 * @returns Array of capability names
 *
 * @example
 * ```typescript
 * import { getCapabilitiesByType } from 'blecsd';
 *
 * const booleans = getCapabilitiesByType('boolean');
 * const numbers = getCapabilitiesByType('number');
 * const strings = getCapabilitiesByType('string');
 * ```
 */
export function getCapabilitiesByType(type: CapabilityType): readonly string[] {
	switch (type) {
		case 'boolean':
			return BOOLEAN_CAPS;
		case 'number':
			return NUMBER_CAPS;
		case 'string':
			return STRING_CAPS;
	}
}
