import { beforeEach, describe, expect, it } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { getPosition, isAbsolute, setAbsolute, setPosition } from '../components/position';
import { initScreenComponent, registerScreenSingleton } from '../components/screen';
import {
	getAbsoluteEdges,
	setAbsoluteBottom,
	setAbsoluteEdges,
	setAbsoluteLeft,
	setAbsoluteRight,
	setAbsoluteTop,
} from './absolutePositioning';
import { addEntity } from './ecs';
import type { Entity, World } from './types';
import { createWorld } from './world';

describe('Absolute Positioning', () => {
	let world: World;
	let screen: Entity;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld();
		screen = addEntity(world);
		initScreenComponent(world, screen);
		registerScreenSingleton(world, screen);
		setDimensions(world, screen, 100, 50);
		entity = addEntity(world);
		setDimensions(world, entity, 20, 10); // Entity is 20x10
	});

	describe('setAbsoluteLeft', () => {
		it('should set left edge distance from screen left', () => {
			setAbsoluteLeft(world, entity, 15);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(15);
			expect(pos?.absolute).toBe(true);
		});

		it('should preserve Y coordinate', () => {
			// Set initial position using setPosition to ensure component is initialized
			setPosition(world, entity, 10, 25);

			setAbsoluteLeft(world, entity, 30);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(30);
			expect(pos?.y).toBe(25); // Y preserved
		});

		it('should return entity for chaining', () => {
			const result = setAbsoluteLeft(world, entity, 10);
			expect(result).toBe(entity);
		});

		it('should mark position as absolute', () => {
			setAbsoluteLeft(world, entity, 10);
			expect(isAbsolute(world, entity)).toBe(true);
		});
	});

	describe('setAbsoluteRight', () => {
		it('should set right edge distance from screen right', () => {
			// Screen width: 100, entity width: 20, right distance: 15
			// Expected x: 100 - 15 - 20 = 65
			setAbsoluteRight(world, entity, 15);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(65);
			expect(pos?.absolute).toBe(true);
		});

		it('should preserve Y coordinate', () => {
			setPosition(world, entity, 10, 25);

			setAbsoluteRight(world, entity, 10);

			const pos = getPosition(world, entity);
			expect(pos?.y).toBe(25); // Y preserved
		});

		it('should handle zero-width elements', () => {
			const zeroWidthEntity = addEntity(world);
			setDimensions(world, zeroWidthEntity, 0, 10);

			setAbsoluteRight(world, zeroWidthEntity, 10);

			const pos = getPosition(world, zeroWidthEntity);
			expect(pos?.x).toBe(90); // 100 - 10 - 0
		});

		it('should return entity for chaining', () => {
			const result = setAbsoluteRight(world, entity, 10);
			expect(result).toBe(entity);
		});
	});

	describe('setAbsoluteTop', () => {
		it('should set top edge distance from screen top', () => {
			setAbsoluteTop(world, entity, 12);

			const pos = getPosition(world, entity);
			expect(pos?.y).toBe(12);
			expect(pos?.absolute).toBe(true);
		});

		it('should preserve X coordinate', () => {
			setPosition(world, entity, 40, 20);

			setAbsoluteTop(world, entity, 8);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(40); // X preserved
			expect(pos?.y).toBe(8);
		});

		it('should return entity for chaining', () => {
			const result = setAbsoluteTop(world, entity, 5);
			expect(result).toBe(entity);
		});

		it('should mark position as absolute', () => {
			setAbsoluteTop(world, entity, 5);
			expect(isAbsolute(world, entity)).toBe(true);
		});
	});

	describe('setAbsoluteBottom', () => {
		it('should set bottom edge distance from screen bottom', () => {
			// Screen height: 50, entity height: 10, bottom distance: 8
			// Expected y: 50 - 8 - 10 = 32
			setAbsoluteBottom(world, entity, 8);

			const pos = getPosition(world, entity);
			expect(pos?.y).toBe(32);
			expect(pos?.absolute).toBe(true);
		});

		it('should preserve X coordinate', () => {
			setPosition(world, entity, 40, 20);

			setAbsoluteBottom(world, entity, 5);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(40); // X preserved
		});

		it('should handle zero-height elements', () => {
			const zeroHeightEntity = addEntity(world);
			setDimensions(world, zeroHeightEntity, 20, 0);

			setAbsoluteBottom(world, zeroHeightEntity, 10);

			const pos = getPosition(world, zeroHeightEntity);
			expect(pos?.y).toBe(40); // 50 - 10 - 0
		});

		it('should return entity for chaining', () => {
			const result = setAbsoluteBottom(world, entity, 5);
			expect(result).toBe(entity);
		});
	});

	describe('setAbsoluteEdges', () => {
		it('should set left and top', () => {
			setAbsoluteEdges(world, entity, { left: 10, top: 5 });

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
			expect(pos?.absolute).toBe(true);
		});

		it('should set right and bottom', () => {
			// Screen: 100x50, entity: 20x10
			// Right: 15 -> x = 100 - 15 - 20 = 65
			// Bottom: 8 -> y = 50 - 8 - 10 = 32
			setAbsoluteEdges(world, entity, { right: 15, bottom: 8 });

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(65);
			expect(pos?.y).toBe(32);
		});

		it('should prefer left over right when both specified', () => {
			setAbsoluteEdges(world, entity, { left: 20, right: 10 });

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(20); // Left wins
		});

		it('should prefer top over bottom when both specified', () => {
			setAbsoluteEdges(world, entity, { top: 15, bottom: 5 });

			const pos = getPosition(world, entity);
			expect(pos?.y).toBe(15); // Top wins
		});

		it('should handle only horizontal edges', () => {
			setPosition(world, entity, 0, 25); // Set initial Y
			setAbsoluteEdges(world, entity, { left: 30 });

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(30);
			expect(pos?.y).toBe(25); // Y unchanged
		});

		it('should handle only vertical edges', () => {
			setPosition(world, entity, 40, 0); // Set initial X
			setAbsoluteEdges(world, entity, { top: 12 });

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(40); // X unchanged
			expect(pos?.y).toBe(12);
		});

		it('should handle empty options', () => {
			setPosition(world, entity, 30, 20);

			setAbsoluteEdges(world, entity, {});

			// Should still mark as absolute but not change position
			expect(isAbsolute(world, entity)).toBe(true);
		});

		it('should return entity for chaining', () => {
			const result = setAbsoluteEdges(world, entity, { left: 10, top: 5 });
			expect(result).toBe(entity);
		});
	});

	describe('getAbsoluteEdges', () => {
		it('should return all edge distances for absolutely positioned element', () => {
			setAbsoluteEdges(world, entity, { left: 10, top: 15 });

			const edges = getAbsoluteEdges(world, entity);

			expect(edges).toBeDefined();
			expect(edges?.left).toBe(10);
			expect(edges?.top).toBe(15);
			// Screen: 100x50, entity: 20x10, position: 10,15
			// Right: 100 - 10 - 20 = 70
			// Bottom: 50 - 15 - 10 = 25
			expect(edges?.right).toBe(70);
			expect(edges?.bottom).toBe(25);
		});

		it('should return undefined for non-absolute elements', () => {
			// Set position but keep it relative
			setPosition(world, entity, 10, 10);
			// Position is relative by default, but explicitly ensure it
			setAbsolute(world, entity, false);

			const edges = getAbsoluteEdges(world, entity);
			expect(edges).toBeUndefined();
		});

		it('should return undefined for elements without position', () => {
			const newEntity = addEntity(world);
			setDimensions(world, newEntity, 10, 10);

			const edges = getAbsoluteEdges(world, newEntity);
			expect(edges).toBeUndefined();
		});

		it('should handle zero-dimension elements', () => {
			const zeroEntity = addEntity(world);
			setDimensions(world, zeroEntity, 0, 0);
			setAbsoluteEdges(world, zeroEntity, { left: 20, top: 10 });

			const edges = getAbsoluteEdges(world, zeroEntity);

			expect(edges?.left).toBe(20);
			expect(edges?.top).toBe(10);
			expect(edges?.right).toBe(80); // 100 - 20 - 0
			expect(edges?.bottom).toBe(40); // 50 - 10 - 0
		});

		it('should calculate correctly for right-anchored elements', () => {
			setAbsoluteRight(world, entity, 15);

			const edges = getAbsoluteEdges(world, entity);

			// x = 100 - 15 - 20 = 65
			expect(edges?.left).toBe(65);
			expect(edges?.right).toBe(15);
		});

		it('should calculate correctly for bottom-anchored elements', () => {
			setAbsoluteBottom(world, entity, 8);

			const edges = getAbsoluteEdges(world, entity);

			// y = 50 - 8 - 10 = 32
			expect(edges?.top).toBe(32);
			expect(edges?.bottom).toBe(8);
		});
	});

	describe('integration with screen dimensions', () => {
		it('should work with different screen sizes', () => {
			// Create a different screen size
			const customWorld = createWorld();
			const customScreen = addEntity(customWorld);
			initScreenComponent(customWorld, customScreen);
			registerScreenSingleton(customWorld, customScreen);
			setDimensions(customWorld, customScreen, 200, 100);
			const customEntity = addEntity(customWorld);
			setDimensions(customWorld, customEntity, 40, 20);

			setAbsoluteRight(customWorld, customEntity, 25);
			setAbsoluteBottom(customWorld, customEntity, 15);

			const pos = getPosition(customWorld, customEntity);
			// x = 200 - 25 - 40 = 135
			// y = 100 - 15 - 20 = 65
			expect(pos?.x).toBe(135);
			expect(pos?.y).toBe(65);
		});

		it('should fall back to default screen size when no screen exists', () => {
			const noScreenWorld = createWorld();
			const noScreenEntity = addEntity(noScreenWorld);
			setDimensions(noScreenWorld, noScreenEntity, 10, 5);

			// Should use default 80x24 screen
			setAbsoluteRight(noScreenWorld, noScreenEntity, 5);
			setAbsoluteBottom(noScreenWorld, noScreenEntity, 3);

			const pos = getPosition(noScreenWorld, noScreenEntity);
			// x = 80 - 5 - 10 = 65
			// y = 24 - 3 - 5 = 16
			expect(pos?.x).toBe(65);
			expect(pos?.y).toBe(16);
		});
	});

	describe('chaining', () => {
		it('should allow chaining multiple absolute positioning calls', () => {
			const result = setAbsoluteLeft(world, entity, 10);
			setAbsoluteTop(world, result, 5);

			const pos = getPosition(world, entity);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('should work with setDimensions chaining', () => {
			setDimensions(world, entity, 30, 15);
			setAbsoluteRight(world, entity, 20);

			const pos = getPosition(world, entity);
			// x = 100 - 20 - 30 = 50
			expect(pos?.x).toBe(50);
		});
	});
});
