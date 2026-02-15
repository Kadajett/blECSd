/**
 * State management for FileManager widget
 *
 * @module widgets/fileManager/state
 */

import type { Entity } from '../../core/types';
import { DEFAULT_CAPACITY } from './config';
import type { FileEntry, FileManagerState } from './types';

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
// STATE STORE
// =============================================================================

/**
 * Store for complex file manager state.
 */
export const fileManagerStateMap = new Map<Entity, FileManagerState>();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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
 *   { name: 'file.ts', path: dir + '/file.ts', isDirectory: false, size: 100, mtime: 0 },
 * ]);
 * ```
 */
export function setReadDirFn(eid: Entity, fn: (dirPath: string) => FileEntry[]): void {
	const state = fileManagerStateMap.get(eid);
	if (state) {
		state.readDirFn = fn;
	}
}
