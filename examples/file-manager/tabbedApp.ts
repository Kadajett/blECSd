#!/usr/bin/env node
/**
 * Tabbed file manager application.
 * Demonstrates tabs, virtualized lists, scrollback preview, and incremental syntax highlighting.
 * @module tabbedApp
 */

import { appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Debug logging to file (doesn't interfere with TUI)
const DEBUG_LOG_PATH = '/tmp/filemanager-debug.log';
let debugEnabled = process.env.DEBUG_FILEMANAGER === '1';

function debugLog(message: string, data?: unknown): void {
	if (!debugEnabled) return;
	const timestamp = new Date().toISOString();
	const line = data
		? `${timestamp} ${message}: ${JSON.stringify(data)}\n`
		: `${timestamp} ${message}\n`;
	appendFileSync(DEBUG_LOG_PATH, line);
}

function clearDebugLog(): void {
	if (!debugEnabled) return;
	writeFileSync(DEBUG_LOG_PATH, `--- Debug log started at ${new Date().toISOString()} ---\n`);
}
import { addEntity } from 'bitecs';
import type { Entity, World, KeyEvent, ParsedMouseEvent, CellBuffer } from 'blecsd';
import {
	createWorld,
	parseKeyBuffer,
	parseMouseSequence,
	createCellBuffer,
	renderText,
	renderBox,
	fillRect,
	BOX_SINGLE,
	packColor,
	getListSelectedIndex,
	setListSelectedIndex,
	attachListBehavior,
	setTotalCount,
	setVisibleCount,
	setFirstVisible,
	ensureVisible,
	getScrollInfo,
	selectPrev,
	selectNext,
	selectFirst,
	selectLast,
	scrollPage,
	listStore,
	// Tabs and listbar widgets
	createTabs,
	type TabsWidget,
	createListbar,
	type ListbarWidget,
	// Syntax highlighting
	createHighlightCache,
	detectLanguage,
	detectLanguageFromContent,
	highlightVisibleFirst,
	setGrammar,
	type HighlightCache,
	type LineEntry,
	type TokenType,
	// Scrollback buffer
	appendLines,
	clearScrollback,
	createScrollbackBuffer,
	getVisibleLines,
	scrollScrollbackBy,
	type ScrollbackBuffer,
} from 'blecsd';
import { getIcon } from './ui/icons';
import {
	type Region,
	type ScrollbarConfig,
	createRegion,
	isPointInRegion,
	renderScrollbar as renderScrollbarView,
	renderTextWithTabs,
	DEFAULT_SCROLLBAR,
} from './ui/scrollView';
import { createConfig, type FileManagerConfig, formatDate, formatSize, nextSizeFormat, nextSortField, toggleSortDirection, SortField } from './config';
import { createFileStore, type FileStore } from './data/fileStore';
import { FileType, getFileCategory } from './data/fileEntry';
import { getHomePath } from './data/filesystem';
import { loadPreview, createQuickPreview, EMPTY_PREVIEW, type PreviewContent } from './data/preview';

// =============================================================================
// TYPES
// =============================================================================

type CellBufferWithCells = CellBuffer & { cells: { char: string; fg: number; bg: number }[][] };

interface PreviewState {
	content: PreviewContent;
	isLoading: boolean;
	scrollLine: number;
	scrollback: ScrollbackBuffer;
	contentStartLine: number;
	contentText: string;
	highlightCache: HighlightCache;
	debounceTimer: ReturnType<typeof setTimeout> | null;
	loadingIndex: number;
}

interface TabState {
	id: string;
	title: string;
	path: string;
	fileStore: FileStore;
	listEid: Entity;
	selection: Set<number>;
	preview: PreviewState;
}

interface RenderState {
	buffer: CellBufferWithCells;
	width: number;
	height: number;
	listWidth: number;
	previewWidth: number;
	contentHeight: number;
	listHeight: number;
	tabHitRegions: Array<{ start: number; end: number; index: number }>;
	// Hit test regions - computed once on resize, used for mouse events
	listRegion: Region;
	previewRegion: Region;
}

interface ClickState {
	lastClickTime: number;
	lastClickIndex: number;
	lastClickX: number;
	lastClickY: number;
}

interface AppState {
	world: World;
	config: FileManagerConfig;
	tabsWidget: TabsWidget;
	tabs: TabState[];
	activeTab: number;
	focusedPane: 'list' | 'preview';
	filterMode: boolean;
	filterQuery: string;
	renderState: RenderState;
	actionBar: ListbarWidget;
	running: boolean;
	needsRedraw: boolean;
	clickState: ClickState;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COLORS = {
	// Base colors
	bg: packColor(24, 24, 28),
	panelBg: packColor(30, 30, 36),
	borderFg: packColor(60, 60, 70),
	borderFocused: packColor(100, 150, 255),

	// Header and navigation
	headFg: packColor(255, 255, 255),
	headBg: packColor(45, 90, 160),
	columnFg: packColor(180, 185, 195),
	columnBg: packColor(38, 38, 46),
	columnSortFg: packColor(100, 180, 255),

	// Status bar
	statusFg: packColor(220, 225, 235),
	statusBg: packColor(45, 90, 160),
	statusDimFg: packColor(160, 170, 190),

	// Action bar
	actionFg: packColor(170, 175, 185),
	actionBg: packColor(32, 32, 40),
	actionKeyFg: packColor(100, 180, 255),

	// List rows
	rowFg: packColor(210, 215, 225),
	rowBg: packColor(30, 30, 36),
	rowAltBg: packColor(35, 35, 42),
	rowSelectedFg: packColor(255, 255, 255),
	rowSelectedBg: packColor(50, 100, 180),
	rowCurrentFg: packColor(255, 255, 255),
	rowCurrentBg: packColor(70, 130, 220),
	rowCurrentSelectedBg: packColor(80, 150, 240),
	rowHoverBg: packColor(45, 45, 55),

	// File type colors
	directoryFg: packColor(100, 170, 255),
	symlinkFg: packColor(180, 130, 255),
	executableFg: packColor(100, 230, 100),
	archiveFg: packColor(255, 130, 130),
	imageFg: packColor(255, 180, 100),
	audioFg: packColor(255, 220, 100),
	videoFg: packColor(255, 130, 220),
	codeFg: packColor(100, 230, 200),
	documentFg: packColor(200, 200, 200),
	textFg: packColor(180, 180, 180),

	// Preview
	previewMetaFg: packColor(140, 145, 160),
	previewContentFg: packColor(200, 205, 215),
	previewBinaryFg: packColor(100, 150, 220),
	previewBg: packColor(28, 28, 34),
	previewLineFg: packColor(80, 85, 100),

	// Highlights
	matchHighlightFg: packColor(255, 200, 50),
	matchHighlightBg: packColor(80, 60, 0),

	// Tabs
	tabActiveFg: packColor(255, 255, 255),
	tabActiveBg: packColor(55, 100, 180),
	tabInactiveFg: packColor(160, 165, 175),
	tabInactiveBg: packColor(38, 38, 46),
	tabHoverBg: packColor(50, 50, 60),

	// Filter
	filterFg: packColor(255, 200, 50),
	filterBg: packColor(60, 50, 20),

	// Scrollbar
	scrollbarBg: packColor(40, 40, 50),
	scrollbarFg: packColor(80, 85, 100),
	scrollbarHoverFg: packColor(100, 110, 130),
};

const TOKEN_COLORS: Record<TokenType, number> = {
	keyword: packColor(197, 134, 192),
	string: packColor(206, 145, 120),
	number: packColor(181, 206, 168),
	comment: packColor(106, 153, 85),
	operator: packColor(212, 212, 212),
	punctuation: packColor(212, 212, 212),
	identifier: packColor(220, 220, 220),
	function: packColor(220, 220, 170),
	type: packColor(78, 201, 176),
	constant: packColor(100, 150, 255),
	variable: packColor(156, 220, 254),
	property: packColor(156, 220, 254),
	builtin: packColor(86, 156, 214),
	regexp: packColor(209, 105, 105),
	escape: packColor(215, 186, 125),
	tag: packColor(86, 156, 214),
	attribute: packColor(156, 220, 254),
	text: COLORS.previewContentFg,
};

const ACTION_ITEMS = [
	{ text: 'New Tab', key: 't' },
	{ text: 'Close Tab', key: 'w' },
	{ text: 'Filter', key: '/' },
	{ text: 'Hidden', key: '.' },
	{ text: 'Sort', key: 's' },
	{ text: 'Preview', key: 'p' },
	{ text: 'Quit', key: 'q' },
];

const PREVIEW_BOTTOM_BUFFER = 4;
const FILTER_PROMPT = 'Filter: ';
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// =============================================================================
// STATE HELPERS
// =============================================================================

function createPreviewState(): PreviewState {
	return {
		content: EMPTY_PREVIEW,
		isLoading: false,
		scrollLine: 0,
		scrollback: createScrollbackBuffer({ maxCachedChunks: 40 }),
		contentStartLine: 0,
		contentText: '',
		highlightCache: createHighlightCache(detectLanguage('')),
		debounceTimer: null,
		loadingIndex: -1,
	};
}

function createRenderState(width: number, height: number, splitRatio: number, showPreview: boolean): RenderState {
	const listWidth = Math.max(20, Math.floor((width - 1) * splitRatio));
	const previewWidth = Math.max(0, width - listWidth - 1);
	const contentHeight = Math.max(1, height - 5);
	const listHeight = Math.max(1, contentHeight);

	return {
		buffer: createCellBuffer(width, height) as CellBufferWithCells,
		width,
		height,
		listWidth,
		previewWidth,
		contentHeight,
		listHeight,
		tabHitRegions: [],
	};
}

function updateRenderState(state: RenderState, width: number, height: number, splitRatio: number, showPreview: boolean): void {
	if (state.width !== width || state.height !== height) {
		state.buffer = createCellBuffer(width, height) as CellBufferWithCells;
		state.width = width;
		state.height = height;
	}
	state.listWidth = showPreview ? Math.max(20, Math.floor((width - 1) * splitRatio)) : width;
	state.previewWidth = showPreview ? Math.max(0, width - state.listWidth - 1) : 0;
	state.contentHeight = Math.max(1, height - 5);
	state.listHeight = Math.max(1, state.contentHeight);
}

function getActiveTab(state: AppState): TabState | undefined {
	return state.tabs[state.activeTab];
}

function resetListForTab(world: World, tab: TabState, visibleCount: number): void {
	const count = tab.fileStore.count;
	// Set both itemCount and totalCount so selection functions work correctly
	listStore.itemCount[tab.listEid] = count;
	setTotalCount(world, tab.listEid, count);
	setVisibleCount(world, tab.listEid, visibleCount);
	setFirstVisible(world, tab.listEid, 0);
	setListSelectedIndex(world, tab.listEid, count > 0 ? 0 : -1);
	tab.selection.clear();
}

function updateTabTitle(tab: TabState): void {
	const pathParts = tab.path.split('/').filter(Boolean);
	const name = pathParts[pathParts.length - 1] ?? tab.path;
	tab.title = name === '' ? '/' : name;
}

function buildPreviewScrollback(preview: PreviewState, content: PreviewContent): void {
	clearScrollback(preview.scrollback);
	preview.scrollLine = 0;
	preview.content = content;
	preview.contentText = '';
	preview.contentStartLine = 0;

	const metaLines = content.metadata.map((line) => `• ${line}`);
	const header = content.name ? [content.name] : [];
	const allLines = [...header, ...metaLines, '', ...content.content];
	preview.contentStartLine = header.length + metaLines.length + 1;
	preview.contentText = content.content.join('\n');
	appendLines(preview.scrollback, allLines);

	const primaryGrammar = detectLanguage(content.name || content.extension);
	const inferredGrammar = primaryGrammar.name === 'plaintext' && preview.contentText
		? detectLanguageFromContent(preview.contentText)
		: primaryGrammar;
	setGrammar(preview.highlightCache, inferredGrammar);
}

// =============================================================================
// APP CREATION
// =============================================================================

async function createTab(
	world: World,
	config: FileManagerConfig,
	path: string,
	listHeight: number,
): Promise<TabState> {
	const fileStore = createFileStore();
	await fileStore.loadDirectory(path, config);

	const listEid = addEntity(world);
	attachListBehavior(world, listEid, [], {
		interactive: true,
		mouse: true,
		keys: true,
		search: false,
		visibleCount: listHeight,
		selectedIndex: fileStore.count > 0 ? 0 : -1,
	});

	// Set both itemCount and totalCount so selection functions work correctly
	// (we render directly from FileStore, not from ECS items)
	listStore.itemCount[listEid] = fileStore.count;
	setTotalCount(world, listEid, fileStore.count);

	const preview = createPreviewState();
	buildPreviewScrollback(preview, EMPTY_PREVIEW);

	const tab: TabState = {
		id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		title: path,
		path,
		fileStore,
		listEid,
		selection: new Set<number>(),
		preview,
	};

	updateTabTitle(tab);
	return tab;
}

async function createAppState(initialPath: string, width: number, height: number): Promise<AppState> {
	const world = createWorld();
	const config = createConfig();
	const renderState = createRenderState(width, height, config.splitRatio, config.showPreview);

	const tabsEid = addEntity(world);
	const tabsWidget = createTabs(world, tabsEid, {
		activeTab: 0,
		position: 'top',
		tabs: [],
	});

	const actionBarEid = addEntity(world);
	const actionBar = createListbar(world, actionBarEid, {
		y: height - 1,
		items: ACTION_ITEMS.map((item) => ({ text: item.text, key: item.key, value: item.text })),
		autoCommandKeys: false,
		style: {
			item: { fg: COLORS.actionFg, bg: COLORS.actionBg },
			selected: { fg: COLORS.rowSelectedFg, bg: COLORS.rowSelectedBg },
			prefix: { fg: COLORS.matchHighlightFg, bg: COLORS.actionBg },
			separator: ' ',
		},
	});

	const initialTab = await createTab(world, config, initialPath, renderState.listHeight);
	const tabs = [initialTab];
	tabsWidget.addTab({ label: initialTab.title });

	return {
		world,
		config,
		tabsWidget,
		tabs,
		activeTab: 0,
		focusedPane: 'list',
		filterMode: false,
		filterQuery: '',
		renderState,
		actionBar,
		running: true,
		needsRedraw: true,
		clickState: {
			lastClickTime: 0,
			lastClickIndex: -1,
			lastClickX: -1,
			lastClickY: -1,
		},
	};
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

function applyFilter(state: AppState, tab: TabState, query: string): void {
	tab.fileStore.setFilter(query, state.config);
	resetListForTab(state.world, tab, state.renderState.listHeight);
	state.needsRedraw = true;
	updatePreviewForSelection(state, tab).catch(() => undefined);
}

function handleFilterInput(state: AppState, event: KeyEvent): void {
	const key = event.name;

	if (key === 'escape') {
		state.filterMode = false;
		state.filterQuery = '';
		const tab = getActiveTab(state);
		if (tab) {
			applyFilter(state, tab, '');
		}
		return;
	}

	if (key === 'enter' || key === 'return') {
		state.filterMode = false;
		return;
	}

	if (key === 'backspace') {
		state.filterQuery = state.filterQuery.slice(0, -1);
		const tab = getActiveTab(state);
		if (tab) applyFilter(state, tab, state.filterQuery);
		return;
	}

	const text = event.sequence ?? '';
	if (text.length === 1 && !event.ctrl && !event.meta) {
		state.filterQuery += text;
		const tab = getActiveTab(state);
		if (tab) applyFilter(state, tab, state.filterQuery);
	}
}

async function handleKeyInput(state: AppState, event: KeyEvent): Promise<void> {
	if (state.filterMode) {
		handleFilterInput(state, event);
		return;
	}

	const key = event.name.toLowerCase();
	const tab = getActiveTab(state);
	if (!tab) return;

	if (key === 'q' || (event.ctrl && key === 'c')) {
		const stateWithExit = state as AppState & { exit?: () => void };
		if (stateWithExit.exit) {
			stateWithExit.exit();
		} else {
			state.running = false;
		}
		return;
	}

	if (event.ctrl && event.shift && key === 'tab') {
		setActiveTab(state, (state.activeTab - 1 + state.tabs.length) % state.tabs.length);
		return;
	}

	if (event.ctrl && key === 'tab') {
		setActiveTab(state, (state.activeTab + 1) % state.tabs.length);
		return;
	}

	if (key === 't') {
		await addTab(state, tab.path);
		return;
	}

	if (key === 'w') {
		closeActiveTab(state);
		return;
	}

	if (event.ctrl && key === 'r') {
		await changeDirectory(state, tab, tab.path);
		return;
	}

	if (event.ctrl && key === 'a') {
		const total = tab.fileStore.count;
		for (let i = 0; i < total; i++) {
			tab.selection.add(i);
		}
		state.needsRedraw = true;
		return;
	}

	if (key === 'escape') {
		// Clear multi-selection
		tab.selection.clear();
		state.needsRedraw = true;
		return;
	}

	if (key === 'tab') {
		state.focusedPane = state.focusedPane === 'list' ? 'preview' : 'list';
		state.needsRedraw = true;
		return;
	}

	if (key === '/' && !event.ctrl && !event.meta) {
		state.filterMode = true;
		state.filterQuery = '';
		state.needsRedraw = true;
		return;
	}

	if (key === '.' || (event.ctrl && key === 'h')) {
		state.config = { ...state.config, showHidden: !state.config.showHidden };
		tab.fileStore.resort(state.config);
		resetListForTab(state.world, tab, state.renderState.listHeight);
		state.needsRedraw = true;
		return;
	}

	if (key === 's' && event.shift) {
		state.config = { ...state.config, sortDirection: toggleSortDirection(state.config.sortDirection) };
		tab.fileStore.resort(state.config);
		resetListForTab(state.world, tab, state.renderState.listHeight);
		state.needsRedraw = true;
		return;
	}

	if (key === 's') {
		state.config = { ...state.config, sortField: nextSortField(state.config.sortField) };
		tab.fileStore.resort(state.config);
		resetListForTab(state.world, tab, state.renderState.listHeight);
		state.needsRedraw = true;
		return;
	}

	if (key === 'f') {
		state.config = { ...state.config, sizeFormat: nextSizeFormat(state.config.sizeFormat) };
		state.needsRedraw = true;
		return;
	}

	if (key === 'p') {
		state.config = { ...state.config, showPreview: !state.config.showPreview };
		updateRenderState(state.renderState, state.renderState.width, state.renderState.height, state.config.splitRatio, state.config.showPreview);
		for (const existingTab of state.tabs) {
			setVisibleCount(state.world, existingTab.listEid, state.renderState.listHeight);
		}
		state.needsRedraw = true;
		return;
	}

	if (state.focusedPane === 'preview') {
		const delta = key === ']' || key === 'pagedown' ? 5 : key === '[' || key === 'pageup' ? -5 : 0;
		if (delta !== 0) {
			scrollPreview(tab.preview, delta, state.renderState.contentHeight);
			state.needsRedraw = true;
			return;
		}
	}

	// Handle list navigation keys directly
	if (key === 'up' || key === 'k') {
		selectPrev(state.world, tab.listEid);
		const selectedIndex = getListSelectedIndex(tab.listEid);
		ensureVisible(state.world, tab.listEid, selectedIndex);
		state.needsRedraw = true;
		await updatePreviewForSelection(state, tab);
		return;
	}

	if (key === 'down' || key === 'j') {
		selectNext(state.world, tab.listEid);
		const selectedIndex = getListSelectedIndex(tab.listEid);
		ensureVisible(state.world, tab.listEid, selectedIndex);
		state.needsRedraw = true;
		await updatePreviewForSelection(state, tab);
		return;
	}

	if (key === 'pageup') {
		scrollPage(state.world, tab.listEid, -1);
		const selectedIndex = getListSelectedIndex(tab.listEid);
		ensureVisible(state.world, tab.listEid, selectedIndex);
		state.needsRedraw = true;
		await updatePreviewForSelection(state, tab);
		return;
	}

	if (key === 'pagedown') {
		scrollPage(state.world, tab.listEid, 1);
		const selectedIndex = getListSelectedIndex(tab.listEid);
		ensureVisible(state.world, tab.listEid, selectedIndex);
		state.needsRedraw = true;
		await updatePreviewForSelection(state, tab);
		return;
	}

	if (key === 'home' || key === 'g') {
		selectFirst(state.world, tab.listEid);
		const selectedIndex = getListSelectedIndex(tab.listEid);
		ensureVisible(state.world, tab.listEid, selectedIndex);
		state.needsRedraw = true;
		await updatePreviewForSelection(state, tab);
		return;
	}

	if (key === 'end') {
		selectLast(state.world, tab.listEid);
		const selectedIndex = getListSelectedIndex(tab.listEid);
		ensureVisible(state.world, tab.listEid, selectedIndex);
		state.needsRedraw = true;
		await updatePreviewForSelection(state, tab);
		return;
	}

	if (key === ' ' || key === 'space') {
		const selectedIndex = getListSelectedIndex(tab.listEid);
		toggleSelection(tab, selectedIndex);
		selectNext(state.world, tab.listEid);
		ensureVisible(state.world, tab.listEid, getListSelectedIndex(tab.listEid));
		state.needsRedraw = true;
		return;
	}

	if (key === 'enter' || key === 'return' || key === 'l') {
		await openSelection(state, tab);
		return;
	}

	if (key === 'backspace' || key === 'h') {
		await goUpDirectory(state, tab);
		return;
	}

	if (key === '~') {
		await changeDirectory(state, tab, getHomePath());
		return;
	}
}

function handleMouseInput(state: AppState, event: ParsedMouseEvent): void {
	const tab = getActiveTab(state);
	if (!tab) return;

	if (event.y === 0 && event.action === 'press') {
		const hit = state.renderState.tabHitRegions.find((region) => event.x >= region.start && event.x <= region.end);
		if (hit) {
			setActiveTab(state, hit.index);
			return;
		}
	}

	const listStartY = 3;
	const listEndY = listStartY + state.renderState.listHeight - 1;
	const listEndX = state.renderState.listWidth - 1;

	// Preview region bounds (starts after the divider at listWidth)
	const previewStartX = state.renderState.listWidth + 1;
	const previewStartY = 2; // Preview content starts at row 2 (after header and path bar)
	const previewEndY = state.renderState.height - 3; // Ends before status bar

	if (event.action === 'wheel' && (event.button === 'wheelUp' || event.button === 'wheelDown')) {
		const delta = event.button === 'wheelUp' ? -3 : 3;

		// Check if in preview region (both X and Y must be in bounds)
		const inPreviewX = state.config.showPreview && event.x >= previewStartX;
		const inPreviewY = event.y >= previewStartY && event.y <= previewEndY;

		// Check if in list region
		const inListX = event.x <= listEndX;
		const inListY = event.y >= listStartY && event.y <= listEndY;

		// DEBUG: Log hit test info (enable with DEBUG_FILEMANAGER=1)
		debugLog('SCROLL', {
			mouseX: event.x,
			mouseY: event.y,
			listEndX,
			previewStartX,
			previewStartY,
			previewEndY,
			listStartY,
			listEndY,
			inPreviewX,
			inPreviewY,
			inListX,
			inListY,
			will: inPreviewX && inPreviewY ? 'scrollPreview' : inListX && inListY ? 'scrollList' : 'nothing',
		});

		if (inPreviewX && inPreviewY) {
			scrollPreview(tab.preview, delta, state.renderState.contentHeight);
		} else if (inListX && inListY) {
			scrollListBy(state.world, tab.listEid, delta);
		}
		// If neither region, don't scroll anything (e.g., scrolling on tab bar or status bar)

		state.needsRedraw = true;
		return;
	}

	if (event.action === 'press' && event.button === 'left') {
		if (event.y >= listStartY && event.y <= listEndY && event.x <= listEndX) {
			const index = getVisibleIndexAtRow(tab.listEid, event.y - listStartY, tab.fileStore.count);
			if (index !== null) {
				const now = Date.now();
				const isDoubleClick =
					state.clickState.lastClickIndex === index &&
					now - state.clickState.lastClickTime < 400 &&
					Math.abs(event.x - state.clickState.lastClickX) <= 2 &&
					Math.abs(event.y - state.clickState.lastClickY) <= 2;

				// Update click state
				state.clickState.lastClickTime = now;
				state.clickState.lastClickIndex = index;
				state.clickState.lastClickX = event.x;
				state.clickState.lastClickY = event.y;

				if (isDoubleClick) {
					// Double-click: open the item
					setListSelectedIndex(state.world, tab.listEid, index);
					openSelection(state, tab).catch(() => undefined);
				} else if (event.ctrl) {
					// Ctrl+click: toggle selection on this item
					toggleSelection(tab, index);
					setListSelectedIndex(state.world, tab.listEid, index);
					state.focusedPane = 'list';
					state.needsRedraw = true;
					updatePreviewForSelection(state, tab).catch(() => undefined);
				} else if (event.shift) {
					// Shift+click: range select from current to clicked
					const currentIndex = getListSelectedIndex(tab.listEid);
					const start = Math.min(currentIndex >= 0 ? currentIndex : index, index);
					const end = Math.max(currentIndex >= 0 ? currentIndex : index, index);
					for (let i = start; i <= end; i++) {
						tab.selection.add(i);
					}
					setListSelectedIndex(state.world, tab.listEid, index);
					state.focusedPane = 'list';
					state.needsRedraw = true;
					updatePreviewForSelection(state, tab).catch(() => undefined);
				} else {
					// Single-click: select the item and clear multi-selection
					tab.selection.clear();
					setListSelectedIndex(state.world, tab.listEid, index);
					ensureVisible(state.world, tab.listEid, index);
					state.focusedPane = 'list';
					state.needsRedraw = true;
					updatePreviewForSelection(state, tab).catch(() => undefined);
				}
			}
			return;
		}

		if (state.config.showPreview && event.x > listEndX && event.y >= listStartY && event.y <= listEndY) {
			state.focusedPane = 'preview';
			state.needsRedraw = true;
		}
	}
}

function scrollListBy(world: World, listEid: Entity, delta: number): void {
	const info = getScrollInfo(listEid);
	const firstVisible = info.firstVisible ?? 0;
	const visibleCount = info.visibleCount ?? 0;
	const totalCount = info.totalCount ?? 0;
	const maxStart = Math.max(0, totalCount - visibleCount);
	const newFirst = Math.max(0, Math.min(maxStart, firstVisible + delta));
	debugLog('scrollListBy', {
		oldFirst: firstVisible,
		newFirst,
		delta,
		visibleCount,
		totalCount,
		maxStart,
	});
	setFirstVisible(world, listEid, newFirst);
}

function getVisibleIndexAtRow(listEid: Entity, row: number, totalCount: number): number | null {
	const info = getScrollInfo(listEid);
	const firstVisible = info.firstVisible ?? 0;
	const index = firstVisible + row;
	return index < totalCount ? index : null;
}

function toggleSelection(tab: TabState, index: number): void {
	if (index < 0) return;
	if (tab.selection.has(index)) {
		tab.selection.delete(index);
	} else {
		tab.selection.add(index);
	}
}

// =============================================================================
// NAVIGATION
// =============================================================================

async function openSelection(state: AppState, tab: TabState): Promise<void> {
	const index = getListSelectedIndex(tab.listEid);
	const entry = tab.fileStore.getEntryAt(index);
	if (!entry) return;

	if (entry.type === FileType.Directory) {
		await changeDirectory(state, tab, entry.path);
		return;
	}

	await updatePreviewForSelection(state, tab, true);
	state.needsRedraw = true;
}

async function goUpDirectory(state: AppState, tab: TabState): Promise<void> {
	const success = await tab.fileStore.goUp(state.config);
	if (!success) return;
	await refreshTab(state, tab);
}

async function changeDirectory(state: AppState, tab: TabState, path: string): Promise<void> {
	const success = await tab.fileStore.loadDirectory(path, state.config);
	if (!success) return;
	await refreshTab(state, tab);
}

async function refreshTab(state: AppState, tab: TabState): Promise<void> {
	updateTabTitle(tab);
	setTabLabel(state, tab, tab.title);
	resetListForTab(state.world, tab, state.renderState.listHeight);
	state.needsRedraw = true;
	await updatePreviewForSelection(state, tab);
}

// =============================================================================
// TABS
// =============================================================================

function setActiveTab(state: AppState, index: number): void {
	if (index < 0 || index >= state.tabs.length) return;
	state.activeTab = index;
	state.tabsWidget.setActiveTab(index);
	const active = state.tabs[index];
	if (active) {
		void updatePreviewForSelection(state, active);
	}
	state.needsRedraw = true;
}

function setTabLabel(state: AppState, tab: TabState, label: string): void {
	const index = state.tabs.findIndex((t) => t.id === tab.id);
	if (index >= 0) {
		state.tabsWidget.setTabLabel(index, label);
	}
}

async function addTab(state: AppState, path: string): Promise<void> {
	const tab = await createTab(state.world, state.config, path, state.renderState.listHeight);
	state.tabs.push(tab);
	state.tabsWidget.addTab({ label: tab.title, closable: true });
	setActiveTab(state, state.tabs.length - 1);
}

function closeActiveTab(state: AppState): void {
	if (state.tabs.length <= 1) return;
	const removed = state.tabs.splice(state.activeTab, 1);
	if (removed[0]) {
		state.tabsWidget.removeTab(state.activeTab);
	}
	const newIndex = Math.min(state.activeTab, state.tabs.length - 1);
	setActiveTab(state, newIndex);
}

// =============================================================================
// PREVIEW
// =============================================================================

async function updatePreviewForSelection(state: AppState, tab: TabState, force = false): Promise<void> {
	const index = getListSelectedIndex(tab.listEid);
	const preview = tab.preview;

	if (index < 0) {
		buildPreviewScrollback(preview, EMPTY_PREVIEW);
		state.needsRedraw = true;
		return;
	}

	if (!force && preview.loadingIndex === index && preview.isLoading) {
		return;
	}

	const entry = tab.fileStore.getEntryAt(index);
	if (!entry) return;

	const quick = createQuickPreview(entry, state.config.sizeFormat);
	preview.isLoading = true;
	preview.loadingIndex = index;
	buildPreviewScrollback(preview, quick);

	if (preview.debounceTimer) clearTimeout(preview.debounceTimer);

	preview.debounceTimer = setTimeout(async () => {
		const stillSelected = getListSelectedIndex(tab.listEid) === index;
		if (!stillSelected) return;

		try {
			// Limit preview to 5000 lines to prevent performance issues with very large files
			const full = await loadPreview(entry, state.config.sizeFormat, 5000);
			if (getListSelectedIndex(tab.listEid) === index) {
				buildPreviewScrollback(preview, full);
			}
		} catch {
			// ignore
		} finally {
			if (preview.loadingIndex === index) {
				preview.isLoading = false;
			}
			state.needsRedraw = true;
		}
	}, 120);
}

function scrollPreview(preview: PreviewState, delta: number, viewportHeight: number): void {
	const oldScrollLine = preview.scrollLine;
	const maxOffset = Math.max(0, preview.scrollback.totalLines - viewportHeight + PREVIEW_BOTTOM_BUFFER);
	const range = scrollScrollbackBy(preview.scrollback, preview.scrollLine, delta, viewportHeight);
	preview.scrollLine = Math.min(maxOffset, range.startLine);
	debugLog('scrollPreview', {
		oldScrollLine,
		newScrollLine: preview.scrollLine,
		delta,
		viewportHeight,
		totalLines: preview.scrollback.totalLines,
		maxOffset,
	});
}

// =============================================================================
// RENDERING
// =============================================================================

function renderApp(state: AppState): void {
	const tab = getActiveTab(state);
	if (!tab) return;

	const { buffer, width, height, listWidth, previewWidth, contentHeight, listHeight } = state.renderState;

	// Clear entire screen with background
	fillRect(buffer, 0, 0, width, height, ' ', COLORS.rowFg, COLORS.bg);

	// Render UI sections
	renderTabBar(state, width);
	renderPathBar(state, tab, width);
	renderColumnHeaders(state, listWidth - 1);
	renderList(state, tab, listWidth, listHeight, 0, 3);

	if (state.config.showPreview && previewWidth > 0) {
		renderPreview(state, tab, listWidth + 1, 3, previewWidth - 1, contentHeight);

		// Vertical divider between list and preview
		const dividerColor = state.focusedPane === 'list' ? COLORS.borderFg : COLORS.borderFocused;
		for (let y = 2; y < height - 2; y++) {
			buffer.setCell(listWidth, y, '│', dividerColor, COLORS.bg);
		}
		// Connect divider to column header bar
		buffer.setCell(listWidth, 2, '┬', COLORS.borderFg, COLORS.columnBg);
	}

	renderStatusBar(state, tab, width, height - 2);
	renderActionBar(state, width, height - 1);
}

function renderTabBar(state: AppState, width: number): void {
	const y = 0;
	const buffer = state.renderState.buffer;
	state.renderState.tabHitRegions = [];

	// Fill background
	fillRect(buffer, 0, y, width, 1, ' ', COLORS.tabInactiveFg, COLORS.tabInactiveBg);

	let x = 1;
	for (let i = 0; i < state.tabs.length; i++) {
		const isActive = i === state.activeTab;
		const label = state.tabs[i]?.title ?? `Tab ${i + 1}`;
		const tabNum = `${i + 1}`;
		const text = isActive ? ` ${tabNum}:${label} ` : ` ${tabNum}:${label} `;
		const fg = isActive ? COLORS.tabActiveFg : COLORS.tabInactiveFg;
		const bg = isActive ? COLORS.tabActiveBg : COLORS.tabInactiveBg;
		if (x >= width - 2) break;

		// Add separator before non-first tabs
		if (i > 0) {
			renderText(buffer, x - 1, y, '│', COLORS.borderFg, COLORS.tabInactiveBg);
		}

		renderText(buffer, x, y, text.slice(0, width - x - 1), fg, bg);
		state.renderState.tabHitRegions.push({ start: x, end: Math.min(width - 2, x + text.length - 1), index: i });
		x += text.length;
	}

	// Add "+" button for new tab
	if (x < width - 4) {
		renderText(buffer, x, y, ' │', COLORS.borderFg, COLORS.tabInactiveBg);
		renderText(buffer, x + 2, y, ' + ', COLORS.actionKeyFg, COLORS.tabInactiveBg);
	}
}

function renderPathBar(state: AppState, tab: TabState, width: number): void {
	const y = 1;
	const buffer = state.renderState.buffer;

	fillRect(buffer, 0, y, width, 1, ' ', COLORS.headFg, COLORS.headBg);

	if (state.filterMode) {
		// Show filter input prominently
		const prompt = '🔍 ' + state.filterQuery + '█';
		renderText(buffer, 2, y, prompt.slice(0, width - 4), COLORS.filterFg, COLORS.headBg);

		const hint = 'ESC cancel │ Enter apply';
		if (width > prompt.length + hint.length + 6) {
			renderText(buffer, width - hint.length - 2, y, hint, COLORS.statusDimFg, COLORS.headBg);
		}
		return;
	}

	// Path with breadcrumb-style display
	const pathParts = tab.path.split('/').filter(Boolean);
	let pathDisplay = '';
	if (pathParts.length === 0) {
		pathDisplay = '/';
	} else if (pathParts.length <= 3) {
		pathDisplay = '/' + pathParts.join('/');
	} else {
		// Show first, ellipsis, and last 2 parts
		pathDisplay = `/${pathParts[0]}/…/${pathParts.slice(-2).join('/')}`;
	}

	// Focus indicator
	const focusIcon = state.focusedPane === 'list' ? '◀' : '▶';
	const focusLabel = state.focusedPane === 'list' ? 'LIST' : 'PREVIEW';
	const focusText = `${focusIcon} ${focusLabel}`;

	// Item count
	const countText = `${tab.fileStore.count} items`;

	const rightText = `${countText} │ ${focusText}`;
	const maxPathWidth = width - rightText.length - 4;

	renderText(buffer, 2, y, ' 📁 ', COLORS.headFg, COLORS.headBg);
	renderText(buffer, 6, y, pathDisplay.slice(0, maxPathWidth), COLORS.headFg, COLORS.headBg);
	renderText(buffer, width - rightText.length - 1, y, rightText, COLORS.headFg, COLORS.headBg);
}

function renderColumnHeaders(state: AppState, listWidth: number): void {
	const y = 2;
	const buffer = state.renderState.buffer;
	fillRect(buffer, 0, y, listWidth, 1, ' ', COLORS.columnFg, COLORS.columnBg);

	const sortField = state.config.sortField;
	const sortDir = state.config.sortDirection === 0 ? '▲' : '▼';

	const sizeWidth = 10;
	const dateWidth = 12;
	const typeWidth = 6;
	const nameWidth = Math.max(8, listWidth - sizeWidth - dateWidth - typeWidth - 6);

	// Column headers with sort indicators
	const nameLabel = sortField === SortField.Name ? `Name ${sortDir}` : 'Name';
	const sizeLabel = sortField === SortField.Size ? `Size ${sortDir}` : 'Size';
	const modLabel = sortField === SortField.Modified ? `Modified ${sortDir}` : 'Modified';
	const typeLabel = sortField === SortField.Type ? `Type ${sortDir}` : 'Type';

	const nameFg = sortField === SortField.Name ? COLORS.columnSortFg : COLORS.columnFg;
	const sizeFg = sortField === SortField.Size ? COLORS.columnSortFg : COLORS.columnFg;
	const modFg = sortField === SortField.Modified ? COLORS.columnSortFg : COLORS.columnFg;
	const typeFg = sortField === SortField.Type ? COLORS.columnSortFg : COLORS.columnFg;

	renderText(buffer, 3, y, nameLabel.slice(0, nameWidth), nameFg, COLORS.columnBg);
	renderText(buffer, 3 + nameWidth + 1, y, sizeLabel.padStart(sizeWidth - 1), sizeFg, COLORS.columnBg);
	renderText(buffer, 3 + nameWidth + sizeWidth + 1, y, modLabel.slice(0, dateWidth), modFg, COLORS.columnBg);
	renderText(buffer, 3 + nameWidth + sizeWidth + dateWidth + 2, y, typeLabel.slice(0, typeWidth), typeFg, COLORS.columnBg);
}

function renderList(
	state: AppState,
	tab: TabState,
	width: number,
	height: number,
	x: number,
	y: number,
): void {
	const buffer = state.renderState.buffer;
	const selectedIndex = getListSelectedIndex(tab.listEid);
	const scrollInfo = getScrollInfo(tab.listEid);
	const totalCount = scrollInfo.totalCount ?? 0;
	const firstVisible = scrollInfo.firstVisible ?? 0;

	// Reserve 1 column for scrollbar
	const contentWidth = width - 1;
	const sizeWidth = 10;
	const dateWidth = 12;
	const typeWidth = 6;
	const nameWidth = Math.max(8, contentWidth - sizeWidth - dateWidth - typeWidth - 6);

	for (let row = 0; row < height; row++) {
		// Calculate data index directly from scroll position, not from ECS items
		const index = firstVisible + row;
		const hasItem = index < totalCount;
		const entry = hasItem ? tab.fileStore.getEntryAt(index) : undefined;
		const isSelected = hasItem && tab.selection.has(index);
		const isCurrent = hasItem && index === selectedIndex;

		// Determine row colors with improved visual hierarchy
		let fg = COLORS.rowFg;
		let bg = row % 2 === 0 ? COLORS.rowBg : COLORS.rowAltBg;

		if (isCurrent && isSelected) {
			fg = COLORS.rowCurrentFg;
			bg = COLORS.rowCurrentSelectedBg;
		} else if (isCurrent) {
			fg = COLORS.rowCurrentFg;
			bg = COLORS.rowCurrentBg;
		} else if (isSelected) {
			fg = COLORS.rowSelectedFg;
			bg = COLORS.rowSelectedBg;
		}

		fillRect(buffer, x, y + row, contentWidth, 1, ' ', fg, bg);

		if (!entry) continue;

		const icon = getIcon(getFileCategory(entry));
		const nameText = entry.name;
		const sizeText = entry.type === FileType.Directory ? '   <DIR>' : formatSize(entry.size, state.config.sizeFormat).padStart(sizeWidth - 1);
		const dateText = formatDate(entry.modified);
		const typeText = entry.extension ? entry.extension.toLowerCase().slice(0, typeWidth - 1) : '─';

		// Selection marker
		const marker = isSelected ? '●' : ' ';
		const markerFg = isSelected ? COLORS.matchHighlightFg : fg;
		renderText(buffer, x, y + row, marker, markerFg, bg);

		// Icon with file type color
		const iconFg = isCurrent || isSelected ? fg : fileFg(entry);
		renderText(buffer, x + 2, y + row, icon, iconFg, bg);

		// Name with match highlighting
		const nameFg = isCurrent || isSelected ? fg : (entry.type === FileType.Directory ? COLORS.directoryFg : fg);
		renderNameWithMatch(buffer, x + 4, y + row, nameText, nameWidth - 1, nameFg, bg, tab.fileStore.getMatchInfo(index)?.indices ?? []);

		// Size (right-aligned, dimmer for directories)
		const sizeFg = entry.type === FileType.Directory ? COLORS.previewMetaFg : fg;
		renderText(buffer, x + 3 + nameWidth, y + row, sizeText, sizeFg, bg);

		// Modified date
		const dateFg = isCurrent || isSelected ? fg : COLORS.previewMetaFg;
		renderText(buffer, x + 3 + nameWidth + sizeWidth, y + row, dateText.slice(0, dateWidth), dateFg, bg);

		// Type/extension
		const typeFg = isCurrent || isSelected ? fg : COLORS.previewMetaFg;
		renderText(buffer, x + 3 + nameWidth + sizeWidth + dateWidth + 1, y + row, typeText.padEnd(typeWidth), typeFg, bg);
	}

	// Render scrollbar
	renderScrollbar(buffer, x + contentWidth, y, height, totalCount, height, firstVisible);
}

function renderScrollbar(
	buffer: CellBuffer,
	x: number,
	y: number,
	height: number,
	totalItems: number,
	visibleItems: number,
	firstVisible: number,
): void {
	if (totalItems <= visibleItems) {
		// No scrollbar needed, fill with background
		for (let i = 0; i < height; i++) {
			buffer.setCell(x, y + i, '│', COLORS.borderFg, COLORS.bg);
		}
		return;
	}

	// Calculate scrollbar thumb position and size
	const thumbSize = Math.max(1, Math.floor((visibleItems / totalItems) * height));
	const maxScroll = totalItems - visibleItems;
	const scrollRatio = maxScroll > 0 ? firstVisible / maxScroll : 0;
	const thumbStart = Math.floor(scrollRatio * (height - thumbSize));

	for (let i = 0; i < height; i++) {
		const isThumb = i >= thumbStart && i < thumbStart + thumbSize;
		const char = isThumb ? '█' : '░';
		const fg = isThumb ? COLORS.scrollbarHoverFg : COLORS.scrollbarFg;
		buffer.setCell(x, y + i, char, fg, COLORS.scrollbarBg);
	}
}

function renderNameWithMatch(
	buffer: CellBuffer,
	x: number,
	y: number,
	text: string,
	width: number,
	fg: number,
	bg: number,
	indices: readonly number[],
): void {
	const indexSet = new Set(indices);
	const hasMatches = indices.length > 0;

	for (let i = 0; i < width; i++) {
		const char = text[i] ?? ' ';
		const isMatch = indexSet.has(i);
		// Use highlight background for matches to make them stand out
		const charFg = isMatch ? COLORS.matchHighlightFg : fg;
		const charBg = isMatch && hasMatches ? COLORS.matchHighlightBg : bg;
		buffer.setCell(x + i, y, char, charFg, charBg);
	}
}

function renderPreview(state: AppState, tab: TabState, x: number, y: number, width: number, height: number): void {
	const buffer = state.renderState.buffer;
	const preview = tab.preview;
	const isFocused = state.focusedPane === 'preview';
	const borderColor = isFocused ? COLORS.borderFocused : COLORS.borderFg;

	// Background
	fillRect(buffer, x, y, width, height, ' ', COLORS.previewContentFg, COLORS.previewBg);

	// Border with focus indicator
	renderBox(buffer, x, y - 1, width, height + 1, BOX_SINGLE, { fg: borderColor, bg: COLORS.bg });

	// Title in border
	const title = preview.content.name ? ` ${preview.content.name} ` : ' Preview ';
	const titleX = x + 2;
	renderText(buffer, titleX, y - 1, title.slice(0, width - 6), COLORS.headFg, COLORS.bg);

	// Line numbers width
	const lineNumWidth = 4;
	const contentWidth = width - lineNumWidth - 3;

	const range = getVisibleLines(preview.scrollback, preview.scrollLine, height);
	const visibleStart = range.startLine;
	const visibleEnd = range.endLine;

	let highlightLines: readonly LineEntry[] = [];
	// Calculate content range for highlighting (clamped to valid range)
	const contentStart = Math.max(0, visibleStart - preview.contentStartLine);
	const contentEnd = Math.max(0, visibleEnd - preview.contentStartLine);

	if (!preview.content.isBinary && preview.contentText.length > 0 && contentEnd > contentStart) {
		const result = highlightVisibleFirst(preview.highlightCache, preview.contentText, contentStart, contentEnd);
		highlightLines = result.lines;
	}

	// Clamp the loop to the viewport height to prevent rendering outside bounds
	const maxLines = Math.min(range.lines.length, height);

	for (let i = 0; i < maxLines; i++) {
		const line = range.lines[i];
		const lineIndex = visibleStart + i;
		const rowY = y + i;
		if (!line) continue;

		// Render line number for content lines
		if (lineIndex >= preview.contentStartLine) {
			const contentLineNum = lineIndex - preview.contentStartLine + 1;
			const lineNumText = contentLineNum.toString().padStart(lineNumWidth - 1);
			renderText(buffer, x + 1, rowY, lineNumText, COLORS.previewLineFg, COLORS.previewBg);
			renderText(buffer, x + lineNumWidth, rowY, '│', COLORS.borderFg, COLORS.previewBg);
		}

		// Metadata lines (before content)
		if (lineIndex < preview.contentStartLine) {
			// Metadata section styling
			const text = line.text;
			if (lineIndex === 0 && preview.content.name) {
				// File name header
				renderText(buffer, x + 2, rowY, text.slice(0, width - 4), COLORS.headFg, COLORS.previewBg);
			} else {
				renderText(buffer, x + 2, rowY, text.slice(0, width - 4), COLORS.previewMetaFg, COLORS.previewBg);
			}
			continue;
		}

		// Get the correct index into highlightLines using the clamped contentStart
		const contentLineIndex = lineIndex - preview.contentStartLine;
		const highlightIndex = contentLineIndex - contentStart;
		const highlighted = highlightIndex >= 0 && highlightIndex < highlightLines.length
			? highlightLines[highlightIndex]
			: undefined;
		const textX = x + lineNumWidth + 2;

		if (!highlighted || preview.content.isBinary) {
			const textFg = preview.content.isBinary ? COLORS.previewBinaryFg : COLORS.previewContentFg;
			renderText(buffer, textX, rowY, line.text.slice(0, contentWidth), textFg, COLORS.previewBg);
			continue;
		}

		renderHighlightedLine(buffer, textX, rowY, highlighted, contentWidth);
	}

	// Loading indicator
	if (preview.isLoading) {
		const spinner = SPINNER_FRAMES[Math.floor(Date.now() / 80) % SPINNER_FRAMES.length];
		const label = ` ${spinner} Loading... `;
		const labelX = x + Math.floor((width - label.length) / 2);
		renderText(buffer, labelX, y + Math.floor(height / 2), label, COLORS.matchHighlightFg, COLORS.previewBg);
	}

	// Scroll position indicator
	const totalLines = preview.scrollback.totalLines;
	if (totalLines > height) {
		const scrollPercent = Math.floor((preview.scrollLine / Math.max(1, totalLines - height)) * 100);
		const posText = ` ${scrollPercent}% `;
		renderText(buffer, x + width - posText.length - 2, y - 1, posText, COLORS.previewMetaFg, COLORS.bg);
	}
}

function renderHighlightedLine(buffer: CellBuffer, x: number, y: number, line: LineEntry, width: number, tabWidth = 4): void {
	let cursor = 0;
	for (const token of line.tokens) {
		const color = TOKEN_COLORS[token.type] ?? COLORS.previewContentFg;
		const text = token.text;
		for (let i = 0; i < text.length && cursor < width; i++) {
			const char = text[i] ?? ' ';
			if (char === '\t') {
				// Expand tab to spaces (align to next tab stop)
				const spacesToNextTab = tabWidth - (cursor % tabWidth);
				for (let j = 0; j < spacesToNextTab && cursor < width; j++) {
					buffer.setCell(x + cursor, y, ' ', color, COLORS.previewBg);
					cursor++;
				}
			} else {
				buffer.setCell(x + cursor, y, char, color, COLORS.previewBg);
				cursor++;
			}
		}
		if (cursor >= width) break;
	}
}

function renderStatusBar(state: AppState, tab: TabState, width: number, y: number): void {
	const buffer = state.renderState.buffer;
	fillRect(buffer, 0, y, width, 1, ' ', COLORS.statusFg, COLORS.statusBg);

	const selectedIndex = getListSelectedIndex(tab.listEid);
	const totalSize = formatSize(tab.fileStore.getTotalSize(), state.config.sizeFormat);
	const selectedCount = tab.selection.size;

	// Left side: selection info
	let leftParts: string[] = [];
	if (selectedCount > 0) {
		leftParts.push(`✓ ${selectedCount} selected`);
	}
	if (selectedIndex >= 0) {
		const entry = tab.fileStore.getEntryAt(selectedIndex);
		if (entry) {
			const size = entry.type === FileType.Directory ? 'DIR' : formatSize(entry.size, state.config.sizeFormat);
			leftParts.push(`${entry.name} (${size})`);
		}
	}
	const left = leftParts.length > 0 ? leftParts.join(' │ ') : `Total: ${totalSize}`;

	// Right side: position and filter
	const position = selectedIndex >= 0 ? `${selectedIndex + 1}/${tab.fileStore.count}` : '─';
	const hiddenText = state.config.showHidden ? 'H:on' : 'H:off';
	const filterText = state.filterQuery ? `🔍"${state.filterQuery}"` : '';
	const rightParts = [position, hiddenText];
	if (filterText) rightParts.push(filterText);
	const right = rightParts.join(' │ ');

	renderText(buffer, 2, y, left.slice(0, width - right.length - 6), COLORS.statusFg, COLORS.statusBg);
	renderText(buffer, width - right.length - 2, y, right, COLORS.statusFg, COLORS.statusBg);
}

function renderActionBar(state: AppState, width: number, y: number): void {
	const buffer = state.renderState.buffer;
	fillRect(buffer, 0, y, width, 1, ' ', COLORS.actionFg, COLORS.actionBg);

	// Render action items with highlighted keys
	let x = 1;
	for (const item of ACTION_ITEMS) {
		if (x >= width - 4) break;

		// Key in brackets
		const keyText = `[${item.key.toUpperCase()}]`;
		const labelText = item.text;

		renderText(buffer, x, y, keyText, COLORS.actionKeyFg, COLORS.actionBg);
		x += keyText.length;
		renderText(buffer, x, y, labelText, COLORS.actionFg, COLORS.actionBg);
		x += labelText.length + 2;
	}

	// Show keyboard shortcuts hint on the right
	const hint = '↑↓ Navigate  Enter Open  Space Select  Tab Focus';
	if (width > x + hint.length + 4) {
		renderText(buffer, width - hint.length - 2, y, hint, COLORS.previewMetaFg, COLORS.actionBg);
	}
}

function fileFg(entry: { type: FileType; isExecutable: boolean; extension: string }): number {
	const category = getFileCategory(entry);
	switch (category) {
		case 'directory': return COLORS.directoryFg;
		case 'symlink': return COLORS.symlinkFg;
		case 'executable': return COLORS.executableFg;
		case 'archive': return COLORS.archiveFg;
		case 'image': return COLORS.imageFg;
		case 'audio': return COLORS.audioFg;
		case 'video': return COLORS.videoFg;
		case 'code': return COLORS.codeFg;
		case 'document': return COLORS.documentFg;
		case 'text': return COLORS.textFg;
		default: return COLORS.rowFg;
	}
}

function bufferToAnsi(state: RenderState): string {
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

// =============================================================================
// MAIN LOOP
// =============================================================================

function setupTerminal(): void {
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
	}
	process.stdin.resume();
	process.stdout.write('\x1b[?25l');
	process.stdout.write('\x1b[?1049h');
	process.stdout.write('\x1b[?1000h');
	process.stdout.write('\x1b[?1006h');
}

function restoreTerminal(): void {
	process.stdout.write('\x1b[?1006l');
	process.stdout.write('\x1b[?1000l');
	process.stdout.write('\x1b[?1049l');
	process.stdout.write('\x1b[?25h');
	process.stdout.write('\x1b[0m');
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(false);
	}
}

function startRenderLoop(state: AppState): void {
	const interval = setInterval(() => {
		if (!state.running) {
			clearInterval(interval);
			return;
		}

		if (state.needsRedraw) {
			renderApp(state);
			process.stdout.write(bufferToAnsi(state.renderState));
			state.needsRedraw = false;
		}
	}, 50);
}

async function main(): Promise<void> {
	clearDebugLog();
	debugLog('App starting');

	const stdout = process.stdout;
	const stdin = process.stdin;

	let width = stdout.columns ?? 80;
	let height = stdout.rows ?? 24;
	const args = process.argv.slice(2);
	const pathArg = args.find((arg) => !arg.startsWith('-'));
	const initialPath = pathArg ?? getHomePath();

	const state = await createAppState(initialPath, width, height);	
	const initialTab = getActiveTab(state);
	if (initialTab) {
		await updatePreviewForSelection(state, initialTab);
	}
	setupTerminal();

	renderApp(state);
	process.stdout.write(bufferToAnsi(state.renderState));
	state.needsRedraw = false;

	stdin.on('data', (data: Buffer) => {
		if (!state.running) return;
		const str = data.toString();
		const mouse = parseMouseSequence(data);
		if (mouse?.type === 'mouse') {
			handleMouseInput(state, mouse.event);
			return;
		}

		const keyEvents = parseKeyBuffer(data);
		for (const keyEvent of keyEvents) {
			void handleKeyInput(state, keyEvent).catch(() => undefined);
		}
	});

	stdout.on('resize', () => {
		width = stdout.columns ?? 80;
		height = stdout.rows ?? 24;
		updateRenderState(state.renderState, width, height, state.config.splitRatio, state.config.showPreview);
		state.actionBar.setPosition(0, height - 1);
		for (const tab of state.tabs) {
			setVisibleCount(state.world, tab.listEid, state.renderState.listHeight);
		}
		state.needsRedraw = true;
	});

	startRenderLoop(state);

	// Return a promise that resolves when the app exits
	return new Promise<void>((resolve) => {
		const exit = (): void => {
			state.running = false;
			restoreTerminal();
			resolve();
		};

		// Store exit function so it can be called from key handlers
		(state as AppState & { exit: () => void }).exit = exit;

		process.on('SIGINT', exit);
		process.on('SIGTERM', exit);
		process.on('exit', restoreTerminal);
	});
}

export async function runTabbedApp(): Promise<void> {
	return main();
}

const isDirectRun = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isDirectRun) {
	runTabbedApp().catch((err) => {
		restoreTerminal();
		console.error(err);
		process.exit(1);
	});
}
