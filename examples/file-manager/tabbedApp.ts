#!/usr/bin/env node
/**
 * Tabbed file manager application.
 * Demonstrates tabs, virtualized lists, scrollback preview, and incremental syntax highlighting.
 * @module tabbedApp
 */

import { pathToFileURL } from 'node:url';
import { addEntity } from 'bitecs';
import type { Entity, World, KeyEvent, MouseEvent, CellBuffer } from '../../src/index';
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
	getVisibleItems,
	setTotalCount,
	setVisibleCount,
	setFirstVisible,
	setLazyLoadCallback,
	checkNeedsLoad,
	loadItems,
	ensureVisible,
	handleListKeyPress,
	clearItems,
	getScrollInfo,
} from '../../src/index';
import type { ListItem } from '../../src/index';
import { createTabs, type TabsWidget } from '../../src/widgets/tabs';
import { createListbar, type ListbarWidget } from '../../src/widgets/listbar';
import { getIcon } from './ui/icons';
import { createConfig, type FileManagerConfig, formatDate, formatSize, nextSizeFormat, nextSortField, toggleSortDirection, SortField } from './config';
import { createFileStore, type FileStore } from './data/fileStore';
import { FileType, getFileCategory } from './data/fileEntry';
import { getHomePath } from './data/filesystem';
import { loadPreview, createQuickPreview, EMPTY_PREVIEW, type PreviewContent } from './data/preview';
import {
	createHighlightCache,
	detectLanguage,
	detectLanguageFromContent,
	highlightVisibleFirst,
	setGrammar,
	type HighlightCache,
	type LineEntry,
	type TokenType,
	appendLines,
	clearScrollback,
	createScrollbackBuffer,
	getVisibleLines,
	scrollBy as scrollScrollbackBy,
	type ScrollbackBuffer,
} from '../../src/utils/syntaxHighlight';
import {
	appendLines,
	clearScrollback,
	createScrollbackBuffer,
	getVisibleLines,
	scrollBy as scrollScrollbackBy,
	type ScrollbackBuffer,
} from '../../src/utils/virtualScrollback';

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
}

// =============================================================================
// CONSTANTS
// =============================================================================

const COLORS = {
	bg: packColor(0, 0, 0),
	panelBg: packColor(10, 10, 10),
	borderFg: packColor(70, 70, 70),
	headFg: packColor(255, 255, 255),
	headBg: packColor(0, 70, 140),
	columnFg: packColor(255, 255, 255),
	columnBg: packColor(40, 40, 40),
	statusFg: packColor(255, 255, 255),
	statusBg: packColor(0, 70, 140),
	actionFg: packColor(200, 200, 200),
	actionBg: packColor(30, 30, 30),
	rowFg: packColor(220, 220, 220),
	rowAltBg: packColor(20, 20, 20),	
	rowSelectedFg: packColor(0, 0, 0),
	rowSelectedBg: packColor(0, 200, 200),
	rowCurrentFg: packColor(0, 0, 0),
	rowCurrentBg: packColor(255, 255, 255),
	rowCurrentSelectedBg: packColor(0, 220, 220),
	directoryFg: packColor(90, 160, 255),
	symlinkFg: packColor(180, 120, 255),
	executableFg: packColor(120, 255, 120),
	archiveFg: packColor(255, 110, 110),
	imageFg: packColor(255, 190, 120),
	audioFg: packColor(255, 255, 120),
	videoFg: packColor(255, 120, 255),
	codeFg: packColor(120, 255, 210),
	previewMetaFg: packColor(180, 180, 180),
	previewContentFg: packColor(210, 210, 210),
	previewBinaryFg: packColor(120, 170, 230),
	matchHighlightFg: packColor(255, 220, 0),
	tabActiveFg: packColor(255, 255, 255),
	tabActiveBg: packColor(0, 90, 170),
	tabInactiveFg: packColor(200, 200, 200),
	tabInactiveBg: packColor(30, 30, 30),
	filterFg: packColor(255, 220, 0),
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
	clearItems(world, tab.listEid);
	setTotalCount(world, tab.listEid, tab.fileStore.count);
	setVisibleCount(world, tab.listEid, visibleCount);
	setFirstVisible(world, tab.listEid, 0);
	setListSelectedIndex(world, tab.listEid, tab.fileStore.count > 0 ? 0 : -1);
	tab.selection.clear();
}

