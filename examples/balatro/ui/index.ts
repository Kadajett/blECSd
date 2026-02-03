/**
 * UI layer exports
 * @module balatro/ui
 */

export type {
	Position,
	Rect,
	Layout,
	LayoutConfig,
	ButtonLayout,
} from './layout';

export {
	DEFAULT_LAYOUT_CONFIG,
	calculateLayout,
	getHandCardPositions,
	getPlayedCardPositions,
	getPlayAreaCenter,
	getScoreDisplayPosition,
	getButtonLayout,
	isScreenLargeEnough,
	getMinSizeMessage,
	isPositionInRect,
	getCardIndexAtPosition,
} from './layout';

export type {
	PreviewState,
	HandPreview,
	PreviewRenderData,
	PreviewBox,
	CardHighlight,
} from './hand-preview';

export {
	PREVIEW_COLORS,
	createHandPreview,
	isScoring,
	isValidHand,
	getPreviewScore,
	getPreviewRenderData,
	getPreviewStatusLine,
	createPreviewBox,
	getCardHighlight,
	getHighlightBrightness,
} from './hand-preview';

export type {
	MenuScreen,
	MenuOption,
	OptionsMenuItem,
	MenuState,
	TitleScreenLayout,
	MenuItem,
	MenuAction,
	TitleRenderData,
	OptionsRenderData,
	MenuInput,
} from './menu';

export {
	TITLE_ART,
	TITLE_WIDTH,
	SUBTITLE,
	FOOTER_TEXT,
	createMenuState,
	getMenuItems,
	getMenuItemCount,
	navigateUp,
	navigateDown,
	getSelectedItem,
	selectMenuItem,
	handleBack,
	calculateTitleLayout,
	centerX,
	titleCenterX,
	getTitleRenderData,
	getOptionsRenderData,
	processMenuInput,
	keyToMenuInput,
	isOnTitleScreen,
	isOnOptionsScreen,
	shouldStartGame,
} from './menu';

export type {
	EndScreenType,
	EndScreenOption,
	RunStatistics,
	EndScreenState,
	EndScreenRenderData,
	EndScreenInput,
	EndScreenAction,
} from './end-screen';

export {
	VICTORY_COLOR,
	GAME_OVER_COLOR,
	createEndScreenState,
	getEndScreenOptions,
	getOptionCount,
	navigateLeft,
	navigateRight,
	getSelectedOption,
	createRunStatistics,
	createEmptyStatistics,
	formatNumber,
	formatHandType,
	getVictoryRenderData,
	getGameOverRenderData,
	getEndScreenRenderData,
	processEndScreenInput,
	keyToEndScreenInput,
	isVictoryScreen,
	isGameOverScreen,
} from './end-screen';
