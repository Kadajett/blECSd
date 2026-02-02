/**
 * Terminal output padding/timing system.
 *
 * Handles terminfo padding specifications for slow terminals.
 *
 * Format: dollar-sign followed by angle brackets containing delay[*][/]
 * - delay: milliseconds to wait
 * - *: proportional (scaled by affected lines)
 * - /: mandatory (even for high-speed terminals)
 *
 * @module terminal/terminfo/padding
 */

/**
 * Parsed padding specification.
 */
export interface PaddingSpec {
	/** Delay in milliseconds */
	delay: number;
	/** Proportional padding (scales with affected lines) */
	proportional: boolean;
	/** Mandatory padding (cannot be skipped for high-speed terminals) */
	mandatory: boolean;
	/** Original padding string */
	original: string;
}

/**
 * Padding configuration options.
 */
export interface PaddingConfig {
	/** Enable padding delays (default: true, can be disabled via NCURSES_NO_PADDING) */
	enabled: boolean;
	/** Terminal baud rate for proportional padding calculations */
	baudRate: number;
	/** Number of lines affected (for proportional padding) */
	affectedLines: number;
	/** Skip non-mandatory padding for high-speed terminals */
	highSpeed: boolean;
}

/**
 * Result of printing with padding.
 */
export interface PrintResult {
	/** The output string (padding markers removed) */
	output: string;
	/** Total delay in milliseconds */
	totalDelay: number;
	/** Individual padding specifications found */
	paddingSpecs: PaddingSpec[];
}

/**
 * Default padding configuration.
 */
export const DEFAULT_PADDING_CONFIG: PaddingConfig = {
	enabled: true,
	baudRate: 0, // 0 means no baud-based proportional scaling
	affectedLines: 1,
	highSpeed: true, // Modern terminals are high-speed
};

/**
 * Regex to match padding specifications: $\<delay[*][/]\>
 */
const PADDING_REGEX = /\$<(\d+)(\*?)(\/?)>/g;

/**
 * Parses a padding specification string.
 *
 * @param spec - Padding string (e.g., '$\<5\>' or '$\<100/\>')
 * @returns Parsed padding spec, or null if invalid
 */
export function parsePadding(spec: string): PaddingSpec | null {
	const match = /^\$<(\d+)(\*?)(\/?)>$/.exec(spec);
	if (!match) {
		return null;
	}

	const [original, delayStr, proportional, mandatory] = match;
	return {
		delay: Number.parseInt(delayStr, 10),
		proportional: proportional === '*',
		mandatory: mandatory === '/',
		original,
	};
}

/**
 * Extracts all padding specifications from a string.
 *
 * @param input - String potentially containing padding markers
 * @returns Array of padding specs in order of appearance
 */
export function extractPadding(input: string): PaddingSpec[] {
	const specs: PaddingSpec[] = [];
	const regex = new RegExp(PADDING_REGEX.source, 'g');

	for (;;) {
		const match = regex.exec(input);
		if (match === null) break;

		const [original, delayStr, proportional, mandatory] = match;
		specs.push({
			delay: Number.parseInt(delayStr, 10),
			proportional: proportional === '*',
			mandatory: mandatory === '/',
			original,
		});
	}

	return specs;
}

/**
 * Non-global regex for testing (avoids lastIndex issues).
 */
const PADDING_TEST_REGEX = /\$<\d+\*?\/?>/;

/**
 * Checks if a string contains padding markers.
 *
 * @param input - String to check
 * @returns true if padding markers are present
 */
export function hasPadding(input: string): boolean {
	return PADDING_TEST_REGEX.test(input);
}

/**
 * Removes padding markers from a string.
 *
 * @param input - String containing padding markers
 * @returns String with padding markers removed
 */
export function stripPadding(input: string): string {
	return input.replace(PADDING_REGEX, '');
}

/**
 * Calculates the effective delay for a padding specification.
 *
 * Takes into account proportional scaling and high-speed terminal settings.
 *
 * @param spec - Padding specification
 * @param config - Padding configuration
 * @returns Effective delay in milliseconds
 */
