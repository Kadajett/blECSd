/**
 * Preview system for updating preview pane content.
 * @module systems/previewSystem
 */

import type { Entity, World } from 'blecsd';
import type { FileStore } from '../data';
import type { SizeFormat } from '../config';
import {
	getCurrentIndex,
	getPreview,
	getPreviewContent,
	setPreviewIndex,
	setPreviewContent,
	setPreviewLoading,
	scrollPreview,
	resetPreviewScroll,
} from '../components';
import { loadPreview, createQuickPreview, EMPTY_PREVIEW } from '../data';

/**
 * Preview update state.
 */
export interface PreviewState {
	/** Currently loading index */
	loadingIndex: number;
	/** Debounce timer */
	debounceTimer: ReturnType<typeof setTimeout> | null;
	/** Last update timestamp */
	lastUpdate: number;
}

/**
 * Creates initial preview state.
 */
export function createPreviewState(): PreviewState {
	return {
		loadingIndex: -1,
		debounceTimer: null,
		lastUpdate: 0,
	};
}

/**
 * Updates the preview pane based on current selection.
 * Uses debouncing to avoid loading preview for every key press.
 */
export function updatePreview(
	world: World,
	listEid: Entity,
	previewEid: Entity,
	fileStore: FileStore,
	sizeFormat: SizeFormat,
	state: PreviewState,
	debounceMs = 100,
): void {
	const currentIndex = getCurrentIndex(world, listEid);
	const preview = getPreview(world, previewEid);

	// No change needed
	if (preview && preview.selectedIndex === currentIndex && !preview.isLoading) {
		return;
	}

	// Update the selected index immediately
	setPreviewIndex(world, previewEid, currentIndex);

	// No selection
	if (currentIndex < 0) {
		setPreviewContent(world, previewEid, EMPTY_PREVIEW);
		return;
	}

	const entry = fileStore.getEntryAt(currentIndex);
	if (!entry) {
		setPreviewContent(world, previewEid, EMPTY_PREVIEW);
		return;
	}

	// Set quick preview immediately
	const quickPreview = createQuickPreview(entry, sizeFormat);
	setPreviewContent(world, previewEid, quickPreview);
	setPreviewLoading(world, previewEid, true);
	resetPreviewScroll(world, previewEid);

	// Cancel previous debounce
	if (state.debounceTimer) {
		clearTimeout(state.debounceTimer);
	}

	// Debounce full preview load
	state.loadingIndex = currentIndex;
	state.debounceTimer = setTimeout(async () => {
		// Check if selection changed during debounce
		const stillSelected = getCurrentIndex(world, listEid) === currentIndex;
		if (!stillSelected) {
			return;
		}

		try {
			const fullPreview = await loadPreview(entry, sizeFormat);

			// Check again after async load
			const stillSelectedAfterLoad = getCurrentIndex(world, listEid) === currentIndex;
			if (stillSelectedAfterLoad) {
				setPreviewContent(world, previewEid, fullPreview);
			}
		} catch {
			// Keep quick preview on error
		} finally {
			if (state.loadingIndex === currentIndex) {
				setPreviewLoading(world, previewEid, false);
			}
		}
	}, debounceMs);
}

/**
 * Scrolls preview content up.
 */
export function scrollPreviewUp(world: World, previewEid: Entity, lines = 1, visibleHeight = 20): void {
	const content = getPreviewContent(world, previewEid);
	const contentLength = content?.content.length ?? 0;
	const maxOffset = Math.max(0, contentLength - visibleHeight);
	scrollPreview(world, previewEid, -lines, maxOffset);
}

/**
 * Scrolls preview content down.
 */
export function scrollPreviewDown(world: World, previewEid: Entity, lines = 1, visibleHeight = 20): void {
	const content = getPreviewContent(world, previewEid);
	const contentLength = content?.content.length ?? 0;
	const maxOffset = Math.max(0, contentLength - visibleHeight);
	scrollPreview(world, previewEid, lines, maxOffset);
}

/**
 * Cleans up preview state.
 */
export function cleanupPreviewState(state: PreviewState): void {
	if (state.debounceTimer) {
		clearTimeout(state.debounceTimer);
		state.debounceTimer = null;
	}
}
