/**
 * Navigation system for directory traversal.
 * @module systems/navigationSystem
 */

import type { Entity, World } from 'blecsd';
import type { FileStore } from '../data';
import type { FileManagerConfig } from '../config';
import { getCurrentIndex, setSelection, clearItemSelection } from '../components';
import { setTotalItems, scrollToTop } from '../components';
import { isDirectory } from '../data';

/**
 * Navigation action types.
 */
export type NavigationAction =
	| { type: 'enter' }
	| { type: 'back' }
	| { type: 'goto'; path: string }
	| { type: 'home' }
	| { type: 'refresh' };

/**
 * Navigation result.
 */
export interface NavigationResult {
	/** Whether navigation succeeded */
	success: boolean;
	/** New path after navigation */
	path: string;
	/** Error message if failed */
	error?: string;
	/** Whether a file was opened (vs directory navigation) */
	fileOpened?: boolean;
	/** Path of opened file */
	openedFilePath?: string;
}

/**
 * Processes a navigation action.
 *
 * @param world - ECS world
 * @param listEid - List entity
 * @param action - Navigation action
 * @param fileStore - FileStore instance
 * @param config - File manager configuration
 * @returns Navigation result
 */
export async function processNavigationAction(
	world: World,
	listEid: Entity,
	action: NavigationAction,
	fileStore: FileStore,
	config: FileManagerConfig,
): Promise<NavigationResult> {
	switch (action.type) {
		case 'enter':
			return handleEnter(world, listEid, fileStore, config);

		case 'back':
			return handleBack(world, listEid, fileStore, config);

		case 'goto':
			return handleGoto(world, listEid, action.path, fileStore, config);

		case 'home':
			return handleHome(world, listEid, fileStore, config);

		case 'refresh':
			return handleRefresh(world, listEid, fileStore, config);
	}
}

/**
 * Handles Enter key: open directory or file.
 */
async function handleEnter(
	world: World,
	listEid: Entity,
	fileStore: FileStore,
	config: FileManagerConfig,
): Promise<NavigationResult> {
	const currentIndex = getCurrentIndex(world, listEid);

	if (currentIndex < 0) {
		return {
			success: false,
			path: fileStore.currentPath,
			error: 'No item selected',
		};
	}

	const entry = fileStore.getEntryAt(currentIndex);
	if (!entry) {
		return {
			success: false,
			path: fileStore.currentPath,
			error: 'Entry not found',
		};
	}

	if (isDirectory(entry)) {
		// Navigate into directory
		const success = await fileStore.loadDirectory(entry.path, config);
		if (success) {
			resetListState(world, listEid, fileStore);
		}
		return {
			success,
			path: fileStore.currentPath,
			error: success ? undefined : fileStore.error,
		};
	}

	// File selected - signal to open
	return {
		success: true,
		path: fileStore.currentPath,
		fileOpened: true,
		openedFilePath: entry.path,
	};
}

/**
 * Handles Backspace: go up one directory.
 */
async function handleBack(
	world: World,
	listEid: Entity,
	fileStore: FileStore,
	config: FileManagerConfig,
): Promise<NavigationResult> {
	const previousDir = getBasename(fileStore.currentPath);
	const success = await fileStore.goUp(config);

	if (success) {
		resetListState(world, listEid, fileStore);

		// Try to select the directory we came from
		const prevDirIndex = fileStore.findIndexByName(previousDir);
		if (prevDirIndex >= 0) {
			setSelection(world, listEid, prevDirIndex);
		}
	}

	return {
		success,
		path: fileStore.currentPath,
		error: success ? undefined : fileStore.error,
	};
}

/**
 * Handles goto: navigate to specific path.
 */
async function handleGoto(
	world: World,
	listEid: Entity,
	path: string,
	fileStore: FileStore,
	config: FileManagerConfig,
): Promise<NavigationResult> {
	const success = await fileStore.loadDirectory(path, config);

	if (success) {
		resetListState(world, listEid, fileStore);
	}

	return {
		success,
		path: fileStore.currentPath,
		error: success ? undefined : fileStore.error,
	};
}

/**
 * Handles home: navigate to home directory.
 */
async function handleHome(
	world: World,
	listEid: Entity,
	fileStore: FileStore,
	config: FileManagerConfig,
): Promise<NavigationResult> {
	const homePath = process.env.HOME ?? '/';
	return handleGoto(world, listEid, homePath, fileStore, config);
}

/**
 * Handles refresh: reload current directory.
 */
async function handleRefresh(
	world: World,
	listEid: Entity,
	fileStore: FileStore,
	config: FileManagerConfig,
): Promise<NavigationResult> {
	const currentPath = fileStore.currentPath;
	const currentIndex = getCurrentIndex(world, listEid);
	const currentEntry = fileStore.getEntryAt(currentIndex);
	const currentName = currentEntry?.name;

	const success = await fileStore.loadDirectory(currentPath, config);

	if (success) {
		setTotalItems(world, listEid, fileStore.count);

		// Try to maintain selection on same file
		if (currentName) {
			const newIndex = fileStore.findIndexByName(currentName);
			if (newIndex >= 0) {
				setSelection(world, listEid, newIndex);
			}
		}
	}

	return {
		success,
		path: fileStore.currentPath,
		error: success ? undefined : fileStore.error,
	};
}

/**
 * Resets list state after navigation.
 */
function resetListState(world: World, listEid: Entity, fileStore: FileStore): void {
	setTotalItems(world, listEid, fileStore.count);
	setSelection(world, listEid, 0);
	clearItemSelection(world, listEid);
	scrollToTop(world, listEid);
}

/**
 * Gets the basename of a path.
 */
function getBasename(path: string): string {
	const parts = path.split('/');
	return parts[parts.length - 1] ?? '';
}
