/**
 * Theme application to entities
 * @module style/theme/application
 */

import { markDirty, Renderable, setStyle } from '../../components/renderable';
import { hasComponent, query } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { getActiveTheme } from './registry';

/**
 * Applies the active theme to an entity.
 * Adds Renderable component if not present.
 *
 * @param world - The ECS world
 * @param eid - Entity to apply theme to
 *
 * @example
 * ```typescript
 * const entity = addEntity(world);
 * applyTheme(world, entity);
 * ```
 */
export function applyTheme(world: World, eid: Entity): void {
	const theme = getActiveTheme(world);

	setStyle(world, eid, {
		fg: theme.colors.foreground,
		bg: theme.colors.background,
	});

	markDirty(world, eid);
}

/**
 * Applies the active theme to all entities with Renderable components.
 * Useful when switching themes at runtime.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * setActiveTheme(world, 'dark');
 * applyThemeToAll(world);
 * ```
 */
export function applyThemeToAll(world: World): void {
	const theme = getActiveTheme(world);
	const entities = query(world, [Renderable]) as Entity[];

	for (const eid of entities) {
		if (!hasComponent(world, eid, Renderable)) {
			continue;
		}

		Renderable.fg[eid] = theme.colors.foreground;
		Renderable.bg[eid] = theme.colors.background;
		Renderable.dirty[eid] = 1;
	}
}
