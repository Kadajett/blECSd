/**
 * Box title component store.
 *
 * Shared between core entity factories and the box widget layer
 * to avoid circular dependencies.
 *
 * @module components/boxTitle
 */

import type { Entity } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Box title component data.
 */
export const BoxTitle = {
	/** Title alignment: 0=left, 1=center, 2=right */
	titleAlign: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Store for box titles (strings can't be stored in typed arrays).
 */
export const boxTitleStore = new Map<Entity, string>();

/**
 * Sets the title on a box entity.
 */
export function setBoxTitleValue(eid: Entity, title: string): void {
	boxTitleStore.set(eid, title);
}

/**
 * Gets the title of a box entity.
 */
export function getBoxTitleValue(eid: Entity): string {
	return boxTitleStore.get(eid) ?? '';
}

/**
 * Sets the title alignment on a box entity.
 * @param align - 'left' | 'center' | 'right'
 */
export function setBoxTitleAlign(eid: Entity, align: 'left' | 'center' | 'right'): void {
	const alignMap: Record<string, number> = { left: 0, center: 1, right: 2 };
	BoxTitle.titleAlign[eid] = alignMap[align] ?? 0;
}

/**
 * Clears box title data for an entity.
 */
export function clearBoxTitle(eid: Entity): void {
	BoxTitle.titleAlign[eid] = 0;
	boxTitleStore.delete(eid);
}

/**
 * Resets all box title data. Useful for testing.
 */
export function resetBoxTitleStore(): void {
	BoxTitle.titleAlign.fill(0);
	boxTitleStore.clear();
}
