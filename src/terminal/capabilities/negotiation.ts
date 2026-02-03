/**
 * Dynamic Terminal Capability Negotiation
 *
 * Queries terminal for modern features at startup. This module enables
 * detection of advanced terminal capabilities like truecolor, Kitty keyboard
 * protocol, graphics protocols, and synchronized output.
 *
 * @module terminal/capabilities/negotiation
 */

import { z } from 'zod';
import {
	isPrimaryDA,
	isSecondaryDA,
	type PrimaryDAResponse,
	parseResponse,
	query,
	type SecondaryDAResponse,
} from '../responseParser';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default timeout for terminal queries (milliseconds).
 */
export const DEFAULT_QUERY_TIMEOUT = 100;

/**
 * Minimum timeout allowed (milliseconds).
 */
export const MIN_QUERY_TIMEOUT = 10;

/**
 * Maximum timeout allowed (milliseconds).
 */
export const MAX_QUERY_TIMEOUT = 5000;

/**
 * CSI escape sequence prefix.
 */
const CSI = '\x1b[';

// Reserved for future XTGETTCAP/DECRQSS support:
// const DCS = '\x1bP';
// const ST = '\x1b\\';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Kitty keyboard protocol enhancement levels.
 * Each level adds more capabilities on top of the previous.
 */
export const KittyKeyboardLevel = {
	/** Level 0: Disabled (legacy mode) */
	DISABLED: 0,
	/** Level 1: Disambiguate escape codes */
	DISAMBIGUATE: 1,
	/** Level 2: Report event types (press, repeat, release) */
	REPORT_EVENTS: 2,
	/** Level 3: Report alternate keys */
	REPORT_ALTERNATES: 4,
	/** Level 4: Report all keys as escape codes */
	REPORT_ALL: 8,
	/** Level 5: Report associated text */
	REPORT_TEXT: 16,
} as const;

export type KittyKeyboardLevelValue = (typeof KittyKeyboardLevel)[keyof typeof KittyKeyboardLevel];

/**
 * Graphics protocol types.
 */
export const GraphicsProtocol = {
	/** No graphics support */
	NONE: 'none',
	/** Kitty graphics protocol */
	KITTY: 'kitty',
	/** iTerm2 inline images protocol */
	ITERM2: 'iterm2',
	/** Sixel graphics */
	SIXEL: 'sixel',
} as const;

export type GraphicsProtocolValue = (typeof GraphicsProtocol)[keyof typeof GraphicsProtocol];

/**
 * Negotiation timing strategy.
 */
export const NegotiationTiming = {
	/** Query immediately on creation */
	EAGER: 'eager',
	/** Query on first capability access */
	LAZY: 'lazy',
	/** Skip negotiation, use environment detection only */
	SKIP: 'skip',
} as const;

export type NegotiationTimingValue = (typeof NegotiationTiming)[keyof typeof NegotiationTiming];

/**
 * Terminal capabilities interface.
 * Represents the detected capabilities of the terminal.
 */
export interface TerminalCapabilities {
	/** True if terminal supports 24-bit RGB colors */
	readonly truecolor: boolean;
	/** Kitty keyboard protocol level, or false if not supported */
	readonly kittyKeyboard: KittyKeyboardLevelValue | false;
	/** Graphics protocol supported, or false if none */
	readonly graphics: GraphicsProtocolValue | false;
	/** True if terminal supports focus events */
	readonly focusEvents: boolean;
	/** True if terminal supports bracketed paste mode */
	readonly bracketedPaste: boolean;
	/** True if terminal supports synchronized output */
	readonly synchronizedOutput: boolean;
	/** True if terminal supports OSC 8 hyperlinks */
	readonly hyperlinks: boolean;
	/** True if terminal supports styled underlines */
	readonly styledUnderlines: boolean;
	/** Primary DA response if available */
	readonly primaryDA: PrimaryDAResponse | null;
	/** Secondary DA response if available */
	readonly secondaryDA: SecondaryDAResponse | null;
	/** Terminal type identifier from DA2 */
	readonly terminalType: number | null;
	/** Firmware version from DA2 */
	readonly firmwareVersion: number | null;
}

