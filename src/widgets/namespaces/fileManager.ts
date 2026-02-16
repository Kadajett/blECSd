/**
 * FileManager widget namespace.
 *
 * @example
 * ```typescript
 * import { fileManager } from 'blecsd/widgets';
 * const fm = fileManager.create(world, { currentPath: '/home' });
 * fileManager.handleKey(world, fm.eid, keyEvent);
 * fileManager.setReadDirFn(customReadDir);
 * ```
 */
import {
	createFileManager,
	fileManagerStateMap,
	handleFileManagerKey,
	isFileManager,
	resetFileManagerStore,
	setReadDirFn,
} from '../fileManager';

export const fileManager = Object.freeze({
	create: createFileManager,
	is: isFileManager,
	handleKey: handleFileManagerKey,
	setReadDirFn,
	stateMap: fileManagerStateMap,
	resetStore: resetFileManagerStore,
});

export type FileManagerModule = typeof fileManager;
