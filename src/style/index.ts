/**
 * Style System
 *
 * Provides theme management and styling utilities.
 *
 * @module style
 */

export type {
	Theme,
	ThemeBorders,
	ThemeColors,
	ThemeFocus,
	ThemeWidgetStyles,
} from './theme';

export {
	applyTheme,
	applyThemeToAll,
	createDarkTheme,
	createDefaultTheme,
	createHighContrastTheme,
	createLightTheme,
	createTheme,
	getActiveTheme,
	getTheme,
	mergeThemes,
	registerTheme,
	resetThemeRegistry,
	setActiveTheme,
	ThemeSchema,
} from './theme';
