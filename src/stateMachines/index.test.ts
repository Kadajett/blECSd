/**
 * Common UI state machine configuration tests.
 */

import { describe, expect, it, vi } from 'vitest';
import { createStateMachine } from '../core/stateMachine';
import {
	createButtonConfig,
	createFocusConfig,
	createInputConfig,
	createSelectConfig,
	createSelectConfigExtended,
	createToggleConfig,
	createToggleConfigWithRestore,
} from './index';

describe('stateMachines', () => {
	describe('createButtonConfig', () => {
		it('starts in idle state', () => {
			const machine = createStateMachine(createButtonConfig());
			expect(machine.current).toBe('idle');
		});

		it('transitions idle -> hovered on mouseenter', () => {
			const machine = createStateMachine(createButtonConfig());
			machine.send('mouseenter');
			expect(machine.current).toBe('hovered');
		});

		it('transitions hovered -> idle on mouseleave', () => {
			const machine = createStateMachine(createButtonConfig());
			machine.send('mouseenter');
			machine.send('mouseleave');
			expect(machine.current).toBe('idle');
		});

		it('transitions hovered -> pressed on mousedown', () => {
			const machine = createStateMachine(createButtonConfig());
			machine.send('mouseenter');
			machine.send('mousedown');
			expect(machine.current).toBe('pressed');
		});

		it('transitions pressed -> hovered on mouseup', () => {
			const machine = createStateMachine(createButtonConfig());
			machine.send('mouseenter');
			machine.send('mousedown');
			machine.send('mouseup');
			expect(machine.current).toBe('hovered');
		});

		it('transitions pressed -> idle on mouseleave', () => {
			const machine = createStateMachine(createButtonConfig());
			machine.send('mouseenter');
			machine.send('mousedown');
			machine.send('mouseleave');
			expect(machine.current).toBe('idle');
		});

		it('transitions to disabled on disable', () => {
			const machine = createStateMachine(createButtonConfig());
			machine.send('disable');
			expect(machine.current).toBe('disabled');
		});

		it('transitions disabled -> idle on enable', () => {
			const machine = createStateMachine(createButtonConfig());
			machine.send('disable');
			machine.send('enable');
			expect(machine.current).toBe('idle');
		});

		it('calls onPress on mousedown', () => {
			const onPress = vi.fn();
			const machine = createStateMachine(createButtonConfig({ onPress }));
			machine.send('mouseenter');
			machine.send('mousedown');
			expect(onPress).toHaveBeenCalledTimes(1);
		});

		it('calls onRelease and onClick on mouseup', () => {
			const onRelease = vi.fn();
			const onClick = vi.fn();
			const machine = createStateMachine(createButtonConfig({ onRelease, onClick }));
			machine.send('mouseenter');
			machine.send('mousedown');
			machine.send('mouseup');
			expect(onRelease).toHaveBeenCalledTimes(1);
			expect(onClick).toHaveBeenCalledTimes(1);
		});

		it('calls onRelease but not onClick when mouse leaves while pressed', () => {
			const onRelease = vi.fn();
			const onClick = vi.fn();
			const machine = createStateMachine(createButtonConfig({ onRelease, onClick }));
			machine.send('mouseenter');
			machine.send('mousedown');
			machine.send('mouseleave');
			expect(onRelease).toHaveBeenCalledTimes(1);
			expect(onClick).not.toHaveBeenCalled();
		});

		it('calls onDisable when disabled', () => {
			const onDisable = vi.fn();
			const machine = createStateMachine(createButtonConfig({ onDisable }));
			machine.send('disable');
			expect(onDisable).toHaveBeenCalledTimes(1);
		});

		it('calls onEnable when enabled', () => {
			const onEnable = vi.fn();
			const machine = createStateMachine(createButtonConfig({ onEnable }));
			machine.send('disable');
			machine.send('enable');
			expect(onEnable).toHaveBeenCalledTimes(1);
		});

		it('ignores events in disabled state except enable', () => {
			const machine = createStateMachine(createButtonConfig());
			machine.send('disable');
			machine.send('mouseenter');
			expect(machine.current).toBe('disabled');
			machine.send('mousedown');
			expect(machine.current).toBe('disabled');
		});
	});

	describe('createFocusConfig', () => {
		it('starts in unfocused state', () => {
			const machine = createStateMachine(createFocusConfig());
			expect(machine.current).toBe('unfocused');
		});

		it('transitions unfocused -> focused on focus', () => {
			const machine = createStateMachine(createFocusConfig());
			machine.send('focus');
			expect(machine.current).toBe('focused');
		});

		it('transitions focused -> unfocused on blur', () => {
			const machine = createStateMachine(createFocusConfig());
			machine.send('focus');
			machine.send('blur');
			expect(machine.current).toBe('unfocused');
		});

		it('transitions to disabled on disable', () => {
			const machine = createStateMachine(createFocusConfig());
			machine.send('disable');
			expect(machine.current).toBe('disabled');
		});

		it('transitions disabled -> unfocused on enable', () => {
			const machine = createStateMachine(createFocusConfig());
			machine.send('disable');
			machine.send('enable');
			expect(machine.current).toBe('unfocused');
		});

		it('calls onFocus when focused', () => {
			const onFocus = vi.fn();
			const machine = createStateMachine(createFocusConfig({ onFocus }));
			machine.send('focus');
			expect(onFocus).toHaveBeenCalledTimes(1);
		});

		it('calls onBlur when blurred', () => {
			const onBlur = vi.fn();
			const machine = createStateMachine(createFocusConfig({ onBlur }));
			machine.send('focus');
			machine.send('blur');
			expect(onBlur).toHaveBeenCalledTimes(1);
		});

		it('calls onBlur when disabled while focused', () => {
			const onBlur = vi.fn();
			const machine = createStateMachine(createFocusConfig({ onBlur }));
			machine.send('focus');
			machine.send('disable');
			expect(onBlur).toHaveBeenCalledTimes(1);
		});
	});

	describe('createToggleConfig', () => {
		it('starts in off state by default', () => {
			const machine = createStateMachine(createToggleConfig());
			expect(machine.current).toBe('off');
		});

		it('can start in on state', () => {
			const machine = createStateMachine(createToggleConfig({}, 'on'));
			expect(machine.current).toBe('on');
		});

		it('transitions off -> on on toggle', () => {
			const machine = createStateMachine(createToggleConfig());
			machine.send('toggle');
			expect(machine.current).toBe('on');
		});

		it('transitions on -> off on toggle', () => {
			const machine = createStateMachine(createToggleConfig({}, 'on'));
			machine.send('toggle');
			expect(machine.current).toBe('off');
		});

		it('can toggle multiple times', () => {
			const machine = createStateMachine(createToggleConfig());
			machine.send('toggle');
			expect(machine.current).toBe('on');
			machine.send('toggle');
			expect(machine.current).toBe('off');
			machine.send('toggle');
			expect(machine.current).toBe('on');
		});

		it('transitions to disabled on disable', () => {
			const machine = createStateMachine(createToggleConfig());
			machine.send('disable');
			expect(machine.current).toBe('disabled');
		});

		it('calls onToggleOn when toggled on', () => {
			const onToggleOn = vi.fn();
			const machine = createStateMachine(createToggleConfig({ onToggleOn }));
			machine.send('toggle');
			expect(onToggleOn).toHaveBeenCalledTimes(1);
		});

		it('calls onToggleOff when toggled off', () => {
			const onToggleOff = vi.fn();
			const machine = createStateMachine(createToggleConfig({ onToggleOff }, 'on'));
			machine.send('toggle');
			expect(onToggleOff).toHaveBeenCalledTimes(1);
		});

		it('calls onToggle with correct boolean', () => {
			const onToggle = vi.fn();
			const machine = createStateMachine(createToggleConfig({ onToggle }));
			machine.send('toggle');
			expect(onToggle).toHaveBeenCalledWith(true);
			machine.send('toggle');
			expect(onToggle).toHaveBeenCalledWith(false);
		});

		it('ignores toggle in disabled state', () => {
			const machine = createStateMachine(createToggleConfig());
			machine.send('disable');
			machine.send('toggle');
			expect(machine.current).toBe('disabled');
		});
	});

	describe('createToggleConfigWithRestore', () => {
		it('tracks wasOn state when disabled from on', () => {
			const machine = createStateMachine(createToggleConfigWithRestore({}, 'on'));
			machine.send('disable');
			expect(machine.context.wasOn).toBe(true);
		});

		it('tracks wasOn state when disabled from off', () => {
			const machine = createStateMachine(createToggleConfigWithRestore());
			machine.send('disable');
			expect(machine.context.wasOn).toBe(false);
		});
	});

	describe('createInputConfig', () => {
		it('starts in idle state', () => {
			const machine = createStateMachine(createInputConfig());
			expect(machine.current).toBe('idle');
		});

		it('transitions idle -> focused on focus', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			expect(machine.current).toBe('focused');
		});

		it('transitions focused -> idle on blur', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			machine.send('blur');
			expect(machine.current).toBe('idle');
		});

		it('transitions focused -> editing on input', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			machine.send('input');
			expect(machine.current).toBe('editing');
		});

		it('stays in editing on subsequent inputs', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			machine.send('input');
			machine.send('input');
			expect(machine.current).toBe('editing');
		});

		it('transitions editing -> validating on validate', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			machine.send('input');
			machine.send('validate');
			expect(machine.current).toBe('validating');
		});

		it('transitions validating -> focused on valid', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			machine.send('input');
			machine.send('validate');
			machine.send('valid');
			expect(machine.current).toBe('focused');
		});

		it('transitions validating -> error on invalid', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			machine.send('input');
			machine.send('validate');
			machine.send('invalid');
			expect(machine.current).toBe('error');
		});

		it('transitions error -> editing on input', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			machine.send('input');
			machine.send('validate');
			machine.send('invalid');
			machine.send('input');
			expect(machine.current).toBe('editing');
		});

		it('transitions editing -> focused on clear', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('focus');
			machine.send('input');
			machine.send('clear');
			expect(machine.current).toBe('focused');
		});

		it('transitions to disabled on disable', () => {
			const machine = createStateMachine(createInputConfig());
			machine.send('disable');
			expect(machine.current).toBe('disabled');
		});

		it('calls onFocus when focused', () => {
			const onFocus = vi.fn();
			const machine = createStateMachine(createInputConfig({ onFocus }));
			machine.send('focus');
			expect(onFocus).toHaveBeenCalledTimes(1);
		});

		it('calls onInput when input event', () => {
			const onInput = vi.fn();
			const context = { onInput, value: 'test' };
			const machine = createStateMachine(createInputConfig(context));
			machine.send('focus');
			machine.send('input');
			expect(onInput).toHaveBeenCalledWith('test');
		});

		it('calls onValid when validation succeeds', () => {
			const onValid = vi.fn();
			const machine = createStateMachine(createInputConfig({ onValid }));
			machine.send('focus');
			machine.send('input');
			machine.send('validate');
			machine.send('valid');
			expect(onValid).toHaveBeenCalledTimes(1);
		});

		it('calls onInvalid when validation fails', () => {
			const onInvalid = vi.fn();
			const context = { onInvalid, errorMessage: 'Invalid input' };
			const machine = createStateMachine(createInputConfig(context));
			machine.send('focus');
			machine.send('input');
			machine.send('validate');
			machine.send('invalid');
			expect(onInvalid).toHaveBeenCalledWith('Invalid input');
		});

		it('calls onClear and resets value on clear', () => {
			const onClear = vi.fn();
			const context = { onClear, value: 'test', errorMessage: 'error' };
			const machine = createStateMachine(createInputConfig(context));
			machine.send('focus');
			machine.send('input');
			machine.send('clear');
			expect(onClear).toHaveBeenCalledTimes(1);
			expect(machine.context.value).toBe('');
			expect(machine.context.errorMessage).toBeUndefined();
		});
	});

	describe('createSelectConfig', () => {
		it('starts in closed state', () => {
			const machine = createStateMachine(createSelectConfig());
			expect(machine.current).toBe('closed');
		});

		it('transitions closed -> open on open', () => {
			const machine = createStateMachine(createSelectConfig());
			machine.send('open');
			expect(machine.current).toBe('open');
		});

		it('transitions open -> closed on close', () => {
			const machine = createStateMachine(createSelectConfig());
			machine.send('open');
			machine.send('close');
			expect(machine.current).toBe('closed');
		});

		it('transitions open -> closed on select', () => {
			const machine = createStateMachine(createSelectConfig());
			machine.send('open');
			machine.send('select');
			expect(machine.current).toBe('closed');
		});

		it('transitions open -> closed on cancel', () => {
			const machine = createStateMachine(createSelectConfig());
			machine.send('open');
			machine.send('cancel');
			expect(machine.current).toBe('closed');
		});

		it('transitions open -> selecting on highlight', () => {
			const machine = createStateMachine(createSelectConfig());
			machine.send('open');
			machine.send('highlight');
			expect(machine.current).toBe('selecting');
		});

		it('stays in selecting on subsequent highlights', () => {
			const machine = createStateMachine(createSelectConfig());
			machine.send('open');
			machine.send('highlight');
			machine.send('highlight');
			expect(machine.current).toBe('selecting');
		});

		it('transitions selecting -> closed on select', () => {
			const machine = createStateMachine(createSelectConfig());
			machine.send('open');
			machine.send('highlight');
			machine.send('select');
			expect(machine.current).toBe('closed');
		});

		it('calls onOpen when opened', () => {
			const onOpen = vi.fn();
			const machine = createStateMachine(createSelectConfig({ onOpen }));
			machine.send('open');
			expect(onOpen).toHaveBeenCalledTimes(1);
		});

		it('resets highlightedIndex to 0 when opened', () => {
			const machine = createStateMachine(createSelectConfig({ highlightedIndex: 5 }));
			machine.send('open');
			expect(machine.context.highlightedIndex).toBe(0);
		});

		it('calls onSelect when selected', () => {
			const onSelect = vi.fn();
			const context = { onSelect, selectedValue: 'option1' };
			const machine = createStateMachine(createSelectConfig(context));
			machine.send('open');
			machine.send('select');
			expect(onSelect).toHaveBeenCalledWith('option1');
		});

		it('calls onClose when closed', () => {
			const onClose = vi.fn();
			const machine = createStateMachine(createSelectConfig({ onClose }));
			machine.send('open');
			machine.send('close');
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it('calls onCancel when cancelled', () => {
			const onCancel = vi.fn();
			const machine = createStateMachine(createSelectConfig({ onCancel }));
			machine.send('open');
			machine.send('cancel');
			expect(onCancel).toHaveBeenCalledTimes(1);
		});

		it('calls onHighlight when highlighting', () => {
			const onHighlight = vi.fn();
			const context = { onHighlight, highlightedIndex: 0 };
			const machine = createStateMachine(createSelectConfig(context));
			machine.send('open');
			// Update highlightedIndex before sending highlight event
			machine.context.highlightedIndex = 2;
			machine.send('highlight');
			expect(onHighlight).toHaveBeenCalledWith(2);
		});
	});

	describe('createSelectConfigExtended', () => {
		it('starts in closed state', () => {
			const machine = createStateMachine(createSelectConfigExtended());
			expect(machine.current).toBe('closed');
		});

		it('transitions to disabled on disable from closed', () => {
			const machine = createStateMachine(createSelectConfigExtended());
			machine.send('disable');
			expect(machine.current).toBe('disabled');
		});

		it('transitions to disabled on disable from open', () => {
			const machine = createStateMachine(createSelectConfigExtended());
			machine.send('open');
			machine.send('disable');
			expect(machine.current).toBe('disabled');
		});

		it('transitions disabled -> closed on enable', () => {
			const machine = createStateMachine(createSelectConfigExtended());
			machine.send('disable');
			machine.send('enable');
			expect(machine.current).toBe('closed');
		});

		it('ignores open in disabled state', () => {
			const machine = createStateMachine(createSelectConfigExtended());
			machine.send('disable');
			machine.send('open');
			expect(machine.current).toBe('disabled');
		});

		it('calls onDisable when disabled', () => {
			const onDisable = vi.fn();
			const machine = createStateMachine(createSelectConfigExtended({ onDisable }));
			machine.send('disable');
			expect(onDisable).toHaveBeenCalledTimes(1);
		});

		it('calls onEnable when enabled', () => {
			const onEnable = vi.fn();
			const machine = createStateMachine(createSelectConfigExtended({ onEnable }));
			machine.send('disable');
			machine.send('enable');
			expect(onEnable).toHaveBeenCalledTimes(1);
		});

		it('closes dropdown when disabled while open', () => {
			const onClose = vi.fn();
			const machine = createStateMachine(createSelectConfigExtended({ onClose }));
			machine.send('open');
			machine.send('disable');
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});
});
