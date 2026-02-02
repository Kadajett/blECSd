/**
 * Style inheritance system for cascading styles through the hierarchy.
 * Some style properties (like fg, bold) inherit from ancestors,
 * while others (like bg) are local to each element.
 * @module core/styleInheritance
 */

import { getAncestors, hasHierarchy } from '../components/hierarchy';
import { DEFAULT_FG, hasRenderable, Renderable, type StyleData } from '../components/renderable';
import type { Entity, World } from './types';

// =============================================================================
// INHERITANCE RULES
// =============================================================================

/**
 * Style properties that inherit from parent to child.
 * These cascade down the hierarchy if not explicitly set.
 *
 * - `fg`: Foreground color inherits (text color from parent)
 * - `bold`: Bold text inherits
 * - `underline`: Underline inherits
 * - `blink`: Blink inherits
 * - `inverse`: Inverse inherits
 *
 * Properties that do NOT inherit:
 * - `bg`: Background is local to each element
 * - `transparent`: Transparency is local
 */
export const INHERITING_PROPERTIES: ReadonlyArray<keyof StyleData> = [
	'fg',
	'bold',
	'underline',
	'blink',
	'inverse',
];

/**
 * Properties that do NOT inherit from parent.
 * These are always local to the element.
 */
export const NON_INHERITING_PROPERTIES: ReadonlyArray<keyof StyleData> = ['bg', 'transparent'];

// =============================================================================
// COMPUTED STYLE CACHE
// =============================================================================

/**
 * Cached computed style for an entity.
 */
interface CachedComputedStyle {
	/** The computed style */
	readonly style: StyleData;
	/** Timestamp when cache was created (for staleness checks) */
	readonly timestamp: number;
}

/**
 * Cache for computed (inherited) styles.
 * Maps entity IDs to their cached computed styles.
 */
const computedStyleCache = new Map<Entity, CachedComputedStyle>();

/**
 * Global generation counter for cache invalidation.
 * Incremented when any style changes to invalidate all caches.
 */
let cacheGeneration = 0;

/**
 * Gets the current cache generation.
 * @returns Current generation number
 */
export function getCacheGeneration(): number {
	return cacheGeneration;
}

/**
 * Invalidates the computed style cache for an entity and its descendants.
 * Call this when a style property changes.
 *
 * @param eid - The entity whose cache to invalidate
 *
 * @example
 * ```typescript
 * import { invalidateStyleCache, setStyle } from 'blecsd';
 *
 * // After changing style, invalidate cache
 * setStyle(world, entity, { fg: 0xff0000ff });
 * invalidateStyleCache(entity);
 * ```
 */
export function invalidateStyleCache(eid: Entity): void {
	computedStyleCache.delete(eid);
}

/**
 * Invalidates all computed style caches.
 * More efficient than invalidating individual entities when many change.
 *
 * @example
 * ```typescript
 * import { invalidateAllStyleCaches } from 'blecsd';
 *
 * // After bulk style changes
 * invalidateAllStyleCaches();
 * ```
 */
export function invalidateAllStyleCaches(): void {
	cacheGeneration++;
	computedStyleCache.clear();
}

/**
 * Clears the style cache.
 * Primarily for testing.
 */
export function clearStyleCache(): void {
	computedStyleCache.clear();
}

/**
 * Checks if an entity has a valid cached computed style.
 *
 * @param eid - The entity ID
 * @returns true if valid cache exists
 */
export function hasValidStyleCache(eid: Entity): boolean {
	const cached = computedStyleCache.get(eid);
	return cached !== undefined && cached.timestamp === cacheGeneration;
}

// =============================================================================
// STYLE READING
// =============================================================================

/**
 * Gets the local (non-inherited) style of an entity.
 * Returns default values if entity has no Renderable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity's local style
 */
export function getLocalStyle(world: World, eid: Entity): StyleData {
	if (!hasRenderable(world, eid)) {
		return getDefaultStyle();
	}

	return {
		fg: Renderable.fg[eid] as number,
		bg: Renderable.bg[eid] as number,
		bold: Renderable.bold[eid] === 1,
		underline: Renderable.underline[eid] === 1,
		blink: Renderable.blink[eid] === 1,
		inverse: Renderable.inverse[eid] === 1,
		transparent: Renderable.transparent[eid] === 1,
	};
}

/**
 * Gets the default style (used when no style is set).
 *
 * @returns Default style data
 */
