/**
 * Accordion and Collapsible Widgets
 *
 * Expandable container widgets for showing/hiding content sections.
 *
 * - **Accordion**: Container with multiple collapsible sections (optionally exclusive)
 * - **Collapsible**: Single section with header and expandable body
 *
 * @module widgets/accordion
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setFocusable } from '../components/focusable';
import { appendChild } from '../components/hierarchy';
import { setPadding } from '../components/padding';
import { setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { addEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { setClickable } from '../systems/interactiveSystem';
import { parseColor } from '../utils/color';
import { createBox } from './box';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for a single accordion section.
 */
export interface AccordionSection {
	/** Section title text */
	readonly title: string;
	/** Section content (text or entity) */
	readonly content?: string | Entity;
	/** Whether section starts expanded */
	readonly expanded?: boolean;
	/** Callback when section is toggled */
	readonly onToggle?: (expanded: boolean) => void;
}

/**
 * Configuration for accordion widget.
 */
export interface AccordionConfig {
	/** Array of sections */
	readonly sections?: readonly AccordionSection[];
	/** Allow multiple sections expanded at once */
	readonly allowMultiple?: boolean;
	/** Initial expanded sections (indices or 'all') */
	readonly defaultExpanded?: readonly number[] | 'all';
	/** Custom icons for expanded/collapsed states */
	readonly icons?: {
		readonly expanded?: string;
		readonly collapsed?: string;
	};
	/** Style configuration */
	readonly style?: {
		readonly header?: {
			readonly fg?: string | number;
			readonly bg?: string | number;
		};
		readonly content?: {
			readonly fg?: string | number;
			readonly bg?: string | number;
		};
	};
}

/**
 * Configuration for collapsible widget.
 */
export interface CollapsibleConfig {
	/** Header title text */
	readonly title: string;
	/** Body content (text or entity) */
	readonly content?: string | Entity;
	/** Initial expanded state */
	readonly expanded?: boolean;
	/** Callback when toggled */
	readonly onToggle?: (expanded: boolean) => void;
	/** Custom icons */
	readonly icons?: {
		readonly expanded?: string;
		readonly collapsed?: string;
	};
	/** Style configuration */
	readonly style?: {
		readonly header?: {
			readonly fg?: string | number;
			readonly bg?: string | number;
		};
		readonly content?: {
			readonly fg?: string | number;
			readonly bg?: string | number;
		};
	};
}

/**
 * Accordion widget instance.
 */
export interface AccordionWidget {
	readonly entity: Entity;
	readonly world: World;
}

/**
 * Collapsible widget instance.
 */
export interface CollapsibleWidget {
	readonly entity: Entity;
	readonly world: World;
}

/**
 * Zod schema for AccordionSection validation.
 */
export const AccordionSectionSchema = z.object({
	title: z.string(),
	content: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	expanded: z.boolean().optional(),
	onToggle: z.function().nullable().optional(),
});

/**
 * Zod schema for AccordionConfig validation.
 */
export const AccordionConfigSchema = z.object({
	sections: z.array(AccordionSectionSchema).optional(),
	allowMultiple: z.boolean().optional(),
	defaultExpanded: z.union([z.array(z.number().int().nonnegative()), z.literal('all')]).optional(),
	icons: z
		.object({
			expanded: z.string().optional(),
			collapsed: z.string().optional(),
		})
		.optional(),
	style: z
		.object({
			header: z
				.object({
					fg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
					bg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
				})
				.optional(),
			content: z
				.object({
					fg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
					bg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
				})
				.optional(),
		})
		.optional(),
});

/**
 * Zod schema for CollapsibleConfig validation.
 */
