/**
 * SwitchWidget namespace.
 *
 * @example
 * ```typescript
 * import { switchWidget } from 'blecsd/widgets';
 * const sw = switchWidget.create(world, { on: false });
 * switchWidget.handleKey(world, sw.eid, keyEvent);
 * switchWidget.handleClick(world, sw.eid, mouseEvent);
 * ```
 */
import {
	createSwitch,
	handleSwitchClick,
	handleSwitchKey,
	isSwitch,
	resetSwitchStore,
} from '../switch';

export const switchWidget = Object.freeze({
	create: createSwitch,
	is: isSwitch,
	handleKey: handleSwitchKey,
	handleClick: handleSwitchClick,
	resetStore: resetSwitchStore,
});

export type SwitchWidgetModule = typeof switchWidget;
