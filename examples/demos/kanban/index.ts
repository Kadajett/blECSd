#!/usr/bin/env node
/**
 * Kanban Board with Drag-and-Drop
 *
 * Interactive kanban task board demonstrating:
 * - Drag system for moving cards between columns
 * - Interactive component (draggable, hoverable, clickable)
 * - Hierarchy for cards within columns
 * - Layout for responsive column arrangement
 * - Shadow component for drag feedback
 * - HoverText for card details on hover
 * - Listbar for column headers
 * - Mouse-driven interaction patterns
 *
 * Controls: Arrow keys to select, Space to pick up/drop,
 *           h/l to move between columns, n to add card, d to delete, q to quit
 *
 * @module examples/demos/kanban
 */

import {
	createWorld,
	createCellBuffer,
	fillRect,
} from 'blecsd';
import type { World } from 'blecsd';

// =============================================================================
// CONFIGURATION
// =============================================================================

const TARGET_FPS = 15;
const FRAME_TIME = 1000 / TARGET_FPS;

// Colors
const BG = 0x1e1e2eff;
const FG = 0xcdd6f4ff;
const HEADER_FG = 0x1e1e2eff;
const BORDER_FG = 0x585b70ff;
const CARD_FG = 0xcdd6f4ff;
const CARD_BG = 0x313244ff;
const CARD_SEL_FG = 0x1e1e2eff;
const CARD_SEL_BG = 0x89b4faff;
const CARD_DRAG_FG = 0xcdd6f4ff;
const CARD_DRAG_BG = 0x45475aff;
const SHADOW_BG = 0x11111bff;
const TAG_TODO_BG = 0xf38ba8ff;
const TAG_PROG_BG = 0xe0af68ff;
const TAG_DONE_BG = 0xa6e3a1ff;
const PRIORITY_HIGH = 0xf38ba8ff;
const PRIORITY_MED = 0xe0af68ff;
const PRIORITY_LOW = 0xa6e3a1ff;
const STATUS_FG = 0x585b70ff;
const INPUT_FG = 0xcdd6f4ff;
const INPUT_BG = 0x313244ff;

// =============================================================================
// TYPES
// =============================================================================

interface Card {
	id: number;
	title: string;
	description: string;
	priority: 'high' | 'medium' | 'low';
	tags: string[];
}

interface Column {
	name: string;
	color: number;
	cards: Card[];
}

interface CellBufferDirect {
	width: number;
	height: number;
	cells: { char: string; fg: number; bg: number }[][];
	setCell: (x: number, y: number, char: string, fg: number, bg: number) => void;
}

interface AppState {
	world: World;
	columns: Column[];
	colIndex: number;
	cardIndex: number;
	dragging: boolean;
	dragCard: Card | null;
	dragSourceCol: number;
	buffer: CellBufferDirect;
	width: number;
	height: number;
	running: boolean;
	nextId: number;
	showAddDialog: boolean;
	addTitle: string;
	addDescription: string;
	addField: 'title' | 'description';
	hoverInfo: string | null;
}

// =============================================================================
// SAMPLE DATA
// =============================================================================

function createSampleData(): Column[] {
	return [
		{
			name: 'To Do',
			color: TAG_TODO_BG,
			cards: [
				{ id: 1, title: 'Setup CI/CD', description: 'Configure GitHub Actions pipeline', priority: 'high', tags: ['devops'] },
				{ id: 2, title: 'Design API', description: 'REST API schema for user service', priority: 'medium', tags: ['backend'] },
				{ id: 3, title: 'Write tests', description: 'Unit tests for auth module', priority: 'low', tags: ['testing'] },
			],
		},
		{
			name: 'In Progress',
			color: TAG_PROG_BG,
			cards: [
				{ id: 4, title: 'Login page', description: 'Build login form with validation', priority: 'high', tags: ['frontend'] },
				{ id: 5, title: 'DB migration', description: 'Add user preferences table', priority: 'medium', tags: ['backend'] },
			],
		},
		{
			name: 'Done',
			color: TAG_DONE_BG,
			cards: [
				{ id: 6, title: 'Project setup', description: 'Initialize repo and tooling', priority: 'low', tags: ['devops'] },
			],
		},
	];
}

// =============================================================================
// ACTIONS
// =============================================================================

