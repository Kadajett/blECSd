/**
 * CommandPalette widget namespace.
 *
 * @example
 * ```typescript
 * import { commandPalette } from 'blecsd/widgets';
 * const cp = commandPalette.create(world, { commands: [...] });
 * ```
 */
import {
	createCommandPalette,
	isCommandPalette,
	resetCommandPaletteStore,
} from '../commandPalette';

export const commandPalette = Object.freeze({
	create: createCommandPalette,
	is: isCommandPalette,
	resetStore: resetCommandPaletteStore,
});

export type CommandPaletteModule = typeof commandPalette;
