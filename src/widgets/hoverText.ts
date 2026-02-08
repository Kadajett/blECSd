/**
 * Hover Text (Tooltip) System
 *
 * Provides a global tooltip that displays hover text for entities.
 * The tooltip follows the mouse cursor and shows after a configurable delay.
 *
 * @module widgets/hoverText
 */

import { z } from 'zod';
import type { Entity } from '../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default delay before showing tooltip (in milliseconds).
 */
export const DEFAULT_HOVER_DELAY = 500;

/**
 * Default delay before hiding tooltip after mouse leaves (in milliseconds).
 */
export const DEFAULT_HIDE_DELAY = 100;

/**
 * Default X offset from cursor.
 */
export const DEFAULT_CURSOR_OFFSET_X = 2;

/**
 * Default Y offset from cursor.
 */
export const DEFAULT_CURSOR_OFFSET_Y = 1;

/**
 * Default foreground color (white).
 */
export const DEFAULT_TOOLTIP_FG = 0xffffffff;

/**
 * Default background color (dark gray).
 */
export const DEFAULT_TOOLTIP_BG = 0xff333333;

/**
 * Default border color (light gray).
 */
export const DEFAULT_TOOLTIP_BORDER = 0xff888888;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for TooltipStyle validation.
 */
export const TooltipStyleSchema = z.object({
	fg: z.number().int().nonnegative().optional(),
	bg: z.number().int().nonnegative().optional(),
	border: z.number().int().nonnegative().optional(),
	padding: z.number().int().nonnegative().optional(),
});

/**
 * Zod schema for HoverTextConfig validation.
 */
export const HoverTextConfigSchema = z.object({
	text: z.string(),
	style: TooltipStyleSchema.optional(),
	delay: z.number().positive().optional(),
});

/**
 * Zod schema for HoverTextManagerConfig validation.
 */
export const HoverTextManagerConfigSchema = z.object({
	showDelay: z.number().nonnegative().optional(),
	hideDelay: z.number().nonnegative().optional(),
	offsetX: z.number().optional(),
	offsetY: z.number().optional(),
	screenWidth: z.number().int().positive().optional(),
	screenHeight: z.number().int().positive().optional(),
	style: TooltipStyleSchema.optional(),
});

// =============================================================================
// TYPES
// =============================================================================

/**
 * Tooltip position on screen.
 */
export interface TooltipPosition {
	readonly x: number;
	readonly y: number;
}

/**
 * Tooltip style configuration.
 */
export interface TooltipStyle {
	/** Foreground color */
	readonly fg?: number;
	/** Background color */
	readonly bg?: number;
	/** Border color */
	readonly border?: number;
	/** Padding inside tooltip */
	readonly padding?: number;
}

/**
 * Hover text configuration for an entity.
 */
export interface HoverTextConfig {
	/** The text to display */
	readonly text: string;
	/** Optional style override */
	readonly style?: TooltipStyle;
	/** Custom delay for this entity (overrides global) */
	readonly delay?: number;
}

/**
 * Hover text manager configuration.
 */
export interface HoverTextManagerConfig {
	/** Default delay before showing tooltip (ms) */
	readonly showDelay?: number;
	/** Delay before hiding tooltip (ms) */
	readonly hideDelay?: number;
	/** X offset from cursor */
	readonly offsetX?: number;
	/** Y offset from cursor */
	readonly offsetY?: number;
	/** Screen width for boundary checking */
	readonly screenWidth?: number;
	/** Screen height for boundary checking */
	readonly screenHeight?: number;
	/** Default tooltip style */
	readonly style?: TooltipStyle;
}

/**
 * Current tooltip state.
 */
export interface TooltipState {
	/** Whether tooltip is currently visible */
	readonly visible: boolean;
	/** Entity that triggered the tooltip */
	readonly sourceEntity: Entity | null;
	/** Current tooltip text */
	readonly text: string;
	/** Current position */
	readonly position: TooltipPosition;
	/** Time when hover started */
	readonly hoverStartTime: number | null;
}

/**
 * Hover text manager interface.
 */
export interface HoverTextManager {
	/**
	 * Sets hover text for an entity.
	 *
	 * @param eid - The entity ID
	 * @param text - Text to display, or config object
	 *
	 * @example
	 * ```typescript
	 * // Simple text
	 * hoverManager.setHoverText(entity, 'Click to submit');
	 *
	 * // With custom style
	 * hoverManager.setHoverText(entity, {
	 *   text: 'Danger zone!',
	 *   style: { bg: 0xffff0000 },
	 *   delay: 200,
	 * });
	 * ```
	 */
	setHoverText(eid: Entity, text: string | HoverTextConfig): void;

