/**
 * Namespace exports for blECSd utilities.
 * These provide organized groupings of related utility functions.
 *
 * @example
 * ```typescript
 * import { boxRender, unicodeUtils, ropeUtils } from 'blecsd/utils';
 *
 * const buffer = boxRender.createCellBuffer(80, 24);
 * const width = unicodeUtils.width.stringWidth('Hello');
 * const rope = ropeUtils.createRope('text');
 * ```
 */

export { type BoxRenderModule, boxRender } from './boxRender';
export { type ChangeCoalesceModule, changeCoalesce } from './changeCoalesce';
export { type ColorUtilsModule, colorUtils } from './colorUtils';
export { type ComponentStoreModule, componentStore } from './componentStore';
export { type CursorNavModule, cursorNav } from './cursorNav';
export { type DiffRendererModule, diffRenderer } from './diffRenderer';
export { type FastWrapUtilsModule, fastWrapUtils } from './fastWrapUtils';
export { type FoldUtilsModule, foldUtils } from './foldUtils';
export { type FuzzySearchUtilsModule, fuzzySearchUtils } from './fuzzySearchUtils';
export { type GutterUtilsModule, gutterUtils } from './gutterUtils';
export { type HelpersModule, helpers } from './helpers';
export { type LazyContentUtilsModule, lazyContentUtils } from './lazyContentUtils';
export { type LineStoreModule, lineStore } from './lineStore';
export { type MarkdownRendererModule, markdownRenderer } from './markdownRenderer';
export { type RopeUtilsModule, ropeUtils } from './ropeUtils';
export { type SattrUtilsModule, sattrUtils } from './sattrUtils';
export { type ScrollbackUtilsModule, scrollbackUtils } from './scrollbackUtils';
export { type SyntaxHLModule, syntaxHL } from './syntaxHL';
export { type TagUtilsModule, tagUtils } from './tagUtils';
export { type TextSearchUtilsModule, textSearchUtils } from './textSearchUtils';
export { type TextWrapUtilsModule, textWrapUtils } from './textWrapUtils';
export { type TimeUtilsModule, timeUtils } from './timeUtils';
export { type UnicodeUtilsModule, unicodeUtils } from './unicodeUtils';
export { type WidthHarnessModule, widthHarness } from './widthHarness';
