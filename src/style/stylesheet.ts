/**
 * CSS-like Stylesheet System
 *
 * Provides a declarative styling system with selectors, cascading specificity,
 * and style rule application. Supports selectors by widget tag (type), user-assigned
 * class tags (stored in UserData), and entity ID.
 *
 * Specificity cascade: tag < class < id (matching CSS specificity model).
 *
 * @module style/stylesheet
 *
 * @example
 * ```typescript
 * import { createStylesheet, addRule, applyStylesheet, createWorld, addEntity } from 'blecsd';
 *
 * const world = createWorld();
 * const sheet = createStylesheet('main');
 *
 * // Add rules with different specificity
 * addRule(sheet, { selector: { tag: 'button' }, style: { fg: '#ffffff', bg: '#0066cc' } });
 * addRule(sheet, { selector: { className: 'danger' }, style: { bg: '#cc0000' } });
 * addRule(sheet, { selector: { entityId: 42 }, style: { bold: true } });
 *
 * applyStylesheet(world, sheet);
 * ```
 */

import { z } from 'zod';
import { markDirty, Renderable, setStyle } from '../components/renderable';
import { getUserData, hasUserData } from '../components/userData';
import { getAllEntities, hasComponent } from '../core/ecs';
import { getEntityData } from '../core/entityData';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Style properties that can be set by stylesheet rules.
 * Maps directly to Renderable component properties.
 */
export interface StyleProperties {
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number | undefined;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number | undefined;
	/** Bold text */
	readonly bold?: boolean | undefined;
	/** Underlined text */
	readonly underline?: boolean | undefined;
	/** Blinking text */
	readonly blink?: boolean | undefined;
	/** Inverse colors */
	readonly inverse?: boolean | undefined;
	/** Transparent background */
	readonly transparent?: boolean | undefined;
	/** Opacity (0-1) */
	readonly opacity?: number | undefined;
}

/**
 * Selector for matching entities.
 * Multiple fields combine with AND logic (all must match).
 */
export interface StyleSelector {
	/** Match by widget tag/type name (lowest specificity) */
	readonly tag?: string | undefined;
	/** Match by user-assigned class name (medium specificity) */
	readonly className?: string | undefined;
	/** Match by exact entity ID (highest specificity) */
	readonly entityId?: number | undefined;
}

/**
 * A single style rule combining a selector and style properties.
 */
export interface StyleRule {
	/** Selector for matching entities */
	readonly selector: StyleSelector;
	/** Style properties to apply to matched entities */
	readonly style: StyleProperties;
	/** Optional priority override (higher wins when specificity ties, default: 0) */
	readonly priority?: number | undefined;
}

/**
 * A stylesheet containing named rules.
 */
export interface Stylesheet {
	/** Stylesheet name */
	readonly name: string;
	/** Ordered list of style rules */
	readonly rules: StyleRule[];
}

/**
 * Result of applying a stylesheet to a world.
 */
