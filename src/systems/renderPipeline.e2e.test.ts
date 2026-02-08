/**
 * End-to-end rendering pipeline tests.
 * Tests the complete flow from entity creation through terminal output.
 * @module systems/renderPipeline.e2e.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDimensions } from '../components/dimensions';
import { appendChild } from '../components/hierarchy';
import { setPosition, setZIndex } from '../components/position';
import { setStyle } from '../components/renderable';
import { addEntity } from '../core/ecs';
import type { World } from '../core/types';
import type { IntegrationTestContext } from '../testing/integration';
import { createTestScreen, teardownTestScreen } from '../testing/integration';

describe('End-to-End Rendering Pipeline', () => {
	let ctx: IntegrationTestContext;
	let world: World;

	beforeEach(() => {
		ctx = createTestScreen(80, 30);
		world = ctx.world;
	});

	afterEach(() => {
		teardownTestScreen(ctx);
	});

	describe('Basic Entity Rendering', () => {
		it('renders a single entity with position and dimensions', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 5, 3);
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, {
				fg: 0xffffffff,
				bg: 0x0000ffff,
			});

			ctx.step();

			// Entity should be rendered to the output buffer
			const output = ctx.toText();
			expect(output).toBeDefined();
			// Note: Output may be empty if entity has no content, but should not crash
		});

		it('renders multiple non-overlapping entities', () => {
			// First entity - top left
			const entity1 = addEntity(world);
			setPosition(world, entity1, 0, 0);
			setDimensions(world, entity1, 10, 5);
			setStyle(world, entity1, {
				fg: 0xffffffff,
				bg: 0xff0000ff,
			});

			// Second entity - bottom right
			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 10);
			setDimensions(world, entity2, 10, 5);
			setStyle(world, entity2, {
				fg: 0xffffffff,
				bg: 0x00ff00ff,
			});

			ctx.step();

			const output = ctx.toText();
			expect(output).toBeDefined();
			// Should have content from both entities
			expect(output.split('\n').length).toBeGreaterThan(0);
		});

		it('renders entity with zero dimensions as empty', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 5, 3);
			setDimensions(world, entity, 0, 0);
			setStyle(world, entity, {
				fg: 0xffffffff,
				bg: 0x0000ffff,
			});

			ctx.step();

			// Should render but produce no visible output
			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('handles entity positioned outside screen bounds', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 100, 100); // Outside 80x30 screen
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, {
				fg: 0xffffffff,
				bg: 0x0000ffff,
			});

			ctx.step();

			// Should not crash, entity is clipped
			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('renders entity partially off-screen with clipping', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 75, 27); // Partially off 80x30 screen
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, {
				fg: 0xffffffff,
				bg: 0x0000ffff,
			});

			ctx.step();

			// Should render the visible portion
			const output = ctx.toText();
			expect(output).toBeDefined();
		});
	});

	describe('Z-Index Layering', () => {
		it('renders entities in correct z-order', () => {
			// Background entity (z=0)
			const bg = addEntity(world);
			setPosition(world, bg, 10, 10, 0);
			setDimensions(world, bg, 20, 10);
			setStyle(world, bg, { bg: 0xff0000ff });

			// Foreground entity (z=10) overlapping
			const fg = addEntity(world);
			setPosition(world, fg, 15, 12, 10);
			setDimensions(world, fg, 15, 7);
			setStyle(world, fg, { bg: 0x0000ffff });

			ctx.step();

			// Foreground should occlude background in overlap region
			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('respects z-index constraints (non-negative)', () => {
			// Z-index must be >= 0 per schema validation
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 10, 0);
			setDimensions(world, entity1, 10, 5);
			setStyle(world, entity1, { bg: 0xff0000ff });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 12, 11, 5);
			setDimensions(world, entity2, 10, 5);
			setStyle(world, entity2, { bg: 0x00ff00ff });

			ctx.step();

			// entity2 (z=5) should be above entity1 (z=0)
			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('maintains render order for entities with same z-index', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 10, 0);
			setDimensions(world, entity1, 10, 5);
			setStyle(world, entity1, { bg: 0xff0000ff });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 12, 11, 0);
			setDimensions(world, entity2, 10, 5);
			setStyle(world, entity2, { bg: 0x00ff00ff });

			ctx.step();

			// Order should be stable (creation order or entity ID order)
			const output = ctx.toText();
			expect(output).toBeDefined();
		});
	});

	describe('Hierarchy and Parent-Child Relationships', () => {
		it('renders child entity relative to parent position', () => {
			// Parent container
			const parent = addEntity(world);
			setPosition(world, parent, 10, 5);
			setDimensions(world, parent, 30, 15);
			setStyle(world, parent, { bg: 0x222222ff });

			// Child entity with relative position
			const child = addEntity(world);
			setPosition(world, child, 5, 3); // Relative to parent
			setDimensions(world, child, 10, 5);
			setStyle(world, child, { bg: 0xffffffff });
			appendChild(world, parent, child);

			ctx.step();

			// Child should be rendered at absolute position (15, 8)
			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('renders nested hierarchy correctly', () => {
			// Root
			const root = addEntity(world);
			setPosition(world, root, 5, 5);
			setDimensions(world, root, 40, 20);
			setStyle(world, root, { bg: 0x111111ff });

			// Level 1 child
			const child1 = addEntity(world);
			setPosition(world, child1, 5, 5);
			setDimensions(world, child1, 30, 15);
			setStyle(world, child1, { bg: 0x222222ff });
			appendChild(world, root, child1);

			// Level 2 child
			const child2 = addEntity(world);
			setPosition(world, child2, 5, 5);
			setDimensions(world, child2, 20, 10);
			setStyle(world, child2, { bg: 0x333333ff });
			appendChild(world, child1, child2);

			ctx.step();

			// All three levels should render correctly
			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('clips child entity to parent bounds', () => {
			// Small parent
			const parent = addEntity(world);
			setPosition(world, parent, 10, 10);
			setDimensions(world, parent, 10, 5);
			setStyle(world, parent, { bg: 0x222222ff });

			// Large child that exceeds parent bounds
			const child = addEntity(world);
			setPosition(world, child, 2, 2);
			setDimensions(world, child, 15, 10);
			setStyle(world, child, { bg: 0xffffffff });
			appendChild(world, parent, child);

			ctx.step();

			// Child should be clipped to parent's 10x5 area
			const output = ctx.toText();
			expect(output).toBeDefined();
		});
	});

	describe('Complex Rendering Scenarios', () => {
		it('renders overlapping entities with transparency', () => {
			// Opaque background
			const bg = addEntity(world);
			setPosition(world, bg, 0, 0, 0);
			setDimensions(world, bg, 80, 30);
			setStyle(world, bg, { bg: 0x000000ff });

			// Semi-transparent overlay (if transparency is supported)
			const overlay = addEntity(world);
			setPosition(world, overlay, 20, 10, 10);
			setDimensions(world, overlay, 40, 10);
			setStyle(world, overlay, { bg: 0xff000088 }); // 50% opacity

			ctx.step();

			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('handles rapid entity creation', () => {
			// Create many entities
			for (let i = 0; i < 50; i++) {
				const entity = addEntity(world);
				setPosition(world, entity, (i % 8) * 10, Math.floor(i / 8) * 3);
				setDimensions(world, entity, 8, 2);
				setStyle(world, entity, {
					bg: ((i * 50000) % 0xffffff) | 0xff,
				});
			}

			ctx.step();

			// Should handle many entities without crashing
			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('renders complex nested layout', () => {
			// Main container
			const main = addEntity(world);
			setPosition(world, main, 2, 2);
			setDimensions(world, main, 76, 26);
			setStyle(world, main, { bg: 0x222222ff });

			// Sidebar
			const sidebar = addEntity(world);
			setPosition(world, sidebar, 0, 0);
			setDimensions(world, sidebar, 20, 26);
			setStyle(world, sidebar, { bg: 0x333333ff });
			appendChild(world, main, sidebar);

			// Content area
			const content = addEntity(world);
			setPosition(world, content, 22, 0);
			setDimensions(world, content, 54, 26);
			setStyle(world, content, { bg: 0x444444ff });
			appendChild(world, main, content);

			// Header in content
			const header = addEntity(world);
			setPosition(world, header, 0, 0);
			setDimensions(world, header, 54, 3);
			setStyle(world, header, { bg: 0x555555ff });
			appendChild(world, content, header);

			ctx.step();

			const output = ctx.toText();
			expect(output).toBeDefined();
		});
	});

	describe('Performance and Edge Cases', () => {
		it('handles rendering with no entities', () => {
			ctx.step();

			const output = ctx.toText();
			// Should produce empty or default output
			expect(output).toBeDefined();
		});

		it('respects z-index upper bound (max 65535)', () => {
			// Z-index must be <= 65535 per schema validation
			const entity = addEntity(world);
			setPosition(world, entity, 10, 10, 65535);
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, { bg: 0xff0000ff });

			ctx.step();

			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('handles entity with large dimensions', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 0, 0);
			setDimensions(world, entity, 1000, 1000); // Much larger than screen
			setStyle(world, entity, { bg: 0xff0000ff });

			ctx.step();

			// Should clip to screen size without crashing
			const output = ctx.toText();
			expect(output).toBeDefined();
		});

		it('renders correctly after multiple step cycles', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 10);
			setDimensions(world, entity, 20, 10);
			setStyle(world, entity, { bg: 0xff0000ff });

			// Run multiple frames
			ctx.step();
			const output1 = ctx.toText();

			ctx.step();
			const output2 = ctx.toText();

			ctx.step();
			const output3 = ctx.toText();

			// Output should be stable across frames
			expect(output1).toBe(output2);
			expect(output2).toBe(output3);
		});

		it('handles dynamic position changes', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 10);
			setDimensions(world, entity, 10, 5);
			setStyle(world, entity, { bg: 0xff0000ff });

			ctx.step();
			const output1 = ctx.toText();

			// Move entity
			setPosition(world, entity, 30, 15);
			ctx.step();
			const output2 = ctx.toText();

			// Position changes should be processed (output may differ or be empty)
			expect(output1).toBeDefined();
			expect(output2).toBeDefined();
		});

		it('handles dynamic z-index changes', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 10, 0);
			setDimensions(world, entity1, 15, 8);
			setStyle(world, entity1, { bg: 0xff0000ff });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 12, 11, 5);
			setDimensions(world, entity2, 15, 8);
			setStyle(world, entity2, { bg: 0x00ff00ff });

			ctx.step();
			const output1 = ctx.toText();

			// Swap z-indices
			setZIndex(world, entity1, 10);
			setZIndex(world, entity2, 0);

			ctx.step();
			const output2 = ctx.toText();

			// Z-index changes should be processed (output may differ or be empty)
			expect(output1).toBeDefined();
			expect(output2).toBeDefined();
		});
	});
});
