/**
 * Modal Widget
 *
 * A modal overlay/backdrop system with support for stacking multiple modals,
 * backdrop click-to-close, escape key handling, and input blocking.
 *
 * @module widgets/modal
 */

import { z } from 'zod';
import {
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../components/border';
import { setContent, TextAlign, TextVAlign } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setPadding } from '../components/padding';
import { moveBy, setPosition } from '../components/position';
import { hexToColor, markDirty, setStyle, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Border configuration for modals.
 */
export interface ModalBorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number;
	/** Border charset ('single', 'double', 'rounded', 'bold', 'ascii', or custom) */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}

/**
 * Padding configuration (all sides, or individual sides).
 */
export type ModalPaddingConfig =
	| number
	| {
			readonly left?: number;
			readonly top?: number;
			readonly right?: number;
			readonly bottom?: number;
	  };

/**
 * Configuration for creating a Modal widget.
 */
export interface ModalConfig {
	/** Whether to show a backdrop overlay behind the modal (default: true) */
	readonly backdrop?: boolean;
	/** Backdrop color as hex string or packed number (default: '#000000') */
	readonly backdropColor?: string | number;
	/** Backdrop opacity from 0 to 1 (default: 0.5) */
	readonly backdropOpacity?: number;
	/** Whether clicking the backdrop closes the modal (default: true) */
	readonly closeOnBackdropClick?: boolean;
	/** Whether pressing Escape closes the modal (default: true) */
	readonly closeOnEscape?: boolean;
	/** Width of the modal */
	readonly width?: number;
	/** Height of the modal */
	readonly height?: number;
	/** Left position (absolute) */
	readonly left?: number;
	/** Top position (absolute) */
	readonly top?: number;
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: ModalBorderConfig;
	/** Padding configuration for content area */
	readonly padding?: ModalPaddingConfig;
	/** Initial content text */
	readonly content?: string;
}

/**
 * Modal widget interface providing chainable methods.
 */
export interface ModalWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the modal */
	show(): ModalWidget;
	/** Hides the modal (does not destroy) */
	hide(): ModalWidget;

	// Position
	/** Moves the modal by dx, dy */
	move(dx: number, dy: number): ModalWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ModalWidget;
	/** Centers the modal (requires terminal width/height) */
	center(termWidth: number, termHeight: number): ModalWidget;

	// Content
	/** Sets the content text of the modal */
	setContent(text: string): ModalWidget;
	/** Gets the content text of the modal */
	getContent(): string;

	// Lifecycle
	/** Closes and hides the modal, fires onClose callbacks */
	close(): void;
	/** Returns whether the modal is currently open */
	isOpen(): boolean;
	/** Registers a callback for when the modal closes */
	onClose(cb: () => void): ModalWidget;
	/** Registers a callback for when the modal opens */
	onOpen(cb: () => void): ModalWidget;
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default modal width */
const DEFAULT_MODAL_WIDTH = 40;

/** Default modal height */
const DEFAULT_MODAL_HEIGHT = 10;

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for modal border configuration.
 */
const ModalBorderConfigSchema = z.object({
	type: z.enum(['line', 'bg', 'none']).optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	ch: z
		.union([z.enum(['single', 'double', 'rounded', 'bold', 'ascii']), z.object({}).passthrough()])
		.optional(),
});

/**
 * Zod schema for modal padding configuration.
 */
const ModalPaddingSchema = z.union([
	z.number().nonnegative(),
	z.object({
		left: z.number().nonnegative().optional(),
		top: z.number().nonnegative().optional(),
		right: z.number().nonnegative().optional(),
		bottom: z.number().nonnegative().optional(),
	}),
]);

/**
 * Zod schema for modal widget configuration.
 *
 * @example
 * ```typescript
 * import { ModalConfigSchema } from 'blecsd';
 *
 * const result = ModalConfigSchema.safeParse({
 *   backdrop: true,
 *   closeOnEscape: true,
 *   width: 50,
 *   height: 20,
 *   content: 'Hello',
 * });
 * ```
 */