export function getDefaultStyle(): StyleData {
	return {
		fg: DEFAULT_FG,
		bg: 0,
		bold: false,
		underline: false,
		blink: false,
		inverse: false,
		transparent: false,
	};
}

// =============================================================================
// STYLE MERGING
// =============================================================================

/**
 * Merges a parent style into a child style.
 * Inheriting properties from parent are used if child hasn't set them.
 * Non-inheriting properties always use the child's value.
 *
 * @param parent - The parent's computed style
 * @param child - The child's local style
 * @returns Merged style with inheritance applied
 *
 * @example
 * ```typescript
 * import { mergeStyles } from 'blecsd';
 *
 * const parentStyle = { fg: 0xff0000ff, bold: true, bg: 0x000000ff };
 * const childStyle = { fg: 0x00ff00ff, bold: false, bg: 0x111111ff };
 *
 * const merged = mergeStyles(parentStyle, childStyle);
 * // merged.fg = 0x00ff00ff (child overrides)
 * // merged.bold = false (child overrides)
 * // merged.bg = 0x111111ff (bg doesn't inherit, uses child)
 * ```
 */
export function mergeStyles(parent: StyleData, child: StyleData): StyleData {
	return {
		// Inheriting properties: use child if set, otherwise inherit from parent
		fg: child.fg !== DEFAULT_FG ? child.fg : parent.fg,
		bold: child.bold || parent.bold,
		underline: child.underline || parent.underline,
		blink: child.blink || parent.blink,
		inverse: child.inverse || parent.inverse,
		// Non-inheriting properties: always use child
		bg: child.bg,
		transparent: child.transparent,
	};
}

/**
 * Checks if a color is the default (unset) color.
 *
 * @param color - The color to check
 * @returns true if the color is the default
 */
export function isDefaultColor(color: number): boolean {
	return color === DEFAULT_FG || color === 0;
}

// =============================================================================
// COMPUTED STYLE
// =============================================================================

/**
 * Computes the inherited style for an entity by walking up the hierarchy.
 * Caches the result for efficiency.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The computed style with inheritance applied
 *
 * @example
 * ```typescript
 * import { computeInheritedStyle, setStyle, appendChild } from 'blecsd';
 *
 * // Parent has red foreground
 * setStyle(world, parent, { fg: 0xff0000ff });
 *
 * // Child has no foreground set
 * appendChild(world, parent, child);
 *
 * const childStyle = computeInheritedStyle(world, child);
 * // childStyle.fg === 0xff0000ff (inherited from parent)
 * ```
 */
export function computeInheritedStyle(world: World, eid: Entity): StyleData {
	// Check cache first
	const cached = computedStyleCache.get(eid);
	if (cached !== undefined && cached.timestamp === cacheGeneration) {
		return cached.style;
	}

	// Get local style
	const localStyle = getLocalStyle(world, eid);

	// If no hierarchy, return local style
	if (!hasHierarchy(world, eid)) {
		cacheComputedStyle(eid, localStyle);
		return localStyle;
	}

	// Get ancestors and compute inherited style
	const ancestors = getAncestors(world, eid);
	if (ancestors.length === 0) {
		cacheComputedStyle(eid, localStyle);
		return localStyle;
	}

	// Start from the topmost ancestor and merge down
	const computedStyle = computeStyleChain(world, ancestors, localStyle);
	cacheComputedStyle(eid, computedStyle);
	return computedStyle;
}

/**
 * Computes the style by merging from ancestors down to the local style.
 */
function computeStyleChain(world: World, ancestors: Entity[], localStyle: StyleData): StyleData {
	// Start with root ancestor's style
	let currentStyle = getLocalStyle(world, ancestors[ancestors.length - 1] as Entity);

	// Merge down through ancestors (from root toward entity)
	for (let i = ancestors.length - 2; i >= 0; i--) {
		const ancestorStyle = getLocalStyle(world, ancestors[i] as Entity);
		currentStyle = mergeStyles(currentStyle, ancestorStyle);
	}

	// Finally merge with local style
	return mergeStyles(currentStyle, localStyle);
}

/**
 * Caches a computed style for an entity.
 */
function cacheComputedStyle(eid: Entity, style: StyleData): void {
	computedStyleCache.set(eid, {
		style,
		timestamp: cacheGeneration,
	});
}

/**
 * Resolves the final style for an entity.
 * This is an alias for computeInheritedStyle for clearer semantics.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The resolved style with inheritance applied
 *
 * @example
 * ```typescript
 * import { resolveStyle, colorToHex } from 'blecsd';
 *
 * const style = resolveStyle(world, entity);
 * console.log(`Foreground: ${colorToHex(style.fg)}`);
 * ```
 */
