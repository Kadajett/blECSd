/**
 * Panel Widget Rendering
 *
 * Rendering logic for panel widgets, including title bar rendering.
 *
 * @module widgets/panel/render
 */

import type { Entity, World } from '../../core/types';
import { CLOSE_BUTTON_CHAR, COLLAPSE_CHAR, EXPAND_CHAR, Panel, titleStore } from './state';
import type { TitleAlign } from './types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Converts title alignment to number.
 */
export function titleAlignToNumber(align: TitleAlign): number {
	switch (align) {
		case 'left':
			return 0;
		case 'center':
			return 1;
		case 'right':
			return 2;
	}
}

/**
 * Converts number to title alignment.
 */
export function numberToTitleAlign(value: number): TitleAlign {
	switch (value) {
		case 0:
			return 'left';
		case 1:
			return 'center';
		case 2:
			return 'right';
		default:
			return 'left';
	}
}

// =============================================================================
// RENDERING FUNCTIONS
// =============================================================================

/**
 * Renders the panel title bar.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param width - Available width for title bar
 * @returns The rendered title bar string
 */
export function renderPanelTitleBar(_world: World, eid: Entity, width: number): string {
	const title = titleStore.get(eid) ?? '';
	const closable = Panel.closable[eid] === 1;
	const collapsible = Panel.collapsible[eid] === 1;
	const collapsed = Panel.collapsed[eid] === 1;
	const align = numberToTitleAlign(Panel.titleAlign[eid] as number);

	// Calculate available space
	const buttonSpace = (closable ? 2 : 0) + (collapsible ? 2 : 0);
	const availableWidth = Math.max(0, width - buttonSpace);

	// Truncate title if needed
	let displayTitle = title;
	if (displayTitle.length > availableWidth) {
		displayTitle = `${displayTitle.slice(0, availableWidth - 1)}…`;
	}

	// Build buttons
	let buttons = '';
	if (collapsible) {
		buttons += collapsed ? `${EXPAND_CHAR} ` : `${COLLAPSE_CHAR} `;
	}
	if (closable) {
		buttons += `${CLOSE_BUTTON_CHAR} `;
	}
	buttons = buttons.trimEnd();

	// Pad title based on alignment
	const totalPadding = availableWidth - displayTitle.length;
	let leftPad = 0;
	let rightPad = 0;

	switch (align) {
		case 'left':
			rightPad = totalPadding;
			break;
		case 'center':
			leftPad = Math.floor(totalPadding / 2);
			rightPad = totalPadding - leftPad;
			break;
		case 'right':
			leftPad = totalPadding;
			break;
	}

	return `${' '.repeat(leftPad)}${displayTitle}${' '.repeat(rightPad)}${buttons}`;
}
