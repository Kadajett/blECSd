/**
 * Truecolor (24-bit RGB) Support
 *
 * Provides first-class 24-bit RGB color support with automatic
 * downgrade for terminals without truecolor capability.
 *
 * @module terminal/colors/truecolor
 */

import { getTerminalCapabilities, type TerminalCapabilities } from '../capabilities';
import { type ColorValue, hexToRgb, parseColor, rgbToColor256 } from './convert';
import type { Color256, RGB } from './palette';
import { rgbTo8, rgbTo16 } from './reduce';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Color depth levels for capability detection.
 */
export const ColorDepthLevel = {
	/** Monochrome (no color) */
	MONO: 1,
	/** 8 basic colors */
	BASIC_8: 8,
	/** 16 colors (8 + bright variants) */
	STANDARD_16: 16,
	/** 256 color palette */
	PALETTE_256: 256,
	/** 24-bit truecolor (16.7 million colors) */
	TRUECOLOR: 16777216,
} as const;

export type ColorDepthLevelValue = (typeof ColorDepthLevel)[keyof typeof ColorDepthLevel];

/**
 * CSI escape sequence prefix.
 */
const CSI = '\x1b[';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Color representation that can work across all color depths.
 */
export interface Color {
	/** 24-bit packed RGB value */
	readonly rgb: number;
	/** Original RGB components */
	readonly r: number;
	readonly g: number;
	readonly b: number;
	/** Optional alpha (0-1) */
	readonly a?: number;
	/** Nearest 256-color palette index */
	readonly color256: Color256;
	/** Nearest 16-color index */
	readonly color16: number;
	/** Nearest 8-color index */
	readonly color8: number;
}

/**
 * Truecolor support configuration.
 */
export interface TruecolorConfig {
	/** Force a specific color depth (bypasses auto-detection) */
	readonly forceDepth?: ColorDepthLevelValue;
	/** Custom capability provider (for testing) */
	readonly capabilities?: TerminalCapabilities;
	/** Enable dithering for gradients (game-configurable) */
	readonly dithering?: boolean;
}

/**
 * Truecolor support interface.
 */
export interface TruecolorSupport {
	/**
	 * Creates a Color from RGB components.
	 *
	 * @param r - Red component (0-255)
	 * @param g - Green component (0-255)
	 * @param b - Blue component (0-255)
	 * @returns Color object with all depth representations
	 *
	 * @example
	 * ```typescript
	 * const red = truecolor.rgb(255, 0, 0);
	 * console.log(red.rgb); // 0xff0000
	 * ```
	 */
	rgb(r: number, g: number, b: number): Color;

	/**
	 * Creates a Color from RGBA components.
	 *
	 * @param r - Red component (0-255)
	 * @param g - Green component (0-255)
	 * @param b - Blue component (0-255)
	 * @param a - Alpha component (0-1)
	 * @returns Color object with alpha
	 */
	rgba(r: number, g: number, b: number, a: number): Color;

	/**
	 * Creates a Color from a hex string.
	 *
	 * @param hex - Hex color string (#RGB, #RRGGBB, or #RRGGBBAA)
	 * @returns Color object
	 *
	 * @example
	 * ```typescript
	 * const red = truecolor.fromHex('#ff0000');
	 * const blue = truecolor.fromHex('#00f');
	 * ```
	 */
	fromHex(hex: string): Color;

	/**
	 * Creates a Color from any supported color value.
	 *
	 * @param value - Hex string, RGB object, or number
	 * @returns Color object
	 *
	 * @example
	 * ```typescript
	 * truecolor.from('#ff0000');
	 * truecolor.from({ r: 255, g: 0, b: 0 });
	 * truecolor.from(0xff0000);
	 * ```
	 */
	from(value: ColorValue): Color;

	/**
	 * Creates a Color with modified alpha.
	 *
	 * @param color - Base color
	 * @param opacity - New opacity (0-1)
	 * @returns New Color with updated alpha
	 */
	withOpacity(color: Color, opacity: number): Color;

	/**
	 * Gets the SGR foreground sequence for a color.
	 * Automatically downgrades based on terminal capabilities.
	 *
	 * @param color - Color to use
	 * @returns SGR escape sequence string
	 *
	 * @example
	 * ```typescript
	 * const red = truecolor.rgb(255, 0, 0);
	 * process.stdout.write(truecolor.fg(red) + 'Red text');
	 * ```
	 */
	fg(color: Color): string;

	/**
	 * Gets the SGR background sequence for a color.
	 * Automatically downgrades based on terminal capabilities.
	 *
	 * @param color - Color to use
	 * @returns SGR escape sequence string
	 */
	bg(color: Color): string;

