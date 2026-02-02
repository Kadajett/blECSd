/**
 * Shadow component tests.
 */

import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Entity, World } from '../core/types';
import {
	blendShadowColor,
	calculateShadowPositions,
	DEFAULT_SHADOW_CHAR,
	DEFAULT_SHADOW_COLOR,
	DEFAULT_SHADOW_OFFSET_X,
	DEFAULT_SHADOW_OFFSET_Y,
	DEFAULT_SHADOW_OPACITY,
	disableShadow,
	enableShadow,
	getShadow,
	getShadowChar,
	getShadowColor,
	getShadowOffset,
	getShadowOpacity,
	hasShadow,
	isShadowBlending,
	isShadowEnabled,
	removeShadow,
	SHADOW_CHAR_LIGHT,
	setShadow,
	setShadowBlend,
	setShadowChar,
	setShadowColor,
	setShadowOffset,
	setShadowOpacity,
	toggleShadow,
} from './shadow';

describe('shadow', () => {
	let world: World;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld() as World;
		entity = addEntity(world) as Entity;
	});

	describe('setShadow', () => {
		it('should add shadow component with default values', () => {
			setShadow(world, entity, {});

			expect(hasShadow(world, entity)).toBe(true);
			const shadow = getShadow(world, entity);
			expect(shadow).toBeDefined();
			expect(shadow?.enabled).toBe(false);
			expect(shadow?.offsetX).toBe(DEFAULT_SHADOW_OFFSET_X);
			expect(shadow?.offsetY).toBe(DEFAULT_SHADOW_OFFSET_Y);
			expect(shadow?.color).toBe(DEFAULT_SHADOW_COLOR);
			expect(shadow?.opacity).toBe(DEFAULT_SHADOW_OPACITY);
			expect(shadow?.char).toBe(DEFAULT_SHADOW_CHAR);
			expect(shadow?.blendWithBg).toBe(true);
		});

		it('should enable shadow', () => {
			setShadow(world, entity, { enabled: true });

			expect(isShadowEnabled(world, entity)).toBe(true);
		});

		it('should set custom offset', () => {
			setShadow(world, entity, { offsetX: 2, offsetY: 3 });

			const offset = getShadowOffset(world, entity);
			expect(offset?.x).toBe(2);
			expect(offset?.y).toBe(3);
		});

		it('should set color from hex string', () => {
			setShadow(world, entity, { color: '#ff0000' });

			const color = getShadowColor(world, entity);
			// Packed as ARGB: 0xff (alpha) ff (red) 00 (green) 00 (blue)
			expect(color).toBe(0xffff0000);
		});

		it('should set color from packed number', () => {
			setShadow(world, entity, { color: 0x80333333 });

			expect(getShadowColor(world, entity)).toBe(0x80333333);
		});

		it('should clamp opacity to valid range', () => {
			setShadow(world, entity, { opacity: 300 });
			expect(getShadowOpacity(world, entity)).toBe(255);

			setShadow(world, entity, { opacity: -50 });
			expect(getShadowOpacity(world, entity)).toBe(0);
		});

		it('should set custom character', () => {
			setShadow(world, entity, { char: SHADOW_CHAR_LIGHT });

			expect(getShadowChar(world, entity)).toBe(SHADOW_CHAR_LIGHT);
		});

		it('should set blend mode', () => {
			setShadow(world, entity, { blendWithBg: false });

			expect(isShadowBlending(world, entity)).toBe(false);
		});

		it('should return entity for chaining', () => {
			const result = setShadow(world, entity, { enabled: true });

			expect(result).toBe(entity);
		});
	});

	describe('getShadow', () => {
		it('should return undefined for entity without shadow', () => {
			expect(getShadow(world, entity)).toBeUndefined();
		});

		it('should return shadow data', () => {
			setShadow(world, entity, {
				enabled: true,
				offsetX: 2,
				offsetY: 2,
				opacity: 200,
			});

			const shadow = getShadow(world, entity);
			expect(shadow).toEqual({
				enabled: true,
				offsetX: 2,
				offsetY: 2,
				color: DEFAULT_SHADOW_COLOR,
				opacity: 200,
				char: DEFAULT_SHADOW_CHAR,
				blendWithBg: true,
			});
		});
	});

	describe('hasShadow', () => {
		it('should return false for entity without shadow', () => {
			expect(hasShadow(world, entity)).toBe(false);
		});

		it('should return true for entity with shadow', () => {
			setShadow(world, entity, {});
			expect(hasShadow(world, entity)).toBe(true);
		});
	});

	describe('isShadowEnabled', () => {
		it('should return false for entity without shadow', () => {
			expect(isShadowEnabled(world, entity)).toBe(false);
		});

		it('should return false when shadow is disabled', () => {
			setShadow(world, entity, { enabled: false });
			expect(isShadowEnabled(world, entity)).toBe(false);
		});

		it('should return true when shadow is enabled', () => {
			setShadow(world, entity, { enabled: true });
			expect(isShadowEnabled(world, entity)).toBe(true);
		});
	});

	describe('enableShadow / disableShadow', () => {
		it('should enable shadow', () => {
			enableShadow(world, entity);

			expect(isShadowEnabled(world, entity)).toBe(true);
		});

		it('should disable shadow', () => {
			setShadow(world, entity, { enabled: true });
			disableShadow(world, entity);

			expect(isShadowEnabled(world, entity)).toBe(false);
		});

		it('should not throw when disabling non-existent shadow', () => {
			expect(() => disableShadow(world, entity)).not.toThrow();
		});

		it('should return entity for chaining', () => {
			expect(enableShadow(world, entity)).toBe(entity);
			expect(disableShadow(world, entity)).toBe(entity);
		});
	});

	describe('toggleShadow', () => {
		it('should toggle from disabled to enabled', () => {
			setShadow(world, entity, { enabled: false });
			toggleShadow(world, entity);

			expect(isShadowEnabled(world, entity)).toBe(true);
		});

		it('should toggle from enabled to disabled', () => {
			setShadow(world, entity, { enabled: true });
			toggleShadow(world, entity);

			expect(isShadowEnabled(world, entity)).toBe(false);
		});

		it('should create shadow if not exists', () => {
			toggleShadow(world, entity);

			expect(hasShadow(world, entity)).toBe(true);
			expect(isShadowEnabled(world, entity)).toBe(true);
		});
	});

	describe('setShadowOffset / getShadowOffset', () => {
		it('should set and get offset', () => {
			setShadowOffset(world, entity, 3, 4);

			const offset = getShadowOffset(world, entity);
			expect(offset?.x).toBe(3);
			expect(offset?.y).toBe(4);
		});

		it('should return undefined for entity without shadow', () => {
			expect(getShadowOffset(world, entity)).toBeUndefined();
		});

		it('should handle negative offsets', () => {
			setShadowOffset(world, entity, -1, -2);

			const offset = getShadowOffset(world, entity);
			expect(offset?.x).toBe(-1);
			expect(offset?.y).toBe(-2);
		});
	});

	describe('setShadowColor / getShadowColor', () => {
		it('should set color from hex string', () => {
			setShadowColor(world, entity, '#00ff00');

			expect(getShadowColor(world, entity)).toBe(0xff00ff00);
		});

		it('should set color from packed number', () => {
			setShadowColor(world, entity, 0x80ff00ff);

			expect(getShadowColor(world, entity)).toBe(0x80ff00ff);
		});

		it('should return undefined for entity without shadow', () => {
			expect(getShadowColor(world, entity)).toBeUndefined();
		});

		it('should handle short hex colors', () => {
			setShadowColor(world, entity, '#f00');

			expect(getShadowColor(world, entity)).toBe(0xffff0000);
		});
	});

	describe('setShadowOpacity / getShadowOpacity', () => {
		it('should set and get opacity', () => {
			setShadowOpacity(world, entity, 100);

			expect(getShadowOpacity(world, entity)).toBe(100);
		});

		it('should clamp to 0', () => {
			setShadowOpacity(world, entity, -10);

			expect(getShadowOpacity(world, entity)).toBe(0);
		});

		it('should clamp to 255', () => {
			setShadowOpacity(world, entity, 500);

			expect(getShadowOpacity(world, entity)).toBe(255);
		});

		it('should return undefined for entity without shadow', () => {
			expect(getShadowOpacity(world, entity)).toBeUndefined();
		});
	});

	describe('setShadowChar / getShadowChar', () => {
		it('should set and get character', () => {
			setShadowChar(world, entity, 0x2591);

			expect(getShadowChar(world, entity)).toBe(0x2591);
		});

		it('should return undefined for entity without shadow', () => {
			expect(getShadowChar(world, entity)).toBeUndefined();
		});
	});

	describe('setShadowBlend / isShadowBlending', () => {
		it('should enable blending', () => {
			setShadow(world, entity, { blendWithBg: false });
			setShadowBlend(world, entity, true);

			expect(isShadowBlending(world, entity)).toBe(true);
		});

		it('should disable blending', () => {
			setShadowBlend(world, entity, false);

			expect(isShadowBlending(world, entity)).toBe(false);
		});

		it('should return false for entity without shadow', () => {
			expect(isShadowBlending(world, entity)).toBe(false);
		});
	});

	describe('removeShadow', () => {
		it('should reset shadow values', () => {
			setShadow(world, entity, {
				enabled: true,
				offsetX: 5,
				opacity: 255,
			});

			removeShadow(world, entity);

			// Values are reset to defaults
			const shadow = getShadow(world, entity);
			expect(shadow?.enabled).toBe(false);
			expect(shadow?.offsetX).toBe(DEFAULT_SHADOW_OFFSET_X);
			expect(shadow?.opacity).toBe(DEFAULT_SHADOW_OPACITY);
		});

		it('should not throw for entity without shadow', () => {
			expect(() => removeShadow(world, entity)).not.toThrow();
		});

		it('should return entity for chaining', () => {
			expect(removeShadow(world, entity)).toBe(entity);
		});
	});

	describe('calculateShadowPositions', () => {
		it('should calculate right edge shadow positions', () => {
			const positions = calculateShadowPositions(10, 5, 20, 10, 1, 0);

			// With offsetX=1, offsetY=0: only right edge
			const rightPositions = positions.filter((p) => p.type === 'right');
			expect(rightPositions.length).toBe(10); // height * offsetX
			expect(rightPositions[0]).toEqual({ x: 30, y: 5, type: 'right' });
		});

		it('should calculate bottom edge shadow positions', () => {
			const positions = calculateShadowPositions(10, 5, 20, 10, 0, 1);

			// With offsetX=0, offsetY=1: only bottom edge
			const bottomPositions = positions.filter((p) => p.type === 'bottom');
			expect(bottomPositions.length).toBe(20); // width * offsetY
			expect(bottomPositions[0]).toEqual({ x: 10, y: 15, type: 'bottom' });
		});

		it('should calculate corner shadow positions', () => {
			const positions = calculateShadowPositions(10, 5, 20, 10, 2, 2);

			const cornerPositions = positions.filter((p) => p.type === 'corner');
			expect(cornerPositions.length).toBe(4); // offsetX * offsetY
		});

		it('should calculate all positions with standard offset', () => {
			const positions = calculateShadowPositions(0, 0, 5, 3, 1, 1);

			// Right edge: 3 positions (height)
			// Bottom edge: 5 positions (width)
			// Corner: 1 position
			expect(positions.length).toBe(9);

			const right = positions.filter((p) => p.type === 'right');
			const bottom = positions.filter((p) => p.type === 'bottom');
			const corner = positions.filter((p) => p.type === 'corner');

			expect(right.length).toBe(3);
			expect(bottom.length).toBe(5);
			expect(corner.length).toBe(1);
		});

		it('should handle zero offset', () => {
			const positions = calculateShadowPositions(0, 0, 10, 10, 0, 0);

			expect(positions.length).toBe(0);
		});
	});

	describe('blendShadowColor', () => {
		it('should blend black and white at 50%', () => {
			const shadowColor = 0xff000000; // Black
			const bgColor = 0xffffffff; // White
			const blended = blendShadowColor(shadowColor, bgColor, 128);

			// Should be approximately gray
			const r = (blended >> 16) & 0xff;
			const g = (blended >> 8) & 0xff;
			const b = blended & 0xff;

			expect(r).toBeCloseTo(127, 0);
			expect(g).toBeCloseTo(127, 0);
			expect(b).toBeCloseTo(127, 0);
		});

		it('should return shadow color at full opacity', () => {
			const shadowColor = 0xffff0000; // Red
			const bgColor = 0xff0000ff; // Blue
			const blended = blendShadowColor(shadowColor, bgColor, 255);

			const r = (blended >> 16) & 0xff;
			const g = (blended >> 8) & 0xff;
			const b = blended & 0xff;

			expect(r).toBe(255);
			expect(g).toBe(0);
			expect(b).toBe(0);
		});

		it('should return background color at zero opacity', () => {
			const shadowColor = 0xffff0000; // Red
			const bgColor = 0xff0000ff; // Blue
			const blended = blendShadowColor(shadowColor, bgColor, 0);

			const r = (blended >> 16) & 0xff;
			const g = (blended >> 8) & 0xff;
			const b = blended & 0xff;

			expect(r).toBe(0);
			expect(g).toBe(0);
			expect(b).toBe(255);
		});

		it('should preserve background alpha', () => {
			const shadowColor = 0xff000000;
			const bgColor = 0x80ffffff; // Semi-transparent white
			const blended = blendShadowColor(shadowColor, bgColor, 128);

			const a = (blended >> 24) & 0xff;
			expect(a).toBe(0x80);
		});
	});
});