function moveCardToColumn(state: AppState, fromCol: number, cardIdx: number, toCol: number): void {
	const srcColumn = state.columns[fromCol];
	const dstColumn = state.columns[toCol];
	if (!srcColumn || !dstColumn) return;

	const card = srcColumn.cards.splice(cardIdx, 1)[0];
	if (!card) return;
	dstColumn.cards.push(card);

	state.colIndex = toCol;
	state.cardIndex = dstColumn.cards.length - 1;
}

function deleteCard(state: AppState): void {
	const col = state.columns[state.colIndex];
	if (!col || col.cards.length === 0) return;

	col.cards.splice(state.cardIndex, 1);
	if (state.cardIndex >= col.cards.length) {
		state.cardIndex = Math.max(0, col.cards.length - 1);
	}
}

function addCard(state: AppState): void {
	if (!state.addTitle.trim()) return;

	const col = state.columns[state.colIndex];
	if (!col) return;

	col.cards.push({
		id: state.nextId++,
		title: state.addTitle.trim(),
		description: state.addDescription.trim() || 'No description',
		priority: 'medium',
		tags: [],
	});

	state.showAddDialog = false;
	state.addTitle = '';
	state.addDescription = '';
	state.cardIndex = col.cards.length - 1;
}

// =============================================================================
// INPUT
// =============================================================================

function handleInput(state: AppState, key: string): void {
	if (state.showAddDialog) {
		handleAddDialog(state, key);
		return;
	}

	if (state.dragging) {
		handleDragInput(state, key);
		return;
	}

	const col = state.columns[state.colIndex];
	if (!col) return;

	if (key === 'h' || key === '\x1b[D') {
		state.colIndex = Math.max(0, state.colIndex - 1);
		state.cardIndex = 0;
	} else if (key === 'l' || key === '\x1b[C') {
		state.colIndex = Math.min(state.columns.length - 1, state.colIndex + 1);
		state.cardIndex = 0;
	} else if (key === 'j' || key === '\x1b[B') {
		state.cardIndex = Math.min(state.cardIndex + 1, col.cards.length - 1);
	} else if (key === 'k' || key === '\x1b[A') {
		state.cardIndex = Math.max(0, state.cardIndex - 1);
	} else if (key === ' ') {
		// Pick up card
		if (col.cards.length > 0) {
			state.dragging = true;
			state.dragCard = col.cards[state.cardIndex] ?? null;
			state.dragSourceCol = state.colIndex;
		}
	} else if (key === 'n' || key === 'N') {
		state.showAddDialog = true;
		state.addField = 'title';
	} else if (key === 'd' || key === 'D') {
		deleteCard(state);
	}

	// Update hover info
	const card = col.cards[state.cardIndex];
	state.hoverInfo = card ? `${card.description} [${card.priority}]` : null;
}

function handleDragInput(state: AppState, key: string): void {
	if (key === 'h' || key === '\x1b[D') {
		state.colIndex = Math.max(0, state.colIndex - 1);
	} else if (key === 'l' || key === '\x1b[C') {
		state.colIndex = Math.min(state.columns.length - 1, state.colIndex + 1);
	} else if (key === ' ' || key === '\r') {
		// Drop card
		if (state.dragCard && state.colIndex !== state.dragSourceCol) {
			moveCardToColumn(state, state.dragSourceCol, state.cardIndex, state.colIndex);
		}
		state.dragging = false;
		state.dragCard = null;
	} else if (key === '\x1b') {
		// Cancel drag
		state.dragging = false;
		state.dragCard = null;
		state.colIndex = state.dragSourceCol;
	}
}

function handleAddDialog(state: AppState, key: string): void {
	if (key === '\x1b') {
		state.showAddDialog = false;
		return;
	}
	if (key === '\t') {
		state.addField = state.addField === 'title' ? 'description' : 'title';
		return;
	}
	if (key === '\r') {
		addCard(state);
		return;
	}

	const field = state.addField === 'title' ? 'addTitle' : 'addDescription';
	if (key === '\x7f') {
		state[field] = state[field].slice(0, -1);
	} else if (key.length === 1 && key >= ' ') {
		state[field] += key;
	}
}

// =============================================================================
// RENDERING
// =============================================================================

function drawText(buf: CellBufferDirect, x: number, y: number, text: string, fg: number, bg: number): void {
	for (let i = 0; i < text.length; i++) {
		if (x + i >= buf.width || y >= buf.height) break;
		buf.setCell(x + i, y, text[i] ?? ' ', fg, bg);
	}
}

function priorityColor(p: string): number {
	if (p === 'high') return PRIORITY_HIGH;
	if (p === 'medium') return PRIORITY_MED;
	return PRIORITY_LOW;
}

