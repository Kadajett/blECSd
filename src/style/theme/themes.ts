/**
 * Built-in theme definitions
 * @module style/theme/themes
 */

import { packColor } from '../../utils/color';
import type { Theme } from './types';

/**
 * Creates the default theme with neutral colors.
 *
 * @returns Default theme
 *
 * @example
 * ```typescript
 * const theme = createDefaultTheme();
 * registerTheme(theme);
 * ```
 */
export function createDefaultTheme(): Theme {
	return {
		name: 'default',
		colors: {
			primary: packColor(33, 150, 243), // Blue
			secondary: packColor(156, 39, 176), // Purple
			accent: packColor(255, 193, 7), // Amber
			background: packColor(18, 18, 18), // Near black
			foreground: packColor(238, 238, 238), // Near white
			error: packColor(244, 67, 54), // Red
			warning: packColor(255, 152, 0), // Orange
			success: packColor(76, 175, 80), // Green
			info: packColor(33, 150, 243), // Blue
			muted: packColor(117, 117, 117), // Gray
			border: packColor(66, 66, 66), // Dark gray
		},
		borders: {
			style: 'single',
			fg: packColor(66, 66, 66),
			bg: packColor(0, 0, 0, 0), // Transparent
		},
		focus: {
			fg: packColor(255, 255, 255),
			bg: packColor(33, 150, 243),
			borderFg: packColor(100, 181, 246),
		},
		widgets: {
			button: {
				fg: packColor(255, 255, 255),
				bg: packColor(33, 150, 243),
				activeFg: packColor(255, 255, 255),
				activeBg: packColor(25, 118, 210),
			},
			input: {
				fg: packColor(238, 238, 238),
				bg: packColor(38, 38, 38),
				placeholderFg: packColor(117, 117, 117),
				cursorFg: packColor(255, 255, 255),
			},
			list: {
				fg: packColor(238, 238, 238),
				bg: packColor(18, 18, 18),
				selectedFg: packColor(255, 255, 255),
				selectedBg: packColor(33, 150, 243),
			},
			panel: {
				fg: packColor(238, 238, 238),
				bg: packColor(28, 28, 28),
				headerFg: packColor(255, 255, 255),
				headerBg: packColor(48, 48, 48),
			},
		},
	};
}

/**
 * Creates a dark theme optimized for low-light environments.
 *
 * @returns Dark theme
 *
 * @example
 * ```typescript
 * const theme = createDarkTheme();
 * registerTheme(theme);
 * ```
 */
export function createDarkTheme(): Theme {
	return {
		name: 'dark',
		colors: {
			primary: packColor(66, 165, 245), // Lighter blue
			secondary: packColor(186, 104, 200), // Lighter purple
			accent: packColor(255, 213, 79), // Lighter amber
			background: packColor(12, 12, 12), // Very dark
			foreground: packColor(250, 250, 250), // Very light
			error: packColor(239, 83, 80), // Lighter red
			warning: packColor(255, 167, 38), // Lighter orange
			success: packColor(102, 187, 106), // Lighter green
			info: packColor(66, 165, 245), // Lighter blue
			muted: packColor(97, 97, 97), // Darker gray
			border: packColor(48, 48, 48), // Very dark gray
		},
		borders: {
			style: 'single',
			fg: packColor(48, 48, 48),
			bg: packColor(0, 0, 0, 0), // Transparent
		},
		focus: {
			fg: packColor(255, 255, 255),
			bg: packColor(66, 165, 245),
			borderFg: packColor(144, 202, 249),
		},
		widgets: {
			button: {
				fg: packColor(255, 255, 255),
				bg: packColor(66, 165, 245),
				activeFg: packColor(255, 255, 255),
				activeBg: packColor(42, 139, 230),
			},
			input: {
				fg: packColor(250, 250, 250),
				bg: packColor(24, 24, 24),
				placeholderFg: packColor(97, 97, 97),
				cursorFg: packColor(255, 255, 255),
			},
			list: {
				fg: packColor(250, 250, 250),
				bg: packColor(12, 12, 12),
				selectedFg: packColor(255, 255, 255),
				selectedBg: packColor(66, 165, 245),
			},
			panel: {
				fg: packColor(250, 250, 250),
				bg: packColor(18, 18, 18),
				headerFg: packColor(255, 255, 255),
				headerBg: packColor(33, 33, 33),
			},
		},
	};
}

/**
 * Creates a light theme optimized for bright environments.
 *
 * @returns Light theme
 *
 * @example
 * ```typescript
 * const theme = createLightTheme();
 * registerTheme(theme);
 * ```
 */
