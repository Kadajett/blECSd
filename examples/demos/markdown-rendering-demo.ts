#!/usr/bin/env node
/** Markdown Rendering Demo - parses and renders markdown with styles.
 * Run: npx tsx examples/demos/markdown-rendering-demo.ts | Quit: q or Ctrl+C */
import { parseMarkdown, renderMarkdown, createMarkdownCache } from '../../src/utils/markdownRender';

const stdout = process.stdout;
const [width, height] = [stdout.columns ?? 80, stdout.rows ?? 24];
stdout.write('\x1b[?1049h\x1b[?25l');

const MD = `# Markdown Rendering

This is a **bold** and *italic* demo for blECSd.

## Features
- Headings (h1-h6)
- **Bold** and *italic* text
- Inline \`code\` spans
- Ordered and unordered lists

## Code Block
\`\`\`typescript
const world = createWorld();
const eid = addEntity(world);
setPosition(world, eid, 10, 20);
\`\`\`

## Ordered List
1. First item
2. Second item
3. Third item

> Blockquotes are supported too.
> They can span multiple lines.

---

That's the **end** of this demo.`;

const cache = createMarkdownCache();
const result = parseMarkdown(MD);
const rendered = renderMarkdown(result.blocks, cache);
let scrollY = 0;
const viewH = height - 5;

function style(line: { content: string; style: { bold?: boolean; italic?: boolean; fg?: number; dim?: boolean } }): string {
	let a = '';
	if (line.style.bold) a += '\x1b[1m';
	if (line.style.italic) a += '\x1b[3m';
	if (line.style.dim) a += '\x1b[2m';
	if (line.style.fg) {
		const [r, g, b] = [(line.style.fg >> 24) & 0xff, (line.style.fg >> 16) & 0xff, (line.style.fg >> 8) & 0xff];
		a += `\x1b[38;2;${r};${g};${b}m`;
	}
	return `${a}${line.content}\x1b[0m`;
}

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mMarkdown Rendering Demo\x1b[0m');
	stdout.write(`\x1b[2;3H\x1b[90m${result.blocks.length} blocks, ${rendered.length} lines | ${result.parseTimeMs.toFixed(1)}ms\x1b[0m`);
	for (let i = 0; i < viewH; i++) {
		const line = rendered[scrollY + i];
		if (!line) break;
		stdout.write(`\x1b[${4 + i};3H${style(line).substring(0, width - 4)}`);
	}
	const maxS = Math.max(0, rendered.length - viewH);
	stdout.write(`\x1b[${height - 1};1H\x1b[33m[Up/Down] Scroll  [Home/End] Jump  [q] Quit  \x1b[90m${scrollY + 1}-${Math.min(scrollY + viewH, rendered.length)}/${rendered.length}\x1b[0m`);
}

render();
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	const maxS = Math.max(0, rendered.length - viewH);
	if (key === '\x1b[A' || key === 'k') scrollY = Math.max(0, scrollY - 1);
	if (key === '\x1b[B' || key === 'j') scrollY = Math.min(maxS, scrollY + 1);
	if (key === '\x1b[5~') scrollY = Math.max(0, scrollY - viewH);
	if (key === '\x1b[6~') scrollY = Math.min(maxS, scrollY + viewH);
	if (key === '\x1b[H' || key === 'g') scrollY = 0;
	if (key === '\x1b[F' || key === 'G') scrollY = maxS;
	render();
});
