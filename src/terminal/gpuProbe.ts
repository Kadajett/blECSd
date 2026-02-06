/**
 * GPU terminal capability probing.
 *
 * Detects whether the host terminal is GPU-accelerated and reports
 * which optimization strategies are supported. This is the practical
 * approach to GPU rendering for a terminal library: detect the host's
 * capabilities and optimize output accordingly.
 *
 * @module terminal/gpuProbe
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Known GPU-accelerated terminal emulators.
 */
export type GpuTerminal =
	| 'alacritty'
	| 'kitty'
	| 'ghostty'
	| 'warp'
	| 'wezterm'
	| 'contour'
	| 'rio'
	| 'unknown';

/**
 * GPU rendering capabilities detected from the host terminal.
 */
export interface GpuCapabilities {
	/** Whether the terminal is likely GPU-accelerated */
	readonly isGpuAccelerated: boolean;
	/** Detected terminal name */
	readonly terminal: GpuTerminal;
	/** Whether synchronized output is supported (CSI ?2026h/l) */
	readonly syncOutput: boolean;
	/** Whether the Kitty graphics protocol is available */
	readonly kittyGraphics: boolean;
	/** Whether the Sixel graphics protocol is available */
	readonly sixelGraphics: boolean;
	/** Whether Unicode is well-supported (wide chars, combining marks) */
	readonly unicodeSupport: boolean;
	/** Recommended optimization strategies for this terminal */
	readonly strategies: readonly RenderStrategy[];
}

/**
 * Rendering strategies recommended based on terminal capabilities.
 */
export type RenderStrategy =
	| 'sync-output'
	| 'diff-rendering'
	| 'cursor-jump'
	| 'sgr-coalesce'
	| 'kitty-graphics'
	| 'sixel-graphics'
	| 'bulk-scroll';

// =============================================================================
// DETECTION
// =============================================================================

/**
 * Detects GPU-accelerated terminal capabilities from environment variables.
 *
 * This is a synchronous, best-effort detection that checks known environment
 * variables set by GPU-accelerated terminals. No escape sequences are sent.
 *
 * @returns Detected GPU capabilities
 *
 * @example
 * ```typescript
 * import { detectGpuCapabilities } from 'blecsd';
 *
 * const caps = detectGpuCapabilities();
 * if (caps.isGpuAccelerated) {
 *   console.log(`GPU terminal detected: ${caps.terminal}`);
 *   console.log('Strategies:', caps.strategies.join(', '));
 * }
 * ```
 */
export function detectGpuCapabilities(): GpuCapabilities {
	const env = typeof process !== 'undefined' ? process.env : {};
	const terminal = detectTerminal(env);
	const isGpuAccelerated = terminal !== 'unknown';

	const syncOutput = isGpuAccelerated; // All GPU terminals support this
	const kittyGraphics = terminal === 'kitty' || terminal === 'ghostty' || terminal === 'wezterm';
	const sixelGraphics = terminal === 'wezterm' || terminal === 'contour' || terminal === 'rio';
	const unicodeSupport = isGpuAccelerated;

	const strategies = buildStrategies(syncOutput, kittyGraphics, sixelGraphics);

	return {
		isGpuAccelerated,
		terminal,
		syncOutput,
		kittyGraphics,
		sixelGraphics,
		unicodeSupport,
		strategies,
	};
}

/**
 * Returns a human-readable report of GPU capabilities.
 *
 * @param caps - The capabilities to format
 * @returns Formatted multi-line string
 *
 * @example
 * ```typescript
 * import { detectGpuCapabilities, formatGpuReport } from 'blecsd';
 *
 * console.log(formatGpuReport(detectGpuCapabilities()));
 * ```
 */
export function formatGpuReport(caps: GpuCapabilities): string {
	const lines: string[] = [
		'GPU Terminal Capabilities',
		'========================',
		`Terminal:         ${caps.terminal}`,
		`GPU Accelerated:  ${caps.isGpuAccelerated ? 'yes' : 'no'}`,
		`Sync Output:      ${caps.syncOutput ? 'yes' : 'no'}`,
		`Kitty Graphics:   ${caps.kittyGraphics ? 'yes' : 'no'}`,
		`Sixel Graphics:   ${caps.sixelGraphics ? 'yes' : 'no'}`,
		`Unicode Support:  ${caps.unicodeSupport ? 'yes' : 'no'}`,
		'',
		'Recommended Strategies:',
	];

	for (const strategy of caps.strategies) {
		lines.push(`  - ${strategy}`);
	}

	if (caps.strategies.length === 0) {
		lines.push('  (none - using baseline rendering)');
	}

	return lines.join('\n');
}

/**
 * Generates the synchronized output begin sequence.
 * Supported by all GPU-accelerated terminals.
 *
 * @returns CSI sequence to begin synchronized output
 */
export function syncOutputBegin(): string {
	return '\x1b[?2026h';
}

/**
 * Generates the synchronized output end sequence.
 *
 * @returns CSI sequence to end synchronized output
 */
export function syncOutputEnd(): string {
	return '\x1b[?2026l';
}

/**
 * Wraps content in synchronized output sequences.
 * This prevents tearing when the terminal redraws mid-frame.
 *
 * @param content - The escape sequence content to wrap
 * @returns Content wrapped in sync begin/end sequences
 *
 * @example
 * ```typescript
 * import { wrapSyncOutput } from 'blecsd';
 *
 * const frame = buildFrameContent();
 * process.stdout.write(wrapSyncOutput(frame));
 * ```
 */
export function wrapSyncOutput(content: string): string {
	return `${syncOutputBegin()}${content}${syncOutputEnd()}`;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function detectTerminal(env: Record<string, string | undefined>): GpuTerminal {
	// Check specific terminal identifiers
	if (env.ALACRITTY_LOG || env.ALACRITTY_SOCKET) return 'alacritty';
	if (env.KITTY_PID || env.KITTY_WINDOW_ID) return 'kitty';
	if (env.GHOSTTY_RESOURCES_DIR) return 'ghostty';
	if (env.TERM_PROGRAM === 'WarpTerminal') return 'warp';
	if (env.TERM_PROGRAM === 'WezTerm') return 'wezterm';
	if (env.TERM_PROGRAM === 'contour') return 'contour';
	if (env.TERM_PROGRAM === 'rio') return 'rio';

	// Fallback checks
	const termProgram = env.TERM_PROGRAM ?? '';
	if (termProgram.toLowerCase().includes('alacritty')) return 'alacritty';
	if (termProgram.toLowerCase().includes('kitty')) return 'kitty';
	if (termProgram.toLowerCase().includes('ghostty')) return 'ghostty';

	return 'unknown';
}

function buildStrategies(
	syncOutput: boolean,
	kittyGraphics: boolean,
	sixelGraphics: boolean,
): readonly RenderStrategy[] {
	const strategies: RenderStrategy[] = [];

	// All terminals benefit from these
	strategies.push('diff-rendering');
	strategies.push('cursor-jump');
	strategies.push('sgr-coalesce');

	if (syncOutput) {
		strategies.push('sync-output');
	}

	if (kittyGraphics) {
		strategies.push('kitty-graphics');
	}

	if (sixelGraphics) {
		strategies.push('sixel-graphics');
	}

	// GPU terminals can handle bulk scroll operations efficiently
	if (syncOutput) {
		strategies.push('bulk-scroll');
	}

	return strategies;
}