export interface ApplyResult {
	/** Number of entities that had styles applied */
	readonly entitiesStyled: number;
	/** Number of rules that matched at least one entity */
	readonly rulesMatched: number;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for StyleProperties.
 *
 * @example
 * ```typescript
 * import { StylePropertiesSchema } from 'blecsd';
 *
 * const style = StylePropertiesSchema.parse({
 *   fg: '#ff0000',
 *   bold: true,
 * });
 * ```
 */
export const StylePropertiesSchema = z.object({
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	bold: z.boolean().optional(),
	underline: z.boolean().optional(),
	blink: z.boolean().optional(),
	inverse: z.boolean().optional(),
	transparent: z.boolean().optional(),
	opacity: z.number().min(0).max(1).optional(),
});

/**
 * Zod schema for StyleSelector.
 *
 * @example
 * ```typescript
 * import { StyleSelectorSchema } from 'blecsd';
 *
 * const selector = StyleSelectorSchema.parse({
 *   tag: 'button',
 *   className: 'primary',
 * });
 * ```
 */
export const StyleSelectorSchema = z
	.object({
		tag: z.string().optional(),
		className: z.string().optional(),
		entityId: z.number().int().nonnegative().optional(),
	})
	.refine((s) => s.tag !== undefined || s.className !== undefined || s.entityId !== undefined, {
		message: 'Selector must have at least one of: tag, className, entityId',
	});

/**
 * Zod schema for StyleRule.
 *
 * @example
 * ```typescript
 * import { StyleRuleSchema } from 'blecsd';
 *
 * const rule = StyleRuleSchema.parse({
 *   selector: { tag: 'box' },
 *   style: { bg: '#333333' },
 * });
 * ```
 */
export const StyleRuleSchema = z.object({
	selector: StyleSelectorSchema,
	style: StylePropertiesSchema,
	priority: z.number().int().optional(),
});

/**
 * Zod schema for Stylesheet.
 *
 * @example
 * ```typescript
 * import { StylesheetSchema } from 'blecsd';
 *
 * const sheet = StylesheetSchema.parse({
 *   name: 'main',
 *   rules: [{ selector: { tag: 'box' }, style: { bg: '#111' } }],
 * });
 * ```
 */
export const StylesheetSchema = z.object({
	name: z.string().min(1),
	rules: z.array(StyleRuleSchema),
});

// =============================================================================
// SPECIFICITY CALCULATION
// =============================================================================

/**
 * Specificity weights for selector types.
 * Following CSS-like specificity: tag(1) < class(10) < id(100).
 */
const SPECIFICITY_TAG = 1;
const SPECIFICITY_CLASS = 10;
const SPECIFICITY_ID = 100;

/**
 * Calculates the specificity score for a selector.
 * Higher scores take priority in cascading.
 *
 * @param selector - The style selector
 * @returns Specificity score
 *
 * @example
 * ```typescript
 * import { calculateSpecificity } from 'blecsd';
 *
 * calculateSpecificity({ tag: 'box' });           // 1
 * calculateSpecificity({ className: 'primary' }); // 10
 * calculateSpecificity({ entityId: 42 });          // 100
 * calculateSpecificity({ tag: 'box', className: 'primary' }); // 11
 * ```
 */
export function calculateSpecificity(selector: StyleSelector): number {
	let score = 0;
	if (selector.tag !== undefined) score += SPECIFICITY_TAG;
	if (selector.className !== undefined) score += SPECIFICITY_CLASS;
	if (selector.entityId !== undefined) score += SPECIFICITY_ID;
	return score;
}

// =============================================================================
// ENTITY MATCHING
// =============================================================================

/**
 * Gets the widget tag for an entity.
 * Checks userData 'tag' field first (world-aware), then entityData 'widgetTag' key.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The widget tag or undefined
 */
function getEntityTag(world: World, eid: Entity): string | undefined {
	// Check userData first (world-aware via hasComponent)
	if (hasUserData(world, eid)) {
		const data = getUserData(world, eid);
		if (data && typeof data.tag === 'string') {
			return data.tag;
		}
	}

	// Fall back to entityData (global, not world-aware)
	const tag = getEntityData<string | undefined>(eid, 'widgetTag', undefined);
	if (tag !== undefined) {
		return tag;
	}

	return undefined;
}

/**
 * Gets the class names for an entity.
 * Checks userData 'classes' field first (world-aware), then entityData 'styleClasses' key.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Array of class names
 */
function getEntityClasses(world: World, eid: Entity): readonly string[] {
	// Check userData first (world-aware via hasComponent)
	if (hasUserData(world, eid)) {
		const data = getUserData(world, eid);
		if (data && Array.isArray(data.classes)) {
			return data.classes as string[];
		}
	}

	// Fall back to entityData (global, not world-aware)
	const classes = getEntityData<readonly string[] | undefined>(eid, 'styleClasses', undefined);
	if (classes !== undefined && Array.isArray(classes)) {
		return classes;
	}

	return [];
}

/**
 * Checks if an entity matches a selector.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param selector - The selector to match against
 * @returns true if the entity matches all selector criteria
 *
 * @example
 * ```typescript
 * import { matchesSelector, createWorld, addEntity } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 * // After setting entity tag and classes...
 * const matches = matchesSelector(world, eid, { tag: 'button' });
 * ```
 */
export function matchesSelector(world: World, eid: Entity, selector: StyleSelector): boolean {
	// Check entityId match
	if (selector.entityId !== undefined && eid !== selector.entityId) {
		return false;
	}

	// Check tag match
	if (selector.tag !== undefined) {
		const entityTag = getEntityTag(world, eid);
		if (entityTag !== selector.tag) {
			return false;
		}
	}

	// Check className match
	if (selector.className !== undefined) {
		const classes = getEntityClasses(world, eid);
		if (!classes.includes(selector.className)) {
			return false;
		}
	}

	return true;
}

// =============================================================================
// STYLESHEET CREATION & MANIPULATION
// =============================================================================

/**
 * Creates a new empty stylesheet.
 *
 * @param name - Stylesheet name
 * @returns A new Stylesheet
 *
 * @example
 * ```typescript
 * import { createStylesheet } from 'blecsd';
 *
 * const sheet = createStylesheet('theme');
 * ```
 */
export function createStylesheet(name: string): Stylesheet {
	return { name, rules: [] };
}

/**
 * Adds a rule to a stylesheet. Returns a new stylesheet with the rule added.
 *
 * @param sheet - The stylesheet to add to
 * @param rule - The rule to add
 * @returns A new stylesheet with the rule added
 *
 * @example
 * ```typescript
 * import { createStylesheet, addRule } from 'blecsd';
 *
 * let sheet = createStylesheet('main');
 * sheet = addRule(sheet, {
 *   selector: { tag: 'button' },
 *   style: { fg: '#ffffff', bg: '#0066cc' },
 * });
 * ```
 */
export function addRule(sheet: Stylesheet, rule: StyleRule): Stylesheet {
	StyleRuleSchema.parse(rule);
	return {
		...sheet,
		rules: [...sheet.rules, rule],
	};
}

/**
 * Removes all rules matching a predicate. Returns a new stylesheet.
 *
 * @param sheet - The stylesheet to filter
 * @param predicate - Function returning true for rules to remove
 * @returns A new stylesheet with matching rules removed
 *
 * @example
 * ```typescript
 * import { createStylesheet, addRule, removeRules } from 'blecsd';
 *
 * let sheet = createStylesheet('main');
 * sheet = addRule(sheet, { selector: { tag: 'box' }, style: { bg: '#111' } });
 * sheet = removeRules(sheet, (rule) => rule.selector.tag === 'box');
 * ```
 */
export function removeRules(
	sheet: Stylesheet,
	predicate: (rule: StyleRule) => boolean,
): Stylesheet {
	return {
		...sheet,
		rules: sheet.rules.filter((rule) => !predicate(rule)),
	};
}

/**
 * Clears all rules from a stylesheet. Returns a new empty stylesheet.
 *
 * @param sheet - The stylesheet to clear
 * @returns A new stylesheet with no rules
 *
 * @example
 * ```typescript
 * import { clearRules } from 'blecsd';
 *
 * const emptySheet = clearRules(sheet);
 * ```
 */
export function clearRules(sheet: Stylesheet): Stylesheet {
	return { ...sheet, rules: [] };
}

// =============================================================================
// STYLE MERGING
// =============================================================================

/**
 * Represents a style with its specificity for cascading.
 */
interface WeightedStyle {
	readonly style: StyleProperties;
	readonly specificity: number;
	readonly priority: number;
	readonly order: number;
}

/**
 * Assigns defined properties from source style onto target object.
 * @internal
 */
function assignDefinedProps(target: Record<string, unknown>, source: StyleProperties): void {
	if (source.fg !== undefined) target.fg = source.fg;
	if (source.bg !== undefined) target.bg = source.bg;
	if (source.bold !== undefined) target.bold = source.bold;
	if (source.underline !== undefined) target.underline = source.underline;
	if (source.blink !== undefined) target.blink = source.blink;
	if (source.inverse !== undefined) target.inverse = source.inverse;
	if (source.transparent !== undefined) target.transparent = source.transparent;
	if (source.opacity !== undefined) target.opacity = source.opacity;
}

/**
 * Merges multiple style properties in specificity order.
 * Higher specificity overrides lower. On equal specificity, priority wins.
 * On equal specificity and priority, later rules win.
 *
 * @param styles - Weighted styles to merge
 * @returns Merged style properties
 */
function mergeWeightedStyles(styles: readonly WeightedStyle[]): StyleProperties {
	const sorted = [...styles].sort((a, b) => {
		if (a.specificity !== b.specificity) return a.specificity - b.specificity;
		if (a.priority !== b.priority) return a.priority - b.priority;
		return a.order - b.order;
	});

	const merged: Record<string, unknown> = {};
	for (const entry of sorted) {
		assignDefinedProps(merged, entry.style);
	}

	return merged as StyleProperties;
}

// =============================================================================
// STYLESHEET APPLICATION
// =============================================================================

/**
 * Applies a stylesheet to all entities in the world.
 * For each entity with a Renderable component, evaluates all rules,
 * cascades by specificity, and applies the merged style.
 *
 * @param world - The ECS world
 * @param sheet - The stylesheet to apply
 * @returns Result with counts of entities styled and rules matched
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, createStylesheet, addRule, applyStylesheet } from 'blecsd';
 *
 * const world = createWorld();
 * let sheet = createStylesheet('main');
 * sheet = addRule(sheet, { selector: { tag: 'box' }, style: { bg: '#111' } });
 *
 * const result = applyStylesheet(world, sheet);
 * console.log(`Styled ${result.entitiesStyled} entities`);
 * ```
 */
export function applyStylesheet(world: World, sheet: Stylesheet): ApplyResult {
	const entities = getAllEntities(world);
	let entitiesStyled = 0;
	const matchedRuleIndices = new Set<number>();

	for (const eid of entities) {
		if (!hasComponent(world, eid, Renderable)) {
			continue;
		}

		const matchingStyles: WeightedStyle[] = [];

		for (let i = 0; i < sheet.rules.length; i++) {
			const rule = sheet.rules[i];
			if (!rule) continue;

			if (matchesSelector(world, eid, rule.selector)) {
				matchedRuleIndices.add(i);
				matchingStyles.push({
					style: rule.style,
					specificity: calculateSpecificity(rule.selector),
					priority: rule.priority ?? 0,
					order: i,
				});
			}
		}

		if (matchingStyles.length === 0) {
			continue;
		}

		const merged = mergeWeightedStyles(matchingStyles);
		setStyle(world, eid, merged);
		markDirty(world, eid);
		entitiesStyled++;
	}

	return {
		entitiesStyled,
		rulesMatched: matchedRuleIndices.size,
	};
}

/**
 * Applies a stylesheet to a single entity.
 * Useful when a new entity is created and needs styling.
 *
 * @param world - The ECS world
 * @param eid - The entity to style
 * @param sheet - The stylesheet to apply
 * @returns true if any rules matched and styles were applied
 *
 * @example
 * ```typescript
 * import { applyStylesheetToEntity, createStylesheet, addRule } from 'blecsd';
 *
 * const styled = applyStylesheetToEntity(world, newEntity, sheet);
 * ```
 */
export function applyStylesheetToEntity(world: World, eid: Entity, sheet: Stylesheet): boolean {
	if (!hasComponent(world, eid, Renderable)) {
		return false;
	}

	const matchingStyles: WeightedStyle[] = [];

	for (let i = 0; i < sheet.rules.length; i++) {
		const rule = sheet.rules[i];
		if (!rule) continue;

		if (matchesSelector(world, eid, rule.selector)) {
			matchingStyles.push({
				style: rule.style,
				specificity: calculateSpecificity(rule.selector),
				priority: rule.priority ?? 0,
				order: i,
			});
		}
	}

	if (matchingStyles.length === 0) {
		return false;
	}

	const merged = mergeWeightedStyles(matchingStyles);
	setStyle(world, eid, merged);
	markDirty(world, eid);
	return true;
}

/**
 * Gets all matching rules for an entity without applying them.
 * Useful for debugging or inspecting which rules would apply.
 *
 * @param world - The ECS world
 * @param eid - The entity to check
 * @param sheet - The stylesheet to evaluate
 * @returns Array of matching rules with their specificity scores
 *
 * @example
 * ```typescript
 * import { getMatchingRules } from 'blecsd';
 *
 * const matches = getMatchingRules(world, entity, sheet);
 * for (const { rule, specificity } of matches) {
 *   console.log(`Rule matches with specificity ${specificity}`);
 * }
 * ```
 */
export function getMatchingRules(
	world: World,
	eid: Entity,
	sheet: Stylesheet,
): ReadonlyArray<{ readonly rule: StyleRule; readonly specificity: number }> {
	const matches: Array<{ readonly rule: StyleRule; readonly specificity: number }> = [];

	for (const rule of sheet.rules) {
		if (matchesSelector(world, eid, rule.selector)) {
			matches.push({
				rule,
				specificity: calculateSpecificity(rule.selector),
			});
		}
	}

	return matches;
}
