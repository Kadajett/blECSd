/**
 * Tests for ECS inspector utilities.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Dimensions, setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { addEntity, createWorld, removeEntity } from '../core/ecs';
import type { World } from '../core/types';
import {
	dumpEntity,
	dumpWorld,
	findEntitiesWithComponent,
	findEntitiesWithComponents,
	getComponentField,
	inspectEntity,
	inspectWorld,
	isEntityActive,
	listEntities,
	listEntityComponents,
} from './ecsInspector';

describe('ecsInspector', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
	});

	// =============================================================================
	// ENTITY INSPECTION
	// =============================================================================

	describe('inspectEntity', () => {
		it('should return entity inspection data', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 40, 10);

			const info = inspectEntity(world, eid);

			expect(info.entity).toBe(eid);
			expect(info.components.length).toBeGreaterThan(0);
			expect(info.components.some((c) => c.name === 'Position')).toBe(true);
			expect(info.components.some((c) => c.name === 'Dimensions')).toBe(true);
		});

		it('should include component data', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);

			const info = inspectEntity(world, eid);
			const posComp = info.components.find((c) => c.name === 'Position');

			expect(posComp).toBeDefined();
			expect(posComp?.data.x).toBe(10);
			expect(posComp?.data.y).toBe(20);
		});

		it('should return empty components for entity with no components', () => {
			const eid = addEntity(world);

			const info = inspectEntity(world, eid);

			expect(info.entity).toBe(eid);
			expect(info.components.length).toBe(0);
		});
	});

	// =============================================================================
	// WORLD INSPECTION
	// =============================================================================

	describe('inspectWorld', () => {
		it('should return world statistics', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			setPosition(world, eid1, 0, 0);
			setPosition(world, eid2, 10, 10);

			const info = inspectWorld(world);

			expect(info.entityCount).toBe(2);
			expect(info.componentCounts.Position).toBe(2);
		});

		it('should count different component types', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			setPosition(world, eid1, 0, 0);
			setDimensions(world, eid1, 10, 10);
			setPosition(world, eid2, 5, 5);

			const info = inspectWorld(world);

			expect(info.componentCounts.Position).toBe(2);
			expect(info.componentCounts.Dimensions).toBe(1);
		});

		it('should handle empty world', () => {
			const info = inspectWorld(world);

			expect(info.entityCount).toBe(0);
			expect(Object.values(info.componentCounts).every((c) => c === 0)).toBe(true);
		});
	});

	// =============================================================================
	// FORMATTED OUTPUT
	// =============================================================================

	describe('dumpEntity', () => {
		it('should return formatted entity string', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);

			const dump = dumpEntity(world, eid);

			expect(dump).toContain('Entity');
			expect(dump).toContain('Position');
			expect(dump).toContain('10');
			expect(dump).toContain('20');
		});

		it('should include component tree structure', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);
			setDimensions(world, eid, 40, 10);

			const dump = dumpEntity(world, eid);

			expect(dump).toContain('├─');
			expect(dump).toContain('Position');
			expect(dump).toContain('Dimensions');
		});
	});

	describe('dumpWorld', () => {
		it('should return formatted world statistics', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			setPosition(world, eid1, 0, 0);
			setPosition(world, eid2, 10, 10);

			const dump = dumpWorld(world);

			expect(dump).toContain('World Statistics');
			expect(dump).toContain('Entities: 2');
			expect(dump).toContain('Position: 2');
		});

		it('should show component counts', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 10, 10);

			const dump = dumpWorld(world);

			expect(dump).toContain('Position:');
			expect(dump).toContain('Dimensions:');
		});
	});

	// =============================================================================
	// ENTITY QUERIES
	// =============================================================================

	describe('listEntities', () => {
		it('should return all entity IDs', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			const entities = listEntities(world);

			expect(entities).toContain(eid1);
			expect(entities).toContain(eid2);
			expect(entities).toContain(eid3);
			expect(entities.length).toBe(3);
		});

		it('should return empty array for empty world', () => {
			const entities = listEntities(world);

			expect(entities.length).toBe(0);
		});

		it('should not include removed entities', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			removeEntity(world, eid1);

			const entities = listEntities(world);

			expect(entities).not.toContain(eid1);
			expect(entities).toContain(eid2);
			expect(entities.length).toBe(1);
		});
	});

	describe('findEntitiesWithComponent', () => {
		it('should find entities with specific component', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);
			setPosition(world, eid1, 0, 0);
			setPosition(world, eid2, 10, 10);

			const entities = findEntitiesWithComponent(world, Position);

			expect(entities).toContain(eid1);
			expect(entities).toContain(eid2);
			expect(entities).not.toContain(eid3);
			expect(entities.length).toBe(2);
		});

		it('should return empty array when no entities have component', () => {
			addEntity(world);
			addEntity(world);

			const entities = findEntitiesWithComponent(world, Position);

			expect(entities.length).toBe(0);
		});
	});

	describe('findEntitiesWithComponents', () => {
		it('should find entities with all specified components', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);
			setPosition(world, eid1, 0, 0);
			setDimensions(world, eid1, 10, 10);
			setPosition(world, eid2, 5, 5);

			const entities = findEntitiesWithComponents(world, [Position, Dimensions]);

			expect(entities).toContain(eid1);
			expect(entities).not.toContain(eid2);
			expect(entities).not.toContain(eid3);
			expect(entities.length).toBe(1);
		});

		it('should return empty array for empty component list', () => {
			addEntity(world);

			const entities = findEntitiesWithComponents(world, []);

			expect(entities.length).toBe(0);
		});

		it('should work with single component', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			setPosition(world, eid1, 0, 0);

			const entities = findEntitiesWithComponents(world, [Position]);

			expect(entities).toContain(eid1);
			expect(entities).not.toContain(eid2);
		});
	});

	describe('isEntityActive', () => {
		it('should return true for existing entity', () => {
			const eid = addEntity(world);

			expect(isEntityActive(world, eid)).toBe(true);
		});

		it('should return false for removed entity', () => {
			const eid = addEntity(world);
			removeEntity(world, eid);

			expect(isEntityActive(world, eid)).toBe(false);
		});

		it('should return false for non-existent entity', () => {
			expect(isEntityActive(world, 999 as never)).toBe(false);
		});
	});

	describe('listEntityComponents', () => {
		it('should list component names', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 10, 10);

			const components = listEntityComponents(world, eid);

			expect(components).toContain('Position');
			expect(components).toContain('Dimensions');
		});

		it('should return empty array for entity with no components', () => {
			const eid = addEntity(world);

			const components = listEntityComponents(world, eid);

			expect(components.length).toBe(0);
		});
	});

	describe('getComponentField', () => {
		it('should get component field value', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);

			const x = getComponentField(world, eid, Position, 'x');
			const y = getComponentField(world, eid, Position, 'y');

			expect(x).toBe(10);
			expect(y).toBe(20);
		});

		it('should return undefined for entity without component', () => {
			const eid = addEntity(world);

			const x = getComponentField(world, eid, Position, 'x');

			expect(x).toBeUndefined();
		});

		it('should return undefined for non-existent field', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 20);

			const value = getComponentField(world, eid, Position, 'nonexistent');

			expect(value).toBeUndefined();
		});

		it('should work with different component types', () => {
			const eid = addEntity(world);
			setDimensions(world, eid, 40, 10);

			const width = getComponentField(world, eid, Dimensions, 'width');
			const height = getComponentField(world, eid, Dimensions, 'height');

			expect(width).toBe(40);
			expect(height).toBe(10);
		});

		it('should work with numeric values', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 100, 200);
			setDimensions(world, eid, 50, 75);

			const x = getComponentField(world, eid, Position, 'x');
			const width = getComponentField(world, eid, Dimensions, 'width');

			expect(x).toBe(100);
			expect(width).toBe(50);
		});
	});

	// =============================================================================
	// INTEGRATION TESTS
	// =============================================================================

	describe('integration', () => {
		it('should work together for debugging workflow', () => {
			// Create some entities
			const box1 = addEntity(world);
			setPosition(world, box1, 10, 20);
			setDimensions(world, box1, 40, 10);

			const box2 = addEntity(world);
			setPosition(world, box2, 50, 30);

			// List all entities
			const entities = listEntities(world);
			expect(entities.length).toBe(2);

			// Find entities with Position
			const positioned = findEntitiesWithComponent(world, Position);
			expect(positioned.length).toBe(2);

			// Find entities with both Position and Dimensions
			const boxes = findEntitiesWithComponents(world, [Position, Dimensions]);
			expect(boxes.length).toBe(1);

			// Inspect specific entity
			const info = inspectEntity(world, box1);
			expect(info.components.length).toBe(2);

			// Get component field
			const x = getComponentField(world, box1, Position, 'x');
			expect(x).toBe(10);

			// Dump entity
			const dump = dumpEntity(world, box1);
			expect(dump).toContain('Position');
			expect(dump).toContain('Dimensions');

			// Inspect world
			const worldInfo = inspectWorld(world);
			expect(worldInfo.entityCount).toBe(2);
		});

		it('should handle entity lifecycle', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			// Entity exists
			expect(isEntityActive(world, eid)).toBe(true);
			expect(listEntities(world)).toContain(eid);

			// Remove entity
			removeEntity(world, eid);

			// Entity no longer exists
			expect(isEntityActive(world, eid)).toBe(false);
			expect(listEntities(world)).not.toContain(eid);
		});
	});
});
