/**
 * Multi-Select Widget Factory
 *
 * Factory function for creating MultiSelect widgets.
 *
 * @module widgets/multiSelect/factory
 */

import { addEntity, removeEntity } from '../../core/ecs';
import type { World } from '../../core/types';
import { MultiSelectConfigSchema } from './config';
import {
	createMultiSelectState,
	ensureCursorVisible,
	fireSelectionCallbacks,
	getActualIndex,
	handleMultiSelectKey,
	normalizeItems,
	recalculateFilter,
	renderItemLine,
} from './helpers';
import { MultiSelect, stateMap } from './state';
import type { MultiSelectConfig, MultiSelectItem, MultiSelectWidget, SelectionChangeCallback } from './types';

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a MultiSelect widget.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The MultiSelectWidget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { createMultiSelect } from 'blecsd';
 *
 * const world = createWorld();
 * const ms = createMultiSelect(world, {
 *   items: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
 *   width: 30,
 *   height: 8,
 *   selected: [0, 2],
 * });
 *
 * ms.focus();
 * console.log(ms.getSelectionStatus()); // "2 selected"
 *
 * ms.handleKey(' '); // Toggle current
 * ms.handleKey('down'); // Move cursor
 * ```
 */
export function createMultiSelect(world: World, config: MultiSelectConfig = {}): MultiSelectWidget {
	const validated = MultiSelectConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as multi-select
	MultiSelect.isMultiSelect[eid] = 1;
	MultiSelect.visible[eid] = 1;
	MultiSelect.focused[eid] = 0;

	const items = normalizeItems(validated.items);
	const state = createMultiSelectState(items, validated);

	stateMap.set(eid, state);

	const widget: MultiSelectWidget = {
		eid,

		// Visibility
		show(): MultiSelectWidget {
			MultiSelect.visible[eid] = 1;
			return widget;
		},

		hide(): MultiSelectWidget {
			MultiSelect.visible[eid] = 0;
			return widget;
		},

		// Focus
		focus(): MultiSelectWidget {
			MultiSelect.focused[eid] = 1;
			return widget;
		},

		blur(): MultiSelectWidget {
			MultiSelect.focused[eid] = 0;
			return widget;
		},

		isFocused(): boolean {
			return MultiSelect.focused[eid] === 1;
		},

		// Cursor
		select(index: number): MultiSelectWidget {
			if (index >= 0 && index < state.filteredIndices.length) {
				state.cursorIndex = index;
				state.rangeAnchor = index;
				ensureCursorVisible(state);
			}
			return widget;
		},

		getCursorIndex(): number {
			return state.cursorIndex;
		},

		cursorUp(): MultiSelectWidget {
			if (state.cursorIndex > 0) {
				state.cursorIndex--;
				ensureCursorVisible(state);
			}
			return widget;
		},

		cursorDown(): MultiSelectWidget {
			if (state.cursorIndex < state.filteredIndices.length - 1) {
				state.cursorIndex++;
				ensureCursorVisible(state);
			}
			return widget;
		},

		cursorFirst(): MultiSelectWidget {
			if (state.filteredIndices.length > 0) {
				state.cursorIndex = 0;
				state.firstVisible = 0;
			}
			return widget;
		},

		cursorLast(): MultiSelectWidget {
			if (state.filteredIndices.length > 0) {
				state.cursorIndex = state.filteredIndices.length - 1;
				ensureCursorVisible(state);
			}
			return widget;
		},

		pageUp(): MultiSelectWidget {
			state.cursorIndex = Math.max(0, state.cursorIndex - state.visibleCount);
			ensureCursorVisible(state);
			return widget;
		},

		pageDown(): MultiSelectWidget {
			state.cursorIndex = Math.min(
				state.filteredIndices.length - 1,
				state.cursorIndex + state.visibleCount,
			);
			ensureCursorVisible(state);
			return widget;
		},

		// Selection
		toggleCurrent(): MultiSelectWidget {
			if (state.cursorIndex < 0 || state.cursorIndex >= state.filteredIndices.length) {
				return widget;
			}

			const actualIdx = getActualIndex(state, state.cursorIndex);
			if (actualIdx < 0) {
				return widget;
			}

			const item = state.items[actualIdx];
			if (item?.disabled) {
				return widget;
			}

			if (state.selected.has(actualIdx)) {
				state.selected.delete(actualIdx);
			} else {
				state.selected.add(actualIdx);
			}

			state.rangeAnchor = state.cursorIndex;
			fireSelectionCallbacks(state);
			return widget;
		},

		toggleItem(index: number): MultiSelectWidget {
			if (index < 0 || index >= state.items.length) {
				return widget;
			}

			const item = state.items[index];
			if (item?.disabled) {
				return widget;
			}

			if (state.selected.has(index)) {
				state.selected.delete(index);
			} else {
				state.selected.add(index);
			}

			fireSelectionCallbacks(state);
			return widget;
		},

		selectAll(): MultiSelectWidget {
			for (let i = 0; i < state.items.length; i++) {
				const item = state.items[i];
				if (item && !item.disabled) {
					state.selected.add(i);
				}
			}
			fireSelectionCallbacks(state);
			return widget;
		},

		deselectAll(): MultiSelectWidget {
			state.selected.clear();
			fireSelectionCallbacks(state);
			return widget;
		},

		rangeSelectTo(index: number): MultiSelectWidget {
			if (index < 0 || index >= state.filteredIndices.length) {
				return widget;
			}

			const start = Math.min(state.rangeAnchor, index);
			const end = Math.max(state.rangeAnchor, index);

			for (let i = start; i <= end; i++) {
				const actualIdx = getActualIndex(state, i);
				if (actualIdx >= 0) {
					const item = state.items[actualIdx];
					if (item && !item.disabled) {
						state.selected.add(actualIdx);
					}
				}
			}

			state.cursorIndex = index;
			ensureCursorVisible(state);
			fireSelectionCallbacks(state);
			return widget;
		},

		getSelectedIndices(): readonly number[] {
			return Array.from(state.selected).sort((a, b) => a - b);
		},

		getSelectedItems(): readonly MultiSelectItem[] {
			return Array.from(state.selected)
				.sort((a, b) => a - b)
				.map((i) => state.items[i])
				.filter((item): item is MultiSelectItem => item !== undefined);
		},

		getSelectedCount(): number {
			return state.selected.size;
		},

		getSelectionStatus(): string {
			const count = state.selected.size;
			if (count === 0) {
				return 'None selected';
			}
			return `${count} selected`;
		},

		isSelected(index: number): boolean {
			return state.selected.has(index);
		},

		// Items
		setItems(newItems: readonly (string | MultiSelectItem)[]): MultiSelectWidget {
			state.items = normalizeItems(newItems);
			// Remove selections that are out of bounds
			for (const idx of state.selected) {
				if (idx >= state.items.length) {
					state.selected.delete(idx);
				}
			}
			recalculateFilter(state);
			if (state.cursorIndex >= state.filteredIndices.length) {
				state.cursorIndex = Math.max(0, state.filteredIndices.length - 1);
			}
			return widget;
		},

		getItems(): readonly MultiSelectItem[] {
			return state.items;
		},

		getVisibleItems(): readonly MultiSelectItem[] {
			return state.filteredIndices
				.map((i) => state.items[i])
				.filter((item): item is MultiSelectItem => item !== undefined);
		},

		// Filter
		setFilter(query: string): MultiSelectWidget {
			state.filterQuery = query;
			recalculateFilter(state);
			return widget;
		},

		getFilter(): string {
			return state.filterQuery;
		},

		clearFilter(): MultiSelectWidget {
			state.filterQuery = '';
			recalculateFilter(state);
			return widget;
		},

		// Rendering helpers
		getRenderLines(): readonly string[] {
			const lines: string[] = [];
			const startIdx = state.firstVisible;
			const endIdx = Math.min(startIdx + state.visibleCount, state.filteredIndices.length);

			for (let i = startIdx; i < endIdx; i++) {
				const line = renderItemLine(state, i);
				if (line !== undefined) {
					lines.push(line);
				}
			}

			return lines;
		},

		// Events
		onSelectionChange(callback: SelectionChangeCallback): () => void {
			state.selectionCallbacks.push(callback);
			return () => {
				const idx = state.selectionCallbacks.indexOf(callback);
				if (idx !== -1) {
					state.selectionCallbacks.splice(idx, 1);
				}
			};
		},

		// Key handling
		handleKey(key: string, ctrl = false, shift = false): boolean {
			return handleMultiSelectKey(widget, state, key, ctrl, shift);
		},

		// Lifecycle
		destroy(): void {
			MultiSelect.isMultiSelect[eid] = 0;
			MultiSelect.visible[eid] = 0;
			MultiSelect.focused[eid] = 0;
			stateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}
