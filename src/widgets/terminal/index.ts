/**
 * Terminal Widget
 *
 * High-level terminal emulator widget that embeds a terminal buffer for
 * displaying ANSI content and optionally spawning shell processes via PTY.
 *
 * @module widgets/terminal
 *
 * @example
 * ```typescript
 * import { createTerminal } from 'blecsd/widgets';
 *
 * // Create a terminal widget
 * const terminal = createTerminal(world, {
 *   width: 80,
 *   height: 24,
 *   scrollback: 1000,
 *   border: { type: 'line' },
 * });
 *
 * // Write ANSI content
 * terminal.write('\x1b[31mRed text\x1b[0m\n');
 * terminal.writeln('Hello, world!');
 *
 * // Spawn a shell (requires node-pty)
 * terminal.spawn('/bin/bash');
 *
 * // Handle output
 * terminal.onData((data) => console.log('Output:', data));
 * terminal.onExit((code) => console.log('Exited:', code));
 * ```
 */

// Export config and schemas
export { PtyOptionsSchema, TerminalConfigSchema } from './config';

// Export factory function
export { createTerminal } from './factory';

// Export keyboard handler
export { handleTerminalKey } from './keyboard';

// Export PTY utilities
export type { NodePtyModule, ParsedSpawnOptions } from './pty';
export { parseSpawnOptions, tryLoadNodePty } from './pty';

// Export state (for advanced usage)
export { ptyStateMap, resetTerminalStore as resetStore, Terminal } from './state';

// Export all types
export type {
	BorderConfig,
	PositionValue,
	PtyOptions,
	PtyState,
	TerminalConfig,
	TerminalStyle,
	TerminalWidget,
} from './types';

// Export utility functions
export {
	isTerminal,
	isTerminalKeysEnabled,
	isTerminalMouseEnabled,
	resetTerminalStore,
} from './utilities';

// Export utils (for advanced usage)
export {
	borderTypeToEnum,
	calculateDisplayDimensions,
	getBorderCharset,
	parsePositionToNumber,
	setupTerminalBorder,
	setupTerminalStyle,
} from './utils';
