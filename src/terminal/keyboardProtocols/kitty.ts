/**
 * Kitty Keyboard Protocol support.
 *
 * Implements modern keyboard disambiguation with key release events
 * for games. Provides progressive enhancement with legacy fallback,
 * ESC vs Alt-key disambiguation, and rich modifier support.
 *
 * @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
 * @module terminal/keyboardProtocols/kitty
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Kitty keyboard protocol enhancement levels.
 * Each level adds capabilities on top of previous levels.
 */
export type KittyProtocolLevel = 0 | 1 | 2 | 4 | 8 | 16;

/**
 * Protocol level flags (can be combined).
 */
export const KittyFlags = {
	/** Level 0: Disabled (legacy mode) */
	NONE: 0 as KittyProtocolLevel,
	/** Level 1: Disambiguate escape codes */
	DISAMBIGUATE: 1 as KittyProtocolLevel,
	/** Level 2: Report event types (press/repeat/release) */
	REPORT_EVENTS: 2 as KittyProtocolLevel,
	/** Level 4: Report alternate keys */
	REPORT_ALTERNATE: 4 as KittyProtocolLevel,
	/** Level 8: Report all keys as escape codes */
	REPORT_ALL: 8 as KittyProtocolLevel,
	/** Level 16: Report associated text */
	REPORT_TEXT: 16 as KittyProtocolLevel,
} as const;

/**
 * Key event types from the Kitty protocol.
 */
export type KittyEventType = 'press' | 'repeat' | 'release';

/**
 * Extended modifier information from Kitty protocol.
 */
export interface KittyModifiers {
	readonly shift: boolean;
	readonly alt: boolean;
	readonly ctrl: boolean;
	readonly super: boolean;
	readonly hyper: boolean;
	readonly meta: boolean;
	readonly capsLock: boolean;
	readonly numLock: boolean;
}

/**
 * Extended key event from Kitty keyboard protocol.
 * Extends the base KeyEvent with additional information.
 */
export interface KittyKeyEvent {
	/** Unicode codepoint of the key */
	readonly keyCode: number;
	/** Shifted key codepoint (if different from base) */
	readonly shiftedKey: number | undefined;
	/** Base layout key codepoint */
	readonly baseKey: number | undefined;
	/** Event type: press, repeat, or release */
	readonly eventType: KittyEventType;
	/** Whether this is an auto-repeat event */
	readonly isRepeat: boolean;
	/** Whether this is a key release event */
	readonly isRelease: boolean;
	/** Text produced by this key */
	readonly text: string;
	/** Extended modifier flags */
	readonly modifiers: KittyModifiers;
	/** Raw CSI parameters */
	readonly rawParams: string;
}

/**
 * Configuration for Kitty protocol behavior.
 */
export interface KittyConfig {
	/** Desired protocol flags (default: DISAMBIGUATE | REPORT_EVENTS) */
	readonly flags: number;
	/** Timeout in ms for ESC disambiguation (default: 50) */
	readonly escTimeout: number;
}

/**
 * Protocol state for tracking Kitty keyboard mode.
 */
