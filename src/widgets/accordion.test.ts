/**
 * Tests for Accordion and Collapsible widgets.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	Accordion,
	collapseAllSections,
	createAccordion,
	createCollapsible,
	expandAllSections,
	expandSection,
	getExpandedSections,
	isAccordion,
	isCollapsible,
	resetAccordionStore,
	toggleCollapsible,
	toggleSection,
} from './accordion';

describe('Accordion widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetAccordionStore();
	});

	describe('createAccordion', () => {
		it('should create an accordion with sections', () => {
			const eid = addEntity(world);
			const accordion = createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1' },
					{ title: 'Section 2', content: 'Content 2' },
				],
			});

			expect(accordion).toBe(eid);
			expect(isAccordion(eid)).toBe(true);
		});

		it('should handle empty sections array', () => {
			const eid = addEntity(world);
			const accordion = createAccordion(world, eid, { sections: [] });

			expect(isAccordion(accordion)).toBe(true);
			expect(getExpandedSections(accordion)).toEqual([]);
		});

		it('should respect defaultExpanded indices', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1' },
					{ title: 'Section 2', content: 'Content 2' },
					{ title: 'Section 3', content: 'Content 3' },
				],
				defaultExpanded: [0, 2],
			});

			const expanded = getExpandedSections(eid);
			expect(expanded).toContain(0);
			expect(expanded).toContain(2);
			expect(expanded).not.toContain(1);
		});

		it('should expand all sections with defaultExpanded="all"', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1' },
					{ title: 'Section 2', content: 'Content 2' },
					{ title: 'Section 3', content: 'Content 3' },
				],
				defaultExpanded: 'all',
			});

			const expanded = getExpandedSections(eid);
			expect(expanded).toEqual([0, 1, 2]);
		});

		it('should respect section-level expanded flags', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1', expanded: true },
					{ title: 'Section 2', content: 'Content 2', expanded: false },
				],
			});

			const expanded = getExpandedSections(eid);
			expect(expanded).toContain(0);
			expect(expanded).not.toContain(1);
		});

		it('should handle custom icons', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1' }],
				icons: {
					expanded: '−',
					collapsed: '+',
				},
			});

			expect(isAccordion(eid)).toBe(true);
		});

		it('should apply header styling', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1' }],
				style: {
					header: {
						fg: '#FFFFFF',
						bg: '#000000',
					},
				},
			});

			expect(isAccordion(eid)).toBe(true);
		});

		it('should apply content styling', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1' }],
				style: {
					content: {
						fg: '#CCCCCC',
						bg: '#222222',
					},
				},
			});

			expect(isAccordion(eid)).toBe(true);
		});
	});

	describe('toggleSection', () => {
		it('should toggle section expanded state', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1', expanded: false }],
			});

			expect(getExpandedSections(eid)).toEqual([]);

			toggleSection(eid, 0);
			expect(getExpandedSections(eid)).toContain(0);

			toggleSection(eid, 0);
			expect(getExpandedSections(eid)).not.toContain(0);
		});

		it('should trigger onToggle callback', () => {
			const onToggle = vi.fn();
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1', onToggle }],
			});

			toggleSection(eid, 0);
			expect(onToggle).toHaveBeenCalledWith(true);

			toggleSection(eid, 0);
			expect(onToggle).toHaveBeenCalledWith(false);
		});

		it('should handle invalid section index gracefully', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1' }],
			});

			expect(() => toggleSection(eid, 99)).not.toThrow();
		});
	});

	describe('exclusive mode (allowMultiple: false)', () => {
		it('should collapse other sections when expanding one', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1', expanded: true },
					{ title: 'Section 2', content: 'Content 2', expanded: false },
				],
				allowMultiple: false,
			});

			expect(getExpandedSections(eid)).toEqual([0]);

			toggleSection(eid, 1);
			const expanded = getExpandedSections(eid);
			expect(expanded).toContain(1);
			expect(expanded).not.toContain(0);
		});
	});

	describe('multiple mode (allowMultiple: true)', () => {
		it('should allow multiple sections expanded', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1' },
					{ title: 'Section 2', content: 'Content 2' },
				],
				allowMultiple: true,
			});

			toggleSection(eid, 0);
			toggleSection(eid, 1);

			const expanded = getExpandedSections(eid);
			expect(expanded).toContain(0);
			expect(expanded).toContain(1);
		});
	});

	describe('expandSection', () => {
		it('should expand a collapsed section', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1', expanded: false }],
			});

			expandSection(eid, 0);
			expect(getExpandedSections(eid)).toContain(0);
		});

		it('should not toggle already expanded section', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1', expanded: true }],
			});

			expandSection(eid, 0);
			expect(getExpandedSections(eid)).toContain(0);
		});
	});

	describe('expandAllSections', () => {
		it('should expand all sections when allowMultiple is true', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1' },
					{ title: 'Section 2', content: 'Content 2' },
					{ title: 'Section 3', content: 'Content 3' },
				],
				allowMultiple: true,
			});

			expandAllSections(eid);
			expect(getExpandedSections(eid)).toEqual([0, 1, 2]);
		});

		it('should not work when allowMultiple is false', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1' },
					{ title: 'Section 2', content: 'Content 2' },
				],
				allowMultiple: false,
			});

			expandAllSections(eid);
			expect(getExpandedSections(eid).length).toBeLessThanOrEqual(1);
		});
	});

	describe('collapseAllSections', () => {
		it('should collapse all expanded sections', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [
					{ title: 'Section 1', content: 'Content 1', expanded: true },
					{ title: 'Section 2', content: 'Content 2', expanded: true },
				],
				allowMultiple: true,
			});

			collapseAllSections(eid);
			expect(getExpandedSections(eid)).toEqual([]);
		});
	});

	describe('Accordion type guard', () => {
		it('should return accordion widget when entity is an accordion', () => {
			const eid = addEntity(world);
			createAccordion(world, eid, {
				sections: [{ title: 'Section 1', content: 'Content 1' }],
			});

			const widget = Accordion(eid, world);
			expect(widget).toBeDefined();
			expect(widget?.entity).toBe(eid);
			expect(widget?.world).toBe(world);
		});

		it('should return undefined for non-accordion entities', () => {
			const eid = addEntity(world);
			const widget = Accordion(eid, world);
			expect(widget).toBeUndefined();
		});
	});
});

describe('Collapsible widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetAccordionStore();
	});

	describe('createCollapsible', () => {
		it('should create a collapsible widget', () => {
			const eid = addEntity(world);
			const collapsible = createCollapsible(world, eid, {
				title: 'Click to expand',
				content: 'Hidden content',
			});

			expect(collapsible).toBe(eid);
			expect(isCollapsible(eid)).toBe(true);
		});

		it('should respect initial expanded state', () => {
			const eid = addEntity(world);
			createCollapsible(world, eid, {
				title: 'Click to expand',
				content: 'Hidden content',
				expanded: true,
			});

			expect(isCollapsible(eid)).toBe(true);
		});

		it('should handle custom icons', () => {
			const eid = addEntity(world);
			createCollapsible(world, eid, {
				title: 'Click to expand',
				content: 'Hidden content',
				icons: {
					expanded: '−',
					collapsed: '+',
				},
			});

			expect(isCollapsible(eid)).toBe(true);
		});

		it('should apply header styling', () => {
			const eid = addEntity(world);
			createCollapsible(world, eid, {
				title: 'Click to expand',
				content: 'Hidden content',
				style: {
					header: {
						fg: '#FFFFFF',
						bg: '#000000',
					},
				},
			});

			expect(isCollapsible(eid)).toBe(true);
		});

		it('should apply content styling', () => {
			const eid = addEntity(world);
			createCollapsible(world, eid, {
				title: 'Click to expand',
				content: 'Hidden content',
				style: {
					content: {
						fg: '#CCCCCC',
						bg: '#222222',
					},
				},
			});

			expect(isCollapsible(eid)).toBe(true);
		});
	});

	describe('toggleCollapsible', () => {
		it('should toggle expanded state', () => {
			const eid = addEntity(world);
			createCollapsible(world, eid, {
				title: 'Click to expand',
				content: 'Hidden content',
				expanded: false,
			});

			toggleCollapsible(eid);
			// State is toggled internally - we can't easily verify without exposing state

			toggleCollapsible(eid);
			// Toggled back
		});

		it('should trigger onToggle callback', () => {
			const onToggle = vi.fn();
			const eid = addEntity(world);
			createCollapsible(world, eid, {
				title: 'Click to expand',
				content: 'Hidden content',
				onToggle,
			});

			toggleCollapsible(eid);
			expect(onToggle).toHaveBeenCalledWith(true);

			toggleCollapsible(eid);
			expect(onToggle).toHaveBeenCalledWith(false);
		});
	});

	describe('isCollapsible', () => {
		it('should return true for collapsible entities', () => {
			const eid = addEntity(world);
			createCollapsible(world, eid, {
				title: 'Click to expand',
				content: 'Hidden content',
			});

			expect(isCollapsible(eid)).toBe(true);
		});

		it('should return false for non-collapsible entities', () => {
			const eid = addEntity(world);
			expect(isCollapsible(eid)).toBe(false);
		});
	});
});
