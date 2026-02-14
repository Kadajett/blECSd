/**
 * TerminalBuffer Component
 *
 * ECS component for terminal emulator buffers. Stores a 2D grid of cells
 * with per-cell styling, cursor state, and scrollback history.
 *
 * @module components/terminalBuffer
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'blecsd';
 * import {
 *   setTerminalBuffer,
 *   writeToTerminal,
 *   getTerminalState,
 *   clearTerminal,
 * } from 'blecsd/components';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Initialize a terminal buffer
 * setTerminalBuffer(world, eid, { width: 80, height: 24 });
 *
 * // Write ANSI content
 * writeToTerminal(world, eid, '\x1b[31mHello\x1b[0m World');
 *
 * // Get current state
 * const state = getTerminalState(eid);
 * console.log(state?.cursorX, state?.cursorY);
 *
 * // Clear the terminal
 * clearTerminal(world, eid);
 * ```
 */

// Component definition and constants
export {
	DEFAULT_CAPACITY,
	DEFAULT_SCROLLBACK_LINES,
	DEFAULT_TERMINAL_HEIGHT,
	DEFAULT_TERMINAL_WIDTH,
	TerminalBuffer,
} from './component';

// Public API functions
export {
	clearTerminal,
	resetTerminal,
	resizeTerminalBuffer,
	scrollTerminalDown,
	scrollTerminalToBottom,
	scrollTerminalToTop,
	scrollTerminalUp,
	setCursorPosition,
	setCursorVisible,
	writeChar,
	writeToTerminal,
} from './public';

// Rendering functions
export { getTerminalCells, renderTerminalToAnsi } from './render';

// Schemas
export { type TerminalBufferConfig, TerminalBufferConfigSchema } from './schemas';

// State management
export {
	getTerminalBuffer,
	getTerminalState,
	hasTerminalBuffer,
	removeTerminalBuffer,
	resetTerminalBufferStore,
	setTerminalBuffer as setTerminalBufferInternal,
} from './state';

// Types
export { type CursorShape, type TerminalState, terminalStateMap } from './types';

// Wrapper function for setTerminalBuffer that validates config
import type { Entity, World } from '../../core/types';
import { type TerminalBufferConfig, TerminalBufferConfigSchema } from './schemas';
import { setTerminalBuffer as setTerminalBufferInternal } from './state';

/**
 * Sets up a terminal buffer on an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param config - Terminal buffer configuration
 *
 * @example
 * ```typescript
 * setTerminalBuffer(world, eid, {
 *   width: 80,
 *   height: 24,
 *   scrollbackLines: 1000,
 * });
 * ```
 */
export function setTerminalBuffer(
	world: World,
	eid: Entity,
	config: TerminalBufferConfig = {},
): void {
	const validated = TerminalBufferConfigSchema.parse(config);
	setTerminalBufferInternal(world, eid, validated);
}
