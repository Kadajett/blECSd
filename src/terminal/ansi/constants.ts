/**
 * Core ANSI escape sequence constants.
 *
 * These are the fundamental building blocks for all ANSI escape sequences.
 * Used by all other ANSI modules to construct escape codes.
 *
 * @module terminal/ansi/constants
 * @internal This module is internal and not exported from the main package.
 */

/** Control Sequence Introducer - starts most ANSI sequences */
export const CSI = '\x1b[';

/** Operating System Command - used for terminal titles, clipboard, etc. */
export const OSC = '\x1b]';

/** Device Control String - used for terminal-specific commands */
export const DCS = '\x1bP';

/** String Terminator - ends OSC and DCS sequences */
export const ST = '\x1b\\';

/** Bell character - alternative string terminator for OSC */
export const BEL = '\x07';

/** Escape character */
export const ESC = '\x1b';
