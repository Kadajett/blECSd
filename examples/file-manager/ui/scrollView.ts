/**
 * Scroll view utilities for independent, non-interfering scroll panes.
 * Provides clean separation of scroll state, hit testing, and rendering.
 * @module ui/scrollView
 */

import type { CellBuffer } from 'blecsd';

/**
 * Represents a rectangular region for hit testing.
 */
export interface Region {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Scroll state for a single pane.
 */
export interface ScrollState {
	/** Current scroll offset (first visible item/line) */
	scrollOffset: number;
	/** Total number of items/lines */
	totalItems: number;
	/** Number of visible items/lines */
	visibleItems: number;
}

/**
 * Creates initial scroll state.
 */
export function createScrollState(totalItems = 0, visibleItems = 0): ScrollState {
	return {
		scrollOffset: 0,
		totalItems,
		visibleItems,
	};
}

/**
 * Updates total items and adjusts scroll offset if needed.
 */
export function setTotalItems(state: ScrollState, totalItems: number): void {
	state.totalItems = totalItems;
	// Clamp scroll offset to valid range
	const maxOffset = Math.max(0, totalItems - state.visibleItems);
	state.scrollOffset = Math.min(state.scrollOffset, maxOffset);
}

/**
 * Updates visible items count and adjusts scroll offset if needed.
 */
export function setVisibleItems(state: ScrollState, visibleItems: number): void {
	state.visibleItems = visibleItems;
	const maxOffset = Math.max(0, state.totalItems - visibleItems);
	state.scrollOffset = Math.min(state.scrollOffset, maxOffset);
}

/**
 * Scrolls by a delta, clamping to valid range.
 * @returns The actual delta applied
 */
export function scrollBy(state: ScrollState, delta: number): number {
	const oldOffset = state.scrollOffset;
	const maxOffset = Math.max(0, state.totalItems - state.visibleItems);
	state.scrollOffset = Math.max(0, Math.min(maxOffset, state.scrollOffset + delta));
	return state.scrollOffset - oldOffset;
}

/**
 * Scrolls to a specific offset, clamping to valid range.
 */
export function scrollTo(state: ScrollState, offset: number): void {
	const maxOffset = Math.max(0, state.totalItems - state.visibleItems);
	state.scrollOffset = Math.max(0, Math.min(maxOffset, offset));
}

/**
 * Ensures an item is visible, scrolling if needed.
 */
export function ensureItemVisible(state: ScrollState, index: number): void {
	if (index < state.scrollOffset) {
		scrollTo(state, index);
	} else if (index >= state.scrollOffset + state.visibleItems) {
		scrollTo(state, index - state.visibleItems + 1);
	}
}

/**
 * Gets the scroll percentage (0-100).
 */
export function getScrollPercent(state: ScrollState): number {
	const maxOffset = Math.max(1, state.totalItems - state.visibleItems);
	return Math.floor((state.scrollOffset / maxOffset) * 100);
}

/**
 * Checks if a point is within a region.
 */
export function isPointInRegion(region: Region, x: number, y: number): boolean {
	return (
		x >= region.x &&
		x < region.x + region.width &&
		y >= region.y &&
		y < region.y + region.height
	);
}

/**
 * Creates a region from coordinates.
 */
export function createRegion(x: number, y: number, width: number, height: number): Region {
	return { x, y, width, height };
}

/**
 * Configuration for rendering a scrollbar.
 */
export interface ScrollbarConfig {
	readonly fg: number;
	readonly bg: number;
	readonly thumbFg: number;
	readonly trackChar: string;
	readonly thumbChar: string;
}

/**
 * Default scrollbar configuration.
 */
export const DEFAULT_SCROLLBAR: ScrollbarConfig = {
	fg: 0x606060ff,
	bg: 0x181818ff,
	thumbFg: 0xa0a0a0ff,
	trackChar: '░',
	thumbChar: '█',
};

/**
 * Renders a vertical scrollbar.
 */
export function renderScrollbar(
	buffer: CellBuffer,
	x: number,
	y: number,
	height: number,
	state: ScrollState,
	config: ScrollbarConfig = DEFAULT_SCROLLBAR,
): void {
	const { totalItems, visibleItems, scrollOffset } = state;

	// No scrollbar needed if all content is visible
	if (totalItems <= visibleItems) {
		for (let i = 0; i < height; i++) {
			buffer.setCell(x, y + i, config.trackChar, config.fg, config.bg);
		}
		return;
	}

	// Calculate thumb size and position
	const thumbSize = Math.max(1, Math.floor((visibleItems / totalItems) * height));
	const maxScroll = totalItems - visibleItems;
	const scrollRatio = maxScroll > 0 ? scrollOffset / maxScroll : 0;
	const thumbStart = Math.floor(scrollRatio * (height - thumbSize));

	for (let i = 0; i < height; i++) {
		const isThumb = i >= thumbStart && i < thumbStart + thumbSize;
		buffer.setCell(
			x,
			y + i,
			isThumb ? config.thumbChar : config.trackChar,
			isThumb ? config.thumbFg : config.fg,
			config.bg,
		);
	}
}

/**
 * Expands tabs to spaces in text, returning the expanded text and visual width.
 */
export function expandTabs(text: string, tabWidth = 4): { expanded: string; width: number } {
	let expanded = '';
	let column = 0;

	for (const char of text) {
		if (char === '\t') {
			const spaces = tabWidth - (column % tabWidth);
			expanded += ' '.repeat(spaces);
			column += spaces;
		} else {
			expanded += char;
			column++;
		}
	}

	return { expanded, width: column };
}

/**
 * Renders text with tab expansion.
 */
export function renderTextWithTabs(
	buffer: CellBuffer,
	x: number,
	y: number,
	text: string,
	width: number,
	fg: number,
	bg: number,
	tabWidth = 4,
): number {
	let cursor = 0;

	for (const char of text) {
		if (cursor >= width) break;

		if (char === '\t') {
			const spaces = tabWidth - (cursor % tabWidth);
			for (let j = 0; j < spaces && cursor < width; j++) {
				buffer.setCell(x + cursor, y, ' ', fg, bg);
				cursor++;
			}
		} else {
			buffer.setCell(x + cursor, y, char, fg, bg);
			cursor++;
		}
	}

	return cursor;
}
