/**
 * Keyboard Input Handling
 *
 * Processes keyboard input for card selection and game actions.
 * Input is processed FIRST every frame to ensure responsiveness.
 *
 * @module balatro/input/keyboard
 */

// =============================================================================
// TYPES
// =============================================================================

export type KeyAction =
	// Card selection
	| 'SELECT_1'
	| 'SELECT_2'
	| 'SELECT_3'
	| 'SELECT_4'
	| 'SELECT_5'
	| 'SELECT_6'
	| 'SELECT_7'
	| 'SELECT_8'
	| 'CURSOR_LEFT'
	| 'CURSOR_RIGHT'
	| 'TOGGLE_CURRENT'
	| 'CYCLE_NEXT'
	// Game actions
	| 'PLAY_CARDS'
	| 'DISCARD_CARDS'
	| 'DRAW_CARDS'
	| 'REROLL_SHOP'
	// Navigation
	| 'CANCEL'
	| 'QUIT'
	| 'HELP'
	// Selection shortcuts
	| 'SELECT_ALL'
	| 'SELECT_NONE';

export interface KeyBinding {
	readonly key: string;
	readonly action: KeyAction;
	readonly ctrl?: boolean;
	readonly shift?: boolean;
	readonly meta?: boolean;
}

export interface KeyEvent {
	readonly key: string;
	readonly ctrl: boolean;
	readonly shift: boolean;
	readonly meta: boolean;
	readonly raw: string;
}

export interface InputState {
	readonly cursorPosition: number;
	readonly selectedCards: readonly number[];
	readonly pendingActions: readonly KeyAction[];
}

// =============================================================================
// DEFAULT KEY BINDINGS
// =============================================================================

const DEFAULT_BINDINGS: readonly KeyBinding[] = [
	// Number keys for direct card selection
	{ key: '1', action: 'SELECT_1' },
	{ key: '2', action: 'SELECT_2' },
	{ key: '3', action: 'SELECT_3' },
	{ key: '4', action: 'SELECT_4' },
	{ key: '5', action: 'SELECT_5' },
	{ key: '6', action: 'SELECT_6' },
	{ key: '7', action: 'SELECT_7' },
	{ key: '8', action: 'SELECT_8' },

	// Cursor navigation
	{ key: 'left', action: 'CURSOR_LEFT' },
	{ key: 'right', action: 'CURSOR_RIGHT' },
	{ key: 'h', action: 'CURSOR_LEFT' },
	{ key: 'l', action: 'CURSOR_RIGHT' },

	// Selection
	{ key: 'space', action: 'TOGGLE_CURRENT' },
	{ key: 'tab', action: 'CYCLE_NEXT' },

	// Game actions
	{ key: 'return', action: 'PLAY_CARDS' },
	{ key: 'enter', action: 'PLAY_CARDS' },
	{ key: 'd', action: 'DISCARD_CARDS' },
	{ key: 'n', action: 'DRAW_CARDS' },
	{ key: 'r', action: 'REROLL_SHOP' },

	// Navigation
	{ key: 'escape', action: 'CANCEL' },
	{ key: 'q', action: 'QUIT' },
	{ key: '?', action: 'HELP' },

	// Selection shortcuts
	{ key: 'a', action: 'SELECT_ALL', ctrl: true },
	{ key: 'u', action: 'SELECT_NONE', ctrl: true },
];

// =============================================================================
// KEY PARSING
// =============================================================================

/**
 * Parses raw terminal input into a structured KeyEvent.
 *
 * @param raw - Raw input buffer from stdin
 * @returns Parsed key event
 */
export function parseKeyEvent(raw: Buffer | string): KeyEvent {
	const str = typeof raw === 'string' ? raw : raw.toString();

	// Parse key name first to identify special keys
	const key = parseKeyName(str);

	// Check for control characters, but exclude special keys that happen to be control chars
	const isSpecialKey = ['return', 'tab', 'escape', 'backspace'].includes(key);
	const ctrl = str.charCodeAt(0) < 32 && str.length === 1 && !isSpecialKey;
	const meta = false; // Meta detection depends on terminal
	const shift = str.length === 1 && str === str.toUpperCase() && str !== str.toLowerCase();

	return { key, ctrl, shift, meta, raw: str };
}

/**
 * Parses raw input into a human-readable key name.
 */
function parseKeyName(str: string): string {
	// Control+C
	if (str === '\x03') return 'c';

	// Escape sequences
	if (str.startsWith('\x1b')) {
		// Arrow keys
		if (str === '\x1b[A') return 'up';
		if (str === '\x1b[B') return 'down';
		if (str === '\x1b[C') return 'right';
		if (str === '\x1b[D') return 'left';

		// Home/End
		if (str === '\x1b[H' || str === '\x1b[1~') return 'home';
		if (str === '\x1b[F' || str === '\x1b[4~') return 'end';

		// Page Up/Down
		if (str === '\x1b[5~') return 'pageup';
		if (str === '\x1b[6~') return 'pagedown';

		// Delete
		if (str === '\x1b[3~') return 'delete';

		// Function keys
		if (str === '\x1bOP' || str === '\x1b[11~') return 'f1';
		if (str === '\x1bOQ' || str === '\x1b[12~') return 'f2';
		if (str === '\x1bOR' || str === '\x1b[13~') return 'f3';
		if (str === '\x1bOS' || str === '\x1b[14~') return 'f4';

		// Just escape
		if (str === '\x1b') return 'escape';

		return 'unknown';
	}

	// Special characters
	if (str === '\r' || str === '\n') return 'return';
	if (str === '\t') return 'tab';
	if (str === ' ') return 'space';
	if (str === '\x7f') return 'backspace';

	// Regular characters
	return str.toLowerCase();
}

