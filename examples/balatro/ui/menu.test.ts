/**
 * Tests for main menu and title screen
 */

import { describe, expect, it } from 'vitest';
import {
	createMenuState,
	getMenuItems,
	getMenuItemCount,
	navigateUp,
	navigateDown,
	getSelectedItem,
	selectMenuItem,
	handleBack,
	calculateTitleLayout,
	centerX,
	titleCenterX,
	getTitleRenderData,
	getOptionsRenderData,
	processMenuInput,
	keyToMenuInput,
	isOnTitleScreen,
	isOnOptionsScreen,
	shouldStartGame,
	TITLE_ART,
	TITLE_WIDTH,
	SUBTITLE,
	FOOTER_TEXT,
} from './menu';
import type { MenuState } from './menu';

describe('createMenuState', () => {
	it('creates initial menu state', () => {
		const state = createMenuState();

		expect(state.screen).toBe('title');
		expect(state.selectedIndex).toBe(0);
		expect(state.soundEnabled).toBe(true);
		expect(state.cardStyle).toBe('classic');
	});
});

describe('getMenuItems', () => {
	it('returns main menu items for title screen', () => {
		const state = createMenuState();
		const items = getMenuItems(state);

		expect(items.length).toBe(4);
		expect(items[0]?.id).toBe('new_run');
		expect(items[1]?.id).toBe('options');
		expect(items[2]?.id).toBe('collection');
		expect(items[3]?.id).toBe('quit');
	});

	it('returns options menu items for options screen', () => {
		const state: MenuState = { ...createMenuState(), screen: 'options' };
		const items = getMenuItems(state);

		expect(items.length).toBe(4);
		expect(items[0]?.id).toBe('sound');
		expect(items[3]?.id).toBe('back');
	});

	it('returns empty for other screens', () => {
		const state: MenuState = { ...createMenuState(), screen: 'starting_run' };
		const items = getMenuItems(state);

		expect(items.length).toBe(0);
	});
});

describe('getMenuItemCount', () => {
	it('returns correct count', () => {
		const state = createMenuState();
		expect(getMenuItemCount(state)).toBe(4);
	});
});

describe('navigateUp', () => {
	it('moves selection up', () => {
		const state: MenuState = { ...createMenuState(), selectedIndex: 1 };
		const newState = navigateUp(state);

		expect(newState.selectedIndex).toBe(0);
	});

	it('wraps around to bottom', () => {
		const state = createMenuState(); // selectedIndex: 0
		const newState = navigateUp(state);

		expect(newState.selectedIndex).toBe(3); // quit
	});

	it('skips disabled items', () => {
		// Collection is disabled at index 2
		const state: MenuState = { ...createMenuState(), selectedIndex: 3 };
		const newState = navigateUp(state);

		// Should skip collection (index 2) and go to options (index 1)
		expect(newState.selectedIndex).toBe(1);
	});
});

describe('navigateDown', () => {
	it('moves selection down', () => {
		const state = createMenuState(); // selectedIndex: 0
		const newState = navigateDown(state);

		expect(newState.selectedIndex).toBe(1);
	});

	it('wraps around to top', () => {
		const state: MenuState = { ...createMenuState(), selectedIndex: 3 };
		const newState = navigateDown(state);

		expect(newState.selectedIndex).toBe(0);
	});

	it('skips disabled items', () => {
		// Collection is disabled at index 2
		const state: MenuState = { ...createMenuState(), selectedIndex: 1 };
		const newState = navigateDown(state);

		// Should skip collection (index 2) and go to quit (index 3)
		expect(newState.selectedIndex).toBe(3);
	});
});

describe('getSelectedItem', () => {
	it('returns selected item', () => {
		const state: MenuState = { ...createMenuState(), selectedIndex: 1 };
		const item = getSelectedItem(state);

		expect(item?.id).toBe('options');
	});

	it('returns null for invalid index', () => {
		const state: MenuState = { ...createMenuState(), selectedIndex: 99 };
		const item = getSelectedItem(state);

		expect(item).toBeNull();
	});
});

