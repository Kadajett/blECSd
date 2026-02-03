/**
 * Data layer exports
 * @module balatro/data
 */

export type { Card, Suit, Rank } from './card';
export {
	SUITS,
	RANKS,
	SUIT_SYMBOLS,
	RANK_VALUES,
	createCard,
	createDeck,
	shuffleDeck,
	getSuitSymbol,
	isRedSuit,
	getRankValue,
	compareByRank,
} from './card';

export type { HandType, HandResult, HandScore, ScoreResult } from './hand';
export {
	evaluateHand,
	calculateScore,
	getHandName,
	getHandBaseScore,
	getCardChips,
	compareHands,
} from './hand';

export type { GameState, Joker, JokerEffect } from './game-state';
export type { BlindInfo as GameBlindInfo } from './game-state';

export type { BlindType, BlindConfig, BossModifierType, BossModifier, BlindInfo } from './blind';
export {
	createBlind,
	getChipRequirement,
	getBossModifier,
	getAllBossModifiers,
	isCardDebuffed,
	getModifiedHandSize,
	getModifiedDiscards,
	isValidPlay,
	getScoringCards,
	getNextBlindType,
	isBossBlind,
	getAnteBlinds,
} from './blind';
export {
	createGameState,
	resetRound,
	drawCards,
	playCards,
	discardCards,
	nextBlind,
	nextAnte,
	clearPlayed,
	addJoker,
	removeJoker,
	addMoney,
	spendMoney,
	hasBeatenBlind,
	isGameOver,
	cardsNeededToFillHand,
	MAX_HAND_SIZE,
	MIN_PLAY_SIZE,
	MAX_PLAY_SIZE,
	STARTING_HANDS,
	STARTING_DISCARDS,
	STARTING_MONEY,
} from './game-state';

export type {
	JokerRarity,
	JokerTrigger,
	JokerEffectType,
	JokerCondition,
	JokerEffect as JokerEffectDefinition,
	Joker as JokerData,
	JokerState,
	ScoreModification,
	AppliedJokerEffect,
} from './joker';

export {
	STARTER_JOKERS,
	MAX_JOKER_SLOTS,
	getJokerById,
	getJokersByRarity,
	getRandomJoker,
	checkCondition,
	applyJokerEffect,
	applyJokerEffects,
	createJokerInstance,
	getJokerSellValue,
	getJokerDescription,
	hasJokerSlot,
	calculateFinalScore,
} from './joker';

export type {
	EnhancementType,
	EditionType,
	SealType,
	EnhancedCard,
	EnhancementBonus,
	EditionBonus,
	SealEffect,
	CombinedCardBonus,
} from './enhancement';

export type {
	PlanetName,
	PlanetCard,
	HandLevels,
	LeveledHandScore,
	PlanetUseResult,
} from './planet';

export {
	PLANET_CARDS,
	getPlanetById,
	getPlanetForHandType,
	getRandomPlanet,
	createHandLevels,
	getHandLevel,
	levelUpHand,
	getLeveledHandScore,
	getLeveledScore,
	usePlanetCard,
	applyPlanetCard,
	formatLeveledScore,
	formatPlanetCard,
	getPlanetColor,
	hasLeveledHands,
	getTotalLevelsGained,
	getHighestLeveledHand,
} from './planet';

export type {
	TarotName,
	TarotTargetType,
	TarotEffectType,
	TarotCard,
	ConsumableType,
	ConsumableSlot,
	ConsumableState,
	TarotUseResult,
} from './consumable';

export {
	TAROT_CARDS,
	MAX_CONSUMABLE_SLOTS,
	getTarotById,
	getRandomTarot,
	getTarotTargetCount,
	createConsumableState,
	hasEmptySlot,
	getEmptySlotIndex,
	addConsumable,
	removeConsumable,
	getConsumable,
	getFilledSlotCount,
	canUseTarot,
	increaseRank,
	useTarotCard,
	useConsumableSlot,
	getTarotColor,
	formatConsumableSlot,
} from './consumable';

export {
	applyEnhancement,
	applyEdition,
	applySeal,
	removeEnhancement,
	removeEdition,
	removeSeal,
	getEnhancementBonus,
	getPassiveBonus,
	getEndOfRoundBonus,
	getEditionBonus,
	getCombinedScoringBonus,
	getEnhancementName,
	getEnhancementDescription,
	getEditionName,
	getEditionDescription,
	getSealName,
	getSealDescription,
	getEnhancementColor,
	getEditionColor,
	isEnhanced,
	hasEdition,
	hasSeal,
	isModified,
	getAllEnhancementTypes,
	getAllEditionTypes,
	getAllSealTypes,
} from './enhancement';

export type {
	RunStats,
	SessionStats,
	HandPlayedRecord,
	BlindCompleteRecord,
	StatsSummary,
	StatsLine,
} from './run-stats';

export {
	createRunStats,
	createSessionStats,
	recordHandPlayed,
	recordDiscard,
	recordBlindComplete,
	recordJokerCollected,
	recordMoneyEarned,
	recordMoneySpent,
	recordPackOpened,
	recordPlanetUsed,
	recordTarotUsed,
	recordRunComplete,
	getRunStatsSummary,
	getSessionStatsSummary,
	formatStatNumber,
	getWinRate,
	getNetMoney,
	serializeSessionStats,
	deserializeSessionStats,
} from './run-stats';

export type { SortMode, SortState } from './card-sort';

export {
	createSortState,
	cycleSortMode,
	setSortMode,
	toggleAutoSort,
	sortByRank,
	sortBySuit,
	sortBySuitThenRank,
	sortCards,
	sortHand,
	getSortModeName,
	getAllSortModes,
	getSuitOrder,
	getSortedIndices,
} from './card-sort';
