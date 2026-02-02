/**
 * Render system for the file manager.
 * @module systems/renderSystem
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
// Import tag utilities from source for styled text support
import { parseTags, createTaggedText } from '../../../src/utils/tags';
import type { FileStore, FileEntry, PreviewContent } from '../data';
import { highlightContent, supportsHighlighting, SYNTAX_COLORS } from './syntaxHighlight';
import type { FileManagerConfig, SizeFormat } from '../config';
import { formatSize, formatDate } from '../config';
import {
	getCurrentIndex,
	isItemSelected,
	getDataIndex,
	getVisibleRange,
	getScrollPercentage,
	getPreviewContent,
	getPreviewScroll,
} from '../components';
import { FileType, getFileCategory } from '../data';
import type { VirtualListState } from './virtualListSystem';

/**
 * Color palette.
 */
export const COLORS = {
	// UI colors
	headerFg: packColor(255, 255, 255),
	headerBg: packColor(0, 80, 160),
	columnHeaderFg: packColor(255, 255, 255),
	columnHeaderBg: packColor(60, 60, 60),
	statusBarFg: packColor(255, 255, 255),
	statusBarBg: packColor(0, 80, 160),
	borderFg: packColor(100, 100, 100),
	borderBg: packColor(0, 0, 0),

	// List colors
	rowFg: packColor(255, 255, 255),
	rowBg: packColor(0, 0, 0),
	rowAltBg: packColor(20, 20, 20),
	rowSelectedFg: packColor(0, 0, 0),
	rowSelectedBg: packColor(0, 180, 180),
	rowCurrentFg: packColor(0, 0, 0),
	rowCurrentBg: packColor(255, 255, 255),
	rowCurrentSelectedBg: packColor(0, 220, 220),

	// File type colors
	directoryFg: packColor(80, 150, 255),
	symlinkFg: packColor(180, 100, 255),
	executableFg: packColor(100, 255, 100),
	archiveFg: packColor(255, 100, 100),
	imageFg: packColor(255, 180, 100),
	audioFg: packColor(255, 255, 100),
	videoFg: packColor(255, 100, 255),
	codeFg: packColor(100, 255, 200),

	// Preview colors
	previewBg: packColor(0, 0, 0),
	previewMetaFg: packColor(180, 180, 180),
	previewContentFg: packColor(200, 200, 200),
	previewBinaryFg: packColor(100, 150, 200),

	// Fuzzy match highlight color
	matchHighlightFg: packColor(255, 220, 0),

	// Action bar colors
	actionBarBg: packColor(40, 40, 40),
	actionBarFg: packColor(200, 200, 200),
	actionBarKeyFg: packColor(255, 220, 0),
	actionBarSeparator: packColor(80, 80, 80),
};

/**
 * Unicode file icons.
 */
const ICONS: Record<string, string> = {
	directory: '📁',
	file: '📄',
	symlink: '🔗',
	executable: '⚙️',
	image: '🖼️',
	audio: '🎵',
	video: '🎬',
	archive: '📦',
	code: '💻',
	text: '📝',
	document: '📋',
};

/**
 * Gets the icon for a file entry.
 */
function getIcon(entry: FileEntry): string {
	const category = getFileCategory(entry);
	return ICONS[category] ?? ICONS.file ?? '📄';
}

/**
 * Renders text with highlighted characters at specified indices.
 * Used to highlight fuzzy match results.
 */
function renderTextWithHighlight(
	buffer: CellBuffer,
	x: number,
	y: number,
	text: string,
	normalFg: number,
	highlightFg: number,
	bg: number,
	highlightIndices: readonly number[],
): void {
	const indexSet = new Set(highlightIndices);
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (!char) continue;
		const fg = indexSet.has(i) ? highlightFg : normalFg;
		buffer.setCell(x + i, y, char, fg, bg);
	}
}

/**
 * Gets the foreground color for a file entry.
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
 * Render state for the file manager.
 */
export interface RenderState {
	buffer: CellBuffer & { cells: { char: string; fg: number; bg: number }[][] };
	width: number;
	height: number;
	listWidth: number;
	previewWidth: number;
}

/**
 * Creates render state.
 */
export function createRenderState(width: number, height: number, splitRatio: number): RenderState {
	const listWidth = Math.floor((width - 1) * splitRatio);
	const previewWidth = width - listWidth - 1;

	return {
		buffer: createCellBuffer(width, height) as RenderState['buffer'],
		width,
		height,
		listWidth,
		previewWidth,
	};
}