export const CollapsibleConfigSchema = z.object({
	title: z.string(),
	content: z.union([z.string(), z.number().int().nonnegative()]).optional(),
	expanded: z.boolean().optional(),
	onToggle: z.function().nullable().optional(),
	icons: z
		.object({
			expanded: z.string().optional(),
			collapsed: z.string().optional(),
		})
		.optional(),
	style: z
		.object({
			header: z
				.object({
					fg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
					bg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
				})
				.optional(),
			content: z
				.object({
					fg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
					bg: z.union([z.string(), z.number().int().nonnegative()]).optional(),
				})
				.optional(),
		})
		.optional(),
});

// =============================================================================
// COMPONENT STORE
// =============================================================================

interface AccordionState {
	allowMultiple: boolean;
	expandedSections: Set<number>;
	sections: Array<{
		headerEntity: Entity;
		contentEntity: Entity;
		expanded: boolean;
		onToggle: ((expanded: boolean) => void) | undefined;
	}>;
	icons: {
		expanded: string;
		collapsed: string;
	};
	world: World;
}

interface CollapsibleState {
	expanded: boolean;
	headerEntity: Entity;
	contentEntity: Entity;
	onToggle: ((expanded: boolean) => void) | undefined;
	icons: {
		expanded: string;
		collapsed: string;
	};
	world: World;
}

const accordionStore = new Map<Entity, AccordionState>();
const collapsibleStore = new Map<Entity, CollapsibleState>();

/**
 * Store mapping header entities to their titles.
 */
const headerTitleStore = new Map<Entity, string>();

/**
 * Resets the accordion component store (useful for testing).
 */
