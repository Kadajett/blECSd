/**
 * Terminal namespace exports
 *
 * Organized namespace objects for terminal module functions.
 * Phase 1: Add namespace objects alongside existing flat exports (non-breaking).
 *
 * @module terminal/namespaces
 */

export type { AnsiCodesModule } from './ansiCodes';
export { ansiCodes } from './ansiCodes';
export type { AttrParserModule } from './attrParser';
export { attrParser } from './attrParser';
export type { BackendsModule } from './backends';
export { backends } from './backends';
export type { BracketedPasteNsModule } from './bracketedPasteNs';
export { bracketedPasteNs } from './bracketedPasteNs';
export type { CapabilitiesModule } from './capabilities';
export { capabilities } from './capabilities';
export type { CleanupNsModule } from './cleanupNs';
export { cleanupNs } from './cleanupNs';
export type { ClipboardMgrModule } from './clipboardMgr';
export { clipboardMgr } from './clipboardMgr';
export type { ConflictResModule } from './conflictRes';
export { conflictRes } from './conflictRes';
export type { CursorNsModule } from './cursorNs';
export { cursorNs } from './cursorNs';
export type { DebugModule } from './debug';
export { debug } from './debug';
export type { DetectionModule } from './detection';
export { detection } from './detection';
export type { FocusTrackModule } from './focusTrack';
export { focusTrack } from './focusTrack';
export type { GpmModule } from './gpm';
export { gpm } from './gpm';
export type { GraphicsNsModule } from './graphicsNs';
export { graphicsNs } from './graphicsNs';
export type { InputCtrlModule } from './inputCtrl';
export { inputCtrl } from './inputCtrl';
export type { InputStreamNsModule } from './inputStreamNs';
export { inputStreamNs } from './inputStreamNs';
export type { KeyboardProtoModule } from './keyboardProto';
export { keyboardProto } from './keyboardProto';
export type { KeyParsingModule } from './keyParsing';
export { keyParsing } from './keyParsing';
export type { MouseParsingModule } from './mouseParsing';
export { mouseParsing } from './mouseParsing';
export type { MultiCursorNsModule } from './multiCursorNs';
export { multiCursorNs } from './multiCursorNs';
export type { PresenceModule } from './presence';
export { presence } from './presence';
export type { ProcessNsModule } from './processUtils';
export { processNs } from './processUtils';
export type { ProgramNsModule } from './programNs';
export { programNs } from './programNs';
export type { ResizeNsModule } from './resizeNs';
export { resizeNs } from './resizeNs';
export type { ResponseParserNsModule } from './responseParserNs';
export { responseParserNs } from './responseParserNs';
export type { ScreenBufferModule } from './screenBuffer';
export { screenBuffer } from './screenBuffer';
export type { SecurityInputModule } from './securityInput';
export { securityInput } from './securityInput';
export type { SecuritySanitizeModule } from './securitySanitize';
export { securitySanitize } from './securitySanitize';
export type { SuspendNsModule } from './suspendNs';
export { suspendNs } from './suspendNs';
export type { SyncOutputNsModule } from './syncOutputNs';
export { syncOutputNs } from './syncOutputNs';
export type { TerminfoModule } from './terminfo';
export { terminfo } from './terminfo';
export type { ThrottledResizeNsModule } from './throttledResizeNs';
export { throttledResizeNs } from './throttledResizeNs';
