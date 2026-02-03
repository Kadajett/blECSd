/**
 * Mouse Input Handling
 *
 * Processes mouse input for card selection and UI interaction.
 * Coexists with keyboard input for simultaneous use.
 *
 * @module balatro/input/mouse
 */

// =============================================================================
// TYPES
// =============================================================================

export type MouseButton = 'left' | 'middle' | 'right' | 'none';

export type MouseEventType =
	| 'move'
	| 'down'
	| 'up'
	| 'drag'
	| 'wheel_up'
	| 'wheel_down';

export interface MousePosition {
	readonly x: number;
	readonly y: number;
}

export interface MouseEvent {
	readonly type: MouseEventType;
	readonly button: MouseButton;
	readonly x: number;
	readonly y: number;
	readonly ctrl: boolean;
	readonly shift: boolean;
	readonly meta: boolean;
}

export interface HitRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly id: string;
	readonly zIndex: number;
}

export interface MouseState {
	readonly position: MousePosition;
	readonly buttonDown: MouseButton;
	readonly hoveredId: string | null;
	readonly clickedId: string | null;
	readonly dragStartPosition: MousePosition | null;
	readonly isDragging: boolean;
}

// =============================================================================
// MOUSE EVENT PARSING
// =============================================================================

/**
 * Parses SGR mouse protocol escape sequence.
 *
 * Format: ESC [ < Cb ; Cx ; Cy (M|m)
 * - Cb: button code (0=left, 1=middle, 2=right, 32+=motion, 64+=wheel)
 * - Cx: column (1-based)
 * - Cy: row (1-based)
 * - M: press, m: release
 *
 * @param raw - Raw input from stdin
 * @returns MouseEvent or null if not a mouse event
 */
