/**
 * Terminal feature detection system.
 *
 * Detects terminal capabilities, quirks, and modern protocol support.
 *
 * @module terminal/terminfo/features
 */

import { parseAcsc } from './acs';
import type { TerminfoData } from './tput';

/**
 * Detected terminal features.
 */
export interface TerminalFeatures {
	/** Terminal supports Unicode */
	unicode: boolean;
	/** ACS (alternate character set) is broken/unsupported */
	brokenACS: boolean;
	/** Terminal uses PC ROM character set */
	pcRomSet: boolean;
	/** Terminal has magic cookie glitch */
	magicCookie: boolean;
	/** Terminal requires padding */
	padding: boolean;
	/** Terminal needs setbuf */
	setbuf: boolean;
	/** Parsed ACS character map */
	acsc: Map<string, string>;
	/** Reverse ACS map (Unicode to code) */
	acscReverse: Map<string, string>;
	/** Number of colors supported */
	colors: number;
	/** Supports true color (24-bit) */
	trueColor: boolean;
	/** Supports 256 colors */
	color256: boolean;
	/** Has alternate screen buffer */
	alternateScreen: boolean;
	/** Supports mouse tracking */
	mouse: boolean;
	/** Supports focus events */
	focusEvents: boolean;
	/** Supports bracketed paste */
	bracketedPaste: boolean;
	/** Supports title setting */
	title: boolean;
}

/**
 * Modern terminal protocol support.
 */
export interface ModernProtocols {
	/** Kitty keyboard protocol support */
	kittyKeyboard: boolean;
	/** Kitty graphics protocol support */
	kittyGraphics: boolean;
	/** iTerm2 inline images support */
	iterm2Images: boolean;
	/** Sixel graphics support */
	sixel: boolean;
	/** OSC 8 hyperlinks support */
	hyperlinks: boolean;
	/** Synchronized output (DEC 2026) support */
	synchronizedOutput: boolean;
}

/**
 * Options for feature detection.
 */
export interface FeatureDetectionOptions {
	/** Force Unicode support on/off */
	forceUnicode?: boolean;
	/** Use termcap data (affects some quirk detection) */
	termcap?: boolean;
}

/**
 * Detects if Unicode is supported by the terminal.
 *
 * Checks environment variables and locale settings.
 *
 * @param options - Detection options
 * @returns true if Unicode is likely supported
 *
 * @example
 * ```typescript
 * import { detectUnicode } from 'blecsd';
 *
 * if (detectUnicode()) {
 *   console.log('Unicode box drawing available');
 * } else {
 *   console.log('Falling back to ASCII');
 * }
 * ```
 */
export function detectUnicode(options: FeatureDetectionOptions = {}): boolean {
	// Check for forced setting via option
	if (options.forceUnicode !== undefined) {
		return options.forceUnicode;
	}

	// Check ncurses-compatible environment variable
	const forceEnv = process.env['NCURSES_FORCE_UNICODE'];
	if (forceEnv !== undefined) {
		return forceEnv === '1';
	}

	// Check locale settings for UTF-8
	const localeVars = [
		process.env['LANG'],
		process.env['LANGUAGE'],
		process.env['LC_ALL'],
		process.env['LC_CTYPE'],
	]
		.filter(Boolean)
		.join(':');

	if (/utf-?8/i.test(localeVars)) {
		return true;
	}

	// Windows console check
	if (process.platform === 'win32') {
		return getWindowsCodePage() === 65001;
	}

	return false;
}

/**
 * Gets the Windows console code page.
 *
 * @returns Code page number, or -1 if not Windows or unavailable
 *
 * @internal
 */
function getWindowsCodePage(): number {
	if (process.platform !== 'win32') {
		return -1;
	}

	// Allow unicode on all Windows consoles by default
	if (process.env['NCURSES_NO_WINDOWS_UNICODE'] !== '1') {
		return 65001;
	}

	// Could use child_process to run chcp.com, but that's slow
	// Default to UTF-8 support on modern Windows
	return 65001;
}

/**
 * Detects if terminal uses PC ROM character set instead of ACS.
 *
 * @param info - Terminfo data
 * @returns true if PC ROM character set is used
 *
 * @example
 * ```typescript
 * import { detectPCRomSet } from 'blecsd';
 *
 * if (detectPCRomSet(terminfoData)) {
 *   console.log('Using PC ROM character set');
 * }
 * ```
 */
export function detectPCRomSet(info: TerminfoData): boolean {
	const enterPc = info.strings['enter_pc_charset_mode'];
	const exitPc = info.strings['exit_pc_charset_mode'];
	const enterAlt = info.strings['enter_alt_charset_mode'];
	const exitAlt = info.strings['exit_alt_charset_mode'];

	// If PC charset mode equals ACS mode, terminal uses PC ROM set
	if (enterPc && enterAlt && enterPc === enterAlt && exitPc === exitAlt) {
		return true;
	}

	return false;
}

