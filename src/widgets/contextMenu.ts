/**
 * Context menu widget for terminal UIs.
 * Provides right-click style menus with keyboard navigation.
 * @module widgets/contextMenu
 */

import { setAccessibleLabel, setAccessibleRole } from '../components/accessibility';
import { Content, setText } from '../components/content';
import { Dimensions } from '../components/dimensions';
import { setFocusable } from '../components/focusable';
import { Position } from '../components/position';
import { addComponent, addEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

/**
 * Context menu item definition.
 */
export interface ContextMenuItem {
	/** Display label */
	readonly label: string;
	/** Action callback when item is selected */
	readonly action?: () => void;
	/** Whether item is disabled */
	readonly disabled?: boolean;
	/** Whether item is a separator */
	readonly separator?: boolean;
}

/**
 * Context menu configuration.
 */
export interface ContextMenuConfig {
	/** Menu items */
	readonly items: readonly ContextMenuItem[];
	/** X position (auto-adjusted if near edge) */
	readonly x: number;
	/** Y position (auto-adjusted if near edge) */
	readonly y: number;
	/** Terminal width for edge detection */
	readonly termWidth?: number;
	/** Terminal height for edge detection */
	readonly termHeight?: number;
}

/**
 * Context menu state.
 */
interface ContextMenuState {
	readonly items: readonly ContextMenuItem[];
	readonly itemEntities: readonly Entity[];
	selectedIndex: number;
	readonly containerEntity: Entity;
}

const contextMenuStates = new Map<Entity, ContextMenuState>();

/**
 * Creates a context menu widget.
 * Returns the container entity.
 *
 * @param world - The ECS world
 * @param config - Context menu configuration
 * @returns The container entity ID
 *
 * @example
 * ```typescript
 * import { createContextMenu } from 'blecsd';
 *
 * const menu = createContextMenu(world, {
 *   x: 10,
 *   y: 5,
 *   items: [
 *     { label: 'Copy', action: () => console.log('Copy') },
 *     { label: 'Paste', action: () => console.log('Paste') },
 *     { separator: true },
 *     { label: 'Delete', action: () => console.log('Delete'), disabled: true },
 *   ],
 * });
 * ```
 */
export function createContextMenu(world: World, config: ContextMenuConfig): Entity {
	const container = addEntity(world);

	// Calculate menu dimensions
	const termWidth = config.termWidth ?? 80;
	const termHeight = config.termHeight ?? 24;
	const maxLabelWidth = Math.max(...config.items.map((item) => item.label?.length ?? 0));
	const menuWidth = Math.min(maxLabelWidth + 4, 40);
	const menuHeight = config.items.length + 2;

	// Auto-adjust position to avoid edges
	let x = config.x;
	let y = config.y;
	if (x + menuWidth > termWidth) {
		x = Math.max(0, termWidth - menuWidth);
	}
	if (y + menuHeight > termHeight) {
		y = Math.max(0, termHeight - menuHeight);
	}

	// Set container position and dimensions
	addComponent(world, container, Position);
	Position.x[container] = x;
	Position.y[container] = y;

	addComponent(world, container, Dimensions);
	Dimensions.width[container] = menuWidth;
	Dimensions.height[container] = menuHeight;

	// Create menu items
	const itemEntities: Entity[] = [];
	let currentY = 1;

	for (const item of config.items) {
		const itemEntity = addEntity(world);

		addComponent(world, itemEntity, Position);
		Position.x[itemEntity] = x + 2;
		Position.y[itemEntity] = y + currentY;

		addComponent(world, itemEntity, Content);
		const displayText = item.separator ? '---' : item.label;
		setText(world, itemEntity, displayText);

		if (!item.separator && !item.disabled) {
			setFocusable(world, itemEntity, true);
			setAccessibleRole(world, itemEntity, 'menuitem');
			setAccessibleLabel(world, itemEntity, item.label);
		}

		itemEntities.push(itemEntity);
		currentY++;
	}

	// Store state
	const state: ContextMenuState = {
		items: config.items,
		itemEntities,
		selectedIndex: 0,
		containerEntity: container,
	};
	contextMenuStates.set(container, state);

	// Set container as focusable menu
	setAccessibleRole(world, container, 'menu');
	setFocusable(world, container, true);

	return container;
}

/**
 * Handles keyboard input for context menu.
 *
 * @param world - The ECS world
 * @param eid - The context menu entity
 * @param key - The key pressed
 * @returns True if key was handled
 */
export function handleContextMenuKey(world: World, eid: Entity, key: string): boolean {
	const state = contextMenuStates.get(eid);
	if (!state) return false;

	if (key === 'up' || key === 'k') {
		moveSelection(world, state, -1);
		return true;
	}

	if (key === 'down' || key === 'j') {
		moveSelection(world, state, 1);
		return true;
	}

	if (key === 'enter' || key === ' ') {
		selectCurrentItem(world, state);
		return true;
	}

	if (key === 'escape') {
		closeContextMenu(world, eid);
		return true;
	}

	return false;
}

/**
 * Moves selection up or down in the menu.
 */
function moveSelection(_world: World, state: ContextMenuState, direction: number): void {
	const validIndices: number[] = [];
	for (let i = 0; i < state.items.length; i++) {
		const item = state.items[i];
		if (item && !item.separator && !item.disabled) {
			validIndices.push(i);
		}
	}

	if (validIndices.length === 0) return;

	const currentPos = validIndices.indexOf(state.selectedIndex);
	let newPos = currentPos + direction;

	if (newPos < 0) newPos = validIndices.length - 1;
	if (newPos >= validIndices.length) newPos = 0;

	const newIndex = validIndices[newPos];
	if (newIndex !== undefined) {
		state.selectedIndex = newIndex;
	}
}

/**
 * Selects the current menu item and executes its action.
 */
function selectCurrentItem(_world: World, state: ContextMenuState): void {
	const item = state.items[state.selectedIndex];
	if (item && !item.separator && !item.disabled && item.action) {
		item.action();
	}
}

/**
 * Closes the context menu and cleans up.
 */
function closeContextMenu(_world: World, eid: Entity): void {
	const state = contextMenuStates.get(eid);
	if (!state) return;

	// Clean up would go here (remove entities, etc.)
	contextMenuStates.delete(eid);
}

/**
 * Gets the currently selected item index.
 */
export function getSelectedIndex(eid: Entity): number {
	const state = contextMenuStates.get(eid);
	return state?.selectedIndex ?? 0;
}