	/**
	 * Clears hover text for an entity.
	 *
	 * @param eid - The entity ID
	 */
	clearHoverText(eid: Entity): void;

	/**
	 * Gets the hover text config for an entity.
	 *
	 * @param eid - The entity ID
	 * @returns Hover text config or undefined
	 */
	getHoverText(eid: Entity): HoverTextConfig | undefined;

	/**
	 * Checks if an entity has hover text.
	 *
	 * @param eid - The entity ID
	 * @returns true if entity has hover text
	 */
	hasHoverText(eid: Entity): boolean;

	/**
	 * Updates the hover state based on mouse position.
	 * Call this when mouse moves or enters/leaves entities.
	 *
	 * @param mouseX - Current mouse X position
	 * @param mouseY - Current mouse Y position
	 * @param hoveredEntity - Entity under the mouse (or null if none)
	 */
	updateMouse(mouseX: number, mouseY: number, hoveredEntity: Entity | null): void;

	/**
	 * Updates tooltip timing (call each frame).
	 * Handles show/hide delays.
	 *
	 * @param deltaTime - Time since last frame (ms)
	 */
	update(deltaTime: number): void;

	/**
	 * Shows the tooltip immediately (bypassing delay).
	 *
	 * @param eid - Entity to show tooltip for
	 * @param mouseX - Mouse X position
	 * @param mouseY - Mouse Y position
	 */
	showNow(eid: Entity, mouseX: number, mouseY: number): void;

	/**
	 * Hides the tooltip immediately.
	 */
	hideNow(): void;

	/**
	 * Gets the current tooltip state.
	 */
	getState(): TooltipState;

	/**
	 * Checks if the tooltip is currently visible.
	 */
	isVisible(): boolean;

	/**
	 * Gets the tooltip render data.
	 * Use this to render the tooltip in your game loop.
	 *
	 * @returns Render data or null if not visible
	 */
	getRenderData(): TooltipRenderData | null;

	/**
	 * Updates screen dimensions for boundary checking.
	 *
	 * @param width - Screen width
	 * @param height - Screen height
	 */
	setScreenSize(width: number, height: number): void;

	/**
	 * Clears all hover text registrations.
	 */
	clearAll(): void;
}

/**
 * Data needed to render the tooltip.
 */
export interface TooltipRenderData {
	/** X position on screen */
	readonly x: number;
	/** Y position on screen */
	readonly y: number;
	/** Width of tooltip box */
	readonly width: number;
	/** Height of tooltip box */
	readonly height: number;
	/** Text to display */
	readonly text: string;
	/** Lines of text (pre-split) */
	readonly lines: readonly string[];
	/** Style to use */
	readonly style: Required<TooltipStyle>;
}

// =============================================================================
// STORES
// =============================================================================

/** Entity hover text configurations */
const hoverTextStore = new Map<Entity, HoverTextConfig>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Normalizes hover text input to config object.
 */
function normalizeConfig(text: string | HoverTextConfig): HoverTextConfig {
	if (typeof text === 'string') {
		return { text };
	}
	return text;
}

/**
 * Splits text into lines for rendering.
 */
function splitLines(text: string): string[] {
	return text.split('\n');
}

/**
 * Calculates the width needed for the tooltip.
 */
function calculateWidth(lines: readonly string[], padding: number): number {
	let maxWidth = 0;
	for (const line of lines) {
		if (line.length > maxWidth) {
			maxWidth = line.length;
		}
	}
	return maxWidth + padding * 2;
}

/**
 * Calculates the height needed for the tooltip.
 */
function calculateHeight(lines: readonly string[], padding: number): number {
	return lines.length + padding * 2;
}

/**
 * Clamps a position to stay within screen bounds.
 */