/**
 * Checks if screen terminal has broken ACS via termcap.
 *
 * @param info - Terminfo data
 * @returns true if screen termcap has broken ACS indicators
 *
 * @internal
 */
function hasScreenBrokenACS(info: TerminfoData): boolean {
	const termcap = process.env['TERMCAP'] ?? '';
	if (!termcap.includes('screen') || !termcap.includes('hhII00')) {
		return false;
	}

	const smacs = info.strings['enter_alt_charset_mode'] ?? '';
	const sgr = info.strings['set_attributes'] ?? '';

	return (
		smacs.includes('\x0e') || smacs.includes('\x0f') || sgr.includes('\x0e') || sgr.includes('\x0f')
	);
}

/**
 * Detects if the ACS (alternate character set) is broken.
 *
 * Some terminals advertise ACS support but don't actually work correctly.
 *
 * @param info - Terminfo data
 * @param options - Detection options
 * @returns true if ACS is broken/unsupported
 *
 * @example
 * ```typescript
 * import { detectBrokenACS } from 'blecsd';
 *
 * if (detectBrokenACS(terminfoData)) {
 *   console.log('Using Unicode fallback for box drawing');
 * }
 * ```
 */
export function detectBrokenACS(
	info: TerminfoData,
	options: FeatureDetectionOptions = {},
): boolean {
	// Check ncurses-compatible environment variable
	const noUtf8Acs = process.env['NCURSES_NO_UTF8_ACS'];
	if (noUtf8Acs !== undefined) {
		return noUtf8Acs === '1';
	}

	// Check U8 capability (terminal indicates Unicode support)
	const u8 = info.numbers['U8'];
	if (u8 !== undefined && u8 >= 0) {
		return u8 > 0;
	}

	// Linux console doesn't support ACS properly
	if (info.name === 'linux') {
		return true;
	}

	// PC ROM character set means no ACS
	if (detectPCRomSet(info)) {
		return true;
	}

	// Check for broken screen termcap
	if (options.termcap && info.name.startsWith('screen') && hasScreenBrokenACS(info)) {
		return true;
	}

	return false;
}

/**
 * Detects if magic cookie glitch handling is needed.
 *
 * @returns true if magic cookie handling is enabled
 */
export function detectMagicCookie(): boolean {
	return process.env['NCURSES_NO_MAGIC_COOKIE'] === undefined;
}

/**
 * Detects if padding is needed for terminal output.
 *
 * @returns true if padding is enabled
 */
export function detectPadding(): boolean {
	return process.env['NCURSES_NO_PADDING'] === undefined;
}

/**
 * Detects if setbuf is needed for terminal output.
 *
 * @returns true if setbuf is enabled
 */
export function detectSetbuf(): boolean {
	return process.env['NCURSES_NO_SETBUF'] === undefined;
}

/**
 * Detects the number of colors supported.
 *
 * @param info - Terminfo data
 * @returns Number of colors (0 if monochrome)
 */
export function detectColors(info: TerminfoData): number {
	return info.numbers['max_colors'] ?? 0;
}

/**
 * Detects true color (24-bit) support.
 *
 * @param info - Terminfo data
 * @returns true if 24-bit color is supported
 */
export function detectTrueColor(info: TerminfoData): boolean {
	// Check COLORTERM environment variable
	const colorterm = process.env['COLORTERM'];
	if (colorterm === 'truecolor' || colorterm === '24bit') {
		return true;
	}

	// Check for RGB capability in terminfo
	const setafRgb = info.strings['set_a_foreground'];
	if (setafRgb?.includes('2;')) {
		return true;
	}

	// Check terminal names known to support true color
	const name = info.name.toLowerCase();
	const trueColorTerminals = [
		'iterm2',
		'vte',
		'gnome',
		'konsole',
		'xterm-direct',
		'alacritty',
		'wezterm',
		'kitty',
	];

	return trueColorTerminals.some((t) => name.includes(t));
}

/**
 * Detects 256 color support.
 *
 * @param info - Terminfo data
 * @returns true if 256 colors are supported
 */
export function detect256Color(info: TerminfoData): boolean {
	const colors = detectColors(info);
	return colors >= 256;
}

/**
 * Detects alternate screen buffer support.
 *
 * @param info - Terminfo data
 * @returns true if alternate screen is supported
 */
export function detectAlternateScreen(info: TerminfoData): boolean {
	return info.strings['enter_ca_mode'] !== undefined && info.strings['exit_ca_mode'] !== undefined;
}