export const ModalConfigSchema = z.object({
	backdrop: z.boolean().optional().default(true),
	backdropColor: z.union([z.string(), z.number()]).optional().default('#000000'),
	backdropOpacity: z.number().min(0).max(1).optional().default(0.5),
	closeOnBackdropClick: z.boolean().optional().default(true),
	closeOnEscape: z.boolean().optional().default(true),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	left: z.number().int().optional(),
	top: z.number().int().optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: ModalBorderConfigSchema.optional(),
	padding: ModalPaddingSchema.optional(),
	content: z.string().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * Modal component marker for identifying modal entities.
 *
 * Uses typed arrays for ECS-compatible storage. String and complex data
 * are stored in separate Maps (modalStateMap).
 *
 * @example
 * ```typescript
 * import { Modal } from 'blecsd';
 *
 * if (Modal.isModal[eid] === 1) {
 *   // Entity is a modal
 * }
 * ```
 */
export const Modal = {
	/** Tag indicating this is a modal widget (1 = yes) */
	isModal: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether the modal is currently open (0 = closed, 1 = open) */
	isOpen: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether backdrop is enabled (0 = no, 1 = yes) */
	backdropEnabled: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * Complex state for modal entities that cannot be stored in typed arrays.
 */
interface ModalState {
	content: string;
	backdropColor: number;
	backdropOpacity: number;
	closeOnBackdropClick: boolean;
	closeOnEscape: boolean;
	width: number;
	height: number;
	onCloseCallbacks: Array<() => void>;
	onOpenCallbacks: Array<() => void>;
}

/**
 * Store for complex modal state (strings, callbacks, etc.).
 */
const modalStateMap = new Map<Entity, ModalState>();

/**
 * Stack of currently open modal entity IDs (most recent on top).
 */
const modalStack: Entity[] = [];

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Parses a color value to a packed 32-bit color.
 */
function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}

/**
 * Converts border charset name to actual charset.
 */
function getBorderCharset(ch: string | object | undefined): BorderCharset {
	if (ch === undefined || ch === 'single') return BORDER_SINGLE;
	if (typeof ch === 'object') return ch as BorderCharset;
	return BORDER_SINGLE;
}

/**
 * Converts border type string to BorderType enum.
 */
function borderTypeToEnum(type: string | undefined): BorderType {
	if (type === 'bg') return BorderType.Background;
	return BorderType.Line;
}

/**
 * Applies padding to a modal entity from config.
 */
function applyModalPadding(
	world: World,
	eid: Entity,
	padding: number | { left?: number; top?: number; right?: number; bottom?: number } | undefined,
): void {
	if (typeof padding === 'number') {
		setPadding(world, eid, { left: padding, top: padding, right: padding, bottom: padding });
		return;
	}
	if (padding) {
		setPadding(world, eid, {
			left: padding.left ?? 0,
			top: padding.top ?? 0,
			right: padding.right ?? 0,
			bottom: padding.bottom ?? 0,
		});
		return;
	}
}

/**
 * Pushes a modal onto the stack.
 */
function pushToStack(eid: Entity): void {
	const idx = modalStack.indexOf(eid);
	if (idx !== -1) {
		modalStack.splice(idx, 1);
	}
	modalStack.push(eid);
}

/**
 * Removes a modal from the stack.
 */
function removeFromStack(eid: Entity): void {
	const idx = modalStack.indexOf(eid);
	if (idx !== -1) {
		modalStack.splice(idx, 1);
	}
}

// =============================================================================
// FACTORY HELPERS
// =============================================================================

/**
 * Applies style colors to a modal entity.
 */
function applyModalStyle(
	world: World,
	eid: Entity,
	fg: string | number | undefined,
	bg: string | number | undefined,
): void {
	if (fg === undefined && bg === undefined) return;
	setStyle(world, eid, {
		fg: fg !== undefined ? parseColor(fg) : undefined,
		bg: bg !== undefined ? parseColor(bg) : undefined,
	});
}

/**
 * Applies border configuration to a modal entity.
 */
function applyModalBorder(
	world: World,
	eid: Entity,
	borderConfig:
		| { type?: string; fg?: string | number; bg?: string | number; ch?: string | object }
		| undefined,
): void {
	if (borderConfig?.type !== 'none') {
		setBorder(world, eid, {
			type: borderTypeToEnum(borderConfig?.type),
			fg: borderConfig?.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
			bg: borderConfig?.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
		});
	}
	setBorderChars(world, eid, getBorderCharset(borderConfig?.ch));
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Modal widget with the given configuration.
 *
 * The modal is created in a hidden state by default. Call `show()` or use
 * `openModal()` to create and immediately show it.
 *
 * @param world - The ECS world
 * @param config - Modal configuration
 * @returns The ModalWidget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { createModal } from 'blecsd';
 *
 * const world = createWorld();
 *
 * const modal = createModal(world, {
 *   width: 50,
 *   height: 20,
 *   content: 'Are you sure?',
 *   backdrop: true,
 *   closeOnEscape: true,
 * });
 *
 * modal.show();
 * ```
 */
export function createModal(world: World, config: ModalConfig = {}): ModalWidget {
	const validated = ModalConfigSchema.parse(config);
	const eid = addEntity(world);

	const width = validated.width ?? DEFAULT_MODAL_WIDTH;
	const height = validated.height ?? DEFAULT_MODAL_HEIGHT;

	// Mark as modal
	Modal.isModal[eid] = 1;
	Modal.isOpen[eid] = 0;
	Modal.backdropEnabled[eid] = validated.backdrop ? 1 : 0;

	// Store complex state
	modalStateMap.set(eid, {
		content: validated.content ?? '',
		backdropColor: parseColor(validated.backdropColor),
		backdropOpacity: validated.backdropOpacity,
		closeOnBackdropClick: validated.closeOnBackdropClick,
		closeOnEscape: validated.closeOnEscape,
		width,
		height,
		onCloseCallbacks: [],
		onOpenCallbacks: [],
	});

	// Set position and dimensions
	setPosition(world, eid, validated.left ?? 0, validated.top ?? 0);
	setDimensions(world, eid, width, height);

	// Apply visual properties
	applyModalStyle(world, eid, validated.fg, validated.bg);
	applyModalBorder(world, eid, validated.border);
	applyModalPadding(world, eid, validated.padding);

	// Set content
	if (validated.content) {
		setContent(world, eid, validated.content, { align: TextAlign.Left, valign: TextVAlign.Top });
	}

	// Start hidden
	setVisible(world, eid, false);

	return createModalWidgetInterface(world, eid);
}

/**
 * Creates the ModalWidget interface for an entity.
 */
function createModalWidgetInterface(world: World, eid: Entity): ModalWidget {
	const widget: ModalWidget = {
		eid,

		show(): ModalWidget {
			Modal.isOpen[eid] = 1;
			setVisible(world, eid, true);
			pushToStack(eid);
			markDirty(world, eid);

			const state = modalStateMap.get(eid);
			if (state) {
				for (const cb of state.onOpenCallbacks) {
					cb();
				}
			}

			return widget;
		},

		hide(): ModalWidget {
			Modal.isOpen[eid] = 0;
			setVisible(world, eid, false);
			removeFromStack(eid);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): ModalWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(newX: number, newY: number): ModalWidget {
			setPosition(world, eid, newX, newY);
			markDirty(world, eid);
			return widget;
		},

		center(termWidth: number, termHeight: number): ModalWidget {
			const state = modalStateMap.get(eid);
			if (!state) return widget;
			const cx = Math.max(0, Math.floor((termWidth - state.width) / 2));
			const cy = Math.max(0, Math.floor((termHeight - state.height) / 2));
			setPosition(world, eid, cx, cy);
			markDirty(world, eid);
			return widget;
		},

		setContent(text: string): ModalWidget {
			const state = modalStateMap.get(eid);
			if (state) {
				state.content = text;
			}
			setContent(world, eid, text, { align: TextAlign.Left, valign: TextVAlign.Top });
			markDirty(world, eid);
			return widget;
		},

		getContent(): string {
			return modalStateMap.get(eid)?.content ?? '';
		},

		close(): void {
			if (Modal.isOpen[eid] === 0) return;

			Modal.isOpen[eid] = 0;
			setVisible(world, eid, false);
			removeFromStack(eid);
			markDirty(world, eid);

			const state = modalStateMap.get(eid);
			if (state) {
				for (const cb of state.onCloseCallbacks) {
					cb();
				}
			}
		},

		isOpen(): boolean {
			return Modal.isOpen[eid] === 1;
		},

		onClose(cb: () => void): ModalWidget {
			const state = modalStateMap.get(eid);
			if (state) {
				state.onCloseCallbacks.push(cb);
			}
			return widget;
		},

		onOpen(cb: () => void): ModalWidget {
			const state = modalStateMap.get(eid);
			if (state) {
				state.onOpenCallbacks.push(cb);
			}
			return widget;
		},

		destroy(): void {
			// Close first if open
			if (Modal.isOpen[eid] === 1) {
				widget.close();
			}

			// Clear typed array markers
			Modal.isModal[eid] = 0;
			Modal.isOpen[eid] = 0;
			Modal.backdropEnabled[eid] = 0;

			// Clear state
			modalStateMap.delete(eid);

			// Remove from ECS
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Creates a modal and immediately shows it.
 *
 * Convenience function that combines `createModal()` + `show()`.
 *
 * @param world - The ECS world
 * @param config - Modal configuration
 * @returns The ModalWidget instance (already visible)
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { openModal } from 'blecsd';
 *
 * const world = createWorld();
 * const modal = openModal(world, {
 *   content: 'Hello World!',
 *   width: 30,
 *   height: 8,
 * });
 * ```
 */
export function openModal(world: World, config: ModalConfig = {}): ModalWidget {
	const modal = createModal(world, config);
	modal.show();
	return modal;
}

/**
 * Closes a specific modal by entity ID.
 *
 * @param world - The ECS world
 * @param eid - The modal entity ID to close
 *
 * @example
 * ```typescript
 * import { closeModal } from 'blecsd';
 *
 * closeModal(world, modalEid);
 * ```
 */
export function closeModal(world: World, eid: Entity): void {
	if (Modal.isModal[eid] !== 1) return;
	if (Modal.isOpen[eid] === 0) return;

	Modal.isOpen[eid] = 0;
	setVisible(world, eid, false);
	removeFromStack(eid);
	markDirty(world, eid);

	const state = modalStateMap.get(eid);
	if (state) {
		for (const cb of state.onCloseCallbacks) {
			cb();
		}
	}
}

/**
 * Closes all currently open modals.
 *
 * Modals are closed in reverse stack order (most recent first).
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { closeAllModals } from 'blecsd';
 *
 * closeAllModals(world);
 * ```
 */
export function closeAllModals(world: World): void {
	// Close in reverse order (most recent first)
	const stackCopy = [...modalStack];
	for (let i = stackCopy.length - 1; i >= 0; i--) {
		const eid = stackCopy[i] as Entity;
		closeModal(world, eid);
	}
}

/**
 * Returns whether any modal is currently open.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @returns true if at least one modal is open
 *
 * @example
 * ```typescript
 * import { isModalOpen } from 'blecsd';
 *
 * if (isModalOpen(world)) {
 *   // Block other input
 * }
 * ```
 */
export function isModalOpen(_world: World): boolean {
	return modalStack.length > 0;
}

/**
 * Returns the stack of currently open modal entity IDs.
 *
 * The last element is the topmost (most recently opened) modal.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @returns Array of open modal entity IDs
 *
 * @example
 * ```typescript
 * import { getModalStack } from 'blecsd';
 *
 * const stack = getModalStack(world);
 * const topmostModal = stack[stack.length - 1];
 * ```
 */
export function getModalStack(_world: World): readonly Entity[] {
	return [...modalStack];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a modal widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a modal widget
 *
 * @example
 * ```typescript
 * import { isModal } from 'blecsd';
 *
 * if (isModal(world, entity)) {
 *   // Handle modal-specific logic
 * }
 * ```
 */
export function isModal(_world: World, eid: Entity): boolean {
	return Modal.isModal[eid] === 1;
}

/**
 * Resets the Modal component store and modal stack. Useful for testing.
 *
 * @internal
 */
export function resetModalStore(): void {
	Modal.isModal.fill(0);
	Modal.isOpen.fill(0);
	Modal.backdropEnabled.fill(0);
	modalStateMap.clear();
	modalStack.length = 0;
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handles a backdrop click event for a modal.
 *
 * If `closeOnBackdropClick` is enabled and the modal is open, this will close it.
 *
 * @param world - The ECS world
 * @param eid - The modal entity ID
 * @returns true if the modal was closed
 *
 * @example
 * ```typescript
 * import { handleModalBackdropClick } from 'blecsd';
 *
 * // In an input system, when a click lands on the backdrop:
 * const wasClosed = handleModalBackdropClick(world, modalEid);
 * ```
 */
export function handleModalBackdropClick(world: World, eid: Entity): boolean {
	if (Modal.isModal[eid] !== 1) return false;
	if (Modal.isOpen[eid] !== 1) return false;

	const state = modalStateMap.get(eid);
	if (!state?.closeOnBackdropClick) return false;

	closeModal(world, eid);
	return true;
}

/**
 * Handles an Escape key event for the topmost modal.
 *
 * If `closeOnEscape` is enabled for the topmost open modal, this will close it.
 *
 * @param world - The ECS world
 * @param eid - The modal entity ID
 * @returns true if the modal was closed
 *
 * @example
 * ```typescript
 * import { handleModalEscape } from 'blecsd';
 *
 * // In an input system, when Escape is pressed:
 * const stack = getModalStack(world);
 * if (stack.length > 0) {
 *   handleModalEscape(world, stack[stack.length - 1]);
 * }
 * ```
 */
export function handleModalEscape(world: World, eid: Entity): boolean {
	if (Modal.isModal[eid] !== 1) return false;
	if (Modal.isOpen[eid] !== 1) return false;

	const state = modalStateMap.get(eid);
	if (!state?.closeOnEscape) return false;

	closeModal(world, eid);
	return true;
}
