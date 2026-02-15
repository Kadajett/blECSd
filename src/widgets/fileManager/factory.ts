/**
 * Factory functions and key handling for FileManager widget
 *
 * @module widgets/fileManager/factory
 */

import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setDimensions } from '../../components/dimensions';
import { moveBy, setPosition } from '../../components/position';
import { markDirty, setVisible } from '../../components/renderable';
import { addEntity, removeEntity } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import {
	DEFAULT_FILE_MANAGER_HEIGHT,
	DEFAULT_FILE_MANAGER_WIDTH,
	FileManagerConfigSchema,
} from './config';
import { applyBorder, applyPadding, applyStyle, updateDisplay } from './render';
import { FileManager, fileManagerStateMap } from './state';
import type {
	FileEntry,
	FileManagerConfig,
	FileManagerSortBy,
	FileManagerState,
	FileManagerWidget,
} from './types';

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Matches a filename against a simple glob pattern.
 * Supports only '*' wildcards (e.g., '*.ts', 'README.*', '*test*').
 * @internal
 */
function matchGlob(filename: string, pattern: string): boolean {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
	const regex = escaped.replace(/\*/g, '.*');
	return new RegExp(`^${regex}$`, 'i').test(filename);
}

/**
 * Reads directory entries, handling permission errors gracefully.
 * @internal
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
					mtime: stat.mtimeMs,
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
 * Sorts entries: directories first, then files by specified sort method.
 * @internal
 */
function sortEntries(entries: readonly FileEntry[], sortBy: FileManagerSortBy): FileEntry[] {
	return [...entries].sort((a, b) => {
		// Always sort directories first
		if (a.isDirectory !== b.isDirectory) {
			return a.isDirectory ? -1 : 1;
		}

		// Then sort by specified method
		switch (sortBy) {
			case 'size':
				if (a.size !== b.size) return b.size - a.size; // Largest first
				return a.name.localeCompare(b.name); // Fall back to name

			case 'date':
				if (a.mtime !== b.mtime) return b.mtime - a.mtime; // Newest first
				return a.name.localeCompare(b.name); // Fall back to name

			default:
				return a.name.localeCompare(b.name);
		}
	});
}

/**
 * Filters entries based on showHidden and filePattern settings.
 * @internal
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
 * @internal
 */
