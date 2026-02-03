/**
 * Main Menu and Title Screen
 *
 * Implements the game's title screen, menu navigation, and menu states.
 *
 * @module balatro/ui/menu
 */

import type { StarterDeckType } from '../data/game-state';
import { STARTER_DECKS } from '../data/game-state';

// =============================================================================
// TYPES
// =============================================================================

export type MenuScreen = 'title' | 'options' | 'collection' | 'deck_select' | 'starting_run';

export type MenuOption = 'new_run' | 'options' | 'collection' | 'quit';

export type OptionsMenuItem = 'sound' | 'card_style' | 'key_bindings' | 'back';

export interface MenuState {
	readonly screen: MenuScreen;
	readonly selectedIndex: number;
	readonly soundEnabled: boolean;
	readonly cardStyle: 'classic' | 'modern';
	readonly selectedDeck: StarterDeckType;
}

export interface TitleScreenLayout {
	readonly width: number;
	readonly height: number;
	readonly titleY: number;
	readonly subtitleY: number;
	readonly menuStartY: number;
	readonly footerY: number;
}

export interface MenuItem {
	readonly id: string;
	readonly label: string;
	readonly enabled: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** ASCII art title */
export const TITLE_ART: readonly string[] = [
	'██████╗  █████╗ ██╗     ',
	'██╔══██╗██╔══██╗██║     ',
	'██████╔╝███████║██║     ',
	'██╔══██╗██╔══██║██║     ',
	'██████╔╝██║  ██║███████╗',
	'╚═════╝ ╚═╝  ╚═╝╚══════╝',
];

/** Title width in characters */
export const TITLE_WIDTH = 24;

/** Subtitle text */
export const SUBTITLE = 'TERMINAL EDITION';

/** Main menu options */
const MAIN_MENU_OPTIONS: readonly MenuItem[] = [
	{ id: 'new_run', label: 'NEW RUN', enabled: true },
	{ id: 'options', label: 'OPTIONS', enabled: true },
	{ id: 'collection', label: 'COLLECTION', enabled: false },
	{ id: 'quit', label: 'QUIT', enabled: true },
];

/** Options menu items */
const OPTIONS_MENU_ITEMS: readonly MenuItem[] = [
	{ id: 'sound', label: 'SOUND', enabled: true },
	{ id: 'card_style', label: 'CARD STYLE', enabled: true },
	{ id: 'key_bindings', label: 'KEY BINDINGS', enabled: true },
	{ id: 'back', label: 'BACK', enabled: true },
];

/** Deck selection menu items (built from STARTER_DECKS) */
const DECK_MENU_ITEMS: readonly MenuItem[] = STARTER_DECKS.map(d => ({
	id: d.type,
	label: d.name.toUpperCase(),
	enabled: true,
}));

/** Footer text */
export const FOOTER_TEXT = 'Press Enter to select';

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial menu state.
 */
export function createMenuState(): MenuState {
	return {
		screen: 'title',
		selectedIndex: 0,
		soundEnabled: true,
		cardStyle: 'classic',
		selectedDeck: 'red',
	};
}

/**
 * Gets the menu items for the current screen.
 *
 * @param state - Current menu state
 * @returns Array of menu items
 */
export function getMenuItems(state: MenuState): readonly MenuItem[] {
	switch (state.screen) {
		case 'title':
			return MAIN_MENU_OPTIONS;
		case 'options':
			return OPTIONS_MENU_ITEMS;
		case 'deck_select':
			return DECK_MENU_ITEMS;
		default:
			return [];
	}
}

/**
 * Gets the number of selectable items in the current menu.
 *
 * @param state - Current menu state
 * @returns Number of items
 */
export function getMenuItemCount(state: MenuState): number {
	return getMenuItems(state).length;
}

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * Navigates up in the menu.
 *
 * @param state - Current menu state
 * @returns New menu state
 */
export function navigateUp(state: MenuState): MenuState {
	const itemCount = getMenuItemCount(state);
	if (itemCount === 0) return state;

	const items = getMenuItems(state);
	let newIndex = state.selectedIndex;

	// Find previous enabled item (wrap around)
	for (let i = 0; i < itemCount; i++) {
		newIndex = (newIndex - 1 + itemCount) % itemCount;
		const item = items[newIndex];
		if (item?.enabled) break;
	}

	return { ...state, selectedIndex: newIndex };
}

/**
 * Navigates down in the menu.
 *
 * @param state - Current menu state
 * @returns New menu state
 */
export function navigateDown(state: MenuState): MenuState {
	const itemCount = getMenuItemCount(state);
	if (itemCount === 0) return state;

	const items = getMenuItems(state);
	let newIndex = state.selectedIndex;

	// Find next enabled item (wrap around)
	for (let i = 0; i < itemCount; i++) {
		newIndex = (newIndex + 1) % itemCount;
		const item = items[newIndex];
		if (item?.enabled) break;
	}

	return { ...state, selectedIndex: newIndex };
}

/**
 * Gets the currently selected menu item.
 *
 * @param state - Current menu state
 * @returns Selected item or null
 */
export function getSelectedItem(state: MenuState): MenuItem | null {
	const items = getMenuItems(state);
	return items[state.selectedIndex] ?? null;
}

// =============================================================================
// SELECTION HANDLING
// =============================================================================

export type MenuAction =
	| { readonly type: 'start_game'; readonly deck: StarterDeckType }
	| { readonly type: 'open_options' }
	| { readonly type: 'open_collection' }
	| { readonly type: 'open_deck_select' }
	| { readonly type: 'quit' }
	| { readonly type: 'toggle_sound' }
	| { readonly type: 'cycle_card_style' }
	| { readonly type: 'show_key_bindings' }
	| { readonly type: 'back_to_title' }
	| { readonly type: 'none' };

/**
 * Handles selection of the current menu item.
 *
 * @param state - Current menu state
 * @returns Tuple of [new state, action]
 */
export function selectMenuItem(state: MenuState): [MenuState, MenuAction] {
	const item = getSelectedItem(state);
	if (!item || !item.enabled) {
		return [state, { type: 'none' }];
	}

	switch (state.screen) {
		case 'title':
			return handleTitleSelection(state, item.id as MenuOption);
		case 'options':
			return handleOptionsSelection(state, item.id as OptionsMenuItem);
		case 'deck_select':
			return handleDeckSelection(state, item.id as StarterDeckType);
		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Handles selection on the title screen.
 */
function handleTitleSelection(
	state: MenuState,
	option: MenuOption,
): [MenuState, MenuAction] {
	switch (option) {
		case 'new_run':
			return [
				{ ...state, screen: 'deck_select', selectedIndex: 0 },
				{ type: 'open_deck_select' },
			];
		case 'options':
			return [
				{ ...state, screen: 'options', selectedIndex: 0 },
				{ type: 'open_options' },
			];
		case 'collection':
			return [state, { type: 'open_collection' }];
		case 'quit':
			return [state, { type: 'quit' }];
		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Handles selection on the options screen.
 */
function handleOptionsSelection(
	state: MenuState,
	option: OptionsMenuItem,
): [MenuState, MenuAction] {
	switch (option) {
		case 'sound':
			return [
				{ ...state, soundEnabled: !state.soundEnabled },
				{ type: 'toggle_sound' },
			];
		case 'card_style':
			return [
				{
					...state,
					cardStyle: state.cardStyle === 'classic' ? 'modern' : 'classic',
				},
				{ type: 'cycle_card_style' },
			];
		case 'key_bindings':
			return [state, { type: 'show_key_bindings' }];
		case 'back':
			return [
				{ ...state, screen: 'title', selectedIndex: 0 },
				{ type: 'back_to_title' },
			];
		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Handles selection on the deck select screen.
 */
function handleDeckSelection(
	state: MenuState,
	deckType: StarterDeckType,
): [MenuState, MenuAction] {
	return [
		{ ...state, screen: 'starting_run', selectedDeck: deckType },
		{ type: 'start_game', deck: deckType },
	];
}

/**
 * Handles the back/escape action.
 *
 * @param state - Current menu state
 * @returns New menu state
 */
export function handleBack(state: MenuState): MenuState {
	switch (state.screen) {
		case 'options':
		case 'deck_select':
			return { ...state, screen: 'title', selectedIndex: 0 };
		default:
			return state;
	}
}

// =============================================================================
// LAYOUT
// =============================================================================

/**
 * Calculates the title screen layout based on screen dimensions.
 *
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Title screen layout
 */
export function calculateTitleLayout(
	screenWidth: number,
	screenHeight: number,
): TitleScreenLayout {
	// Center everything vertically
	const totalContentHeight = TITLE_ART.length + 1 + 1 + MAIN_MENU_OPTIONS.length + 1 + 1;
	const startY = Math.max(2, Math.floor((screenHeight - totalContentHeight) / 2));

	return {
		width: screenWidth,
		height: screenHeight,
		titleY: startY,
		subtitleY: startY + TITLE_ART.length + 1,
		menuStartY: startY + TITLE_ART.length + 3,
		footerY: screenHeight - 2,
	};
}

/**
 * Gets the X position to center text.
 *
 * @param text - Text to center
 * @param screenWidth - Screen width
 * @returns X position
 */
export function centerX(text: string, screenWidth: number): number {
	return Math.max(0, Math.floor((screenWidth - text.length) / 2));
}

/**
 * Gets the X position to center the title.
 *
 * @param screenWidth - Screen width
 * @returns X position
 */
export function titleCenterX(screenWidth: number): number {
	return Math.max(0, Math.floor((screenWidth - TITLE_WIDTH) / 2));
}

// =============================================================================
// RENDERING DATA
// =============================================================================

export interface TitleRenderData {
	readonly titleLines: readonly { readonly text: string; readonly x: number; readonly y: number }[];
	readonly subtitle: { readonly text: string; readonly x: number; readonly y: number };
	readonly menuItems: readonly {
		readonly text: string;
		readonly x: number;
		readonly y: number;
		readonly selected: boolean;
		readonly enabled: boolean;
	}[];
	readonly footer: { readonly text: string; readonly x: number; readonly y: number };
}

/**
 * Gets the render data for the title screen.
 *
 * @param state - Current menu state
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Render data
 */
export function getTitleRenderData(
	state: MenuState,
	screenWidth: number,
	screenHeight: number,
): TitleRenderData {
	const layout = calculateTitleLayout(screenWidth, screenHeight);
	const titleX = titleCenterX(screenWidth);
	const items = getMenuItems(state);

	// Title lines
	const titleLines = TITLE_ART.map((line, i) => ({
		text: line,
		x: titleX,
		y: layout.titleY + i,
	}));

	// Subtitle
	const subtitle = {
		text: SUBTITLE,
		x: centerX(SUBTITLE, screenWidth),
		y: layout.subtitleY,
	};

	// Menu items
	const menuItems = items.map((item, i) => {
		const prefix = i === state.selectedIndex ? '> ' : '  ';
		const suffix = i === state.selectedIndex ? ' <' : '  ';
		const text = `${prefix}${item.label}${suffix}`;

		return {
			text,
			x: centerX(text, screenWidth),
			y: layout.menuStartY + i,
			selected: i === state.selectedIndex,
			enabled: item.enabled,
		};
	});

	// Footer
	const footer = {
		text: FOOTER_TEXT,
		x: centerX(FOOTER_TEXT, screenWidth),
		y: layout.footerY,
	};

	return { titleLines, subtitle, menuItems, footer };
}

export interface OptionsRenderData {
	readonly title: { readonly text: string; readonly x: number; readonly y: number };
	readonly items: readonly {
		readonly label: string;
		readonly value: string;
		readonly x: number;
		readonly y: number;
		readonly selected: boolean;
	}[];
	readonly footer: { readonly text: string; readonly x: number; readonly y: number };
}

/**
 * Gets the render data for the options screen.
 *
 * @param state - Current menu state
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Render data
 */
export function getOptionsRenderData(
	state: MenuState,
	screenWidth: number,
	screenHeight: number,
): OptionsRenderData {
	const startY = Math.max(3, Math.floor((screenHeight - 10) / 2));
	const title = {
		text: '=== OPTIONS ===',
		x: centerX('=== OPTIONS ===', screenWidth),
		y: startY,
	};

	const items = OPTIONS_MENU_ITEMS.map((item, i) => {
		let value = '';
		switch (item.id) {
			case 'sound':
				value = state.soundEnabled ? 'ON' : 'OFF';
				break;
			case 'card_style':
				value = state.cardStyle.toUpperCase();
				break;
			default:
				value = '';
		}

		const prefix = i === state.selectedIndex ? '> ' : '  ';
		const labelWithValue = value ? `${item.label}: ${value}` : item.label;
		const text = `${prefix}${labelWithValue}`;

		return {
			label: item.label,
			value,
			x: centerX(text, screenWidth),
			y: startY + 2 + i,
			selected: i === state.selectedIndex,
		};
	});

	const footerText = 'Enter to select, Esc to go back';
	const footer = {
		text: footerText,
		x: centerX(footerText, screenWidth),
		y: screenHeight - 2,
	};

	return { title, items, footer };
}

export interface DeckSelectRenderData {
	readonly title: { readonly text: string; readonly x: number; readonly y: number };
	readonly items: readonly {
		readonly label: string;
		readonly description: string;
		readonly x: number;
		readonly y: number;
		readonly selected: boolean;
		readonly color: number;
	}[];
	readonly footer: { readonly text: string; readonly x: number; readonly y: number };
}

/**
 * Gets the render data for the deck selection screen.
 *
 * @param state - Current menu state
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Render data
 */
export function getDeckSelectRenderData(
	state: MenuState,
	screenWidth: number,
	screenHeight: number,
): DeckSelectRenderData {
	const startY = Math.max(3, Math.floor((screenHeight - 10) / 2));
	const title = {
		text: '=== SELECT DECK ===',
		x: centerX('=== SELECT DECK ===', screenWidth),
		y: startY,
	};

	const items = STARTER_DECKS.map((deck, i) => {
		const prefix = i === state.selectedIndex ? '> ' : '  ';
		const text = `${prefix}${deck.name.toUpperCase()}`;

		return {
			label: text,
			description: deck.description,
			x: centerX(text, screenWidth),
			y: startY + 2 + i * 2,
			selected: i === state.selectedIndex,
			color: deck.color,
		};
	});

	const footerText = 'Enter to select, Esc to go back';
	const footer = {
		text: footerText,
		x: centerX(footerText, screenWidth),
		y: screenHeight - 2,
	};

	return { title, items, footer };
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

export type MenuInput =
	| { readonly type: 'up' }
	| { readonly type: 'down' }
	| { readonly type: 'select' }
	| { readonly type: 'back' };

/**
 * Processes a menu input and returns the new state and action.
 *
 * @param state - Current menu state
 * @param input - Input event
 * @returns Tuple of [new state, action]
 */
export function processMenuInput(
	state: MenuState,
	input: MenuInput,
): [MenuState, MenuAction] {
	switch (input.type) {
		case 'up':
			return [navigateUp(state), { type: 'none' }];
		case 'down':
			return [navigateDown(state), { type: 'none' }];
		case 'select':
			return selectMenuItem(state);
		case 'back':
			return [handleBack(state), { type: 'back_to_title' }];
		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Converts a key name to a menu input.
 *
 * @param key - Key name
 * @returns Menu input or null
 */
export function keyToMenuInput(key: string): MenuInput | null {
	switch (key) {
		case 'up':
		case 'k':
			return { type: 'up' };
		case 'down':
		case 'j':
			return { type: 'down' };
		case 'return':
		case 'enter':
		case 'space':
			return { type: 'select' };
		case 'escape':
		case 'q':
			return { type: 'back' };
		default:
			return null;
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if the menu is on the title screen.
 *
 * @param state - Current menu state
 * @returns True if on title screen
 */
export function isOnTitleScreen(state: MenuState): boolean {
	return state.screen === 'title';
}

/**
 * Checks if the menu is on the options screen.
 *
 * @param state - Current menu state
 * @returns True if on options screen
 */
export function isOnOptionsScreen(state: MenuState): boolean {
	return state.screen === 'options';
}

/**
 * Checks if the menu is on the deck select screen.
 *
 * @param state - Current menu state
 * @returns True if on deck select screen
 */
export function isOnDeckSelectScreen(state: MenuState): boolean {
	return state.screen === 'deck_select';
}

/**
 * Checks if the game should start.
 *
 * @param state - Current menu state
 * @returns True if starting run
 */
export function shouldStartGame(state: MenuState): boolean {
	return state.screen === 'starting_run';
}
