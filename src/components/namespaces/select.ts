/**
 * Select component namespace.
 *
 * Provides all operations for dropdown/select components.
 *
 * @example
 * ```typescript
 * import { select } from 'blecsd/components';
 * select.attach(world, eid);
 * select.open(world, eid);
 * select.selected.byIndex(world, eid, 2);
 * ```
 */
import {
	attachSelectBehavior,
	clearSelectCallbacks,
	clearSelectDisplay,
	clearSelection,
	closeSelect,
	disableSelect,
	enableSelect,
	getHighlightedIndex,
	getOptionAt,
	getOptionCount,
	getSelectDisplay,
	getSelectedIndex,
	getSelectedLabel,
	getSelectedOption,
	getSelectedValue,
	getSelectIndicator,
	getSelectOptions,
	getSelectState,
	handleSelectKeyPress,
	highlightNext,
	highlightPrev,
	isSelect,
	isSelectDisabled,
	isSelectInState,
	isSelectOpen,
	onSelectChange,
	onSelectClose,
	onSelectOpen,
	openSelect,
	selectHighlighted,
	selectOptionByIndex,
	selectOptionByValue,
	sendSelectEvent,
	setHighlightedIndex,
	setSelectDisplay,
	setSelectOptions,
	toggleSelect,
} from '../../systems/selectSystem';

export const select = Object.freeze({
	attach: attachSelectBehavior,
	is: isSelect,
	getState: getSelectState,
	isInState: isSelectInState,
	sendEvent: sendSelectEvent,
	handleKeyPress: handleSelectKeyPress,

	open: openSelect,
	close: closeSelect,
	toggle: toggleSelect,
	isOpen: isSelectOpen,

	enable: enableSelect,
	disable: disableSelect,
	isDisabled: isSelectDisabled,

	options: Object.freeze({
		get: getSelectOptions,
		set: setSelectOptions,
		getCount: getOptionCount,
		getAt: getOptionAt,
	}),

	selected: Object.freeze({
		getIndex: getSelectedIndex,
		getOption: getSelectedOption,
		getValue: getSelectedValue,
		getLabel: getSelectedLabel,
		byIndex: selectOptionByIndex,
		byValue: selectOptionByValue,
		clear: clearSelection,
	}),

	highlight: Object.freeze({
		getIndex: getHighlightedIndex,
		setIndex: setHighlightedIndex,
		next: highlightNext,
		prev: highlightPrev,
		select: selectHighlighted,
	}),

	display: Object.freeze({
		get: getSelectDisplay,
		set: setSelectDisplay,
		clear: clearSelectDisplay,
		getIndicator: getSelectIndicator,
	}),

	callbacks: Object.freeze({
		onChange: onSelectChange,
		onOpen: onSelectOpen,
		onClose: onSelectClose,
		clear: clearSelectCallbacks,
	}),
});

export type SelectModule = typeof select;