	/**
	 * Gets the current color depth based on terminal capabilities.
	 *
	 * @returns Color depth level
	 */
	getDepth(): ColorDepthLevelValue;

	/**
	 * Checks if truecolor is supported.
	 */
	isTruecolorSupported(): boolean;

	/**
	 * Forces a specific color depth.
	 * Useful for testing or user preference.
	 *
	 * @param depth - Color depth level
	 */
	setDepth(depth: ColorDepthLevelValue): void;

	/**
	 * Resets to auto-detected color depth.
	 */
	resetDepth(): void;

	/**
	 * Creates a gradient between two colors.
	 *
	 * @param from - Start color
	 * @param to - End color
	 * @param steps - Number of gradient steps
	 * @returns Array of Color objects
	 *
	 * @example
	 * ```typescript
	 * const gradient = truecolor.gradient(
	 *   truecolor.fromHex('#ff0000'),
	 *   truecolor.fromHex('#0000ff'),
	 *   10
	 * );
	 * ```
	 */
	gradient(from: Color, to: Color, steps: number): Color[];

	/**
	 * Blends two colors with optional ratio.
	 *
	 * @param color1 - First color
	 * @param color2 - Second color
	 * @param ratio - Blend ratio (0 = color1, 1 = color2)
	 * @returns Blended Color
	 */
	blend(color1: Color, color2: Color, ratio?: number): Color;
}

// =============================================================================
// COLOR FACTORY
// =============================================================================

/**
 * Creates a Color object from RGB components.
 */
function createColor(r: number, g: number, b: number, a?: number): Color {
	const clampR = Math.max(0, Math.min(255, Math.round(r)));
	const clampG = Math.max(0, Math.min(255, Math.round(g)));
	const clampB = Math.max(0, Math.min(255, Math.round(b)));

	const rgb = (clampR << 16) | (clampG << 8) | clampB;
	const rgbObj: RGB = { r: clampR, g: clampG, b: clampB };

	return {
		rgb,
		r: clampR,
		g: clampG,
		b: clampB,
		a,
		color256: rgbToColor256(rgbObj),
		color16: rgbTo16(rgbObj),
		color8: rgbTo8(rgbObj),
	};
}

// =============================================================================
// ESCAPE SEQUENCE GENERATION
// =============================================================================

/**
 * Generates foreground SGR sequence for truecolor.
 */
function fgTruecolor(color: Color): string {
	return `${CSI}38;2;${color.r};${color.g};${color.b}m`;
}

/**
 * Generates background SGR sequence for truecolor.
 */
function bgTruecolor(color: Color): string {
	return `${CSI}48;2;${color.r};${color.g};${color.b}m`;
}

/**
 * Generates foreground SGR sequence for 256 colors.
 */
function fg256(color: Color): string {
	return `${CSI}38;5;${color.color256}m`;
}

/**
 * Generates background SGR sequence for 256 colors.
 */
function bg256(color: Color): string {
	return `${CSI}48;5;${color.color256}m`;
}

/**
 * Generates foreground SGR sequence for 16 colors.
 */
function fg16(color: Color): string {
	const c = color.color16;
	if (c < 8) {
		return `${CSI}3${c}m`;
	}
	return `${CSI}9${c - 8}m`;
}

/**
 * Generates background SGR sequence for 16 colors.
 */
function bg16(color: Color): string {
	const c = color.color16;
	if (c < 8) {
		return `${CSI}4${c}m`;
	}
	return `${CSI}10${c - 8}m`;
}

/**
 * Generates foreground SGR sequence for 8 colors.
 */
function fg8(color: Color): string {
	return `${CSI}3${color.color8}m`;
}

/**
 * Generates background SGR sequence for 8 colors.
 */
function bg8(color: Color): string {
	return `${CSI}4${color.color8}m`;
}

// =============================================================================
// TRUECOLOR SUPPORT FACTORY
// =============================================================================

/**
 * Creates a TruecolorSupport instance.
 *
 * @param config - Configuration options
 * @returns TruecolorSupport instance
 *
 * @example
 * ```typescript
 * import { createTruecolorSupport } from 'blecsd';
 *
 * const truecolor = createTruecolorSupport();
 *
 * // Create colors
 * const red = truecolor.rgb(255, 0, 0);
 * const blue = truecolor.fromHex('#0000ff');
 *
 * // Use in terminal output
 * process.stdout.write(truecolor.fg(red) + 'Red text' + '\x1b[0m');
 *
 * // Check capabilities
 * if (truecolor.isTruecolorSupported()) {
 *   console.log('24-bit color supported!');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Force a specific color depth
 * const truecolor = createTruecolorSupport({
 *   forceDepth: 256,  // Force 256-color mode
 * });
 * ```
 */
