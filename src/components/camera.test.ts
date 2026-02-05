import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import {
	centerCameraOn,
	clearCameraBounds,
	DEFAULT_VIEWPORT_HEIGHT,
	DEFAULT_VIEWPORT_WIDTH,
	getCamera,
	getCameraPosition,
	getCameraTarget,
	hasCamera,
	isAreaInView,
	isCameraBounded,
	isFollowingTarget,
	isInView,
	moveCameraBy,
	removeCamera,
	screenToWorld,
	setCamera,
	setCameraBounds,
	setCameraDeadZone,
	setCameraPosition,
	setCameraTarget,
	updateCameraFollow,
	worldToScreen,
} from './camera';
import { setPosition } from './position';

describe('Camera Component', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('setCamera', () => {
		it('should add camera with default values', () => {
			const eid = addEntity(world);
			setCamera(world, eid);

			const data = getCamera(world, eid);
			expect(data).toBeDefined();
			expect(data?.x).toBe(0);
			expect(data?.y).toBe(0);
			expect(data?.width).toBe(DEFAULT_VIEWPORT_WIDTH);
			expect(data?.height).toBe(DEFAULT_VIEWPORT_HEIGHT);
			expect(data?.followTarget).toBe(0);
			expect(data?.smoothing).toBe(0);
			expect(data?.deadZoneX).toBe(0);
			expect(data?.deadZoneY).toBe(0);
			expect(data?.bounded).toBe(false);
		});

		it('should set camera with custom options', () => {
			const eid = addEntity(world);
			setCamera(world, eid, {
				x: 10,
				y: 20,
				width: 100,
				height: 50,
				smoothing: 0.5,
			});

			const data = getCamera(world, eid);
			expect(data?.x).toBe(10);
			expect(data?.y).toBe(20);
			expect(data?.width).toBe(100);
			expect(data?.height).toBe(50);
			expect(data?.smoothing).toBe(0.5);
		});

		it('should clamp smoothing to 0-1 range', () => {
			const eid = addEntity(world);
			setCamera(world, eid, { smoothing: 2 });
			expect(getCamera(world, eid)?.smoothing).toBe(1);

			setCamera(world, eid, { smoothing: -1 });
			expect(getCamera(world, eid)?.smoothing).toBe(0);
		});

		it('should return entity for chaining', () => {
			const eid = addEntity(world);
			const result = setCamera(world, eid);
			expect(result).toBe(eid);
		});
	});

	describe('getCamera', () => {
		it('should return undefined for entity without camera', () => {
			const eid = addEntity(world);
			expect(getCamera(world, eid)).toBeUndefined();
		});

		it('should return camera data', () => {
			const eid = addEntity(world);
			setCamera(world, eid, { x: 5, y: 10 });

			const data = getCamera(world, eid);
			expect(data?.x).toBe(5);
			expect(data?.y).toBe(10);
		});
	});

	describe('hasCamera', () => {
		it('should return false for entity without camera', () => {
			const eid = addEntity(world);
			expect(hasCamera(world, eid)).toBe(false);
		});

		it('should return true for entity with camera', () => {
			const eid = addEntity(world);
			setCamera(world, eid);
			expect(hasCamera(world, eid)).toBe(true);
		});
	});

	describe('removeCamera', () => {
		it('should remove camera from entity', () => {
			const eid = addEntity(world);
			setCamera(world, eid);
			expect(hasCamera(world, eid)).toBe(true);

			removeCamera(world, eid);
			expect(hasCamera(world, eid)).toBe(false);
		});

		it('should handle removing non-existent camera', () => {
			const eid = addEntity(world);
			expect(() => removeCamera(world, eid)).not.toThrow();
		});
	});
});

