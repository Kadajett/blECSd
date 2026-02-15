/**
 * Theme creation and merging utilities
 * @module style/theme/creation
 */

import { getTheme } from './registry';
import { createDefaultTheme } from './themes';
import type { DeepPartial, Theme, ThemeBorders, ThemeColors, ThemeFocus } from './types';
import { ThemeSchema } from './types';

/**
 * Deeply merges two objects.
 *
 * @param target - Target object
 * @param source - Source object with overrides
 * @returns Merged object
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
	const output: Record<string, unknown> = { ...target };

	for (const key in source) {
		if (Object.hasOwn(source, key)) {
			const sourceValue = source[key];
			const targetValue = output[key];

			if (
				sourceValue &&
				typeof sourceValue === 'object' &&
				!Array.isArray(sourceValue) &&
				targetValue &&
				typeof targetValue === 'object' &&
				!Array.isArray(targetValue)
			) {
				output[key] = deepMerge(
					targetValue as Record<string, unknown>,
					sourceValue as DeepPartial<Record<string, unknown>>,
				);
			} else if (sourceValue !== undefined) {
				output[key] = sourceValue;
			}
		}
	}

	return output as T;
}

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

/**
 * Creates a new theme by extending an existing registered theme.
 * Performs deep merge of overrides onto the base theme.
 *
 * @param baseThemeName - Name of the base theme in the registry
 * @param name - Name for the new theme
 * @param overrides - Deep partial overrides to apply
 * @returns New theme with merged properties
 * @throws Error if base theme is not registered
 *
 * @example
 * ```typescript
 * registerTheme(createDarkTheme());
 *
 * const customDark = extendTheme('dark', 'custom-dark', {
 *   colors: {
 *     primary: packColor(255, 0, 0),
 *   },
 *   widgets: {
 *     button: {
 *       bg: packColor(255, 0, 0),
 *     },
 *   },
 * });
 * ```
 */
export function extendTheme(
	baseThemeName: string,
	name: string,
	overrides: DeepPartial<Omit<Theme, 'name'>>,
): Theme {
	const baseTheme = getTheme(baseThemeName);

	if (!baseTheme) {
		throw new Error(`Base theme "${baseThemeName}" is not registered`);
	}

	const merged = deepMerge(baseTheme as unknown as Record<string, unknown>, overrides);
	return { ...(merged as unknown as Theme), name };
}

/**
 * Serializes a theme to JSON string.
 *
 * @param theme - Theme to serialize
 * @returns JSON string representation
 *
 * @example
 * ```typescript
 * const theme = createDarkTheme();
 * const json = serializeTheme(theme);
 * localStorage.setItem('theme', json);
 * ```
 */
export function serializeTheme(theme: Theme): string {
	return JSON.stringify(theme);
}

/**
 * Deserializes a theme from JSON string.
 * Validates the theme structure with Zod.
 *
 * @param json - JSON string to deserialize
 * @returns Validated theme
 * @throws Error if JSON is invalid or theme fails validation
 *
 * @example
 * ```typescript
 * const json = localStorage.getItem('theme');
 * if (json) {
 *   const theme = deserializeTheme(json);
 *   registerTheme(theme);
 * }
 * ```
 */
export function deserializeTheme(json: string): Theme {
	const parsed: unknown = JSON.parse(json);
	return ThemeSchema.parse(parsed);
}
