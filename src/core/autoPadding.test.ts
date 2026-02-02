/**
 * Tests for auto-padding system.
 */

import { addEntity, createWorld, type World } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setBorder, BorderType } from '../components/border';
import { setPadding } from '../components/padding';
import { setAutoPadding } from '../components/screen';
import { createScreenEntity } from './entities';
import type { Entity } from './types';
import {
	getAutoPadding,
	getEffectivePadding,
	getTotalEffectivePadding,
	hasAutoPadding,
	hasEntityAutoPadding,
} from './autoPadding';

describe('autoPadding', () => {
	let world: World;
	let screen: Entity;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld();
		screen = createScreenEntity(world, { width: 80, height: 24 });
		entity = addEntity(world) as Entity;
	});

	afterEach(() => {
		// Reset world
	});

	describe('hasAutoPadding', () => {
		it('returns false when autoPadding is disabled (default)', () => {
			expect(hasAutoPadding(world)).toBe(false);
		});

		it('returns true when autoPadding is enabled', () => {
			setAutoPadding(world, screen, true);
			expect(hasAutoPadding(world)).toBe(true);
		});

		it('returns false when no screen exists', () => {
			const emptyWorld = createWorld();
			expect(hasAutoPadding(emptyWorld)).toBe(false);
		});
	});

	describe('getAutoPadding', () => {
		it('returns zero padding when autoPadding is disabled', () => {
			setBorder(world, entity, { type: BorderType.Line });

			const auto = getAutoPadding(world, entity);
			expect(auto.left).toBe(0);
			expect(auto.top).toBe(0);
			expect(auto.right).toBe(0);
			expect(auto.bottom).toBe(0);
		});

		it('returns zero padding when entity has no border', () => {
			setAutoPadding(world, screen, true);

			const auto = getAutoPadding(world, entity);
			expect(auto.left).toBe(0);
			expect(auto.top).toBe(0);
			expect(auto.right).toBe(0);
			expect(auto.bottom).toBe(0);
		});

		it('returns zero padding when border type is None', () => {
			setAutoPadding(world, screen, true);
			setBorder(world, entity, { type: BorderType.None });

			const auto = getAutoPadding(world, entity);
			expect(auto.left).toBe(0);
			expect(auto.top).toBe(0);
			expect(auto.right).toBe(0);
			expect(auto.bottom).toBe(0);
		});

		it('returns 1 for all sides when full border with autoPadding', () => {
			setAutoPadding(world, screen, true);
			setBorder(world, entity, { type: BorderType.Line });

			const auto = getAutoPadding(world, entity);
			expect(auto.left).toBe(1);
			expect(auto.top).toBe(1);
			expect(auto.right).toBe(1);
			expect(auto.bottom).toBe(1);
		});

		it('returns 1 only for sides with borders', () => {
			setAutoPadding(world, screen, true);
			setBorder(world, entity, {
				type: BorderType.Line,
				left: true,
				top: false,
				right: true,
				bottom: false,
			});

			const auto = getAutoPadding(world, entity);
			expect(auto.left).toBe(1);
			expect(auto.top).toBe(0);
			expect(auto.right).toBe(1);
			expect(auto.bottom).toBe(0);
		});

		it('works with double border type', () => {
			setAutoPadding(world, screen, true);
			setBorder(world, entity, { type: BorderType.Background });

			const auto = getAutoPadding(world, entity);
			expect(auto.left).toBe(1);
			expect(auto.top).toBe(1);
			expect(auto.right).toBe(1);
			expect(auto.bottom).toBe(1);
		});
	});

	describe('getEffectivePadding', () => {
		it('returns only explicit padding when autoPadding is disabled', () => {
			setPadding(world, entity, { left: 2, top: 1, right: 2, bottom: 1 });
			setBorder(world, entity, { type: BorderType.Line });

			const effective = getEffectivePadding(world, entity);
			expect(effective.left).toBe(2);
			expect(effective.top).toBe(1);
			expect(effective.right).toBe(2);
			expect(effective.bottom).toBe(1);
			expect(effective.horizontal).toBe(4);
			expect(effective.vertical).toBe(2);
		});

		it('returns zeros when no padding and no autoPadding', () => {
			const effective = getEffectivePadding(world, entity);
			expect(effective.left).toBe(0);
			expect(effective.top).toBe(0);
			expect(effective.right).toBe(0);
			expect(effective.bottom).toBe(0);
			expect(effective.horizontal).toBe(0);
			expect(effective.vertical).toBe(0);
		});

		it('combines explicit and auto-padding', () => {
			setAutoPadding(world, screen, true);
			setPadding(world, entity, { left: 2, top: 1, right: 2, bottom: 1 });
			setBorder(world, entity, { type: BorderType.Line });

			const effective = getEffectivePadding(world, entity);
			expect(effective.left).toBe(3); // 2 explicit + 1 auto
			expect(effective.top).toBe(2); // 1 explicit + 1 auto
			expect(effective.right).toBe(3); // 2 explicit + 1 auto
			expect(effective.bottom).toBe(2); // 1 explicit + 1 auto
			expect(effective.horizontal).toBe(6);
			expect(effective.vertical).toBe(4);
		});

		it('adds auto-padding only for bordered sides', () => {
			setAutoPadding(world, screen, true);
			setPadding(world, entity, { left: 1, top: 1, right: 1, bottom: 1 });
			setBorder(world, entity, {
				type: BorderType.Line,
				left: true,
				top: false,
				right: false,
				bottom: true,
			});

			const effective = getEffectivePadding(world, entity);
			expect(effective.left).toBe(2); // 1 explicit + 1 auto
			expect(effective.top).toBe(1); // 1 explicit + 0 auto
			expect(effective.right).toBe(1); // 1 explicit + 0 auto
			expect(effective.bottom).toBe(2); // 1 explicit + 1 auto
		});

		it('returns only auto-padding when no explicit padding', () => {
			setAutoPadding(world, screen, true);
			setBorder(world, entity, { type: BorderType.Line });

			const effective = getEffectivePadding(world, entity);
			expect(effective.left).toBe(1);
			expect(effective.top).toBe(1);
			expect(effective.right).toBe(1);
			expect(effective.bottom).toBe(1);
		});
	});

	describe('getTotalEffectivePadding', () => {
		it('returns sum of all sides', () => {
			setAutoPadding(world, screen, true);
			setPadding(world, entity, { left: 2, top: 1, right: 2, bottom: 1 });
			setBorder(world, entity, { type: BorderType.Line });

			const total = getTotalEffectivePadding(world, entity);
			// (2+1) + (1+1) + (2+1) + (1+1) = 3 + 2 + 3 + 2 = 10
			expect(total).toBe(10);
		});

		it('returns zero when no padding', () => {
			const total = getTotalEffectivePadding(world, entity);
			expect(total).toBe(0);
		});
	});

	describe('hasEntityAutoPadding', () => {
		it('returns false when autoPadding is disabled', () => {
			setBorder(world, entity, { type: BorderType.Line });
			expect(hasEntityAutoPadding(world, entity)).toBe(false);
		});

		it('returns false when entity has no border', () => {
			setAutoPadding(world, screen, true);
			expect(hasEntityAutoPadding(world, entity)).toBe(false);
		});

		it('returns true when entity has border and autoPadding enabled', () => {
			setAutoPadding(world, screen, true);
			setBorder(world, entity, { type: BorderType.Line });
			expect(hasEntityAutoPadding(world, entity)).toBe(true);
		});

		it('returns true even with partial border', () => {
			setAutoPadding(world, screen, true);
			setBorder(world, entity, {
				type: BorderType.Line,
				left: true,
				top: false,
				right: false,
				bottom: false,
			});
			expect(hasEntityAutoPadding(world, entity)).toBe(true);
		});
	});
});
