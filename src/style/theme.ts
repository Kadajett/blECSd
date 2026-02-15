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

export * from './theme/index';