describe('selectMenuItem', () => {
	it('opens deck select on new_run', () => {
		const state = createMenuState(); // new_run selected
		const [newState, action] = selectMenuItem(state);

		expect(action.type).toBe('open_deck_select');
		expect(newState.screen).toBe('deck_select');
	});

	it('opens options', () => {
		const state: MenuState = { ...createMenuState(), selectedIndex: 1 };
		const [newState, action] = selectMenuItem(state);

		expect(action.type).toBe('open_options');
		expect(newState.screen).toBe('options');
		expect(newState.selectedIndex).toBe(0);
	});

	it('quits', () => {
		const state: MenuState = { ...createMenuState(), selectedIndex: 3 };
		const [, action] = selectMenuItem(state);

		expect(action.type).toBe('quit');
	});

	it('toggles sound in options', () => {
		const state: MenuState = {
			...createMenuState(),
			screen: 'options',
			selectedIndex: 0,
			soundEnabled: true,
		};
		const [newState, action] = selectMenuItem(state);

		expect(action.type).toBe('toggle_sound');
		expect(newState.soundEnabled).toBe(false);
	});

	it('cycles card style in options', () => {
		const state: MenuState = {
			...createMenuState(),
			screen: 'options',
			selectedIndex: 1,
			cardStyle: 'classic',
		};
		const [newState, action] = selectMenuItem(state);

		expect(action.type).toBe('cycle_card_style');
		expect(newState.cardStyle).toBe('modern');
	});

	it('goes back from options', () => {
		const state: MenuState = {
			...createMenuState(),
			screen: 'options',
			selectedIndex: 3,
		};
		const [newState, action] = selectMenuItem(state);

		expect(action.type).toBe('back_to_title');
		expect(newState.screen).toBe('title');
	});
});

describe('handleBack', () => {
	it('goes to title from options', () => {
		const state: MenuState = { ...createMenuState(), screen: 'options' };
		const newState = handleBack(state);

		expect(newState.screen).toBe('title');
	});

	it('does nothing on title', () => {
		const state = createMenuState();
		const newState = handleBack(state);

		expect(newState.screen).toBe('title');
	});
});

describe('calculateTitleLayout', () => {
	it('calculates layout for standard terminal', () => {
		const layout = calculateTitleLayout(80, 24);

		expect(layout.width).toBe(80);
		expect(layout.height).toBe(24);
		expect(layout.titleY).toBeGreaterThanOrEqual(2);
		expect(layout.subtitleY).toBeGreaterThan(layout.titleY);
		expect(layout.menuStartY).toBeGreaterThan(layout.subtitleY);
		expect(layout.footerY).toBe(22);
	});

	it('adjusts for small terminals', () => {
		const layout = calculateTitleLayout(40, 12);

		expect(layout.titleY).toBe(2);
		expect(layout.footerY).toBe(10);
	});
});

describe('centerX', () => {
	it('centers text on screen', () => {
		const x = centerX('Hello', 80);
		expect(x).toBe(37); // (80 - 5) / 2 = 37.5 → 37
	});

	it('returns 0 for text wider than screen', () => {
		const x = centerX('This is a very long text', 10);
		expect(x).toBe(0);
	});
});

describe('titleCenterX', () => {
	it('centers title on screen', () => {
		const x = titleCenterX(80);
		expect(x).toBe(Math.floor((80 - TITLE_WIDTH) / 2));
	});
});

describe('getTitleRenderData', () => {
	it('returns render data for title screen', () => {
		const state = createMenuState();
		const data = getTitleRenderData(state, 80, 24);

		expect(data.titleLines.length).toBe(TITLE_ART.length);
		expect(data.subtitle.text).toBe(SUBTITLE);
		expect(data.menuItems.length).toBe(4);
		expect(data.footer.text).toBe(FOOTER_TEXT);
	});

	it('marks selected item', () => {
		const state: MenuState = { ...createMenuState(), selectedIndex: 1 };
		const data = getTitleRenderData(state, 80, 24);

		expect(data.menuItems[0]?.selected).toBe(false);
		expect(data.menuItems[1]?.selected).toBe(true);
	});

	it('includes selection indicators', () => {
		const state = createMenuState();
		const data = getTitleRenderData(state, 80, 24);

		expect(data.menuItems[0]?.text).toContain('>');
		expect(data.menuItems[1]?.text).not.toContain('>');
	});
});

