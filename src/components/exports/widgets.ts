/**
 * UI widget components (border, shadow, progressBar, spinner)
 * @module components/exports/widgets
 */

// Border component
export type { BorderCharset, BorderData, BorderOptions } from '../border';
export {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DASHED,
	BORDER_DASHED_HEAVY,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	Border,
	BorderType,
	DEFAULT_BORDER_BG,
	DEFAULT_BORDER_FG,
	disableAllBorders,
	enableAllBorders,
	getBorder,
	getBorderChar,
	hasBorder,
	hasBorderVisible,
	setBorder,
	setBorderChars,
} from '../border';

// ProgressBar component
export type {
	ProgressBarDisplay,
	ProgressBarDisplayOptions,
	ProgressBarStore,
	ProgressChangeCallback,
	ProgressCompleteCallback,
} from '../progressBar';
export {
	attachProgressBarBehavior,
	clearProgressBarCallbacks,
	clearProgressBarDisplay,
	completeProgress,
	DEFAULT_EMPTY_CHAR,
	DEFAULT_EMPTY_CHAR_VERTICAL,
	DEFAULT_FILL_CHAR,
	DEFAULT_FILL_CHAR_VERTICAL,
	decrementProgress,
	getProgress,
	getProgressBarDisplay,
	getProgressEmptyChar,
	getProgressFillChar,
	getProgressMax,
	getProgressMin,
	getProgressOrientation,
	getProgressPercentage,
	incrementProgress,
	isProgressBar,
	isProgressComplete,
	isShowingPercentage,
	onProgressChange,
	onProgressComplete,
	ProgressOrientation,
	progressBarStore,
	renderProgressString,
	resetProgress,
	resetProgressBarStore,
	setProgress,
	setProgressBarDisplay,
	setProgressOrientation,
	setProgressRange,
	setShowPercentage,
} from '../progressBar';

// Shadow component
export type { ShadowData, ShadowOptions, ShadowPosition } from '../shadow';
export {
	blendShadowColor,
	calculateShadowPositions,
	DEFAULT_SHADOW_CHAR,
	DEFAULT_SHADOW_COLOR,
	DEFAULT_SHADOW_OFFSET_X,
	DEFAULT_SHADOW_OFFSET_Y,
	DEFAULT_SHADOW_OPACITY,
	disableShadow,
	enableShadow,
	getShadow,
	getShadowChar,
	getShadowColor,
	getShadowOffset,
	getShadowOpacity,
	hasShadow,
	isShadowBlending,
	isShadowEnabled,
	removeShadow,
	SHADOW_CHAR_DARK,
	SHADOW_CHAR_LIGHT,
	SHADOW_CHAR_MEDIUM,
	Shadow,
	setShadow,
	setShadowBlend,
	setShadowChar,
	setShadowColor,
	setShadowOffset,
	setShadowOpacity,
	toggleShadow,
} from '../shadow';

// Spinner component
export type { SpinnerData, SpinnerOptions } from '../spinner';
export {
	addSpinner,
	advanceSpinnerFrame,
	BLOCK_SPINNER_CHARS,
	BRAILLE_SPINNER_CHARS,
	DEFAULT_SPINNER_CHARS,
	DEFAULT_SPINNER_INTERVAL,
	DOTS_SPINNER_CHARS,
	getSpinnerChar,
	getSpinnerData,
	hasSpinner,
	removeSpinner,
	resetSpinner,
	resetSpinnerStore,
	Spinner,
	setSpinnerFrames,
	setSpinnerInterval,
	updateSpinner,
} from '../spinner';
