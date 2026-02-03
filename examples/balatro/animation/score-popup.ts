/**
 * Score Popup Animation System
 *
 * Implements Balatro-style score popups with rising text,
 * fade effects, and color coding.
 *
 * @module balatro/animation/score-popup
 */

// =============================================================================
// TYPES
// =============================================================================

export type PopupType = 'chips' | 'mult' | 'total' | 'hand_name' | 'bonus';

export interface ScorePopup {
	readonly id: string;
	readonly text: string;
	readonly type: PopupType;
	readonly x: number;
	readonly y: number;
	readonly startY: number;
	readonly startTime: number;
	readonly duration: number;
	readonly delay: number;
	readonly color: number;
}

export interface ScorePopupState {
	readonly popups: readonly ScorePopup[];
	readonly nextId: number;
}

export interface PopupConfig {
	/** Rise distance in characters */
	readonly riseDistance: number;
	/** Default duration in milliseconds */
	readonly defaultDuration: number;
	/** Base delay between popups in sequence */
	readonly baseDelay: number;
}

export interface RenderablePopup {
	readonly text: string;
	readonly x: number;
	readonly y: number;
	readonly color: number;
	readonly opacity: number;
	readonly scale: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_POPUP_CONFIG: PopupConfig = {
	riseDistance: 3,
	defaultDuration: 800,
	baseDelay: 150,
};

/** Popup colors (RGBA format) */
export const POPUP_COLORS: Readonly<Record<PopupType, number>> = {
	chips: 0x44aaff_ff, // Blue
	mult: 0xff6644_ff, // Red/orange
	total: 0xffdd44_ff, // Gold
	hand_name: 0xffffff_ff, // White
	bonus: 0x44ff88_ff, // Green
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates empty popup state.
 */
export function createPopupState(): ScorePopupState {
	return {
		popups: [],
		nextId: 1,
	};
}

/**
 * Generates a unique popup ID.
 */
function generatePopupId(state: ScorePopupState): string {
	return `popup-${state.nextId}`;
}

// =============================================================================
// POPUP CREATION
// =============================================================================

/**
 * Creates a single popup.
 *
 * @param state - Current popup state
 * @param text - Text to display
 * @param type - Popup type (determines color)
 * @param x - X position (center of popup)
 * @param y - Y position (start position)
 * @param options - Optional overrides
 * @returns New state with popup added
 */
export function addPopup(
	state: ScorePopupState,
	text: string,
	type: PopupType,
	x: number,
	y: number,
	options: {
		duration?: number;
		delay?: number;
		color?: number;
	} = {},
): ScorePopupState {
	const config = DEFAULT_POPUP_CONFIG;
	const now = Date.now();

	const popup: ScorePopup = {
		id: generatePopupId(state),
		text,
		type,
		x,
		y,
		startY: y,
		startTime: now,
		duration: options.duration ?? config.defaultDuration,
		delay: options.delay ?? 0,
		color: options.color ?? POPUP_COLORS[type],
	};

	return {
		popups: [...state.popups, popup],
		nextId: state.nextId + 1,
	};
}

/**
 * Creates a score animation sequence (Balatro-style).
 *
 * @param state - Current popup state
 * @param baseChips - Base chip value
 * @param cardChips - Chips from cards
 * @param mult - Multiplier
 * @param total - Final score
 * @param handName - Name of the hand
 * @param x - Center X position
 * @param y - Base Y position
 * @returns New state with all popups added
 */
export function createScoreSequence(
	state: ScorePopupState,
	baseChips: number,
	cardChips: number,
	mult: number,
	total: number,
	handName: string,
	x: number,
	y: number,
): ScorePopupState {
	const config = DEFAULT_POPUP_CONFIG;
	let currentDelay = 0;

	// 1. Hand name
	state = addPopup(state, handName, 'hand_name', x, y, {
		delay: currentDelay,
		duration: config.defaultDuration + 200,
	});
	currentDelay += config.baseDelay;

	// 2. Total chips (base + cards)
	const totalChips = baseChips + cardChips;
	state = addPopup(state, `${totalChips}`, 'chips', x, y - 1, {
		delay: currentDelay,
	});
	currentDelay += config.baseDelay;

	// 3. Multiplier
	state = addPopup(state, `×${mult}`, 'mult', x, y - 2, {
		delay: currentDelay,
	});
	currentDelay += config.baseDelay;

	// 4. Equals sign
	state = addPopup(state, '=', 'hand_name', x, y - 3, {
		delay: currentDelay,
		duration: config.defaultDuration / 2,
	});
	currentDelay += config.baseDelay / 2;

	// 5. Total
	state = addPopup(state, `${total}`, 'total', x, y - 4, {
		delay: currentDelay,
		duration: config.defaultDuration + 400,
	});

	return state;
}

/**
 * Creates a simple bonus popup.
 */
export function createBonusPopup(
	state: ScorePopupState,
	text: string,
	x: number,
	y: number,
): ScorePopupState {
	return addPopup(state, text, 'bonus', x, y, {
		duration: DEFAULT_POPUP_CONFIG.defaultDuration,
	});
}

// =============================================================================
// ANIMATION UPDATE
// =============================================================================

/**
 * Updates all popups based on elapsed time.
 * Removes expired popups.
 *
 * @param state - Current popup state
 * @param now - Current timestamp (Date.now())
 * @returns Updated state with expired popups removed
 */
export function updatePopups(state: ScorePopupState, now: number = Date.now()): ScorePopupState {
	const activePopups = state.popups.filter(popup => {
		const elapsed = now - popup.startTime - popup.delay;
		return elapsed < popup.duration;
	});

	return {
		...state,
		popups: activePopups,
	};
}

/**
 * Clears all popups.
 */
export function clearPopups(state: ScorePopupState): ScorePopupState {
	return {
		...state,
		popups: [],
	};
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Gets the current render state for a popup.
 *
 * @param popup - Popup to calculate render state for
 * @param now - Current timestamp
 * @param config - Popup configuration
 * @returns Renderable popup with position, opacity, scale
 */
export function getPopupRenderState(
	popup: ScorePopup,
	now: number = Date.now(),
	config: PopupConfig = DEFAULT_POPUP_CONFIG,
): RenderablePopup | null {
	const elapsed = now - popup.startTime - popup.delay;

	// Not started yet
	if (elapsed < 0) {
		return null;
	}

	// Already finished
	if (elapsed >= popup.duration) {
		return null;
	}

	const progress = elapsed / popup.duration;

	// Rise animation (eased)
	const riseProgress = easeOutQuad(Math.min(progress * 2, 1));
	const y = popup.startY - config.riseDistance * riseProgress;

	// Fade out in last 30% of duration
	const fadeStart = 0.7;
	const opacity = progress > fadeStart
		? 1 - (progress - fadeStart) / (1 - fadeStart)
		: 1;

	// Scale animation (pop then settle)
	const scaleProgress = Math.min(progress * 4, 1);
	const scale = scaleProgress < 0.5
		? 1 + 0.3 * easeOutQuad(scaleProgress * 2)
		: 1 + 0.3 * (1 - easeOutQuad((scaleProgress - 0.5) * 2));

	return {
		text: popup.text,
		x: popup.x,
		y: Math.round(y),
		color: popup.color,
		opacity: Math.max(0, Math.min(1, opacity)),
		scale: Math.max(0.1, scale),
	};
}

/**
 * Gets all renderable popups.
 *
 * @param state - Current popup state
 * @param now - Current timestamp
 * @param config - Popup configuration
 * @returns Array of renderable popups (sorted by creation order)
 */
export function getRenderablePopups(
	state: ScorePopupState,
	now: number = Date.now(),
	config: PopupConfig = DEFAULT_POPUP_CONFIG,
): readonly RenderablePopup[] {
	const renderables: RenderablePopup[] = [];

	for (const popup of state.popups) {
		const renderable = getPopupRenderState(popup, now, config);
		if (renderable) {
			renderables.push(renderable);
		}
	}

	return renderables;
}

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

/**
 * Quadratic ease-out (decelerating).
 */
function easeOutQuad(t: number): number {
	return t * (2 - t);
}

/**
 * Quadratic ease-in-out.
 */
export function easeInOutQuad(t: number): number {
	return t < 0.5
		? 2 * t * t
		: 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Checks if there are any active popups.
 */
export function hasActivePopups(state: ScorePopupState, now: number = Date.now()): boolean {
	return state.popups.some(popup => {
		const elapsed = now - popup.startTime - popup.delay;
		return elapsed < popup.duration;
	});
}

/**
 * Gets the count of active popups.
 */
export function getActivePopupCount(state: ScorePopupState, now: number = Date.now()): number {
	return state.popups.filter(popup => {
		const elapsed = now - popup.startTime - popup.delay;
		return elapsed >= 0 && elapsed < popup.duration;
	}).length;
}
