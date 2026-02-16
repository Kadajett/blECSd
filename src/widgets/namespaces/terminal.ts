/**
 * TerminalWidget namespace.
 *
 * @example
 * ```typescript
 * import { terminalWidget } from 'blecsd/widgets';
 * const term = terminalWidget.create(world, { shell: '/bin/bash' });
 * terminalWidget.handleKey(world, term.eid, keyEvent);
 * const keysEnabled = terminalWidget.isKeysEnabled(world, term.eid);
 * const mouseEnabled = terminalWidget.isMouseEnabled(world, term.eid);
 * ```
 */
import {
	createTerminal,
	handleTerminalKey,
	isTerminal,
	isTerminalKeysEnabled,
	isTerminalMouseEnabled,
	resetTerminalStore,
} from '../terminal';

export const terminalWidget = Object.freeze({
	create: createTerminal,
	is: isTerminal,
	handleKey: handleTerminalKey,
	isKeysEnabled: isTerminalKeysEnabled,
	isMouseEnabled: isTerminalMouseEnabled,
	resetStore: resetTerminalStore,
});

export type TerminalWidgetModule = typeof terminalWidget;