function loadEntries(state: FileManagerState): FileEntry[] {
	let raw: FileEntry[];
	try {
		raw = state.readDirFn(state.cwd);
	} catch {
		return [];
	}
	const filtered = filterEntries(raw, state.showHidden, state.filePattern);
	return sortEntries(filtered, state.sortBy);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a FileManager widget with the given configuration.
 *
 * The file manager lists directory contents with icons, supports navigation,
 * sorting (by name, size, or date), hidden file toggling, and fires callbacks
 * for file operations (select, navigate, delete, rename).
 *
 * @param world - The ECS world
 * @param config - FileManager configuration
 * @returns The FileManagerWidget instance
 *
 * @example
 * ```typescript
 * import { createWorld, createFileManager, handleFileManagerKey } from 'blecsd';
 *
 * const world = createWorld();
 * const fm = createFileManager(world, {
 *   cwd: '/home/user',
 *   showHidden: false,
 *   sortBy: 'name',
 *   showIcons: true,
 *   width: 50,
 *   height: 25,
 * });
 *
 * // Register callbacks
 * fm.onSelect((entry) => {
 *   console.log('Selected file:', entry.name);
 * });
 *
 * fm.onNavigate((path) => {
 *   console.log('Navigated to:', path);
 * });
 *
 * fm.onDelete((entry) => {
 *   console.log('Delete requested for:', entry.name);
 * });
 *
 * // Sort entries
 * fm.setSortBy('size');  // Sort by file size
 * fm.setSortBy('date');  // Sort by modification date
 *
 * // Toggle hidden files
 * fm.toggleHidden();
 *
 * // Handle keyboard input
 * handleFileManagerKey(world, fm.eid, 'enter');  // Open/navigate
 * handleFileManagerKey(world, fm.eid, 'h');      // Toggle hidden
 * handleFileManagerKey(world, fm.eid, 's');      // Sort by size
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
		showIcons: validated.showIcons,
		filePattern: validated.filePattern,
		sortBy: validated.sortBy,
		width,
		height,
		entries: [],
		onSelectCallbacks: [],
		onNavigateCallbacks: [],
		onDeleteCallbacks: [],
		onRenameCallbacks: [],
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
 * @internal
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

		setSortBy(sortBy: FileManagerSortBy): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (!state) return widget;
			state.sortBy = sortBy;
			state.entries = loadEntries(state);
			updateDisplay(world, eid, state);
			return widget;
		},

		getSortBy(): FileManagerSortBy {
			return fileManagerStateMap.get(eid)?.sortBy ?? 'name';
		},

		toggleHidden(): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (!state) return widget;
			state.showHidden = !state.showHidden;
			state.entries = loadEntries(state);
			FileManager.selectedIndex[eid] = 0;
			updateDisplay(world, eid, state);
			return widget;
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

		onDelete(cb: (entry: FileEntry) => void): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (state) {
				state.onDeleteCallbacks.push(cb);
			}
			return widget;
		},

		onRename(cb: (oldEntry: FileEntry, newName: string) => void): FileManagerWidget {
			const state = fileManagerStateMap.get(eid);
			if (state) {
				state.onRenameCallbacks.push(cb);
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
 * @internal
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
 * @internal
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
 * Handles up arrow key navigation.
 * @internal
 */
function handleUpKey(world: World, eid: Entity, state: FileManagerState): void {
	const current = FileManager.selectedIndex[eid] ?? 0;
	if (current > 0) {
		FileManager.selectedIndex[eid] = current - 1;
		updateDisplay(world, eid, state);
	}
}

/**
 * Handles down arrow key navigation.
 * @internal
 */
function handleDownKey(world: World, eid: Entity, state: FileManagerState): void {
	const current = FileManager.selectedIndex[eid] ?? 0;
	if (current < state.entries.length - 1) {
		FileManager.selectedIndex[eid] = current + 1;
		updateDisplay(world, eid, state);
	}
}

/**
 * Handles backspace key for navigating to parent directory.
 * @internal
 */
function handleBackspaceKey(world: World, eid: Entity, state: FileManagerState): void {
	const parentDir = dirname(state.cwd);
	if (parentDir !== state.cwd) {
		navigateToDir(world, eid, state, parentDir);
	}
}

/**
 * Handles toggling hidden files visibility.
 * @internal
 */
function handleToggleHidden(world: World, eid: Entity, state: FileManagerState): void {
	state.showHidden = !state.showHidden;
	state.entries = loadEntries(state);
	FileManager.selectedIndex[eid] = 0;
	updateDisplay(world, eid, state);
}

/**
 * Handles delete action on selected entry.
 * @internal
 */
function handleDeleteKey(eid: Entity, state: FileManagerState): void {
	const idx = FileManager.selectedIndex[eid] ?? 0;
	const entry = state.entries[idx];
	if (entry) {
		for (const cb of state.onDeleteCallbacks) {
			cb(entry);
		}
	}
}

/**
 * Handles rename action on selected entry.
 * @internal
 */
function handleRenameKey(eid: Entity, state: FileManagerState): void {
	const idx = FileManager.selectedIndex[eid] ?? 0;
	const entry = state.entries[idx];
	if (entry) {
		for (const cb of state.onRenameCallbacks) {
			cb(entry, entry.name);
		}
	}
}

/**
 * Handles changing sort order.
 * @internal
 */
function handleSortKey(
	world: World,
	eid: Entity,
	state: FileManagerState,
	sortBy: 'name' | 'size' | 'date',
): void {
	state.sortBy = sortBy;
	state.entries = loadEntries(state);
	updateDisplay(world, eid, state);
}

/**
 * Handles a key event for a file manager widget.
 *
 * Supported keys:
 * - `up`: Move selection up
 * - `down`: Move selection down
 * - `enter`: Open file (fires onSelect) or navigate into directory (fires onNavigate)
 * - `backspace`: Navigate to parent directory
 * - `h`: Toggle hidden files visibility
 * - `d`: Delete selected file/directory (fires onDelete callback)
 * - `r`: Rename selected file/directory (fires onRename callback)
 * - `n`: Sort by name
 * - `s`: Sort by size
 * - `t`: Sort by date/time
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
		case 'up':
			handleUpKey(world, eid, state);
			return true;

		case 'down':
			handleDownKey(world, eid, state);
			return true;

		case 'enter':
			handleEnterKey(world, eid, state);
			return true;

		case 'backspace':
			handleBackspaceKey(world, eid, state);
			return true;

		case 'h':
			handleToggleHidden(world, eid, state);
			return true;

		case 'd':
			handleDeleteKey(eid, state);
			return true;

		case 'r':
			handleRenameKey(eid, state);
			return true;

		case 'n':
			handleSortKey(world, eid, state, 'name');
			return true;

		case 's':
			handleSortKey(world, eid, state, 'size');
			return true;

		case 't':
			handleSortKey(world, eid, state, 'date');
			return true;

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
