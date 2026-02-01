import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	blur,
	Focusable,
	focus,
	focusNext,
	focusPrev,
	getFocusable,
	getFocusedEntity,
	getTabIndex,
	getTabOrder,
	hasFocusable,
	isFocusable,
	isFocused,
	isInTabOrder,
	makeFocusable,
	resetFocusState,
	setFocusable,
	setTabIndex,
} from './focusable';

describe('Focusable component', () => {
	beforeEach(() => {
		resetFocusState();
	});

	describe('setFocusable', () => {
		it('adds Focusable component to entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});

			expect(hasFocusable(world, entity)).toBe(true);
		});

		it('sets focusable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { focusable: false });

			expect(Focusable.focusable[entity]).toBe(0);
		});

		it('sets tab index', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { tabIndex: 5 });

			expect(Focusable.tabIndex[entity]).toBe(5);
		});

		it('sets focus effect colors', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { focusEffectFg: 0xff0000ff, focusEffectBg: 0x00ff00ff });

			expect(Focusable.focusEffectFg[entity]).toBe(0xff0000ff);
			expect(Focusable.focusEffectBg[entity]).toBe(0x00ff00ff);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setFocusable(world, entity, {});

			expect(result).toBe(entity);
		});

		it('defaults to focusable with tabIndex 0', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});

			expect(Focusable.focusable[entity]).toBe(1);
			expect(Focusable.tabIndex[entity]).toBe(0);
		});
	});

	describe('makeFocusable', () => {
		it('sets focusable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			makeFocusable(world, entity, true);

			expect(Focusable.focusable[entity]).toBe(1);
		});

		it('can make entity not focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			makeFocusable(world, entity, true);
			makeFocusable(world, entity, false);

			expect(Focusable.focusable[entity]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = makeFocusable(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('isFocused', () => {
		it('returns false for entity without Focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isFocused(world, entity)).toBe(false);
		});

		it('returns false for unfocused entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});

			expect(isFocused(world, entity)).toBe(false);
		});

		it('returns true for focused entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});
			focus(world, entity);

			expect(isFocused(world, entity)).toBe(true);
		});
	});

	describe('isFocusable', () => {
		it('returns false for entity without Focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isFocusable(world, entity)).toBe(false);
		});

		it('returns true when focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { focusable: true });

			expect(isFocusable(world, entity)).toBe(true);
		});

		it('returns false when not focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { focusable: false });

			expect(isFocusable(world, entity)).toBe(false);
		});
	});

	describe('focus', () => {
		it('focuses an entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});
			focus(world, entity);

			expect(Focusable.focused[entity]).toBe(1);
		});

		it('unfocuses previously focused entity', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);

			setFocusable(world, e1, {});
			setFocusable(world, e2, {});

			focus(world, e1);
			expect(isFocused(world, e1)).toBe(true);

			focus(world, e2);
			expect(isFocused(world, e1)).toBe(false);
			expect(isFocused(world, e2)).toBe(true);
		});

		it('does not focus if not focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { focusable: false });
			focus(world, entity);

			expect(isFocused(world, entity)).toBe(false);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});
			const result = focus(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('blur', () => {
		it('removes focus from entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});
			focus(world, entity);
			blur(world, entity);

			expect(isFocused(world, entity)).toBe(false);
		});

		it('clears currentlyFocused', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});
			focus(world, entity);
			blur(world, entity);

			expect(getFocusedEntity()).toBeNull();
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = blur(world, entity);

			expect(result).toBe(entity);
		});

		it('handles entity without Focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			// Should not throw
			blur(world, entity);

			expect(hasFocusable(world, entity)).toBe(false);
		});
	});

	describe('getFocusable', () => {
		it('returns undefined for entity without Focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getFocusable(world, entity)).toBeUndefined();
		});

		it('returns focusable data', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {
				focusable: true,
				tabIndex: 3,
				focusEffectFg: 0xff0000ff,
				focusEffectBg: 0x00ff00ff,
			});
			focus(world, entity);

			const data = getFocusable(world, entity);

			expect(data).toBeDefined();
			expect(data?.focusable).toBe(true);
			expect(data?.focused).toBe(true);
			expect(data?.tabIndex).toBe(3);
			expect(data?.focusEffectFg).toBe(0xff0000ff);
			expect(data?.focusEffectBg).toBe(0x00ff00ff);
		});
	});

	describe('getFocusedEntity', () => {
		it('returns null when nothing focused', () => {
			expect(getFocusedEntity()).toBeNull();
		});

		it('returns focused entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, {});
			focus(world, entity);

			expect(getFocusedEntity()).toBe(entity);
		});
	});

	describe('setTabIndex', () => {
		it('sets tab index', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTabIndex(world, entity, 10);

			expect(Focusable.tabIndex[entity]).toBe(10);
		});

		it('supports negative tab index', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTabIndex(world, entity, -1);

			expect(Focusable.tabIndex[entity]).toBe(-1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setTabIndex(world, entity, 5);

			expect(result).toBe(entity);
		});
	});

	describe('getTabIndex', () => {
		it('returns -1 for entity without Focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getTabIndex(world, entity)).toBe(-1);
		});

		it('returns tab index', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setTabIndex(world, entity, 7);

			expect(getTabIndex(world, entity)).toBe(7);
		});
	});

	describe('isInTabOrder', () => {
		it('returns false for entity without Focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isInTabOrder(world, entity)).toBe(false);
		});

		it('returns false when tabIndex is -1', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { tabIndex: -1 });

			expect(isInTabOrder(world, entity)).toBe(false);
		});

		it('returns false when not focusable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { focusable: false, tabIndex: 0 });

			expect(isInTabOrder(world, entity)).toBe(false);
		});

		it('returns true when focusable with positive tabIndex', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setFocusable(world, entity, { focusable: true, tabIndex: 0 });

			expect(isInTabOrder(world, entity)).toBe(true);
		});
	});

	describe('getTabOrder', () => {
		it('returns empty array for empty input', () => {
			const world = createWorld();

			expect(getTabOrder(world, [])).toEqual([]);
		});

		it('filters out entities not in tab order', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);

			setFocusable(world, e1, { tabIndex: 0 });
			setFocusable(world, e2, { tabIndex: -1 }); // Not in tab order
			setFocusable(world, e3, { focusable: false }); // Not focusable

			const order = getTabOrder(world, [e1, e2, e3]);

			expect(order).toEqual([e1]);
		});

		it('sorts by tabIndex', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);
			const e3 = addEntity(world);

			setFocusable(world, e1, { tabIndex: 3 });
			setFocusable(world, e2, { tabIndex: 1 });
			setFocusable(world, e3, { tabIndex: 2 });

			const order = getTabOrder(world, [e1, e2, e3]);

			expect(order).toEqual([e2, e3, e1]);
		});
	});

	describe('focusNext', () => {
		it('returns null for empty entities', () => {
			const world = createWorld();

			expect(focusNext(world, [])).toBeNull();
		});

		it('focuses first entity when nothing focused', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);

			setFocusable(world, e1, { tabIndex: 0 });
			setFocusable(world, e2, { tabIndex: 1 });

			const result = focusNext(world, [e1, e2]);

			expect(result).toBe(e1);
			expect(isFocused(world, e1)).toBe(true);
		});

		it('cycles through entities', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);

			setFocusable(world, e1, { tabIndex: 0 });
			setFocusable(world, e2, { tabIndex: 1 });

			focus(world, e1);
			focusNext(world, [e1, e2]);

			expect(isFocused(world, e2)).toBe(true);
		});

		it('wraps to first entity', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);

			setFocusable(world, e1, { tabIndex: 0 });
			setFocusable(world, e2, { tabIndex: 1 });

			focus(world, e2);
			focusNext(world, [e1, e2]);

			expect(isFocused(world, e1)).toBe(true);
		});
	});

	describe('focusPrev', () => {
		it('returns null for empty entities', () => {
			const world = createWorld();

			expect(focusPrev(world, [])).toBeNull();
		});

		it('focuses last entity when nothing focused', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);

			setFocusable(world, e1, { tabIndex: 0 });
			setFocusable(world, e2, { tabIndex: 1 });

			const result = focusPrev(world, [e1, e2]);

			expect(result).toBe(e2);
			expect(isFocused(world, e2)).toBe(true);
		});

		it('cycles backwards through entities', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);

			setFocusable(world, e1, { tabIndex: 0 });
			setFocusable(world, e2, { tabIndex: 1 });

			focus(world, e2);
			focusPrev(world, [e1, e2]);

			expect(isFocused(world, e1)).toBe(true);
		});

		it('wraps to last entity', () => {
			const world = createWorld();
			const e1 = addEntity(world);
			const e2 = addEntity(world);

			setFocusable(world, e1, { tabIndex: 0 });
			setFocusable(world, e2, { tabIndex: 1 });

			focus(world, e1);
			focusPrev(world, [e1, e2]);

			expect(isFocused(world, e2)).toBe(true);
		});
	});
});