// =============================================================================
// INPUT STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial input state.
 */
export function createInputState(): InputState {
	return {
		cursorPosition: 0,
		selectedCards: [],
		pendingActions: [],
	};
}

/**
 * Processes a key event and returns the matching action.
 *
 * @param event - Parsed key event
 * @param bindings - Key bindings to use
 * @returns Matching action or null
 */
export function getActionForKey(
	event: KeyEvent,
	bindings: readonly KeyBinding[] = DEFAULT_BINDINGS,
): KeyAction | null {
	for (const binding of bindings) {
		if (binding.key !== event.key) continue;
		if (binding.ctrl && !event.ctrl) continue;
		if (binding.shift && !event.shift) continue;
		if (binding.meta && !event.meta) continue;

		// If binding requires modifier but event doesn't have it, skip
		if (!binding.ctrl && event.ctrl && event.key !== 'c') continue;

		return binding.action;
	}

	return null;
}

/**
 * Updates input state based on an action.
 *
 * @param state - Current input state
 * @param action - Action to process
 * @param handSize - Number of cards in hand
 * @returns New input state
 */
export function processAction(
	state: InputState,
	action: KeyAction,
	handSize: number,
): InputState {
	switch (action) {
		// Cursor movement
		case 'CURSOR_LEFT':
			return {
				...state,
				cursorPosition: Math.max(0, state.cursorPosition - 1),
			};

		case 'CURSOR_RIGHT':
			return {
				...state,
				cursorPosition: Math.min(handSize - 1, state.cursorPosition + 1),
			};

		case 'CYCLE_NEXT':
			return {
				...state,
				cursorPosition: (state.cursorPosition + 1) % handSize,
			};

		// Direct card selection (1-8)
		case 'SELECT_1':
		case 'SELECT_2':
		case 'SELECT_3':
		case 'SELECT_4':
		case 'SELECT_5':
		case 'SELECT_6':
		case 'SELECT_7':
		case 'SELECT_8': {
			const index = parseInt(action.replace('SELECT_', ''), 10) - 1;
			if (index >= handSize) return state;
			return toggleCard(state, index);
		}

		// Toggle current cursor position
		case 'TOGGLE_CURRENT':
			if (handSize === 0) return state;
			return toggleCard(state, state.cursorPosition);

		// Selection shortcuts
		case 'SELECT_ALL':
			return {
				...state,
				selectedCards: Array.from({ length: handSize }, (_, i) => i),
			};

		case 'SELECT_NONE':
			return {
				...state,
				selectedCards: [],
			};

		// Game actions queue as pending
		case 'PLAY_CARDS':
		case 'DISCARD_CARDS':
		case 'DRAW_CARDS':
		case 'REROLL_SHOP':
		case 'CANCEL':
		case 'QUIT':
		case 'HELP':
			return {
				...state,
				pendingActions: [...state.pendingActions, action],
			};

		default:
			return state;
	}
}

/**
 * Toggles a card's selection state.
 */
function toggleCard(state: InputState, index: number): InputState {
	const isSelected = state.selectedCards.includes(index);

	return {
		...state,
		cursorPosition: index,
		selectedCards: isSelected
			? state.selectedCards.filter(i => i !== index)
			: [...state.selectedCards, index].sort((a, b) => a - b),
	};
}

/**
 * Clears pending actions from the state.
 */
export function clearPendingActions(state: InputState): InputState {
	return {
		...state,
		pendingActions: [],
	};
}

/**
 * Clears card selections.
 */
export function clearSelections(state: InputState): InputState {
	return {
		...state,
		selectedCards: [],
	};
}

/**
 * Gets the first pending action (FIFO).
 */
export function getNextPendingAction(state: InputState): KeyAction | null {
	return state.pendingActions[0] ?? null;
}

/**
 * Consumes the first pending action.
 */
export function consumePendingAction(state: InputState): InputState {
	return {
		...state,
		pendingActions: state.pendingActions.slice(1),
	};
}

// =============================================================================
// INPUT HANDLER
// =============================================================================

export interface KeyboardHandler {
	readonly state: InputState;
	processInput(raw: Buffer | string): InputState;
	setHandSize(size: number): void;
}

/**
 * Creates a keyboard input handler.
 *
 * @param bindings - Custom key bindings (optional)
 * @returns Handler with state and processing methods
 */
export function createKeyboardHandler(
	bindings: readonly KeyBinding[] = DEFAULT_BINDINGS,
): KeyboardHandler {
	let state = createInputState();
	let handSize = 8;

	return {
		get state() {
			return state;
		},

		processInput(raw: Buffer | string): InputState {
			const event = parseKeyEvent(raw);
			const action = getActionForKey(event, bindings);

			if (action) {
				state = processAction(state, action, handSize);
			}

			return state;
		},

		setHandSize(size: number): void {
			handSize = size;
			// Clamp cursor position if needed
			if (state.cursorPosition >= size) {
				state = {
					...state,
					cursorPosition: Math.max(0, size - 1),
				};
			}
			// Remove invalid selections
			state = {
				...state,
				selectedCards: state.selectedCards.filter(i => i < size),
			};
		},
	};
}

/**
 * Gets the default key bindings.
 */
export function getDefaultBindings(): readonly KeyBinding[] {
	return DEFAULT_BINDINGS;
}