export function calculateDelay(spec: PaddingSpec, config: Partial<PaddingConfig> = {}): number {
	const cfg = { ...DEFAULT_PADDING_CONFIG, ...config };

	// Padding disabled globally
	if (!cfg.enabled) {
		return 0;
	}

	// Non-mandatory padding can be skipped on high-speed terminals
	if (cfg.highSpeed && !spec.mandatory) {
		return 0;
	}

	let delay = spec.delay;

	// Proportional padding scales with affected lines
	if (spec.proportional) {
		delay *= cfg.affectedLines;
	}

	// Baud rate scaling (for very old terminals)
	// Padding is specified per 1200 baud
	if (cfg.baudRate > 0) {
		delay = Math.ceil((delay * cfg.baudRate) / 1200);
	}

	return delay;
}

/**
 * Calculates total delay for all padding in a string.
 *
 * @param input - String containing padding markers
 * @param config - Padding configuration
 * @returns Total delay in milliseconds
 */
export function calculateTotalDelay(input: string, config: Partial<PaddingConfig> = {}): number {
	const specs = extractPadding(input);
	return specs.reduce((total, spec) => total + calculateDelay(spec, config), 0);
}

/**
 * Processes a string for output, extracting padding information.
 *
 * @param input - String to process
 * @param config - Padding configuration
 * @returns Print result with output and delay information
 */
export function processPadding(input: string, config: Partial<PaddingConfig> = {}): PrintResult {
	const specs = extractPadding(input);
	const output = stripPadding(input);
	const totalDelay = specs.reduce((total, spec) => total + calculateDelay(spec, config), 0);

	return {
		output,
		totalDelay,
		paddingSpecs: specs,
	};
}

/**
 * Creates an async print function with padding support.
 *
 * @param writer - Function to write output (e.g., process.stdout.write)
 * @param config - Default padding configuration
 * @returns Async print function
 */
export function createPaddedPrint(
	writer: (output: string) => void,
	config: Partial<PaddingConfig> = {},
): (input: string, overrideConfig?: Partial<PaddingConfig>) => Promise<void> {
	return async (input: string, overrideConfig?: Partial<PaddingConfig>): Promise<void> => {
		const cfg = { ...config, ...overrideConfig };
		const { output, totalDelay } = processPadding(input, cfg);

		writer(output);

		if (totalDelay > 0) {
			await delay(totalDelay);
		}
	};
}

/**
 * Creates a synchronous print function with padding support.
 *
 * Uses blocking delay for synchronous operation. Prefer createPaddedPrint
 * for async operation in most cases.
 *
 * @param writer - Function to write output
 * @param config - Default padding configuration
 * @returns Sync print function
 */
export function createPaddedPrintSync(
	writer: (output: string) => void,
	config: Partial<PaddingConfig> = {},
): (input: string, overrideConfig?: Partial<PaddingConfig>) => void {
	return (input: string, overrideConfig?: Partial<PaddingConfig>): void => {
		const cfg = { ...config, ...overrideConfig };
		const { output, totalDelay } = processPadding(input, cfg);

		writer(output);

		if (totalDelay > 0) {
			delaySync(totalDelay);
		}
	};
}

/**
 * Async delay helper.
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 *
 * @internal
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Synchronous delay helper using busy wait.
 *
 * Note: This blocks the event loop. Use sparingly.
 *
 * @param ms - Milliseconds to delay
 *
 * @internal
 */
function delaySync(ms: number): void {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		// Busy wait
	}
}

/**
 * Formats a padding specification back to string format.
 *
 * @param spec - Padding specification
 * @returns Formatted padding string
 */
export function formatPadding(spec: Omit<PaddingSpec, 'original'>): string {
	const flags = `${spec.proportional ? '*' : ''}${spec.mandatory ? '/' : ''}`;
	return `$<${spec.delay}${flags}>`;
}

/**
 * Inserts padding after escape sequences in a string.
 *
 * Useful when building capability strings that need padding.
 *
 * @param input - String to add padding to
 * @param delayMs - Delay in milliseconds
 * @param options - Padding options
 * @returns String with padding added
 */
export function addPadding(
	input: string,
	delayMs: number,
	options: { proportional?: boolean; mandatory?: boolean } = {},
): string {
	const padding = formatPadding({
		delay: delayMs,
		proportional: options.proportional ?? false,
		mandatory: options.mandatory ?? false,
	});

	return input + padding;
}
