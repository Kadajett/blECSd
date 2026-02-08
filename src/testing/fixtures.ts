/**
 * Common test fixtures and shared test data for blECSd tests.
 * @module testing/fixtures
 */

// =============================================================================
// SCREEN DIMENSIONS
// =============================================================================

/**
 * Standard terminal screen dimensions (80x24).
 * The most common terminal size, used as default in many terminal emulators.
 */
export const SCREEN_80X24 = {
	width: 80,
	height: 24,
} as const;

/**
 * Small screen dimensions for compact testing.
 */
export const SCREEN_40X12 = {
	width: 40,
	height: 12,
} as const;

/**
 * Large screen dimensions for testing larger layouts.
 */
export const SCREEN_120X40 = {
	width: 120,
	height: 40,
} as const;

/**
 * Minimal screen dimensions for edge case testing.
 */
export const SCREEN_10X5 = {
	width: 10,
	height: 5,
} as const;

// =============================================================================
// POSITION AND SIZE PRESETS
// =============================================================================

/**
 * Origin position (0, 0).
 */
export const POSITION_ORIGIN = {
	x: 0,
	y: 0,
} as const;

/**
 * Center position for standard 80x24 screen.
 */
export const POSITION_CENTER = {
	x: 40,
	y: 12,
} as const;

/**
 * Common small box dimensions (10x5).
 */
export const SIZE_SMALL_BOX = {
	width: 10,
	height: 5,
} as const;

/**
 * Common medium box dimensions (20x10).
 */
export const SIZE_MEDIUM_BOX = {
	width: 20,
	height: 10,
} as const;

/**
 * Common large box dimensions (40x20).
 */
export const SIZE_LARGE_BOX = {
	width: 40,
	height: 20,
} as const;

/**
 * Common button dimensions (10x3).
 */
export const SIZE_BUTTON = {
	width: 10,
	height: 3,
} as const;

// =============================================================================
// TEXT CONTENT
// =============================================================================

/**
 * Simple test string.
 */
export const TEXT_HELLO = 'Hello' as const;

/**
 * Common test phrase.
 */
export const TEXT_HELLO_WORLD = 'Hello, World!' as const;

/**
 * Alternative greeting.
 */
export const TEXT_HELLO_WORLD_ALT = 'Hello World' as const;

/**
 * Single line test text.
 */
export const TEXT_TEST = 'Test' as const;

/**
 * Longer single line text.
 */
export const TEXT_SINGLE_LINE = 'This is a single line of text' as const;

/**
 * Multi-line test text.
 */
export const TEXT_MULTILINE = 'Line 1\nLine 2\nLine 3' as const;

/**
 * Multi-line text with varying lengths.
 */
export const TEXT_MULTILINE_VARIED = 'Hi\nHello World\nBye' as const;

/**
 * Lorem ipsum sample text.
 */
export const TEXT_LOREM_IPSUM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' as const;

/**
 * Long text for wrapping tests.
 */
export const TEXT_LONG_WRAP =
	'This is a very long line of text that should wrap when displayed in a narrow container or widget.' as const;

/**
 * Unicode test text with emoji.
 */
export const TEXT_UNICODE_EMOJI = 'Hello 👋 World 🌍' as const;

/**
 * Unicode test text with Chinese characters.
 */
export const TEXT_UNICODE_CJK = '你好世界' as const;

/**
 * Empty string.
 */
export const TEXT_EMPTY = '' as const;

// =============================================================================
// COLORS
// =============================================================================

/**
 * Standard color palette for testing.
 */
export const COLORS = {
	/** Pure white (0xFFFFFF) */
	WHITE: 0xffffff,
	/** Pure black (0x000000) */
	BLACK: 0x000000,
	/** Pure red (0xFF0000) */
	RED: 0xff0000,
	/** Pure green (0x00FF00) */
	GREEN: 0x00ff00,
	/** Pure blue (0x0000FF) */
	BLUE: 0x0000ff,
	/** Yellow (0xFFFF00) */
	YELLOW: 0xffff00,
	/** Cyan (0x00FFFF) */
	CYAN: 0x00ffff,
	/** Magenta (0xFF00FF) */
	MAGENTA: 0xff00ff,
	/** Light gray (0x888888) */
	LIGHT_GRAY: 0x888888,
	/** Dark gray (0x444444) */
	DARK_GRAY: 0x444444,
	/** Medium gray (0xAAAAAA) */
	MEDIUM_GRAY: 0xaaaaaa,
} as const;

/**
 * RGBA colors (with alpha channel) for testing.
 */
export const COLORS_RGBA = {
	/** White with full opacity */
	WHITE: 0xffffffff,
	/** Black with full opacity */
	BLACK: 0x000000ff,
	/** Red with full opacity */
	RED: 0xff0000ff,
	/** Green with full opacity */
	GREEN: 0x00ff00ff,
	/** Blue with full opacity */
	BLUE: 0x0000ffff,
	/** Yellow with full opacity */
	YELLOW: 0xffff00ff,
	/** Transparent */
	TRANSPARENT: 0x00000000,
	/** Semi-transparent white */
	WHITE_SEMI: 0xffffff80,
} as const;

/**
 * Common color pairs (foreground, background).
 */
