/**
 * Slider component namespace.
 *
 * Provides all operations for slider/range input components.
 *
 * @example
 * ```typescript
 * import { slider } from 'blecsd/components';
 * slider.attach(world, eid);
 * slider.value.set(world, eid, 50);
 * slider.value.increment(world, eid);
 * ```
 */
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
	sendSliderEvent,
	setShowSliderValue,
	setSliderDisplay,
	setSliderFromPercentage,
	setSliderOrientation,
	setSliderRange,
	setSliderStep,
	setSliderToMax,
	setSliderToMin,
	setSliderValue,
	startDragging,
	stopDragging,
} from '../../systems/sliderSystem';

export const slider = Object.freeze({
	attach: attachSliderBehavior,
	is: isSlider,
	getState: getSliderState,
	isInState: isSliderInState,
	sendEvent: sendSliderEvent,
	handleKeyPress: handleSliderKeyPress,
	render: renderSliderString,

	focus: focusSlider,
	blur: blurSlider,
	isFocused: isSliderFocused,

	enable: enableSlider,
	disable: disableSlider,
	isDisabled: isSliderDisabled,

	value: Object.freeze({
		get: getSliderValue,
		set: setSliderValue,
		getMin: getSliderMin,
		getMax: getSliderMax,
		getStep: getSliderStep,
		getPercentage: getSliderPercentage,
		setFromPercentage: setSliderFromPercentage,
		setRange: setSliderRange,
		setStep: setSliderStep,
		increment: incrementSlider,
		decrement: decrementSlider,
		toMin: setSliderToMin,
		toMax: setSliderToMax,
	}),

	orientation: Object.freeze({
		get: getSliderOrientation,
		set: setSliderOrientation,
		isHorizontal: isSliderHorizontal,
		isVertical: isSliderVertical,
	}),

	drag: Object.freeze({
		isDragging: isSliderDragging,
		start: startDragging,
		stop: stopDragging,
	}),

	display: Object.freeze({
		get: getSliderDisplay,
		set: setSliderDisplay,
		clear: clearSliderDisplay,
		isShowingValue: isShowingSliderValue,
		setShowValue: setShowSliderValue,
	}),

	callbacks: Object.freeze({
		onChange: onSliderChange,
		onDragStart: onSliderDragStart,
		onDragEnd: onSliderDragEnd,
		clear: clearSliderCallbacks,
	}),
});

export type SliderModule = typeof slider;
