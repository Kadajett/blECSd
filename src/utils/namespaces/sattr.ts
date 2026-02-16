/**
 * Style attribute encoding utilities namespace.
 *
 * @example
 * ```typescript
 * import { sattr } from 'blecsd/utils';
 *
 * const attr = sattr.sattr({ fg: 0xffffff, bg: 0x000000, bold: true });
 * const encoded = sattr.encodeStyleAttr(attr);
 * const decoded = sattr.decodeStyleAttr(encoded);
 * const merged = sattr.sattrMerge(attr1, attr2);
 * ```
 */

import {
	AttrFlags,
	attrsToStyle,
	decodeStyleAttr,
	encodeStyleAttr,
	sattrAddFlag,
	sattrCopy,
	sattrEmpty,
	sattrEqual,
	sattr as sattrFn,
	sattrFromStyleData,
	sattrHasFlag,
	sattrInvert,
	sattrMerge,
	sattrRemoveFlag,
	styleToAttrs,
} from '../sattr';

export const sattr = Object.freeze({
	create: sattrFn,
	encodeStyleAttr,
	decodeStyleAttr,
	sattrMerge,
	sattrEqual,
	sattrInvert,
	sattrCopy,
	sattrEmpty,
	sattrAddFlag,
	sattrRemoveFlag,
	sattrHasFlag,
	sattrFromStyleData,
	attrsToStyle,
	styleToAttrs,
	AttrFlags,
});

export type SattrModule = typeof sattr;