export function createLightTheme(): Theme {
	return {
		name: 'light',
		colors: {
			primary: packColor(25, 118, 210), // Darker blue
			secondary: packColor(123, 31, 162), // Darker purple
			accent: packColor(255, 160, 0), // Darker amber
			background: packColor(250, 250, 250), // Very light
			foreground: packColor(33, 33, 33), // Very dark
			error: packColor(211, 47, 47), // Darker red
			warning: packColor(245, 124, 0), // Darker orange
			success: packColor(56, 142, 60), // Darker green
			info: packColor(25, 118, 210), // Darker blue
			muted: packColor(158, 158, 158), // Light gray
			border: packColor(224, 224, 224), // Very light gray
		},
		borders: {
			style: 'single',
			fg: packColor(224, 224, 224),
			bg: packColor(0, 0, 0, 0), // Transparent
		},
		focus: {
			fg: packColor(255, 255, 255),
			bg: packColor(25, 118, 210),
			borderFg: packColor(66, 165, 245),
		},
		widgets: {
			button: {
				fg: packColor(255, 255, 255),
				bg: packColor(25, 118, 210),
				activeFg: packColor(255, 255, 255),
				activeBg: packColor(21, 101, 192),
			},
			input: {
				fg: packColor(33, 33, 33),
				bg: packColor(255, 255, 255),
				placeholderFg: packColor(158, 158, 158),
				cursorFg: packColor(33, 33, 33),
			},
			list: {
				fg: packColor(33, 33, 33),
				bg: packColor(250, 250, 250),
				selectedFg: packColor(255, 255, 255),
				selectedBg: packColor(25, 118, 210),
			},
			panel: {
				fg: packColor(33, 33, 33),
				bg: packColor(245, 245, 245),
				headerFg: packColor(33, 33, 33),
				headerBg: packColor(238, 238, 238),
			},
		},
	};
}

/**
 * Creates a high-contrast theme for maximum accessibility.
 *
 * @returns High-contrast theme
 *
 * @example
 * ```typescript
 * const theme = createHighContrastTheme();
 * registerTheme(theme);
 * ```
 */
export function createHighContrastTheme(): Theme {
	return {
		name: 'high-contrast',
		colors: {
			primary: packColor(0, 120, 215), // Pure blue
			secondary: packColor(136, 23, 152), // Pure purple
			accent: packColor(255, 185, 0), // Pure yellow
			background: packColor(0, 0, 0), // Pure black
			foreground: packColor(255, 255, 255), // Pure white
			error: packColor(255, 0, 0), // Pure red
			warning: packColor(255, 140, 0), // Pure orange
			success: packColor(0, 255, 0), // Pure green
			info: packColor(0, 120, 215), // Pure blue
			muted: packColor(128, 128, 128), // Medium gray
			border: packColor(255, 255, 255), // Pure white
		},
		borders: {
			style: 'heavy',
			fg: packColor(255, 255, 255),
			bg: packColor(0, 0, 0, 0), // Transparent
		},
		focus: {
			fg: packColor(0, 0, 0),
			bg: packColor(255, 255, 0), // Yellow for high visibility
			borderFg: packColor(255, 255, 0),
		},
		widgets: {
			button: {
				fg: packColor(0, 0, 0),
				bg: packColor(255, 255, 255),
				activeFg: packColor(255, 255, 255),
				activeBg: packColor(0, 120, 215),
			},
			input: {
				fg: packColor(255, 255, 255),
				bg: packColor(0, 0, 0),
				placeholderFg: packColor(128, 128, 128),
				cursorFg: packColor(255, 255, 0),
			},
			list: {
				fg: packColor(255, 255, 255),
				bg: packColor(0, 0, 0),
				selectedFg: packColor(0, 0, 0),
				selectedBg: packColor(255, 255, 255),
			},
			panel: {
				fg: packColor(255, 255, 255),
				bg: packColor(0, 0, 0),
				headerFg: packColor(0, 0, 0),
				headerBg: packColor(255, 255, 255),
			},
		},
	};
}

/**
 * Creates a Solarized Dark theme.
 *
 * @returns Solarized theme
 *
 * @example
 * ```typescript
 * const theme = createSolarizedTheme();
 * registerTheme(theme);
 * ```
 */