describe('Camera Target', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('setCameraTarget', () => {
		it('should set follow target', () => {
			const camera = addEntity(world);
			const target = addEntity(world);
			setCamera(world, camera);

			setCameraTarget(world, camera, target);

			expect(getCameraTarget(world, camera)).toBe(target);
		});

		it('should set smoothing when provided', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCameraTarget(world, camera, target, 0.3);

			expect(getCamera(world, camera)?.smoothing).toBeCloseTo(0.3);
		});

		it('should create camera if not present', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCameraTarget(world, camera, target);

			expect(hasCamera(world, camera)).toBe(true);
		});
	});

	describe('getCameraTarget', () => {
		it('should return 0 for entity without camera', () => {
			const eid = addEntity(world);
			expect(getCameraTarget(world, eid)).toBe(0);
		});

		it('should return target entity', () => {
			const camera = addEntity(world);
			const target = addEntity(world);
			setCameraTarget(world, camera, target);

			expect(getCameraTarget(world, camera)).toBe(target);
		});
	});

	describe('isFollowingTarget', () => {
		it('should return false when no target', () => {
			const camera = addEntity(world);
			setCamera(world, camera);

			expect(isFollowingTarget(world, camera)).toBe(false);
		});

		it('should return true when following target', () => {
			const camera = addEntity(world);
			const target = addEntity(world);
			setCameraTarget(world, camera, target);

			expect(isFollowingTarget(world, camera)).toBe(true);
		});
	});

	describe('setCameraDeadZone', () => {
		it('should set dead zone', () => {
			const camera = addEntity(world);
			setCameraDeadZone(world, camera, 10, 5);

			const data = getCamera(world, camera);
			expect(data?.deadZoneX).toBe(10);
			expect(data?.deadZoneY).toBe(5);
		});
	});
});

describe('Camera Bounds', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('setCameraBounds', () => {
		it('should set camera bounds', () => {
			const camera = addEntity(world);
			setCamera(world, camera);

			setCameraBounds(world, camera, {
				minX: 0,
				maxX: 200,
				minY: 0,
				maxY: 100,
			});

			const data = getCamera(world, camera);
			expect(data?.bounded).toBe(true);
			expect(data?.minX).toBe(0);
			expect(data?.maxX).toBe(200);
			expect(data?.minY).toBe(0);
			expect(data?.maxY).toBe(100);
		});
	});

	describe('clearCameraBounds', () => {
		it('should clear bounds', () => {
			const camera = addEntity(world);
			setCameraBounds(world, camera, { minX: 0, maxX: 100, minY: 0, maxY: 100 });
			expect(isCameraBounded(world, camera)).toBe(true);

			clearCameraBounds(world, camera);
			expect(isCameraBounded(world, camera)).toBe(false);
		});
	});

	describe('isCameraBounded', () => {
		it('should return false for unbounded camera', () => {
			const camera = addEntity(world);
			setCamera(world, camera);
			expect(isCameraBounded(world, camera)).toBe(false);
		});

		it('should return true for bounded camera', () => {
			const camera = addEntity(world);
			setCameraBounds(world, camera, { minX: 0, maxX: 100, minY: 0, maxY: 100 });
			expect(isCameraBounded(world, camera)).toBe(true);
		});
	});
});

describe('Camera Position', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('setCameraPosition', () => {
		it('should set camera position', () => {
			const camera = addEntity(world);
			setCamera(world, camera);

			setCameraPosition(world, camera, 50, 25);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(50);
			expect(pos?.y).toBe(25);
		});

		it('should respect bounds', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { width: 80, height: 24 });
			setCameraBounds(world, camera, { minX: 0, maxX: 100, minY: 0, maxY: 50 });

			// Try to move camera beyond bounds
			setCameraPosition(world, camera, 50, 50); // maxX - width = 20, maxY - height = 26

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(20); // Clamped to maxX - width
			expect(pos?.y).toBe(26); // Clamped to maxY - height
		});
	});

	describe('getCameraPosition', () => {
		it('should return undefined for entity without camera', () => {
			const eid = addEntity(world);
			expect(getCameraPosition(world, eid)).toBeUndefined();
		});
	});

	describe('moveCameraBy', () => {
		it('should move camera by delta', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 10, y: 20 });

			moveCameraBy(world, camera, 5, -3);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(17);
		});

		it('should respect bounds', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });
			setCameraBounds(world, camera, { minX: 0, maxX: 100, minY: 0, maxY: 50 });

			moveCameraBy(world, camera, -10, -10);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(0); // Clamped to minX
			expect(pos?.y).toBe(0); // Clamped to minY
		});
	});

	describe('centerCameraOn', () => {
		it('should center camera on position', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { width: 80, height: 24 });

			centerCameraOn(world, camera, 100, 50);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(60); // 100 - 80/2
			expect(pos?.y).toBe(38); // 50 - 24/2
		});
	});
});

