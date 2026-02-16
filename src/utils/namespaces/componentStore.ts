/**
 * Component storage utilities namespace.
 *
 * @example
 * ```typescript
 * import { componentStore } from 'blecsd/utils';
 *
 * const store = componentStore.createComponentStore({ maxEntities: 10000 });
 * const sparse = componentStore.createSparseStore({ defaultValue: 0 });
 * const report = componentStore.getComponentMemoryReport(store);
 * ```
 */

import {
	createComponentStore,
	createSparseStore,
	createTypedArrayPool,
	estimateMemoryUsage,
	getComponentMemoryReport,
	isWithinMemoryBounds,
} from '../componentStorage';

export const componentStore = Object.freeze({
	createComponentStore,
	createSparseStore,
	createTypedArrayPool,
	getComponentMemoryReport,
	estimateMemoryUsage,
	isWithinMemoryBounds,
});

export type ComponentStoreModule = typeof componentStore;
