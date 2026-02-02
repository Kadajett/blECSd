import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { World } from '../core/types';
import {
	Animation,
	AnimationDirection,
	animationStore,
	getAnimation,
	getAnimationByName,
	getAnimationData,
	getAnimationIdByName,
	getEntityAnimation,
	hasAnimation,
	isAnimationPlaying,
	pauseAnimation,
	playAnimation,
	playAnimationByName,
	registerAnimation,
	removeAnimation,
	resetAnimationStore,
	resumeAnimation,
	setAnimationDirection,
	setAnimationLoop,
	setAnimationSpeed,
	stopAnimation,
	unregisterAnimation,
	updateAnimationEntity,
} from './animation';
import { registerSprite, resetSpriteStore, Sprite, setSprite } from './sprite';

describe('animation', () => {
	let world: World;
	let spriteId: number;

	beforeEach(() => {
		world = createWorld();
		resetAnimationStore();
		resetSpriteStore();

		// Register a test sprite with 4 frames
		spriteId = registerSprite({
			name: 'test-sprite',
			frames: [[[{ char: '0' }]], [[{ char: '1' }]], [[{ char: '2' }]], [[{ char: '3' }]]],
		});
	});

	describe('animationStore', () => {
		it('starts empty', () => {
			expect(animationStore.animations.size).toBe(0);
			expect(animationStore.nameToId.size).toBe(0);
		});

		it('resets correctly', () => {
			registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			expect(animationStore.animations.size).toBe(1);

			resetAnimationStore();
			expect(animationStore.animations.size).toBe(0);
			expect(animationStore.nameToId.size).toBe(0);
		});
	});

	describe('registerAnimation', () => {
		it('registers an animation and returns an ID', () => {
			const id = registerAnimation({
				name: 'walk',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});

			expect(id).toBeGreaterThan(0);
			expect(animationStore.animations.has(id)).toBe(true);
		});

		it('assigns unique IDs', () => {
			const id1 = registerAnimation({
				name: 'anim1',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const id2 = registerAnimation({
				name: 'anim2',
				frames: [{ frameIndex: 1, duration: 0.1 }],
			});

			expect(id1).not.toBe(id2);
		});

		it('calculates total duration', () => {
			const id = registerAnimation({
				name: 'timed',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.2 },
					{ frameIndex: 2, duration: 0.15 },
				],
			});

			const anim = getAnimation(id);
			expect(anim?.totalDuration).toBeCloseTo(0.45);
		});

		it('maps name to ID', () => {
			const id = registerAnimation({
				name: 'named-anim',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});

			expect(animationStore.nameToId.get('named-anim')).toBe(id);
		});
	});

	describe('getAnimation', () => {
		it('returns animation by ID', () => {
			const id = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});

			const anim = getAnimation(id);
			expect(anim).toBeDefined();
			expect(anim?.name).toBe('test');
			expect(anim?.id).toBe(id);
		});

		it('returns undefined for invalid ID', () => {
			expect(getAnimation(999)).toBeUndefined();
		});
	});

	describe('getAnimationByName', () => {
		it('returns animation by name', () => {
			registerAnimation({
				name: 'walk',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});

			const anim = getAnimationByName('walk');
			expect(anim).toBeDefined();
			expect(anim?.name).toBe('walk');
		});

		it('returns undefined for unknown name', () => {
			expect(getAnimationByName('nonexistent')).toBeUndefined();
		});
	});

	describe('getAnimationIdByName', () => {
		it('returns ID for known name', () => {
			const id = registerAnimation({
				name: 'idle',
				frames: [{ frameIndex: 0, duration: 0.5 }],
			});

			expect(getAnimationIdByName('idle')).toBe(id);
		});

		it('returns undefined for unknown name', () => {
			expect(getAnimationIdByName('unknown')).toBeUndefined();
		});
	});

	describe('unregisterAnimation', () => {
		it('removes animation from store', () => {
			const id = registerAnimation({
				name: 'temp',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});

			expect(unregisterAnimation(id)).toBe(true);
			expect(getAnimation(id)).toBeUndefined();
			expect(getAnimationByName('temp')).toBeUndefined();
		});

		it('returns false for unknown ID', () => {
			expect(unregisterAnimation(999)).toBe(false);
		});
	});

	describe('Animation component', () => {
		it('has typed arrays for all fields', () => {
			expect(Animation.animationId).toBeInstanceOf(Uint32Array);
			expect(Animation.playing).toBeInstanceOf(Uint8Array);
			expect(Animation.loop).toBeInstanceOf(Uint8Array);
			expect(Animation.speed).toBeInstanceOf(Float32Array);
			expect(Animation.elapsed).toBeInstanceOf(Float32Array);
			expect(Animation.currentFrameIndex).toBeInstanceOf(Uint16Array);
			expect(Animation.direction).toBeInstanceOf(Int8Array);
		});
	});

	describe('playAnimation', () => {
		it('starts playing an animation', () => {
			const animId = registerAnimation({
				name: 'walk',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			const result = playAnimation(world, eid, animId);

			expect(result).toBe(eid);
			expect(hasAnimation(world, eid)).toBe(true);
			expect(isAnimationPlaying(world, eid)).toBe(true);
		});

		it('sets default options', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			playAnimation(world, eid, animId);

			expect(Animation.loop[eid]).toBe(1);
			expect(Animation.speed[eid]).toBe(1.0);
			expect(Animation.direction[eid]).toBe(AnimationDirection.FORWARD);
			expect(Animation.currentFrameIndex[eid]).toBe(0);
			expect(Animation.elapsed[eid]).toBe(0);
		});

		it('accepts custom options', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			playAnimation(world, eid, animId, {
				loop: false,
				speed: 2.0,
				direction: AnimationDirection.REVERSE,
				startFrame: 1,
			});

			expect(Animation.loop[eid]).toBe(0);
			expect(Animation.speed[eid]).toBe(2.0);
			expect(Animation.direction[eid]).toBe(AnimationDirection.REVERSE);
			expect(Animation.currentFrameIndex[eid]).toBe(1);
		});

		it('sets sprite frame to initial animation frame', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 2, duration: 0.1 },
					{ frameIndex: 3, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			playAnimation(world, eid, animId);

			expect(Sprite.frameIndex[eid]).toBe(2);
		});

		it('returns undefined for invalid animation ID', () => {
			const eid = addEntity(world);
			const result = playAnimation(world, eid, 999);

			expect(result).toBeUndefined();
			expect(hasAnimation(world, eid)).toBe(false);
		});

		it('clamps startFrame to valid range', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);

			playAnimation(world, eid, animId, { startFrame: 99 });

			expect(Animation.currentFrameIndex[eid]).toBe(1); // Last frame
		});
	});

	describe('playAnimationByName', () => {
		it('plays animation by name', () => {
			registerAnimation({
				name: 'run',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);

			const result = playAnimationByName(world, eid, 'run');

			expect(result).toBe(eid);
			expect(isAnimationPlaying(world, eid)).toBe(true);
		});

		it('returns undefined for unknown name', () => {
			const eid = addEntity(world);
			const result = playAnimationByName(world, eid, 'unknown');

			expect(result).toBeUndefined();
		});
	});

	describe('stopAnimation', () => {
		it('stops a playing animation', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);

			stopAnimation(world, eid);

			expect(isAnimationPlaying(world, eid)).toBe(false);
			expect(Animation.currentFrameIndex[eid]).toBe(0);
			expect(Animation.elapsed[eid]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			expect(stopAnimation(world, eid)).toBe(eid);
		});
	});

	describe('pauseAnimation', () => {
		it('pauses without resetting position', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId, { startFrame: 1 });
			Animation.elapsed[eid] = 0.05;

			pauseAnimation(world, eid);

			expect(isAnimationPlaying(world, eid)).toBe(false);
			expect(Animation.currentFrameIndex[eid]).toBe(1);
			expect(Animation.elapsed[eid]).toBeCloseTo(0.05);
		});
	});

	describe('resumeAnimation', () => {
		it('resumes a paused animation', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);
			pauseAnimation(world, eid);

			resumeAnimation(world, eid);

			expect(isAnimationPlaying(world, eid)).toBe(true);
		});
	});

	describe('getAnimationData', () => {
		it('returns animation data', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId, { speed: 1.5, loop: false });
			Animation.elapsed[eid] = 0.05;

			const data = getAnimationData(world, eid);

			expect(data).toBeDefined();
			expect(data?.animationId).toBe(animId);
			expect(data?.playing).toBe(true);
			expect(data?.loop).toBe(false);
			expect(data?.speed).toBe(1.5);
			expect(data?.elapsed).toBeCloseTo(0.05);
			expect(data?.currentFrameIndex).toBe(0);
			expect(data?.direction).toBe(AnimationDirection.FORWARD);
		});

		it('returns undefined for entity without animation', () => {
			const eid = addEntity(world);
			expect(getAnimationData(world, eid)).toBeUndefined();
		});
	});

	describe('isAnimationPlaying', () => {
		it('returns true when playing', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);

			expect(isAnimationPlaying(world, eid)).toBe(true);
		});

		it('returns false when stopped', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);
			stopAnimation(world, eid);

			expect(isAnimationPlaying(world, eid)).toBe(false);
		});

		it('returns false for entity without animation', () => {
			const eid = addEntity(world);
			expect(isAnimationPlaying(world, eid)).toBe(false);
		});
	});

	describe('hasAnimation', () => {
		it('returns true for entity with animation', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);

			expect(hasAnimation(world, eid)).toBe(true);
		});

		it('returns false for entity without animation', () => {
			const eid = addEntity(world);
			expect(hasAnimation(world, eid)).toBe(false);
		});
	});

	describe('setAnimationSpeed', () => {
		it('sets the animation speed', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);

			setAnimationSpeed(world, eid, 2.5);

			expect(Animation.speed[eid]).toBe(2.5);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			expect(setAnimationSpeed(world, eid, 1.0)).toBe(eid);
		});
	});

	describe('setAnimationLoop', () => {
		it('sets the loop flag', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId, { loop: true });

			setAnimationLoop(world, eid, false);

			expect(Animation.loop[eid]).toBe(0);
		});
	});

	describe('setAnimationDirection', () => {
		it('sets the direction', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);

			setAnimationDirection(world, eid, AnimationDirection.REVERSE);

			expect(Animation.direction[eid]).toBe(AnimationDirection.REVERSE);
		});
	});

	describe('getEntityAnimation', () => {
		it('returns the animation definition', () => {
			const animId = registerAnimation({
				name: 'walk',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);

			const anim = getEntityAnimation(world, eid);

			expect(anim).toBeDefined();
			expect(anim?.name).toBe('walk');
		});

		it('returns undefined for entity without animation', () => {
			const eid = addEntity(world);
			expect(getEntityAnimation(world, eid)).toBeUndefined();
		});
	});

	describe('removeAnimation', () => {
		it('clears animation data from entity', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);

			removeAnimation(world, eid);

			expect(Animation.animationId[eid]).toBe(0);
			expect(Animation.playing[eid]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const eid = addEntity(world);
			expect(removeAnimation(world, eid)).toBe(eid);
		});
	});

	describe('updateAnimationEntity', () => {
		it('advances elapsed time', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.2 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);

			updateAnimationEntity(world, eid, 0.05);

			expect(Animation.elapsed[eid]).toBeCloseTo(0.05);
		});

		it('advances to next frame when duration exceeded', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);
			playAnimation(world, eid, animId);

			updateAnimationEntity(world, eid, 0.15);

			expect(Animation.currentFrameIndex[eid]).toBe(1);
			expect(Sprite.frameIndex[eid]).toBe(1);
		});

		it('loops forward animation', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId, { loop: true, startFrame: 1 });

			updateAnimationEntity(world, eid, 0.15);

			expect(Animation.currentFrameIndex[eid]).toBe(0); // Wrapped
			expect(isAnimationPlaying(world, eid)).toBe(true);
		});

		it('stops non-looping animation at end', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId, { loop: false, startFrame: 1 });

			const completed = updateAnimationEntity(world, eid, 0.15);

			expect(completed).toBe(true);
			expect(isAnimationPlaying(world, eid)).toBe(false);
			expect(Animation.currentFrameIndex[eid]).toBe(1); // Stays on last frame
		});

		it('handles reverse direction', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId, {
				direction: AnimationDirection.REVERSE,
				startFrame: 1,
			});

			updateAnimationEntity(world, eid, 0.15);

			expect(Animation.currentFrameIndex[eid]).toBe(0);
		});

		it('loops reverse animation', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId, {
				loop: true,
				direction: AnimationDirection.REVERSE,
				startFrame: 0,
			});

			updateAnimationEntity(world, eid, 0.15);

			expect(Animation.currentFrameIndex[eid]).toBe(1); // Wrapped to end
		});

		it('respects speed multiplier', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);
			playAnimation(world, eid, animId, { speed: 2.0 });

			// At 2x speed, 0.075s real time = 0.15s animation time
			updateAnimationEntity(world, eid, 0.075);

			expect(Animation.currentFrameIndex[eid]).toBe(1);
		});

		it('skips non-playing animations', () => {
			const animId = registerAnimation({
				name: 'test',
				frames: [{ frameIndex: 0, duration: 0.1 }],
			});
			const eid = addEntity(world);
			playAnimation(world, eid, animId);
			pauseAnimation(world, eid);
			const elapsed = Animation.elapsed[eid];

			updateAnimationEntity(world, eid, 0.05);

			expect(Animation.elapsed[eid]).toBe(elapsed); // Unchanged
		});

		it('returns false for entity without animation', () => {
			const eid = addEntity(world);
			expect(updateAnimationEntity(world, eid, 0.1)).toBe(false);
		});
	});

	describe('AnimationDirection enum', () => {
		it('has correct values', () => {
			expect(AnimationDirection.FORWARD).toBe(1);
			expect(AnimationDirection.REVERSE).toBe(-1);
		});
	});

	describe('complex animation scenarios', () => {
		it('plays multi-frame animation cycle', () => {
			const animId = registerAnimation({
				name: 'walk-cycle',
				frames: [
					{ frameIndex: 0, duration: 0.1 },
					{ frameIndex: 1, duration: 0.1 },
					{ frameIndex: 2, duration: 0.1 },
					{ frameIndex: 3, duration: 0.1 },
				],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);
			playAnimation(world, eid, animId, { loop: true });

			// Play through one full cycle
			for (let i = 0; i < 4; i++) {
				expect(Animation.currentFrameIndex[eid]).toBe(i);
				updateAnimationEntity(world, eid, 0.11);
			}

			// Should have looped back to 0
			expect(Animation.currentFrameIndex[eid]).toBe(0);
		});

		it('handles varying frame durations', () => {
			const animId = registerAnimation({
				name: 'attack',
				frames: [
					{ frameIndex: 0, duration: 0.05 }, // Quick
					{ frameIndex: 1, duration: 0.2 }, // Slow
					{ frameIndex: 2, duration: 0.05 }, // Quick
				],
			});
			const eid = addEntity(world);
			setSprite(world, eid, spriteId);
			playAnimation(world, eid, animId, { loop: false });

			// First frame passes quickly
			updateAnimationEntity(world, eid, 0.06);
			expect(Animation.currentFrameIndex[eid]).toBe(1);

			// Second frame takes longer
			updateAnimationEntity(world, eid, 0.1);
			expect(Animation.currentFrameIndex[eid]).toBe(1); // Still on frame 1

			updateAnimationEntity(world, eid, 0.15);
			expect(Animation.currentFrameIndex[eid]).toBe(2);

			// Animation completes
			updateAnimationEntity(world, eid, 0.1);
			expect(isAnimationPlaying(world, eid)).toBe(false);
		});
	});
});
