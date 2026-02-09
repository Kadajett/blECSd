/**
 * Autocomplete Widget
 *
 * An input widget with autocomplete suggestions using fuzzy matching.
 * Displays a dropdown of filtered suggestions as the user types.
 *
 * @module widgets/autocomplete
 */

import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import { blur, focus, setFocusable } from '../components/focusable';
import { setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import {
	attachTextInputBehavior,
	focusTextInput,
	onTextInputChange,
	onTextInputSubmit,
	setTextInputConfig,
	startEditingTextInput,
} from '../components/textInput';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import { type FuzzyMatch, fuzzySearch } from '../utils/fuzzySearch';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Autocomplete component marker for identifying autocomplete entities.
 */
export const Autocomplete = {
	/** Tag indicating this is an autocomplete widget (1 = yes) */
	isAutocomplete: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Autocomplete widget configuration.
 *
 * @example
 * ```typescript
 * const autocomplete = createAutocomplete(world, eid, {
 *   items: ['apple', 'banana', 'cherry', 'apricot'],
 *   placeholder: 'Search fruits...',
 *   maxSuggestions: 5,
 *   fuzzyMatch: true
 * });
 *
 * // Handle selection
 * autocomplete.onSelect((value) => {
 *   console.log('Selected:', value);
 * });
 * ```
 */
export interface AutocompleteConfig {
	/**
	 * Array of items to search through
	 * @default []
	 */
	readonly items?: readonly string[];

	/**
	 * Placeholder text shown when input is empty
	 * @default 'Type to search...'
	 */
	readonly placeholder?: string;

	/**
	 * Maximum number of suggestions to display in dropdown
	 * @default 10
	 */
	readonly maxSuggestions?: number;

	/**
	 * Enable fuzzy matching (matches if all chars appear in order)
	 * @default true
	 */
	readonly fuzzyMatch?: boolean;

	/**
	 * Initial value in the input
	 * @default ''
	 */
	readonly value?: string;

	/**
	 * Width in cells
	 * @default 30
	 */
	readonly width?: number;

	/**
	 * X position
	 * @default 0
	 */
	readonly left?: number;

	/**
	 * Y position
	 * @default 0
	 */
	readonly top?: number;

	/**
	 * Foreground color
	 * @default undefined
	 */
	readonly fg?: string | number;

	/**
	 * Background color
	 * @default undefined
	 */
	readonly bg?: string | number;

	/**
	 * Highlight color for selected suggestion
	 * @default undefined
	 */
	readonly highlightFg?: string | number;

	/**
	 * Highlight background for selected suggestion
	 * @default undefined
	 */
	readonly highlightBg?: string | number;
}

/**
 * Autocomplete widget interface providing chainable methods.
 */
export interface AutocompleteWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the widget */
	show(): AutocompleteWidget;
	/** Hides the widget */
	hide(): AutocompleteWidget;

	// Focus
	/** Focuses the input */
	focus(): AutocompleteWidget;
	/** Blurs the input */
	blur(): AutocompleteWidget;

	// Value
	/** Gets the current input value */
	getValue(): string;
	/** Sets the input value */
	setValue(value: string): AutocompleteWidget;

	// Items
	/** Sets the items to search through */
	setItems(items: readonly string[]): AutocompleteWidget;
	/** Gets the current items */
	getItems(): readonly string[];

	// Suggestions
	/** Gets the currently filtered suggestions */
	getSuggestions(): readonly string[];
	/** Gets whether the dropdown is open */
	isOpen(): boolean;
	/** Opens the dropdown */
	openDropdown(): AutocompleteWidget;
	/** Closes the dropdown */
	closeDropdown(): AutocompleteWidget;

	// Event handlers
	/** Sets callback for when a value is selected */
	onSelect(callback: (value: string) => void): AutocompleteWidget;
	/** Sets callback for when input value changes */
	onChange(callback: (value: string) => void): AutocompleteWidget;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const AutocompleteConfigSchema = z.object({
	items: z.array(z.string()).optional().default([]),
	placeholder: z.string().optional().default('Type to search...'),
	maxSuggestions: z.number().int().positive().optional().default(10),
	fuzzyMatch: z.boolean().optional().default(true),
	value: z.string().optional().default(''),
	width: z.number().int().positive().optional().default(30),
	left: z.number().optional().default(0),
	top: z.number().optional().default(0),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	highlightFg: z.union([z.string(), z.number()]).optional(),
	highlightBg: z.union([z.string(), z.number()]).optional(),
});

type ValidatedAutocompleteConfig = z.infer<typeof AutocompleteConfigSchema>;

// =============================================================================
// STATE
// =============================================================================

interface AutocompleteState {
	items: readonly string[];
	inputText: string;
	filteredItems: readonly FuzzyMatch<string>[];
	selectedIndex: number;
	isOpen: boolean;
	fuzzyMatch: boolean;
	maxSuggestions: number;
	onSelectCallback?: (value: string) => void;
	onChangeCallback?: (value: string) => void;
}

const autocompleteStateMap = new Map<Entity, AutocompleteState>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Filters items based on input text using fuzzy matching.
 */
function filterItems(
	items: readonly string[],
	query: string,
	fuzzyMatch: boolean,
	maxSuggestions: number,
): readonly FuzzyMatch<string>[] {
	if (!query) {
		return items.slice(0, maxSuggestions).map((item) => ({
			item,
			text: item,
			score: 1,
			indices: [],
		}));
	}

	if (fuzzyMatch) {
		const results = fuzzySearch(query, items);
		return results.slice(0, maxSuggestions);
	}

	// Simple substring matching
	const lowerQuery = query.toLowerCase();
	const matches: Array<FuzzyMatch<string>> = [];

	for (const item of items) {
		const lowerItem = item.toLowerCase();
		const index = lowerItem.indexOf(lowerQuery);
		if (index === -1) continue;

		// Calculate score based on match position (earlier = better)
		const score = 1 - index / item.length;

		matches.push({
			item,
			text: item,
			score,
			indices: Array.from({ length: query.length }, (_, i) => index + i),
		});
	}

	matches.sort((a, b) => b.score - a.score);
	return matches.slice(0, maxSuggestions);
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates an Autocomplete widget with fuzzy matching and dropdown suggestions.
 *
 * The autocomplete widget provides real-time filtered suggestions as the user types.
 * Supports arrow key navigation and Enter to select a suggestion.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Autocomplete widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createAutocomplete } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Simple autocomplete
 * const autocomplete = createAutocomplete(world, eid, {
 *   items: ['apple', 'banana', 'cherry', 'date', 'elderberry'],
 *   placeholder: 'Search fruits...',
 *   left: 10,
 *   top: 5,
 *   width: 30
 * });
 *
 * // Handle selection
 * autocomplete.onSelect((value) => {
 *   console.log('User selected:', value);
 * });
 *
 * // Handle input changes
 * autocomplete.onChange((value) => {
 *   console.log('Input changed to:', value);
 * });
 *
 * // With fuzzy matching disabled (exact substring match)
 * const exact = createAutocomplete(world, eid, {
 *   items: ['JavaScript', 'TypeScript', 'Python', 'Java'],
 *   fuzzyMatch: false,
 *   maxSuggestions: 5
 * });
 * ```
 */
export function createAutocomplete(
	world: World,
	entity: Entity,
	config: AutocompleteConfig = {},
): AutocompleteWidget {
	const validated = AutocompleteConfigSchema.parse(config) as ValidatedAutocompleteConfig;
	const eid = entity;

	// Mark as autocomplete
	Autocomplete.isAutocomplete[eid] = 1;

	// Position and dimensions
	setPosition(world, eid, validated.left, validated.top);
	setDimensions(world, eid, validated.width, 1);

	// Set up focusable
	setFocusable(world, eid, { focusable: true });

	// Set up text input behavior
	attachTextInputBehavior(world, eid);
	setTextInputConfig(world, eid, {
		placeholder: validated.placeholder,
		maxLength: 0,
	});

	// Set up style
	const fgColor = validated.fg ? parseColor(validated.fg) : undefined;
	const bgColor = validated.bg ? parseColor(validated.bg) : undefined;
	if (fgColor !== undefined || bgColor !== undefined) {
		setStyle(world, eid, { fg: fgColor, bg: bgColor });
	}

	// Initialize state
	const state: AutocompleteState = {
		items: validated.items,
		inputText: validated.value,
		filteredItems: filterItems(
			validated.items,
			validated.value,
			validated.fuzzyMatch,
			validated.maxSuggestions,
		),
		selectedIndex: 0,
		isOpen: false,
		fuzzyMatch: validated.fuzzyMatch,
		maxSuggestions: validated.maxSuggestions,
	};
	autocompleteStateMap.set(eid, state);

	// Set up event handlers
	onTextInputChange(world, eid, (value: string) => {
		const currentState = autocompleteStateMap.get(eid);
		if (!currentState) return;

		currentState.inputText = value;
		currentState.filteredItems = filterItems(
			currentState.items,
			value,
			currentState.fuzzyMatch,
			currentState.maxSuggestions,
		);
		currentState.selectedIndex = 0;
		currentState.isOpen = value.length > 0 && currentState.filteredItems.length > 0;

		markDirty(world, eid);

		if (currentState.onChangeCallback) {
			currentState.onChangeCallback(value);
		}
	});

	onTextInputSubmit(world, eid, (value: string) => {
		const currentState = autocompleteStateMap.get(eid);
		if (!currentState) return;

		// If dropdown is open and there's a selection, use it
		if (currentState.isOpen && currentState.filteredItems.length > 0) {
			const selected = currentState.filteredItems[currentState.selectedIndex];
			if (selected) {
				currentState.inputText = selected.item;
				currentState.isOpen = false;
				currentState.selectedIndex = 0;

				if (currentState.onSelectCallback) {
					currentState.onSelectCallback(selected.item);
				}
			}
		} else if (currentState.onSelectCallback) {
			currentState.onSelectCallback(value);
		}

		markDirty(world, eid);
	});

	// Create the widget object with chainable methods
	const widget: AutocompleteWidget = {
		eid,

		// Visibility
		show(): AutocompleteWidget {
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide(): AutocompleteWidget {
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		// Focus
		focus(): AutocompleteWidget {
			focus(world, eid);
			focusTextInput(world, eid);
			startEditingTextInput(world, eid);
			return widget;
		},

		blur(): AutocompleteWidget {
			blur(world, eid);
			const currentState = autocompleteStateMap.get(eid);
			if (currentState) {
				currentState.isOpen = false;
			}
			markDirty(world, eid);
			return widget;
		},

		// Value
		getValue(): string {
			const currentState = autocompleteStateMap.get(eid);
			return currentState?.inputText ?? '';
		},

		setValue(value: string): AutocompleteWidget {
			const currentState = autocompleteStateMap.get(eid);
			if (currentState) {
				currentState.inputText = value;
				currentState.filteredItems = filterItems(
					currentState.items,
					value,
					currentState.fuzzyMatch,
					currentState.maxSuggestions,
				);
				currentState.selectedIndex = 0;
				currentState.isOpen = value.length > 0 && currentState.filteredItems.length > 0;

				markDirty(world, eid);
			}
			return widget;
		},

		// Items
		setItems(items: readonly string[]): AutocompleteWidget {
			const currentState = autocompleteStateMap.get(eid);
			if (currentState) {
				currentState.items = items;
				currentState.filteredItems = filterItems(
					items,
					currentState.inputText,
					currentState.fuzzyMatch,
					currentState.maxSuggestions,
				);
				currentState.selectedIndex = 0;
				markDirty(world, eid);
			}
			return widget;
		},

		getItems(): readonly string[] {
			const currentState = autocompleteStateMap.get(eid);
			return currentState?.items ?? [];
		},

		// Suggestions
		getSuggestions(): readonly string[] {
			const currentState = autocompleteStateMap.get(eid);
			return currentState?.filteredItems.map((match) => match.item) ?? [];
		},

		isOpen(): boolean {
			const currentState = autocompleteStateMap.get(eid);
			return currentState?.isOpen ?? false;
		},

		openDropdown(): AutocompleteWidget {
			const currentState = autocompleteStateMap.get(eid);
			if (currentState && currentState.filteredItems.length > 0) {
				currentState.isOpen = true;
				markDirty(world, eid);
			}
			return widget;
		},

		closeDropdown(): AutocompleteWidget {
			const currentState = autocompleteStateMap.get(eid);
			if (currentState) {
				currentState.isOpen = false;
				markDirty(world, eid);
			}
			return widget;
		},

		// Event handlers
		onSelect(callback: (value: string) => void): AutocompleteWidget {
			const currentState = autocompleteStateMap.get(eid);
			if (currentState) {
				currentState.onSelectCallback = callback;
			}
			return widget;
		},

		onChange(callback: (value: string) => void): AutocompleteWidget {
			const currentState = autocompleteStateMap.get(eid);
			if (currentState) {
				currentState.onChangeCallback = callback;
			}
			return widget;
		},

		// Lifecycle
		destroy(): void {
			autocompleteStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Type guard to check if an entity is an autocomplete widget.
 */
export function isAutocomplete(_world: World, eid: Entity): boolean {
	return Autocomplete.isAutocomplete[eid] === 1;
}

/**
 * Resets the autocomplete store (for testing).
 * @internal
 */
export function resetAutocompleteStore(): void {
	autocompleteStateMap.clear();
}
