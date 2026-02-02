/**
 * Color system for terminal rendering
 * @module terminal/colors
 */

export type { Color256, HSL, HSLA, RGB, RGBA } from './palette';
export {
	ANSI,
	asColor256,
	COLOR_CUBE_LEVELS,
	COLORS,
	Color256Schema,
	colorCubeIndex,
	getHex,
	getRGB,
	grayscaleIndex,
	HexColorSchema,
	HSLASchema,
	HSLSchema,
	isColor256,
	isColorCube,
	isGrayscale,
	isRGB,
	isStandardColor,
	PALETTE_HEX,
	PALETTE_RGB,
	RGBASchema,
	RGBSchema,
} from './palette';
