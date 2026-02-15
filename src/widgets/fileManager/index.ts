/**
 * FileManager Widget
 *
 * A file browser widget for navigating directories and selecting files.
 * Supports directory navigation, sorted entries (directories first),
 * hidden file toggle, and glob-based file filtering.
 *
 * @module widgets/fileManager
 */

// Re-export config schema
export { FileManagerConfigSchema } from './config';
// Re-export factory functions
export { createFileManager, handleFileManagerKey, isFileManager } from './factory';

// Re-export state
export { FileManager, fileManagerStateMap, resetFileManagerStore, setReadDirFn } from './state';
// Re-export types
export type {
	FileEntry,
	FileManagerBorderConfig,
	FileManagerConfig,
	FileManagerPaddingConfig,
	FileManagerSortBy,
	FileManagerWidget,
} from './types';
