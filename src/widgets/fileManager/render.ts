/**
 * Rendering logic for FileManager widget
 *
 * @module widgets/fileManager/render
 */

import { BorderType, setBorder, setBorderChars } from '../../components/border';
import { setContent, TextAlign, TextVAlign } from '../../components/content';
import { setPadding } from '../../components/padding';
import { markDirty, setStyle } from '../../components/renderable';
import type { Entity, World } from '../../core/types';
import { parseColor } from '../../utils/color';
import { DIR_ICON, FILE_ICON, getBorderCharset, PARENT_DIR_ENTRY, PARENT_DIR_ICON } from './config';
import { FileManager } from './state';
import type { FileManagerState } from './types';

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Builds display content string from entries.
 * @internal
 */
export function buildContent(state: FileManagerState): string {
	const lines: string[] = [];

	// Show full path (truncate if too long)
	const maxPathLen = state.width - 4;
	let displayPath = state.cwd;
	if (displayPath.length > maxPathLen) {
		displayPath = `...${displayPath.slice(-(maxPathLen - 3))}`;
	}
	lines.push(`[${displayPath}]`);

	// Parent directory entry
	const parentPrefix = FileManager.selectedIndex[0] === -1 ? '> ' : '  ';
	const parentIcon = state.showIcons ? `${PARENT_DIR_ICON} ` : '';
	lines.push(`${parentPrefix}${parentIcon}${PARENT_DIR_ENTRY}`);

	// File/directory entries
	for (let i = 0; i < state.entries.length; i++) {
		const entry = state.entries[i];
		if (!entry) continue;
		const isSelected = i === FileManager.selectedIndex[0];
		const prefix = isSelected ? '> ' : '  ';
		const icon = state.showIcons ? (entry.isDirectory ? `${DIR_ICON} ` : `${FILE_ICON} `) : '';
		lines.push(`${prefix}${icon}${entry.name}`);
	}

	return lines.join('\n');
}

/**
 * Updates the content display for a file manager entity.
 * @internal
 */
export function updateDisplay(world: World, eid: Entity, state: FileManagerState): void {
	const content = buildContent(state);
	setContent(world, eid, content, { align: TextAlign.Left, valign: TextVAlign.Top });
	markDirty(world, eid);
}

// =============================================================================
// STYLING
// =============================================================================

/**
 * Applies style colors to an entity.
 * @internal
 */
export function applyStyle(
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
 * Applies border configuration to an entity.
 * @internal
 */
export function applyBorder(
	world: World,
	eid: Entity,
	borderConfig:
		| {
				type?: string | undefined;
				fg?: string | number | undefined;
				bg?: string | number | undefined;
				ch?: string | object | undefined;
		  }
		| undefined,
): void {
	if (borderConfig?.type === 'none') return;
	const borderType = borderConfig?.type === 'bg' ? BorderType.Background : BorderType.Line;
	setBorder(world, eid, {
		type: borderType,
		fg: borderConfig?.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
		bg: borderConfig?.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
	});
	setBorderChars(world, eid, getBorderCharset(borderConfig?.ch));
}

/**
 * Applies padding to an entity from config.
 * @internal
 */
export function applyPadding(
	world: World,
	eid: Entity,
	padding:
		| number
		| {
				left?: number | undefined;
				top?: number | undefined;
				right?: number | undefined;
				bottom?: number | undefined;
		  }
		| undefined,
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
	}
}