/**
 * Updates render state dimensions.
 */
export function updateRenderDimensions(
	state: RenderState,
	width: number,
	height: number,
	splitRatio: number,
): void {
	if (state.width !== width || state.height !== height) {
		state.buffer = createCellBuffer(width, height) as RenderState['buffer'];
		state.width = width;
		state.height = height;
	}
	state.listWidth = Math.floor((width - 1) * splitRatio);
	state.previewWidth = width - state.listWidth - 1;
}

/** Default action bar items */
const ACTION_BAR_ITEMS: readonly ActionBarItem[] = [
	{ text: 'New', key: 'n' },
	{ text: 'Delete', key: 'd' },
	{ text: 'Rename', key: 'r' },
	{ text: 'Copy', key: 'c' },
	{ text: 'Move', key: 'm' },
	{ text: 'Refresh', key: 'R' },
	{ text: 'Help', key: '?' },
];

/**
 * Renders the entire file manager UI.
 * @param filterQuery - undefined when not filtering, string (even empty) when in filter mode
 */
export function render(
	world: World,
	state: RenderState,
	listEid: Entity,
	previewEid: Entity,
	fileStore: FileStore,
	config: FileManagerConfig,
	virtualListState: VirtualListState,
	filterQuery?: string,
): void {
	const { buffer, width, height, listWidth, previewWidth } = state;

	// Clear buffer
	fillRect(buffer, 0, 0, width, height, ' ', COLORS.rowFg, COLORS.rowBg);

	// Header (row 0)
	renderHeader(buffer, width, fileStore.currentPath);

	// Column headers (row 1)
	renderColumnHeaders(buffer, listWidth);

	// Vertical divider
	const dividerX = listWidth;
	for (let y = 1; y < height - 2; y++) {
		buffer.setCell(dividerX, y, '│', COLORS.borderFg, COLORS.borderBg);
	}

	// File list (rows 2 to height-3)
	const listHeight = height - 4; // Header + column header + status bar + action bar
	renderFileList(
		world,
		buffer,
		listEid,
		fileStore,
		config,
		virtualListState,
		0,
		2,
		listWidth,
		listHeight,
	);

	// Preview panel
	if (config.showPreview && previewWidth > 5) {
		renderPreviewPanel(
			world,
			buffer,
			previewEid,
			dividerX + 1,
			1,
			previewWidth,
			height - 3,
		);
	}

	// Status bar (second to last row)
	renderStatusBar(
		world,
		buffer,
		listEid,
		fileStore,
		config,
		width,
		height - 2,
		filterQuery,
	);

	// Action bar (bottom row)
	renderActionBar(buffer, width, height - 1, ACTION_BAR_ITEMS);
}

/**
 * Renders the header bar.
 */
function renderHeader(buffer: CellBuffer, width: number, path: string): void {
	fillRect(buffer, 0, 0, width, 1, ' ', COLORS.headerFg, COLORS.headerBg);

	// Path (truncated from left if needed)
	const maxPathWidth = width - 10;
	let displayPath = path;
	if (displayPath.length > maxPathWidth) {
		displayPath = '...' + displayPath.slice(-(maxPathWidth - 3));
	}
	renderText(buffer, 1, 0, displayPath, COLORS.headerFg, COLORS.headerBg);

	// Quit hint
	renderText(buffer, width - 7, 0, '[q]uit', COLORS.headerFg, COLORS.headerBg);
}

/**
 * Renders column headers.
 */
function renderColumnHeaders(buffer: CellBuffer, width: number): void {
	fillRect(buffer, 0, 1, width, 1, ' ', COLORS.columnHeaderFg, COLORS.columnHeaderBg);

	const nameWidth = width - 20;
	renderText(buffer, 1, 1, 'Name', COLORS.columnHeaderFg, COLORS.columnHeaderBg);
	renderText(buffer, nameWidth + 1, 1, 'Size', COLORS.columnHeaderFg, COLORS.columnHeaderBg);
	renderText(buffer, nameWidth + 10, 1, 'Modified', COLORS.columnHeaderFg, COLORS.columnHeaderBg);
}

/**
 * Renders the file list.
 */
