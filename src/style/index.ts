/**
 * Style System
 *
 * Provides theme management, stylesheet rules, color manipulation,
 * color conversion, and style inheritance utilities.
 *
 * @module style
 */

// =============================================================================
// STYLESHEET
// =============================================================================

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

// =============================================================================
// THEMES
// =============================================================================

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

// =============================================================================
// COLOR NAMES
// =============================================================================

export type {
	BasicColorName,
	BrightColorName,
	ColorName,
	DarkColorName,
	LightColorName,
	SpecialColorName,
} from '../terminal/colors/names';
export {
	COLOR_ALIASES,
	COLOR_NAMES,
	ColorNameSchema,
	CSS_COLORS,
	colorToName,
	cssNameToColor,
	getColorNames,
	getCssColorNames,
	isColorName,
	isSpecialColor,
	nameToColor,
} from '../terminal/colors/names';

// =============================================================================
// COLOR BLENDING
// =============================================================================

export {
	blend,
	blendAlpha,
	blendWithAlpha,
	complement,
	contrastRatio,
	darken,
	darken256,
	desaturate,
	gradient,
	gradient256,
	grayscale,
	invert,
	isReadable,
	lighten,
	lighten256,
	luminance,
	mix,
	rotateHue,
	saturate,
} from '../terminal/colors/blend';

// =============================================================================
// COLOR CONVERSION (user-facing subset)
// =============================================================================

export type { ColorValue } from '../terminal/colors/convert';
export {
	color256ToHex,
	color256ToRgb,
	hexToColor256,
	hexToRgb,
	hslaToRgba,
	hslToRgb,
	rgbaToHex,
	rgbaToHsla,
	rgbToColor256,
	rgbToHex,
	rgbToHsl,
} from '../terminal/colors/convert';

// =============================================================================
// COLOR TYPES & SCHEMAS
// =============================================================================

export type { Color256, HSL, HSLA, RGB, RGBA } from '../terminal/colors/palette';
export {
	Color256Schema,
	HexColorSchema,
	HSLASchema,
	HSLSchema,
	isColor256,
	isRGB,
	RGBASchema,
	RGBSchema,
} from '../terminal/colors/palette';

// =============================================================================
// PACKED COLOR UTILITIES
// =============================================================================

export {
	colorToHex,
	hexToColor,
	packColor,
	unpackColor,
} from '../utils/color';

// =============================================================================
// STYLE INHERITANCE
// =============================================================================

export {
	clearStyleCache,
	computeInheritedStyle,
	doesPropertyInherit,
	findPropertySource,
	getComputedStyles,
	getDefaultStyle,
	getInheritedProperty,
	getLocalStyle,
	INHERITING_PROPERTIES,
	invalidateAllStyleCaches,
	invalidateStyleCache,
	isDefaultColor,
	mergeStyles,
	NON_INHERITING_PROPERTIES,
	precomputeStyles,
	resolveStyle,
} from '../core/styleInheritance';
