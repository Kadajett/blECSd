/**
 * Command Palette Widget
 *
 * A VS Code-style command palette for quick command search and execution.
 * Features fuzzy search, keyboard shortcuts display, and command grouping.
 *
 * @module widgets/commandPalette
 */

import { z } from 'zod';
import { appendChild } from '../components/hierarchy';
import { setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import {
	attachTextInputBehavior,
	onTextInputChange,
	onTextInputSubmit,
	setTextInputConfig,
} from '../components/textInput';
import { addEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import { type FuzzyMatch, fuzzySearchBy } from '../utils/fuzzySearch';
import { createBox } from './box';
import { createList, type ListWidgetConfig } from './list';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Command Palette component marker for identifying command palette entities.
 */
export const CommandPalette = {
	/** Tag indicating this is a command palette widget (1 = yes) */
	isCommandPalette: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single command in the palette.
 */
export interface Command {
	/** Unique command identifier */
	readonly id: string;
	/** Display label for the command */
	readonly label: string;
	/** Optional description shown below label */
	readonly description?: string;
	/** Optional keyboard shortcut shown on right */
	readonly shortcut?: string;
	/** Optional category for grouping */
	readonly category?: string;
	/** Handler function called when command is executed */
	readonly handler: () => void | Promise<void>;
}

/**
 * Theme configuration for command palette styling.
 */
export interface CommandPaletteTheme {
	/** Input foreground color */
	readonly inputFg?: string | number;
	/** Input background color */
	readonly inputBg?: string | number;
	/** List foreground color */
	readonly listFg?: string | number;
	/** List background color */
	readonly listBg?: string | number;
	/** Selected item foreground color */
	readonly selectedFg?: string | number;
	/** Selected item background color */
	readonly selectedBg?: string | number;
	/** Shortcut text color */
	readonly shortcutFg?: string | number;
	/** Description text color */
	readonly descriptionFg?: string | number;
}

/**
 * Command Palette widget configuration.
 *
 * @example
 * ```typescript
 * import { createCommandPalette } from 'blecsd';
 *
 * const palette = createCommandPalette(world, eid, {
 *   commands: [
 *     {
 *       id: 'file.new',
 *       label: 'New File',
 *       description: 'Create a new file',
 *       shortcut: 'Ctrl+N',
 *       category: 'File',
 *       handler: () => console.log('New file!')
 *     },
 *     {
 *       id: 'file.save',
 *       label: 'Save',
 *       shortcut: 'Ctrl+S',
 *       category: 'File',
 *       handler: () => console.log('Save!')
 *     }
 *   ],
 *   placeholder: 'Type a command...',
 *   maxResults: 10
 * });
 * ```
 */
export interface CommandPaletteConfig {
	/**
	 * Array of available commands
	 * @default []
	 */
	readonly commands?: readonly Command[];

	/**
	 * Placeholder text for search input
	 * @default 'Type a command...'
	 */
	readonly placeholder?: string;

	/**
	 * Maximum number of results to show
	 * @default 10
	 */
	readonly maxResults?: number;

	/**
	 * Theme/styling configuration
	 */
	readonly theme?: CommandPaletteTheme;

	/**
	 * Width in cells
	 * @default 60
	 */
	readonly width?: number;

	/**
	 * Callback when palette is closed
	 */
	readonly onClose?: () => void;
}

/**
 * Command Palette widget instance.
 */
export interface CommandPaletteWidget {
	readonly entity: Entity;
	readonly world: World;
	/**
	 * Show the command palette
	 */
	show(): void;
	/**
	 * Hide the command palette
	 */
	hide(): void;
	/**
	 * Execute command by ID
	 */
	executeCommand(commandId: string): void;
	/**
	 * Update available commands
	 */
	setCommands(commands: readonly Command[]): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

const CommandSchema = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().optional(),
	shortcut: z.string().optional(),
	category: z.string().optional(),
	handler: z.function().nullable().optional(),
});

const CommandPaletteThemeSchema = z.object({
	inputFg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	inputBg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	listFg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	listBg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	selectedFg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	selectedBg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	shortcutFg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	descriptionFg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
});

/**
 * Zod schema for CommandPaletteConfig validation.
 */
export const CommandPaletteConfigSchema = z.object({
	commands: z.array(CommandSchema).optional(),
	placeholder: z.string().optional(),
	maxResults: z.number().int().positive().optional(),
	theme: CommandPaletteThemeSchema.optional(),
	width: z.number().int().positive().optional(),
	onClose: z.function().nullable().optional(),
});

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

interface CommandPaletteState {
	world: World;
	inputEntity: Entity;
	listEntity: Entity;
	commands: readonly Command[];
	filteredCommands: readonly (Command & { match?: FuzzyMatch<Command> })[];
	selectedIndex: number;
	maxResults: number;
	onClose: (() => void) | undefined;
	visible: boolean;
}

const stateStore = new Map<Entity, CommandPaletteState>();

/**
 * Resets the command palette component store (useful for testing).
 */
export function resetCommandPaletteStore(): void {
	stateStore.clear();
	CommandPalette.isCommandPalette.fill(0);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format a command for display in the list.
 * Currently unused but may be needed for future list widget integration.
 */
// function formatCommand(command: Command & { match?: FuzzyMatch }): string {
// 	const parts: string[] = [];

// 	// Add label
// 	parts.push(command.label);

// 	// Add shortcut if present
// 	if (command.shortcut) {
// 		parts.push(`  [${command.shortcut}]`);
// 	}

// 	// Add description on second line if present
// 	if (command.description) {
// 		parts.push(`\n  ${command.description}`);
// 	}

// 	return parts.join('');
// }

/**
 * Filter commands based on search query.
 */
function filterCommands(
	commands: readonly Command[],
	query: string,
	maxResults: number,
): readonly (Command & { match?: FuzzyMatch<Command> })[] {
	if (!query.trim()) {
		return commands.slice(0, maxResults);
	}

	// Fuzzy search on label, description, and category
	const results = fuzzySearchBy(query, commands, {
		getText: (cmd) => [cmd.label, cmd.description, cmd.category].filter(Boolean).join(' '),
		limit: maxResults,
	});

	return results.map((match) => ({ ...match.item, match }));
}

/**
 * Update the filtered results display.
 */
function updateResults(entity: Entity): void {
	const state = stateStore.get(entity);
	if (!state) {
		return;
	}

	// Format commands for display
	// const items = state.filteredCommands.map((cmd) => formatCommand(cmd));

	// Update list (assuming list widget has a method to update items)
	// For now, we'll mark as dirty
	markDirty(state.world, state.listEntity);
}

/**
 * Execute the selected command.
 */
function executeSelected(entity: Entity): void {
	const state = stateStore.get(entity);
	if (!state || state.filteredCommands.length === 0) {
		return;
	}

	const command = state.filteredCommands[state.selectedIndex];
	if (command) {
		// Hide palette before executing
		hideCommandPalette(entity);

		// Execute command
		try {
			const result = command.handler();
			if (result instanceof Promise) {
				result.catch((error) => {
					console.error(`Command ${command.id} failed:`, error);
				});
			}
		} catch (error) {
			console.error(`Command ${command.id} failed:`, error);
		}
	}
}

/**
 * Show the command palette.
 */
function showCommandPalette(entity: Entity): void {
	const state = stateStore.get(entity);
	if (!state) {
		return;
	}

	state.visible = true;
	setVisible(state.world, entity, true);
	setVisible(state.world, state.inputEntity, true);
	setVisible(state.world, state.listEntity, true);

	// Focus input
	// TODO: Focus input when focus system is available
	markDirty(state.world, entity);
}

/**
 * Hide the command palette.
 */
function hideCommandPalette(entity: Entity): void {
	const state = stateStore.get(entity);
	if (!state) {
		return;
	}

	state.visible = false;
	setVisible(state.world, entity, false);
	setVisible(state.world, state.inputEntity, false);
	setVisible(state.world, state.listEntity, false);

	// Call onClose callback
	state.onClose?.();

	markDirty(state.world, entity);
}

// =============================================================================
// WIDGET FACTORY
// =============================================================================

/**
 * Creates a command palette widget.
 *
 * The command palette provides a quick way to search and execute commands using
 * fuzzy matching, similar to VS Code's command palette (Ctrl+Shift+P).
 *
 * @param world - The ECS world
 * @param entity - The entity to attach the command palette to
 * @param config - Command palette configuration
 * @returns Command palette widget instance
 *
 * @example
 * ```typescript
 * import { createCommandPalette, createWorld, addEntity } from 'blecsd';
 *
 * const world = createWorld();
 * const palette = addEntity(world);
 *
 * const widget = createCommandPalette(world, palette, {
 *   commands: [
 *     {
 *       id: 'help',
 *       label: 'Show Help',
 *       description: 'Display help documentation',
 *       shortcut: 'F1',
 *       handler: () => console.log('Help!')
 *     }
 *   ],
 *   placeholder: 'Search commands...',
 *   maxResults: 8
 * });
 *
 * // Show the palette
 * widget.show();
 *
 * // Execute a command by ID
 * widget.executeCommand('help');
 * ```
 */
export function createCommandPalette(
	world: World,
	entity: Entity,
	config: CommandPaletteConfig = {},
): CommandPaletteWidget {
	// Validate config (omit commands and onClose for function type compatibility)
	const validated = CommandPaletteConfigSchema.omit({ commands: true, onClose: true }).parse(
		config,
	);

	const commands = config.commands ?? [];
	const placeholder = validated.placeholder ?? 'Type a command...';
	const maxResults = validated.maxResults ?? 10;
	const width = validated.width ?? 60;
	const theme = validated.theme;

	// Create container box
	createBox(world, entity);
	setPosition(world, entity, 0, 0);
	setVisible(world, entity, false); // Start hidden

	// Create input field
	const inputEntity = addEntity(world);
	createBox(world, inputEntity);
	setPosition(world, inputEntity, 1, 1);
	appendChild(world, entity, inputEntity);

	// Setup text input behavior
	attachTextInputBehavior(world, inputEntity);
	setTextInputConfig(world, inputEntity, {
		placeholder,
	});

	// Apply input theme
	if (theme?.inputFg !== undefined || theme?.inputBg !== undefined) {
		const fg = typeof theme.inputFg === 'string' ? parseColor(theme.inputFg) : theme.inputFg;
		const bg = typeof theme.inputBg === 'string' ? parseColor(theme.inputBg) : theme.inputBg;
		setStyle(world, inputEntity, { fg, bg });
	}

	// Create results list
	const listEntity = addEntity(world);
	setPosition(world, listEntity, 1, 3);
	appendChild(world, entity, listEntity);

	const listConfig: ListWidgetConfig = {
		items: [],
		width: width - 2,
		height: Math.min(maxResults + 2, 12),
	};

	// Apply list theme
	if (theme?.listFg !== undefined || theme?.listBg !== undefined) {
		const fg = typeof theme.listFg === 'string' ? parseColor(theme.listFg) : theme.listFg;
		const bg = typeof theme.listBg === 'string' ? parseColor(theme.listBg) : theme.listBg;
		if (fg !== undefined || bg !== undefined) {
			setStyle(world, listEntity, { fg, bg });
		}
	}

	createList(world, listEntity, listConfig);

	// Initialize state
	const state: CommandPaletteState = {
		world,
		inputEntity,
		listEntity,
		commands,
		filteredCommands: commands.slice(0, maxResults),
		selectedIndex: 0,
		maxResults,
		onClose: config.onClose,
		visible: false,
	};

	stateStore.set(entity, state);

	// Setup input change handler
	onTextInputChange(world, inputEntity, (value) => {
		const filtered = filterCommands(state.commands, value, state.maxResults);
		state.filteredCommands = filtered;
		state.selectedIndex = 0;
		updateResults(entity);
	});

	// Setup submit handler (Enter key)
	onTextInputSubmit(world, inputEntity, () => {
		executeSelected(entity);
	});

	// Mark component
	CommandPalette.isCommandPalette[entity] = 1;

	// Return widget API
	return {
		entity,
		world,
		show() {
			showCommandPalette(entity);
		},
		hide() {
			hideCommandPalette(entity);
		},
		executeCommand(commandId: string) {
			const command = state.commands.find((cmd) => cmd.id === commandId);
			if (command) {
				try {
					const result = command.handler();
					if (result instanceof Promise) {
						result.catch((error) => {
							console.error(`Command ${commandId} failed:`, error);
						});
					}
				} catch (error) {
					console.error(`Command ${commandId} failed:`, error);
				}
			}
		},
		setCommands(newCommands: readonly Command[]) {
			state.commands = newCommands;
			state.filteredCommands = newCommands.slice(0, state.maxResults);
			state.selectedIndex = 0;
			updateResults(entity);
		},
	};
}

/**
 * Checks if an entity is a command palette widget.
 *
 * @param entity - The entity to check
 * @returns True if the entity is a command palette
 */
export function isCommandPalette(entity: Entity): boolean {
	return CommandPalette.isCommandPalette[entity] === 1;
}