function renderFileList(
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
): void {
	const range = getVisibleRange(world, listEid);
	const currentIndex = getCurrentIndex(world, listEid);
	const rows = virtualListState.listRows.get(listEid) ?? [];

	for (let i = 0; i < height; i++) {
		const rowY = y + i;
		const dataIndex = range.start + i;
		const entry = fileStore.getEntryAt(dataIndex);

		if (!entry || dataIndex >= range.end) {
			// Empty row
			fillRect(buffer, x, rowY, width, 1, ' ', COLORS.rowFg, COLORS.rowBg);
			continue;
		}

		const isCurrent = dataIndex === currentIndex;
		const isSelected = isItemSelected(world, listEid, dataIndex);

		// Row background
		let bg = i % 2 === 0 ? COLORS.rowBg : COLORS.rowAltBg;
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

		// Icon and name
		const icon = getIcon(entry);
		const nameWidth = width - 20;
		renderText(buffer, x + 1, rowY, isCurrent ? '>' : ' ', fg, bg);
		renderText(buffer, x + 3, rowY, icon, fg, bg);

		let name = entry.name;
		const maxNameLen = nameWidth - 6;
		let displayIndices: readonly number[] = [];

		// Get fuzzy match info for highlighting
		const matchInfo = fileStore.getMatchInfo(dataIndex);
		if (matchInfo && matchInfo.indices.length > 0) {
			displayIndices = matchInfo.indices;
		}

		// Truncate name if needed, adjusting highlight indices
		if (name.length > maxNameLen) {
			name = name.slice(0, maxNameLen - 3) + '...';
			// Filter indices to only include those in the visible part
			displayIndices = displayIndices.filter((idx) => idx < maxNameLen - 3);
		}

		// Render name with highlighted matched characters
		if (displayIndices.length > 0) {
			renderTextWithHighlight(
				buffer,
				x + 5,
				rowY,
				name,
				fg,
				COLORS.matchHighlightFg,
				bg,
				displayIndices,
			);
		} else {
			renderText(buffer, x + 5, rowY, name, fg, bg);
		}

		// Size
		const sizeStr =
			entry.type === FileType.Directory
				? '<DIR>'
				: formatSize(entry.size, config.sizeFormat);
		renderText(buffer, x + nameWidth + 1, rowY, sizeStr.padStart(8), fg, bg);

		// Modified date
		renderText(buffer, x + nameWidth + 10, rowY, formatDate(entry.modified), fg, bg);
	}
}

/**
 * Renders the preview panel.
 */
function renderPreviewPanel(
	world: World,
	buffer: CellBuffer,
	previewEid: Entity,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	const preview = getPreviewContent(world, previewEid);
	if (!preview || !preview.name) {
		// Empty preview
		renderText(buffer, x + 2, y + 1, 'No selection', COLORS.previewMetaFg, COLORS.previewBg);
		return;
	}

	const scrollOffset = getPreviewScroll(world, previewEid);
	let lineY = y;

	// File name
	renderText(buffer, x + 1, lineY, preview.name, COLORS.previewMetaFg, COLORS.previewBg);
	lineY++;

	// Separator
	renderHLine(buffer, x + 1, lineY, width - 2, '─', COLORS.borderFg, COLORS.previewBg);
	lineY++;

	// Metadata
	for (const line of preview.metadata) {
		if (lineY >= y + height) break;
		renderText(buffer, x + 1, lineY, line.slice(0, width - 2), COLORS.previewMetaFg, COLORS.previewBg);
		lineY++;
	}

	// Empty line
	lineY++;

	// Content
	const contentStartY = lineY;
	const contentHeight = y + height - contentStartY;

	const visibleContent = preview.content.slice(scrollOffset, scrollOffset + contentHeight);

	// Use syntax highlighting for supported file types
	const useHighlighting = !preview.isBinary && supportsHighlighting(preview.extension);

	if (useHighlighting) {
		const highlightedLines = highlightContent(visibleContent, preview.extension, COLORS.previewContentFg);

		for (let i = 0; i < highlightedLines.length; i++) {
			if (contentStartY + i >= y + height) break;
			const highlightedLine = highlightedLines[i];
			if (!highlightedLine) continue;

			let charX = x + 1;
			const maxX = x + width - 1;

			for (const segment of highlightedLine.segments) {
				for (const char of segment.text) {
					if (charX >= maxX) break;
					buffer.setCell(charX, contentStartY + i, char, segment.fg, COLORS.previewBg);
					charX++;
				}
				if (charX >= maxX) break;
			}
		}
	} else {
		// Fallback to plain rendering for binary or unsupported files
		const contentFg = preview.isBinary ? COLORS.previewBinaryFg : COLORS.previewContentFg;

		for (let i = 0; i < visibleContent.length; i++) {
			if (contentStartY + i >= y + height) break;
			const line = visibleContent[i] ?? '';
			renderText(
				buffer,
				x + 1,
				contentStartY + i,
				line.slice(0, width - 2),
				contentFg,
				COLORS.previewBg,
			);
		}
	}
}

