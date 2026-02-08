/**
 * Theme System
 *
 * Centralized theme management for consistent styling across all widgets.
 * Provides built-in themes (default, dark, light, high-contrast) and supports
 * custom theme creation and runtime theme switching.
 *
 * @module style/theme
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import {
 *   registerTheme,
 *   createDarkTheme,
 *   setActiveTheme,
 *   applyThemeToAll,
 * } from 'blecsd/style';
 *
 * const world = createWorld();
 *
 * // Register and activate dark theme
 * registerTheme(createDarkTheme());
 * setActiveTheme(world, 'dark');
 * applyThemeToAll(world);
 * ```
 */

import { z } from 'zod';
import { markDirty, Renderable, setStyle } from '../components/renderable';
import { hasComponent, query } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { packColor } from '../utils/color';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

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

// =============================================================================
// THEME REGISTRY
// =============================================================================

/** Global theme registry */
const themeRegistry = new Map<string, Theme>();

/** Active theme storage per world */
const activeThemeMap = new Map<World, string>();

/**
 * Registers a theme in the global registry.
 *
 * @param theme - Theme to register
 *
 * @example
 * ```typescript
 * const customTheme = createTheme('custom', {
 *   colors: { primary: packColor(255, 0, 0) },
 * });
 * registerTheme(customTheme);
 * ```
 */
export function registerTheme(theme: Theme): void {
	ThemeSchema.parse(theme);
	themeRegistry.set(theme.name, theme);
}

/**
 * Retrieves a theme from the registry by name.
 *
 * @param name - Theme name
 * @returns Theme or undefined if not found
 *
 * @example
 * ```typescript
 * const theme = getTheme('dark');
 * if (theme) {
 *   console.log(`Primary color: ${theme.colors.primary}`);
 * }
 * ```
 */
export function getTheme(name: string): Theme | undefined {
	return themeRegistry.get(name);
}

/**
 * Sets the active theme for a world.
 *
 * @param world - The ECS world
 * @param name - Theme name
 * @throws Error if theme is not registered
 *
 * @example
 * ```typescript
 * setActiveTheme(world, 'dark');
 * ```
 */
export function setActiveTheme(world: World, name: string): void {
	const theme = themeRegistry.get(name);
	if (!theme) {
		throw new Error(`Theme "${name}" is not registered`);
	}
	activeThemeMap.set(world, name);
}

/**
 * Gets the active theme for a world.
 * Defaults to 'default' theme if no theme is set.
 *
 * @param world - The ECS world
 * @returns The active theme
 * @throws Error if no themes are registered
 *
 * @example
 * ```typescript
 * const theme = getActiveTheme(world);
 * console.log(`Active theme: ${theme.name}`);
 * ```
 */
export function getActiveTheme(world: World): Theme {
	const activeName = activeThemeMap.get(world) ?? 'default';
	const theme = themeRegistry.get(activeName);

	if (!theme) {
		throw new Error(`No theme registered. Register at least one theme before use.`);
	}

	return theme;
}

/**
 * Resets the theme registry (useful for testing).
 *
 * @example
 * ```typescript
 * resetThemeRegistry();
 * ```
 */
export function resetThemeRegistry(): void {
	themeRegistry.clear();
	activeThemeMap.clear();
}

// =============================================================================
// BUILT-IN THEMES
// =============================================================================

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

// =============================================================================
// THEME CREATION & MERGING
// =============================================================================

/**
 * Creates a custom theme with partial overrides.
 * Missing values are filled from the default theme.
 *
 * @param name - Theme name
 * @param overrides - Partial theme overrides
 * @returns Complete theme
 *
 * @example
 * ```typescript
 * const custom = createTheme('custom', {
 *   colors: {
 *     primary: packColor(255, 0, 0),
 *   },
 * });
 * ```
 */
export function createTheme(name: string, overrides: Partial<Omit<Theme, 'name'>>): Theme {
	const base = createDefaultTheme();
	const merged = mergeThemes(base, overrides);
	return { ...merged, name };
}

/**
 * Merges a base theme with partial overrides.
 *
 * @param base - Base theme
 * @param overrides - Partial overrides
 * @returns Merged theme
 *
 * @example
 * ```typescript
 * const custom = mergeThemes(createDefaultTheme(), {
 *   colors: { primary: packColor(255, 0, 0) } as Partial<ThemeColors>,
 * });
 * ```
 */
export function mergeThemes(base: Theme, overrides: Partial<Omit<Theme, 'name'>>): Theme {
	return {
		name: base.name,
		colors: { ...base.colors, ...((overrides.colors as Partial<ThemeColors>) ?? {}) },
		borders: { ...base.borders, ...((overrides.borders as Partial<ThemeBorders>) ?? {}) },
		focus: { ...base.focus, ...((overrides.focus as Partial<ThemeFocus>) ?? {}) },
		widgets: {
			button: { ...base.widgets.button, ...(overrides.widgets?.button ?? {}) },
			input: { ...base.widgets.input, ...(overrides.widgets?.input ?? {}) },
			list: { ...base.widgets.list, ...(overrides.widgets?.list ?? {}) },
			panel: { ...base.widgets.panel, ...(overrides.widgets?.panel ?? {}) },
		},
	};
}

// =============================================================================
// THEME APPLICATION
// =============================================================================

/**
 * Applies the active theme to an entity.
 * Adds Renderable component if not present.
 *
 * @param world - The ECS world
 * @param eid - Entity to apply theme to
 *
 * @example
 * ```typescript
 * const entity = addEntity(world);
 * applyTheme(world, entity);
 * ```
 */
export function applyTheme(world: World, eid: Entity): void {
	const theme = getActiveTheme(world);

	setStyle(world, eid, {
		fg: theme.colors.foreground,
		bg: theme.colors.background,
	});

	markDirty(world, eid);
}

/**
 * Applies the active theme to all entities with Renderable components.
 * Useful when switching themes at runtime.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * setActiveTheme(world, 'dark');
 * applyThemeToAll(world);
 * ```
 */
export function applyThemeToAll(world: World): void {
	const theme = getActiveTheme(world);
	const entities = query(world, [Renderable]) as Entity[];

	for (const eid of entities) {
		if (!hasComponent(world, eid, Renderable)) {
			continue;
		}

		Renderable.fg[eid] = theme.colors.foreground;
		Renderable.bg[eid] = theme.colors.background;
		Renderable.dirty[eid] = 1;
	}
}
