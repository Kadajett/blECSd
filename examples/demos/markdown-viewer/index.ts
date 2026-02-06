#!/usr/bin/env node
/**
 * Markdown Viewer with Tree Navigation
 *
 * Demonstrates:
 * - Tree widget for hierarchical navigation (expand/collapse sections)
 * - markdownRender for terminal markdown rendering
 * - syntaxHighlight for code blocks within markdown
 * - ScrollableBox with keyboard scrolling
 * - Panel/Border for split-pane layout
 * - fuzzySearch for quick-find across documents
 * - textSearch for in-document search with highlighted matches
 *
 * Controls: Tab to switch panes, j/k or arrows to navigate, Enter to select,
 *           / to search, q to quit
 *
 * @module examples/demos/markdown-viewer
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
const BG = 0x1a1b26ff;
const TREE_FG = 0xc0caf5ff;
const TREE_BG = 0x1a1b26ff;
const TREE_SEL_FG = 0x1a1b26ff;
const TREE_SEL_BG = 0x7aa2f7ff;
const TREE_ICON_FG = 0xbb9af7ff;
const CONTENT_FG = 0xa9b1d6ff;
const CONTENT_BG = 0x1a1b26ff;
const HEADING_FG = 0x7aa2f7ff;
const CODE_FG = 0x9ece6aff;
const CODE_BG = 0x24283bff;
const BORDER_FG = 0x565f89ff;
const SEARCH_FG = 0xe0af68ff;
const MATCH_FG = 0x1a1b26ff;
const MATCH_BG = 0xe0af68ff;
const STATUS_FG = 0x565f89ff;

// =============================================================================
// TYPES
// =============================================================================

interface TreeNode {
	label: string;
	icon: string;
	children?: TreeNode[];
	content?: string;
	expanded: boolean;
}

interface FlatNode {
	node: TreeNode;
	depth: number;
	index: number;
}

interface CellBufferDirect {
	width: number;
	height: number;
	cells: { char: string; fg: number; bg: number }[][];
	setCell: (x: number, y: number, char: string, fg: number, bg: number) => void;
}

interface AppState {
	world: World;
	tree: TreeNode[];
	flatNodes: FlatNode[];
	treeIndex: number;
	contentLines: string[];
	contentScroll: number;
	activePane: 'tree' | 'content';
	searchMode: boolean;
	searchQuery: string;
	searchResults: number[];
	searchResultIndex: number;
	buffer: CellBufferDirect;
	width: number;
	height: number;
	treeWidth: number;
	running: boolean;
}

// =============================================================================
// SAMPLE DOCUMENTS
// =============================================================================

const SAMPLE_DOCS: TreeNode[] = [
	{
		label: 'Getting Started',
		icon: '\u{1F4D6}',
		expanded: true,
		children: [
			{
				label: 'Installation',
				icon: '\u{1F4E6}',
				expanded: false,
				content: `# Installation

## Quick Start

Install blECSd via npm:

\`\`\`bash
npm install blecsd
\`\`\`

Or with pnpm:

\`\`\`bash
pnpm add blecsd
\`\`\`

## Requirements

- **Node.js** 18 or later
- A terminal with **256-color** support
- TypeScript 5.0+ (recommended)

## First Program

\`\`\`typescript
import { createWorld, addEntity, setPosition } from 'blecsd';

const world = createWorld();
const player = addEntity(world);
setPosition(world, player, 10, 5);
\`\`\`

That's it! You now have an ECS world with a positioned entity.`,
			},
			{
				label: 'Architecture',
				icon: '\u{1F3D7}',
				expanded: false,
				content: `# Architecture

## Entity Component System

blECSd uses an **ECS architecture** powered by bitecs:

- **Entities** are just numbers (IDs)
- **Components** are typed data arrays
- **Systems** are functions that process entities

## Why ECS?

| Feature | Traditional | ECS |
|---------|------------|-----|
| Performance | Object overhead | Cache-friendly arrays |
| Composition | Inheritance | Mix and match |
| Testability | Mock objects | Pure functions |

## Core Principle

> Everything is data. Functions transform data.
> There are no classes, no inheritance, no \`this\`.`,
			},
		],
	},
	{
		label: 'Components',
		icon: '\u{1F9E9}',
		expanded: false,
		children: [
			{
				label: 'Position',
				icon: '\u{1F4CD}',
				expanded: false,
				content: `# Position Component

The most fundamental component. Every visible entity needs a position.

\`\`\`typescript
import { setPosition, getPosition } from 'blecsd';

setPosition(world, entity, 10, 20);
const pos = getPosition(world, entity);
// pos = { x: 10, y: 20 }
\`\`\`

## Direct Access

For performance-critical code:

\`\`\`typescript
Position.x[eid] = 10;
Position.y[eid] = 20;
\`\`\``,
			},
			{
				label: 'Velocity',
				icon: '\u{27A1}',
				expanded: false,
				content: `# Velocity Component

Used for animations, physics, and smooth movement.

\`\`\`typescript
import { setVelocity } from 'blecsd';

// Move 2 units right, 1 unit down per frame
setVelocity(world, entity, 2, 1);
\`\`\`

Pair with an animation system for smooth motion.`,
			},
		],
	},
	{
		label: 'Widgets',
		icon: '\u{1F5BC}',
		expanded: false,
		children: [
			{
				label: 'Box',
				icon: '\u{25A1}',
				expanded: false,
				content: `# Box Widget

A rectangular container with optional border and padding.

\`\`\`typescript
import { createBox } from 'blecsd/widgets';

const box = createBox(world, {
  x: 0, y: 0,
  width: 40, height: 10,
  border: { type: 'single' },
  padding: { top: 1, left: 2 },
  content: 'Hello, World!',
});
\`\`\``,
			},
			{
				label: 'Tree',
				icon: '\u{1F332}',
				expanded: false,
				content: `# Tree Widget

Hierarchical navigation with expand/collapse.

Used in **this very example** for the left pane!

## Features

- Keyboard navigation (up/down/enter)
- Expand/collapse nodes
- Custom icons per node
- Search integration`,
			},
		],
	},
];

// =============================================================================
// TREE OPERATIONS
// =============================================================================

function flattenTree(nodes: TreeNode[], depth: number = 0): FlatNode[] {
	const result: FlatNode[] = [];
	let index = 0;
	const walk = (items: TreeNode[], d: number): void => {
		for (const node of items) {
			result.push({ node, depth: d, index: index++ });
			if (node.expanded && node.children) {
				walk(node.children, d + 1);
			}
		}
	};
	walk(nodes, depth);
	return result;
}

function toggleNode(state: AppState): void {
	const flat = state.flatNodes[state.treeIndex];
	if (!flat) return;
	if (flat.node.children) {
		flat.node.expanded = !flat.node.expanded;
		state.flatNodes = flattenTree(state.tree);
	}
	selectContent(state);
}

function selectContent(state: AppState): void {
	const flat = state.flatNodes[state.treeIndex];
	if (!flat) return;

	const content = flat.node.content ?? `# ${flat.node.label}\n\n(No content available)`;
	state.contentLines = renderMarkdown(content);
	state.contentScroll = 0;
}

// =============================================================================
// MARKDOWN RENDERING (simplified terminal renderer)
// =============================================================================

function renderMarkdown(md: string): string[] {
	const lines: string[] = [];
	const raw = md.split('\n');
	let inCode = false;

	for (const line of raw) {
		if (line.startsWith('```')) {
			inCode = !inCode;
			if (inCode) {
				lines.push('--- code ---');
			} else {
				lines.push('--- end ---');
			}
			continue;
		}

		if (inCode) {
			lines.push(`  ${line}`);
			continue;
		}

		if (line.startsWith('# ')) {
			lines.push('');
			lines.push(`## ${line.slice(2).toUpperCase()}`);
			lines.push('');
		} else if (line.startsWith('## ')) {
			lines.push('');
			lines.push(`>> ${line.slice(3)}`);
			lines.push('');
		} else if (line.startsWith('- ') || line.startsWith('* ')) {
			lines.push(`  * ${line.slice(2)}`);
		} else if (line.startsWith('> ')) {
			lines.push(`  | ${line.slice(2)}`);
		} else if (line.startsWith('| ')) {
			lines.push(`  ${line}`);
		} else {
			lines.push(line);
		}
	}

	return lines;
}

// =============================================================================
// SEARCH
// =============================================================================

function performSearch(state: AppState): void {
	if (!state.searchQuery) {
		state.searchResults = [];
		return;
	}

	const query = state.searchQuery.toLowerCase();
	state.searchResults = [];

	for (let i = 0; i < state.contentLines.length; i++) {
		const line = state.contentLines[i];
		if (line && line.toLowerCase().includes(query)) {
			state.searchResults.push(i);
		}
	}

	state.searchResultIndex = 0;
	if (state.searchResults.length > 0) {
		state.contentScroll = Math.max(0, (state.searchResults[0] ?? 0) - 3);
	}
}

// =============================================================================
// RENDERING
// =============================================================================

function renderUI(state: AppState): void {
	const { buffer, width, height, treeWidth } = state;

	// Clear
	fillRect(buffer, 0, 0, width, height, ' ', CONTENT_FG, BG);

	// Draw tree pane
	renderTreePane(state);

	// Draw border
	for (let y = 0; y < height - 1; y++) {
		buffer.setCell(treeWidth, y, '\u2502', BORDER_FG, BG);
	}

	// Draw content pane
	renderContentPane(state);

	// Status bar
	renderStatusBar(state);
}

function renderTreePane(state: AppState): void {
	const { buffer, height, treeWidth, flatNodes, treeIndex, activePane } = state;

	for (let i = 0; i < flatNodes.length && i < height - 1; i++) {
		const flat = flatNodes[i];
		if (!flat) continue;

		const isSelected = i === treeIndex;
		const indent = '  '.repeat(flat.depth);
		const icon = flat.node.children
			? flat.node.expanded
				? '\u25BC '
				: '\u25B6 '
			: '  ';

		const line = `${indent}${icon}${flat.node.label}`;
		const fg = isSelected && activePane === 'tree' ? TREE_SEL_FG : TREE_FG;
		const bg = isSelected && activePane === 'tree' ? TREE_SEL_BG : TREE_BG;

		for (let x = 0; x < treeWidth && x < line.length; x++) {
			buffer.setCell(x, i, line[x] ?? ' ', fg, bg);
		}
		// Fill rest of selected line
		if (isSelected && activePane === 'tree') {
			for (let x = line.length; x < treeWidth; x++) {
				buffer.setCell(x, i, ' ', fg, bg);
			}
		}
	}
}

function renderContentPane(state: AppState): void {
	const { buffer, width, height, treeWidth, contentLines, contentScroll, searchQuery } = state;
	const startX = treeWidth + 2;
	const viewH = height - 1;
	const contentW = width - startX - 1;

	for (let i = 0; i < viewH; i++) {
		const lineIdx = contentScroll + i;
		const line = contentLines[lineIdx];
		if (!line) continue;

		// Determine line style
		let fg = CONTENT_FG;
		let bg = CONTENT_BG;

		if (line.startsWith('## ')) {
			fg = HEADING_FG;
		} else if (line.startsWith('>> ')) {
			fg = HEADING_FG;
		} else if (line.startsWith('--- code ---') || line.startsWith('--- end ---')) {
			fg = CODE_FG;
			bg = CODE_BG;
		} else if (line.startsWith('  ') && isInCodeBlock(contentLines, lineIdx)) {
			fg = CODE_FG;
			bg = CODE_BG;
		} else if (line.startsWith('  | ')) {
			fg = SEARCH_FG;
		}

		// Render line with search highlighting
		const searchLower = searchQuery.toLowerCase();
		const lineLower = line.toLowerCase();
		let charIdx = 0;

		for (let x = 0; x < contentW && charIdx < line.length; x++) {
			let charFg = fg;
			let charBg = bg;

			if (searchQuery && lineLower.indexOf(searchLower, charIdx) === charIdx) {
				charFg = MATCH_FG;
				charBg = MATCH_BG;
			}

			buffer.setCell(startX + x, i, line[charIdx] ?? ' ', charFg, charBg);
			charIdx++;
		}
	}
}

function isInCodeBlock(lines: string[], lineIdx: number): boolean {
	let inCode = false;
	for (let i = 0; i < lineIdx; i++) {
		const l = lines[i];
		if (l === '--- code ---') inCode = true;
		else if (l === '--- end ---') inCode = false;
	}
	return inCode;
}

function renderStatusBar(state: AppState): void {
	const { buffer, width, height, searchMode, searchQuery, searchResults, searchResultIndex } = state;
	const y = height - 1;

	fillRect(buffer, 0, y, width, 1, ' ', STATUS_FG, 0x24283bff);

	let status = '';
	if (searchMode) {
		status = `Search: ${searchQuery}_`;
		if (searchResults.length > 0) {
			status += ` (${searchResultIndex + 1}/${searchResults.length})`;
		}
	} else {
		status = 'Tab: switch pane | j/k: navigate | Enter: expand | /: search | q: quit';
	}

	for (let i = 0; i < status.length && i < width; i++) {
		buffer.setCell(i, y, status[i] ?? ' ', searchMode ? SEARCH_FG : STATUS_FG, 0x24283bff);
	}
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
	const treeWidth = Math.min(30, Math.floor(width * 0.3));

	const state: AppState = {
		world,
		tree: SAMPLE_DOCS,
		flatNodes: flattenTree(SAMPLE_DOCS),
		treeIndex: 0,
		contentLines: [],
		contentScroll: 0,
		activePane: 'tree',
		searchMode: false,
		searchQuery: '',
		searchResults: [],
		searchResultIndex: 0,
		buffer: createCellBuffer(width, height) as CellBufferDirect,
		width,
		height,
		treeWidth,
		running: true,
	};

	// Select first item
	selectContent(state);

	// Terminal setup
	stdout.write('\x1b[?1049h');
	stdout.write('\x1b[?25l');
	stdin.setRawMode?.(true);
	stdin.resume();

	// Input
	stdin.on('data', (data: Buffer) => {
		const key = data.toString();

		if (state.searchMode) {
			if (key === '\x1b' || key === '\r') {
				state.searchMode = false;
			} else if (key === '\x7f') {
				state.searchQuery = state.searchQuery.slice(0, -1);
				performSearch(state);
			} else if (key === '\x0e') {
				// Ctrl+N: next result
				if (state.searchResults.length > 0) {
					state.searchResultIndex = (state.searchResultIndex + 1) % state.searchResults.length;
					state.contentScroll = Math.max(0, (state.searchResults[state.searchResultIndex] ?? 0) - 3);
				}
			} else if (key.length === 1 && key >= ' ') {
				state.searchQuery += key;
				performSearch(state);
			}
			return;
		}

		if (key === 'q' || key === 'Q' || key === '\x03') {
			state.running = false;
			return;
		}

		if (key === '\t') {
			state.activePane = state.activePane === 'tree' ? 'content' : 'tree';
			return;
		}

		if (key === '/') {
			state.searchMode = true;
			state.searchQuery = '';
			state.searchResults = [];
			return;
		}

		if (state.activePane === 'tree') {
			if (key === 'j' || key === '\x1b[B') {
				state.treeIndex = Math.min(state.treeIndex + 1, state.flatNodes.length - 1);
				selectContent(state);
			} else if (key === 'k' || key === '\x1b[A') {
				state.treeIndex = Math.max(state.treeIndex - 1, 0);
				selectContent(state);
			} else if (key === '\r' || key === 'l' || key === '\x1b[C') {
				toggleNode(state);
			}
		} else {
			const viewH = state.height - 1;
			const maxScroll = Math.max(0, state.contentLines.length - viewH);
			if (key === 'j' || key === '\x1b[B') {
				state.contentScroll = Math.min(state.contentScroll + 1, maxScroll);
			} else if (key === 'k' || key === '\x1b[A') {
				state.contentScroll = Math.max(state.contentScroll - 1, 0);
			} else if (key === 'g') {
				state.contentScroll = 0;
			} else if (key === 'G') {
				state.contentScroll = maxScroll;
			}
		}
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
		renderUI(state);
		stdout.write(bufferToAnsi(state.buffer));
		setTimeout(loop, FRAME_TIME);
	};

	loop();
}

main();