/**
 * Detects mouse tracking support.
 *
 * @param info - Terminfo data
 * @returns true if mouse tracking is supported
 */
export function detectMouse(info: TerminfoData): boolean {
	// Check for xterm-style mouse capabilities
	const kmous = info.strings['key_mouse'];
	if (kmous) {
		return true;
	}

	// Check terminal name for known mouse-supporting terminals
	const name = info.name.toLowerCase();
	const mouseTerminals = [
		'xterm',
		'rxvt',
		'screen',
		'tmux',
		'vte',
		'gnome',
		'konsole',
		'iterm2',
		'alacritty',
		'kitty',
	];

	return mouseTerminals.some((t) => name.includes(t));
}

/**
 * Detects focus event reporting support.
 *
 * @param info - Terminfo data
 * @returns true if focus events are supported
 */
export function detectFocusEvents(info: TerminfoData): boolean {
	// Focus events are an xterm extension
	const name = info.name.toLowerCase();
	const focusTerminals = [
		'xterm',
		'vte',
		'gnome',
		'konsole',
		'iterm2',
		'alacritty',
		'kitty',
		'wezterm',
	];

	return focusTerminals.some((t) => name.includes(t));
}

/**
 * Detects bracketed paste support.
 *
 * @param info - Terminfo data
 * @returns true if bracketed paste is supported
 */
export function detectBracketedPaste(info: TerminfoData): boolean {
	// Bracketed paste is widely supported in modern terminals
	const name = info.name.toLowerCase();
	const pasteTerminals = [
		'xterm',
		'vte',
		'gnome',
		'konsole',
		'iterm2',
		'alacritty',
		'kitty',
		'wezterm',
		'screen',
		'tmux',
	];

	return pasteTerminals.some((t) => name.includes(t));
}

/**
 * Detects title setting support.
 *
 * @param info - Terminfo data
 * @returns true if title can be set
 */
export function detectTitle(info: TerminfoData): boolean {
	// Check for title capabilities
	if (info.booleans['has_status_line']) {
		return true;
	}

	// Check terminal name for known title-supporting terminals
	const name = info.name.toLowerCase();
	const titleTerminals = [
		'xterm',
		'rxvt',
		'screen',
		'tmux',
		'vte',
		'gnome',
		'konsole',
		'iterm2',
		'alacritty',
		'kitty',
	];

	return titleTerminals.some((t) => name.includes(t));
}

/**
 * Parses the ACS character map from terminfo.
 *
 * @param info - Terminfo data
 * @returns ACS and reverse ACS maps
 *
 * @internal
 */
function parseACSFromInfo(info: TerminfoData): {
	acsc: Map<string, string>;
	acscReverse: Map<string, string>;
} {
	const acsc = new Map<string, string>();
	const acscReverse = new Map<string, string>();

	// If PC ROM set, return empty maps
	if (detectPCRomSet(info)) {
		return { acsc, acscReverse };
	}

	const acsChars = info.strings['acs_chars'];
	if (!acsChars) {
		return { acsc, acscReverse };
	}

	// Parse the acs_chars string
	const parsed = parseAcsc(acsChars);
	for (const [code, char] of parsed) {
		acsc.set(code, char);
		acscReverse.set(char, code);
	}

	return { acsc, acscReverse };
}

/**
 * Detects all terminal features.
 *
 * @param info - Terminfo data
 * @param options - Detection options
 * @returns Detected features
 *
 * @example
 * ```typescript
 * import { detectFeatures, createTput } from 'blecsd';
 *
 * const tput = createTput();
 * const features = detectFeatures(tput.getData());
 *
 * if (features.unicode && !features.brokenACS) {
 *   // Use Unicode box drawing
 * }
 *
 * if (features.trueColor) {
 *   // Use 24-bit colors
 * }
 * ```
 */
export function detectFeatures(
	info: TerminfoData,
	options: FeatureDetectionOptions = {},
): TerminalFeatures {
	const { acsc, acscReverse } = parseACSFromInfo(info);

	return {
		unicode: detectUnicode(options),
		brokenACS: detectBrokenACS(info, options),
		pcRomSet: detectPCRomSet(info),
		magicCookie: detectMagicCookie(),
		padding: detectPadding(),
		setbuf: detectSetbuf(),
		acsc,
		acscReverse,
		colors: detectColors(info),
		trueColor: detectTrueColor(info),
		color256: detect256Color(info),
		alternateScreen: detectAlternateScreen(info),
		mouse: detectMouse(info),
		focusEvents: detectFocusEvents(info),
		bracketedPaste: detectBracketedPaste(info),
		title: detectTitle(info),
	};
}

