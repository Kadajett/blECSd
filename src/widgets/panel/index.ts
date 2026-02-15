/**
 * Panel Widget
 *
 * A container widget with a title bar, optional close button,
 * and optional collapse/expand functionality.
 *
 * @module widgets/panel
 */

// Re-export configuration schemas
export { PanelConfigSchema, PanelStyleConfigSchema } from './config';
// Re-export factory and utility functions
export {
	createPanel,
	getPanelTitle,
	getPanelTitleAlign,
	isPanel,
	isPanelCollapsed,
	setPanelTitle,
} from './factory';
// Re-export rendering functions
export { numberToTitleAlign, renderPanelTitleBar, titleAlignToNumber } from './render';
// Re-export state and constants
export {
	CLOSE_BUTTON_CHAR,
	COLLAPSE_CHAR,
	contentStore,
	DEFAULT_PANEL_TITLE,
	EXPAND_CHAR,
	Panel,
	resetPanelStore,
	titleStore,
} from './state';
// Re-export types
export type {
	DimensionValue,
	PaddingConfig,
	PanelAction,
	PanelBorderConfig,
	PanelConfig,
	PanelContentStyle,
	PanelStyleConfig,
	PanelTitleStyle,
	PanelWidget,
	PositionValue,
	TitleAlign,
} from './types';
