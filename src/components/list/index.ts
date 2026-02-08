/**
 * List Component - Re-export Hub
 *
 * @module components/list
 */

// Set up circular dependency references after all modules are loaded
import { setSelectedIndex } from './selection';
import { setSelectionRef } from './virtualization';

// Initialize cross-module references
setSelectionRef(setSelectedIndex);

// Callbacks
export {
	clearListCallbacks,
	onListActivate,
	onListCancel,
	onListSelect,
	triggerListCancel,
} from './callbacks';

// Constants
export {
	DEFAULT_DISABLED_FG,
	DEFAULT_ITEM_BG,
	DEFAULT_ITEM_FG,
	DEFAULT_SELECTED_BG,
	DEFAULT_SELECTED_FG,
	DEFAULT_SELECTED_PREFIX,
	DEFAULT_UNSELECTED_PREFIX,
} from './constants';
// Core Functions
export {
	attachListBehavior,
	blurList,
	disableList,
	enableList,
	focusList,
	getListState,
	isList,
	isListDisabled,
	isListFocused,
	isListInState,
	sendListEvent,
} from './core';
// Display Configuration
export { clearListDisplay, getListDisplay, setListDisplay } from './display';
// Filter
export { clearListFilter, getFilteredItems, getListFilter, setListFilter } from './filter';

// Item Management
export {
	addItem,
	clearItems,
	getItem,
	getItemCount,
	getItems,
	removeItem,
	setItems,
	updateItem,
} from './items';
// Key Handling
export { handleListKeyPress } from './keyHandling';
// Multi-Select
export {
	deselectAllItems,
	getMultiSelected,
	isItemMultiSelected,
	isListMultiSelect,
	selectAllItems,
	setListMultiSelect,
	toggleMultiSelect,
} from './multiSelect';
// Options
export {
	isListInteractive,
	isListKeysEnabled,
	isListMouseEnabled,
	setListInteractive,
	setListKeys,
	setListMouse,
} from './options';
// Rendering Helpers
export { renderListItems } from './rendering';
// Testing Utilities
export { resetListStore } from './reset';
// Search Mode
export {
	appendToSearchQuery,
	backspaceSearchQuery,
	clearSearchQuery,
	endListSearch,
	findAndSelectByText,
	findNextMatch,
	getListSearchQuery,
	isListSearchEnabled,
	isListSearching,
	onListSearchChange,
	setListSearchEnabled,
	setListSearchQuery,
	startListSearch,
} from './search';
// Selection Management
export {
	activateSelected,
	clearSelection,
	getSelectedIndex,
	getSelectedItem,
	selectByValue,
	selectFirst,
	selectLast,
	selectNext,
	selectPrev,
	setSelectedIndex,
} from './selection';
// State Machine Config
export { LIST_STATE_MACHINE_CONFIG } from './stateMachine';
// Stores
export { listStore } from './stores';
// Types
export type {
	ListAction,
	ListDisplay,
	ListDisplayOptions,
	ListEvent,
	ListItem,
	ListLazyLoadCallback,
	ListScrollCallback,
	ListScrollInfo,
	ListSelectCallback,
	ListState,
	ListStore,
} from './types';
// Virtualization
export {
	appendItems,
	checkNeedsLoad,
	clearLazyLoadCallback,
	ensureVisible,
	getFirstVisible,
	getLazyLoadCallback,
	getLoadingPlaceholder,
	getScrollInfo,
	getTotalCount,
	getVisibleCount,
	getVisibleItems,
	isListLoading,
	loadItems,
	onListScroll,
	scrollPage,
	setFirstVisible,
	setLazyLoadCallback,
	setListLoading,
	setLoadingPlaceholder,
	setTotalCount,
	setVisibleCount,
} from './virtualization';
