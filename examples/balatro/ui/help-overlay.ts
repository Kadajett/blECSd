/**
 * Help Overlay and Key Bindings Reference
 *
 * Implements the in-game help system with context-sensitive controls.
 *
 * @module balatro/ui/help-overlay
 */

import type { HandType } from '../data/hand';
import { getHandBaseScore } from '../data/hand';

// =============================================================================
// TYPES
// =============================================================================

export type HelpContext = 'playing' | 'menu' | 'shop' | 'pack_opening';

export interface HelpOverlayState {
	readonly visible: boolean;
	readonly context: HelpContext;
	readonly showingPokerHands: boolean;
}

export interface KeyBinding {
	readonly keys: readonly string[];
	readonly description: string;
}

export interface KeyBindingSection {
	readonly title: string;
	readonly bindings: readonly KeyBinding[];
}

export interface HelpRenderData {
	readonly title: string;
	readonly sections: readonly KeyBindingSection[];
	readonly footer: string;
	readonly boxWidth: number;
	readonly boxHeight: number;
	readonly boxX: number;
	readonly boxY: number;
}

export interface PokerHandInfo {
	readonly name: string;
	readonly type: HandType;
	readonly baseChips: number;
	readonly baseMult: number;
	readonly level: number;
	readonly description: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Help overlay title */
const HELP_TITLE = 'CONTROLS';

/** Poker hands title */
const POKER_HANDS_TITLE = 'POKER HANDS';

/** Footer text */
const HELP_FOOTER = 'Press any key to close';

/** Box padding */
const BOX_PADDING = 2;

/** Minimum box width */
const MIN_BOX_WIDTH = 40;

// =============================================================================
// KEY BINDINGS DATA
// =============================================================================

const PLAYING_BINDINGS: readonly KeyBindingSection[] = [
	{
		title: 'CARD SELECTION',
		bindings: [
			{ keys: ['1-8'], description: 'Select card by position' },
			{ keys: ['←/→', 'h/l'], description: 'Move cursor' },
			{ keys: ['Space'], description: 'Toggle card at cursor' },
			{ keys: ['Tab'], description: 'Cycle selectable cards' },
			{ keys: ['A'], description: 'Select all' },
			{ keys: ['C'], description: 'Clear selection' },
		],
	},
	{
		title: 'ACTIONS',
		bindings: [
			{ keys: ['Enter', 'P'], description: 'Play selected cards' },
			{ keys: ['D'], description: 'Discard selected cards' },
			{ keys: ['S'], description: 'Sort hand' },
		],
	},
	{
		title: 'NAVIGATION',
		bindings: [
			{ keys: ['Esc'], description: 'Cancel / Back' },
			{ keys: ['?'], description: 'Toggle this help' },
			{ keys: ['H'], description: 'Show poker hands' },
			{ keys: ['Q'], description: 'Quit game' },
		],
	},
];

const MENU_BINDINGS: readonly KeyBindingSection[] = [
	{
		title: 'NAVIGATION',
		bindings: [
			{ keys: ['↑/↓', 'j/k'], description: 'Navigate options' },
			{ keys: ['Enter', 'Space'], description: 'Select option' },
			{ keys: ['Esc'], description: 'Back' },
			{ keys: ['Q'], description: 'Quit' },
		],
	},
];

const SHOP_BINDINGS: readonly KeyBindingSection[] = [
	{
		title: 'SHOP',
		bindings: [
			{ keys: ['←/→', 'h/l'], description: 'Browse items' },
			{ keys: ['Enter', 'Space'], description: 'Buy item' },
			{ keys: ['Tab'], description: 'Switch section' },
			{ keys: ['N'], description: 'Next round' },
			{ keys: ['R'], description: 'Reroll shop' },
		],
	},
	{
		title: 'NAVIGATION',
		bindings: [
			{ keys: ['?'], description: 'Toggle this help' },
			{ keys: ['Q'], description: 'Quit game' },
		],
	},
];

const PACK_OPENING_BINDINGS: readonly KeyBindingSection[] = [
	{
		title: 'PACK OPENING',
		bindings: [
			{ keys: ['←/→', 'h/l'], description: 'Browse cards' },
			{ keys: ['Enter', 'Space'], description: 'Take card' },
			{ keys: ['S'], description: 'Skip remaining' },
		],
	},
];

// =============================================================================
// POKER HAND DESCRIPTIONS
// =============================================================================

const HAND_DESCRIPTIONS: Record<HandType, string> = {
	HIGH_CARD: 'Any single card',
	PAIR: 'Two cards of same rank',
	TWO_PAIR: 'Two different pairs',
	THREE_OF_A_KIND: 'Three cards of same rank',
	STRAIGHT: 'Five cards in sequence',
	FLUSH: 'Five cards of same suit',
	FULL_HOUSE: 'Three of a kind + pair',
	FOUR_OF_A_KIND: 'Four cards of same rank',
	STRAIGHT_FLUSH: 'Straight + Flush',
	ROYAL_FLUSH: '10-J-Q-K-A of same suit',
};

const HAND_NAMES: Record<HandType, string> = {
	HIGH_CARD: 'High Card',
	PAIR: 'Pair',
	TWO_PAIR: 'Two Pair',
	THREE_OF_A_KIND: 'Three of a Kind',
	STRAIGHT: 'Straight',
	FLUSH: 'Flush',
	FULL_HOUSE: 'Full House',
	FOUR_OF_A_KIND: 'Four of a Kind',
	STRAIGHT_FLUSH: 'Straight Flush',
	ROYAL_FLUSH: 'Royal Flush',
};

const HAND_ORDER: readonly HandType[] = [
	'HIGH_CARD',
	'PAIR',
	'TWO_PAIR',
	'THREE_OF_A_KIND',
	'STRAIGHT',
	'FLUSH',
	'FULL_HOUSE',
	'FOUR_OF_A_KIND',
	'STRAIGHT_FLUSH',
	'ROYAL_FLUSH',
];

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial help overlay state.
 */
export function createHelpOverlayState(): HelpOverlayState {
	return {
		visible: false,
		context: 'playing',
		showingPokerHands: false,
	};
}

/**
 * Shows the help overlay.
 *
 * @param state - Current state
 * @param context - Help context
 * @returns New state with overlay visible
 */
export function showHelpOverlay(
	state: HelpOverlayState,
	context: HelpContext,
): HelpOverlayState {
	return {
		...state,
		visible: true,
		context,
		showingPokerHands: false,
	};
}

/**
 * Hides the help overlay.
 *
 * @param state - Current state
 * @returns New state with overlay hidden
 */
export function hideHelpOverlay(state: HelpOverlayState): HelpOverlayState {
	return {
		...state,
		visible: false,
		showingPokerHands: false,
	};
}

/**
 * Toggles the help overlay.
 *
 * @param state - Current state
 * @param context - Help context (used when showing)
 * @returns New state with overlay toggled
 */
export function toggleHelpOverlay(
	state: HelpOverlayState,
	context: HelpContext,
): HelpOverlayState {
	if (state.visible) {
		return hideHelpOverlay(state);
	}
	return showHelpOverlay(state, context);
}

/**
 * Shows the poker hand reference.
 *
 * @param state - Current state
 * @returns New state showing poker hands
 */
export function showPokerHandReference(state: HelpOverlayState): HelpOverlayState {
	return {
		...state,
		visible: true,
		showingPokerHands: true,
	};
}

/**
 * Toggles the poker hand reference.
 *
 * @param state - Current state
 * @returns New state with poker hands toggled
 */
export function togglePokerHandReference(state: HelpOverlayState): HelpOverlayState {
	if (state.visible && state.showingPokerHands) {
		return hideHelpOverlay(state);
	}
	return showPokerHandReference(state);
}

// =============================================================================
// KEY BINDINGS
// =============================================================================

/**
 * Gets key bindings for a context.
 *
 * @param context - Help context
 * @returns Key binding sections
 */
export function getKeyBindings(context: HelpContext): readonly KeyBindingSection[] {
	switch (context) {
		case 'playing':
			return PLAYING_BINDINGS;
		case 'menu':
			return MENU_BINDINGS;
		case 'shop':
			return SHOP_BINDINGS;
		case 'pack_opening':
			return PACK_OPENING_BINDINGS;
		default:
			return PLAYING_BINDINGS;
	}
}

/**
 * Gets a flat list of all key bindings for a context.
 *
 * @param context - Help context
 * @returns All key bindings
 */
export function getAllBindings(context: HelpContext): readonly KeyBinding[] {
	const sections = getKeyBindings(context);
	return sections.flatMap(s => s.bindings);
}

// =============================================================================
// POKER HANDS
// =============================================================================

/**
 * Gets poker hand information.
 *
 * @param handLevels - Optional hand levels (default 1)
 * @returns Array of poker hand info
 */
export function getPokerHandInfo(
	handLevels: Partial<Record<HandType, number>> = {},
): readonly PokerHandInfo[] {
	return HAND_ORDER.map(type => {
		const base = getHandBaseScore(type);
		const level = handLevels[type] ?? 1;

		return {
			name: HAND_NAMES[type],
			type,
			baseChips: base.baseChips,
			baseMult: base.baseMult,
			level,
			description: HAND_DESCRIPTIONS[type],
		};
	});
}

/**
 * Formats a poker hand for display.
 *
 * @param info - Poker hand info
 * @returns Formatted string
 */
export function formatPokerHand(info: PokerHandInfo): string {
	const levelStr = info.level > 1 ? ` (Lvl ${info.level})` : '';
	return `${info.name}${levelStr}: ${info.baseChips} chips × ${info.baseMult} mult`;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Calculates the required box dimensions.
 *
 * @param sections - Key binding sections
 * @returns Width and height
 */
export function calculateBoxDimensions(
	sections: readonly KeyBindingSection[],
): { width: number; height: number } {
	let maxWidth = MIN_BOX_WIDTH;
	let height = 0;

	// Title
	height += 2; // Title + separator

	for (const section of sections) {
		// Section title
		maxWidth = Math.max(maxWidth, section.title.length + BOX_PADDING * 2);
		height += 2; // Title + blank line

		// Bindings
		for (const binding of section.bindings) {
			const keysStr = binding.keys.join('/');
			const line = `  ${keysStr}  ${binding.description}`;
			maxWidth = Math.max(maxWidth, line.length + BOX_PADDING * 2);
			height += 1;
		}
	}

	// Footer
	height += 2; // Blank line + footer

	return { width: maxWidth, height };
}

/**
 * Gets render data for the help overlay.
 *
 * @param state - Help overlay state
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Render data
 */
export function getHelpRenderData(
	state: HelpOverlayState,
	screenWidth: number,
	screenHeight: number,
): HelpRenderData {
	const sections = getKeyBindings(state.context);
	const { width, height } = calculateBoxDimensions(sections);

	const boxWidth = Math.min(width, screenWidth - 4);
	const boxHeight = Math.min(height, screenHeight - 4);
	const boxX = Math.floor((screenWidth - boxWidth) / 2);
	const boxY = Math.floor((screenHeight - boxHeight) / 2);

	return {
		title: HELP_TITLE,
		sections,
		footer: HELP_FOOTER,
		boxWidth,
		boxHeight,
		boxX,
		boxY,
	};
}

/**
 * Gets render data for the poker hands reference.
 *
 * @param handLevels - Optional hand levels
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Render data
 */
export function getPokerHandsRenderData(
	handLevels: Partial<Record<HandType, number>>,
	screenWidth: number,
	screenHeight: number,
): {
	title: string;
	hands: readonly PokerHandInfo[];
	footer: string;
	boxWidth: number;
	boxHeight: number;
	boxX: number;
	boxY: number;
} {
	const hands = getPokerHandInfo(handLevels);

	// Calculate dimensions
	let maxWidth = MIN_BOX_WIDTH;
	for (const hand of hands) {
		const line = formatPokerHand(hand);
		maxWidth = Math.max(maxWidth, line.length + BOX_PADDING * 2 + 4);
	}

	const boxWidth = Math.min(maxWidth, screenWidth - 4);
	const boxHeight = Math.min(hands.length + 6, screenHeight - 4);
	const boxX = Math.floor((screenWidth - boxWidth) / 2);
	const boxY = Math.floor((screenHeight - boxHeight) / 2);

	return {
		title: POKER_HANDS_TITLE,
		hands,
		footer: HELP_FOOTER,
		boxWidth,
		boxHeight,
		boxX,
		boxY,
	};
}

// =============================================================================
// BOX DRAWING
// =============================================================================

export interface BoxLine {
	readonly text: string;
	readonly x: number;
	readonly y: number;
}

/**
 * Creates box border lines.
 *
 * @param x - Box X position
 * @param y - Box Y position
 * @param width - Box width
 * @param height - Box height
 * @returns Array of box lines
 */
export function createBoxLines(
	x: number,
	y: number,
	width: number,
	height: number,
): readonly BoxLine[] {
	const lines: BoxLine[] = [];

	// Top border
	lines.push({
		text: '┌' + '─'.repeat(width - 2) + '┐',
		x,
		y,
	});

	// Side borders
	for (let i = 1; i < height - 1; i++) {
		lines.push({
			text: '│' + ' '.repeat(width - 2) + '│',
			x,
			y: y + i,
		});
	}

	// Bottom border
	lines.push({
		text: '└' + '─'.repeat(width - 2) + '┘',
		x,
		y: y + height - 1,
	});

	return lines;
}

/**
 * Creates a horizontal separator line.
 *
 * @param x - X position
 * @param y - Y position
 * @param width - Line width
 * @returns Box line
 */
export function createSeparatorLine(x: number, y: number, width: number): BoxLine {
	return {
		text: '├' + '─'.repeat(width - 2) + '┤',
		x,
		y,
	};
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Checks if a key should toggle help.
 *
 * @param key - Key name
 * @returns True if key toggles help
 */
export function isHelpKey(key: string): boolean {
	return key === '?' || key === 'f1';
}

/**
 * Checks if a key should toggle poker hands.
 *
 * @param key - Key name
 * @returns True if key toggles poker hands
 */
export function isPokerHandsKey(key: string): boolean {
	return key === 'h' || key === 'H';
}

/**
 * Checks if a key should dismiss the overlay.
 *
 * @param key - Key name
 * @returns True if key dismisses
 */
export function isDismissKey(key: string): boolean {
	// Most keys dismiss the overlay
	return key !== '?' && key !== 'f1';
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if the help overlay is visible.
 *
 * @param state - Help overlay state
 * @returns True if visible
 */
export function isHelpVisible(state: HelpOverlayState): boolean {
	return state.visible;
}

/**
 * Checks if showing poker hands reference.
 *
 * @param state - Help overlay state
 * @returns True if showing poker hands
 */
export function isShowingPokerHands(state: HelpOverlayState): boolean {
	return state.visible && state.showingPokerHands;
}

/**
 * Gets the title for the current overlay.
 *
 * @param state - Help overlay state
 * @returns Title string
 */
export function getOverlayTitle(state: HelpOverlayState): string {
	return state.showingPokerHands ? POKER_HANDS_TITLE : HELP_TITLE;
}