function buildListItems(fileStore: FileStore, start: number, count: number): ListItem[] {
	const items: ListItem[] = [];
	for (let i = 0; i < count; i++) {
		const entry = fileStore.getEntryAt(start + i);
		if (!entry) break;
		items.push({ text: entry.name, value: entry.path });
	}
	return items;
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

	setTotalCount(world, listEid, fileStore.count);
	setLazyLoadCallback(listEid, async (start, count) => buildListItems(fileStore, start, count));

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
		state.running = false;
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

	const listAction = handleListKeyPress(state.world, tab.listEid, key);
	if (listAction) {
		const selectedIndex = getListSelectedIndex(tab.listEid);
		if (selectedIndex >= 0) {
			ensureVisible(state.world, tab.listEid, selectedIndex);
		}
		if (key === ' ' || key === 'space') {
			toggleSelection(tab, selectedIndex);
		}
		state.needsRedraw = true;
		await updatePreviewForSelection(state, tab);
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

function handleMouseInput(state: AppState, event: MouseEvent): void {
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

	if (event.action === 'wheel' && (event.button === 'wheelUp' || event.button === 'wheelDown')) {
		const delta = event.button === 'wheelUp' ? -3 : 3;
		if (state.config.showPreview && event.x > listEndX) {
			scrollPreview(tab.preview, delta, state.renderState.contentHeight);
		} else {
			scrollListBy(state.world, tab.listEid, delta);
		}
		state.needsRedraw = true;
		return;
	}

	if (event.action === 'press' && event.button === 'left') {
		if (event.y >= listStartY && event.y <= listEndY && event.x <= listEndX) {
			const index = getVisibleIndexAtRow(tab.listEid, event.y - listStartY);
			if (index !== null) {
				setListSelectedIndex(state.world, tab.listEid, index);
				ensureVisible(state.world, tab.listEid, index);
				state.focusedPane = 'list';
				state.needsRedraw = true;
				updatePreviewForSelection(state, tab).catch(() => undefined);
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
	setFirstVisible(world, listEid, newFirst);
}

function getVisibleIndexAtRow(listEid: Entity, row: number): number | null {
	const visible = getVisibleItems(listEid);
	const item = visible[row];
	return item ? item.index : null;
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
			const full = await loadPreview(entry, state.config.sizeFormat);
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
	const maxOffset = Math.max(0, preview.scrollback.totalLines - viewportHeight + PREVIEW_BOTTOM_BUFFER);
	const range = scrollScrollbackBy(preview.scrollback, preview.scrollLine, delta, viewportHeight);
	preview.scrollLine = Math.min(maxOffset, range.startLine);
}

// =============================================================================
// RENDERING
// =============================================================================

function renderApp(state: AppState): void {
	const tab = getActiveTab(state);
	if (!tab) return;

	const { buffer, width, height, listWidth, previewWidth, contentHeight, listHeight } = state.renderState;
	fillRect(buffer, 0, 0, width, height, ' ', COLORS.headFg, COLORS.bg);

	renderTabBar(state, width);
	renderPathBar(state, tab, width);
	renderColumnHeaders(state, listWidth);
	renderList(state, tab, listWidth, listHeight, 0, 3);

	if (state.config.showPreview && previewWidth > 0) {
		renderPreview(state, tab, listWidth + 1, 3, previewWidth, contentHeight);
		for (let y = 2; y < height - 2; y++) {
			buffer.setCell(listWidth, y, '│', COLORS.borderFg, COLORS.bg);
		}
	}

	renderStatusBar(state, tab, width, height - 2);
	renderActionBar(state, width, height - 1);
}

function renderTabBar(state: AppState, width: number): void {
	const y = 0;
	state.renderState.tabHitRegions = [];

	let x = 0;
	for (let i = 0; i < state.tabs.length; i++) {
		const isActive = i === state.activeTab;
		const label = state.tabs[i]?.title ?? `Tab ${i + 1}`;
		const text = isActive ? ` ${label} ` : ` ${label} `;
		const fg = isActive ? COLORS.tabActiveFg : COLORS.tabInactiveFg;
		const bg = isActive ? COLORS.tabActiveBg : COLORS.tabInactiveBg;
		if (x >= width) break;

		renderText(state.renderState.buffer, x, y, text.slice(0, width - x), fg, bg);
		state.renderState.tabHitRegions.push({ start: x, end: Math.min(width - 1, x + text.length - 1), index: i });
		x += text.length + 1;
	}

	if (x < width) {
		renderText(state.renderState.buffer, x, y, ' '.repeat(width - x), COLORS.tabInactiveFg, COLORS.tabInactiveBg);
	}
}

function renderPathBar(state: AppState, tab: TabState, width: number): void {
	const y = 1;
	const pathText = tab.path;
	const focusText = state.focusedPane === 'list' ? 'LIST' : 'PREVIEW';
	const right = `[${focusText}]`;

	renderText(state.renderState.buffer, 0, y, ' '.repeat(width), COLORS.headFg, COLORS.headBg);
	renderText(state.renderState.buffer, 1, y, pathText.slice(0, width - right.length - 3), COLORS.headFg, COLORS.headBg);
	renderText(state.renderState.buffer, width - right.length - 1, y, right, COLORS.headFg, COLORS.headBg);

	if (state.filterMode) {
		const prompt = FILTER_PROMPT + state.filterQuery;
		renderText(state.renderState.buffer, 2, y, prompt.slice(0, width - 4), COLORS.filterFg, COLORS.headBg);
	}
}

function renderColumnHeaders(state: AppState, listWidth: number): void {
	const y = 2;
	const buffer = state.renderState.buffer;
	renderText(buffer, 0, y, ' '.repeat(listWidth), COLORS.columnFg, COLORS.columnBg);

	const name = 'Name';
	const size = 'Size';
	const modified = 'Modified';
	const type = 'Type';

	const sizeWidth = 10;
	const dateWidth = 10;
	const typeWidth = 8;
	const nameWidth = Math.max(8, listWidth - sizeWidth - dateWidth - typeWidth - 5);

	renderText(buffer, 2, y, name.padEnd(nameWidth), COLORS.columnFg, COLORS.columnBg);
	renderText(buffer, 2 + nameWidth + 1, y, size.padEnd(sizeWidth), COLORS.columnFg, COLORS.columnBg);
	renderText(buffer, 2 + nameWidth + sizeWidth + 2, y, modified.padEnd(dateWidth), COLORS.columnFg, COLORS.columnBg);
	renderText(buffer, 2 + nameWidth + sizeWidth + dateWidth + 3, y, type.padEnd(typeWidth), COLORS.columnFg, COLORS.columnBg);
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
	const visibleItems = getVisibleItems(tab.listEid);
	const selectedIndex = getListSelectedIndex(tab.listEid);

	const sizeWidth = 10;
	const dateWidth = 10;
	const typeWidth = 8;
	const nameWidth = Math.max(8, width - sizeWidth - dateWidth - typeWidth - 5);

	for (let row = 0; row < height; row++) {
		const item = visibleItems[row];
		const index = item?.index ?? -1;
		const entry = index >= 0 ? tab.fileStore.getEntryAt(index) : undefined;
		const isSelected = tab.selection.has(index);
		const isCurrent = index === selectedIndex;
		let fg = COLORS.rowFg;
		if (isCurrent) fg = COLORS.rowCurrentFg;
		else if (isSelected) fg = COLORS.rowSelectedFg;
		let bg = row % 2 === 0 ? COLORS.panelBg : COLORS.rowAltBg;
		if (isSelected && isCurrent) bg = COLORS.rowCurrentSelectedBg;
		else if (isSelected) bg = COLORS.rowSelectedBg;
		else if (isCurrent) bg = COLORS.rowCurrentBg;

		fillRect(buffer, x, y + row, width, 1, ' ', fg, bg);
		if (!entry) continue;

		const icon = getIcon(getFileCategory(entry));
		const nameText = entry.name;
		const sizeText = entry.type === FileType.Directory ? '<DIR>' : formatSize(entry.size, state.config.sizeFormat);
		const dateText = formatDate(entry.modified);
		const typeText = entry.extension ? entry.extension.toUpperCase().slice(0, typeWidth - 1) : '-';

		const nameX = x + 2;
		const iconFg = isSelected || isCurrent ? fg : fileFg(entry);
		renderText(buffer, nameX - 2, y + row, icon, iconFg, bg);
		renderNameWithMatch(buffer, nameX, y + row, nameText, nameWidth, fg, bg, tab.fileStore.getMatchInfo(index)?.indices ?? []);
		renderText(buffer, nameX + nameWidth + 1, y + row, sizeText.padEnd(sizeWidth), fg, bg);
		renderText(buffer, nameX + nameWidth + sizeWidth + 2, y + row, dateText.padEnd(dateWidth), fg, bg);
		renderText(buffer, nameX + nameWidth + sizeWidth + dateWidth + 3, y + row, typeText.padEnd(typeWidth), fg, bg);
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
	for (let i = 0; i < width; i++) {
		const char = text[i] ?? ' ';
		const color = indexSet.has(i) ? COLORS.matchHighlightFg : fg;
		buffer.setCell(x + i, y, char, color, bg);
	}
}

function renderPreview(state: AppState, tab: TabState, x: number, y: number, width: number, height: number): void {
	const buffer = state.renderState.buffer;
	const preview = tab.preview;

	fillRect(buffer, x, y, width, height, ' ', COLORS.previewContentFg, COLORS.bg);
	renderBox(buffer, x, y - 1, width, height + 1, BOX_SINGLE, COLORS.borderFg, COLORS.bg);

	const range = getVisibleLines(preview.scrollback, preview.scrollLine, height);
	const visibleStart = range.startLine;
	const visibleEnd = range.endLine;

	let highlightLines: readonly LineEntry[] = [];
	if (!preview.content.isBinary && preview.contentText.length > 0) {
		const contentStart = Math.max(0, visibleStart - preview.contentStartLine);
		const contentEnd = Math.max(0, visibleEnd - preview.contentStartLine);
		if (contentEnd > contentStart) {
			const result = highlightVisibleFirst(preview.highlightCache, preview.contentText, contentStart, contentEnd);
			highlightLines = result.lines;
		}
	}

	for (let i = 0; i < range.lines.length; i++) {
		const line = range.lines[i];
		const lineIndex = visibleStart + i;
		const rowY = y + i;
		if (!line) continue;

		if (lineIndex < preview.contentStartLine) {
			renderText(buffer, x + 1, rowY, line.text.slice(0, width - 2), COLORS.previewMetaFg, COLORS.bg);
			continue;
		}

		const contentLineIndex = lineIndex - preview.contentStartLine;
		const highlighted = highlightLines[contentLineIndex - (visibleStart - preview.contentStartLine)];
		if (!highlighted || preview.content.isBinary) {
			renderText(buffer, x + 1, rowY, line.text.slice(0, width - 2), preview.content.isBinary ? COLORS.previewBinaryFg : COLORS.previewContentFg, COLORS.bg);
			continue;
		}

		renderHighlightedLine(buffer, x + 1, rowY, highlighted, width - 2);
	}

	if (preview.isLoading) {
		const spinner = SPINNER_FRAMES[Math.floor(Date.now() / 80) % SPINNER_FRAMES.length];
		const label = ` ${spinner} Loading preview...`;
		renderText(buffer, x + 2, y + height - 2, label.slice(0, width - 4), COLORS.matchHighlightFg, COLORS.bg);
	}
}

function renderHighlightedLine(buffer: CellBuffer, x: number, y: number, line: LineEntry, width: number): void {
	let cursor = 0;
	for (const token of line.tokens) {
		const color = TOKEN_COLORS[token.type] ?? COLORS.previewContentFg;
		const text = token.text;
		for (let i = 0; i < text.length && cursor < width; i++) {
			const char = text[i] ?? ' ';
			buffer.setCell(x + cursor, y, char, color, COLORS.bg);
			cursor++;
		}
		if (cursor >= width) break;
	}
}

function renderStatusBar(state: AppState, tab: TabState, width: number, y: number): void {
	const buffer = state.renderState.buffer;
	renderText(buffer, 0, y, ' '.repeat(width), COLORS.statusFg, COLORS.statusBg);

	const count = tab.fileStore.count.toLocaleString();
	const totalSize = formatSize(tab.fileStore.getTotalSize(), state.config.sizeFormat);
	const selectedCount = tab.selection.size;
	const filterText = state.filterQuery ? `Filter: ${state.filterQuery}` : 'No filter';
	const left = `${count} items · ${totalSize} · ${selectedCount} selected`;
	const right = `Sort: ${SortField[state.config.sortField]} ${state.config.sortDirection === 0 ? '↑' : '↓'} · ${filterText}`;

	renderText(buffer, 1, y, left.slice(0, width - 2), COLORS.statusFg, COLORS.statusBg);
	renderText(buffer, Math.max(1, width - right.length - 1), y, right.slice(0, width - 2), COLORS.statusFg, COLORS.statusBg);
}

function renderActionBar(state: AppState, width: number, y: number): void {
	state.actionBar.setPosition(0, y);
	const line = state.actionBar.renderLine();
	renderText(state.renderState.buffer, 0, y, ' '.repeat(width), COLORS.actionFg, COLORS.actionBg);
	renderText(state.renderState.buffer, 0, y, line.slice(0, width), COLORS.actionFg, COLORS.actionBg);
}

function fileFg(entry: { type: FileType; isExecutable: boolean; extension?: string }): number {
	const category = getFileCategory(entry);
	if (category === 'directory') return COLORS.directoryFg;
	if (category === 'symlink') return COLORS.symlinkFg;
	if (category === 'executable') return COLORS.executableFg;
	if (category === 'archive') return COLORS.archiveFg;
	if (category === 'image') return COLORS.imageFg;
	if (category === 'audio') return COLORS.audioFg;
	if (category === 'video') return COLORS.videoFg;
	if (category === 'code') return COLORS.codeFg;
	return COLORS.rowFg;
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

		const tab = getActiveTab(state);
		if (tab) {
			const loadInfo = checkNeedsLoad(tab.listEid);
			if (loadInfo.needsLoad) {
				void loadItems(state.world, tab.listEid, loadInfo.startIndex, loadInfo.count);
			}
		}

		if (state.needsRedraw) {
			renderApp(state);
			process.stdout.write(bufferToAnsi(state.renderState));
			state.needsRedraw = false;
		}
	}, 50);
}

async function main(): Promise<void> {
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

	const exit = (): void => {
		state.running = false;
		restoreTerminal();
		process.exit(0);
	};

	process.on('SIGINT', exit);
	process.on('SIGTERM', exit);
	process.on('exit', restoreTerminal);
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
