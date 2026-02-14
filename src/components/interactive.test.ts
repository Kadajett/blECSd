import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import { Interactive } from './interactive';
import {
	clearInteractionState,
	disable,
	disableInput,
	disableKeys,
	disableMouse,
	enable,
	enableInput,
	enableKeys,
	enableMouse,
	getInteractive,
	hasInputEnabled,
	hasInteractive,
	hasKeysEnabled,
	hasMouseEnabled,
	isClickable,
	isDraggable,
	isEnabled,
	isHoverable,
	isHovered,
	isKeyable,
	isPressed,
	setClickable,
	setDraggable,
	setHoverable,
	setHovered,
	setInteractive,
	setKeyable,
	setPressed,
} from '../systems/interactiveSystem';

describe('Interactive component', () => {
	describe('setInteractive', () => {
		it('adds Interactive component to entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, {});

			expect(hasInteractive(world, entity)).toBe(true);
		});

		it('sets clickable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, { clickable: true });

			expect(Interactive.clickable[entity]).toBe(1);
		});

		it('sets draggable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, { draggable: true });

			expect(Interactive.draggable[entity]).toBe(1);
		});

		it('sets hoverable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, { hoverable: true });

			expect(Interactive.hoverable[entity]).toBe(1);
		});

		it('sets keyable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, { keyable: true });

			expect(Interactive.keyable[entity]).toBe(1);
		});

		it('sets hover effect colors', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, {
				hoverEffectFg: 0xff0000ff,
				hoverEffectBg: 0x00ff00ff,
			});

			expect(Interactive.hoverEffectFg[entity]).toBe(0xff0000ff);
			expect(Interactive.hoverEffectBg[entity]).toBe(0x00ff00ff);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setInteractive(world, entity, {});

			expect(result).toBe(entity);
		});

		it('defaults all flags to false', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, {});

			expect(Interactive.clickable[entity]).toBe(0);
			expect(Interactive.draggable[entity]).toBe(0);
			expect(Interactive.hoverable[entity]).toBe(0);
			expect(Interactive.keyable[entity]).toBe(0);
		});
	});

	describe('setClickable', () => {
		it('sets clickable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setClickable(world, entity, true);

			expect(Interactive.clickable[entity]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setClickable(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('setDraggable', () => {
		it('sets draggable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setDraggable(world, entity, true);

			expect(Interactive.draggable[entity]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setDraggable(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('setHoverable', () => {
		it('sets hoverable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setHoverable(world, entity, true);

			expect(Interactive.hoverable[entity]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setHoverable(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('setKeyable', () => {
		it('sets keyable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setKeyable(world, entity, true);

			expect(Interactive.keyable[entity]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setKeyable(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('isHovered', () => {
		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isHovered(world, entity)).toBe(false);
		});

		it('returns hover state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setHovered(world, entity, true);

			expect(isHovered(world, entity)).toBe(true);
		});
	});

	describe('isPressed', () => {
		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isPressed(world, entity)).toBe(false);
		});

		it('returns pressed state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPressed(world, entity, true);

			expect(isPressed(world, entity)).toBe(true);
		});
	});

	describe('isClickable', () => {
		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isClickable(world, entity)).toBe(false);
		});

		it('returns clickable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setClickable(world, entity, true);

			expect(isClickable(world, entity)).toBe(true);
		});
	});

	describe('isDraggable', () => {
		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isDraggable(world, entity)).toBe(false);
		});

		it('returns draggable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setDraggable(world, entity, true);

			expect(isDraggable(world, entity)).toBe(true);
		});
	});

	describe('isHoverable', () => {
		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isHoverable(world, entity)).toBe(false);
		});

		it('returns hoverable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setHoverable(world, entity, true);

			expect(isHoverable(world, entity)).toBe(true);
		});
	});

	describe('isKeyable', () => {
		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isKeyable(world, entity)).toBe(false);
		});

		it('returns keyable state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setKeyable(world, entity, true);

			expect(isKeyable(world, entity)).toBe(true);
		});
	});

	describe('setHovered', () => {
		it('sets hover state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setHovered(world, entity, true);

			expect(Interactive.hovered[entity]).toBe(1);
		});

		it('can clear hover state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setHovered(world, entity, true);
			setHovered(world, entity, false);

			expect(Interactive.hovered[entity]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setHovered(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('setPressed', () => {
		it('sets pressed state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPressed(world, entity, true);

			expect(Interactive.pressed[entity]).toBe(1);
		});

		it('can clear pressed state', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setPressed(world, entity, true);
			setPressed(world, entity, false);

			expect(Interactive.pressed[entity]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setPressed(world, entity, true);

			expect(result).toBe(entity);
		});
	});

	describe('getInteractive', () => {
		it('returns undefined for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getInteractive(world, entity)).toBeUndefined();
		});

		it('returns interactive data', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, {
				clickable: true,
				draggable: true,
				hoverable: true,
				keyable: true,
				hoverEffectFg: 0xff0000ff,
				hoverEffectBg: 0x00ff00ff,
			});
			setHovered(world, entity, true);
			setPressed(world, entity, true);

			const data = getInteractive(world, entity);

			expect(data).toBeDefined();
			expect(data?.clickable).toBe(true);
			expect(data?.draggable).toBe(true);
			expect(data?.hoverable).toBe(true);
			expect(data?.hovered).toBe(true);
			expect(data?.pressed).toBe(true);
			expect(data?.keyable).toBe(true);
			expect(data?.hoverEffectFg).toBe(0xff0000ff);
			expect(data?.hoverEffectBg).toBe(0x00ff00ff);
		});
	});

	describe('hasInteractive', () => {
		it('returns true when entity has Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setInteractive(world, entity, {});

			expect(hasInteractive(world, entity)).toBe(true);
		});

		it('returns false when entity lacks Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasInteractive(world, entity)).toBe(false);
		});
	});

	describe('clearInteractionState', () => {
		it('clears hover and pressed states', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setHovered(world, entity, true);
			setPressed(world, entity, true);

			clearInteractionState(world, entity);

			expect(Interactive.hovered[entity]).toBe(0);
			expect(Interactive.pressed[entity]).toBe(0);
		});

		it('handles entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			// Should not throw
			clearInteractionState(world, entity);

			expect(hasInteractive(world, entity)).toBe(false);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = clearInteractionState(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('enableMouse', () => {
		it('enables clickable and hoverable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableMouse(world, entity);

			expect(isClickable(world, entity)).toBe(true);
			expect(isHoverable(world, entity)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = enableMouse(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('disableMouse', () => {
		it('disables clickable and hoverable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableMouse(world, entity);
			disableMouse(world, entity);

			expect(isClickable(world, entity)).toBe(false);
			expect(isHoverable(world, entity)).toBe(false);
		});

		it('handles entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			// Should not throw
			disableMouse(world, entity);

			expect(hasInteractive(world, entity)).toBe(false);
		});
	});

	describe('enableKeys', () => {
		it('enables keyable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableKeys(world, entity);

			expect(isKeyable(world, entity)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = enableKeys(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('disableKeys', () => {
		it('disables keyable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableKeys(world, entity);
			disableKeys(world, entity);

			expect(isKeyable(world, entity)).toBe(false);
		});

		it('handles entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			// Should not throw
			disableKeys(world, entity);

			expect(hasInteractive(world, entity)).toBe(false);
		});
	});

	describe('enableInput', () => {
		it('enables clickable, hoverable, and keyable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableInput(world, entity);

			expect(isClickable(world, entity)).toBe(true);
			expect(isHoverable(world, entity)).toBe(true);
			expect(isKeyable(world, entity)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = enableInput(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('disableInput', () => {
		it('disables clickable, hoverable, and keyable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableInput(world, entity);
			disableInput(world, entity);

			expect(isClickable(world, entity)).toBe(false);
			expect(isHoverable(world, entity)).toBe(false);
			expect(isKeyable(world, entity)).toBe(false);
		});

		it('handles entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			// Should not throw
			disableInput(world, entity);

			expect(hasInteractive(world, entity)).toBe(false);
		});
	});

	describe('hasMouseEnabled', () => {
		it('returns true if clickable is enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setClickable(world, entity, true);

			expect(hasMouseEnabled(world, entity)).toBe(true);
		});

		it('returns true if hoverable is enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setHoverable(world, entity, true);

			expect(hasMouseEnabled(world, entity)).toBe(true);
		});

		it('returns false if only keyable is enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setKeyable(world, entity, true);

			expect(hasMouseEnabled(world, entity)).toBe(false);
		});

		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasMouseEnabled(world, entity)).toBe(false);
		});
	});

	describe('hasKeysEnabled', () => {
		it('returns true if keyable is enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableKeys(world, entity);

			expect(hasKeysEnabled(world, entity)).toBe(true);
		});

		it('returns false if only mouse is enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableMouse(world, entity);

			expect(hasKeysEnabled(world, entity)).toBe(false);
		});

		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasKeysEnabled(world, entity)).toBe(false);
		});
	});

	describe('hasInputEnabled', () => {
		it('returns true if any input is enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setClickable(world, entity, true);

			expect(hasInputEnabled(world, entity)).toBe(true);
		});

		it('returns false if all input is disabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableInput(world, entity);
			disableInput(world, entity);

			expect(hasInputEnabled(world, entity)).toBe(false);
		});

		it('returns false for entity without Interactive', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasInputEnabled(world, entity)).toBe(false);
		});
	});

	describe('enable/disable state', () => {
		describe('enable', () => {
			it('enables an entity by default', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true });

				expect(isEnabled(world, entity)).toBe(true);
			});

			it('re-enables a disabled entity', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true });
				disable(world, entity);
				enable(world, entity);

				expect(isEnabled(world, entity)).toBe(true);
			});

			it('returns the entity for chaining', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true });
				const result = enable(world, entity);

				expect(result).toBe(entity);
			});
		});

		describe('disable', () => {
			it('disables an enabled entity', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true });
				disable(world, entity);

				expect(isEnabled(world, entity)).toBe(false);
			});

			it('clears interaction state when disabling', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true, hoverable: true });
				setHovered(world, entity, true);
				setPressed(world, entity, true);
				Interactive.focused[entity] = 1;

				disable(world, entity);

				expect(Interactive.hovered[entity]).toBe(0);
				expect(Interactive.pressed[entity]).toBe(0);
				expect(Interactive.focused[entity]).toBe(0);
			});

			it('returns the entity for chaining', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true });
				const result = disable(world, entity);

				expect(result).toBe(entity);
			});
		});

		describe('isEnabled', () => {
			it('returns true for enabled entity', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true });

				expect(isEnabled(world, entity)).toBe(true);
			});

			it('returns false for disabled entity', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true });
				disable(world, entity);

				expect(isEnabled(world, entity)).toBe(false);
			});

			it('returns true for entity without Interactive component', () => {
				const world = createWorld();
				const entity = addEntity(world);

				expect(isEnabled(world, entity)).toBe(true);
			});

			it('can be set via setInteractive', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setInteractive(world, entity, { clickable: true, enabled: false });

				expect(isEnabled(world, entity)).toBe(false);
			});
		});
	});
});