export function createSolarizedTheme(): Theme {
	return {
		name: 'solarized',
		colors: {
			primary: packColor(38, 139, 210), // Blue
			secondary: packColor(108, 113, 196), // Violet
			accent: packColor(181, 137, 0), // Yellow
			background: packColor(0, 43, 54), // Base03
			foreground: packColor(131, 148, 150), // Base0
			error: packColor(220, 50, 47), // Red
			warning: packColor(203, 75, 22), // Orange
			success: packColor(133, 153, 0), // Green
			info: packColor(42, 161, 152), // Cyan
			muted: packColor(88, 110, 117), // Base01
			border: packColor(7, 54, 66), // Base02
		},
		borders: {
			style: 'single',
			fg: packColor(7, 54, 66),
			bg: packColor(0, 0, 0, 0),
		},
		focus: {
			fg: packColor(253, 246, 227), // Base3
			bg: packColor(38, 139, 210),
			borderFg: packColor(108, 113, 196),
		},
		widgets: {
			button: {
				fg: packColor(253, 246, 227),
				bg: packColor(38, 139, 210),
				activeFg: packColor(253, 246, 227),
				activeBg: packColor(108, 113, 196),
			},
			input: {
				fg: packColor(131, 148, 150),
				bg: packColor(7, 54, 66),
				placeholderFg: packColor(88, 110, 117),
				cursorFg: packColor(253, 246, 227),
			},
			list: {
				fg: packColor(131, 148, 150),
				bg: packColor(0, 43, 54),
				selectedFg: packColor(253, 246, 227),
				selectedBg: packColor(38, 139, 210),
			},
			panel: {
				fg: packColor(131, 148, 150),
				bg: packColor(7, 54, 66),
				headerFg: packColor(147, 161, 161),
				headerBg: packColor(0, 43, 54),
			},
		},
	};
}

/**
 * Creates a Monokai Pro theme.
 *
 * @returns Monokai theme
 *
 * @example
 * ```typescript
 * const theme = createMonokaiTheme();
 * registerTheme(theme);
 * ```
 */
export function createMonokaiTheme(): Theme {
	return {
		name: 'monokai',
		colors: {
			primary: packColor(102, 217, 239), // Cyan
			secondary: packColor(171, 157, 242), // Purple
			accent: packColor(230, 219, 116), // Yellow
			background: packColor(39, 40, 34), // Background
			foreground: packColor(248, 248, 242), // Foreground
			error: packColor(249, 38, 114), // Pink/Red
			warning: packColor(253, 151, 31), // Orange
			success: packColor(166, 226, 46), // Green
			info: packColor(102, 217, 239), // Cyan
			muted: packColor(117, 113, 94), // Comment
			border: packColor(73, 72, 62), // Border
		},
		borders: {
			style: 'single',
			fg: packColor(73, 72, 62),
			bg: packColor(0, 0, 0, 0),
		},
		focus: {
			fg: packColor(39, 40, 34),
			bg: packColor(230, 219, 116),
			borderFg: packColor(102, 217, 239),
		},
		widgets: {
			button: {
				fg: packColor(39, 40, 34),
				bg: packColor(102, 217, 239),
				activeFg: packColor(39, 40, 34),
				activeBg: packColor(171, 157, 242),
			},
			input: {
				fg: packColor(248, 248, 242),
				bg: packColor(73, 72, 62),
				placeholderFg: packColor(117, 113, 94),
				cursorFg: packColor(230, 219, 116),
			},
			list: {
				fg: packColor(248, 248, 242),
				bg: packColor(39, 40, 34),
				selectedFg: packColor(39, 40, 34),
				selectedBg: packColor(102, 217, 239),
			},
			panel: {
				fg: packColor(248, 248, 242),
				bg: packColor(73, 72, 62),
				headerFg: packColor(248, 248, 242),
				headerBg: packColor(39, 40, 34),
			},
		},
	};
}

/**
 * Creates a Nord theme.
 *
 * @returns Nord theme
 *
 * @example
 * ```typescript
 * const theme = createNordTheme();
 * registerTheme(theme);
 * ```
 */
export function createNordTheme(): Theme {
	return {
		name: 'nord',
		colors: {
			primary: packColor(136, 192, 208), // Frost Blue
			secondary: packColor(180, 142, 173), // Aurora Purple
			accent: packColor(235, 203, 139), // Aurora Yellow
			background: packColor(46, 52, 64), // Polar Night 0
			foreground: packColor(236, 239, 244), // Snow Storm 2
			error: packColor(191, 97, 106), // Aurora Red
			warning: packColor(208, 135, 112), // Aurora Orange
			success: packColor(163, 190, 140), // Aurora Green
			info: packColor(129, 161, 193), // Frost Light Blue
			muted: packColor(76, 86, 106), // Polar Night 2
			border: packColor(59, 66, 82), // Polar Night 1
		},
		borders: {
			style: 'single',
			fg: packColor(59, 66, 82),
			bg: packColor(0, 0, 0, 0),
		},
		focus: {
			fg: packColor(46, 52, 64),
			bg: packColor(136, 192, 208),
			borderFg: packColor(129, 161, 193),
		},
		widgets: {
			button: {
				fg: packColor(46, 52, 64),
				bg: packColor(136, 192, 208),
				activeFg: packColor(46, 52, 64),
				activeBg: packColor(129, 161, 193),
			},
			input: {
				fg: packColor(236, 239, 244),
				bg: packColor(59, 66, 82),
				placeholderFg: packColor(76, 86, 106),
				cursorFg: packColor(236, 239, 244),
			},
			list: {
				fg: packColor(236, 239, 244),
				bg: packColor(46, 52, 64),
				selectedFg: packColor(46, 52, 64),
				selectedBg: packColor(136, 192, 208),
			},
			panel: {
				fg: packColor(236, 239, 244),
				bg: packColor(59, 66, 82),
				headerFg: packColor(236, 239, 244),
				headerBg: packColor(67, 76, 94),
			},
		},
	};
}

