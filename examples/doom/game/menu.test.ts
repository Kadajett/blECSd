/**
 * Tests for the menu state machine.
 *
 * @module game/menu.test
 */

import { describe, expect, it } from 'vitest';
import {
	createMenuState,
	isMenuActive,
	MAIN_MENU_ITEMS,
	MenuMode,
	SKILL_NAMES,
	SkillLevel,
	updateMenu,
} from './menu.js';

// ─── createMenuState ──────────────────────────────────────────────

describe('createMenuState', () => {
	it('starts in TITLE mode', () => {
		const menu = createMenuState();
		expect(menu.mode).toBe(MenuMode.TITLE);
	});

	it('starts with item 0 selected', () => {
		const menu = createMenuState();
		expect(menu.selectedItem).toBe(0);
	});

	it('defaults to MEDIUM skill', () => {
		const menu = createMenuState();
		expect(menu.skill).toBe(SkillLevel.MEDIUM);
	});

	it('starts with ticCount 0', () => {
		const menu = createMenuState();
		expect(menu.ticCount).toBe(0);
	});
});

// ─── isMenuActive ─────────────────────────────────────────────────

describe('isMenuActive', () => {
	it('returns true in TITLE mode', () => {
		const menu = createMenuState();
		expect(isMenuActive(menu)).toBe(true);
	});

	it('returns true in SKILL_SELECT mode', () => {
		const menu = createMenuState();
		menu.mode = MenuMode.SKILL_SELECT;
		expect(isMenuActive(menu)).toBe(true);
	});

	it('returns false in PLAYING mode', () => {
		const menu = createMenuState();
		menu.mode = MenuMode.PLAYING;
		expect(isMenuActive(menu)).toBe(false);
	});
});

// ─── Title Menu Navigation ────────────────────────────────────────

describe('title menu navigation', () => {
	it('increments ticCount each update', () => {
		const menu = createMenuState();
		updateMenu(menu, new Set());
		expect(menu.ticCount).toBe(1);
		updateMenu(menu, new Set());
		expect(menu.ticCount).toBe(2);
	});

	it('moves down with down key', () => {
		const menu = createMenuState();
		updateMenu(menu, new Set(['down']));
		expect(menu.selectedItem).toBe(1);
	});

	it('moves down with s key', () => {
		const menu = createMenuState();
		updateMenu(menu, new Set(['s']));
		expect(menu.selectedItem).toBe(1);
	});

	it('moves up with up key', () => {
		const menu = createMenuState();
		menu.selectedItem = 1;
		updateMenu(menu, new Set(['up']));
		expect(menu.selectedItem).toBe(0);
	});

	it('moves up with w key', () => {
		const menu = createMenuState();
		menu.selectedItem = 1;
		updateMenu(menu, new Set(['w']));
		expect(menu.selectedItem).toBe(0);
	});

	it('wraps from bottom to top', () => {
		const menu = createMenuState();
		menu.selectedItem = MAIN_MENU_ITEMS.length - 1;
		updateMenu(menu, new Set(['down']));
		expect(menu.selectedItem).toBe(0);
	});

	it('wraps from top to bottom', () => {
		const menu = createMenuState();
		menu.selectedItem = 0;
		updateMenu(menu, new Set(['up']));
		expect(menu.selectedItem).toBe(MAIN_MENU_ITEMS.length - 1);
	});

	it('does not change mode without confirm', () => {
		const menu = createMenuState();
		const result = updateMenu(menu, new Set(['down']));
		expect(menu.mode).toBe(MenuMode.TITLE);
		expect(result.startGame).toBe(false);
		expect(result.quit).toBe(false);
	});
});

// ─── Title Menu Selection ─────────────────────────────────────────

describe('title menu selection', () => {
	it('selects NEW GAME with return key', () => {
		const menu = createMenuState();
		menu.selectedItem = 0; // NEW GAME
		const result = updateMenu(menu, new Set(['return']));
		expect(menu.mode).toBe(MenuMode.SKILL_SELECT);
		expect(result.startGame).toBe(false);
	});

	it('selects NEW GAME with space key', () => {
		const menu = createMenuState();
		menu.selectedItem = 0;
		const result = updateMenu(menu, new Set(['space']));
		expect(menu.mode).toBe(MenuMode.SKILL_SELECT);
		expect(result.startGame).toBe(false);
	});

	it('defaults to MEDIUM skill when entering skill select', () => {
		const menu = createMenuState();
		menu.selectedItem = 0;
		updateMenu(menu, new Set(['return']));
		expect(menu.selectedItem).toBe(SkillLevel.MEDIUM);
	});

	it('selects QUIT with return key', () => {
		const menu = createMenuState();
		menu.selectedItem = 1; // QUIT
		const result = updateMenu(menu, new Set(['return']));
		expect(result.quit).toBe(true);
		expect(result.startGame).toBe(false);
	});
});

// ─── Skill Menu Navigation ───────────────────────────────────────

