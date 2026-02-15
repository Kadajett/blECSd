/**
 * TypeScript interfaces for FileManager widget
 *
 * @module widgets/fileManager/types
 */

import type { BorderCharset } from '../../components/border';
import type { Entity } from '../../core/types';

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
	/** Last modified time (milliseconds since epoch) */
	readonly mtime: number;
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
 * Sort method for file entries.
 */
export type FileManagerSortBy = 'name' | 'size' | 'date';

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
	/** Sort entries by name, size, or date (default: 'name') */
	readonly sortBy?: FileManagerSortBy;
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
	/** Whether to show file icons (default: true) */
	readonly showIcons?: boolean;
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

	// Sorting and filtering
	/** Sets the sort method (name, size, or date) */
	setSortBy(sortBy: FileManagerSortBy): FileManagerWidget;
	/** Gets the current sort method */
	getSortBy(): FileManagerSortBy;
	/** Toggles hidden file visibility */
	toggleHidden(): FileManagerWidget;

	// Callbacks
	/** Registers a callback for when a file is selected (Enter on a file) */
	onSelect(cb: (entry: FileEntry) => void): FileManagerWidget;
	/** Registers a callback for when navigating to a directory */
	onNavigate(cb: (path: string) => void): FileManagerWidget;
	/** Registers a callback for when a file/directory is deleted */
	onDelete(cb: (entry: FileEntry) => void): FileManagerWidget;
	/** Registers a callback for when a file/directory is renamed */
	onRename(cb: (oldEntry: FileEntry, newName: string) => void): FileManagerWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

/**
 * Complex state for file manager entities.
 * @internal
 */
export interface FileManagerState {
	cwd: string;
	showHidden: boolean;
	showIcons: boolean;
	filePattern: string | undefined;
	sortBy: FileManagerSortBy;
	width: number;
	height: number;
	entries: FileEntry[];
	onSelectCallbacks: Array<(entry: FileEntry) => void>;
	onNavigateCallbacks: Array<(path: string) => void>;
	onDeleteCallbacks: Array<(entry: FileEntry) => void>;
	onRenameCallbacks: Array<(oldEntry: FileEntry, newName: string) => void>;
	/** Injected readDir function (for testing) */
	readDirFn: (dirPath: string) => FileEntry[];
}