/**
 * Creates a Dracula theme.
 *
 * @returns Dracula theme
 *
 * @example
 * ```typescript
 * const theme = createDraculaTheme();
 * registerTheme(theme);
 * ```
 */
export function createDraculaTheme(): Theme {
	return {
		name: 'dracula',
		colors: {
			primary: packColor(189, 147, 249), // Purple
			secondary: packColor(255, 121, 198), // Pink
			accent: packColor(241, 250, 140), // Yellow
			background: packColor(40, 42, 54), // Background
			foreground: packColor(248, 248, 242), // Foreground
			error: packColor(255, 85, 85), // Red
			warning: packColor(255, 184, 108), // Orange
			success: packColor(80, 250, 123), // Green
			info: packColor(139, 233, 253), // Cyan
			muted: packColor(98, 114, 164), // Comment
			border: packColor(68, 71, 90), // Current Line
		},
		borders: {
			style: 'single',
			fg: packColor(68, 71, 90),
			bg: packColor(0, 0, 0, 0),
		},
		focus: {
			fg: packColor(40, 42, 54),
			bg: packColor(189, 147, 249),
			borderFg: packColor(255, 121, 198),
		},
		widgets: {
			button: {
				fg: packColor(40, 42, 54),
				bg: packColor(189, 147, 249),
				activeFg: packColor(40, 42, 54),
				activeBg: packColor(255, 121, 198),
			},
			input: {
				fg: packColor(248, 248, 242),
				bg: packColor(68, 71, 90),
				placeholderFg: packColor(98, 114, 164),
				cursorFg: packColor(248, 248, 242),
			},
			list: {
				fg: packColor(248, 248, 242),
				bg: packColor(40, 42, 54),
				selectedFg: packColor(40, 42, 54),
				selectedBg: packColor(189, 147, 249),
			},
			panel: {
				fg: packColor(248, 248, 242),
				bg: packColor(68, 71, 90),
				headerFg: packColor(248, 248, 242),
				headerBg: packColor(40, 42, 54),
			},
		},
	};
}

/**
 * Creates a Gruvbox Dark theme.
 *
 * @returns Gruvbox theme
 *
 * @example
 * ```typescript
 * const theme = createGruvboxTheme();
 * registerTheme(theme);
 * ```
 */
export function createGruvboxTheme(): Theme {
	return {
		name: 'gruvbox',
		colors: {
			primary: packColor(131, 165, 152), // Aqua
			secondary: packColor(211, 134, 155), // Purple
			accent: packColor(250, 189, 47), // Yellow
			background: packColor(40, 40, 40), // bg0_h
			foreground: packColor(235, 219, 178), // fg1
			error: packColor(251, 73, 52), // Red
			warning: packColor(254, 128, 25), // Orange
			success: packColor(184, 187, 38), // Green
			info: packColor(131, 165, 152), // Aqua
			muted: packColor(146, 131, 116), // fg4
			border: packColor(60, 56, 54), // bg1
		},
		borders: {
			style: 'single',
			fg: packColor(60, 56, 54),
			bg: packColor(0, 0, 0, 0),
		},
		focus: {
			fg: packColor(40, 40, 40),
			bg: packColor(250, 189, 47),
			borderFg: packColor(131, 165, 152),
		},
		widgets: {
			button: {
				fg: packColor(40, 40, 40),
				bg: packColor(131, 165, 152),
				activeFg: packColor(40, 40, 40),
				activeBg: packColor(184, 187, 38),
			},
			input: {
				fg: packColor(235, 219, 178),
				bg: packColor(60, 56, 54),
				placeholderFg: packColor(146, 131, 116),
				cursorFg: packColor(235, 219, 178),
			},
			list: {
				fg: packColor(235, 219, 178),
				bg: packColor(40, 40, 40),
				selectedFg: packColor(40, 40, 40),
				selectedBg: packColor(131, 165, 152),
			},
			panel: {
				fg: packColor(235, 219, 178),
				bg: packColor(60, 56, 54),
				headerFg: packColor(235, 219, 178),
				headerBg: packColor(80, 73, 69),
			},
		},
	};
}