describe('skill menu navigation', () => {
	function skillMenu() {
		const menu = createMenuState();
		menu.mode = MenuMode.SKILL_SELECT;
		menu.selectedItem = SkillLevel.MEDIUM;
		return menu;
	}

	it('moves down with down key', () => {
		const menu = skillMenu();
		updateMenu(menu, new Set(['down']));
		expect(menu.selectedItem).toBe(SkillLevel.HARD);
	});

	it('moves up with up key', () => {
		const menu = skillMenu();
		updateMenu(menu, new Set(['up']));
		expect(menu.selectedItem).toBe(SkillLevel.EASY);
	});

	it('wraps from bottom to top', () => {
		const menu = skillMenu();
		menu.selectedItem = SKILL_NAMES.length - 1;
		updateMenu(menu, new Set(['down']));
		expect(menu.selectedItem).toBe(0);
	});

	it('wraps from top to bottom', () => {
		const menu = skillMenu();
		menu.selectedItem = 0;
		updateMenu(menu, new Set(['up']));
		expect(menu.selectedItem).toBe(SKILL_NAMES.length - 1);
	});
});

// ─── Skill Menu Selection ─────────────────────────────────────────

describe('skill menu selection', () => {
	it('starts the game with return key', () => {
		const menu = createMenuState();
		menu.mode = MenuMode.SKILL_SELECT;
		menu.selectedItem = SkillLevel.HARD;
		const result = updateMenu(menu, new Set(['return']));
		expect(result.startGame).toBe(true);
		expect(result.skill).toBe(SkillLevel.HARD);
		expect(menu.mode).toBe(MenuMode.PLAYING);
	});

	it('starts the game with space key', () => {
		const menu = createMenuState();
		menu.mode = MenuMode.SKILL_SELECT;
		menu.selectedItem = SkillLevel.BABY;
		const result = updateMenu(menu, new Set(['space']));
		expect(result.startGame).toBe(true);
		expect(result.skill).toBe(SkillLevel.BABY);
	});

	it('goes back to title with escape', () => {
		const menu = createMenuState();
		menu.mode = MenuMode.SKILL_SELECT;
		menu.selectedItem = SkillLevel.HARD;
		const result = updateMenu(menu, new Set(['escape']));
		expect(menu.mode).toBe(MenuMode.TITLE);
		expect(menu.selectedItem).toBe(0);
		expect(result.startGame).toBe(false);
	});

	it('sets skill on menu state when selected', () => {
		const menu = createMenuState();
		menu.mode = MenuMode.SKILL_SELECT;
		menu.selectedItem = SkillLevel.NIGHTMARE;
		updateMenu(menu, new Set(['return']));
		expect(menu.skill).toBe(SkillLevel.NIGHTMARE);
	});
});

// ─── PLAYING Mode ─────────────────────────────────────────────────

describe('PLAYING mode', () => {
	it('returns neutral result in PLAYING mode', () => {
		const menu = createMenuState();
		menu.mode = MenuMode.PLAYING;
		const result = updateMenu(menu, new Set(['return']));
		expect(result.startGame).toBe(false);
		expect(result.quit).toBe(false);
	});

	it('still increments ticCount in PLAYING mode', () => {
		const menu = createMenuState();
		menu.mode = MenuMode.PLAYING;
		updateMenu(menu, new Set());
		expect(menu.ticCount).toBe(1);
	});
});

// ─── Full Flow ────────────────────────────────────────────────────

describe('full menu flow', () => {
	it('title -> skill select -> playing', () => {
		const menu = createMenuState();

		// Start in TITLE
		expect(isMenuActive(menu)).toBe(true);
		expect(menu.mode).toBe(MenuMode.TITLE);

		// Select NEW GAME
		updateMenu(menu, new Set(['return']));
		expect(menu.mode).toBe(MenuMode.SKILL_SELECT);
		expect(isMenuActive(menu)).toBe(true);

		// Pick ULTRA-VIOLENCE
		menu.selectedItem = SkillLevel.HARD;
		const result = updateMenu(menu, new Set(['return']));
		expect(menu.mode).toBe(MenuMode.PLAYING);
		expect(result.startGame).toBe(true);
		expect(result.skill).toBe(SkillLevel.HARD);
		expect(isMenuActive(menu)).toBe(false);
	});

	it('title -> skill select -> back to title -> quit', () => {
		const menu = createMenuState();

		// NEW GAME
		updateMenu(menu, new Set(['return']));
		expect(menu.mode).toBe(MenuMode.SKILL_SELECT);

		// ESC back
		updateMenu(menu, new Set(['escape']));
		expect(menu.mode).toBe(MenuMode.TITLE);
		expect(menu.selectedItem).toBe(0);

		// Move to QUIT and select
		updateMenu(menu, new Set(['down']));
		expect(menu.selectedItem).toBe(1);
		const result = updateMenu(menu, new Set(['return']));
		expect(result.quit).toBe(true);
	});
});
