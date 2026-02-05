/**
 * Preview component for the preview pane state.
 * @module components/preview
 */

import { addComponent, hasComponent } from 'blecsd';
import type { Entity, World } from 'blecsd';
import type { PreviewContent } from '../data';

/** Default entity capacity */
const DEFAULT_CAPACITY = 10000;

/**
 * Preview component for tracking preview pane state.
 *
 * - `selectedIndex`: Index of currently previewed item
 * - `scrollOffset`: Scroll position within preview content
 * - `isLoading`: Whether preview is loading
 * - `contentHash`: Hash of current content for change detection
 */
export const Preview = {
	/** Index of currently previewed item */
	selectedIndex: new Int32Array(DEFAULT_CAPACITY),
	/** Scroll position in preview content */
	scrollOffset: new Uint16Array(DEFAULT_CAPACITY),
	/** Loading state (0=ready, 1=loading) */
	isLoading: new Uint8Array(DEFAULT_CAPACITY),
	/** Content hash for change detection */
	contentHash: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Preview content store.
 * Since bitecs uses typed arrays, complex objects are stored separately.
 */
class PreviewContentStore {
	private content: Map<number, PreviewContent> = new Map();

	set(eid: Entity, content: PreviewContent): void {
		this.content.set(eid, content);
	}

	get(eid: Entity): PreviewContent | undefined {
		return this.content.get(eid);
	}

	delete(eid: Entity): void {
		this.content.delete(eid);
	}

	clear(): void {
		this.content.clear();
	}
}

/**
 * Global preview content store.
 */
export const previewContentStore = new PreviewContentStore();

/**
 * Preview data returned by getPreview.
 */
export interface PreviewData {
	readonly selectedIndex: number;
	readonly scrollOffset: number;
	readonly isLoading: boolean;
	readonly contentHash: number;
}

/**
 * Initializes a Preview component with default values.
 */
function initPreview(eid: Entity): void {
	Preview.selectedIndex[eid] = -1;
	Preview.scrollOffset[eid] = 0;
	Preview.isLoading[eid] = 0;
	Preview.contentHash[eid] = 0;
}

/**
 * Ensures an entity has the Preview component.
 */
function ensurePreview(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Preview)) {
		addComponent(world, eid, Preview);
		initPreview(eid);
	}
}

/**
 * Sets up the Preview component on an entity.
 */
export function setPreview(world: World, eid: Entity): Entity {
	ensurePreview(world, eid);
	return eid;
}

/**
 * Gets the Preview data for an entity.
 */
export function getPreview(world: World, eid: Entity): PreviewData | undefined {
	if (!hasComponent(world, eid, Preview)) {
		return undefined;
	}
	return {
		selectedIndex: Preview.selectedIndex[eid] as number,
		scrollOffset: Preview.scrollOffset[eid] as number,
		isLoading: Preview.isLoading[eid] === 1,
		contentHash: Preview.contentHash[eid] as number,
	};
}

/**
 * Updates the selected index for preview.
 */
export function setPreviewIndex(world: World, eid: Entity, index: number): Entity {
	ensurePreview(world, eid);
	Preview.selectedIndex[eid] = index;
	Preview.scrollOffset[eid] = 0; // Reset scroll when selection changes
	return eid;
}

/**
 * Sets preview content.
 */
export function setPreviewContent(world: World, eid: Entity, content: PreviewContent): Entity {
	ensurePreview(world, eid);
	previewContentStore.set(eid, content);
	Preview.contentHash[eid] = hashPreviewContent(content);
	Preview.isLoading[eid] = 0;
	return eid;
}

/**
 * Gets preview content.
 */
export function getPreviewContent(world: World, eid: Entity): PreviewContent | undefined {
	if (!hasComponent(world, eid, Preview)) {
		return undefined;
	}
	return previewContentStore.get(eid);
}

/**
 * Sets loading state.
 */
export function setPreviewLoading(world: World, eid: Entity, loading: boolean): Entity {
	ensurePreview(world, eid);
	Preview.isLoading[eid] = loading ? 1 : 0;
	return eid;
}

/**
 * Checks if preview is loading.
 */
export function isPreviewLoading(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Preview)) {
		return false;
	}
	return Preview.isLoading[eid] === 1;
}

/**
 * Scrolls preview content.
 * @param maxOffset - Maximum scroll offset (content length - visible height). If not provided, no upper bound is enforced.
 */
export function scrollPreview(world: World, eid: Entity, delta: number, maxOffset?: number): Entity {
	ensurePreview(world, eid);
	const current = Preview.scrollOffset[eid] as number;
	let newOffset = current + delta;

	// Clamp to valid range
	newOffset = Math.max(0, newOffset);
	if (maxOffset !== undefined && maxOffset > 0) {
		newOffset = Math.min(maxOffset, newOffset);
	}

	Preview.scrollOffset[eid] = newOffset;
	return eid;
}

/**
 * Gets preview scroll offset.
 */
export function getPreviewScroll(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Preview)) {
		return 0;
	}
	return Preview.scrollOffset[eid] as number;
}

/**
 * Resets preview scroll to top.
 */
export function resetPreviewScroll(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Preview)) {
		Preview.scrollOffset[eid] = 0;
	}
	return eid;
}

/**
 * Checks if entity has Preview component.
 */
export function hasPreview(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Preview);
}

/**
 * Clears preview content.
 */
export function clearPreview(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Preview)) {
		previewContentStore.delete(eid);
		Preview.contentHash[eid] = 0;
		Preview.scrollOffset[eid] = 0;
	}
	return eid;
}

/**
 * Simple hash function for preview content change detection.
 */
function hashPreviewContent(content: PreviewContent): number {
	let hash = 5381;
	const str = content.name + content.metadata.join('') + content.content.length.toString();
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
	}
	return hash >>> 0;
}
