/**
 * Sprite component namespace.
 *
 * Provides all operations for sprite sheets and sprite frame management.
 *
 * @example
 * ```typescript
 * import { sprite } from 'blecsd/components';
 * sprite.register({ name: 'player', frames: [...] });
 * sprite.set(world, eid, spriteId);
 * sprite.nextFrame(world, eid);
 * ```
 */
import {
	getCurrentFrame,
	getEntitySpriteSheet,
	getSprite,
	getSpriteIdByName,
	getSpriteSheet,
	getSpriteSheetByName,
	hasSprite,
	nextFrame,
	prevFrame,
	registerSprite,
	removeSprite,
	resetSpriteStore,
	setFrame,
	setSprite,
	setSpriteByName,
	unregisterSprite,
} from '../sprite';

export const sprite = Object.freeze({
	get: getSprite,
	has: hasSprite,
	set: setSprite,
	setByName: setSpriteByName,
	remove: removeSprite,

	register: registerSprite,
	unregister: unregisterSprite,
	getIdByName: getSpriteIdByName,

	sheet: Object.freeze({
		get: getSpriteSheet,
		getByName: getSpriteSheetByName,
		getForEntity: getEntitySpriteSheet,
	}),

	frame: Object.freeze({
		getCurrent: getCurrentFrame,
		set: setFrame,
		next: nextFrame,
		prev: prevFrame,
	}),

	resetStore: resetSpriteStore,
});

export type SpriteModule = typeof sprite;