describe('getOptionsRenderData', () => {
	it('returns render data for options screen', () => {
		const state: MenuState = { ...createMenuState(), screen: 'options' };
		const data = getOptionsRenderData(state, 80, 24);

		expect(data.title.text).toContain('OPTIONS');
		expect(data.items.length).toBe(4);
		expect(data.footer.text).toContain('Enter');
	});

	it('shows current setting values', () => {
		const state: MenuState = {
			...createMenuState(),
			screen: 'options',
			soundEnabled: true,
			cardStyle: 'modern',
		};
		const data = getOptionsRenderData(state, 80, 24);

		expect(data.items[0]?.value).toBe('ON');
		expect(data.items[1]?.value).toBe('MODERN');
	});
});

describe('processMenuInput', () => {
	it('handles up input', () => {
		const state: MenuState = { ...createMenuState(), selectedIndex: 1 };
		const [newState, action] = processMenuInput(state, { type: 'up' });

		expect(newState.selectedIndex).toBe(0);
		expect(action.type).toBe('none');
	});

	it('handles down input', () => {
		const state = createMenuState();
		const [newState, action] = processMenuInput(state, { type: 'down' });

		expect(newState.selectedIndex).toBe(1);
		expect(action.type).toBe('none');
	});

	it('handles select input (goes to deck select)', () => {
		const state = createMenuState();
		const [newState, action] = processMenuInput(state, { type: 'select' });

		expect(action.type).toBe('open_deck_select');
		expect(newState.screen).toBe('deck_select');
	});

	it('handles back input', () => {
		const state: MenuState = { ...createMenuState(), screen: 'options' };
		const [newState] = processMenuInput(state, { type: 'back' });

		expect(newState.screen).toBe('title');
	});
});

describe('keyToMenuInput', () => {
	it('maps arrow keys', () => {
		expect(keyToMenuInput('up')?.type).toBe('up');
		expect(keyToMenuInput('down')?.type).toBe('down');
	});

	it('maps vim keys', () => {
		expect(keyToMenuInput('k')?.type).toBe('up');
		expect(keyToMenuInput('j')?.type).toBe('down');
	});

	it('maps selection keys', () => {
		expect(keyToMenuInput('return')?.type).toBe('select');
		expect(keyToMenuInput('enter')?.type).toBe('select');
		expect(keyToMenuInput('space')?.type).toBe('select');
	});

	it('maps back keys', () => {
		expect(keyToMenuInput('escape')?.type).toBe('back');
		expect(keyToMenuInput('q')?.type).toBe('back');
	});

	it('returns null for unknown keys', () => {
		expect(keyToMenuInput('x')).toBeNull();
		expect(keyToMenuInput('ctrl+c')).toBeNull();
	});
});

describe('isOnTitleScreen', () => {
	it('returns true on title', () => {
		expect(isOnTitleScreen(createMenuState())).toBe(true);
	});

	it('returns false on options', () => {
		const state: MenuState = { ...createMenuState(), screen: 'options' };
		expect(isOnTitleScreen(state)).toBe(false);
	});
});

describe('isOnOptionsScreen', () => {
	it('returns true on options', () => {
		const state: MenuState = { ...createMenuState(), screen: 'options' };
		expect(isOnOptionsScreen(state)).toBe(true);
	});

	it('returns false on title', () => {
		expect(isOnOptionsScreen(createMenuState())).toBe(false);
	});
});

describe('shouldStartGame', () => {
	it('returns true for starting_run', () => {
		const state: MenuState = { ...createMenuState(), screen: 'starting_run' };
		expect(shouldStartGame(state)).toBe(true);
	});

	it('returns false for other screens', () => {
		expect(shouldStartGame(createMenuState())).toBe(false);
	});
});

describe('constants', () => {
	it('has valid title art', () => {
		expect(TITLE_ART.length).toBeGreaterThan(0);
		expect(TITLE_ART[0]?.length).toBe(TITLE_WIDTH);
	});

	it('has subtitle and footer', () => {
		expect(SUBTITLE.length).toBeGreaterThan(0);
		expect(FOOTER_TEXT.length).toBeGreaterThan(0);
	});
});
