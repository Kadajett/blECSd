/**
 * w3m command formatting functions.
 *
 * @module media/overlay/w3m-commands
 */

import type { W3MClearConfig, W3MDrawConfig } from './w3m-types';
import { W3MCommand } from './w3m-types';

/**
 * Formats a draw command string for w3mimgdisplay.
 *
 * @example
 * ```typescript
 * import { formatDrawCommand } from 'blecsd';
 *
 * const cmd = formatDrawCommand({
 *   id: 1, x: 0, y: 0, width: 200, height: 160,
 *   filePath: '/path/to/image.png',
 * });
 * ```
 */
export function formatDrawCommand(config: W3MDrawConfig): string {
	const sx = config.srcX ?? '';
	const sy = config.srcY ?? '';
	const sw = config.srcWidth ?? '';
	const sh = config.srcHeight ?? '';
	return `${W3MCommand.Draw};${config.id};${config.x};${config.y};${config.width};${config.height};${sx};${sy};${sw};${sh};${config.filePath}\n`;
}

/**
 * Formats a redraw command string for w3mimgdisplay.
 *
 * @example
 * ```typescript
 * import { formatRedrawCommand } from 'blecsd';
 *
 * const cmd = formatRedrawCommand({
 *   id: 1, x: 0, y: 0, width: 200, height: 160,
 *   filePath: '/path/to/image.png',
 * });
 * ```
 */
export function formatRedrawCommand(config: W3MDrawConfig): string {
	const sx = config.srcX ?? '';
	const sy = config.srcY ?? '';
	const sw = config.srcWidth ?? '';
	const sh = config.srcHeight ?? '';
	return `${W3MCommand.Redraw};${config.id};${config.x};${config.y};${config.width};${config.height};${sx};${sy};${sw};${sh};${config.filePath}\n`;
}

/**
 * Formats a clear command string for w3mimgdisplay.
 *
 * @example
 * ```typescript
 * import { formatClearCommand } from 'blecsd';
 *
 * const cmd = formatClearCommand({ x: 0, y: 0, width: 200, height: 160 });
 * ```
 */
export function formatClearCommand(config: W3MClearConfig): string {
	return `${W3MCommand.Clear};${config.x};${config.y};${config.width};${config.height}\n`;
}

/**
 * Formats a get-size command string for w3mimgdisplay.
 *
 * @example
 * ```typescript
 * import { formatGetSizeCommand } from 'blecsd';
 *
 * const cmd = formatGetSizeCommand('/path/to/image.png');
 * ```
 */
export function formatGetSizeCommand(filePath: string): string {
	return `${W3MCommand.GetSize};${filePath}\n`;
}

/**
 * Formats the sync command string.
 */
export function formatSyncCommand(): string {
	return `${W3MCommand.Sync};\n`;
}

/**
 * Formats the nop (communication sync) command string.
 */
export function formatNopCommand(): string {
	return `${W3MCommand.Nop};\n`;
}

/**
 * Formats the terminate command string.
 */
export function formatTerminateCommand(): string {
	return `${W3MCommand.Terminate};\n`;
}
