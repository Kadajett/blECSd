/**
 * Dual-pane render system.
 * Renders multiple file panes with drag/drop visual feedback.
 * @module systems/dualPaneRender
 */

import type { Entity, World } from 'blecsd';
import {
	createCellBuffer,
	renderBox,
	renderText,
	renderHLine,
	fillRect,
	BOX_SINGLE,
	type CellBuffer,
	packColor,
} from 'blecsd';
import type { FileStore, FileEntry, PreviewContent } from '../data';
import type { FileManagerConfig, SizeFormat } from '../config';
import { formatSize, formatDate } from '../config';
import { FileType, getFileCategory } from '../data';
import { COLORS } from './renderSystem';
import {
	type DualPaneState,
	type FileDragState,
	type PaneBounds,
	type PreviewBounds,
	type LayoutBounds,
	DUAL_PANE_COLORS,
	calculatePaneBounds,
	calculateLayoutBounds,
	getActivePane,
} from './dualPaneSystem';
import {
	getPreviewContent,
	getPreviewScroll,
} from '../components';
import { highlightContent, supportsHighlighting } from './syntaxHighlight';
import {
	getCurrentIndex,
	isItemSelected,
	getVisibleRange,
	getScrollPercentage,
} from '../components';
import type { VirtualListState } from './virtualListSystem';

/**
 * Unicode icons for UI elements.
 */
const ICONS = {
	directory: '📁',
	file: '📄',
	symlink: '🔗',
	executable: '⚙️',
	addPane: '➕',
	removePane: '✖',
	dragHandle: '⋮⋮',
};

/**
 * Dual-pane render state.
 */
export interface DualPaneRenderState {
	buffer: CellBuffer & { cells: { char: string; fg: number; bg: number }[][] };
	width: number;
	height: number;
}

/**
 * Creates dual-pane render state.
 */
export function createDualPaneRenderState(width: number, height: number): DualPaneRenderState {
	return {
		buffer: createCellBuffer(width, height) as DualPaneRenderState['buffer'],
		width,
		height,
	};
}

/**
 * Updates render state dimensions.
 */
export function updateDualPaneRenderDimensions(
	state: DualPaneRenderState,
	width: number,
	height: number,
): void {
	if (state.width !== width || state.height !== height) {
		state.buffer = createCellBuffer(width, height) as DualPaneRenderState['buffer'];
		state.width = width;
		state.height = height;
	}
}

/**
 * Gets file foreground color based on type.
 */
function getFileFg(entry: FileEntry): number {
	const category = getFileCategory(entry);
	switch (category) {
		case 'directory':
			return COLORS.directoryFg;
		case 'symlink':
			return COLORS.symlinkFg;
		case 'executable':
			return COLORS.executableFg;
		case 'archive':
			return COLORS.archiveFg;
		case 'image':
			return COLORS.imageFg;
		case 'audio':
			return COLORS.audioFg;
		case 'video':
			return COLORS.videoFg;
		case 'code':
			return COLORS.codeFg;
		default:
			return COLORS.rowFg;
	}
}

/**
 * Gets icon for file entry.
 */
function getIcon(entry: FileEntry): string {
	const category = getFileCategory(entry);
	switch (category) {
		case 'directory':
			return ICONS.directory;
		case 'symlink':
			return ICONS.symlink;
		case 'executable':
			return ICONS.executable;
		default:
			return ICONS.file;
	}
}

/**
 * Renders the dual-pane file manager.
 */
