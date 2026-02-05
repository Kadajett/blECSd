/**
 * BigText Widget Showcase
 *
 * Demonstrates multiple BigText widgets rendered simultaneously using
 * the core layout, render, and output systems.
 *
 * Run: pnpm dev
 * Quit: Ctrl+C
 */

import { addEntity, createWorld } from 'bitecs';
import {
	cleanup as cleanupOutput,
	clearScreen,
	createDoubleBuffer,
	createScreenEntity,
	enterAlternateScreen,
	getComputedLayout,
	getContent,
	getStyle,
	hideCursor,
	layoutSystem,
	outputSystem,
	renderSystem,
	setOutputBuffer,
	setOutputStream,
	setRenderBuffer,
	type Entity,
	type World,
} from 'blecsd';
import { createBigText } from 'blecsd/widgets';
import { loadFont } from 'blecsd/widgets/fonts';

const world = createWorld() as World;

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 40;
const width = Math.max(80, process.stdout.columns ?? DEFAULT_WIDTH);
const height = Math.max(30, process.stdout.rows ?? DEFAULT_HEIGHT);

createScreenEntity(world, { width, height });

const doubleBuffer = createDoubleBuffer(width, height);
setRenderBuffer(doubleBuffer);
setOutputBuffer(doubleBuffer);
setOutputStream(process.stdout);

enterAlternateScreen();
hideCursor();
clearScreen();

const leftColumn = 2;
const rightColumn = Math.min(Math.floor(width / 2) + 2, Math.max(2, width - 40));

const boldFont = loadFont('terminus-14-bold');
const normalFont = loadFont('terminus-14-normal');

const measureText = (text: string, charWidth: number, charHeight: number) => {
	const lines = text.split('\n');
	const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
	return {
		width: Math.max(1, maxLineLength * charWidth),
		height: Math.max(1, lines.length * charHeight),
	};
};

const titleText = 'BIG TEXT';
const titleSize = measureText(titleText, boldFont.charWidth, boldFont.charHeight);
const clampTop = (desired: number, blockHeight: number): number => {
	const maxTop = Math.max(1, height - blockHeight - 1);
	return Math.min(desired, maxTop);
};

const titleTop = clampTop(1, titleSize.height);
const title = createBigText(world, addEntity(world) as Entity, {
	left: leftColumn,
	top: titleTop,
	text: titleText,
	font: boldFont,
	fg: '#ffcc00',
	width: titleSize.width,
	height: titleSize.height,
});

const subtitleText = 'NORMAL';
const subtitleSize = measureText(subtitleText, normalFont.charWidth, normalFont.charHeight);
const subtitleTop = clampTop(titleTop + titleSize.height + 2, subtitleSize.height);
const subtitle = createBigText(world, addEntity(world) as Entity, {
	left: leftColumn,
	top: subtitleTop,
	text: subtitleText,
	font: normalFont,
	fg: '#5cc8ff',
	width: subtitleSize.width,
	height: subtitleSize.height,
});

const multiLineText = 'MULTI\nLINE';
const multiLineSize = measureText(multiLineText, boldFont.charWidth, boldFont.charHeight);
const multiLineTop = clampTop(1, multiLineSize.height);
const multiLine = createBigText(world, addEntity(world) as Entity, {
	left: rightColumn,
	top: multiLineTop,
	text: multiLineText,
	font: boldFont,
	fg: '#ff6b6b',
	width: multiLineSize.width,
	height: multiLineSize.height,
});

const accentsText = 'COLORS!';
const accentsSize = measureText(accentsText, normalFont.charWidth, normalFont.charHeight);
const accentsTop = clampTop(multiLineTop + multiLineSize.height + 2, accentsSize.height);
const accents = createBigText(world, addEntity(world) as Entity, {
	left: rightColumn,
	top: accentsTop,
	text: accentsText,
	font: normalFont,
	fg: '#8bff7a',
	width: accentsSize.width,
	height: accentsSize.height,
});

const outlineText = 'OUTLINE';
const outlineSize = measureText(outlineText, normalFont.charWidth, normalFont.charHeight);
const outlineTop = clampTop(subtitleTop + subtitleSize.height + 2, outlineSize.height);
const outline = createBigText(world, addEntity(world) as Entity, {
	left: leftColumn,
	top: outlineTop,
	text: outlineText,
	font: normalFont,
	fg: '#f2f2f2',
	width: outlineSize.width,
	height: outlineSize.height,
});

// Mark widgets dirty once for initial render.
// (BigText content changes already mark dirty, but this keeps the example explicit.)
title.setText(titleText);
subtitle.setText(subtitleText);
multiLine.setText(multiLineText);
accents.setText(accentsText);
outline.setText(outlineText);

const bigTextEntities = [
	title.eid,
	subtitle.eid,
	multiLine.eid,
	accents.eid,
	outline.eid,
];

const outlineEntities = new Set([outline.eid]);

const renderBigTextContent = (): void => {
	const buffer = doubleBuffer.backBuffer;

	for (const eid of bigTextEntities) {
		const layout = getComputedLayout(world, eid);
		if (!layout) continue;
		if (layout.width <= 0 || layout.height <= 0) continue;

		const content = getContent(world, eid);
		if (!content) continue;

		const style = getStyle(world, eid);
		const fg = style?.fg ?? 0xffffffff;
		const bg = style?.bg ?? 0x000000ff;

		const lines = content.split('\n');
		for (let row = 0; row < lines.length && row < layout.height; row += 1) {
			const rawLine = lines[row] ?? '';
			const line = outlineEntities.has(eid) ? rawLine.replaceAll('█', '░') : rawLine;
			const maxCols = Math.min(layout.width, line.length);
			const y = layout.y + row;
			if (y < 0 || y >= buffer.height) continue;

			for (let col = 0; col < maxCols; col += 1) {
				const x = layout.x + col;
				if (x < 0 || x >= buffer.width) continue;
				const char = line[col];
				if (!char) continue;
				const index = y * buffer.width + x;
				buffer.cells[index] = { char, fg, bg, attrs: 0 };
			}
		}
	}
};

const FRAME_MS = 1000 / 30;
const interval = setInterval(() => {
	layoutSystem(world);
	renderSystem(world);
	renderBigTextContent();
	doubleBuffer.fullRedraw = true;
	outputSystem(world);
}, FRAME_MS);

function cleanup(): void {
	clearInterval(interval);
	cleanupOutput();
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