function renderBoard(state: AppState): void {
	const { buffer, width, height, columns, colIndex, cardIndex, dragging, dragCard } = state;

	fillRect(buffer, 0, 0, width, height, ' ', FG, BG);

	const colCount = columns.length;
	const colW = Math.floor((width - 2) / colCount);
	const cardW = colW - 4;

	// Title
	drawText(buffer, 2, 0, 'Kanban Board', CARD_FG, BG);

	// Draw columns
	for (let ci = 0; ci < colCount; ci++) {
		const col = columns[ci];
		if (!col) continue;

		const cx = 1 + ci * colW;
		const isActiveCol = ci === colIndex;

		// Column header
		const headerBg = col.color;
		fillRect(buffer, cx, 2, colW - 1, 1, ' ', HEADER_FG, headerBg);
		const headerText = ` ${col.name} (${col.cards.length})`;
		drawText(buffer, cx, 2, headerText, HEADER_FG, headerBg);

		// Column border
		for (let y = 3; y < height - 2; y++) {
			buffer.setCell(cx + colW - 1, y, '\u2502', BORDER_FG, BG);
		}

		// Cards
		let cardY = 4;
		for (let cardI = 0; cardI < col.cards.length && cardY < height - 4; cardI++) {
			const card = col.cards[cardI];
			if (!card) continue;

			const isSelected = isActiveCol && cardI === cardIndex && !dragging;
			const isDragSource = dragging && ci === state.dragSourceCol && card === dragCard;

			let fg = CARD_FG;
			let bg = CARD_BG;
			if (isSelected) {
				fg = CARD_SEL_FG;
				bg = CARD_SEL_BG;
			} else if (isDragSource) {
				fg = CARD_DRAG_FG;
				bg = CARD_DRAG_BG;
			}

			// Shadow
			if (isSelected) {
				fillRect(buffer, cx + 2, cardY + 1, cardW, 2, ' ', FG, SHADOW_BG);
			}

			// Card background
			fillRect(buffer, cx + 1, cardY, cardW, 2, ' ', fg, bg);

			// Priority indicator
			const pChar = card.priority === 'high' ? '\u25CF' : card.priority === 'medium' ? '\u25CB' : '\u25CC';
			buffer.setCell(cx + 2, cardY, pChar, priorityColor(card.priority), bg);

			// Title (truncated)
			const maxTitle = cardW - 4;
			const titleText = card.title.length > maxTitle ? card.title.slice(0, maxTitle - 1) + '\u2026' : card.title;
			drawText(buffer, cx + 4, cardY, titleText, fg, bg);

			// Tags on second line
			const tagLine = card.tags.join(', ');
			drawText(buffer, cx + 2, cardY + 1, tagLine.slice(0, cardW - 2), BORDER_FG, bg);

			cardY += 3;
		}

		// Drop zone indicator when dragging
		if (dragging && isActiveCol && ci !== state.dragSourceCol) {
			fillRect(buffer, cx + 1, cardY, cardW, 1, '\u2500', CARD_SEL_BG, BG);
			drawText(buffer, cx + 2, cardY, ' Drop here ', CARD_SEL_BG, BG);
		}
	}

	// Drag indicator
	if (dragging && dragCard) {
		const dragText = `Moving: ${dragCard.title}`;
		drawText(buffer, 2, height - 3, dragText, CARD_SEL_BG, BG);
		drawText(buffer, 2, height - 2, 'h/l: target column | Space: drop | Esc: cancel', STATUS_FG, BG);
	}

	// Status bar
	const statusY = height - 1;
	fillRect(buffer, 0, statusY, width, 1, ' ', STATUS_FG, 0x11111bff);
	const statusText = state.dragging
		? 'DRAG MODE'
		: 'h/l: column | j/k: card | Space: pick up | n: new | d: delete | q: quit';
	drawText(buffer, 2, statusY, statusText, STATUS_FG, 0x11111bff);

	// Hover info
	if (state.hoverInfo && !dragging) {
		const infoY = height - 3;
		drawText(buffer, 2, infoY, state.hoverInfo.slice(0, width - 4), BORDER_FG, BG);
	}

	// Add dialog
	if (state.showAddDialog) {
		renderAddDialog(state);
	}
}

