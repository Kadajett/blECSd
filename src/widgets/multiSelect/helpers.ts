/**
 * Multi-Select Widget Helpers
 *
 * Internal helper functions for MultiSelect widget logic.
 *
 * @module widgets/multiSelect/helpers
 */

import type { z } from 'zod';
import { CHECKBOX_CHECKED, CHECKBOX_UNCHECKED, MultiSelectConfigSchema } from './config';
import type { MultiSelectState } from './state';
import type { MultiSelectItem, MultiSelectWidget } from './types';

// =============================================================================
// NAVIGATION HELPERS
// =============================================================================

/**
 * Handles vertical navigation with optional shift for range selection.
 */
export function handleVerticalNav(
	widget: MultiSelectWidget,
	state: MultiSelectState,
	direction: 'up' | 'down',
	shift: boolean,
): void {
	if (direction === 'up') {
		if (shift) {
			widget.rangeSelectTo(Math.max(0, state.cursorIndex - 1));
		} else {
			widget.cursorUp();
			state.rangeAnchor = state.cursorIndex;
		}
	} else {
		if (shift) {
			widget.rangeSelectTo(Math.min(state.filteredIndices.length - 1, state.cursorIndex + 1));
		} else {
			widget.cursorDown();
			state.rangeAnchor = state.cursorIndex;
		}
	}
}

/**
 * Handles navigation keys for multi-select.
 */
export function handleMultiSelectNav(
	widget: MultiSelectWidget,
	state: MultiSelectState,
	key: string,
	shift: boolean,
): boolean {
	if (key === 'up' || key === 'k') {
		handleVerticalNav(widget, state, 'up', shift);
		return true;
	}

	if (key === 'down' || key === 'j') {
		handleVerticalNav(widget, state, 'down', shift);
		return true;
	}

	if (key === 'home' || key === 'g') {
		widget.cursorFirst();
		return true;
	}
	if (key === 'end' || key === 'G') {
		widget.cursorLast();
		return true;
	}
	if (key === 'pageup') {
		widget.pageUp();
		return true;
	}
	if (key === 'pagedown') {
		widget.pageDown();
		return true;
	}

	return false;
}

/**
 * Handles filter input keys for multi-select.
 */
export function handleMultiSelectFilter(
	widget: MultiSelectWidget,
	state: MultiSelectState,
	key: string,
	ctrl: boolean,
): boolean {
	if (state.filterable && key.length === 1 && !ctrl) {
		state.filterQuery += key;
		recalculateFilter(state);
		return true;
	}

	if (state.filterable && key === 'backspace') {
		if (state.filterQuery.length > 0) {
			state.filterQuery = state.filterQuery.slice(0, -1);
			recalculateFilter(state);
		}
		return true;
	}

	if (key === 'escape') {
		if (state.filterQuery.length > 0) {
			state.filterQuery = '';
			recalculateFilter(state);
		} else {
			widget.blur();
		}
		return true;
	}

	return false;
}

/**
 * Handles key input for the multi-select widget.
 */
export function handleMultiSelectKey(
	widget: MultiSelectWidget,
	state: MultiSelectState,
	key: string,
	ctrl: boolean,
	shift: boolean,
): boolean {
	if (ctrl && key === 'a') {
		if (state.selected.size === state.items.length) {
			widget.deselectAll();
		} else {
			widget.selectAll();
		}
		return true;
	}

	if (handleMultiSelectNav(widget, state, key, shift)) {
		return true;
	}

	if (key === ' ') {
		widget.toggleCurrent();
		return true;
	}

	return handleMultiSelectFilter(widget, state, key, ctrl);
}

// =============================================================================
// DATA HELPERS
// =============================================================================

/**
 * Normalizes items from string or MultiSelectItem to MultiSelectItem.
 */
export function normalizeItems(items: readonly (string | MultiSelectItem)[]): MultiSelectItem[] {
	return items.map((item) => {
		if (typeof item === 'string') {
			return { text: item, value: item };
		}
		return { ...item, value: item.value ?? item.text };
	});
}

/**
 * Recalculates filtered indices based on current filter query.
 */