export function renderDualPane(
	world: World,
	renderState: DualPaneRenderState,
	dualPaneState: DualPaneState,
	dragState: FileDragState,
	fileStores: Map<string, FileStore>,
	config: FileManagerConfig,
	virtualListStates: Map<string, VirtualListState>,
	filterQuery?: string,
): void {
	const { buffer, width, height } = renderState;

	// Clear buffer
	fillRect(buffer, 0, 0, width, height, ' ', COLORS.rowFg, COLORS.rowBg);

	// Calculate layout bounds (panes + preview)
	const layoutBounds = calculateLayoutBounds(dualPaneState, width, height, 0, 0, 2, 2);

	// Render header
	renderDualPaneHeader(buffer, width, dualPaneState);

	// Render each pane
	for (const bounds of layoutBounds.panes) {
		const paneConfig = dualPaneState.panes.find((p) => p.id === bounds.paneId);
		if (!paneConfig) continue;

		const fileStore = fileStores.get(paneConfig.id);
		const listEid = dualPaneState.paneEntities.get(paneConfig.id);
		const virtualListState = virtualListStates.get(paneConfig.id);

		if (!fileStore || listEid === undefined || !virtualListState) continue;

		const isDropTarget = dragState.isDragging && dragState.targetPaneId === paneConfig.id;

		renderPane(
			world,
			buffer,
			bounds,
			paneConfig.isActive,
			paneConfig.path,
			fileStore,
			listEid,
			config,
			virtualListState,
			isDropTarget,
		);
	}

	// Render dividers between panes (only if >1 pane)
	if (dualPaneState.panes.length > 1) {
		renderPaneDividers(buffer, layoutBounds.panes, height);
	}

	// Render preview panel if enabled
	if (layoutBounds.preview && dualPaneState.previewEntity !== null) {
		renderPreviewPanel(
			world,
			buffer,
			dualPaneState.previewEntity,
			layoutBounds.preview,
			layoutBounds.panes,
			height,
		);
	}

	// Render add pane button (if space available)
	if (dualPaneState.panes.length < dualPaneState.config.maxPanes) {
		renderAddPaneButton(buffer, width, 0);
	}

	// Render status bar
	renderDualPaneStatusBar(buffer, width, height - 2, dualPaneState, fileStores);

	// Render action bar
	renderDualPaneActionBar(buffer, width, height - 1, dualPaneState);

	// Render drag ghost if dragging
	if (dragState.isDragging) {
		renderDragGhost(buffer, dragState);
	}
}

/**
 * Renders the header with pane paths.
 */
function renderDualPaneHeader(
	buffer: CellBuffer,
	width: number,
	state: DualPaneState,
): void {
	fillRect(buffer, 0, 0, width, 1, ' ', COLORS.headerFg, COLORS.headerBg);

	// Show title
	renderText(buffer, 1, 0, 'Dual-Pane File Manager', COLORS.headerFg, COLORS.headerBg);

	// Show quit hint
	renderText(buffer, width - 7, 0, '[q]uit', COLORS.headerFg, COLORS.headerBg);
}

/**
 * Renders a single pane.
 */
function renderPane(
	world: World,
	buffer: CellBuffer,
	bounds: PaneBounds,
	isActive: boolean,
	path: string,
	fileStore: FileStore,
	listEid: Entity,
	config: FileManagerConfig,
	virtualListState: VirtualListState,
	isDropTarget: boolean,
): void {
	const { x, y, width: paneWidth, height: paneHeight } = bounds;

	// Pane background
	const bgColor = isDropTarget
		? packColor(30, 50, 30) // Highlight for drop target
		: COLORS.rowBg;

	fillRect(buffer, x, y, paneWidth, paneHeight, ' ', COLORS.rowFg, bgColor);

	// Border color based on active state and drop target
	let borderColor = isActive
		? DUAL_PANE_COLORS.paneActiveBorder
		: DUAL_PANE_COLORS.paneInactiveBorder;

	if (isDropTarget) {
		borderColor = DUAL_PANE_COLORS.dropTargetHighlight;
	}

	// Render border
	renderBox(buffer, x, y, paneWidth, paneHeight, BOX_SINGLE, borderColor, bgColor);

	// Path header (inside the pane)
	const maxPathWidth = paneWidth - 4;
	let displayPath = path;
	if (displayPath.length > maxPathWidth) {
		displayPath = '...' + displayPath.slice(-(maxPathWidth - 3));
	}
	renderText(buffer, x + 2, y, ` ${displayPath} `, borderColor, bgColor);

	// Column headers
	const columnY = y + 1;
	fillRect(buffer, x + 1, columnY, paneWidth - 2, 1, ' ', COLORS.columnHeaderFg, COLORS.columnHeaderBg);
	renderText(buffer, x + 2, columnY, 'Name', COLORS.columnHeaderFg, COLORS.columnHeaderBg);
	if (paneWidth > 40) {
		renderText(buffer, x + paneWidth - 18, columnY, 'Size', COLORS.columnHeaderFg, COLORS.columnHeaderBg);
	}

	// File list
	const listY = y + 2;
	const listHeight = paneHeight - 3;
	renderFileListInPane(
		world,
		buffer,
		listEid,
		fileStore,
		config,
		virtualListState,
		x + 1,
		listY,
		paneWidth - 2,
		listHeight,
		bgColor,
	);
}

/**
 * Renders file list within a pane.
 */