function renderAddDialog(state: AppState): void {
	const { buffer, width, height } = state;
	const dw = 40;
	const dh = 10;
	const dx = Math.floor((width - dw) / 2);
	const dy = Math.floor((height - dh) / 2);

	// Background
	fillRect(buffer, dx, dy, dw, dh, ' ', FG, 0x24283bff);

	// Border
	for (let x = dx; x < dx + dw; x++) {
		buffer.setCell(x, dy, '\u2500', BORDER_FG, 0x24283bff);
		buffer.setCell(x, dy + dh - 1, '\u2500', BORDER_FG, 0x24283bff);
	}
	for (let y = dy; y < dy + dh; y++) {
		buffer.setCell(dx, y, '\u2502', BORDER_FG, 0x24283bff);
		buffer.setCell(dx + dw - 1, y, '\u2502', BORDER_FG, 0x24283bff);
	}

	drawText(buffer, dx + 2, dy, ' New Card ', CARD_SEL_BG, 0x24283bff);

	// Title field
	const titleFocused = state.addField === 'title';
	drawText(buffer, dx + 2, dy + 2, 'Title:', titleFocused ? CARD_SEL_BG : FG, 0x24283bff);
	fillRect(buffer, dx + 2, dy + 3, dw - 4, 1, ' ', INPUT_FG, INPUT_BG);
	drawText(buffer, dx + 3, dy + 3, state.addTitle || (titleFocused ? '_' : ''), INPUT_FG, INPUT_BG);

	// Description field
	const descFocused = state.addField === 'description';
	drawText(buffer, dx + 2, dy + 5, 'Description:', descFocused ? CARD_SEL_BG : FG, 0x24283bff);
	fillRect(buffer, dx + 2, dy + 6, dw - 4, 1, ' ', INPUT_FG, INPUT_BG);
	drawText(buffer, dx + 3, dy + 6, state.addDescription || (descFocused ? '_' : ''), INPUT_FG, INPUT_BG);

	drawText(buffer, dx + 2, dy + 8, 'Tab: switch | Enter: add | Esc: cancel', STATUS_FG, 0x24283bff);
}

// =============================================================================
// OUTPUT
// =============================================================================

function bufferToAnsi(buffer: CellBufferDirect): string {
	let output = '\x1b[H';
	let lastFg = -1;
	let lastBg = -1;

	for (let y = 0; y < buffer.height; y++) {
		const row = buffer.cells[y];
		if (!row) continue;
		for (let x = 0; x < buffer.width; x++) {
			const cell = row[x];
			if (!cell) continue;
			if (cell.fg !== lastFg || cell.bg !== lastBg) {
				const fR = (cell.fg >> 24) & 0xff;
				const fG = (cell.fg >> 16) & 0xff;
				const fB = (cell.fg >> 8) & 0xff;
				const bR = (cell.bg >> 24) & 0xff;
				const bG = (cell.bg >> 16) & 0xff;
				const bB = (cell.bg >> 8) & 0xff;
				output += `\x1b[38;2;${fR};${fG};${fB};48;2;${bR};${bG};${bB}m`;
				lastFg = cell.fg;
				lastBg = cell.bg;
			}
			output += cell.char;
		}
		if (y < buffer.height - 1) output += '\n';
	}
	return output;
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
	const stdout = process.stdout;
	const stdin = process.stdin;
	const width = stdout.columns ?? 80;
	const height = stdout.rows ?? 24;

	const world = createWorld();

	const state: AppState = {
		world,
		columns: createSampleData(),
		colIndex: 0,
		cardIndex: 0,
		dragging: false,
		dragCard: null,
		dragSourceCol: 0,
		buffer: createCellBuffer(width, height) as CellBufferDirect,
		width,
		height,
		running: true,
		nextId: 7,
		showAddDialog: false,
		addTitle: '',
		addDescription: '',
		addField: 'title',
		hoverInfo: null,
	};

	// Terminal setup
	stdout.write('\x1b[?1049h');
	stdout.write('\x1b[?25l');
	stdin.setRawMode?.(true);
	stdin.resume();

	// Input
	stdin.on('data', (data: Buffer) => {
		const key = data.toString();

		if (!state.showAddDialog && !state.dragging && (key === 'q' || key === 'Q' || key === '\x03')) {
			state.running = false;
			return;
		}

		handleInput(state, key);
	});

	const cleanup = (): void => {
		stdout.write('\x1b[?25h');
		stdout.write('\x1b[?1049l');
		stdout.write('\x1b[0m');
		process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	const loop = (): void => {
		if (!state.running) {
			cleanup();
			return;
		}

		renderBoard(state);
		stdout.write(bufferToAnsi(state.buffer));
		setTimeout(loop, FRAME_TIME);
	};

	loop();
}

main();
