/**
 * Builtin screen/tmux terminfo data.
 *
 * Provides hardcoded terminal capabilities for GNU Screen and tmux.
 *
 * @module terminal/terminfo/builtin/screen
 */

import type { TerminfoData } from '../tput';
import { XTERM_256COLOR } from './xterm';

/**
 * GNU Screen terminal capabilities.
 *
 * screen terminal multiplexer with 256 colors.
 */
export const SCREEN_256COLOR: TerminfoData = {
	...XTERM_256COLOR,
	name: 'screen-256color',
	names: ['screen-256color', 'GNU Screen with 256 colors'],
	description: 'GNU Screen with 256 colors',
	booleans: {
		...XTERM_256COLOR.booleans,
		// Screen has some different behavior
		eat_newline_glitch: false,
	},
	strings: {
		...XTERM_256COLOR.strings,
		// Screen uses different alternate screen sequences
		enter_ca_mode: '\x1b[?1049h',
		exit_ca_mode: '\x1b[?1049l',
		// Screen-specific key sequences
		key_home: '\x1b[1~',
		key_end: '\x1b[4~',
	},
};

/**
 * Basic GNU Screen (8-color).
 */
export const SCREEN: TerminfoData = {
	...SCREEN_256COLOR,
	name: 'screen',
	names: ['screen', 'VT 100/ANSI X3.64 virtual terminal'],
	description: 'GNU Screen',
	numbers: {
		...SCREEN_256COLOR.numbers,
		max_colors: 8,
		max_pairs: 64,
	},
	strings: {
		...SCREEN_256COLOR.strings,
		set_a_foreground: '\x1b[3%p1%dm',
		set_a_background: '\x1b[4%p1%dm',
	},
};

/**
 * tmux terminal capabilities.
 *
 * tmux terminal multiplexer with 256 colors.
 */
export const TMUX_256COLOR: TerminfoData = {
	...SCREEN_256COLOR,
	name: 'tmux-256color',
	names: ['tmux-256color', 'tmux with 256 colors'],
	description: 'tmux with 256 colors',
	booleans: {
		...SCREEN_256COLOR.booleans,
		// tmux supports these features
		back_color_erase: true,
	},
	strings: {
		...SCREEN_256COLOR.strings,
		// tmux has better truecolor support
		// setaf/setab already work for 256 colors
	},
};

/**
 * Basic tmux (256-color is default).
 */
export const TMUX: TerminfoData = {
	...TMUX_256COLOR,
	name: 'tmux',
	names: ['tmux'],
	description: 'tmux terminal multiplexer',
};