export interface KittyProtocolState {
	/** Whether the protocol is active */
	readonly active: boolean;
	/** Current flags pushed to the terminal */
	readonly pushedFlags: number;
	/** Detected protocol level from query response */
	readonly detectedLevel: number | undefined;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_KITTY_CONFIG: KittyConfig = {
	flags: KittyFlags.DISAMBIGUATE | KittyFlags.REPORT_EVENTS,
	escTimeout: 50,
};

const EMPTY_MODIFIERS: KittyModifiers = {
	shift: false,
	alt: false,
	ctrl: false,
	super: false,
	hyper: false,
	meta: false,
	capsLock: false,
	numLock: false,
};

// =============================================================================
// PROTOCOL ESCAPE SEQUENCES
// =============================================================================

/**
 * Generates the CSI sequence to push (enable) Kitty keyboard mode.
 *
 * @param flags - Protocol flags to enable
 * @returns The escape sequence string
 *
 * @example
 * ```typescript
 * import { generatePushSequence, KittyFlags } from 'blecsd';
 *
 * const seq = generatePushSequence(KittyFlags.DISAMBIGUATE | KittyFlags.REPORT_EVENTS);
 * process.stdout.write(seq); // Enables protocol
 * ```
 */
export function generatePushSequence(flags: number): string {
	return `\x1b[>${flags}u`;
}

/**
 * Generates the CSI sequence to pop (disable) Kitty keyboard mode.
 *
 * @returns The escape sequence string
 */
export function generatePopSequence(): string {
	return '\x1b[<u';
}

/**
 * Generates the CSI sequence to query current keyboard mode.
 *
 * @returns The query escape sequence
 */
export function generateQuerySequence(): string {
	return '\x1b[?u';
}

// =============================================================================
// PARSING
// =============================================================================

/**
 * Checks if a buffer contains a Kitty keyboard protocol response.
 * Response format: CSI ? flags u
 *
 * @param buffer - Input buffer to check
 * @returns Whether this is a Kitty protocol response
 */
export function isKittyResponse(buffer: Uint8Array): boolean {
	// CSI ? <flags> u  =>  0x1b 0x5b 0x3f <digits> 0x75
	if (buffer.length < 4) return false;
	if (buffer[0] !== 0x1b || buffer[1] !== 0x5b || buffer[2] !== 0x3f) return false;
	// Last byte must be 'u' (0x75)
	return buffer[buffer.length - 1] === 0x75;
}

/**
 * Parses a Kitty protocol query response to extract the supported flags.
 *
 * @param buffer - The response buffer
 * @returns The flags value, or undefined if not a valid response
 *
 * @example
 * ```typescript
 * import { parseKittyQueryResponse, KittyFlags } from 'blecsd';
 *
 * const flags = parseKittyQueryResponse(responseBuffer);
 * if (flags !== undefined && (flags & KittyFlags.REPORT_EVENTS)) {
 *   console.log('Key release events supported');
 * }
 * ```
 */
export function parseKittyQueryResponse(buffer: Uint8Array): number | undefined {
	if (!isKittyResponse(buffer)) return undefined;

	// Extract digits between '?' and 'u'
	let digits = '';
	for (let i = 3; i < buffer.length - 1; i++) {
		const ch = buffer[i]!;
		if (ch >= 0x30 && ch <= 0x39) {
			digits += String.fromCharCode(ch);
		} else {
			return undefined; // Invalid character
		}
	}

	return digits.length > 0 ? Number.parseInt(digits, 10) : 0;
}

/**
 * Checks if a buffer contains a Kitty keyboard event.
 * Kitty events use CSI format: CSI <keycode> [; <modifiers> [: <event_type>]] u
 * or functional keys: CSI <number> [; <modifiers> [: <event_type>]] ~
 *
 * @param buffer - Input buffer to check
 * @returns Whether this is a Kitty key event
 */
export function isKittyKeyEvent(buffer: Uint8Array): boolean {
	if (buffer.length < 3) return false;
	if (buffer[0] !== 0x1b || buffer[1] !== 0x5b) return false;

	const last = buffer[buffer.length - 1]!;
	// Must end with 'u' (0x75) or '~' (0x7e)
	if (last !== 0x75 && last !== 0x7e) return false;

	// Must contain digits (the keycode)
	for (let i = 2; i < buffer.length - 1; i++) {
		const ch = buffer[i]!;
		if (ch >= 0x30 && ch <= 0x39) return true; // Found a digit
		if (ch === 0x3b || ch === 0x3a) continue; // Separator
	}

	return false;
}

/**
 * Parses a Kitty keyboard event from a buffer.
 *
 * Format: CSI keycode [; modifiers [:event_type] [:shifted_key] [:base_key]] u
 * Or with text: CSI keycode ; modifiers ; text u
 *
 * @param buffer - The input buffer
 * @returns Parsed Kitty key event, or undefined if invalid
 *
 * @example
 * ```typescript
 * import { parseKittyKeyEvent } from 'blecsd';
 *
 * const event = parseKittyKeyEvent(buffer);
 * if (event?.isRelease) {
 *   console.log('Key released:', String.fromCodePoint(event.keyCode));
 * }
 * ```
 */
export function parseKittyKeyEvent(buffer: Uint8Array): KittyKeyEvent | undefined {
	if (!isKittyKeyEvent(buffer)) return undefined;

	// Extract the parameter string (between CSI and final byte)
	let params = '';
	for (let i = 2; i < buffer.length - 1; i++) {
		params += String.fromCharCode(buffer[i]!);
	}

	const rawParams = params;

	// Split by ';' to get major sections
	const sections = params.split(';');

	// First section: keycode[:shifted_key[:base_key]]
	const keycodeSection = sections[0] ?? '';
	const keycodeParts = keycodeSection.split(':');
	const keyCode = Number.parseInt(keycodeParts[0] ?? '0', 10);
	const shiftedKey = keycodeParts[1] ? Number.parseInt(keycodeParts[1], 10) : undefined;
	const baseKey = keycodeParts[2] ? Number.parseInt(keycodeParts[2], 10) : undefined;

	// Second section: modifiers[:event_type]
	const modSection = sections[1] ?? '';
	const modParts = modSection.split(':');
	const modValue = modParts[0] ? Number.parseInt(modParts[0], 10) - 1 : 0; // 1-based in protocol
	const eventTypeValue = modParts[1] ? Number.parseInt(modParts[1], 10) : 1;

	const modifiers = decodeModifiers(Math.max(0, modValue));
	const eventType = decodeEventType(eventTypeValue);

	// Third section: associated text (Unicode codepoints separated by ':')
	let text = '';
	if (sections[2]) {
		const textParts = sections[2].split(':');
		for (const p of textParts) {
			const cp = Number.parseInt(p, 10);
			if (!Number.isNaN(cp) && cp > 0) {
				text += String.fromCodePoint(cp);
			}
		}
	}

	return {
		keyCode,
		shiftedKey,
		baseKey,
		eventType,
		isRepeat: eventType === 'repeat',
		isRelease: eventType === 'release',
		text,
		modifiers,
		rawParams,
	};
}

/**
 * Creates a Kitty protocol configuration.
 *
 * @param config - Partial configuration overrides
 * @returns Full configuration
 */
export function createKittyConfig(config?: Partial<KittyConfig>): KittyConfig {
	return { ...DEFAULT_KITTY_CONFIG, ...config };
}

/**
 * Creates initial protocol state.
 *
 * @returns Fresh protocol state
 */
export function createKittyProtocolState(): KittyProtocolState {
	return {
		active: false,
		pushedFlags: 0,
		detectedLevel: undefined,
	};
}

/**
 * Updates protocol state after a query response.
 *
 * @param state - Current state
 * @param detectedFlags - Flags from query response
 * @returns Updated state
 */
export function updateProtocolState(
	state: KittyProtocolState,
	detectedFlags: number,
): KittyProtocolState {
	return {
		...state,
		detectedLevel: detectedFlags,
	};
}

/**
 * Activates the protocol (after push sequence sent).
 *
 * @param state - Current state
 * @param flags - Flags that were pushed
 * @returns Updated state
 */
export function activateProtocol(state: KittyProtocolState, flags: number): KittyProtocolState {
	return {
		...state,
		active: true,
		pushedFlags: flags,
	};
}

/**
 * Deactivates the protocol (after pop sequence sent).
 *
 * @param state - Current state
 * @returns Updated state
 */
export function deactivateProtocol(state: KittyProtocolState): KittyProtocolState {
	return {
		...state,
		active: false,
		pushedFlags: 0,
	};
}

/**
 * Converts a Kitty key event to a human-readable key name.
 *
 * @param event - The Kitty key event
 * @returns Human-readable key name
 *
 * @example
 * ```typescript
 * import { parseKittyKeyEvent, kittyKeyToName } from 'blecsd';
 *
 * const event = parseKittyKeyEvent(buffer);
 * if (event) console.log(kittyKeyToName(event)); // e.g., 'a', 'escape', 'f1'
 * ```
 */
export function kittyKeyToName(event: KittyKeyEvent): string {
	const code = event.keyCode;

	// Special keys
	const specialMap: Record<number, string> = {
		27: 'escape',
		13: 'return',
		9: 'tab',
		127: 'backspace',
		57358: 'capslock',
		57359: 'scrolllock',
		57360: 'numlock',
		57361: 'printscreen',
		57362: 'pause',
		57363: 'menu',
		// Function keys
		57364: 'f13',
		57365: 'f14',
		57366: 'f15',
		57367: 'f16',
		57368: 'f17',
		57369: 'f18',
		57370: 'f19',
		57371: 'f20',
		57372: 'f21',
		57373: 'f22',
		57374: 'f23',
		57375: 'f24',
		57376: 'f25',
		// Keypad
		57399: 'kp0',
		57400: 'kp1',
		57401: 'kp2',
		57402: 'kp3',
		57403: 'kp4',
		57404: 'kp5',
		57405: 'kp6',
		57406: 'kp7',
		57407: 'kp8',
		57408: 'kp9',
		57409: 'kpdecimal',
		57410: 'kpdivide',
		57411: 'kpmultiply',
		57412: 'kpminus',
		57413: 'kpplus',
		57414: 'kpenter',
		57415: 'kpequal',
		// Modifier keys (left/right)
		57441: 'lshift',
		57442: 'lctrl',
		57443: 'lalt',
		57444: 'lsuper',
		57445: 'lhyper',
		57446: 'lmeta',
		57447: 'rshift',
		57448: 'rctrl',
		57449: 'ralt',
		57450: 'rsuper',
		57451: 'rhyper',
		57452: 'rmeta',
	};

	if (specialMap[code]) return specialMap[code]!;

	// Functional keys encoded with ~
	const functionalMap: Record<number, string> = {
		2: 'insert',
		3: 'delete',
		5: 'pageup',
		6: 'pagedown',
		7: 'home',
		8: 'end',
		11: 'f1',
		12: 'f2',
		13: 'f3',
		14: 'f4',
		15: 'f5',
		17: 'f6',
		18: 'f7',
		19: 'f8',
		20: 'f9',
		21: 'f10',
		23: 'f11',
		24: 'f12',
	};
	if (functionalMap[code]) return functionalMap[code]!;

	// Arrow keys
	if (code === 57352) return 'up';
	if (code === 57353) return 'down';
	if (code === 57354) return 'right';
	if (code === 57355) return 'left';

	// Printable ASCII
	if (code >= 32 && code <= 126) return String.fromCharCode(code);

	// Unicode
	if (code > 0) return String.fromCodePoint(code);

	return 'unknown';
}

/**
 * Checks if Kitty keyboard protocol is supported based on capabilities.
 *
 * @param capabilities - Object with kittyKeyboard field
 * @returns Whether the protocol is available
 */
export function isKittySupported(capabilities: { kittyKeyboard: number | false }): boolean {
	return capabilities.kittyKeyboard !== false;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function decodeModifiers(value: number): KittyModifiers {
	if (value === 0) return EMPTY_MODIFIERS;

	return {
		shift: (value & 1) !== 0,
		alt: (value & 2) !== 0,
		ctrl: (value & 4) !== 0,
		super: (value & 8) !== 0,
		hyper: (value & 16) !== 0,
		meta: (value & 32) !== 0,
		capsLock: (value & 64) !== 0,
		numLock: (value & 128) !== 0,
	};
}

function decodeEventType(value: number): KittyEventType {
	if (value === 2) return 'repeat';
	if (value === 3) return 'release';
	return 'press';
}
