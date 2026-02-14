/**
 * Style System
 *
 * Provides theme management, stylesheet rules, and styling utilities.
 *
 * @module style
 */

export type {
	ApplyResult,
	StyleProperties,
	StyleRule,
	StyleSelector,
	Stylesheet,
} from './stylesheet';
export {
	addRule,
	applyStylesheet,
	applyStylesheetToEntity,
	calculateSpecificity,
	clearRules,
	createStylesheet,
	getMatchingRules,
	matchesSelector,
	removeRules,
	StylePropertiesSchema,
	StyleRuleSchema,
	StyleSelectorSchema,
	StylesheetSchema,
} from './stylesheet';
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
	createDraculaTheme,
	createGruvboxTheme,
	createHighContrastTheme,
	createLightTheme,
	createMonokaiTheme,
	createNordTheme,
	createSolarizedTheme,
	createTheme,
	deserializeTheme,
	extendTheme,
	getActiveTheme,
	getTheme,
	mergeThemes,
	registerTheme,
	resetThemeRegistry,
	serializeTheme,
	setActiveTheme,
	ThemeSchema,
} from './theme';
