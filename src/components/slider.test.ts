/**
 * Slider Component Tests
 */

import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '../core/types';
import {
	attachSliderBehavior,
	blurSlider,
	clearSliderCallbacks,
	clearSliderDisplay,
	decrementSlider,
	disableSlider,
	enableSlider,
	focusSlider,
	getSliderDisplay,
	getSliderMax,
	getSliderMin,
	getSliderOrientation,
	getSliderPercentage,
	getSliderState,
	getSliderStep,
	getSliderValue,
	handleSliderKeyPress,
	incrementSlider,
	isShowingSliderValue,
	isSlider,
	isSliderDisabled,
	isSliderDragging,
	isSliderFocused,
	isSliderHorizontal,
	isSliderInState,
	isSliderVertical,
	onSliderChange,
	onSliderDragEnd,
	onSliderDragStart,
	renderSliderString,
	resetSliderStore,
	SLIDER_STATE_MACHINE_CONFIG,
	SliderOrientation,
	setShowSliderValue,
	setSliderDisplay,
	setSliderFromPercentage,
	setSliderOrientation,
	setSliderRange,
	setSliderStep,
	setSliderToMax,
	setSliderToMin,
	setSliderValue,
	sliderStore,
	startDragging,
	stopDragging,
} from './slider';

describe('Slider Component', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		resetSliderStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('State Machine Configuration', () => {
		it('should have correct initial state', () => {
			expect(SLIDER_STATE_MACHINE_CONFIG.initial).toBe('idle');
		});

		it('should have correct state transitions from idle', () => {
			const idleTransitions = SLIDER_STATE_MACHINE_CONFIG.states.idle.on;
			expect(idleTransitions!.focus).toBe('focused');
			expect(idleTransitions!.disable).toBe('disabled');
		});

		it('should have correct state transitions from focused', () => {
			const focusedTransitions = SLIDER_STATE_MACHINE_CONFIG.states.focused.on;
			expect(focusedTransitions!.blur).toBe('idle');
			expect(focusedTransitions!.dragStart).toBe('dragging');
			expect(focusedTransitions!.disable).toBe('disabled');
		});

		it('should have correct state transitions from dragging', () => {
			const draggingTransitions = SLIDER_STATE_MACHINE_CONFIG.states.dragging.on;
			expect(draggingTransitions!.dragEnd).toBe('focused');
			expect(draggingTransitions!.blur).toBe('idle');
			expect(draggingTransitions!.disable).toBe('disabled');
		});

		it('should have correct state transitions from disabled', () => {
			const disabledTransitions = SLIDER_STATE_MACHINE_CONFIG.states.disabled.on;
			expect(disabledTransitions!.enable).toBe('idle');
		});
	});

	describe('attachSliderBehavior', () => {
		it('should initialize slider with default values', () => {
			attachSliderBehavior(world, eid);

			expect(isSlider(world, eid)).toBe(true);
			expect(getSliderValue(eid)).toBe(0);
			expect(getSliderMin(eid)).toBe(0);
			expect(getSliderMax(eid)).toBe(100);
			expect(getSliderStep(eid)).toBe(1);
		});

		it('should initialize slider with custom values', () => {
			attachSliderBehavior(world, eid, 10, 50, 25, 5);

			expect(getSliderValue(eid)).toBe(25);
			expect(getSliderMin(eid)).toBe(10);
			expect(getSliderMax(eid)).toBe(50);
			expect(getSliderStep(eid)).toBe(5);
		});

		it('should clamp initial value to range', () => {
			attachSliderBehavior(world, eid, 0, 100, 150, 1);
			expect(getSliderValue(eid)).toBe(100);

			const eid2 = addEntity(world) as Entity;
			attachSliderBehavior(world, eid2, 0, 100, -50, 1);
			expect(getSliderValue(eid2)).toBe(0);
		});

		it('should set initial state to idle', () => {
			attachSliderBehavior(world, eid);
			expect(getSliderState(world, eid)).toBe('idle');
		});
	});

	describe('isSlider', () => {
		it('should return false for non-slider entity', () => {
			expect(isSlider(world, eid)).toBe(false);
		});

		it('should return true for slider entity', () => {
			attachSliderBehavior(world, eid);
			expect(isSlider(world, eid)).toBe(true);
		});
	});

	describe('State Management', () => {
		beforeEach(() => {
			attachSliderBehavior(world, eid);
		});

		it('should focus slider', () => {
			expect(focusSlider(world, eid)).toBe(true);
			expect(getSliderState(world, eid)).toBe('focused');
			expect(isSliderFocused(world, eid)).toBe(true);
		});

		it('should blur slider', () => {
			focusSlider(world, eid);
			expect(blurSlider(world, eid)).toBe(true);
			expect(getSliderState(world, eid)).toBe('idle');
		});

		it('should start dragging', () => {
			focusSlider(world, eid);
			expect(startDragging(world, eid)).toBe(true);
			expect(getSliderState(world, eid)).toBe('dragging');
			expect(isSliderDragging(world, eid)).toBe(true);
		});

		it('should stop dragging', () => {
			focusSlider(world, eid);
			startDragging(world, eid);
			expect(stopDragging(world, eid)).toBe(true);
			expect(getSliderState(world, eid)).toBe('focused');
		});

		it('should disable slider', () => {
			expect(disableSlider(world, eid)).toBe(true);
			expect(getSliderState(world, eid)).toBe('disabled');
			expect(isSliderDisabled(world, eid)).toBe(true);
		});

		it('should enable slider', () => {
			disableSlider(world, eid);
			expect(enableSlider(world, eid)).toBe(true);
			expect(getSliderState(world, eid)).toBe('idle');
		});

		it('should check if slider is in specific state', () => {
			expect(isSliderInState(world, eid, 'idle')).toBe(true);
			focusSlider(world, eid);
			expect(isSliderInState(world, eid, 'focused')).toBe(true);
		});
	});

	describe('Value Management', () => {
		beforeEach(() => {
			attachSliderBehavior(world, eid, 0, 100, 50, 5);
		});

		it('should get and set value', () => {
			setSliderValue(world, eid, 75);
			expect(getSliderValue(eid)).toBe(75);
		});

		it('should clamp value to range', () => {
			setSliderValue(world, eid, 150);
			expect(getSliderValue(eid)).toBe(100);

			setSliderValue(world, eid, -50);
			expect(getSliderValue(eid)).toBe(0);
		});

		it('should round value to step', () => {
			setSliderValue(world, eid, 23);
			expect(getSliderValue(eid)).toBe(25);

			setSliderValue(world, eid, 22);
			expect(getSliderValue(eid)).toBe(20);
		});

		it('should set range', () => {
			setSliderRange(world, eid, 10, 50);
			expect(getSliderMin(eid)).toBe(10);
			expect(getSliderMax(eid)).toBe(50);
		});

		it('should clamp value when range changes', () => {
			setSliderValue(world, eid, 80);
			setSliderRange(world, eid, 0, 50);
			expect(getSliderValue(eid)).toBe(50);
		});

		it('should set step', () => {
			setSliderStep(world, eid, 10);
			expect(getSliderStep(eid)).toBe(10);
		});

		it('should round value when step changes', () => {
			setSliderValue(world, eid, 37);
			expect(getSliderValue(eid)).toBe(35);
			setSliderStep(world, eid, 10);
			expect(getSliderValue(eid)).toBe(40);
		});

		it('should calculate percentage', () => {
			setSliderValue(world, eid, 50);
			expect(getSliderPercentage(eid)).toBe(0.5);

			setSliderValue(world, eid, 0);
			expect(getSliderPercentage(eid)).toBe(0);

			setSliderValue(world, eid, 100);
			expect(getSliderPercentage(eid)).toBe(1);
		});

		it('should set value from percentage', () => {
			setSliderFromPercentage(world, eid, 0.5);
			expect(getSliderValue(eid)).toBe(50);

			setSliderFromPercentage(world, eid, 0.25);
			expect(getSliderValue(eid)).toBe(25);
		});

		it('should increment value', () => {
			setSliderValue(world, eid, 50);
			incrementSlider(world, eid);
			expect(getSliderValue(eid)).toBe(55);
		});

		it('should increment value with multiplier', () => {
			setSliderValue(world, eid, 50);
			incrementSlider(world, eid, 2);
			expect(getSliderValue(eid)).toBe(60);
		});

		it('should decrement value', () => {
			setSliderValue(world, eid, 50);
			decrementSlider(world, eid);
			expect(getSliderValue(eid)).toBe(45);
		});

		it('should decrement value with multiplier', () => {
			setSliderValue(world, eid, 50);
			decrementSlider(world, eid, 2);
			expect(getSliderValue(eid)).toBe(40);
		});

		it('should set to minimum', () => {
			setSliderValue(world, eid, 50);
			setSliderToMin(world, eid);
			expect(getSliderValue(eid)).toBe(0);
		});

		it('should set to maximum', () => {
			setSliderValue(world, eid, 50);
			setSliderToMax(world, eid);
			expect(getSliderValue(eid)).toBe(100);
		});
	});

	describe('Orientation', () => {
		beforeEach(() => {
			attachSliderBehavior(world, eid);
		});

		it('should default to horizontal orientation', () => {
			expect(getSliderOrientation(eid)).toBe(SliderOrientation.Horizontal);
			expect(isSliderHorizontal(eid)).toBe(true);
			expect(isSliderVertical(eid)).toBe(false);
		});

		it('should set orientation', () => {
			setSliderOrientation(world, eid, SliderOrientation.Vertical);
			expect(getSliderOrientation(eid)).toBe(SliderOrientation.Vertical);
			expect(isSliderVertical(eid)).toBe(true);
			expect(isSliderHorizontal(eid)).toBe(false);
		});
	});

	describe('Show Value', () => {
		beforeEach(() => {
			attachSliderBehavior(world, eid);
		});

		it('should default to not showing value', () => {
			expect(isShowingSliderValue(eid)).toBe(false);
		});

		it('should set show value', () => {
			setShowSliderValue(world, eid, true);
			expect(isShowingSliderValue(eid)).toBe(true);

			setShowSliderValue(world, eid, false);
			expect(isShowingSliderValue(eid)).toBe(false);
		});
	});

	describe('Display Configuration', () => {
		beforeEach(() => {
			attachSliderBehavior(world, eid);
		});

		it('should get default display', () => {
			const display = getSliderDisplay(eid);
			expect(display.trackChar).toBe('─');
			expect(display.thumbChar).toBe('●');
			expect(display.fillChar).toBe('━');
		});

		it('should set display options', () => {
			setSliderDisplay(eid, {
				trackChar: '=',
				thumbChar: 'O',
				fillChar: '#',
			});
			const display = getSliderDisplay(eid);
			expect(display.trackChar).toBe('=');
			expect(display.thumbChar).toBe('O');
			expect(display.fillChar).toBe('#');
		});

		it('should set partial display options', () => {
			setSliderDisplay(eid, { thumbChar: 'X' });
			const display = getSliderDisplay(eid);
			expect(display.thumbChar).toBe('X');
			expect(display.trackChar).toBe('─'); // default
		});

		it('should clear display', () => {
			setSliderDisplay(eid, { thumbChar: 'X' });
			clearSliderDisplay(eid);
			const display = getSliderDisplay(eid);
			expect(display.thumbChar).toBe('●'); // back to default
		});

		it('should use vertical defaults when vertical', () => {
			setSliderOrientation(world, eid, SliderOrientation.Vertical);
			const display = getSliderDisplay(eid);
			expect(display.trackChar).toBe('│');
			expect(display.fillChar).toBe('┃');
		});
	});

	describe('Callbacks', () => {
		beforeEach(() => {
			attachSliderBehavior(world, eid, 0, 100, 50, 5);
		});

		it('should call onChange callback when value changes', () => {
			const callback = vi.fn();
			onSliderChange(eid, callback);

			setSliderValue(world, eid, 75);
			expect(callback).toHaveBeenCalledWith(75);
		});

		it('should not call onChange callback when value stays same', () => {
			const callback = vi.fn();
			onSliderChange(eid, callback);

			setSliderValue(world, eid, 50); // same as initial
			expect(callback).not.toHaveBeenCalled();
		});

		it('should call onDragStart callback when dragging starts', () => {
			const callback = vi.fn();
			onSliderDragStart(eid, callback);

			focusSlider(world, eid);
			startDragging(world, eid);
			expect(callback).toHaveBeenCalled();
		});

		it('should call onDragEnd callback when dragging ends', () => {
			const callback = vi.fn();
			onSliderDragEnd(eid, callback);

			focusSlider(world, eid);
			startDragging(world, eid);
			stopDragging(world, eid);
			expect(callback).toHaveBeenCalled();
		});

		it('should unsubscribe from callbacks', () => {
			const callback = vi.fn();
			const unsubscribe = onSliderChange(eid, callback);

			unsubscribe();
			setSliderValue(world, eid, 75);
			expect(callback).not.toHaveBeenCalled();
		});

		it('should clear all callbacks', () => {
			const changeCallback = vi.fn();
			const dragStartCallback = vi.fn();
			const dragEndCallback = vi.fn();

			onSliderChange(eid, changeCallback);
			onSliderDragStart(eid, dragStartCallback);
			onSliderDragEnd(eid, dragEndCallback);

			clearSliderCallbacks(eid);

			setSliderValue(world, eid, 75);
			focusSlider(world, eid);
			startDragging(world, eid);
			stopDragging(world, eid);

			expect(changeCallback).not.toHaveBeenCalled();
			expect(dragStartCallback).not.toHaveBeenCalled();
			expect(dragEndCallback).not.toHaveBeenCalled();
		});
	});

	describe('Key Handling', () => {
		beforeEach(() => {
			attachSliderBehavior(world, eid, 0, 100, 50, 5);
		});

		describe('horizontal slider', () => {
			it('should return increment action for right key', () => {
				const action = handleSliderKeyPress(world, eid, 'right');
				expect(action).toEqual({ type: 'increment', multiplier: 1 });
			});

			it('should return decrement action for left key', () => {
				const action = handleSliderKeyPress(world, eid, 'left');
				expect(action).toEqual({ type: 'decrement', multiplier: 1 });
			});

			it('should return null for up/down keys', () => {
				expect(handleSliderKeyPress(world, eid, 'up')).toBeNull();
				expect(handleSliderKeyPress(world, eid, 'down')).toBeNull();
			});
		});

		describe('vertical slider', () => {
			beforeEach(() => {
				setSliderOrientation(world, eid, SliderOrientation.Vertical);
			});

			it('should return increment action for up key', () => {
				const action = handleSliderKeyPress(world, eid, 'up');
				expect(action).toEqual({ type: 'increment', multiplier: 1 });
			});

			it('should return decrement action for down key', () => {
				const action = handleSliderKeyPress(world, eid, 'down');
				expect(action).toEqual({ type: 'decrement', multiplier: 1 });
			});

			it('should return null for left/right keys', () => {
				expect(handleSliderKeyPress(world, eid, 'left')).toBeNull();
				expect(handleSliderKeyPress(world, eid, 'right')).toBeNull();
			});
		});

		it('should return increment/decrement actions with multiplier for pageup/pagedown', () => {
			const pageUpAction = handleSliderKeyPress(world, eid, 'pageup');
			expect(pageUpAction).toEqual({ type: 'increment', multiplier: 10 });

			const pageDownAction = handleSliderKeyPress(world, eid, 'pagedown');
			expect(pageDownAction).toEqual({ type: 'decrement', multiplier: 10 });
		});

		it('should return toMin action for home key', () => {
			const action = handleSliderKeyPress(world, eid, 'home');
			expect(action).toEqual({ type: 'toMin' });
		});

		it('should return toMax action for end key', () => {
			const action = handleSliderKeyPress(world, eid, 'end');
			expect(action).toEqual({ type: 'toMax' });
		});

		it('should return null for disabled slider', () => {
			disableSlider(world, eid);
			expect(handleSliderKeyPress(world, eid, 'right')).toBeNull();
		});

		it('should return null for non-slider entity', () => {
			const eid2 = addEntity(world) as Entity;
			expect(handleSliderKeyPress(world, eid2, 'right')).toBeNull();
		});

		it('should return null for unhandled keys', () => {
			expect(handleSliderKeyPress(world, eid, 'enter')).toBeNull();
			expect(handleSliderKeyPress(world, eid, 'space')).toBeNull();
		});
	});

	describe('Rendering', () => {
		beforeEach(() => {
			attachSliderBehavior(world, eid, 0, 100, 50, 1);
		});

		it('should render slider at 0%', () => {
			setSliderValue(world, eid, 0);
			const result = renderSliderString(eid, 10);
			expect(result[0]).toBe('●'); // thumb at start
		});

		it('should render slider at 100%', () => {
			setSliderValue(world, eid, 100);
			const result = renderSliderString(eid, 10);
			expect(result[result.length - 1]).toBe('●'); // thumb at end
		});

		it('should render slider at 50%', () => {
			setSliderValue(world, eid, 50);
			const result = renderSliderString(eid, 10);
			// thumb should be roughly in the middle
			const thumbIndex = result.indexOf('●');
			expect(thumbIndex).toBeGreaterThan(3);
			expect(thumbIndex).toBeLessThan(7);
		});

		it('should render with value when showValue is true', () => {
			setSliderValue(world, eid, 50);
			setShowSliderValue(world, eid, true);
			const result = renderSliderString(eid, 15);
			expect(result).toContain(' 50');
		});

		it('should return empty string for zero width', () => {
			expect(renderSliderString(eid, 0)).toBe('');
		});
	});

	describe('Store', () => {
		it('should expose store for external access', () => {
			attachSliderBehavior(world, eid);
			expect(sliderStore.isSlider[eid]).toBe(1);
		});

		it('should reset store', () => {
			attachSliderBehavior(world, eid);
			expect(sliderStore.isSlider[eid]).toBe(1);

			resetSliderStore();
			expect(sliderStore.isSlider[eid]).toBe(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle zero-width range', () => {
			attachSliderBehavior(world, eid, 50, 50, 50, 1);
			expect(getSliderPercentage(eid)).toBe(0); // returns 0 to avoid division by zero
		});

		it('should handle step of 0', () => {
			attachSliderBehavior(world, eid, 0, 100, 0, 0);
			setSliderValue(world, eid, 33.33);
			// With step 0, value should not be rounded
			// Note: Float32Array has limited precision
			expect(getSliderValue(eid)).toBeCloseTo(33.33, 2);
		});

		it('should clamp percentage to 0-1', () => {
			attachSliderBehavior(world, eid, 0, 100, 0, 1);
			setSliderFromPercentage(world, eid, 1.5);
			expect(getSliderValue(eid)).toBe(100);

			setSliderFromPercentage(world, eid, -0.5);
			expect(getSliderValue(eid)).toBe(0);
		});
	});
});
