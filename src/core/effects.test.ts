/**
 * Effects system tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Focusable, focus, resetFocusState, setFocusable } from '../components/focusable';
import { setHovered, setInteractive } from '../systems/interactiveSystem';
import { Renderable } from '../components/renderable';
import { addComponent, addEntity, createWorld } from '../core/ecs';
import {
	applyCustomEffect,
	applyDisabledEffect,
	applyFocusEffect,
	applyHoverEffect,
	applyPressEffect,
	clearAllEffectConfigs,
	clearAllStoredStyles,
	clearEffectState,
	clearEffects,
	clearStoredStyle,
	getComputedEffectStyle,
	getEffectState,
	getEffects,
	getOriginalStyle,
	getStoredStyle,
	hasAnyEffectApplied,
	hasDisabledEffectApplied,
	hasFocusEffectApplied,
	hasHoverEffectApplied,
	hasPressEffectApplied,
	hasStoredStyle,
	removeAllEffects,
	removeDisabledEffect,
	removeFocusEffect,
	removeHoverEffect,
	removePressEffect,
	resolveEffectConfig,
	setEffects,
	syncEffects,
} from './effects';

describe('effects', () => {
	beforeEach(() => {
		clearAllStoredStyles();
		clearAllEffectConfigs();
		resetFocusState();
	});

	describe('resolveEffectConfig', () => {
		it('resolves static values', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const resolved = resolveEffectConfig(world, entity, {
				fg: 0xff0000ff,
				bold: true,
			});

			expect(resolved.fg).toBe(0xff0000ff);
			expect(resolved.bold).toBe(true);
		});

		it('resolves dynamic values (functions)', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const resolved = resolveEffectConfig(world, entity, {
				fg: () => 0x00ff00ff,
				bold: (_w, e) => e === entity,
			});

			expect(resolved.fg).toBe(0x00ff00ff);
			expect(resolved.bold).toBe(true);
		});

		it('handles undefined values', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const resolved = resolveEffectConfig(world, entity, {});

			expect(resolved.fg).toBeUndefined();
			expect(resolved.bg).toBeUndefined();
			expect(resolved.bold).toBeUndefined();
		});

		it('resolves all style properties', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const resolved = resolveEffectConfig(world, entity, {
				fg: 0xff0000ff,
				bg: 0x00ff00ff,
				bold: true,
				underline: true,
				blink: true,
				inverse: true,
			});

			expect(resolved.fg).toBe(0xff0000ff);
			expect(resolved.bg).toBe(0x00ff00ff);
			expect(resolved.bold).toBe(true);
			expect(resolved.underline).toBe(true);
			expect(resolved.blink).toBe(true);
			expect(resolved.inverse).toBe(true);
		});
	});

	describe('stored styles', () => {
		it('hasStoredStyle returns false for new entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasStoredStyle(entity)).toBe(false);
		});

		it('hasStoredStyle returns true after effect applied', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);

			expect(hasStoredStyle(entity)).toBe(true);
		});

		it('getStoredStyle returns undefined for new entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getStoredStyle(entity)).toBeUndefined();
		});

		it('clearStoredStyle removes stored data', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			clearStoredStyle(entity);

			expect(hasStoredStyle(entity)).toBe(false);
		});

		it('clearAllStoredStyles removes all stored data', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, Renderable);
			addComponent(world, entity2, Renderable);
			setFocusable(world, entity1, { focusable: true, focusEffectFg: 0xff0000ff });
			setFocusable(world, entity2, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity1);
			applyFocusEffect(world, entity2);
			clearAllStoredStyles();

			expect(hasStoredStyle(entity1)).toBe(false);
			expect(hasStoredStyle(entity2)).toBe(false);
		});
	});

	describe('applyFocusEffect', () => {
		it('applies focus effect colors', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);

			expect(Renderable.fg[entity]).toBe(0xff0000ff);
		});

		it('stores original style', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);

			const stored = getStoredStyle(entity);
			expect(stored?.original.fg).toBe(0xffffffff);
		});

		it('marks entity as dirty', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.dirty[entity] = 0;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);

			expect(Renderable.dirty[entity]).toBe(1);
		});

		it('does nothing without Focusable component', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;

			applyFocusEffect(world, entity);

			expect(Renderable.fg[entity]).toBe(0xffffffff);
		});

		it('does not reapply if already applied', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			// Change effect color
			Focusable.focusEffectFg[entity] = 0x00ff00ff;
			applyFocusEffect(world, entity);

			// Should still have first effect color
			expect(Renderable.fg[entity]).toBe(0xff0000ff);
		});

		it('ignores transparent effect colors', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, {
				focusable: true,
				focusEffectFg: 0x00000000, // Transparent
			});

			applyFocusEffect(world, entity);

			// Should keep original color
			expect(Renderable.fg[entity]).toBe(0xffffffff);
		});
	});

	describe('removeFocusEffect', () => {
		it('restores original style', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			removeFocusEffect(world, entity);

			expect(Renderable.fg[entity]).toBe(0xffffffff);
		});

		it('clears stored style when no other effects active', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			removeFocusEffect(world, entity);

			expect(hasStoredStyle(entity)).toBe(false);
		});

		it('does nothing if not applied', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true });

			removeFocusEffect(world, entity);

			expect(Renderable.fg[entity]).toBe(0xffffffff);
		});

		it('marks entity as dirty', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			Renderable.dirty[entity] = 0;
			removeFocusEffect(world, entity);

			expect(Renderable.dirty[entity]).toBe(1);
		});
	});

	describe('hasFocusEffectApplied', () => {
		it('returns false before application', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasFocusEffectApplied(entity)).toBe(false);
		});

		it('returns true after application', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);

			expect(hasFocusEffectApplied(entity)).toBe(true);
		});

		it('returns false after removal', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			removeFocusEffect(world, entity);

			expect(hasFocusEffectApplied(entity)).toBe(false);
		});
	});

	describe('applyHoverEffect', () => {
		it('applies hover effect colors', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.bg[entity] = 0x00000000;
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyHoverEffect(world, entity);

			expect(Renderable.bg[entity]).toBe(0x333333ff);
		});

		it('stores original style', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.bg[entity] = 0x111111ff;
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyHoverEffect(world, entity);

			const stored = getStoredStyle(entity);
			expect(stored?.original.bg).toBe(0x111111ff);
		});

		it('does nothing without Interactive component', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.bg[entity] = 0x111111ff;

			applyHoverEffect(world, entity);

			expect(Renderable.bg[entity]).toBe(0x111111ff);
		});
	});

	describe('removeHoverEffect', () => {
		it('restores original style', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.bg[entity] = 0x111111ff;
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyHoverEffect(world, entity);
			removeHoverEffect(world, entity);

			expect(Renderable.bg[entity]).toBe(0x111111ff);
		});

		it('clears stored style when no other effects active', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyHoverEffect(world, entity);
			removeHoverEffect(world, entity);

			expect(hasStoredStyle(entity)).toBe(false);
		});
	});

	describe('hasHoverEffectApplied', () => {
		it('returns false before application', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasHoverEffectApplied(entity)).toBe(false);
		});

		it('returns true after application', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyHoverEffect(world, entity);

			expect(hasHoverEffectApplied(entity)).toBe(true);
		});
	});

	describe('combined effects', () => {
		it('maintains hover effect when focus is removed', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			Renderable.bg[entity] = 0x000000ff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyHoverEffect(world, entity);
			applyFocusEffect(world, entity);
			removeFocusEffect(world, entity);

			// Hover effect should still be active
			expect(hasHoverEffectApplied(entity)).toBe(true);
			expect(Renderable.bg[entity]).toBe(0x333333ff);
		});

		it('maintains focus effect when hover is removed', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			Renderable.bg[entity] = 0x000000ff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyFocusEffect(world, entity);
			applyHoverEffect(world, entity);
			removeHoverEffect(world, entity);

			// Focus effect should still be active
			expect(hasFocusEffectApplied(entity)).toBe(true);
			expect(Renderable.fg[entity]).toBe(0xff0000ff);
		});

		it('restores original when both effects removed', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			Renderable.bg[entity] = 0x000000ff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyFocusEffect(world, entity);
			applyHoverEffect(world, entity);
			removeFocusEffect(world, entity);
			removeHoverEffect(world, entity);

			expect(Renderable.fg[entity]).toBe(0xffffffff);
			expect(Renderable.bg[entity]).toBe(0x000000ff);
			expect(hasStoredStyle(entity)).toBe(false);
		});
	});

	describe('applyCustomEffect', () => {
		it('applies custom effect', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;

			applyCustomEffect(world, entity, { fg: 0x00ff00ff, bold: true });

			expect(Renderable.fg[entity]).toBe(0x00ff00ff);
			expect(Renderable.bold[entity]).toBe(1);
		});

		it('resolves dynamic values', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);

			applyCustomEffect(world, entity, {
				fg: () => 0xaabbccff,
			});

			expect(Renderable.fg[entity]).toBe(0xaabbccff);
		});
	});

	describe('removeAllEffects', () => {
		it('removes all effects and restores original', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			Renderable.bg[entity] = 0x000000ff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyFocusEffect(world, entity);
			applyHoverEffect(world, entity);
			removeAllEffects(world, entity);

			expect(Renderable.fg[entity]).toBe(0xffffffff);
			expect(Renderable.bg[entity]).toBe(0x000000ff);
			expect(hasStoredStyle(entity)).toBe(false);
		});

		it('does nothing if no effects applied', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;

			removeAllEffects(world, entity);

			expect(Renderable.fg[entity]).toBe(0xffffffff);
		});
	});

	describe('syncEffects', () => {
		it('applies focus effect when focused', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });
			focus(world, entity);

			syncEffects(world, entity);

			expect(hasFocusEffectApplied(entity)).toBe(true);
			expect(Renderable.fg[entity]).toBe(0xff0000ff);
		});

		it('removes focus effect when not focused', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			// Entity is not actually focused
			syncEffects(world, entity);

			expect(hasFocusEffectApplied(entity)).toBe(false);
			expect(Renderable.fg[entity]).toBe(0xffffffff);
		});

		it('applies hover effect when hovered', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.bg[entity] = 0x000000ff;
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });
			setHovered(world, entity, true);

			syncEffects(world, entity);

			expect(hasHoverEffectApplied(entity)).toBe(true);
			expect(Renderable.bg[entity]).toBe(0x333333ff);
		});

		it('removes hover effect when not hovered', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.bg[entity] = 0x000000ff;
			setInteractive(world, entity, { hoverable: true, hoverEffectBg: 0x333333ff });

			applyHoverEffect(world, entity);
			// Entity is not actually hovered
			syncEffects(world, entity);

			expect(hasHoverEffectApplied(entity)).toBe(false);
			expect(Renderable.bg[entity]).toBe(0x000000ff);
		});
	});

	describe('getComputedEffectStyle', () => {
		it('returns current style with effects', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			const style = getComputedEffectStyle(world, entity);

			expect(style.fg).toBe(0xff0000ff);
		});
	});

	describe('getOriginalStyle', () => {
		it('returns original style when effects applied', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			const original = getOriginalStyle(world, entity);

			expect(original.fg).toBe(0xffffffff);
		});

		it('returns current style when no effects', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;

			const original = getOriginalStyle(world, entity);

			expect(original.fg).toBe(0xffffffff);
		});
	});

	describe('setEffects', () => {
		it('stores effects configuration', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true });
			setInteractive(world, entity, { hoverable: true });

			setEffects(world, entity, {
				focus: { fg: 0xff0000ff },
				hover: { bg: 0x333333ff },
			});

			const config = getEffects(entity);
			expect(config).toBeDefined();
			expect(config?.focus?.fg).toBe(0xff0000ff);
			expect(config?.hover?.bg).toBe(0x333333ff);
		});

		it('updates component effect colors', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true });
			setInteractive(world, entity, { hoverable: true });

			setEffects(world, entity, {
				focus: { fg: 0xffff00ff },
				hover: { bg: 0x444444ff },
			});

			expect(Focusable.focusEffectFg[entity]).toBe(0xffff00ff);
		});
	});

	describe('press effects', () => {
		it('applies press effect', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			Renderable.bg[entity] = 0x000000ff;

			setEffects(world, entity, {
				press: { bg: 0x222222ff },
			});

			applyPressEffect(world, entity);
			expect(hasPressEffectApplied(entity)).toBe(true);
			expect(Renderable.bg[entity]).toBe(0x222222ff);
		});

		it('removes press effect', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			Renderable.bg[entity] = 0x000000ff;

			setEffects(world, entity, {
				press: { bg: 0x222222ff },
			});

			applyPressEffect(world, entity);
			removePressEffect(world, entity);

			expect(hasPressEffectApplied(entity)).toBe(false);
		});

		it('does nothing without press config', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);

			setEffects(world, entity, {});
			applyPressEffect(world, entity);

			expect(hasPressEffectApplied(entity)).toBe(false);
		});
	});

	describe('disabled effects', () => {
		it('applies disabled effect', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;

			setEffects(world, entity, {
				disabled: { fg: 0x808080ff },
			});

			applyDisabledEffect(world, entity);
			expect(hasDisabledEffectApplied(entity)).toBe(true);
			expect(Renderable.fg[entity]).toBe(0x808080ff);
		});

		it('removes disabled effect', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;

			setEffects(world, entity, {
				disabled: { fg: 0x808080ff },
			});

			applyDisabledEffect(world, entity);
			removeDisabledEffect(world, entity);

			expect(hasDisabledEffectApplied(entity)).toBe(false);
		});
	});

	describe('effect state', () => {
		it('hasAnyEffectApplied returns true when any effect active', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);

			setEffects(world, entity, {
				press: { bg: 0x222222ff },
			});

			expect(hasAnyEffectApplied(entity)).toBe(false);

			applyPressEffect(world, entity);
			expect(hasAnyEffectApplied(entity)).toBe(true);
		});

		it('getEffectState returns all effect states', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			setEffects(world, entity, {
				press: { bg: 0x222222ff },
			});

			const state = getEffectState(entity);
			expect(state.focus).toBe(false);
			expect(state.hover).toBe(false);
			expect(state.press).toBe(false);
			expect(state.disabled).toBe(false);

			applyFocusEffect(world, entity);
			applyPressEffect(world, entity);

			const newState = getEffectState(entity);
			expect(newState.focus).toBe(true);
			expect(newState.press).toBe(true);
		});
	});

	describe('clearEffects', () => {
		it('clears all effect state', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			Renderable.fg[entity] = 0xffffffff;
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			setEffects(world, entity, {
				press: { bg: 0x222222ff },
			});

			applyFocusEffect(world, entity);
			applyPressEffect(world, entity);

			clearEffects(world, entity);

			expect(getEffects(entity)).toBeUndefined();
			expect(hasAnyEffectApplied(entity)).toBe(false);
		});
	});

	describe('clearEffectState', () => {
		it('removes all stored state for entity', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, Renderable);
			setFocusable(world, entity, { focusable: true, focusEffectFg: 0xff0000ff });

			applyFocusEffect(world, entity);
			expect(hasStoredStyle(entity)).toBe(true);

			clearEffectState(entity);

			expect(hasStoredStyle(entity)).toBe(false);
			expect(hasFocusEffectApplied(entity)).toBe(false);
		});
	});
});
