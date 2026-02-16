/**
 * Namespace exports for blECSd utilities.
 * These provide organized groupings of related utility functions.
 *
 * @example
 * ```typescript
 * import { boxRender, unicode, rope } from 'blecsd/utils';
 *
 * const buffer = boxRender.createCellBuffer(80, 24);
 * const width = unicode.width.stringWidth('Hello');
 * const r = rope.createRope('text');
 * ```
 */

export { type BoxRenderModule, boxRender } from './boxRender';
export { type ChangeCoalesceModule, changeCoalesce } from './changeCoalesce';
export { type ColorsModule, colors } from './colors';
export { type ComponentStoreModule, componentStore } from './componentStore';
export { type CursorNavModule, cursorNav } from './cursorNav';
export { type DiffRendererModule, diffRenderer } from './diffRenderer';
export { type FastWrapModule, fastWrap } from './fastWrap';
export { type FoldModule, fold } from './fold';
export { type FuzzySearchModule, fuzzySearch } from './fuzzySearch';
export { type GutterModule, gutter } from './gutter';
export { type HelpersModule, helpers } from './helpers';
export { type LazyContentModule, lazyContent } from './lazyContent';
export { type LineStoreModule, lineStore } from './lineStore';
export { type MarkdownRendererModule, markdownRenderer } from './markdownRenderer';
export { type RopeModule, rope } from './rope';
export { type SattrModule, sattr } from './sattr';
export { type ScrollbackModule, scrollback } from './scrollback';
export { type SyntaxHLModule, syntaxHL } from './syntaxHL';
export { type TagsModule, tags } from './tags';
export { type TextSearchModule, textSearch } from './textSearch';
export { type TextWrapModule, textWrap } from './textWrap';
export { type TimeModule, time } from './time';
export { type UnicodeModule, unicode } from './unicode';
export { type WidthHarnessModule, widthHarness } from './widthHarness';
