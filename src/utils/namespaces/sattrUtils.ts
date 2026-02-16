/**
 * Style attribute encoding utilities namespace.
 *
 * @example
 * ```typescript
 * import { sattrUtils } from 'blecsd/utils';
 *
 * const attr = sattrUtils.sattr({ fg: 0xffffff, bg: 0x000000, bold: true });
 * const encoded = sattrUtils.encodeStyleAttr(attr);
 * const decoded = sattrUtils.decodeStyleAttr(encoded);
 * const merged = sattrUtils.sattrMerge(attr1, attr2);
 * ```
 */

import {
	AttrFlags,
	attrsToStyle,
	decodeStyleAttr,
	encodeStyleAttr,
	sattr,
	sattrAddFlag,
	sattrCopy,
	sattrEmpty,
	sattrEqual,
	sattrFromStyleData,
	sattrHasFlag,
	sattrInvert,
	sattrMerge,
	sattrRemoveFlag,
	styleToAttrs,
} from '../sattr';

export const sattrUtils = Object.freeze({
	sattr,
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

export type SattrUtilsModule = typeof sattrUtils;