describe('Coordinate Conversion', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('worldToScreen', () => {
		it('should convert world to screen coordinates', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 100, y: 50 });

			const screen = worldToScreen(world, camera, 120, 60);
			expect(screen?.x).toBe(20); // 120 - 100
			expect(screen?.y).toBe(10); // 60 - 50
		});

		it('should return undefined for entity without camera', () => {
			const eid = addEntity(world);
			expect(worldToScreen(world, eid, 0, 0)).toBeUndefined();
		});
	});

	describe('screenToWorld', () => {
		it('should convert screen to world coordinates', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 100, y: 50 });

			const world_ = screenToWorld(world, camera, 20, 10);
			expect(world_?.x).toBe(120); // 20 + 100
			expect(world_?.y).toBe(60); // 10 + 50
		});

		it('should return undefined for entity without camera', () => {
			const eid = addEntity(world);
			expect(screenToWorld(world, eid, 0, 0)).toBeUndefined();
		});
	});

	describe('isInView', () => {
		it('should return true for position in view', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });

			expect(isInView(world, camera, 40, 12)).toBe(true);
		});

		it('should return false for position outside view', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });

			expect(isInView(world, camera, 100, 12)).toBe(false);
			expect(isInView(world, camera, 40, 30)).toBe(false);
			expect(isInView(world, camera, -1, 12)).toBe(false);
		});

		it('should return false for entity without camera', () => {
			const eid = addEntity(world);
			expect(isInView(world, eid, 0, 0)).toBe(false);
		});
	});

	describe('isAreaInView', () => {
		it('should return true for overlapping area', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });

			// Area that overlaps with viewport
			expect(isAreaInView(world, camera, 70, 20, 20, 10)).toBe(true);
		});

		it('should return false for non-overlapping area', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });

			// Area completely outside viewport
			expect(isAreaInView(world, camera, 100, 30, 10, 10)).toBe(false);
		});

		it('should return true for contained area', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });

			// Area completely inside viewport
			expect(isAreaInView(world, camera, 10, 5, 20, 10)).toBe(true);
		});
	});
});

describe('Camera Follow', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe('updateCameraFollow', () => {
		it('should follow target with no smoothing', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCamera(world, camera, { width: 80, height: 24 });
			setPosition(world, target, 100, 50);
			setCameraTarget(world, camera, target, 0);

			updateCameraFollow(world, camera, 0.016);

			const pos = getCameraPosition(world, camera);
			// Camera should center on target: (100 - 40, 50 - 12) = (60, 38)
			expect(pos?.x).toBe(60);
			expect(pos?.y).toBe(38);
		});

		it('should not move if no target', () => {
			const camera = addEntity(world);
			setCamera(world, camera, { x: 10, y: 20 });

			updateCameraFollow(world, camera, 0.016);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('should not move if target has no position', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCamera(world, camera, { x: 10, y: 20 });
			setCameraTarget(world, camera, target);

			updateCameraFollow(world, camera, 0.016);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('should respect dead zone', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });
			setPosition(world, target, 45, 14); // Near center (40, 12)
			setCameraTarget(world, camera, target, 0);
			setCameraDeadZone(world, camera, 10, 5);

			updateCameraFollow(world, camera, 0.016);

			// Target is within dead zone, camera shouldn't move
			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(0);
			expect(pos?.y).toBe(0);
		});

		it('should move when target leaves dead zone', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });
			setPosition(world, target, 60, 12); // Outside dead zone in X
			setCameraTarget(world, camera, target, 0);
			setCameraDeadZone(world, camera, 10, 5);

			updateCameraFollow(world, camera, 0.016);

			// Camera should move towards target
			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBeGreaterThan(0);
		});

		it('should respect bounds', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCamera(world, camera, { width: 80, height: 24 });
			setCameraBounds(world, camera, { minX: 0, maxX: 100, minY: 0, maxY: 50 });
			setPosition(world, target, 10, 10); // Would center at (-30, -2)
			setCameraTarget(world, camera, target, 0);

			updateCameraFollow(world, camera, 0.016);

			const pos = getCameraPosition(world, camera);
			expect(pos?.x).toBe(0); // Clamped to minX
			expect(pos?.y).toBe(0); // Clamped to minY
		});

		it('should apply smoothing', () => {
			const camera = addEntity(world);
			const target = addEntity(world);

			setCamera(world, camera, { x: 0, y: 0, width: 80, height: 24 });
			setPosition(world, target, 100, 50);
			setCameraTarget(world, camera, target, 0.9); // High smoothing

			updateCameraFollow(world, camera, 0.016);

			const pos = getCameraPosition(world, camera);
			// With smoothing, camera shouldn't reach target immediately
			expect(pos?.x).toBeGreaterThan(0);
			expect(pos?.x).toBeLessThan(60); // Less than instant follow position
		});
	});
});
