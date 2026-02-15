/**
 * Theme registry management
 * @module style/theme/registry
 */

import type { World } from '../../core/types';
import type { Theme } from './types';
import { ThemeSchema } from './types';

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