/**
 * Action bar item definition.
 */
interface ActionBarItem {
	text: string;
	key: string;
}

/**
 * Renders the action bar.
 */
function renderActionBar(
	buffer: CellBuffer,
	width: number,
	y: number,
	items: readonly ActionBarItem[],
): void {
	fillRect(buffer, 0, y, width, 1, ' ', COLORS.actionBarFg, COLORS.actionBarBg);

	let x = 1;
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item) continue;

		// Render key hint in yellow
		const keyText = `[${item.key}]`;
		for (let j = 0; j < keyText.length; j++) {
			const char = keyText[j];
			if (char && x + j < width - 1) {
				buffer.setCell(x + j, y, char, COLORS.actionBarKeyFg, COLORS.actionBarBg);
			}
		}
		x += keyText.length;

		// Render text
		for (let j = 0; j < item.text.length; j++) {
			const char = item.text[j];
			if (char && x + j < width - 1) {
				buffer.setCell(x + j, y, char, COLORS.actionBarFg, COLORS.actionBarBg);
			}
		}
		x += item.text.length;

		// Add separator (except for last item)
		if (i < items.length - 1) {
			x += 1;
			if (x < width - 1) {
				buffer.setCell(x, y, '│', COLORS.actionBarSeparator, COLORS.actionBarBg);
			}
			x += 2;
		}
	}
}

/**
 * Renders the status bar.
 */
function renderStatusBar(
	world: World,
	buffer: CellBuffer,
	listEid: Entity,
	fileStore: FileStore,
	config: FileManagerConfig,
	width: number,
	y: number,
	filterQuery = '',
): void {
	fillRect(buffer, 0, y, width, 1, ' ', COLORS.statusBarFg, COLORS.statusBarBg);

	// Show filter prompt when in filter mode (filterQuery is undefined when not filtering)
	if (filterQuery !== undefined) {
		const filterText = `🔍 Filter: ${filterQuery}_`;
		renderText(buffer, 1, y, filterText, COLORS.matchHighlightFg, COLORS.statusBarBg);

		// Show match count on the right
		const matchText = `${fileStore.count} matches`;
		renderText(buffer, width - matchText.length - 2, y, matchText, COLORS.statusBarFg, COLORS.statusBarBg);
		return;
	}

	// Item count and size
	const totalSize = formatSize(fileStore.getTotalSize(), config.sizeFormat);
	const leftText = `${fileStore.count.toLocaleString()} items · ${totalSize}`;
	renderText(buffer, 1, y, leftText, COLORS.statusBarFg, COLORS.statusBarBg);

	// Hidden files indicator
	const hiddenText = `[H]idden: ${config.showHidden ? 'ON' : 'OFF'}`;
	const hiddenX = Math.floor(width / 2) - Math.floor(hiddenText.length / 2);
	renderText(buffer, hiddenX, y, hiddenText, COLORS.statusBarFg, COLORS.statusBarBg);

	// Scroll position
	const currentIndex = getCurrentIndex(world, listEid) + 1;
	const total = fileStore.count;
	const percent = getScrollPercentage(world, listEid);

	// Scroll indicator (simplified)
	const scrollBarWidth = 6;
	const scrollX = width - scrollBarWidth - 12;
	const rightText = `${currentIndex}/${total}`;
	renderText(buffer, scrollX, y, rightText, COLORS.statusBarFg, COLORS.statusBarBg);

	// Mini scroll bar
	const barX = width - scrollBarWidth - 1;
	const filledCount = Math.max(1, Math.round((percent / 100) * scrollBarWidth));
	for (let i = 0; i < scrollBarWidth; i++) {
		const char = i < filledCount ? '▓' : '░';
		buffer.setCell(barX + i, y, char, COLORS.statusBarFg, COLORS.statusBarBg);
	}
}

/**
 * Converts buffer to ANSI string for output.
 */
export function bufferToAnsi(state: RenderState): string {
	const { buffer, width, height } = state;
	const lines: string[] = [];

	for (let y = 0; y < height; y++) {
		let line = '';
		let prevFg = -1;
		let prevBg = -1;

		for (let x = 0; x < width; x++) {
			const cell = buffer.cells[y]?.[x];
			if (!cell) continue;

			// Only emit color codes when colors change
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
