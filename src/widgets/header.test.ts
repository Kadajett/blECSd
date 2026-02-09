/**
 * Tests for Header widget
 */

import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createHeader, type HeaderConfig } from './header';

describe('Header widget', () => {
	let world: World;

	function setup(config: HeaderConfig = {}) {
		world = createWorld();
		const eid = addEntity(world);
		return createHeader(world, eid, config);
	}

	describe('creation', () => {
		it('creates a header with default values', () => {
			const header = setup();
			expect(header.eid).toBeGreaterThanOrEqual(0);
			expect(header.getContent()).toBe('');
		});

		it('creates a header with title', () => {
			const header = setup({ title: 'My App' });
			expect(header.getContent()).toContain('My App');
		});

		it('creates a header with left/center/right sections', () => {
			const header = setup({
				left: 'File',
				center: 'Document.txt',
				right: 'v1.0.0',
			});
			const content = header.getContent();
			expect(content).toContain('File');
			expect(content).toContain('Document.txt');
			expect(content).toContain('v1.0.0');
		});

		it('creates a header with custom height', () => {
			const header = setup({ height: 2 });
			expect(header.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a header with custom colors', () => {
			const header = setup({
				fg: '#FFFFFF',
				bg: '#000080',
				title: 'Colored Header',
			});
			expect(header.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('visibility', () => {
		it('shows the header', () => {
			const header = setup({ title: 'Test' });
			const result = header.show();
			expect(result).toBe(header); // chainable
		});

		it('hides the header', () => {
			const header = setup({ title: 'Test' });
			const result = header.hide();
			expect(result).toBe(header); // chainable
		});
	});

	describe('content updates', () => {
		it('updates title', () => {
			const header = setup({ title: 'Initial' });
			expect(header.getContent()).toContain('Initial');

			header.setTitle('Updated');
			expect(header.getContent()).toContain('Updated');
		});

		it('updates left section', () => {
			const header = setup({ left: 'Old' });
			expect(header.getContent()).toContain('Old');

			header.setLeft('New');
			expect(header.getContent()).toContain('New');
		});

		it('updates center section', () => {
			const header = setup({ center: 'Middle' });
			expect(header.getContent()).toContain('Middle');

			header.setCenter('Center');
			expect(header.getContent()).toContain('Center');
		});

		it('updates right section', () => {
			const header = setup({ right: 'Right' });
			expect(header.getContent()).toContain('Right');

			header.setRight('Changed');
			expect(header.getContent()).toContain('Changed');
		});

		it('chains content updates', () => {
			const header = setup();
			const result = header.setLeft('L').setCenter('C').setRight('R').setTitle('Title');
			expect(result).toBe(header);
		});
	});

	describe('three-section layout', () => {
		it('formats content with all three sections', () => {
			const header = setup({
				left: 'File',
				center: 'Doc',
				right: 'v1.0',
			});
			const content = header.getContent();

			// Should contain all three sections
			expect(content).toContain('File');
			expect(content).toContain('Doc');
			expect(content).toContain('v1.0');

			// Center should be approximately in the middle
			const centerIndex = content.indexOf('Doc');
			const contentLength = content.length;
			expect(centerIndex).toBeGreaterThan(contentLength / 4);
			expect(centerIndex).toBeLessThan((3 * contentLength) / 4);
		});

		it('handles empty sections gracefully', () => {
			const header = setup({
				left: 'Left',
				center: '',
				right: 'Right',
			});
			const content = header.getContent();
			expect(content).toContain('Left');
			expect(content).toContain('Right');
		});
	});

	describe('alignment', () => {
		it('left-aligns title by default', () => {
			const header = setup({ title: 'Title' });
			const content = header.getContent();
			expect(content.indexOf('Title')).toBe(0);
		});

		it('center-aligns title when specified', () => {
			const header = setup({ title: 'Title', align: 'center' });
			const content = header.getContent();
			const titleIndex = content.indexOf('Title');
			expect(titleIndex).toBeGreaterThan(0);
		});

		it('right-aligns title when specified', () => {
			const header = setup({ title: 'Title', align: 'right' });
			const content = header.getContent();
			const titleIndex = content.indexOf('Title');
			expect(titleIndex).toBeGreaterThan(0);
		});
	});

	describe('lifecycle', () => {
		it('destroys the widget', () => {
			const header = setup({ title: 'Test' });

			expect(() => header.destroy()).not.toThrow();

			// After destroy, state should be cleaned up
			header.setTitle('Updated'); // should not throw
		});
	});
});