export function resetAccordionStore(): void {
	accordionStore.clear();
	collapsibleStore.clear();
	headerTitleStore.clear();
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_EXPANDED_ICON = '▼';
const DEFAULT_COLLAPSED_ICON = '▶';

// =============================================================================
// HELPERS
// =============================================================================

/** Initializes the set of expanded section indices */
function initializeExpandedSections(
	sections: readonly AccordionSection[],
	defaultExpanded: AccordionConfig['defaultExpanded'],
): Set<number> {
	const expandedSections = new Set<number>();
	if (defaultExpanded === 'all') {
		for (let i = 0; i < sections.length; i++) {
			expandedSections.add(i);
		}
	} else if (Array.isArray(defaultExpanded)) {
		for (const i of defaultExpanded) {
			expandedSections.add(i);
		}
	} else {
		for (let i = 0; i < sections.length; i++) {
			const section = sections[i];
			if (section?.expanded) {
				expandedSections.add(i);
			}
		}
	}
	return expandedSections;
}

// =============================================================================
// ACCORDION WIDGET
// =============================================================================

/**
 * Applies color styling to an entity if colors are provided.
 * @internal
 */
function applyStyleColors(
	world: World,
	entity: Entity,
	style: { fg?: string | number; bg?: string | number } | undefined,
): void {
	if (!style) {
		return;
	}

	const fg = typeof style.fg === 'string' ? parseColor(style.fg) : style.fg;
	const bg = typeof style.bg === 'string' ? parseColor(style.bg) : style.bg;

	if (fg !== undefined || bg !== undefined) {
		setStyle(world, entity, { fg, bg });
	}
}

/**
 * Creates a header entity for an accordion section.
 * @internal
 */
function createSectionHeader(
	world: World,
	parentEntity: Entity,
	section: AccordionSection,
	index: number,
	expanded: boolean,
	icons: { expanded: string; collapsed: string },
	headerStyle: { fg?: string | number; bg?: string | number } | undefined,
): Entity {
	const headerEntity = addEntity(world);
	createBox(world, headerEntity);
	setPosition(world, headerEntity, 0, index * 2);
	setDimensions(world, headerEntity, 40, 1);
	setContent(
		world,
		headerEntity,
		`${expanded ? icons.expanded : icons.collapsed} ${section.title}`,
	);
	setFocusable(world, headerEntity, { focusable: true });
	appendChild(world, parentEntity, headerEntity);

	headerTitleStore.set(headerEntity, section.title);
	setClickable(world, headerEntity, true);
	applyStyleColors(world, headerEntity, headerStyle);

	return headerEntity;
}

/**
 * Creates a content entity for an accordion section.
 * @internal
 */
function createSectionContent(
	world: World,
	parentEntity: Entity,
	section: AccordionSection,
	index: number,
	expanded: boolean,
	contentStyle: { fg?: string | number; bg?: string | number } | undefined,
): Entity {
	const contentEntity = addEntity(world);
	createBox(world, contentEntity);
	setPosition(world, contentEntity, 2, index * 2 + 1);
	setDimensions(world, contentEntity, 38, 3);
	setPadding(world, contentEntity, { left: 1, right: 1, top: 0, bottom: 0 });

	if (typeof section.content === 'string') {
		setContent(world, contentEntity, section.content);
	} else if (section.content !== undefined) {
		appendChild(world, contentEntity, section.content);
	}

	setVisible(world, contentEntity, expanded);
	appendChild(world, parentEntity, contentEntity);
	applyStyleColors(world, contentEntity, contentStyle);

	return contentEntity;
}

/**
 * Creates a complete accordion section (header + content).
 * @internal
 */
function createAccordionSection(
	world: World,
	parentEntity: Entity,
	section: AccordionSection,
	index: number,
	expanded: boolean,
	icons: { expanded: string; collapsed: string },
	style:
		| {
				header?: { fg?: string | number; bg?: string | number };
				content?: { fg?: string | number; bg?: string | number };
		  }
		| undefined,
): {
	headerEntity: Entity;
	contentEntity: Entity;
	expanded: boolean;
	onToggle: ((expanded: boolean) => void) | undefined;
} {
	const headerEntity = createSectionHeader(
		world,
		parentEntity,
		section,
		index,
		expanded,
		icons,
		style?.header,
	);

	const contentEntity = createSectionContent(
		world,
		parentEntity,
		section,
		index,
		expanded,
		style?.content,
	);

	return {
		headerEntity,
		contentEntity,
		expanded,
		onToggle: section.onToggle ?? undefined,
	};
}

/**
 * Creates an accordion widget with multiple collapsible sections.
 *
 * @param world - The ECS world
 * @param entity - The entity to attach the accordion to
 * @param config - Accordion configuration
 * @returns The accordion entity
 *
 * @example
 * ```typescript
 * import { createAccordion, createWorld, addEntity } from 'blecsd';
 *
 * const world = createWorld();
 * const accordion = addEntity(world);
 * createAccordion(world, accordion, {
 *   sections: [
 *     { title: 'Section 1', content: 'Content 1', expanded: true },
 *     { title: 'Section 2', content: 'Content 2' }
 *   ],
 *   allowMultiple: false
 * });
 * ```
 */
export function createAccordion(
	world: World,
	entity: Entity,
	config: AccordionConfig = {},
): Entity {
	const sections = config.sections ?? [];
	const allowMultiple = config.allowMultiple ?? false;
	const defaultExpanded = config.defaultExpanded;
	const icons = {
		expanded: config.icons?.expanded ?? DEFAULT_EXPANDED_ICON,
		collapsed: config.icons?.collapsed ?? DEFAULT_COLLAPSED_ICON,
	};

	// Initialize expanded sections
	const expandedSections = initializeExpandedSections(sections, defaultExpanded);

	// Create section entities
	const sectionStates = sections.map((section, index) =>
		createAccordionSection(
			world,
			entity,
			section,
			index,
			expandedSections.has(index),
			icons,
			config.style,
		),
	);

	// Store accordion state
	accordionStore.set(entity, {
		allowMultiple,
		expandedSections,
		sections: sectionStates,
		icons,
		world,
	});

	return entity;
}

/**
 * Toggles an accordion section's expanded state.
 *
 * @param entity - The accordion entity
 * @param sectionIndex - Index of the section to toggle
 *
 * @example
 * ```typescript
 * toggleSection(accordion, 0); // Toggle first section
 * ```
 */
export function toggleSection(entity: Entity, sectionIndex: number): void {
	const state = accordionStore.get(entity);
	if (!state) {
		return;
	}

	const section = state.sections[sectionIndex];
	if (!section) {
		return;
	}

	const newExpanded = !section.expanded;

	// If not allowing multiple, collapse other sections
	if (!state.allowMultiple && newExpanded) {
		state.sections.forEach((s, i) => {
			if (i !== sectionIndex && s.expanded) {
				s.expanded = false;
				setVisible(state.world, s.contentEntity, false);
				setContent(
					state.world,
					s.headerEntity,
					`${state.icons.collapsed} ${getHeaderTitle(s.headerEntity)}`,
				);
				state.expandedSections.delete(i);
			}
		});
	}

	// Toggle target section
	section.expanded = newExpanded;
	setVisible(state.world, section.contentEntity, newExpanded);
	setContent(
		state.world,
		section.headerEntity,
		`${newExpanded ? state.icons.expanded : state.icons.collapsed} ${getHeaderTitle(section.headerEntity)}`,
	);

	if (newExpanded) {
		state.expandedSections.add(sectionIndex);
	} else {
		state.expandedSections.delete(sectionIndex);
	}

	markDirty(state.world, entity);

	// Trigger callback
	section.onToggle?.(newExpanded);
}

/**
 * Expands an accordion section.
 *
 * @param entity - The accordion entity
 * @param sectionIndex - Index of the section to expand
 */
export function expandSection(entity: Entity, sectionIndex: number): void {
	const state = accordionStore.get(entity);
	if (!state) {
		return;
	}

	const section = state.sections[sectionIndex];
	if (!section || section.expanded) {
		return;
	}

	toggleSection(entity, sectionIndex);
}

/**
 * Expands all sections in an accordion.
 *
 * Only works if allowMultiple is true.
 *
 * @param entity - The accordion entity
 */
export function expandAllSections(entity: Entity): void {
	const state = accordionStore.get(entity);
	if (!state || !state.allowMultiple) {
		return;
	}

	state.sections.forEach((_, index) => {
		expandSection(entity, index);
	});
}

/**
 * Collapses all sections in an accordion.
 *
 * @param entity - The accordion entity
 */
export function collapseAllSections(entity: Entity): void {
	const state = accordionStore.get(entity);
	if (!state) {
		return;
	}

	state.sections.forEach((section, index) => {
		if (section.expanded) {
			toggleSection(entity, index);
		}
	});
}

/**
 * Gets the indices of all expanded sections.
 *
 * @param entity - The accordion entity
 * @returns Array of expanded section indices
 */
export function getExpandedSections(entity: Entity): readonly number[] {
	const state = accordionStore.get(entity);
	if (!state) {
		return [];
	}

	return Array.from(state.expandedSections);
}

// =============================================================================
// COLLAPSIBLE WIDGET
// =============================================================================

/**
 * Creates a collapsible header entity.
 * @internal
 */
function createCollapsibleHeader(
	world: World,
	parentEntity: Entity,
	title: string,
	expanded: boolean,
	icons: { expanded: string; collapsed: string },
	headerStyle: { fg?: string | number; bg?: string | number } | undefined,
): Entity {
	const headerEntity = addEntity(world);
	createBox(world, headerEntity);
	setPosition(world, headerEntity, 0, 0);
	setDimensions(world, headerEntity, 40, 1);
	setContent(world, headerEntity, `${expanded ? icons.expanded : icons.collapsed} ${title}`);
	setFocusable(world, headerEntity, { focusable: true });
	appendChild(world, parentEntity, headerEntity);

	headerTitleStore.set(headerEntity, title);
	setClickable(world, headerEntity, true);
	applyStyleColors(world, headerEntity, headerStyle);

	return headerEntity;
}

/**
 * Creates a collapsible content entity.
 * @internal
 */
function createCollapsibleContent(
	world: World,
	parentEntity: Entity,
	content: string | Entity | undefined,
	expanded: boolean,
	contentStyle: { fg?: string | number; bg?: string | number } | undefined,
): Entity {
	const contentEntity = addEntity(world);
	createBox(world, contentEntity);
	setPosition(world, contentEntity, 2, 1);
	setDimensions(world, contentEntity, 38, 3);
	setPadding(world, contentEntity, { left: 1, right: 1, top: 0, bottom: 0 });

	if (typeof content === 'string') {
		setContent(world, contentEntity, content);
	} else if (content !== undefined) {
		appendChild(world, contentEntity, content);
	}

	setVisible(world, contentEntity, expanded);
	appendChild(world, parentEntity, contentEntity);
	applyStyleColors(world, contentEntity, contentStyle);

	return contentEntity;
}

/**
 * Creates a single collapsible section widget.
 *
 * @param world - The ECS world
 * @param entity - The entity to attach the collapsible to
 * @param config - Collapsible configuration
 * @returns The collapsible entity
 *
 * @example
 * ```typescript
 * import { createCollapsible, createWorld, addEntity } from 'blecsd';
 *
 * const world = createWorld();
 * const collapsible = addEntity(world);
 * createCollapsible(world, collapsible, {
 *   title: 'Click to expand',
 *   content: 'Hidden content here',
 *   expanded: false
 * });
 * ```
 */
export function createCollapsible(world: World, entity: Entity, config: CollapsibleConfig): Entity {
	const expanded = config.expanded ?? false;
	const icons = {
		expanded: config.icons?.expanded ?? DEFAULT_EXPANDED_ICON,
		collapsed: config.icons?.collapsed ?? DEFAULT_COLLAPSED_ICON,
	};

	const headerEntity = createCollapsibleHeader(
		world,
		entity,
		config.title,
		expanded,
		icons,
		config.style?.header,
	);

	const contentEntity = createCollapsibleContent(
		world,
		entity,
		config.content,
		expanded,
		config.style?.content,
	);

	collapsibleStore.set(entity, {
		expanded,
		headerEntity,
		contentEntity,
		onToggle: config.onToggle,
		icons,
		world,
	});

	return entity;
}

/**
 * Toggles a collapsible widget's expanded state.
 *
 * @param entity - The collapsible entity
 *
 * @example
 * ```typescript
 * toggleCollapsible(collapsible);
 * ```
 */
export function toggleCollapsible(entity: Entity): void {
	const state = collapsibleStore.get(entity);
	if (!state) {
		return;
	}

	const newExpanded = !state.expanded;

	state.expanded = newExpanded;
	setVisible(state.world, state.contentEntity, newExpanded);
	setContent(
		state.world,
		state.headerEntity,
		`${newExpanded ? state.icons.expanded : state.icons.collapsed} ${getHeaderTitle(state.headerEntity)}`,
	);

	markDirty(state.world, entity);

	// Trigger callback
	state.onToggle?.(newExpanded);
}

/**
 * Checks if an entity is an accordion widget.
 *
 * @param entity - The entity to check
 * @returns True if the entity is an accordion
 */
export function isAccordion(entity: Entity): boolean {
	return accordionStore.has(entity);
}

/**
 * Checks if an entity is a collapsible widget.
 *
 * @param entity - The entity to check
 * @returns True if the entity is a collapsible
 */
export function isCollapsible(entity: Entity): boolean {
	return collapsibleStore.has(entity);
}

/**
 * Type guard for AccordionWidget.
 */
export function Accordion(entity: Entity, world: World): AccordionWidget | undefined {
	return isAccordion(entity) ? { entity, world } : undefined;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the title text for a header entity.
 */
function getHeaderTitle(headerEntity: Entity): string {
	return headerTitleStore.get(headerEntity) ?? '';
}
