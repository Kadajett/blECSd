/**
 * FileManager Widget
 *
 * A file browser widget for navigating directories and selecting files.
 * Supports directory navigation, sorted entries (directories first),
 * hidden file toggle, and glob-based file filtering.
 *
 * @module widgets/fileManager
 */

import { readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../components/border';
import { setContent, TextAlign, TextVAlign } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setPadding } from '../components/padding';
import { moveBy, setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a single file or directory entry.
 */
export interface FileEntry {
	/** File or directory name */
	readonly name: string;
	/** Full absolute path */
	readonly path: string;
	/** Whether this entry is a directory */
	readonly isDirectory: boolean;
	/** File size in bytes (0 for directories) */
	readonly size: number;
}

/**
 * Border configuration for the file manager.
 */
export interface FileManagerBorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none' | undefined;
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number | undefined;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number | undefined;
	/** Border charset ('single', 'double', 'rounded', 'bold', 'ascii', or custom) */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset | undefined;
}

/**
 * Padding configuration (all sides, or individual sides).
 */
export type FileManagerPaddingConfig =
	| number
	| {
			readonly left?: number | undefined;
			readonly top?: number | undefined;
			readonly right?: number | undefined;
			readonly bottom?: number | undefined;
	  };

/**
 * Configuration for creating a FileManager widget.
 */
export interface FileManagerConfig {
	/** Initial working directory (default: process.cwd()) */
	readonly cwd?: string;
	/** Whether to show hidden files (default: false) */
	readonly showHidden?: boolean;
	/** Simple glob pattern for filtering files (e.g., '*.ts', '*.js') */
	readonly filePattern?: string;
	/** Width of the widget */
	readonly width?: number;
	/** Height of the widget */
	readonly height?: number;
	/** Left position (absolute) */
	readonly left?: number;
	/** Top position (absolute) */
	readonly top?: number;
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: FileManagerBorderConfig;
	/** Padding configuration for content area */
	readonly padding?: FileManagerPaddingConfig;
}

/**
 * FileManager widget interface providing chainable methods.
 */
export interface FileManagerWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the file manager */
	show(): FileManagerWidget;
	/** Hides the file manager */
	hide(): FileManagerWidget;

	// Position
	/** Moves the widget by dx, dy */
	move(dx: number, dy: number): FileManagerWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): FileManagerWidget;
	/** Centers the widget (requires terminal width/height) */
	center(termWidth: number, termHeight: number): FileManagerWidget;

	// Navigation
	/** Sets the current working directory */
	setCwd(path: string): FileManagerWidget;
	/** Gets the current working directory */
	getCwd(): string;
	/** Gets the currently selected entry (by cursor index) */
	getSelected(): FileEntry | undefined;
	/** Refreshes the directory listing */
	refresh(): FileManagerWidget;
	/** Gets all current directory entries */
	getEntries(): readonly FileEntry[];

	// Callbacks
	/** Registers a callback for when a file is selected (Enter on a file) */
	onSelect(cb: (entry: FileEntry) => void): FileManagerWidget;
	/** Registers a callback for when navigating to a directory */
	onNavigate(cb: (path: string) => void): FileManagerWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default widget width */
const DEFAULT_FILE_MANAGER_WIDTH = 40;

/** Default widget height */
const DEFAULT_FILE_MANAGER_HEIGHT = 20;

/** Icon for directories */
const DIR_ICON = '/';

/** Icon for parent directory */
const PARENT_DIR_ENTRY = '..';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for file manager border configuration.
 */
const FileManagerBorderConfigSchema = z.object({
	type: z.enum(['line', 'bg', 'none']).optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	ch: z
		.union([z.enum(['single', 'double', 'rounded', 'bold', 'ascii']), z.object({}).passthrough()])
		.optional(),
});

/**
 * Zod schema for file manager padding configuration.
 */
