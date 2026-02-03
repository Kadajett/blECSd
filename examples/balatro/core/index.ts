/**
 * Core layer exports
 * @module balatro/core
 */

export type {
	GamePhase,
	SystemPhase,
	FrameContext,
	System,
	GameLoopConfig,
	GameLoopState,
	GameLoop,
} from './game-loop';

export {
	DEFAULT_LOOP_CONFIG,
	createLoopState,
	createGameLoop,
	createSystem,
	createInputSystem,
	createLogicSystem,
	createAnimationSystem,
	createLayoutSystem,
	createRenderSystem,
	createPostRenderSystem,
	isPlayablePhase,
	isAnimatingPhase,
	isTerminalPhase,
	getPhaseAfterDealing,
	getPhaseAfterScoring,
} from './game-loop';

export type {
	ActionResult,
	PlayResult,
	DiscardResult,
	DrawResult,
	ActionValidation,
} from './actions';

export {
	validatePlay,
	validateDiscard,
	validateDraw,
	playSelectedCards,
	discardSelectedCards,
	drawToFillHand,
	clearPlayedCards,
	playAndDraw,
	discardAndDraw,
	getCardsAtIndices,
	cardIdsToIndices,
	indicesToCardIds,
} from './actions';

export type {
	RoundStartResult,
	RoundEndResult,
	MoneyBreakdown,
	GameEndState,
} from './round';

export {
	startRound,
	checkWinCondition,
	checkLossCondition,
	getGameEndState,
	isVictory,
	calculateInterest,
	calculateHandsBonus,
	calculateMoneyAward,
	awardMoney,
	endRound,
	getBlindIndex,
	getNextBlindName,
	isBossBlind,
	isFinalAnte,
	getGameProgress,
	getRoundStatus,
	getScoreDeficit,
	getScoreSurplus,
} from './round';