export function createTruecolorSupport(config: TruecolorConfig = {}): TruecolorSupport {
	let forcedDepth: ColorDepthLevelValue | undefined = config.forceDepth;
	let cachedCapabilities: TerminalCapabilities | null = config.capabilities ?? null;
	let cachedDepth: ColorDepthLevelValue | null = null;

	/**
	 * Gets terminal capabilities (cached).
	 */
	async function getCapabilities(): Promise<TerminalCapabilities> {
		if (cachedCapabilities) {
			return cachedCapabilities;
		}
		cachedCapabilities = await getTerminalCapabilities();
		return cachedCapabilities;
	}

	/**
	 * Detects color depth from capabilities.
	 */
	function detectDepth(caps: TerminalCapabilities): ColorDepthLevelValue {
		if (caps.truecolor) {
			return ColorDepthLevel.TRUECOLOR;
		}

		// Check environment for 256-color support
		const term = process.env.TERM ?? '';
		if (term.includes('256color') || term.includes('256-color')) {
			return ColorDepthLevel.PALETTE_256;
		}

		// Check for 16-color support
		if (term.includes('xterm') || term.includes('vt100') || term.includes('screen')) {
			return ColorDepthLevel.STANDARD_16;
		}

		// Check for basic color support
		if (term && term !== 'dumb') {
			return ColorDepthLevel.BASIC_8;
		}

		return ColorDepthLevel.MONO;
	}

	/**
	 * Gets the current color depth (sync version using cached value).
	 */
	function getDepthSync(): ColorDepthLevelValue {
		if (forcedDepth !== undefined) {
			return forcedDepth;
		}

		if (cachedDepth !== null) {
			return cachedDepth;
		}

		// Synchronous fallback based on environment
		const colorterm = process.env.COLORTERM;
		if (colorterm === 'truecolor' || colorterm === '24bit') {
			cachedDepth = ColorDepthLevel.TRUECOLOR;
			return cachedDepth;
		}

		const term = process.env.TERM ?? '';
		if (term.includes('256color')) {
			cachedDepth = ColorDepthLevel.PALETTE_256;
			return cachedDepth;
		}

		if (term.includes('xterm') || term.includes('screen')) {
			cachedDepth = ColorDepthLevel.STANDARD_16;
			return cachedDepth;
		}

		if (term && term !== 'dumb') {
			cachedDepth = ColorDepthLevel.BASIC_8;
			return cachedDepth;
		}

		cachedDepth = ColorDepthLevel.MONO;
		return cachedDepth;
	}

	const support: TruecolorSupport = {
		rgb(r: number, g: number, b: number): Color {
			return createColor(r, g, b);
		},

		rgba(r: number, g: number, b: number, a: number): Color {
			return createColor(r, g, b, a);
		},

		fromHex(hex: string): Color {
			const rgb = hexToRgb(hex);
			if ('a' in rgb) {
				return createColor(rgb.r, rgb.g, rgb.b, rgb.a);
			}
			return createColor(rgb.r, rgb.g, rgb.b);
		},

		from(value: ColorValue): Color {
			const rgb = parseColor(value);
			return createColor(rgb.r, rgb.g, rgb.b);
		},

		withOpacity(color: Color, opacity: number): Color {
			return createColor(color.r, color.g, color.b, Math.max(0, Math.min(1, opacity)));
		},

		fg(color: Color): string {
			const depth = getDepthSync();

			switch (depth) {
				case ColorDepthLevel.TRUECOLOR:
					return fgTruecolor(color);
				case ColorDepthLevel.PALETTE_256:
					return fg256(color);
				case ColorDepthLevel.STANDARD_16:
					return fg16(color);
				case ColorDepthLevel.BASIC_8:
					return fg8(color);
				default:
					return ''; // Mono - no color
			}
		},

		bg(color: Color): string {
			const depth = getDepthSync();

			switch (depth) {
				case ColorDepthLevel.TRUECOLOR:
					return bgTruecolor(color);
				case ColorDepthLevel.PALETTE_256:
					return bg256(color);
				case ColorDepthLevel.STANDARD_16:
					return bg16(color);
				case ColorDepthLevel.BASIC_8:
					return bg8(color);
				default:
					return ''; // Mono - no color
			}
		},

		getDepth(): ColorDepthLevelValue {
			return getDepthSync();
		},

		isTruecolorSupported(): boolean {
			return getDepthSync() === ColorDepthLevel.TRUECOLOR;
		},

		setDepth(depth: ColorDepthLevelValue): void {
			forcedDepth = depth;
		},

		resetDepth(): void {
			forcedDepth = undefined;
			cachedDepth = null;
		},

		gradient(from: Color, to: Color, steps: number): Color[] {
			if (steps < 2) {
				return [from];
			}

			const colors: Color[] = [];
			for (let i = 0; i < steps; i++) {
				const ratio = i / (steps - 1);
				colors.push(support.blend(from, to, ratio));
			}
			return colors;
		},

		blend(color1: Color, color2: Color, ratio = 0.5): Color {
			const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
			const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
			const b = Math.round(color1.b + (color2.b - color1.b) * ratio);

			let a: number | undefined;
			if (color1.a !== undefined || color2.a !== undefined) {
				const a1 = color1.a ?? 1;
				const a2 = color2.a ?? 1;
				a = a1 + (a2 - a1) * ratio;
			}

			return createColor(r, g, b, a);
		},
	};

	// Initialize capabilities asynchronously if not provided
	if (!config.capabilities) {
		getCapabilities().then((caps) => {
			cachedDepth = detectDepth(caps);
		});
	} else if (config.capabilities) {
		cachedDepth = detectDepth(config.capabilities);
	}

	return support;
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default TruecolorSupport instance.
 */
let defaultTruecolor: TruecolorSupport | null = null;

/**
 * Gets the default TruecolorSupport instance.
 *
 * @returns Default TruecolorSupport instance
 *
 * @example
 * ```typescript
 * import { getDefaultTruecolor } from 'blecsd';
 *
 * const truecolor = getDefaultTruecolor();
 * const red = truecolor.rgb(255, 0, 0);
 * ```
 */
export function getDefaultTruecolor(): TruecolorSupport {
	if (!defaultTruecolor) {
		defaultTruecolor = createTruecolorSupport();
	}
	return defaultTruecolor;
}

/**
 * Resets the default TruecolorSupport instance.
 * For testing purposes.
 */
export function resetDefaultTruecolor(): void {
	defaultTruecolor = null;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Creates a Color from RGB components using the default instance.
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Color object
 *
 * @example
 * ```typescript
 * import { rgb } from 'blecsd';
 *
 * const red = rgb(255, 0, 0);
 * ```
 */
export function rgb(r: number, g: number, b: number): Color {
	return getDefaultTruecolor().rgb(r, g, b);
}

/**
 * Creates a Color from RGBA components using the default instance.
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param a - Alpha component (0-1)
 * @returns Color object
 */
export function rgba(r: number, g: number, b: number, a: number): Color {
	return getDefaultTruecolor().rgba(r, g, b, a);
}

/**
 * Creates a Color from a hex string using the default instance.
 *
 * @param hex - Hex color string
 * @returns Color object
 *
 * @example
 * ```typescript
 * import { hex } from 'blecsd';
 *
 * const red = hex('#ff0000');
 * const blue = hex('#00f');
 * ```
 */
export function hex(hexValue: string): Color {
	return getDefaultTruecolor().fromHex(hexValue);
}

/**
 * Creates a Color from any color value using the default instance.
 *
 * @param value - Color value (hex, RGB, or number)
 * @returns Color object
 *
 * @example
 * ```typescript
 * import { color } from 'blecsd';
 *
 * const c1 = color('#ff0000');
 * const c2 = color({ r: 255, g: 0, b: 0 });
 * const c3 = color(0xff0000);
 * ```
 */
export function color(value: ColorValue): Color {
	return getDefaultTruecolor().from(value);
}

/**
 * Gets the foreground SGR sequence for a color.
 *
 * @param c - Color object
 * @returns SGR escape sequence
 *
 * @example
 * ```typescript
 * import { rgb, fg } from 'blecsd';
 *
 * const red = rgb(255, 0, 0);
 * process.stdout.write(fg(red) + 'Red text' + '\x1b[0m');
 * ```
 */
export function fg(c: Color): string {
	return getDefaultTruecolor().fg(c);
}

/**
 * Gets the background SGR sequence for a color.
 *
 * @param c - Color object
 * @returns SGR escape sequence
 */
export function bg(c: Color): string {
	return getDefaultTruecolor().bg(c);
}

/**
 * Checks if truecolor is supported.
 *
 * @returns true if 24-bit color is supported
 *
 * @example
 * ```typescript
 * import { isTruecolor } from 'blecsd';
 *
 * if (isTruecolor()) {
 *   console.log('24-bit color supported!');
 * }
 * ```
 */
export function isTruecolor(): boolean {
	return getDefaultTruecolor().isTruecolorSupported();
}

/**
 * Gets the current color depth.
 *
 * @returns Color depth level
 *
 * @example
 * ```typescript
 * import { getColorDepthLevel, ColorDepthLevel } from 'blecsd';
 *
 * const depth = getColorDepthLevel();
 * if (depth >= ColorDepthLevel.PALETTE_256) {
 *   console.log('At least 256 colors supported');
 * }
 * ```
 */
export function getColorDepthLevel(): ColorDepthLevelValue {
	return getDefaultTruecolor().getDepth();
}