export function resolveStyle(world: World, eid: Entity): StyleData {
	return computeInheritedStyle(world, eid);
}

// =============================================================================
// INHERITANCE QUERIES
// =============================================================================

/**
 * Checks if a style property inherits from parent.
 *
 * @param property - The property name
 * @returns true if the property inherits
 *
 * @example
 * ```typescript
 * import { doesPropertyInherit } from 'blecsd';
 *
 * doesPropertyInherit('fg');    // true
 * doesPropertyInherit('bold');  // true
 * doesPropertyInherit('bg');    // false
 * ```
 */
export function doesPropertyInherit(property: keyof StyleData): boolean {
	return (INHERITING_PROPERTIES as readonly string[]).includes(property);
}

/**
 * Gets the value of an inherited property for an entity.
 * Walks up the hierarchy to find the first ancestor with a non-default value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param property - The property name
 * @returns The inherited value
 *
 * @example
 * ```typescript
 * import { getInheritedProperty } from 'blecsd';
 *
 * const fg = getInheritedProperty(world, entity, 'fg');
 * ```
 */
export function getInheritedProperty<K extends keyof StyleData>(
	world: World,
	eid: Entity,
	property: K,
): StyleData[K] {
	const style = computeInheritedStyle(world, eid);
	return style[property];
}

/**
 * Gets the nearest ancestor with a non-default value for a property.
 * Returns the entity itself if it has a non-default value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param property - The property name
 * @returns The ancestor entity ID or 0 if no ancestor has the property set
 *
 * @example
 * ```typescript
 * import { findPropertySource } from 'blecsd';
 *
 * const source = findPropertySource(world, entity, 'fg');
 * if (source !== 0) {
 *   console.log(`Color inherited from entity ${source}`);
 * }
 * ```
 */
export function findPropertySource(world: World, eid: Entity, property: keyof StyleData): Entity {
	// Check self first
	const localStyle = getLocalStyle(world, eid);
	if (hasNonDefaultValue(localStyle, property)) {
		return eid;
	}

	// Check ancestors
	if (!hasHierarchy(world, eid)) {
		return 0 as Entity;
	}

	const ancestors = getAncestors(world, eid);
	for (const ancestor of ancestors) {
		const style = getLocalStyle(world, ancestor);
		if (hasNonDefaultValue(style, property)) {
			return ancestor;
		}
	}

	return 0 as Entity;
}

/**
 * Checks if a style has a non-default value for a property.
 */
function hasNonDefaultValue(style: StyleData, property: keyof StyleData): boolean {
	const defaultStyle = getDefaultStyle();

	switch (property) {
		case 'fg':
			return style.fg !== defaultStyle.fg;
		case 'bg':
			return style.bg !== defaultStyle.bg;
		case 'bold':
			return style.bold !== defaultStyle.bold;
		case 'underline':
			return style.underline !== defaultStyle.underline;
		case 'blink':
			return style.blink !== defaultStyle.blink;
		case 'inverse':
			return style.inverse !== defaultStyle.inverse;
		case 'transparent':
			return style.transparent !== defaultStyle.transparent;
		default:
			return false;
	}
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Precomputes inherited styles for all entities in an array.
 * Useful for batch processing before rendering.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs
 *
 * @example
 * ```typescript
 * import { precomputeStyles, getAllEntities } from 'blecsd';
 *
 * const entities = getAllEntities(world);
 * precomputeStyles(world, entities);
 *
 * // Now all styles are cached for fast access
 * ```
 */
export function precomputeStyles(world: World, entities: readonly Entity[]): void {
	for (const eid of entities) {
		computeInheritedStyle(world, eid);
	}
}

/**
 * Gets all computed styles for entities.
 * More efficient than calling resolveStyle individually.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs
 * @returns Map of entity IDs to computed styles
 *
 * @example
 * ```typescript
 * import { getComputedStyles } from 'blecsd';
 *
 * const styles = getComputedStyles(world, [entity1, entity2]);
 * const style1 = styles.get(entity1);
 * ```
 */
export function getComputedStyles(
	world: World,
	entities: readonly Entity[],
): Map<Entity, StyleData> {
	const result = new Map<Entity, StyleData>();
	for (const eid of entities) {
		result.set(eid, computeInheritedStyle(world, eid));
	}
	return result;
}