function renderFileListInPane(
	world: World,
	buffer: CellBuffer,
	listEid: Entity,
	fileStore: FileStore,
	config: FileManagerConfig,
	virtualListState: VirtualListState,
	x: number,
	y: number,
	width: number,
	height: number,
	paneBg: number,
): void {
	const range = getVisibleRange(world, listEid);
	const currentIndex = getCurrentIndex(world, listEid);

	for (let i = 0; i < height; i++) {
		const rowY = y + i;
		const dataIndex = range.start + i;
		const entry = fileStore.getEntryAt(dataIndex);

		if (!entry || dataIndex >= range.end) {
			// Empty row
			fillRect(buffer, x, rowY, width, 1, ' ', COLORS.rowFg, paneBg);
			continue;
		}

		const isCurrent = dataIndex === currentIndex;
		const isSelected = isItemSelected(world, listEid, dataIndex);

		// Row colors
		let bg = i % 2 === 0 ? paneBg : packColor(20, 20, 20);
		let fg = getFileFg(entry);

		if (isCurrent && isSelected) {
			bg = COLORS.rowCurrentSelectedBg;
			fg = COLORS.rowCurrentFg;
		} else if (isCurrent) {
			bg = COLORS.rowCurrentBg;
			fg = COLORS.rowCurrentFg;
		} else if (isSelected) {
			bg = COLORS.rowSelectedBg;
			fg = COLORS.rowSelectedFg;
		}

		fillRect(buffer, x, rowY, width, 1, ' ', fg, bg);

		// Cursor indicator
		renderText(buffer, x, rowY, isCurrent ? '>' : ' ', fg, bg);

		// Icon
		const icon = getIcon(entry);
		renderText(buffer, x + 2, rowY, icon, fg, bg);

		// Name (truncated)
		const nameWidth = width - (width > 40 ? 22 : 6);
		let name = entry.name;
		if (name.length > nameWidth) {
			name = name.slice(0, nameWidth - 3) + '...';
		}
		renderText(buffer, x + 4, rowY, name, fg, bg);

		// Size (if space allows)
		if (width > 40) {
			const sizeStr = entry.type === FileType.Directory
				? '<DIR>'
				: formatSize(entry.size, config.sizeFormat);
			renderText(buffer, x + width - 12, rowY, sizeStr.padStart(8), fg, bg);
		}
	}
}

/**
 * Renders dividers between panes.
 */
function renderPaneDividers(
	buffer: CellBuffer,
	paneBounds: PaneBounds[],
	height: number,
): void {
	for (let i = 0; i < paneBounds.length - 1; i++) {
		const bounds = paneBounds[i];
		if (!bounds) continue;

		const dividerX = bounds.x + bounds.width;

		for (let y = 1; y < height - 2; y++) {
			buffer.setCell(dividerX, y, '│', DUAL_PANE_COLORS.paneDivider, COLORS.rowBg);
		}
	}
}

/**
 * Sanitizes a character for safe terminal output.
 */
function sanitizeChar(char: string): string {
	const code = char.charCodeAt(0);
	if ((code < 0x20 && code !== 0x09) || code === 0x7f) {
		return '·';
	}
	if (code === 0x09) {
		return ' ';
	}
	return char;
}

/**
 * Sanitizes a string for safe terminal output.
 */
function sanitizeText(text: string): string {
	let result = '';
	for (const char of text) {
		result += sanitizeChar(char);
	}
	return result;
}

/**
 * Preview panel colors.
 */
const PREVIEW_COLORS = {
	previewBg: packColor(0, 0, 0),
	previewMetaFg: packColor(180, 180, 180),
	previewContentFg: packColor(200, 200, 200),
	previewBinaryFg: packColor(100, 150, 200),
	previewBorder: packColor(0, 180, 180),
};

/**
 * Renders the preview panel.
 */
