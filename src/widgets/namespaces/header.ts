/**
 * Header widget namespace.
 *
 * @example
 * ```typescript
 * import { header } from 'blecsd/widgets';
 * const h = header.create(world, { text: 'My App', align: 'center' });
 * ```
 */
import { createHeader } from '../header';

export const header = Object.freeze({
	create: createHeader,
});

export type HeaderModule = typeof header;
