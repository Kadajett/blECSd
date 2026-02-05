/**
 * Title screen and menu state management.
 *
 * Handles the main menu (New Game, Quit) and skill selection screen.
 * The game starts in TITLE mode and transitions to PLAYING after
 * the player selects a skill level.
 *
 * @module game/menu
 */

// ─── Menu Mode ──────────────────────────────────────────────────

/** Game modes for the menu system. */
export const MenuMode = {
	/** Title screen with main menu. */
	TITLE: 0,
	/** Skill level selection. */
	SKILL_SELECT: 1,
	/** In-game (menu dismissed). */
	PLAYING: 2,
} as const;

// ─── Skill Levels ───────────────────────────────────────────────

/** Doom skill levels matching the original game. */
export const SkillLevel = {
	BABY: 0,
	EASY: 1,
	MEDIUM: 2,
	HARD: 3,
	NIGHTMARE: 4,
} as const;

/** Display names for each skill level. */
export const SKILL_NAMES: readonly string[] = [
	"I'M TOO YOUNG TO DIE",
	'HEY, NOT TOO ROUGH',
	'HURT ME PLENTY',
	'ULTRA-VIOLENCE',
	'NIGHTMARE!',
];

// ─── Main Menu Items ────────────────────────────────────────────

/** Display names for main menu items. */
export const MAIN_MENU_ITEMS: readonly string[] = [
	'NEW GAME',
	'QUIT',
];

// ─── Menu State ─────────────────────────────────────────────────

/** Mutable menu state. */
export interface MenuState {
	/** Current menu mode. */
	mode: number;
	/** Currently highlighted menu item index. */
	selectedItem: number;
	/** Selected skill level (set when entering game). */
	skill: number;
	/** Tic counter for title screen animation. */
	ticCount: number;
}

/**
 * Create initial menu state at the title screen.
 *
 * @returns Menu state in TITLE mode
 */
export function createMenuState(): MenuState {
	return {
		mode: MenuMode.TITLE,
		selectedItem: 0,
		skill: SkillLevel.MEDIUM,
		ticCount: 0,
	};
}

// ─── Menu Input ─────────────────────────────────────────────────

/** Result of menu input processing. */
export interface MenuResult {
	/** Whether the game should start (transition to PLAYING). */
	startGame: boolean;
	/** Whether the game should quit. */
	quit: boolean;
	/** Selected skill level (valid when startGame is true). */
	skill: number;
}

/**
 * Process input for the current menu mode.
 *
 * @param menu - Mutable menu state
 * @param keys - Set of pressed key names
 * @returns Menu result indicating game start or quit
 */
export function updateMenu(menu: MenuState, keys: Set<string>): MenuResult {
	menu.ticCount++;

	if (menu.mode === MenuMode.TITLE) {
		return updateTitleMenu(menu, keys);
	}
	if (menu.mode === MenuMode.SKILL_SELECT) {
		return updateSkillMenu(menu, keys);
	}

	return { startGame: false, quit: false, skill: menu.skill };
}

/**
 * Process input for the main title menu.
 */
function updateTitleMenu(menu: MenuState, keys: Set<string>): MenuResult {
	const itemCount = MAIN_MENU_ITEMS.length;

	if (keys.has('up') || keys.has('w')) {
		menu.selectedItem = (menu.selectedItem - 1 + itemCount) % itemCount;
	}
	if (keys.has('down') || keys.has('s')) {
		menu.selectedItem = (menu.selectedItem + 1) % itemCount;
	}

	if (keys.has('return') || keys.has('space')) {
		if (menu.selectedItem === 0) {
			// New Game -> go to skill select
			menu.mode = MenuMode.SKILL_SELECT;
			menu.selectedItem = SkillLevel.MEDIUM; // default to Hurt Me Plenty
			return { startGame: false, quit: false, skill: menu.skill };
		}
		if (menu.selectedItem === 1) {
			// Quit
			return { startGame: false, quit: true, skill: menu.skill };
		}
	}

	return { startGame: false, quit: false, skill: menu.skill };
}

/**
 * Process input for the skill selection menu.
 */
function updateSkillMenu(menu: MenuState, keys: Set<string>): MenuResult {
	const itemCount = SKILL_NAMES.length;

	if (keys.has('up') || keys.has('w')) {
		menu.selectedItem = (menu.selectedItem - 1 + itemCount) % itemCount;
	}
	if (keys.has('down') || keys.has('s')) {
		menu.selectedItem = (menu.selectedItem + 1) % itemCount;
	}

	if (keys.has('return') || keys.has('space')) {
		menu.skill = menu.selectedItem;
		menu.mode = MenuMode.PLAYING;
		return { startGame: true, quit: false, skill: menu.skill };
	}

	if (keys.has('escape')) {
		// Go back to main menu
		menu.mode = MenuMode.TITLE;
		menu.selectedItem = 0;
		return { startGame: false, quit: false, skill: menu.skill };
	}

	return { startGame: false, quit: false, skill: menu.skill };
}

/**
 * Check if the menu is active (not in PLAYING mode).
 *
 * @param menu - Menu state
 * @returns true if the menu is showing
 */
export function isMenuActive(menu: MenuState): boolean {
	return menu.mode !== MenuMode.PLAYING;
}
