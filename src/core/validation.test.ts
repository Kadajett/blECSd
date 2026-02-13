import { describe, expect, it } from 'vitest';
import { Position, Renderable, Velocity } from '../components';
import { addComponent, addEntity, createWorld, removeEntity } from './ecs';
import {
	createEntityValidationError,
	isEntityValid,
	isEntityValidationError,
	registerComponentName,
	validateEntity,
} from './validation';

// Register component names for better error messages
registerComponentName(Position, 'Position');
registerComponentName(Velocity, 'Velocity');
registerComponentName(Renderable, 'Renderable');

describe('validation', () => {
	describe('validateEntity', () => {
		it('passes when entity has all required components', () => {
			const world = createWorld();
			const eid = addEntity(world);
			addComponent(world, eid, Position);
			addComponent(world, eid, Velocity);

			// Should not throw
			expect(() => {
				validateEntity(world, eid, [Position, Velocity], 'testSystem');
			}).not.toThrow();
		});

		it('passes when no components are required', () => {
			const world = createWorld();
			const eid = addEntity(world);

			// Should not throw
			expect(() => {
				validateEntity(world, eid, [], 'testSystem');
			}).not.toThrow();
		});

		it('throws when entity does not exist', () => {
			const world = createWorld();
			const nonExistentEid = 999;

			expect(() => {
				validateEntity(world, nonExistentEid, [Position], 'testSystem');
			}).toThrow(/Entity 999 does not exist in the world/);

			expect(() => {
				validateEntity(world, nonExistentEid, [Position], 'testSystem');
			}).toThrow(/context: testSystem/);
		});

		it('throws when entity is missing one required component', () => {
			const world = createWorld();
			const eid = addEntity(world);
			addComponent(world, eid, Position);

			expect(() => {
				validateEntity(world, eid, [Position, Velocity], 'movementSystem');
			}).toThrow(/Entity \d+ is missing required component/);

			expect(() => {
				validateEntity(world, eid, [Position, Velocity], 'movementSystem');
			}).toThrow(/movementSystem/);

			expect(() => {
				validateEntity(world, eid, [Position, Velocity], 'movementSystem');
			}).toThrow(/Velocity/);
		});

		it('throws when entity is missing multiple required components', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(() => {
				validateEntity(world, eid, [Position, Velocity, Renderable], 'renderSystem');
			}).toThrow(/is missing required components/); // plural

			expect(() => {
				validateEntity(world, eid, [Position, Velocity, Renderable], 'renderSystem');
			}).toThrow(/renderSystem/);
		});

		it('includes helpful suggestion in error message', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(() => {
				validateEntity(world, eid, [Position], 'layoutSystem');
			}).toThrow(/Did you forget to call addComponent/);
		});

		it('handles removed entities', () => {
			const world = createWorld();
			const eid = addEntity(world);
			addComponent(world, eid, Position);
			removeEntity(world, eid);

			expect(() => {
				validateEntity(world, eid, [Position], 'testSystem');
			}).toThrow(/does not exist/);
		});

		it('includes context in error message', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(() => {
				validateEntity(world, eid, [Position], 'createBox');
			}).toThrow(/createBox/);

			expect(() => {
				validateEntity(world, eid, [Velocity], 'physicsSystem');
			}).toThrow(/physicsSystem/);
		});

		it('lists all missing components in error', () => {
			const world = createWorld();
			const eid = addEntity(world);
			addComponent(world, eid, Position);

			try {
				validateEntity(world, eid, [Position, Velocity, Renderable], 'testSystem');
				expect.fail('Should have thrown');
			} catch (error) {
				if (isEntityValidationError(error)) {
					expect(error.message).toContain('Velocity');
					expect(error.message).toContain('Renderable');
					expect(error.message).not.toContain('Position'); // This one is present
				} else {
					throw error;
				}
			}
		});

		it('uses singular "component" when only one is missing', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(() => {
				validateEntity(world, eid, [Position], 'testSystem');
			}).toThrow(/is missing required component[^s]/); // Singular, no 's'
		});

		it('uses plural "components" when multiple are missing', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(() => {
				validateEntity(world, eid, [Position, Velocity], 'testSystem');
			}).toThrow(/is missing required components/); // Plural with 's'
		});

		it('throws errors identifiable with isEntityValidationError', () => {
			const world = createWorld();
			const eid = addEntity(world);

			try {
				validateEntity(world, eid, [Position], 'testSystem');
				expect.fail('Should have thrown');
			} catch (error) {
				expect(isEntityValidationError(error)).toBe(true);
			}
		});
	});

	describe('isEntityValid', () => {
		it('returns true when entity has all required components', () => {
			const world = createWorld();
			const eid = addEntity(world);
			addComponent(world, eid, Position);
			addComponent(world, eid, Velocity);

			expect(isEntityValid(world, eid, [Position, Velocity])).toBe(true);
		});

		it('returns true when no components are required', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(isEntityValid(world, eid, [])).toBe(true);
		});

		it('returns false when entity does not exist', () => {
			const world = createWorld();
			const nonExistentEid = 999;

			expect(isEntityValid(world, nonExistentEid, [Position])).toBe(false);
		});

		it('returns false when entity is missing one required component', () => {
			const world = createWorld();
			const eid = addEntity(world);
			addComponent(world, eid, Position);

			expect(isEntityValid(world, eid, [Position, Velocity])).toBe(false);
		});

		it('returns false when entity is missing multiple required components', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(isEntityValid(world, eid, [Position, Velocity, Renderable])).toBe(false);
		});

		it('returns false for removed entities', () => {
			const world = createWorld();
			const eid = addEntity(world);
			addComponent(world, eid, Position);
			removeEntity(world, eid);

			expect(isEntityValid(world, eid, [Position])).toBe(false);
		});

		it('returns true when entity has required and additional components', () => {
			const world = createWorld();
			const eid = addEntity(world);
			addComponent(world, eid, Position);
			addComponent(world, eid, Velocity);
			addComponent(world, eid, Renderable);

			// Only checking for Position and Velocity
			expect(isEntityValid(world, eid, [Position, Velocity])).toBe(true);
		});

		it('does not throw errors', () => {
			const world = createWorld();
			const eid = addEntity(world);

			// Should not throw even with missing components
			expect(() => {
				isEntityValid(world, eid, [Position, Velocity, Renderable]);
			}).not.toThrow();

			// Should not throw even with non-existent entity
			expect(() => {
				isEntityValid(world, 999, [Position]);
			}).not.toThrow();
		});
	});

	describe('createEntityValidationError', () => {
		it('creates an instance of Error', () => {
			const error = createEntityValidationError('test message');
			expect(error).toBeInstanceOf(Error);
		});

		it('has correct name property', () => {
			const error = createEntityValidationError('test message');
			expect(error.name).toBe('EntityValidationError');
		});

		it('preserves message', () => {
			const message = 'Entity 5 is missing Position component';
			const error = createEntityValidationError(message);
			expect(error.message).toBe(message);
		});
	});

	describe('isEntityValidationError', () => {
		it('returns true for entity validation errors', () => {
			const error = createEntityValidationError('test');
			expect(isEntityValidationError(error)).toBe(true);
		});

		it('returns false for regular errors', () => {
			const error = new Error('test');
			expect(isEntityValidationError(error)).toBe(false);
		});

		it('returns false for non-error values', () => {
			expect(isEntityValidationError('not an error')).toBe(false);
			expect(isEntityValidationError(null)).toBe(false);
			expect(isEntityValidationError(undefined)).toBe(false);
			expect(isEntityValidationError(42)).toBe(false);
		});
	});
});
