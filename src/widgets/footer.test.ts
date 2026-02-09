/**
 * Tests for Footer widget
 */

import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createFooter, type FooterConfig } from './footer';

describe('Footer widget', () => {
	let world: World;

	function setup(config: FooterConfig = {}) {
		world = createWorld();
		const eid = addEntity(world);
		return createFooter(world, eid, config);
	}

	describe('creation', () => {
		it('creates a footer with default values', () => {
			const footer = setup();
			expect(footer.eid).toBeGreaterThanOrEqual(0);
			expect(footer.getContent()).toBe('');
		});

		it('creates a footer with status', () => {
			const footer = setup({ status: 'Ready' });
			expect(footer.getContent()).toContain('Ready');
		});

		it('creates a footer with left/center/right sections', () => {
			const footer = setup({
				left: 'Ready',
				center: '50%',
				right: 'Ln 42, Col 10',
			});
			const content = footer.getContent();
			expect(content).toContain('Ready');
			expect(content).toContain('50%');
			expect(content).toContain('Ln 42, Col 10');
		});

		it('creates a footer with custom height', () => {
			const footer = setup({ height: 2 });
			expect(footer.eid).toBeGreaterThanOrEqual(0);
		});

		it('creates a footer with custom colors', () => {
			const footer = setup({
				fg: '#FFFFFF',
				bg: '#000080',
				status: 'Colored Footer',
			});
			expect(footer.eid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('visibility', () => {
		it('shows the footer', () => {
			const footer = setup({ status: 'Test' });
			const result = footer.show();
			expect(result).toBe(footer); // chainable
		});

		it('hides the footer', () => {
			const footer = setup({ status: 'Test' });
			const result = footer.hide();
			expect(result).toBe(footer); // chainable
		});
	});

	describe('content updates', () => {
		it('updates status', () => {
			const footer = setup({ status: 'Initial' });
			expect(footer.getContent()).toContain('Initial');

			footer.setStatus('Updated');
			expect(footer.getContent()).toContain('Updated');
		});

		it('updates left section', () => {
			const footer = setup({ left: 'Old' });
			expect(footer.getContent()).toContain('Old');

			footer.setLeft('New');
			expect(footer.getContent()).toContain('New');
		});

		it('updates center section', () => {
			const footer = setup({ center: 'Middle' });
			expect(footer.getContent()).toContain('Middle');

			footer.setCenter('Center');
			expect(footer.getContent()).toContain('Center');
		});

		it('updates right section', () => {
			const footer = setup({ right: 'Right' });
			expect(footer.getContent()).toContain('Right');

			footer.setRight('Changed');
			expect(footer.getContent()).toContain('Changed');
		});

		it('chains content updates', () => {
			const footer = setup();
			const result = footer.setLeft('L').setCenter('C').setRight('R').setStatus('Status');
			expect(result).toBe(footer);
		});
	});

	describe('three-section layout', () => {
		it('formats content with all three sections', () => {
			const footer = setup({
				left: 'Ready',
				center: '50%',
				right: 'Ln 42',
			});
			const content = footer.getContent();

			// Should contain all three sections
			expect(content).toContain('Ready');
			expect(content).toContain('50%');
			expect(content).toContain('Ln 42');

			// Center should be approximately in the middle
			const centerIndex = content.indexOf('50%');
			const contentLength = content.length;
			expect(centerIndex).toBeGreaterThan(contentLength / 4);
			expect(centerIndex).toBeLessThan((3 * contentLength) / 4);
		});

		it('handles empty sections gracefully', () => {
			const footer = setup({
				left: 'Left',
				center: '',
				right: 'Right',
			});
			const content = footer.getContent();
			expect(content).toContain('Left');
			expect(content).toContain('Right');
		});
	});

	describe('alignment', () => {
		it('left-aligns status by default', () => {
			const footer = setup({ status: 'Status' });
			const content = footer.getContent();
			expect(content.indexOf('Status')).toBe(0);
		});

		it('center-aligns status when specified', () => {
			const footer = setup({ status: 'Status', align: 'center' });
			const content = footer.getContent();
			const statusIndex = content.indexOf('Status');
			expect(statusIndex).toBeGreaterThan(0);
		});

		it('right-aligns status when specified', () => {
			const footer = setup({ status: 'Status', align: 'right' });
			const content = footer.getContent();
			const statusIndex = content.indexOf('Status');
			expect(statusIndex).toBeGreaterThan(0);
		});
	});

	describe('lifecycle', () => {
		it('destroys the widget', () => {
			const footer = setup({ status: 'Test' });

			expect(() => footer.destroy()).not.toThrow();

			// After destroy, state should be cleaned up
			footer.setStatus('Updated'); // should not throw
		});
	});
});