function renderPreviewPanel(
	world: World,
	buffer: CellBuffer,
	previewEid: Entity,
	previewBounds: PreviewBounds,
	paneBounds: PaneBounds[],
	height: number,
): void {
	const { x, y, width, height: panelHeight } = previewBounds;

	// Draw divider between panes and preview
	const lastPane = paneBounds[paneBounds.length - 1];
	if (lastPane) {
		const dividerX = lastPane.x + lastPane.width;
		for (let dy = 1; dy < height - 2; dy++) {
			buffer.setCell(dividerX, dy, '│', PREVIEW_COLORS.previewBorder, COLORS.rowBg);
		}
	}

	// Fill preview background
	fillRect(buffer, x, y, width, panelHeight, ' ', PREVIEW_COLORS.previewContentFg, PREVIEW_COLORS.previewBg);

	// Preview header
	fillRect(buffer, x, y, width, 1, ' ', COLORS.columnHeaderFg, COLORS.columnHeaderBg);
	renderText(buffer, x + 1, y, 'Preview', COLORS.columnHeaderFg, COLORS.columnHeaderBg);

	const preview = getPreviewContent(world, previewEid);
	if (!preview || !preview.name) {
		renderText(buffer, x + 2, y + 2, 'No selection', PREVIEW_COLORS.previewMetaFg, PREVIEW_COLORS.previewBg);
		return;
	}

	const scrollOffset = getPreviewScroll(world, previewEid);
	let lineY = y + 1;

	// File name
	const maxNameWidth = width - 2;
	let displayName = preview.name;
	if (displayName.length > maxNameWidth) {
		displayName = '...' + displayName.slice(-(maxNameWidth - 3));
	}
	renderText(buffer, x + 1, lineY, displayName, PREVIEW_COLORS.previewMetaFg, PREVIEW_COLORS.previewBg);
	lineY++;

	// Separator
	renderHLine(buffer, x + 1, lineY, width - 2, '─', COLORS.borderFg, PREVIEW_COLORS.previewBg);
	lineY++;

	// Metadata
	for (const line of preview.metadata) {
		if (lineY >= y + panelHeight) break;
		renderText(buffer, x + 1, lineY, line.slice(0, width - 2), PREVIEW_COLORS.previewMetaFg, PREVIEW_COLORS.previewBg);
		lineY++;
	}

	// Empty line
	lineY++;

	// Content
	const contentStartY = lineY;
	const contentHeight = y + panelHeight - contentStartY;

	if (contentHeight <= 0) return;

	const visibleContent = preview.content.slice(scrollOffset, scrollOffset + contentHeight);

	// Use syntax highlighting for supported file types
	const useHighlighting = !preview.isBinary && supportsHighlighting(preview.extension);

	if (useHighlighting) {
		const highlightedLines = highlightContent(visibleContent, preview.extension, PREVIEW_COLORS.previewContentFg);

		for (let i = 0; i < highlightedLines.length; i++) {
			if (contentStartY + i >= y + panelHeight) break;
			const highlightedLine = highlightedLines[i];
			if (!highlightedLine) continue;

			let charX = x + 1;
			const maxX = x + width - 1;

			for (const segment of highlightedLine.segments) {
				for (const char of segment.text) {
					if (charX >= maxX) break;
					const safeChar = sanitizeChar(char);
					buffer.setCell(charX, contentStartY + i, safeChar, segment.fg, PREVIEW_COLORS.previewBg);
					charX++;
				}
				if (charX >= maxX) break;
			}
		}
	} else {
		const contentFg = preview.isBinary ? PREVIEW_COLORS.previewBinaryFg : PREVIEW_COLORS.previewContentFg;

		for (let i = 0; i < visibleContent.length; i++) {
			if (contentStartY + i >= y + panelHeight) break;
			const line = visibleContent[i] ?? '';
			const safeLine = sanitizeText(line.slice(0, width - 2));
			renderText(buffer, x + 1, contentStartY + i, safeLine, contentFg, PREVIEW_COLORS.previewBg);
		}
	}
}

/**
 * Renders the add pane button.
 */
function renderAddPaneButton(
	buffer: CellBuffer,
	width: number,
	y: number,
): void {
	const btnText = `[+] Add Pane`;
	const btnX = width - btnText.length - 2;
	renderText(buffer, btnX, y, btnText, DUAL_PANE_COLORS.addPaneButton, COLORS.headerBg);
}

/**
 * Renders the status bar.
 */
