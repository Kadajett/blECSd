/**
 * Footer widget namespace.
 *
 * @example
 * ```typescript
 * import { footer } from 'blecsd/widgets';
 * const f = footer.create(world, { text: 'Status: Ready', align: 'left' });
 * ```
 */
import { createFooter } from '../footer';

export const footer = Object.freeze({
	create: createFooter,
});

export type FooterModule = typeof footer;