const FileManagerPaddingSchema = z.union([
	z.number().nonnegative(),
	z.object({
		left: z.number().nonnegative().optional(),
		top: z.number().nonnegative().optional(),
		right: z.number().nonnegative().optional(),
		bottom: z.number().nonnegative().optional(),
	}),
]);

/**
 * Zod schema for FileManager widget configuration.
 *
 * @example
 * ```typescript
 * import { FileManagerConfigSchema } from 'blecsd';
 *
 * const result = FileManagerConfigSchema.safeParse({
 *   cwd: '/home/user',
 *   showHidden: false,
 *   width: 50,
 *   height: 25,
 * });
 * ```
 */
export const FileManagerConfigSchema = z.object({
	cwd: z.string().optional(),
	showHidden: z.boolean().optional().default(false),
	filePattern: z.string().optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	left: z.number().int().optional(),
	top: z.number().int().optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: FileManagerBorderConfigSchema.optional(),
	padding: FileManagerPaddingSchema.optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * FileManager component marker for identifying file manager entities.
 *
 * @example
 * ```typescript
 * import { FileManager } from 'blecsd';
 *
 * if (FileManager.isFileManager[eid] === 1) {
 *   // Entity is a file manager
 * }
 * ```
 */
export const FileManager = {
	/** Tag indicating this is a file manager widget (1 = yes) */
	isFileManager: new Uint8Array(DEFAULT_CAPACITY),
	/** Currently selected index */
	selectedIndex: new Uint32Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * Complex state for file manager entities.
 */
interface FileManagerState {
	cwd: string;
	showHidden: boolean;
	filePattern: string | undefined;
	width: number;
	height: number;
	entries: FileEntry[];
	onSelectCallbacks: Array<(entry: FileEntry) => void>;
	onNavigateCallbacks: Array<(path: string) => void>;
	/** Injected readDir function (for testing) */
	readDirFn: (dirPath: string) => FileEntry[];
}

/**
 * Store for complex file manager state.
 */
export const fileManagerStateMap = new Map<Entity, FileManagerState>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Converts border charset name to actual charset.
 */
function getBorderCharset(ch: string | object | undefined): BorderCharset {
	if (typeof ch === 'object') return ch as BorderCharset;
	if (ch === undefined || ch === 'single') return BORDER_SINGLE;
	return BORDER_SINGLE;
}

/**
 * Matches a filename against a simple glob pattern.
 * Supports only '*' wildcards (e.g., '*.ts', 'README.*', '*test*').
 */
function matchGlob(filename: string, pattern: string): boolean {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
	const regex = escaped.replace(/\*/g, '.*');
	return new RegExp(`^${regex}$`, 'i').test(filename);
}

/**
 * Reads directory entries, handling permission errors gracefully.
 */
function defaultReadDir(dirPath: string): FileEntry[] {
	try {
		const names = readdirSync(dirPath);
		const entries: FileEntry[] = [];
		for (const name of names) {
			const fullPath = join(dirPath, name);
			try {
				const stat = statSync(fullPath);
				entries.push({
					name,
					path: fullPath,
					isDirectory: stat.isDirectory(),
					size: stat.isDirectory() ? 0 : stat.size,
				});
			} catch {
				// Skip entries we can't stat (permission denied, broken symlinks, etc.)
			}
		}
		return entries;
	} catch {
		// Permission denied or directory doesn't exist
		return [];
	}
}

/**
 * Sorts entries: directories first (alphabetically), then files (alphabetically).
 */
function sortEntries(entries: readonly FileEntry[]): FileEntry[] {
	return [...entries].sort((a, b) => {
		if (a.isDirectory !== b.isDirectory) {
			return a.isDirectory ? -1 : 1;
		}
		return a.name.localeCompare(b.name);
	});
}

/**
 * Filters entries based on showHidden and filePattern settings.
 */
function filterEntries(
	entries: readonly FileEntry[],
	showHidden: boolean,
	filePattern: string | undefined,
): FileEntry[] {
	return entries.filter((entry) => {
		if (!showHidden && entry.name.startsWith('.')) return false;
		if (filePattern && !entry.isDirectory && !matchGlob(entry.name, filePattern)) return false;
		return true;
	});
}

/**
 * Loads and processes directory entries for a file manager state.
 */
function loadEntries(state: FileManagerState): FileEntry[] {
	let raw: FileEntry[];
	try {
		raw = state.readDirFn(state.cwd);
	} catch {
		return [];
	}
	const filtered = filterEntries(raw, state.showHidden, state.filePattern);
	return sortEntries(filtered);
}

/**
 * Builds display content string from entries.
 */
function buildContent(state: FileManagerState): string {
	const lines: string[] = [];
	const dirName = basename(state.cwd) || state.cwd;
	lines.push(`[${dirName}]`);
	lines.push(PARENT_DIR_ENTRY);

	for (let i = 0; i < state.entries.length; i++) {
		const entry = state.entries[i] as FileEntry;
		const prefix = i === FileManager.selectedIndex[0] ? '> ' : '  ';
		const suffix = entry.isDirectory ? DIR_ICON : '';
		lines.push(`${prefix}${entry.name}${suffix}`);
	}

	return lines.join('\n');
}

/**
 * Applies style colors to an entity.
 */
function applyStyle(
	world: World,
	eid: Entity,
	fg: string | number | undefined,
	bg: string | number | undefined,
): void {
	if (fg === undefined && bg === undefined) return;
	setStyle(world, eid, {
		fg: fg !== undefined ? parseColor(fg) : undefined,
		bg: bg !== undefined ? parseColor(bg) : undefined,
	});
}

/**
 * Applies border configuration to an entity.
 */
function applyBorder(
	world: World,
	eid: Entity,
	borderConfig:
		| {
				type?: string | undefined;
				fg?: string | number | undefined;
				bg?: string | number | undefined;
				ch?: string | object | undefined;
		  }
		| undefined,
): void {
	if (borderConfig?.type === 'none') return;
	const borderType = borderConfig?.type === 'bg' ? BorderType.Background : BorderType.Line;
	setBorder(world, eid, {
		type: borderType,
		fg: borderConfig?.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
		bg: borderConfig?.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
	});
	setBorderChars(world, eid, getBorderCharset(borderConfig?.ch));
}

/**
 * Applies padding to an entity from config.
 */
function applyPadding(
	world: World,
	eid: Entity,
	padding:
		| number
		| {
				left?: number | undefined;
				top?: number | undefined;
				right?: number | undefined;
				bottom?: number | undefined;
		  }
		| undefined,
): void {
	if (typeof padding === 'number') {
		setPadding(world, eid, { left: padding, top: padding, right: padding, bottom: padding });
		return;
	}
	if (padding) {
		setPadding(world, eid, {
			left: padding.left ?? 0,
			top: padding.top ?? 0,
			right: padding.right ?? 0,
			bottom: padding.bottom ?? 0,
		});
	}
}

/**
 * Updates the content display for a file manager entity.
 */
function updateDisplay(world: World, eid: Entity, state: FileManagerState): void {
	const content = buildContent(state);
	setContent(world, eid, content, { align: TextAlign.Left, valign: TextVAlign.Top });
	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a FileManager widget with the given configuration.
 *
 * The file manager lists directory contents, supports navigation, and
 * fires callbacks when files are selected or directories are entered.
 *
 * @param world - The ECS world
 * @param config - FileManager configuration
 * @returns The FileManagerWidget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { createFileManager } from 'blecsd';
 *
 * const world = createWorld();
 * const fm = createFileManager(world, {
 *   cwd: '/home/user',
 *   showHidden: false,
 *   width: 50,
 *   height: 25,
 * });
 *
 * fm.onSelect((entry) => {
 *   console.log('Selected:', entry.name);
 * });
 *
 * fm.show();
 * ```
 */
export function createFileManager(world: World, config: FileManagerConfig = {}): FileManagerWidget {
	const validated = FileManagerConfigSchema.parse(config);
	const eid = addEntity(world);

	const width = validated.width ?? DEFAULT_FILE_MANAGER_WIDTH;
	const height = validated.height ?? DEFAULT_FILE_MANAGER_HEIGHT;
	const cwd = validated.cwd ? resolve(validated.cwd) : process.cwd();

	// Mark as file manager
	FileManager.isFileManager[eid] = 1;
	FileManager.selectedIndex[eid] = 0;

	// Build state
	const state: FileManagerState = {
		cwd,
		showHidden: validated.showHidden,
		filePattern: validated.filePattern,
		width,
		height,
		entries: [],
		onSelectCallbacks: [],
		onNavigateCallbacks: [],
		readDirFn: defaultReadDir,
	};
	fileManagerStateMap.set(eid, state);

	// Load initial entries
	state.entries = loadEntries(state);

	// Set position and dimensions
	setPosition(world, eid, validated.left ?? 0, validated.top ?? 0);
	setDimensions(world, eid, width, height);

	// Apply visual properties
	applyStyle(world, eid, validated.fg, validated.bg);
	applyBorder(world, eid, validated.border);
	applyPadding(world, eid, validated.padding);

	// Set initial content
	updateDisplay(world, eid, state);

	// Default to visible
	setVisible(world, eid, true);

	return createFileManagerWidgetInterface(world, eid);
}

/**
 * Creates the FileManagerWidget interface for an entity.
 */
function createFileManagerWidgetInterface(world: World, eid: Entity): FileManagerWidget {
	const widget: FileManagerWidget = {
		eid,

		show(): FileManagerWidget {
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide(): FileManagerWidget {
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): FileManagerWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(newX: number, newY: number): FileManagerWidget {
			setPosition(world, eid, newX, newY);
			markDirty(world, eid);
			return widget;
		},

		center(termWidth: number, termHeight: number): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (!state) return widget;
			const cx = Math.max(0, Math.floor((termWidth - state.width) / 2));
			const cy = Math.max(0, Math.floor((termHeight - state.height) / 2));
			setPosition(world, eid, cx, cy);
			markDirty(world, eid);
			return widget;
		},

		setCwd(path: string): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (!state) return widget;
			state.cwd = resolve(path);
			state.entries = loadEntries(state);
			FileManager.selectedIndex[eid] = 0;
			updateDisplay(world, eid, state);
			return widget;
		},

		getCwd(): string {
			return fileManagerStateMap.get(eid)?.cwd ?? '';
		},

		getSelected(): FileEntry | undefined {
			const state = fileManagerStateMap.get(eid);
			if (!state) return undefined;
			const idx = FileManager.selectedIndex[eid] ?? 0;
			return state.entries[idx];
		},

		refresh(): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (!state) return widget;
			state.entries = loadEntries(state);
			const maxIdx = Math.max(0, state.entries.length - 1);
			if ((FileManager.selectedIndex[eid] ?? 0) > maxIdx) {
				FileManager.selectedIndex[eid] = maxIdx;
			}
			updateDisplay(world, eid, state);
			return widget;
		},

		getEntries(): readonly FileEntry[] {
			return fileManagerStateMap.get(eid)?.entries ?? [];
		},

		onSelect(cb: (entry: FileEntry) => void): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (state) {
				state.onSelectCallbacks.push(cb);
			}
			return widget;
		},

		onNavigate(cb: (path: string) => void): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (state) {
				state.onNavigateCallbacks.push(cb);
			}
			return widget;
		},

		destroy(): void {
			FileManager.isFileManager[eid] = 0;
			FileManager.selectedIndex[eid] = 0;
			fileManagerStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// KEY HANDLING
// =============================================================================

/**
 * Handles the 'enter' key: opens a file (fires onSelect) or navigates into a directory.
 */
function handleEnterKey(world: World, eid: Entity, state: FileManagerState): void {
	const idx = FileManager.selectedIndex[eid] ?? 0;
	const entry = state.entries[idx];
	if (!entry) return;

	if (entry.isDirectory) {
		navigateToDir(world, eid, state, entry.path);
	} else {
		for (const cb of state.onSelectCallbacks) {
			cb(entry);
		}
	}
}

/**
 * Navigates to a directory, reloads entries, resets selection, and fires callbacks.
 */
function navigateToDir(world: World, eid: Entity, state: FileManagerState, dirPath: string): void {
	state.cwd = dirPath;
	state.entries = loadEntries(state);
	FileManager.selectedIndex[eid] = 0;
	updateDisplay(world, eid, state);
	for (const cb of state.onNavigateCallbacks) {
		cb(dirPath);
	}
}

/**
 * Handles a key event for a file manager widget.
 *
 * Supported keys:
 * - `up`: Move selection up
 * - `down`: Move selection down
 * - `enter`: Open file (fires onSelect) or navigate into directory (fires onNavigate)
 * - `backspace`: Navigate to parent directory
 *
 * @param world - The ECS world
 * @param eid - The file manager entity ID
 * @param key - The key name
 * @returns true if the key was handled
 *
 * @example
 * ```typescript
 * import { handleFileManagerKey } from 'blecsd';
 *
 * // In an input handler:
 * handleFileManagerKey(world, fmEid, 'enter');
 * ```
 */
export function handleFileManagerKey(world: World, eid: Entity, key: string): boolean {
	if (FileManager.isFileManager[eid] !== 1) return false;
	const state = fileManagerStateMap.get(eid);
	if (!state) return false;

	switch (key) {
		case 'up': {
			const current = FileManager.selectedIndex[eid] ?? 0;
			if (current > 0) {
				FileManager.selectedIndex[eid] = current - 1;
				updateDisplay(world, eid, state);
			}
			return true;
		}

		case 'down': {
			const current = FileManager.selectedIndex[eid] ?? 0;
			if (current < state.entries.length - 1) {
				FileManager.selectedIndex[eid] = current + 1;
				updateDisplay(world, eid, state);
			}
			return true;
		}

		case 'enter':
			handleEnterKey(world, eid, state);
			return true;

		case 'backspace': {
			const parentDir = dirname(state.cwd);
			if (parentDir !== state.cwd) {
				navigateToDir(world, eid, state, parentDir);
			}
			return true;
		}

		default:
			return false;
	}
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a file manager widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a file manager widget
 *
 * @example
 * ```typescript
 * import { isFileManager } from 'blecsd';
 *
 * if (isFileManager(world, entity)) {
 *   // Handle file manager logic
 * }
 * ```
 */
export function isFileManager(_world: World, eid: Entity): boolean {
	return FileManager.isFileManager[eid] === 1;
}

/**
 * Resets the FileManager component store and state. Useful for testing.
 *
 * @internal
 */
export function resetFileManagerStore(): void {
	FileManager.isFileManager.fill(0);
	FileManager.selectedIndex.fill(0);
	fileManagerStateMap.clear();
}

// =============================================================================
// TESTING HELPERS
// =============================================================================

/**
 * Sets a custom readDir function for a file manager entity.
 * Primarily used for testing to mock filesystem operations.
 *
 * @param eid - The file manager entity ID
 * @param fn - The custom readDir function
 *
 * @example
 * ```typescript
 * import { setReadDirFn } from 'blecsd';
 *
 * setReadDirFn(eid, (dir) => [
 *   { name: 'file.ts', path: dir + '/file.ts', isDirectory: false, size: 100 },
 * ]);
 * ```
 */
export function setReadDirFn(eid: Entity, fn: (dirPath: string) => FileEntry[]): void {
	const state = fileManagerStateMap.get(eid);
	if (state) {
		state.readDirFn = fn;
	}
}
