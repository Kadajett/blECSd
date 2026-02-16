/**
 * Accordion widget namespace.
 *
 * @example
 * ```typescript
 * import { accordion } from 'blecsd/widgets';
 * const a = accordion.create(world, { sections: [...] });
 * accordion.expandSection(world, a.eid, 0);
 * accordion.toggleSection(world, a.eid, 1);
 * ```
 */
import {
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
} from '../accordion';

export const accordion = Object.freeze({
	create: createAccordion,
	is: isAccordion,
	expandSection,
	toggleSection,
	collapseAll: collapseAllSections,
	expandAll: expandAllSections,
	getExpandedSections,
	resetStore: resetAccordionStore,
});

export const collapsible = Object.freeze({
	create: createCollapsible,
	is: isCollapsible,
	toggle: toggleCollapsible,
});

export type AccordionModule = typeof accordion;
export type CollapsibleModule = typeof collapsible;
