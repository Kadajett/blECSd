/**
 * ANSI module exports
 *
 * @module terminal/ansi
 * @internal
 */

// Parser exports
export type { Attribute, InternalColor } from './parser';
export {
	AttributeSchema,
	applySgrCodes,
	attrCode,
	attributesEqual,
	ColorType,
	cloneAttribute,
	createAttribute,
	DEFAULT_ATTRIBUTE,
	extractSgrCodes,
	hasStyle,
	packRgb,
	parseSgrString,
	stripAnsi,
	TextStyle,
	unpackRgb,
	visibleLength,
} from './parser';