export function parseMouseEvent(raw: Buffer | string): MouseEvent | null {
	const str = typeof raw === 'string' ? raw : raw.toString();

	// SGR format: \x1b[<Cb;Cx;Cy(M|m)
	const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
	if (sgrMatch) {
		const cb = parseInt(sgrMatch[1] ?? '0', 10);
		const x = parseInt(sgrMatch[2] ?? '1', 10) - 1; // Convert to 0-based
		const y = parseInt(sgrMatch[3] ?? '1', 10) - 1;
		const isPress = sgrMatch[4] === 'M';

		return parseSgrMouseCode(cb, x, y, isPress);
	}

	// X10 format: \x1b[M Cb Cx Cy (legacy, less precise)
	const x10Match = str.match(/\x1b\[M(.)(.)(.)/);
	if (x10Match) {
		const cb = (x10Match[1]?.charCodeAt(0) ?? 32) - 32;
		const x = (x10Match[2]?.charCodeAt(0) ?? 33) - 33;
		const y = (x10Match[3]?.charCodeAt(0) ?? 33) - 33;

		return parseX10MouseCode(cb, x, y);
	}

	return null;
}

/**
 * Parses SGR mouse button code.
 */
function parseSgrMouseCode(
	cb: number,
	x: number,
	y: number,
	isPress: boolean,
): MouseEvent {
	const ctrl = (cb & 16) !== 0;
	const shift = (cb & 4) !== 0;
	const meta = (cb & 8) !== 0;

	// Strip modifiers
	const buttonCode = cb & ~(4 | 8 | 16);

	// Wheel events
	if (buttonCode >= 64) {
		const type = buttonCode === 64 ? 'wheel_up' : 'wheel_down';
		return { type, button: 'none', x, y, ctrl, shift, meta };
	}

	// Motion events
	if (buttonCode >= 32) {
		const motionButton = buttonCode - 32;
		const button = motionButton === 0 ? 'left' : motionButton === 1 ? 'middle' : motionButton === 2 ? 'right' : 'none';
		return { type: button === 'none' ? 'move' : 'drag', button, x, y, ctrl, shift, meta };
	}

	// Button events
	const button = buttonCode === 0 ? 'left' : buttonCode === 1 ? 'middle' : buttonCode === 2 ? 'right' : 'none';
	const type = isPress ? 'down' : 'up';

	return { type, button, x, y, ctrl, shift, meta };
}

/**
 * Parses X10 mouse button code (legacy format).
 */
function parseX10MouseCode(cb: number, x: number, y: number): MouseEvent {
	const ctrl = (cb & 16) !== 0;
	const shift = (cb & 4) !== 0;
	const meta = (cb & 8) !== 0;

	const buttonCode = cb & 3;

	// Button 3 is release in X10
	if (buttonCode === 3) {
		return { type: 'up', button: 'none', x, y, ctrl, shift, meta };
	}

	const button = buttonCode === 0 ? 'left' : buttonCode === 1 ? 'middle' : 'right';

	// Motion bit
	if (cb & 32) {
		return { type: 'drag', button, x, y, ctrl, shift, meta };
	}

	return { type: 'down', button, x, y, ctrl, shift, meta };
}

// =============================================================================
// MOUSE STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial mouse state.
 */
export function createMouseState(): MouseState {
	return {
		position: { x: 0, y: 0 },
		buttonDown: 'none',
		hoveredId: null,
		clickedId: null,
		dragStartPosition: null,
		isDragging: false,
	};
}

/**
 * Updates mouse state based on a mouse event.
 *
 * @param state - Current mouse state
 * @param event - Mouse event to process
 * @param hitTargets - List of hit targets sorted by z-index (highest first)
 * @returns New mouse state
 */
export function updateMouseState(
	state: MouseState,
	event: MouseEvent,
	hitTargets: readonly HitRect[],
): MouseState {
	const newPosition = { x: event.x, y: event.y };

	// Find what we're hovering over
	const hitTarget = findHitTarget(event.x, event.y, hitTargets);
	const hoveredId = hitTarget?.id ?? null;

	switch (event.type) {
		case 'move':
			return {
				...state,
				position: newPosition,
				hoveredId,
			};

		case 'down':
			return {
				...state,
				position: newPosition,
				buttonDown: event.button,
				hoveredId,
				clickedId: null, // Will be set on up
				dragStartPosition: newPosition,
				isDragging: false,
			};

		case 'drag':
			return {
				...state,
				position: newPosition,
				hoveredId,
				isDragging: true,
			};

		case 'up': {
			// Click = down + up on same target without significant drag
			const wasClick = state.buttonDown !== 'none' &&
				!state.isDragging &&
				state.hoveredId === hoveredId;

			return {
				...state,
				position: newPosition,
				buttonDown: 'none',
				hoveredId,
				clickedId: wasClick ? hoveredId : null,
				dragStartPosition: null,
				isDragging: false,
			};
		}

		case 'wheel_up':
		case 'wheel_down':
			return {
				...state,
				position: newPosition,
				hoveredId,
			};

		default:
			return state;
	}
}

/**
 * Finds the topmost hit target at a position.
 *
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param targets - Hit targets sorted by z-index (highest first)
 * @returns Matching hit target or null
 */
export function findHitTarget(
	x: number,
	y: number,
	targets: readonly HitRect[],
): HitRect | null {
	// Targets should already be sorted by z-index descending
	for (const target of targets) {
		if (isPointInRect(x, y, target)) {
			return target;
		}
	}
	return null;
}

/**
 * Checks if a point is inside a rectangle.
 */
export function isPointInRect(x: number, y: number, rect: HitRect): boolean {
	return (
		x >= rect.x &&
		x < rect.x + rect.width &&
		y >= rect.y &&
		y < rect.y + rect.height
	);
}

/**
 * Clears the clicked state after it's been processed.
 */
export function clearClickedState(state: MouseState): MouseState {
	return {
		...state,
		clickedId: null,
	};
}

/**
 * Checks if a specific target was clicked.
 */
export function wasClicked(state: MouseState, id: string): boolean {
	return state.clickedId === id;
}

/**
 * Checks if a specific target is being hovered.
 */
export function isHovered(state: MouseState, id: string): boolean {
	return state.hoveredId === id;
}

// =============================================================================
// TERMINAL MOUSE MODE
// =============================================================================

/**
 * Gets the escape sequence to enable mouse tracking.
 *
 * Uses SGR protocol for better coordinate support.
 */
export function getEnableMouseSequence(): string {
	return [
		'\x1b[?1000h', // Enable button tracking
		'\x1b[?1002h', // Enable button motion tracking
		'\x1b[?1006h', // Enable SGR extended mode
	].join('');
}

/**
 * Gets the escape sequence to disable mouse tracking.
 */
export function getDisableMouseSequence(): string {
	return [
		'\x1b[?1006l', // Disable SGR extended mode
		'\x1b[?1002l', // Disable button motion tracking
		'\x1b[?1000l', // Disable button tracking
	].join('');
}

// =============================================================================
// HIT TARGET HELPERS
// =============================================================================

/**
 * Creates a hit rectangle for a UI element.
 */
export function createHitRect(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	zIndex: number = 0,
): HitRect {
	return { id, x, y, width, height, zIndex };
}

/**
 * Sorts hit targets by z-index (highest first for proper hit testing).
 */
export function sortHitTargets(targets: readonly HitRect[]): readonly HitRect[] {
	return [...targets].sort((a, b) => b.zIndex - a.zIndex);
}
