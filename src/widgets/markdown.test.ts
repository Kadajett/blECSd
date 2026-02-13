/**
 * Tests for Markdown widget
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Dimensions } from '../components/dimensions';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import { Scrollable } from '../components/scrollable';
import { addEntity, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { createTestWorld } from '../testing';
import {
	createMarkdown,
	destroyMarkdown,
	getMarkdownLines,
	type MarkdownConfig,
	updateMarkdownContent,
} from './markdown';

describe('markdown widget', () => {
	let world: World;
	let entity: Entity;

	beforeEach(() => {
		world = createTestWorld();
		entity = addEntity(world) as Entity;
	});

	describe('createMarkdown', () => {
		it('creates markdown widget with defaults', () => {
			createMarkdown(world, entity);

			expect(hasComponent(world, entity, Renderable)).toBe(true);
			expect(Position.x[entity]).toBe(0);
			expect(Position.y[entity]).toBe(0);
			expect(Dimensions.width[entity]).toBe(40);
			expect(Dimensions.height[entity]).toBe(10);
		});

		it('creates markdown widget with custom position', () => {
			createMarkdown(world, entity, {
				left: 10,
				top: 5,
			});

			expect(Position.x[entity]).toBe(10);
			expect(Position.y[entity]).toBe(5);
		});

		it('creates markdown widget with custom dimensions', () => {
			createMarkdown(world, entity, {
				width: 80,
				height: 24,
			});

			expect(Dimensions.width[entity]).toBe(80);
			expect(Dimensions.height[entity]).toBe(24);
		});

		it('creates scrollable markdown widget', () => {
			createMarkdown(world, entity, {
				scrollable: true,
			});

			expect(hasComponent(world, entity, Scrollable)).toBe(true);
		});

		it('creates markdown widget with initial content', () => {
			createMarkdown(world, entity, {
				content: '# Hello\n\nThis is **bold** text.',
			});

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
			expect(lines?.length).toBeGreaterThan(0);
		});

		it('creates markdown widget with theme', () => {
			const config: MarkdownConfig = {
				theme: {
					headingColor: 0x00ff00,
					codeColor: 0xffff00,
					codeBgColor: 0x222222,
				},
			};

			createMarkdown(world, entity, config);

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});

		it('creates markdown widget with custom colors', () => {
			createMarkdown(world, entity, {
				fg: '#ffffff',
				bg: '#000000',
			});

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});

		it('creates markdown widget with bold style', () => {
			createMarkdown(world, entity, {
				bold: true,
			});

			expect(Renderable.bold[entity]).toBe(1);
		});

		it('creates markdown widget with underline style', () => {
			createMarkdown(world, entity, {
				underline: true,
			});

			expect(Renderable.underline[entity]).toBe(1);
		});

		it('validates config with Zod schema', () => {
			expect(() => {
				createMarkdown(world, entity, {
					width: -10, // Invalid: negative width
				});
			}).toThrow();
		});

		it('returns the entity', () => {
			const result = createMarkdown(world, entity);
			expect(result).toBe(entity);
		});
	});

	describe('updateMarkdownContent', () => {
		beforeEach(() => {
			createMarkdown(world, entity, {
				content: '# Initial',
			});
		});

		it('updates markdown content', () => {
			updateMarkdownContent(world, entity, '# Updated\n\nNew content here.');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
			expect(lines?.length).toBeGreaterThan(0);
		});

		it('marks entity as dirty after update', () => {
			Renderable.dirty[entity] = 0;

			updateMarkdownContent(world, entity, '# New content');

			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('handles empty content', () => {
			updateMarkdownContent(world, entity, '');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with headers', () => {
			updateMarkdownContent(world, entity, '# H1\n## H2\n### H3');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
			expect(lines?.length).toBeGreaterThan(0);
		});

		it('handles markdown with bold text', () => {
			updateMarkdownContent(world, entity, 'This is **bold** text.');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with italic text', () => {
			updateMarkdownContent(world, entity, 'This is *italic* text.');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with inline code', () => {
			updateMarkdownContent(world, entity, 'Use `const x = 10;` for constants.');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with code blocks', () => {
			const code = '```typescript\nconst x: number = 42;\nconsole.log(x);\n```';
			updateMarkdownContent(world, entity, code);

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with bullet lists', () => {
			updateMarkdownContent(world, entity, '- Item 1\n- Item 2\n- Item 3');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with numbered lists', () => {
			updateMarkdownContent(world, entity, '1. First\n2. Second\n3. Third');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with horizontal rules', () => {
			updateMarkdownContent(world, entity, 'Above\n\n---\n\nBelow');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with blockquotes', () => {
			updateMarkdownContent(world, entity, '> This is a quote\n> Multiple lines');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles markdown with links', () => {
			updateMarkdownContent(world, entity, 'Check out [GitHub](https://github.com)');

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
		});

		it('handles complex markdown document', () => {
			const markdown = `
# Welcome

This is a **markdown** widget with:

- **Bold** and *italic* text
- \`inline code\`
- Links like [GitHub](https://github.com)

## Code Example

\`\`\`typescript
const x: number = 42;
console.log(x);
\`\`\`

---

> Blockquotes work too!
			`.trim();

			updateMarkdownContent(world, entity, markdown);

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
			expect(lines?.length).toBeGreaterThan(0);
		});
	});

	describe('getMarkdownLines', () => {
		it('returns undefined for entity without markdown state', () => {
			const newEntity = addEntity(world) as Entity;
			const lines = getMarkdownLines(newEntity);
			expect(lines).toBeUndefined();
		});

		it('returns undefined for entity without rendered lines', () => {
			createMarkdown(world, entity); // No content
			const lines = getMarkdownLines(entity);
			expect(lines).toBeUndefined();
		});

		it('returns rendered lines for entity with content', () => {
			createMarkdown(world, entity, {
				content: '# Hello\n\nWorld',
			});

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();
			expect(Array.isArray(lines)).toBe(true);
		});

		it('returns readonly array', () => {
			createMarkdown(world, entity, {
				content: '# Hello',
			});

			const lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();

			// TypeScript should enforce readonly, but we can verify the structure
			if (lines) {
				expect(Array.isArray(lines)).toBe(true);
			}
		});
	});

	describe('destroyMarkdown', () => {
		it('removes markdown state', () => {
			createMarkdown(world, entity, {
				content: '# Hello',
			});

			let lines = getMarkdownLines(entity);
			expect(lines).toBeDefined();

			destroyMarkdown(world, entity);

			lines = getMarkdownLines(entity);
			expect(lines).toBeUndefined();
		});

		it('removes entity from world', () => {
			createMarkdown(world, entity);
			destroyMarkdown(world, entity);

			// Entity should no longer have components
			expect(hasComponent(world, entity, Renderable)).toBe(false);
		});
	});

	describe('theme support', () => {
		it('creates widget with heading color theme', () => {
			createMarkdown(world, entity, {
				content: '# Heading',
				theme: {
					headingColor: 0x00ff00,
				},
			});

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});

		it('creates widget with code color theme', () => {
			createMarkdown(world, entity, {
				content: '`code`',
				theme: {
					codeColor: 0xffff00,
					codeBgColor: 0x222222,
				},
			});

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});

		it('creates widget with link color theme', () => {
			createMarkdown(world, entity, {
				content: '[link](url)',
				theme: {
					linkColor: 0x0000ff,
				},
			});

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});

		it('creates widget with quote color theme', () => {
			createMarkdown(world, entity, {
				content: '> quote',
				theme: {
					quoteColor: 0x888888,
				},
			});

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});

		it('creates widget with text and background colors', () => {
			createMarkdown(world, entity, {
				content: 'text',
				theme: {
					textColor: 0xffffff,
					bgColor: 0x000000,
				},
			});

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});

		it('accepts theme colors as hex strings', () => {
			createMarkdown(world, entity, {
				content: '# Heading',
				theme: {
					headingColor: '#00ff00',
					codeColor: '#ffff00',
					linkColor: '#0000ff',
				},
			});

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});

		it('accepts theme colors as numbers', () => {
			createMarkdown(world, entity, {
				content: '# Heading',
				theme: {
					headingColor: 0x00ff00ff,
					codeColor: 0xffff00ff,
					linkColor: 0x0000ffff,
				},
			});

			expect(hasComponent(world, entity, Renderable)).toBe(true);
		});
	});
});
