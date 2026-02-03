/**
 * ANSI module exports
 *
 * @module terminal/ansi
 * @internal
 */

// Parser exports
export type { Attribute, CodeAttrOptions, InternalColor, OutputColorDepth } from './parser';
export {
	AttributeSchema,
	applySgrCodes,
	attrCode,
	attributesEqual,
	attrToSgrCodes,
	ColorType,
	cloneAttribute,
	codeAttr,
	createAttribute,
	DEFAULT_ATTRIBUTE,
	extractSgrCodes,
	hasStyle,
	packRgb,
	parseSgrString,
	sgrReset,
	stripAnsi,
	TextStyle,
	unpackRgb,
	visibleLength,
} from './parser';