export const COLOR_PAIRS = {
	/** White on black (default terminal) */
	WHITE_ON_BLACK: { fg: COLORS.WHITE, bg: COLORS.BLACK },
	/** Black on white (inverted) */
	BLACK_ON_WHITE: { fg: COLORS.BLACK, bg: COLORS.WHITE },
	/** Green on black (matrix style) */
	GREEN_ON_BLACK: { fg: COLORS.GREEN, bg: COLORS.BLACK },
	/** Blue on white (hyperlink style) */
	BLUE_ON_WHITE: { fg: COLORS.BLUE, bg: COLORS.WHITE },
	/** White on blue (button style) */
	WHITE_ON_BLUE: { fg: COLORS.WHITE, bg: COLORS.BLUE },
	/** Yellow on black (warning) */
	YELLOW_ON_BLACK: { fg: COLORS.YELLOW, bg: COLORS.BLACK },
	/** Red on black (error) */
	RED_ON_BLACK: { fg: COLORS.RED, bg: COLORS.BLACK },
} as const;

// =============================================================================
// WIDGET CONFIGURATIONS
// =============================================================================

/**
 * Default border configuration for testing.
 */
export const BORDER_CONFIG_DEFAULT = {
	type: 0, // Border type (single line)
	left: true,
	right: true,
	top: true,
	bottom: true,
} as const;

/**
 * Partial border configuration (top and bottom only).
 */
export const BORDER_CONFIG_HORIZONTAL = {
	type: 0,
	left: false,
	right: false,
	top: true,
	bottom: true,
} as const;

/**
 * Partial border configuration (left and right only).
 */
export const BORDER_CONFIG_VERTICAL = {
	type: 0,
	left: true,
	right: true,
	top: false,
	bottom: false,
} as const;

/**
 * Default padding configuration.
 */
export const PADDING_CONFIG_DEFAULT = {
	left: 1,
	right: 1,
	top: 1,
	bottom: 1,
} as const;

/**
 * Symmetric padding configuration (2 on all sides).
 */
export const PADDING_CONFIG_SYMMETRIC = {
	left: 2,
	right: 2,
	top: 2,
	bottom: 2,
} as const;

/**
 * Horizontal padding only.
 */
export const PADDING_CONFIG_HORIZONTAL = {
	left: 2,
	right: 2,
	top: 0,
	bottom: 0,
} as const;

/**
 * Vertical padding only.
 */
export const PADDING_CONFIG_VERTICAL = {
	left: 0,
	right: 0,
	top: 1,
	bottom: 1,
} as const;

/**
 * Default scrollable configuration.
 */
export const SCROLLABLE_CONFIG_DEFAULT = {
	scrollable: true,
	scrollX: 0,
	scrollY: 0,
} as const;

// =============================================================================
// INPUT / INTERACTION
// =============================================================================

/**
 * Common keyboard input strings.
 */
export const KEYS = {
	ENTER: '\r',
	ESC: '\x1b',
	TAB: '\t',
	BACKSPACE: '\x7f',
	SPACE: ' ',
	ARROW_UP: '\x1b[A',
	ARROW_DOWN: '\x1b[B',
	ARROW_RIGHT: '\x1b[C',
	ARROW_LEFT: '\x1b[D',
} as const;

/**
 * Common mouse event positions.
 */
export const MOUSE_POSITIONS = {
	/** Top-left corner */
	TOP_LEFT: { x: 0, y: 0 },
	/** Center of standard screen */
	CENTER: { x: 40, y: 12 },
	/** Bottom-right of standard screen */
	BOTTOM_RIGHT: { x: 79, y: 23 },
} as const;

// =============================================================================
// ANSI / TERMINAL CODES
// =============================================================================

/**
 * Common ANSI escape sequences for testing.
 */
export const ANSI = {
	/** Reset all attributes */
	RESET: '\x1b[0m',
	/** Bold text */
	BOLD: '\x1b[1m',
	/** Dim text */
	DIM: '\x1b[2m',
	/** Italic text */
	ITALIC: '\x1b[3m',
	/** Underline text */
	UNDERLINE: '\x1b[4m',
	/** Blink text */
	BLINK: '\x1b[5m',
	/** Inverse colors */
	INVERSE: '\x1b[7m',
	/** Clear screen */
	CLEAR_SCREEN: '\x1b[2J',
	/** Move cursor to home */
	CURSOR_HOME: '\x1b[H',
} as const;

/**
 * Sample ANSI colored text strings.
 */
export const ANSI_TEXT = {
	/** Red text */
	RED_TEXT: '\x1b[31mRed Text\x1b[0m',
	/** Green text */
	GREEN_TEXT: '\x1b[32mGreen Text\x1b[0m',
	/** Blue text */
	BLUE_TEXT: '\x1b[34mBlue Text\x1b[0m',
	/** Bold white text */
	BOLD_WHITE: '\x1b[1;37mBold White\x1b[0m',
} as const;

// =============================================================================
// TIMING
// =============================================================================

/**
 * Common timeout values for tests (in milliseconds).
 */
export const TIMEOUTS = {
	/** Very short delay (10ms) */
	VERY_SHORT: 10,
	/** Short delay (50ms) */
	SHORT: 50,
	/** Medium delay (100ms) */
	MEDIUM: 100,
	/** Long delay (500ms) */
	LONG: 500,
	/** Very long delay (1000ms) */
	VERY_LONG: 1000,
} as const;
