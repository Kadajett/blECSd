/**
 * FileRow component for binding row entities to data indices.
 * @module components/fileRow
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from 'blecsd';

/** Default entity capacity */
const DEFAULT_CAPACITY = 10000;

/**
 * FileRow component for mapping row entities to data indices.
 *
 * - `dataIndex`: Index into FileStore (-1 = empty/unused row)
 * - `dirty`: Whether row needs redraw (0=clean, 1=dirty)
 */
export const FileRow = {
	/** Index into FileStore data (-1 = empty) */
	dataIndex: new Int32Array(DEFAULT_CAPACITY),
	/** Whether row needs redraw */
	dirty: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * FileRow data returned by getFileRow.
 */
export interface FileRowData {
	readonly dataIndex: number;
	readonly dirty: boolean;
}

/**
 * Initializes a FileRow component with default values.
 */
function initFileRow(eid: Entity): void {
	FileRow.dataIndex[eid] = -1;
	FileRow.dirty[eid] = 1; // Start dirty
}

/**
 * Ensures an entity has the FileRow component.
 */
function ensureFileRow(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, FileRow)) {
		addComponent(world, eid, FileRow);
		initFileRow(eid);
	}
}

/**
 * Sets up the FileRow component on an entity.
 */
export function setFileRow(world: World, eid: Entity, dataIndex = -1): Entity {
	ensureFileRow(world, eid);
	FileRow.dataIndex[eid] = dataIndex;
	FileRow.dirty[eid] = 1;
	return eid;
}

/**
 * Gets the FileRow data for an entity.
 */
export function getFileRow(world: World, eid: Entity): FileRowData | undefined {
	if (!hasComponent(world, eid, FileRow)) {
		return undefined;
	}
	return {
		dataIndex: FileRow.dataIndex[eid] as number,
		dirty: FileRow.dirty[eid] === 1,
	};
}

/**
 * Gets the data index for a row.
 */
export function getDataIndex(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, FileRow)) {
		return -1;
	}
	return FileRow.dataIndex[eid] as number;
}

/**
 * Sets the data index for a row.
 * Marks the row dirty if the index changed.
 */
export function setDataIndex(world: World, eid: Entity, index: number): Entity {
	ensureFileRow(world, eid);

	const oldIndex = FileRow.dataIndex[eid] as number;
	if (oldIndex !== index) {
		FileRow.dataIndex[eid] = index;
		FileRow.dirty[eid] = 1;
	}

	return eid;
}

/**
 * Marks a row as dirty (needs redraw).
 */
export function markRowDirty(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, FileRow)) {
		FileRow.dirty[eid] = 1;
	}
	return eid;
}

/**
 * Marks a row as clean (just rendered).
 */
export function markRowClean(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, FileRow)) {
		FileRow.dirty[eid] = 0;
	}
	return eid;
}

/**
 * Checks if a row is dirty.
 */
export function isRowDirty(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, FileRow)) {
		return false;
	}
	return FileRow.dirty[eid] === 1;
}

/**
 * Checks if a row is empty (no data bound).
 */
export function isRowEmpty(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, FileRow)) {
		return true;
	}
	return (FileRow.dataIndex[eid] as number) === -1;
}

/**
 * Clears a row (unbinds data).
 */
export function clearRow(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, FileRow)) {
		const oldIndex = FileRow.dataIndex[eid] as number;
		if (oldIndex !== -1) {
			FileRow.dataIndex[eid] = -1;
			FileRow.dirty[eid] = 1;
		}
	}
	return eid;
}

/**
 * Checks if entity has FileRow component.
 */
export function hasFileRow(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, FileRow);
}
