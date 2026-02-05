import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../../core/ecs';
import type { Entity, World } from '../../core/types';
import { Animation3D, setAnimation3D } from '../components/animation3d';
import { setTransform3D, Transform3D } from '../components/transform3d';

// Mock getDeltaTime for testing
let mockDeltaTime = 1.0; // 1 second for simple math

vi.mock('../../core/scheduler', async () => {
	const actual = await vi.importActual('../../core/scheduler');
	return {
		...actual,
		getDeltaTime: vi.fn(() => mockDeltaTime),
	};
});

// Import after mock setup
const { animation3DSystem } = await import('./animation3dSystem');

function createTestWorld(): World {
	return createWorld();
}

function createAnimatedEntity(
	world: World,
	transformConfig?: Record<string, number>,
	animConfig?: Parameters<typeof setAnimation3D>[2],
): Entity {
	const eid = addEntity(world) as Entity;
	setTransform3D(world, eid, transformConfig ?? {});
	setAnimation3D(world, eid, animConfig ?? {});
	return eid;
}

beforeEach(() => {
	mockDeltaTime = 1.0;
	vi.clearAllMocks();
});

afterEach(() => {
	Transform3D.tx.fill(0);
	Transform3D.ty.fill(0);
	Transform3D.tz.fill(0);
	Transform3D.rx.fill(0);
	Transform3D.ry.fill(0);
	Transform3D.rz.fill(0);
	Transform3D.sx.fill(0);
	Transform3D.sy.fill(0);
	Transform3D.sz.fill(0);
	Transform3D.worldMatrix.fill(0);
	Transform3D.dirty.fill(0);
	Animation3D.rotateSpeedX.fill(0);
	Animation3D.rotateSpeedY.fill(0);
	Animation3D.rotateSpeedZ.fill(0);
	Animation3D.orbitCenterX.fill(0);
	Animation3D.orbitCenterY.fill(0);
	Animation3D.orbitCenterZ.fill(0);
	Animation3D.orbitSpeed.fill(0);
	Animation3D.orbitRadius.fill(0);
	Animation3D.orbitAngle.fill(0);
	Animation3D.orbitEnabled.fill(0);
});

describe('animation3DSystem', () => {
	it('applies Y rotation speed over 1 second', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{},
			{
				rotateSpeed: { y: Math.PI },
			},
		);

		// Clear dirty flag from setTransform3D
		Transform3D.dirty[eid] = 0;

		animation3DSystem(world);

		expect(Transform3D.ry[eid]).toBeCloseTo(Math.PI);
		expect(Transform3D.dirty[eid]).toBe(1);
	});

	it('applies X and Z rotation independently', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{},
			{
				rotateSpeed: { x: 1.0, z: 2.0 },
			},
		);

		Transform3D.dirty[eid] = 0;
		animation3DSystem(world);

		expect(Transform3D.rx[eid]).toBeCloseTo(1.0);
		expect(Transform3D.ry[eid]).toBeCloseTo(0);
		expect(Transform3D.rz[eid]).toBeCloseTo(2.0);
	});

	it('accumulates rotation over multiple frames', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{},
			{
				rotateSpeed: { y: 1.0 },
			},
		);

		mockDeltaTime = 0.5;
		animation3DSystem(world);
		expect(Transform3D.ry[eid]).toBeCloseTo(0.5);

		animation3DSystem(world);
		expect(Transform3D.ry[eid]).toBeCloseTo(1.0);
	});

	it('does nothing with zero rotation speed', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{ tx: 5 },
			{
				rotateSpeed: { x: 0, y: 0, z: 0 },
			},
		);

		Transform3D.dirty[eid] = 0;
		animation3DSystem(world);

		expect(Transform3D.rx[eid]).toBeCloseTo(0);
		expect(Transform3D.dirty[eid]).toBe(0);
	});

	it('orbits around a center point', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{},
			{
				orbitCenter: [0, 0, -5],
				orbitSpeed: Math.PI / 2, // quarter turn per second
				orbitRadius: 3,
			},
		);

		mockDeltaTime = 1.0;
		animation3DSystem(world);

		// After PI/2 radians: cos(PI/2)=0, sin(PI/2)=1
		// x = 0 + cos(PI/2)*3 = 0
		// z = -5 + sin(PI/2)*3 = -2
		expect(Transform3D.tx[eid]).toBeCloseTo(0, 1);
		expect(Transform3D.ty[eid]).toBeCloseTo(0);
		expect(Transform3D.tz[eid]).toBeCloseTo(-2, 1);
	});

	it('orbit traces a circle over full rotation', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{},
			{
				orbitCenter: [0, 0, 0],
				orbitSpeed: Math.PI / 2,
				orbitRadius: 5,
			},
		);

		// At angle 0 (start): x=5, z=0
		mockDeltaTime = 0;
		animation3DSystem(world);

		// Quarter turn
		mockDeltaTime = 1.0;
		animation3DSystem(world);
		const x1 = Transform3D.tx[eid] as number;
		const z1 = Transform3D.tz[eid] as number;
		const dist1 = Math.sqrt(x1 * x1 + z1 * z1);
		expect(dist1).toBeCloseTo(5, 1);
	});

	it('sets dirty flag when orbiting', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{},
			{
				orbitCenter: [0, 0, 0],
				orbitSpeed: 1,
				orbitRadius: 5,
			},
		);

		Transform3D.dirty[eid] = 0;
		animation3DSystem(world);

		expect(Transform3D.dirty[eid]).toBe(1);
	});

	it('does nothing with zero delta time', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{},
			{
				rotateSpeed: { y: Math.PI },
			},
		);

		Transform3D.dirty[eid] = 0;
		mockDeltaTime = 0;
		animation3DSystem(world);

		expect(Transform3D.ry[eid]).toBeCloseTo(0);
		expect(Transform3D.dirty[eid]).toBe(0);
	});

	it('handles negative rotation speed', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{},
			{
				rotateSpeed: { y: -Math.PI },
			},
		);

		animation3DSystem(world);

		expect(Transform3D.ry[eid]).toBeCloseTo(-Math.PI);
	});

	it('preserves existing rotation when adding speed', () => {
		const world = createTestWorld();
		const eid = createAnimatedEntity(
			world,
			{ ry: 1.0 },
			{
				rotateSpeed: { y: 0.5 },
			},
		);

		animation3DSystem(world);

		expect(Transform3D.ry[eid]).toBeCloseTo(1.5);
	});
});