function renderDualPaneStatusBar(
	buffer: CellBuffer,
	width: number,
	y: number,
	state: DualPaneState,
	fileStores: Map<string, FileStore>,
): void {
	fillRect(buffer, 0, y, width, 1, ' ', COLORS.statusBarFg, COLORS.statusBarBg);

	// Show active pane info
	const activePane = getActivePane(state);
	if (!activePane) return;

	const fileStore = fileStores.get(activePane.id);
	if (!fileStore) return;

	const leftText = `${fileStore.count} items | Pane ${state.activePaneIndex + 1}/${state.panes.length}`;
	renderText(buffer, 1, y, leftText, COLORS.statusBarFg, COLORS.statusBarBg);

	// Help hint
	const helpText = '[Tab] Switch pane | [+] Add | [-] Remove | [Space] Select | [D&D] Move files';
	const maxHelpWidth = width - leftText.length - 4;
	if (helpText.length <= maxHelpWidth) {
		renderText(buffer, width - helpText.length - 1, y, helpText, COLORS.statusBarFg, COLORS.statusBarBg);
	}
}

/**
 * Renders the action bar.
 */
function renderDualPaneActionBar(
	buffer: CellBuffer,
	width: number,
	y: number,
	state: DualPaneState,
): void {
	fillRect(buffer, 0, y, width, 1, ' ', COLORS.actionBarFg, COLORS.actionBarBg);

	const actions = [
		{ key: 'Tab', text: 'Switch' },
		{ key: '+', text: 'Add Pane' },
		{ key: '-', text: 'Remove' },
		{ key: 'Space', text: 'Select' },
		{ key: 'Enter', text: 'Open' },
		{ key: 'm', text: 'Move' },
		{ key: 'c', text: 'Copy' },
		{ key: '?', text: 'Help' },
	];

	let x = 1;
	for (const action of actions) {
		// Key
		const keyText = `[${action.key}]`;
		for (let i = 0; i < keyText.length; i++) {
			const char = keyText[i];
			if (char && x + i < width - 1) {
				buffer.setCell(x + i, y, char, COLORS.actionBarKeyFg, COLORS.actionBarBg);
			}
		}
		x += keyText.length;

		// Text
		for (let i = 0; i < action.text.length; i++) {
			const char = action.text[i];
			if (char && x + i < width - 1) {
				buffer.setCell(x + i, y, char, COLORS.actionBarFg, COLORS.actionBarBg);
			}
		}
		x += action.text.length + 1;

		if (x >= width - 10) break;
	}
}

/**
 * Renders drag ghost showing files being dragged.
 */
function renderDragGhost(
	buffer: CellBuffer,
	dragState: FileDragState,
): void {
	if (!dragState.isDragging || dragState.draggedFiles.length === 0) {
		return;
	}

	const x = dragState.dragX;
	const y = dragState.dragY;

	// Show count and first file name
	const count = dragState.draggedFiles.length;
	const firstName = dragState.draggedFiles[0]?.name ?? 'file';
	const text = count > 1
		? `${ICONS.dragHandle} ${count} files`
		: `${ICONS.dragHandle} ${firstName.slice(0, 20)}`;

	// Render ghost with shadow effect
	const ghostWidth = text.length + 2;

	// Shadow
	fillRect(buffer, x + 1, y + 1, ghostWidth, 1, '░', DUAL_PANE_COLORS.dragGhostBg, COLORS.rowBg);

	// Ghost box
	fillRect(buffer, x, y, ghostWidth, 1, ' ', DUAL_PANE_COLORS.dragGhost, DUAL_PANE_COLORS.dragGhostBg);
	renderText(buffer, x + 1, y, text, DUAL_PANE_COLORS.dragGhost, DUAL_PANE_COLORS.dragGhostBg);
}

/**
 * Converts buffer to ANSI string for output.
 */
export function dualPaneBufferToAnsi(state: DualPaneRenderState): string {
	const { buffer, width, height } = state;
	const lines: string[] = [];

	for (let y = 0; y < height; y++) {
		let line = '';
		let prevFg = -1;
		let prevBg = -1;

		for (let x = 0; x < width; x++) {
			const cell = buffer.cells[y]?.[x];
			if (!cell) continue;

			if (cell.fg !== prevFg || cell.bg !== prevBg) {
				const fgR = (cell.fg >> 16) & 0xff;
				const fgG = (cell.fg >> 8) & 0xff;
				const fgB = cell.fg & 0xff;
				const bgR = (cell.bg >> 16) & 0xff;
				const bgG = (cell.bg >> 8) & 0xff;
				const bgB = cell.bg & 0xff;

				line += `\x1b[38;2;${fgR};${fgG};${fgB};48;2;${bgR};${bgG};${bgB}m`;
				prevFg = cell.fg;
				prevBg = cell.bg;
			}

			line += cell.char;
		}

		lines.push(line);
	}

	return '\x1b[H' + lines.join('\n') + '\x1b[0m';
}
