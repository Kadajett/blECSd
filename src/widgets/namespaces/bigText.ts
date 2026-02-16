/**
 * BigText widget namespace.
 *
 * @example
 * ```typescript
 * import { bigText } from 'blecsd/widgets';
 * const bt = bigText.create(world, { text: 'HELLO' });
 * bigText.set(world, bt.eid, 'WORLD');
 * ```
 */
import { createBigText, isBigText, resetBigTextStore, setBigText } from '../bigText';

export const bigText = Object.freeze({
	create: createBigText,
	is: isBigText,
	set: setBigText,
	resetStore: resetBigTextStore,
});

export type BigTextModule = typeof bigText;
