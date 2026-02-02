/**
 * Tests for Focus System
 */

import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setPosition } from '../components/position';
import { setStyle, setVisible } from '../components/renderable';
import { setInteractive, setFocusable, isFocused } from '../components/interactive';
import { createScreenEntity } from '../core/entities';
import { resetScreenSingleton } from '../components/screen';
import type { World } from '../core/types';
import {
	blurAll,
	clearFocusStack,
	createFocusSystem,
	focusEntity,
	focusFirst,
	focusLast,
	focusNext,
	focusOffset,
	focusPop,
	focusPrev,
	focusPush,
	focusSystem,
	getFocusableEntities,
	getFocused,
	getFocusEventBus,
	getFocusStackDepth,
	peekFocusStack,
	resetFocusEventBus,
	restoreFocus,
	rewindFocus,
	saveFocus,
} from './focusSystem';

describe('focusSystem', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		resetScreenSingleton(world);
		resetFocusEventBus();
		createScreenEntity(world, { width: 80, height: 24 });
	});

	describe('getFocusableEntities', () => {
		it('returns empty array when no focusable entities', () => {
			const focusable = getFocusableEntities(world);
			expect(focusable).toEqual([]);
		});

		it('returns only focusable entities', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: false });

			const focusable = getFocusableEntities(world);
			expect(focusable).toContain(entity1);
			expect(focusable).not.toContain(entity2);
		});

		it('excludes hidden entities', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: true });
			setVisible(world, entity, false);

			const focusable = getFocusableEntities(world);
			expect(focusable).not.toContain(entity);
		});

		it('excludes entities with negative tabIndex', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: true, tabIndex: -1 });

			const focusable = getFocusableEntities(world);
			expect(focusable).not.toContain(entity);
		});

		it('sorts by tabIndex, then position', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 10);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true, tabIndex: 2 });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 5, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true, tabIndex: 1 });

			const entity3 = addEntity(world);
			setPosition(world, entity3, 20, 15);
			setStyle(world, entity3, {});
			setInteractive(world, entity3, { focusable: true, tabIndex: 0 });

			const entity4 = addEntity(world);
			setPosition(world, entity4, 5, 15);
			setStyle(world, entity4, {});
			setInteractive(world, entity4, { focusable: true, tabIndex: 0 });

			const focusable = getFocusableEntities(world);
			// tabIndex 1 first, then 2, then 0s by position
			expect(focusable[0]).toBe(entity2); // tabIndex 1
			expect(focusable[1]).toBe(entity1); // tabIndex 2
			expect(focusable[2]).toBe(entity4); // tabIndex 0, y=15, x=5
			expect(focusable[3]).toBe(entity3); // tabIndex 0, y=15, x=20
		});
	});

	describe('getFocused', () => {
		it('returns null when no entity is focused', () => {
			expect(getFocused(world)).toBeNull();
		});

		it('returns focused entity after focusing', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: true });

			focusEntity(world, entity);

			expect(getFocused(world)).toBe(entity);
		});
	});

	describe('focusEntity', () => {
		it('focuses a focusable entity', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: true });

			const result = focusEntity(world, entity);

			expect(result).toBe(true);
			expect(isFocused(world, entity)).toBe(true);
		});

		it('returns false for non-focusable entity', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: false });

			const result = focusEntity(world, entity);

			expect(result).toBe(false);
		});

		it('returns false for hidden entity', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: true });
			setVisible(world, entity, false);

			const result = focusEntity(world, entity);

			expect(result).toBe(false);
		});

		it('blurs previous entity when focusing new one', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true });

			focusEntity(world, entity1);
			expect(isFocused(world, entity1)).toBe(true);

			focusEntity(world, entity2);
			expect(isFocused(world, entity1)).toBe(false);
			expect(isFocused(world, entity2)).toBe(true);
		});

		it('emits focus and blur events', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true });

			const focusHandler = vi.fn();
			const blurHandler = vi.fn();

			const bus = getFocusEventBus();
			bus.on('focus', focusHandler);
			bus.on('blur', blurHandler);

			focusEntity(world, entity1);
			expect(focusHandler).toHaveBeenCalledWith(
				expect.objectContaining({ entity: entity1 }),
			);

			focusEntity(world, entity2);
			expect(blurHandler).toHaveBeenCalledWith(
				expect.objectContaining({ entity: entity1 }),
			);
			expect(focusHandler).toHaveBeenCalledWith(
				expect.objectContaining({ entity: entity2 }),
			);
		});
	});

	describe('blurAll', () => {
		it('removes focus from all entities', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: true });

			focusEntity(world, entity);
			expect(getFocused(world)).toBe(entity);

			blurAll(world);
			expect(getFocused(world)).toBeNull();
			expect(isFocused(world, entity)).toBe(false);
		});
	});

	describe('focusNext', () => {
		it('focuses first entity when none focused', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true });

			const result = focusNext(world);

			// Should focus the first focusable entity
			expect(result).not.toBeNull();
			expect(isFocused(world, result!)).toBe(true);
		});

		it('cycles to next entity', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

			focusEntity(world, entity1);
			focusNext(world);

			expect(isFocused(world, entity2)).toBe(true);
		});

		it('wraps around to first entity', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

			focusEntity(world, entity2);
			focusNext(world);

			expect(isFocused(world, entity1)).toBe(true);
		});

		it('returns null when no focusable entities', () => {
			const result = focusNext(world);
			expect(result).toBeNull();
		});
	});

	describe('focusPrev', () => {
		it('focuses last entity when none focused', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

			const result = focusPrev(world);

			expect(result).toBe(entity2);
			expect(isFocused(world, entity2)).toBe(true);
		});

		it('cycles to previous entity', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

			focusEntity(world, entity2);
			focusPrev(world);

			expect(isFocused(world, entity1)).toBe(true);
		});

		it('wraps around to last entity', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

			focusEntity(world, entity1);
			focusPrev(world);

			expect(isFocused(world, entity2)).toBe(true);
		});
	});

	describe('focusFirst / focusLast', () => {
		it('focusFirst focuses first focusable entity', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

			const result = focusFirst(world);

			expect(result).toBe(entity1);
			expect(isFocused(world, entity1)).toBe(true);
		});

		it('focusLast focuses last focusable entity', () => {
			const entity1 = addEntity(world);
			setPosition(world, entity1, 10, 5);
			setStyle(world, entity1, {});
			setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

			const entity2 = addEntity(world);
			setPosition(world, entity2, 20, 5);
			setStyle(world, entity2, {});
			setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

			const result = focusLast(world);

			expect(result).toBe(entity2);
			expect(isFocused(world, entity2)).toBe(true);
		});
	});

	describe('focusSystem', () => {
		it('runs without errors', () => {
			expect(() => focusSystem(world)).not.toThrow();
		});

		it('blurs entity that becomes non-focusable', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: true });

			focusEntity(world, entity);
			expect(getFocused(world)).toBe(entity);

			// Make entity non-focusable
			setFocusable(world, entity, false);

			// System should blur it
			focusSystem(world);
			expect(getFocused(world)).toBeNull();
		});

		it('blurs entity that becomes hidden', () => {
			const entity = addEntity(world);
			setPosition(world, entity, 10, 5);
			setStyle(world, entity, {});
			setInteractive(world, entity, { focusable: true });

			focusEntity(world, entity);
			expect(getFocused(world)).toBe(entity);

			// Hide entity
			setVisible(world, entity, false);

			// System should blur it
			focusSystem(world);
			expect(getFocused(world)).toBeNull();
		});
	});

	describe('createFocusSystem', () => {
		it('creates a working focus system', () => {
			const system = createFocusSystem();
			expect(() => system(world)).not.toThrow();
		});
	});

	describe('focus event bus', () => {
		it('resetFocusEventBus creates new bus', () => {
			const bus1 = getFocusEventBus();
			resetFocusEventBus();
			const bus2 = getFocusEventBus();

			expect(bus1).not.toBe(bus2);
		});
	});

	describe('focus stack', () => {
		beforeEach(() => {
			clearFocusStack(world);
		});

		describe('focusPush / focusPop', () => {
			it('pushes current focus and focuses new entity', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true });

				focusEntity(world, entity1);
				expect(getFocused(world)).toBe(entity1);

				focusPush(world, entity2);
				expect(getFocused(world)).toBe(entity2);
				expect(getFocusStackDepth(world)).toBe(1);
			});

			it('pops and restores previous focus', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true });

				focusEntity(world, entity1);
				focusPush(world, entity2);
				const restored = focusPop(world);

				expect(restored).toBe(entity1);
				expect(getFocused(world)).toBe(entity1);
				expect(getFocusStackDepth(world)).toBe(0);
			});

			it('handles multiple push/pop cycles', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true });

				const entity3 = addEntity(world);
				setPosition(world, entity3, 30, 5);
				setStyle(world, entity3, {});
				setInteractive(world, entity3, { focusable: true });

				focusEntity(world, entity1);
				focusPush(world, entity2);
				focusPush(world, entity3);

				expect(getFocusStackDepth(world)).toBe(2);
				expect(getFocused(world)).toBe(entity3);

				focusPop(world);
				expect(getFocused(world)).toBe(entity2);

				focusPop(world);
				expect(getFocused(world)).toBe(entity1);
			});

			it('returns null when popping empty stack', () => {
				const result = focusPop(world);
				expect(result).toBeNull();
			});
		});

		describe('saveFocus / restoreFocus', () => {
			it('saves and restores focus', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true });

				focusEntity(world, entity1);
				saveFocus(world);

				focusEntity(world, entity2);
				expect(getFocused(world)).toBe(entity2);

				const restored = restoreFocus(world);
				expect(restored).toBe(entity1);
				expect(getFocused(world)).toBe(entity1);
			});

			it('returns null when no saved focus', () => {
				const result = restoreFocus(world);
				expect(result).toBeNull();
			});

			it('does not affect focus stack', () => {
				const entity = addEntity(world);
				setPosition(world, entity, 10, 5);
				setStyle(world, entity, {});
				setInteractive(world, entity, { focusable: true });

				focusEntity(world, entity);
				saveFocus(world);

				expect(getFocusStackDepth(world)).toBe(0);
			});
		});

		describe('rewindFocus', () => {
			it('finds first valid entity in stack', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true });

				focusEntity(world, entity1);
				focusPush(world, entity2);

				// Make entity2 non-focusable
				setFocusable(world, entity2, false);

				const result = rewindFocus(world);
				expect(result).toBe(entity1);
			});

			it('falls back to first focusable when stack empty', () => {
				const entity = addEntity(world);
				setPosition(world, entity, 10, 5);
				setStyle(world, entity, {});
				setInteractive(world, entity, { focusable: true });

				const result = rewindFocus(world);
				expect(result).toBe(entity);
			});
		});

		describe('focusOffset', () => {
			it('moves focus forward by offset', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

				const entity3 = addEntity(world);
				setPosition(world, entity3, 30, 5);
				setStyle(world, entity3, {});
				setInteractive(world, entity3, { focusable: true, tabIndex: 3 });

				focusEntity(world, entity1);
				focusOffset(world, 2);

				expect(getFocused(world)).toBe(entity3);
			});

			it('moves focus backward by negative offset', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

				const entity3 = addEntity(world);
				setPosition(world, entity3, 30, 5);
				setStyle(world, entity3, {});
				setInteractive(world, entity3, { focusable: true, tabIndex: 3 });

				focusEntity(world, entity3);
				focusOffset(world, -2);

				expect(getFocused(world)).toBe(entity1);
			});

			it('wraps around when reaching end', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true, tabIndex: 1 });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true, tabIndex: 2 });

				focusEntity(world, entity2);
				focusOffset(world, 1);

				expect(getFocused(world)).toBe(entity1);
			});

			it('returns current focus when offset is 0', () => {
				const entity = addEntity(world);
				setPosition(world, entity, 10, 5);
				setStyle(world, entity, {});
				setInteractive(world, entity, { focusable: true });

				focusEntity(world, entity);
				const result = focusOffset(world, 0);

				expect(result).toBe(entity);
			});
		});

		describe('getFocusStackDepth', () => {
			it('returns 0 for empty stack', () => {
				expect(getFocusStackDepth(world)).toBe(0);
			});

			it('returns correct depth after pushes', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true });

				focusEntity(world, entity1);
				focusPush(world, entity2);

				expect(getFocusStackDepth(world)).toBe(1);
			});
		});

		describe('clearFocusStack', () => {
			it('clears the focus stack', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true });

				focusEntity(world, entity1);
				focusPush(world, entity2);
				expect(getFocusStackDepth(world)).toBe(1);

				clearFocusStack(world);
				expect(getFocusStackDepth(world)).toBe(0);
			});
		});

		describe('peekFocusStack', () => {
			it('returns null for empty stack', () => {
				expect(peekFocusStack(world)).toBeNull();
			});

			it('returns top of stack without popping', () => {
				const entity1 = addEntity(world);
				setPosition(world, entity1, 10, 5);
				setStyle(world, entity1, {});
				setInteractive(world, entity1, { focusable: true });

				const entity2 = addEntity(world);
				setPosition(world, entity2, 20, 5);
				setStyle(world, entity2, {});
				setInteractive(world, entity2, { focusable: true });

				focusEntity(world, entity1);
				focusPush(world, entity2);

				expect(peekFocusStack(world)).toBe(entity1);
				expect(getFocusStackDepth(world)).toBe(1); // Not popped
			});
		});
	});
});