export function recalculateFilter(state: MultiSelectState): void {
	if (state.filterQuery.length === 0) {
		state.filteredIndices = state.items.map((_, i) => i);
		return;
	}

	const lowerQuery = state.filterQuery.toLowerCase();
	state.filteredIndices = [];
	for (let i = 0; i < state.items.length; i++) {
		const item = state.items[i];
		if (item?.text.toLowerCase().includes(lowerQuery)) {
			state.filteredIndices.push(i);
		}
	}

	// Clamp cursor
	if (state.filteredIndices.length === 0) {
		state.cursorIndex = -1;
	} else if (state.cursorIndex >= state.filteredIndices.length) {
		state.cursorIndex = state.filteredIndices.length - 1;
	} else if (state.cursorIndex < 0) {
		state.cursorIndex = 0;
	}
	state.firstVisible = 0;
}

/**
 * Fires selection change callbacks.
 */
export function fireSelectionCallbacks(state: MultiSelectState): void {
	const indices = Array.from(state.selected).sort((a, b) => a - b);
	const items = indices
		.map((i) => state.items[i])
		.filter((item): item is MultiSelectItem => item !== undefined);

	for (const cb of state.selectionCallbacks) {
		cb(indices, items);
	}
}

/**
 * Gets the actual item index from the filtered view index.
 */
export function getActualIndex(state: MultiSelectState, filteredIdx: number): number {
	const idx = state.filteredIndices[filteredIdx];
	return idx ?? -1;
}

/**
 * Ensures the cursor is visible in the viewport.
 */
export function ensureCursorVisible(state: MultiSelectState): void {
	if (state.cursorIndex < state.firstVisible) {
		state.firstVisible = state.cursorIndex;
	} else if (state.cursorIndex >= state.firstVisible + state.visibleCount) {
		state.firstVisible = state.cursorIndex - state.visibleCount + 1;
	}
}

/**
 * Initializes the selected indices set, filtering out invalid and disabled items.
 */
export function initializeSelected(
	items: readonly MultiSelectItem[],
	indices: readonly number[],
): Set<number> {
	const selected = new Set<number>();
	for (const idx of indices) {
		if (idx < 0 || idx >= items.length) {
			continue;
		}
		const item = items[idx];
		if (item && !item.disabled) {
			selected.add(idx);
		}
	}
	return selected;
}

/**
 * Creates the initial MultiSelectState from validated config.
 */
export function createMultiSelectState(
	items: MultiSelectItem[],
	validated: z.infer<typeof MultiSelectConfigSchema>,
): MultiSelectState {
	const selected = initializeSelected(items, validated.selected);
	const filterLineHeight = validated.filterable ? 1 : 0;
	const visibleCount = Math.max(1, validated.height - filterLineHeight);

	return {
		items,
		selected,
		cursorIndex: items.length > 0 ? 0 : -1,
		rangeAnchor: 0,
		filterQuery: '',
		filteredIndices: items.map((_, i) => i),
		filterable: validated.filterable,
		firstVisible: 0,
		visibleCount,
		width: validated.width,
		fg: validated.fg ?? 0xffffffff,
		bg: validated.bg ?? 0x000000ff,
		cursorFg: validated.cursorFg ?? 0x000000ff,
		cursorBg: validated.cursorBg ?? 0x0088ffff,
		selectedFg: validated.selectedFg ?? 0x00ff00ff,
		selectedBg: validated.selectedBg ?? 0x000000ff,
		disabledFg: validated.disabledFg ?? 0x888888ff,
		selectionCallbacks: [],
	};
}

/**
 * Renders a single item line for the multi-select widget.
 */
export function renderItemLine(state: MultiSelectState, viewIndex: number): string | undefined {
	const actualIdx = getActualIndex(state, viewIndex);
	if (actualIdx < 0) {
		return undefined;
	}
	const item = state.items[actualIdx];
	if (!item) {
		return undefined;
	}

	const checkbox = state.selected.has(actualIdx) ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
	const cursor = viewIndex === state.cursorIndex ? '>' : ' ';
	const maxTextWidth = Math.max(0, state.width - 6);
	const truncated =
		item.text.length > maxTextWidth ? `${item.text.slice(0, maxTextWidth - 1)}~` : item.text;

	return `${cursor} ${checkbox} ${truncated}`;
}
