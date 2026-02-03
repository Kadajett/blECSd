/**
 * Animation layer exports
 * @module balatro/animation
 */

export type {
	CardLiftState,
	CardLiftConfig,
	LiftAnimationState,
} from './card-lift';

export {
	DEFAULT_LIFT_CONFIG,
	createLiftAnimationState,
	createCardLiftState,
	addCardToLiftState,
	removeCardFromLiftState,
	updateCardBaseY,
	setCardSelected,
	setCardHovered,
	setCardCursor,
	moveCursor,
	clearHover,
	toggleCardSelection,
	clearSelections,
	setSelectedCards,
	updateLiftAnimation,
	getCardY,
	getCardLift,
	isCardSelected,
	getSelectedCardIds,
	isAnimating,
	getCardLiftState,
} from './card-lift';

export type {
	PopupType,
	ScorePopup,
	ScorePopupState,
	PopupConfig,
	RenderablePopup,
} from './score-popup';

export {
	DEFAULT_POPUP_CONFIG,
	POPUP_COLORS,
	createPopupState,
	addPopup,
	createScoreSequence,
	createBonusPopup,
	updatePopups,
	clearPopups,
	getPopupRenderState,
	getRenderablePopups,
	easeInOutQuad,
	hasActivePopups,
	getActivePopupCount,
} from './score-popup';