/**
 * Detects modern terminal protocol support.
 *
 * Note: These are passive detections based on terminal name and environment.
 * For active protocol negotiation, use the capability negotiation system.
 *
 * @param info - Terminfo data
 * @returns Detected modern protocols
 *
 * @example
 * ```typescript
 * import { detectModernProtocols } from 'blecsd';
 *
 * const protocols = detectModernProtocols(terminfoData);
 *
 * if (protocols.kittyKeyboard) {
 *   // Enable Kitty keyboard protocol
 * }
 *
 * if (protocols.hyperlinks) {
 *   // Use OSC 8 for clickable links
 * }
 * ```
 */
export function detectModernProtocols(info: TerminfoData): ModernProtocols {
	const name = info.name.toLowerCase();
	const termProgram = (process.env['TERM_PROGRAM'] ?? '').toLowerCase();

	// Kitty detection
	const isKitty = name.includes('kitty') || termProgram === 'kitty';

	// iTerm2 detection
	const isIterm2 = termProgram === 'iterm.app' || process.env['ITERM_SESSION_ID'] !== undefined;

	// Modern terminal detection
	const isModern =
		isKitty ||
		isIterm2 ||
		name.includes('wezterm') ||
		name.includes('alacritty') ||
		termProgram === 'wezterm' ||
		termProgram === 'alacritty';

	return {
		kittyKeyboard: isKitty,
		kittyGraphics: isKitty,
		iterm2Images: isIterm2,
		sixel: detectSixel(info),
		hyperlinks: isModern || name.includes('vte') || name.includes('gnome'),
		synchronizedOutput: isModern,
	};
}

/**
 * Detects Sixel graphics support.
 *
 * @param info - Terminfo data
 * @returns true if Sixel is likely supported
 *
 * @internal
 */
function detectSixel(info: TerminfoData): boolean {
	const name = info.name.toLowerCase();

	// Known Sixel-supporting terminals
	const sixelTerminals = ['xterm', 'mlterm', 'yaft', 'foot', 'wezterm', 'mintty'];

	// Check TERM environment
	if (sixelTerminals.some((t) => name.includes(t))) {
		return true;
	}

	// Check for explicit Sixel indication
	if (process.env['TERM']?.includes('sixel')) {
		return true;
	}

	return false;
}

/**
 * Gets color capability label.
 *
 * @internal
 */
function getColorLabel(features: TerminalFeatures): string {
	if (features.trueColor) return ' (true color)';
	if (features.color256) return ' (256)';
	return '';
}

/**
 * Formats a boolean feature as yes/no.
 *
 * @internal
 */
function yn(value: boolean): string {
	return value ? 'yes' : 'no';
}

/**
 * Builds protocol summary lines.
 *
 * @internal
 */
function buildProtocolLines(protocols: ModernProtocols): string[] {
	const protocolMap: Array<[keyof ModernProtocols, string]> = [
		['kittyKeyboard', 'Kitty keyboard'],
		['kittyGraphics', 'Kitty graphics'],
		['iterm2Images', 'iTerm2 images'],
		['sixel', 'Sixel graphics'],
		['hyperlinks', 'OSC 8 hyperlinks'],
		['synchronizedOutput', 'Synchronized output'],
	];

	return protocolMap.filter(([key]) => protocols[key]).map(([, label]) => `  - ${label}`);
}

/**
 * Gets a summary of terminal capabilities for logging/debugging.
 *
 * @param features - Detected features
 * @param protocols - Detected protocols
 * @returns Human-readable summary
 *
 * @example
 * ```typescript
 * import { detectFeatures, detectModernProtocols, getFeatureSummary } from 'blecsd';
 *
 * const features = detectFeatures(info);
 * const protocols = detectModernProtocols(info);
 * console.log(getFeatureSummary(features, protocols));
 * ```
 */
export function getFeatureSummary(features: TerminalFeatures, protocols?: ModernProtocols): string {
	const lines = [
		`Colors: ${features.colors}${getColorLabel(features)}`,
		`Unicode: ${yn(features.unicode)}`,
		`ACS: ${features.brokenACS ? 'broken' : 'ok'} (${features.acsc.size} chars)`,
		`Alt screen: ${yn(features.alternateScreen)}`,
		`Mouse: ${yn(features.mouse)}`,
		`Focus events: ${yn(features.focusEvents)}`,
		`Bracketed paste: ${yn(features.bracketedPaste)}`,
	];

	if (protocols) {
		const protocolLines = buildProtocolLines(protocols);
		if (protocolLines.length > 0) {
			lines.push('', 'Modern protocols:', ...protocolLines);
		}
	}

	return lines.join('\n');
}