/**
 * Capability negotiator configuration.
 */
export interface NegotiatorConfig {
	/** Query timeout in milliseconds (default: 100) */
	readonly timeout?: number;
	/** Negotiation timing strategy (default: eager) */
	readonly timing?: NegotiationTimingValue;
	/** Custom input stream (default: process.stdin) */
	readonly input?: NodeJS.ReadableStream;
	/** Custom output stream (default: process.stdout) */
	readonly output?: NodeJS.WritableStream;
	/** Force specific capabilities (for testing) */
	readonly forceCapabilities?: Partial<TerminalCapabilities>;
}

/**
 * Zod schema for negotiator configuration.
 */
export const NegotiatorConfigSchema = z.object({
	timeout: z.number().int().min(MIN_QUERY_TIMEOUT).max(MAX_QUERY_TIMEOUT).optional(),
	timing: z.enum(['eager', 'lazy', 'skip']).optional(),
	forceCapabilities: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Capability negotiator interface.
 */
export interface CapabilityNegotiator {
	/**
	 * Gets the negotiated terminal capabilities.
	 * If timing is 'lazy' and negotiation hasn't run, triggers it.
	 *
	 * @returns Promise resolving to capabilities
	 */
	getCapabilities(): Promise<TerminalCapabilities>;

	/**
	 * Gets cached capabilities without triggering negotiation.
	 * Returns null if not yet negotiated.
	 */
	getCachedCapabilities(): TerminalCapabilities | null;

	/**
	 * Forces re-negotiation of capabilities.
	 * Useful after SIGWINCH or terminal reconnection.
	 *
	 * @returns Promise resolving to new capabilities
	 */
	renegotiate(): Promise<TerminalCapabilities>;

	/**
	 * Checks if capabilities have been negotiated.
	 */
	isNegotiated(): boolean;

	/**
	 * Gets the query timeout.
	 */
	getTimeout(): number;

	/**
	 * Sets the query timeout.
	 *
	 * @param timeout - New timeout in milliseconds
	 */
	setTimeout(timeout: number): void;

	/**
	 * Cleans up resources.
	 */
	destroy(): void;
}

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Detects truecolor support from environment variables.
 */
function detectTruecolorFromEnv(): boolean {
	const colorterm = process.env['COLORTERM'];
	if (colorterm === 'truecolor' || colorterm === '24bit') {
		return true;
	}

	const term = process.env['TERM'] ?? '';
	if (term.includes('truecolor') || term.includes('24bit') || term.includes('direct')) {
		return true;
	}

	// Known truecolor terminals
	const termProgram = process.env['TERM_PROGRAM'] ?? '';
	const knownTruecolor = ['iTerm.app', 'Apple_Terminal', 'Hyper', 'vscode'];
	if (knownTruecolor.includes(termProgram)) {
		return true;
	}

	// Kitty, Alacritty, Windows Terminal support truecolor
	if (process.env['KITTY_WINDOW_ID'] !== undefined) return true;
	if (term === 'alacritty') return true;
	if (process.env['WT_SESSION'] !== undefined) return true;

	// VTE 3600+ supports truecolor
	const vteVersion = process.env['VTE_VERSION'];
	if (vteVersion !== undefined) {
		const version = Number.parseInt(vteVersion, 10);
		if (!Number.isNaN(version) && version >= 3600) {
			return true;
		}
	}

	return false;
}

/**
 * Detects Kitty keyboard protocol support from environment.
 */
function detectKittyKeyboardFromEnv(): KittyKeyboardLevelValue | false {
	// Kitty terminal natively supports the protocol
	if (process.env['KITTY_WINDOW_ID'] !== undefined) {
		return KittyKeyboardLevel.REPORT_ALL;
	}

	// WezTerm supports it
	if (process.env['TERM_PROGRAM'] === 'WezTerm') {
		return KittyKeyboardLevel.REPORT_ALL;
	}

	// foot terminal supports it
	if (process.env['TERM'] === 'foot' || process.env['TERM'] === 'foot-extra') {
		return KittyKeyboardLevel.REPORT_ALL;
	}

	return false;
}

/**
 * Detects graphics protocol support from environment.
 */
function detectGraphicsFromEnv(): GraphicsProtocolValue | false {
	// Kitty graphics
	if (process.env['KITTY_WINDOW_ID'] !== undefined) {
		return GraphicsProtocol.KITTY;
	}

	// iTerm2 inline images
	if (process.env['TERM_PROGRAM'] === 'iTerm.app') {
		return GraphicsProtocol.ITERM2;
	}

	// Sixel support is harder to detect from environment
	// Some terminals advertise via TERM
	const term = process.env['TERM'] ?? '';
	if (term.includes('sixel')) {
		return GraphicsProtocol.SIXEL;
	}

	return false;
}

/**
 * Detects synchronized output support from environment.
 */
function detectSyncOutputFromEnv(): boolean {
	// Most modern terminals support it
	const termProgram = process.env['TERM_PROGRAM'] ?? '';
	const supportingSyncOutput = ['iTerm.app', 'WezTerm', 'vscode', 'Hyper'];

	if (supportingSyncOutput.includes(termProgram)) {
		return true;
	}

	if (process.env['KITTY_WINDOW_ID'] !== undefined) return true;
	if (process.env['WT_SESSION'] !== undefined) return true;

	return false;
}

/**
 * Detects hyperlink support from environment.
 */
function detectHyperlinksFromEnv(): boolean {
	// Most modern terminals support OSC 8
	const termProgram = process.env['TERM_PROGRAM'] ?? '';
	const supportingHyperlinks = ['iTerm.app', 'WezTerm', 'vscode', 'Hyper'];

	if (supportingHyperlinks.includes(termProgram)) {
		return true;
	}

	if (process.env['KITTY_WINDOW_ID'] !== undefined) return true;
	if (process.env['WT_SESSION'] !== undefined) return true;

	// VTE 5000+ supports hyperlinks
	const vteVersion = process.env['VTE_VERSION'];
	if (vteVersion !== undefined) {
		const version = Number.parseInt(vteVersion, 10);
		if (!Number.isNaN(version) && version >= 5000) {
			return true;
		}
	}

	return false;
}

/**
 * Creates default capabilities based on environment detection only.
 */
function createDefaultCapabilities(): TerminalCapabilities {
	return {
		truecolor: detectTruecolorFromEnv(),
		kittyKeyboard: detectKittyKeyboardFromEnv(),
		graphics: detectGraphicsFromEnv(),
		focusEvents: true, // Most terminals support this
		bracketedPaste: true, // Most terminals support this
		synchronizedOutput: detectSyncOutputFromEnv(),
		hyperlinks: detectHyperlinksFromEnv(),
		styledUnderlines: detectTruecolorFromEnv(), // Usually correlates with truecolor
		primaryDA: null,
		secondaryDA: null,
		terminalType: null,
		firmwareVersion: null,
	};
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Generates the XTVERSION query sequence.
 * Response format: DCS > | version ST
 */
function queryXTVersion(): string {
	return `${CSI}>q`;
}

/**
 * Generates Kitty keyboard protocol query.
 * Response format: CSI ? flags u
 */
function queryKittyKeyboard(): string {
	return `${CSI}?u`;
}

/**
 * Generates Sixel detection query via DA1.
 * Sixel support is indicated by attribute 4 in DA1 response.
 */
function hasSixelSupport(da1: PrimaryDAResponse): boolean {
	return da1.attributes.includes(4);
}

/**
 * Parses terminal type from DA2 response.
 * Known terminal type IDs:
 * - 0: VT100
 * - 1: VT220
 * - 41: xterm
 * - 65: VT510
 * etc.
 */
function parseTerminalTypeFromDA2(da2: SecondaryDAResponse): {
	terminalType: number;
	firmwareVersion: number;
} {
	return {
		terminalType: da2.terminalType,
		firmwareVersion: da2.firmwareVersion,
	};
}

// =============================================================================
// ASYNC QUERY ENGINE
// =============================================================================

/**
 * Response collector state.
 */
interface ResponseCollector {
	buffer: string;
	resolve: (responses: string[]) => void;
	timeout: ReturnType<typeof setTimeout>;
	responses: string[];
}

/**
 * Sends queries and collects responses with timeout.
 *
 * @param queries - Array of query strings to send
 * @param timeout - Timeout in milliseconds
 * @param input - Input stream to read responses from
 * @param output - Output stream to write queries to
 * @returns Promise resolving to array of response strings
 */
async function sendQueriesWithTimeout(
	queries: string[],
	timeout: number,
	input: NodeJS.ReadableStream,
	output: NodeJS.WritableStream,
): Promise<string[]> {
	return new Promise((resolve) => {
		const collector: ResponseCollector = {
			buffer: '',
			resolve,
			timeout: setTimeout(() => {
				cleanup();
				resolve(collector.responses);
			}, timeout),
			responses: [],
		};

		const onData = (data: Buffer): void => {
			collector.buffer += data.toString();
			// Try to extract complete responses
			extractResponses(collector);
		};

		const cleanup = (): void => {
			clearTimeout(collector.timeout);
			input.removeListener('data', onData);
		};

		input.on('data', onData);

		// Send all queries
		for (const q of queries) {
			output.write(q);
		}
	});
}

/**
 * Extracts complete escape sequences from buffer.
 */
function extractResponses(collector: ResponseCollector): void {
	const buffer = collector.buffer;

	// Look for complete CSI sequences (ending in a letter)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is intentional
	const csiPattern = /\x1b\[[^a-zA-Z]*[a-zA-Z]/g;
	let match: RegExpExecArray | null;

	while ((match = csiPattern.exec(buffer)) !== null) {
		collector.responses.push(match[0]);
	}

	// Look for complete DCS sequences (ending in ST)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is intentional
	const dcsPattern = /\x1bP[^\x1b]*\x1b\\/g;
	while ((match = dcsPattern.exec(buffer)) !== null) {
		collector.responses.push(match[0]);
	}

	// Look for complete OSC sequences
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC and BEL are intentional
	const oscPattern = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
	while ((match = oscPattern.exec(buffer)) !== null) {
		collector.responses.push(match[0]);
	}
}

// =============================================================================
// CAPABILITY NEGOTIATOR FACTORY
// =============================================================================

/**
 * Creates a capability negotiator.
 *
 * The negotiator queries the terminal for capabilities and caches the results.
 * It supports three timing strategies:
 * - `eager`: Query immediately on creation
 * - `lazy`: Query on first capability access
 * - `skip`: Use environment detection only, no queries
 *
 * @param config - Negotiator configuration
 * @returns CapabilityNegotiator instance
 *
 * @example
 * ```typescript
 * import { createCapabilityNegotiator } from 'blecsd';
 *
 * // Create with eager negotiation (default)
 * const negotiator = createCapabilityNegotiator();
 *
 * // Wait for capabilities
 * const caps = await negotiator.getCapabilities();
 *
 * if (caps.truecolor) {
 *   console.log('Truecolor supported!');
 * }
 *
 * if (caps.kittyKeyboard) {
 *   console.log(`Kitty keyboard level: ${caps.kittyKeyboard}`);
 * }
 *
 * // Clean up
 * negotiator.destroy();
 * ```
 *
 * @example
 * ```typescript
 * // Create with lazy negotiation
 * const negotiator = createCapabilityNegotiator({
 *   timing: 'lazy',
 *   timeout: 200,
 * });
 *
 * // Capabilities are negotiated on first access
 * const caps = await negotiator.getCapabilities();
 * ```
 *
 * @example
 * ```typescript
 * // Skip negotiation, use environment detection only
 * const negotiator = createCapabilityNegotiator({
 *   timing: 'skip',
 * });
 *
 * // Returns immediately with environment-detected capabilities
 * const caps = await negotiator.getCapabilities();
 * ```
 */
export function createCapabilityNegotiator(config: NegotiatorConfig = {}): CapabilityNegotiator {
	let timeout = Math.max(
		MIN_QUERY_TIMEOUT,
		Math.min(MAX_QUERY_TIMEOUT, config.timeout ?? DEFAULT_QUERY_TIMEOUT),
	);
	const timing = config.timing ?? NegotiationTiming.EAGER;
	const input = config.input ?? process.stdin;
	const output = config.output ?? process.stdout;
	const forceCapabilities = config.forceCapabilities;

	let cachedCapabilities: TerminalCapabilities | null = null;
	let negotiationPromise: Promise<TerminalCapabilities> | null = null;
	let destroyed = false;

	/**
	 * Performs the actual capability negotiation.
	 */
	async function negotiate(): Promise<TerminalCapabilities> {
		// Start with environment-detected defaults
		const caps = createDefaultCapabilities();

		// If forcing capabilities, apply them
		if (forceCapabilities) {
			return { ...caps, ...forceCapabilities };
		}

		// If skip timing, return environment-only detection
		if (timing === NegotiationTiming.SKIP) {
			return caps;
		}

		// Check if we can query (need TTY)
		if (!process.stdin.isTTY || !process.stdout.isTTY) {
			return caps;
		}

		// Prepare queries
		const queries = [query.primaryDA(), query.secondaryDA()];

		try {
			// Set raw mode for response collection
			const wasRaw = process.stdin.isRaw;
			if (!wasRaw && process.stdin.setRawMode) {
				process.stdin.setRawMode(true);
			}

			// Send queries and collect responses
			const responses = await sendQueriesWithTimeout(queries, timeout, input, output);

			// Restore raw mode
			if (!wasRaw && process.stdin.setRawMode) {
				process.stdin.setRawMode(false);
			}

			// Parse responses
			let primaryDA: PrimaryDAResponse | null = null;
			let secondaryDA: SecondaryDAResponse | null = null;

			for (const response of responses) {
				const parsed = parseResponse(response);

				if (isPrimaryDA(parsed)) {
					primaryDA = parsed;
				} else if (isSecondaryDA(parsed)) {
					secondaryDA = parsed;
				}
			}

			// Build enhanced capabilities
			let terminalType: number | null = null;
			let firmwareVersion: number | null = null;
			let graphics = caps.graphics;

			if (secondaryDA) {
				const da2Info = parseTerminalTypeFromDA2(secondaryDA);
				terminalType = da2Info.terminalType;
				firmwareVersion = da2Info.firmwareVersion;
			}

			if (primaryDA && hasSixelSupport(primaryDA) && !graphics) {
				graphics = GraphicsProtocol.SIXEL;
			}

			return {
				...caps,
				primaryDA,
				secondaryDA,
				terminalType,
				firmwareVersion,
				graphics,
			};
		} catch {
			// On error, return environment-detected capabilities
			return caps;
		}
	}

	const negotiator: CapabilityNegotiator = {
		async getCapabilities(): Promise<TerminalCapabilities> {
			if (destroyed) {
				throw new Error('Negotiator has been destroyed');
			}

			if (cachedCapabilities) {
				return cachedCapabilities;
			}

			if (!negotiationPromise) {
				negotiationPromise = negotiate().then((caps) => {
					cachedCapabilities = caps;
					return caps;
				});
			}

			return negotiationPromise;
		},

		getCachedCapabilities(): TerminalCapabilities | null {
			return cachedCapabilities;
		},

		async renegotiate(): Promise<TerminalCapabilities> {
			if (destroyed) {
				throw new Error('Negotiator has been destroyed');
			}

			cachedCapabilities = null;
			negotiationPromise = null;
			return negotiator.getCapabilities();
		},

		isNegotiated(): boolean {
			return cachedCapabilities !== null;
		},

		getTimeout(): number {
			return timeout;
		},

		setTimeout(newTimeout: number): void {
			timeout = Math.max(MIN_QUERY_TIMEOUT, Math.min(MAX_QUERY_TIMEOUT, newTimeout));
		},

		destroy(): void {
			destroyed = true;
			cachedCapabilities = null;
			negotiationPromise = null;
		},
	};

	// If eager timing, start negotiation immediately
	if (timing === NegotiationTiming.EAGER) {
		negotiationPromise = negotiate().then((caps) => {
			cachedCapabilities = caps;
			return caps;
		});
	}

	return negotiator;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Default negotiator instance.
 */
let defaultNegotiator: CapabilityNegotiator | null = null;

/**
 * Gets the default capability negotiator.
 * Creates one with eager timing on first call.
 *
 * @returns Default CapabilityNegotiator instance
 *
 * @example
 * ```typescript
 * import { getDefaultNegotiator } from 'blecsd';
 *
 * const caps = await getDefaultNegotiator().getCapabilities();
 * ```
 */
export function getDefaultNegotiator(): CapabilityNegotiator {
	if (!defaultNegotiator) {
		defaultNegotiator = createCapabilityNegotiator();
	}
	return defaultNegotiator;
}

/**
 * Resets the default negotiator.
 * For testing purposes.
 */
export function resetDefaultNegotiator(): void {
	if (defaultNegotiator) {
		defaultNegotiator.destroy();
		defaultNegotiator = null;
	}
}

/**
 * Gets terminal capabilities using the default negotiator.
 *
 * @returns Promise resolving to terminal capabilities
 *
 * @example
 * ```typescript
 * import { getTerminalCapabilities } from 'blecsd';
 *
 * const caps = await getTerminalCapabilities();
 * console.log(`Truecolor: ${caps.truecolor}`);
 * console.log(`Graphics: ${caps.graphics}`);
 * ```
 */
export async function getTerminalCapabilities(): Promise<TerminalCapabilities> {
	return getDefaultNegotiator().getCapabilities();
}

/**
 * Checks if a specific capability is supported.
 *
 * @param capability - Capability name to check
 * @returns Promise resolving to true if supported
 *
 * @example
 * ```typescript
 * import { hasCapability } from 'blecsd';
 *
 * if (await hasCapability('truecolor')) {
 *   // Use 24-bit colors
 * }
 * ```
 */
export async function hasCapability(capability: keyof TerminalCapabilities): Promise<boolean> {
	const caps = await getTerminalCapabilities();
	const value = caps[capability];

	if (typeof value === 'boolean') {
		return value;
	}

	// For non-boolean capabilities (kittyKeyboard, graphics), check if truthy
	return value !== null && value !== undefined;
}

// =============================================================================
// QUERY EXPORTS
// =============================================================================

/**
 * Query generators for capability detection.
 * Use these to manually query the terminal.
 */
export const capabilityQuery = {
	/**
	 * Primary Device Attributes query.
	 */
	primaryDA: query.primaryDA,

	/**
	 * Secondary Device Attributes query.
	 */
	secondaryDA: query.secondaryDA,

	/**
	 * XTVERSION query.
	 */
	xtversion: queryXTVersion,

	/**
	 * Kitty keyboard protocol query.
	 */
	kittyKeyboard: queryKittyKeyboard,
} as const;
