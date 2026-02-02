import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { getCameraPosition, setCamera, setCameraTarget } from '../components/camera';
import { setPosition } from '../components/position';
import { cameraSystem, queryCameras, updateCameras } from './cameraSystem';

describe('Camera System', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('queryCameras', () => {
		it('should return empty array for world with no cameras', () => {
			const result = queryCameras(world);
			expect(result).toEqual([]);
		});

		it('should return entities with cameras', () => {
			const c1 = addEntity(world);
			const c2 = addEntity(world);
			const e3 = addEntity(world);
			setCamera(world, c1);
			setCamera(world, c2);

			const result = queryCameras(world);
			expect(result).toContain(c1);
			expect(result).toContain(c2);
			expect(result).not.toContain(e3);
		});
	});

	describe('cameraSystem', () => {
		it('should return the world', () => {
			const result = cameraSystem(world);
			expect(result).toBe(world);
		});

		it('should update camera following target', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });
			setPosition(world, target, 100, 50);
			setCameraTarget(world, camera, target, 0);

			cameraSystem(world);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(60); // 100 - 40
			expect(pos?.y).toBe(38); // 50 - 12
		});

		it('should update multiple cameras', () => {
			const cam1 = addEntity(world);
			const cam2 = addEntity(world);
			const target1 = addEntity(world);
			const target2 = addEntity(world);

			setCamera(world, cam1, { x: 0, y: 0, width: 80, height: 24 });
			setCamera(world, cam2, { x: 0, y: 0, width: 80, height: 24 });
			setPosition(world, target1, 100, 50);
			setPosition(world, target2, 200, 100);
			setCameraTarget(world, cam1, target1, 0);
			setCameraTarget(world, cam2, target2, 0);

			cameraSystem(world);

			const pos1 = getCameraPosition(world, cam1);
			const pos2 = getCameraPosition(world, cam2);
			expect(pos1?.x).toBe(60);
			expect(pos2?.x).toBe(160);
		});

		it('should handle cameras without targets', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 10, y: 20 });

			cameraSystem(world);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});
	});

	describe('updateCameras', () => {
		it('should update all cameras with given delta time', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });
			setPosition(world, target, 100, 50);
			setCameraTarget(world, camera, target, 0);

			updateCameras(world, 0.016);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(60);
			expect(pos?.y).toBe(38);
		});
	});
});
