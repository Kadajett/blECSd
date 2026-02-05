import { describe, expect, it } from 'vitest';
import {
	allocateEntity,
	assertEntityAlive,
	createEntityPool,
	deallocateEntity,
	type EntityHandle,
	getEntityCount,
	getEntityPoolCapacity,
	isEntityAlive,
	resetEntityPool,
} from './entityPool';

describe('EntityPool', () => {
	describe('createEntityPool', () => {
		it('creates an empty pool with default capacity', () => {
			const pool = createEntityPool();
			expect(getEntityCount(pool)).toBe(0);
			expect(getEntityPoolCapacity(pool)).toBeGreaterThan(0);
		});

		it('creates a pool with specified capacity', () => {
			const pool = createEntityPool(256);
			expect(getEntityCount(pool)).toBe(0);
			expect(getEntityPoolCapacity(pool)).toBe(256);
		});
	});

	describe('allocateEntity', () => {
		it('allocates entities with unique indices', () => {
			const pool = createEntityPool();
			const e1 = allocateEntity(pool);
			const e2 = allocateEntity(pool);
			const e3 = allocateEntity(pool);

			expect(e1.index).toBe(0);
			expect(e2.index).toBe(1);
			expect(e3.index).toBe(2);
			expect(getEntityCount(pool)).toBe(3);
		});

		it('reuses deallocated slots', () => {
			const pool = createEntityPool();
			const e1 = allocateEntity(pool);
			allocateEntity(pool); // e2 - allocated but not used in assertions

			deallocateEntity(pool, e1);

			const e3 = allocateEntity(pool);

			// Should reuse e1's slot with bumped generation
			expect(e3.index).toBe(e1.index);
			expect(e3.gen).toBe(e1.gen + 1);
		});

		it('grows capacity when exhausted', () => {
			const pool = createEntityPool(4);
			expect(getEntityPoolCapacity(pool)).toBe(4);

			for (let i = 0; i < 10; i++) {
				allocateEntity(pool);
			}

			expect(getEntityCount(pool)).toBe(10);
			expect(getEntityPoolCapacity(pool)).toBeGreaterThanOrEqual(10);
		});
	});

	describe('isEntityAlive', () => {
		it('returns true for live entities', () => {
			const pool = createEntityPool();
			const entity = allocateEntity(pool);

			expect(isEntityAlive(pool, entity)).toBe(true);
		});

		it('returns false for deallocated entities', () => {
			const pool = createEntityPool();
			const entity = allocateEntity(pool);
			deallocateEntity(pool, entity);

			expect(isEntityAlive(pool, entity)).toBe(false);
		});

		it('returns false for handles with wrong generation', () => {
			const pool = createEntityPool();
			const e1 = allocateEntity(pool);
			deallocateEntity(pool, e1);
			const e2 = allocateEntity(pool);

			// e1's handle has old generation
			expect(isEntityAlive(pool, e1)).toBe(false);
			expect(isEntityAlive(pool, e2)).toBe(true);
		});

		it('returns false for out-of-bounds indices', () => {
			const pool = createEntityPool();

			expect(isEntityAlive(pool, { index: -1, gen: 0 })).toBe(false);
			expect(isEntityAlive(pool, { index: 9999, gen: 0 })).toBe(false);
		});
	});

	describe('deallocateEntity', () => {
		it('removes entities and returns true', () => {
			const pool = createEntityPool();
			const entity = allocateEntity(pool);

			expect(deallocateEntity(pool, entity)).toBe(true);
			expect(getEntityCount(pool)).toBe(0);
			expect(isEntityAlive(pool, entity)).toBe(false);
		});

		it('returns false for already deallocated entities', () => {
			const pool = createEntityPool();
			const entity = allocateEntity(pool);

			expect(deallocateEntity(pool, entity)).toBe(true);
			expect(deallocateEntity(pool, entity)).toBe(false);
		});

		it('returns false for invalid handles', () => {
			const pool = createEntityPool();

			expect(deallocateEntity(pool, { index: -1, gen: 0 })).toBe(false);
		});
	});

	describe('resetEntityPool', () => {
		it('removes all entities', () => {
			const pool = createEntityPool();
			const handles: EntityHandle[] = [];

			for (let i = 0; i < 10; i++) {
				handles.push(allocateEntity(pool));
			}

			resetEntityPool(pool);

			expect(getEntityCount(pool)).toBe(0);

			// All old handles should be invalid
			for (const handle of handles) {
				expect(isEntityAlive(pool, handle)).toBe(false);
			}
		});

		it('allows reallocation after reset', () => {
			const pool = createEntityPool();

			for (let i = 0; i < 5; i++) {
				allocateEntity(pool);
			}

			resetEntityPool(pool);

			const newEntity = allocateEntity(pool);
			expect(isEntityAlive(pool, newEntity)).toBe(true);
			expect(getEntityCount(pool)).toBe(1);
		});
	});

	describe('assertEntityAlive', () => {
		it('does not throw for live entities', () => {
			const pool = createEntityPool();
			const entity = allocateEntity(pool);

			expect(() => assertEntityAlive(pool, entity)).not.toThrow();
		});

		it('throws for dead entities', () => {
			const pool = createEntityPool();
			const entity = allocateEntity(pool);
			deallocateEntity(pool, entity);

			expect(() => assertEntityAlive(pool, entity)).toThrow(/Invalid entity handle/);
		});
	});

	describe('generation tracking', () => {
		it('bumps generation on deallocation', () => {
			const pool = createEntityPool();
			const e1 = allocateEntity(pool);
			expect(e1.gen).toBe(0);

			deallocateEntity(pool, e1);

			const e2 = allocateEntity(pool);
			expect(e2.index).toBe(e1.index);
			expect(e2.gen).toBe(1);
		});

		it('prevents use-after-free', () => {
			const pool = createEntityPool();

			// Allocate and deallocate multiple times
			const handles: EntityHandle[] = [];
			for (let i = 0; i < 5; i++) {
				handles.push(allocateEntity(pool));
			}

			// Deallocate all
			for (const h of handles) {
				deallocateEntity(pool, h);
			}

			// Allocate new entities - they reuse slots
			const newHandles: EntityHandle[] = [];
			for (let i = 0; i < 5; i++) {
				newHandles.push(allocateEntity(pool));
			}

			// Old handles should all be invalid
			for (const h of handles) {
				expect(isEntityAlive(pool, h)).toBe(false);
			}

			// New handles should all be valid
			for (const h of newHandles) {
				expect(isEntityAlive(pool, h)).toBe(true);
			}
		});
	});

	describe('stress test', () => {
		function performRandomAllocation(
			pool: ReturnType<typeof createEntityPool>,
			liveEntities: Set<EntityHandle>,
		): void {
			const entity = allocateEntity(pool);
			liveEntities.add(entity);
		}

		function performRandomDeallocation(
			pool: ReturnType<typeof createEntityPool>,
			liveEntities: Set<EntityHandle>,
		): void {
			const entities = Array.from(liveEntities);
			const idx = Math.floor(Math.random() * entities.length);
			const entity = entities[idx];
			if (entity) {
				deallocateEntity(pool, entity);
				liveEntities.delete(entity);
			}
		}

		function verifyPoolConsistency(
			pool: ReturnType<typeof createEntityPool>,
			liveEntities: Set<EntityHandle>,
		): void {
			expect(getEntityCount(pool)).toBe(liveEntities.size);
			for (const entity of liveEntities) {
				expect(isEntityAlive(pool, entity)).toBe(true);
			}
		}

		it('handles many allocate/deallocate cycles', () => {
			const pool = createEntityPool(16);
			const liveEntities = new Set<EntityHandle>();

			for (let op = 0; op < 1000; op++) {
				const shouldAllocate = Math.random() < 0.6 || liveEntities.size === 0;
				if (shouldAllocate) {
					performRandomAllocation(pool, liveEntities);
				} else {
					performRandomDeallocation(pool, liveEntities);
				}
				verifyPoolConsistency(pool, liveEntities);
			}
		});
	});
});
