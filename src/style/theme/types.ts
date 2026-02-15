/**
 * Theme type definitions and schemas
 * @module style/theme/types
 */

import { z } from 'zod';

/**
 * Theme color palette.
 */
export interface ThemeColors {
	/** Primary brand color */
	readonly primary: number;
	/** Secondary brand color */
	readonly secondary: number;
	/** Accent color for highlights */
	readonly accent: number;
	/** Default background color */
	readonly background: number;
	/** Default foreground/text color */
	readonly foreground: number;
	/** Error state color */
	readonly error: number;
	/** Warning state color */
	readonly warning: number;
	/** Success state color */
	readonly success: number;
	/** Info state color */
	readonly info: number;
	/** Muted/disabled color */
	readonly muted: number;
	/** Border color */
	readonly border: number;
}

/**
 * Theme border configuration.
 */
export interface ThemeBorders {
	/** Border style */
	readonly style: 'single' | 'double' | 'rounded' | 'heavy' | 'none';
	/** Border foreground color */
	readonly fg: number;
	/** Border background color */
	readonly bg: number;
}

/**
 * Theme focus styling.
 */
export interface ThemeFocus {
	/** Focus foreground color */
	readonly fg: number;
	/** Focus background color */
	readonly bg: number;
	/** Focus border foreground color */
	readonly borderFg: number;
}

/**
 * Widget-specific theme styles.
 */
export interface ThemeWidgetStyles {
	readonly button: {
		readonly fg: number;
		readonly bg: number;
		readonly activeFg: number;
		readonly activeBg: number;
	};
	readonly input: {
		readonly fg: number;
		readonly bg: number;
		readonly placeholderFg: number;
		readonly cursorFg: number;
	};
	readonly list: {
		readonly fg: number;
		readonly bg: number;
		readonly selectedFg: number;
		readonly selectedBg: number;
	};
	readonly panel: {
		readonly fg: number;
		readonly bg: number;
		readonly headerFg: number;
		readonly headerBg: number;
	};
}

/**
 * Complete theme definition.
 */
export interface Theme {
	/** Theme name (unique identifier) */
	readonly name: string;
	/** Color palette */
	readonly colors: ThemeColors;
	/** Border configuration */
	readonly borders: ThemeBorders;
	/** Focus styling */
	readonly focus: ThemeFocus;
	/** Widget-specific styles */
	readonly widgets: ThemeWidgetStyles;
}

/**
 * Zod schema for theme colors.
 */
const ThemeColorsSchema = z.object({
	primary: z.number(),
	secondary: z.number(),
	accent: z.number(),
	background: z.number(),
	foreground: z.number(),
	error: z.number(),
	warning: z.number(),
	success: z.number(),
	info: z.number(),
	muted: z.number(),
	border: z.number(),
});

/**
 * Zod schema for theme borders.
 */
const ThemeBordersSchema = z.object({
	style: z.enum(['single', 'double', 'rounded', 'heavy', 'none']),
	fg: z.number(),
	bg: z.number(),
});

/**
 * Zod schema for theme focus.
 */
const ThemeFocusSchema = z.object({
	fg: z.number(),
	bg: z.number(),
	borderFg: z.number(),
});

/**
 * Zod schema for widget styles.
 */
const ThemeWidgetStylesSchema = z.object({
	button: z.object({
		fg: z.number(),
		bg: z.number(),
		activeFg: z.number(),
		activeBg: z.number(),
	}),
	input: z.object({
		fg: z.number(),
		bg: z.number(),
		placeholderFg: z.number(),
		cursorFg: z.number(),
	}),
	list: z.object({
		fg: z.number(),
		bg: z.number(),
		selectedFg: z.number(),
		selectedBg: z.number(),
	}),
	panel: z.object({
		fg: z.number(),
		bg: z.number(),
		headerFg: z.number(),
		headerBg: z.number(),
	}),
});

/**
 * Zod schema for complete theme.
 */
export const ThemeSchema = z.object({
	name: z.string(),
	colors: ThemeColorsSchema,
	borders: ThemeBordersSchema,
	focus: ThemeFocusSchema,
	widgets: ThemeWidgetStylesSchema,
});

/**
 * Type helper for deep partial objects.
 */
export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T;
