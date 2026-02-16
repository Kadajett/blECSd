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
export type { BracketedPasteModule } from './bracketedPaste';
export { bracketedPaste } from './bracketedPaste';
export type { CapabilitiesModule } from './capabilities';
export { capabilities } from './capabilities';
export type { CleanupModule } from './cleanup';
export { cleanup } from './cleanup';
export type { ClipboardModule } from './clipboard';
export { clipboard } from './clipboard';
export type { ConflictResModule } from './conflictRes';
export { conflictRes } from './conflictRes';
export type { CursorModule } from './cursor';
export { cursor } from './cursor';
export type { DebugModule } from './debug';
export { debug } from './debug';
export type { DetectionModule } from './detection';
export { detection } from './detection';
export type { FocusTrackModule } from './focusTrack';
export { focusTrack } from './focusTrack';
export type { GpmModule } from './gpm';
export { gpm } from './gpm';
export type { GraphicsModule } from './graphics';
export { graphics } from './graphics';
export type { InputCtrlModule } from './inputCtrl';
export { inputCtrl } from './inputCtrl';
export type { InputStreamModule } from './inputStream';
export { inputStream } from './inputStream';
export type { KeyboardProtoModule } from './keyboardProto';
export { keyboardProto } from './keyboardProto';
export type { KeyParsingModule } from './keyParsing';
export { keyParsing } from './keyParsing';
export type { MouseParsingModule } from './mouseParsing';
export { mouseParsing } from './mouseParsing';
export type { MultiCursorModule } from './multiCursor';
export { multiCursor } from './multiCursor';
export type { PresenceModule } from './presence';
export { presence } from './presence';
export type { ProcessModule } from './process';
export { process } from './process';
export type { ProgramModule } from './program';
export { program } from './program';
export type { ResizeModule } from './resize';
export { resize } from './resize';
export type { ResponseParserModule } from './responseParser';
export { responseParser } from './responseParser';
export type { ScreenModule } from './screen';
export { screen } from './screen';
export type { SecurityInputModule } from './securityInput';
export { securityInput } from './securityInput';
export type { SecuritySanitizeModule } from './securitySanitize';
export { securitySanitize } from './securitySanitize';
export type { SuspendModule } from './suspend';
export { suspend } from './suspend';
export type { SyncOutputModule } from './syncOutput';
export { syncOutput } from './syncOutput';
export type { TerminfoModule } from './terminfo';
export { terminfo } from './terminfo';
export type { ThrottledResizeModule } from './throttledResize';
export { throttledResize } from './throttledResize';