function clampPosition(
	x: number,
	y: number,
	width: number,
	height: number,
	screenWidth: number,
	screenHeight: number,
): TooltipPosition {
	let newX = x;
	let newY = y;

	// Clamp X
	if (newX + width > screenWidth) {
		newX = screenWidth - width;
	}
	if (newX < 0) {
		newX = 0;
	}

	// Clamp Y
	if (newY + height > screenHeight) {
		newY = screenHeight - height;
	}
	if (newY < 0) {
		newY = 0;
	}

	return { x: newX, y: newY };
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates a hover text manager.
 *
 * The manager handles tooltip state, timing, and positioning.
 * Use it to register hover text for entities and update on mouse events.
 *
 * @param config - Manager configuration
 * @returns HoverTextManager instance
 *
 * @example
 * ```typescript
 * import { createHoverTextManager } from 'blecsd';
 *
 * const hoverManager = createHoverTextManager({
 *   showDelay: 500,
 *   screenWidth: 80,
 *   screenHeight: 24,
 * });
 *
 * // Register hover text for an entity
 * hoverManager.setHoverText(buttonEntity, 'Click to submit the form');
 *
 * // In your input handler
 * inputSystem.on('mousemove', (event) => {
 *   const entity = hitTest(world, event.x, event.y);
 *   hoverManager.updateMouse(event.x, event.y, entity);
 * });
 *
 * // In your game loop
 * function update(dt: number) {
 *   hoverManager.update(dt);
 *
 *   const tooltip = hoverManager.getRenderData();
 *   if (tooltip) {
 *     // Render the tooltip
 *     renderTooltip(tooltip);
 *   }
 * }
 * ```
 */
export function createHoverTextManager(config: HoverTextManagerConfig = {}): HoverTextManager {
	// Validate configuration
	const validatedConfig = HoverTextManagerConfigSchema.parse(config);

	const showDelay = validatedConfig.showDelay ?? DEFAULT_HOVER_DELAY;
	const hideDelay = validatedConfig.hideDelay ?? DEFAULT_HIDE_DELAY;
	const offsetX = validatedConfig.offsetX ?? DEFAULT_CURSOR_OFFSET_X;
	const offsetY = validatedConfig.offsetY ?? DEFAULT_CURSOR_OFFSET_Y;
	let screenWidth = validatedConfig.screenWidth ?? 80;
	let screenHeight = validatedConfig.screenHeight ?? 24;
	const defaultStyle: Required<TooltipStyle> = {
		fg: validatedConfig.style?.fg ?? DEFAULT_TOOLTIP_FG,
		bg: validatedConfig.style?.bg ?? DEFAULT_TOOLTIP_BG,
		border: validatedConfig.style?.border ?? DEFAULT_TOOLTIP_BORDER,
		padding: validatedConfig.style?.padding ?? 1,
	};

	// State
	let visible = false;
	let sourceEntity: Entity | null = null;
	let currentText = '';
	let currentLines: string[] = [];
	let position: TooltipPosition = { x: 0, y: 0 };
	let hoverStartTime: number | null = null;
	let hideStartTime: number | null = null;
	let currentHoveredEntity: Entity | null = null;
	let lastMouseX = 0;
	let lastMouseY = 0;
	let pendingShow = false;

	const manager: HoverTextManager = {
		setHoverText(eid: Entity, text: string | HoverTextConfig): void {
			const config = normalizeConfig(text);
			const validatedConfig = HoverTextConfigSchema.parse(config);
			hoverTextStore.set(eid, validatedConfig);
		},

		clearHoverText(eid: Entity): void {
			hoverTextStore.delete(eid);
			// If we're showing tooltip for this entity, hide it
			if (sourceEntity === eid) {
				manager.hideNow();
			}
		},

		getHoverText(eid: Entity): HoverTextConfig | undefined {
			return hoverTextStore.get(eid);
		},

		hasHoverText(eid: Entity): boolean {
			return hoverTextStore.has(eid);
		},

		updateMouse(mouseX: number, mouseY: number, hoveredEntity: Entity | null): void {
			lastMouseX = mouseX;
			lastMouseY = mouseY;

			// Entity changed
			if (hoveredEntity !== currentHoveredEntity) {
				currentHoveredEntity = hoveredEntity;

				if (hoveredEntity !== null && hoverTextStore.has(hoveredEntity)) {
					// Start hover timer
					hoverStartTime = Date.now();
					hideStartTime = null;
					pendingShow = true;
				} else if (visible) {
					// Start hide timer
					hideStartTime = Date.now();
					hoverStartTime = null;
					pendingShow = false;
				} else {
					// Not over anything with hover text
					hoverStartTime = null;
					hideStartTime = null;
					pendingShow = false;
				}
			}

			// Update position if visible
			if (visible && sourceEntity !== null) {
				updatePosition(mouseX, mouseY);
			}
		},

		update(_deltaTime: number): void {
			const now = Date.now();

			// Check show timer
			if (pendingShow && hoverStartTime !== null && currentHoveredEntity !== null) {
				const config = hoverTextStore.get(currentHoveredEntity);
				const delay = config?.delay ?? showDelay;

				if (now - hoverStartTime >= delay) {
					manager.showNow(currentHoveredEntity, lastMouseX, lastMouseY);
					pendingShow = false;
				}
			}

			// Check hide timer
			if (hideStartTime !== null && visible) {
				if (now - hideStartTime >= hideDelay) {
					manager.hideNow();
				}
			}
		},

		showNow(eid: Entity, mouseX: number, mouseY: number): void {
			const config = hoverTextStore.get(eid);
			if (!config) {
				return;
			}

			visible = true;
			sourceEntity = eid;
			currentText = config.text;
			currentLines = splitLines(config.text);
			hoverStartTime = null;
			hideStartTime = null;
			pendingShow = false;

			updatePosition(mouseX, mouseY);
		},

		hideNow(): void {
			visible = false;
			sourceEntity = null;
			currentText = '';
			currentLines = [];
			hoverStartTime = null;
			hideStartTime = null;
			pendingShow = false;
		},

		getState(): TooltipState {
			return {
				visible,
				sourceEntity,
				text: currentText,
				position,
				hoverStartTime,
			};
		},

		isVisible(): boolean {
			return visible;
		},

		getRenderData(): TooltipRenderData | null {
			if (!visible || sourceEntity === null) {
				return null;
			}

			const config = hoverTextStore.get(sourceEntity);
			const style: Required<TooltipStyle> = {
				fg: config?.style?.fg ?? defaultStyle.fg,
				bg: config?.style?.bg ?? defaultStyle.bg,
				border: config?.style?.border ?? defaultStyle.border,
				padding: config?.style?.padding ?? defaultStyle.padding,
			};

			const width = calculateWidth(currentLines, style.padding);
			const height = calculateHeight(currentLines, style.padding);

			return {
				x: position.x,
				y: position.y,
				width,
				height,
				text: currentText,
				lines: currentLines,
				style,
			};
		},

		setScreenSize(width: number, height: number): void {
			screenWidth = width;
			screenHeight = height;
		},

		clearAll(): void {
			hoverTextStore.clear();
			manager.hideNow();
		},
	};

	function updatePosition(mouseX: number, mouseY: number): void {
		const config = sourceEntity !== null ? hoverTextStore.get(sourceEntity) : undefined;
		const style: Required<TooltipStyle> = {
			fg: config?.style?.fg ?? defaultStyle.fg,
			bg: config?.style?.bg ?? defaultStyle.bg,
			border: config?.style?.border ?? defaultStyle.border,
			padding: config?.style?.padding ?? defaultStyle.padding,
		};

		const width = calculateWidth(currentLines, style.padding);
		const height = calculateHeight(currentLines, style.padding);

		const rawX = mouseX + offsetX;
		const rawY = mouseY + offsetY;

		position = clampPosition(rawX, rawY, width, height, screenWidth, screenHeight);
	}

	return manager;
}

// =============================================================================
// MODULE-LEVEL API
// =============================================================================

/**
 * Sets hover text for an entity in the global store.
 *
 * @param eid - The entity ID
 * @param text - Text to display or config object
 *
 * @example
 * ```typescript
 * import { setHoverText } from 'blecsd';
 *
 * setHoverText(entity, 'Click here to submit');
 * ```
 */
export function setHoverText(eid: Entity, text: string | HoverTextConfig): void {
	hoverTextStore.set(eid, normalizeConfig(text));
}

/**
 * Clears hover text for an entity.
 *
 * @param eid - The entity ID
 */
export function clearHoverText(eid: Entity): void {
	hoverTextStore.delete(eid);
}

/**
 * Gets hover text config for an entity.
 *
 * @param eid - The entity ID
 * @returns Hover text config or undefined
 */
export function getHoverText(eid: Entity): HoverTextConfig | undefined {
	return hoverTextStore.get(eid);
}

/**
 * Checks if an entity has hover text.
 *
 * @param eid - The entity ID
 * @returns true if entity has hover text
 */
export function hasHoverText(eid: Entity): boolean {
	return hoverTextStore.has(eid);
}

/**
 * Clears all hover text registrations.
 * Useful for cleanup or testing.
 */
export function clearAllHoverText(): void {
	hoverTextStore.clear();
}

/**
 * Gets the number of entities with hover text registered.
 */
export function getHoverTextCount(): number {
	return hoverTextStore.size;
}

/**
 * Resets the hover text store.
 * For testing purposes.
 */
export function resetHoverTextStore(): void {
	hoverTextStore.clear();
}
