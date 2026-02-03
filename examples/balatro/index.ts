#!/usr/bin/env node
/**
 * Balatro Terminal Edition
 *
 * A complete terminal poker roguelike wired together using:
 * - createGameLoop from core/game-loop for frame management
 * - bitecs ECS entities for card position animation
 * - Pure functional GameState for all game logic
 * - All existing ui, input, animation, render, and data modules
 *
 * @module examples/balatro
 */

import { addEntity, removeEntity } from 'bitecs';
import type { World, Entity } from 'blecsd';
import {
	Position,
	setPosition,
	getPosition,
	Velocity,
	setVelocity,
	createCellBuffer,
	fillRect,
	renderText,
	createWorld,
} from 'blecsd';
import type { WriteStream, ReadStream } from 'node:tty';

// Core
import type { FrameContext, GamePhase } from './core';
import {
	createGameLoop,
	createInputSystem,
	createAnimationSystem,
	createRenderSystem,
	createPostRenderSystem,
	createLogicSystem,
} from './core';
import {
	playAndDraw,
	discardAndDraw,
} from './core';
import {
	startRound,
	endRound,
	getGameEndState,
	getRoundStatus,
	getNextBlindName,
	isBossBlind as isCurrentBossBlind,
	isFinalAnte,
} from './core';

// Data
import type { GameState } from './data';
import type { Card } from './data';
import type { HandType } from './data';
import {
	createGameState,
	nextBlind,
	nextAnte,
	spendMoney,
	addJoker as addJokerToState,
	getHandName,
} from './data';
import { sortHand, createSortState, cycleSortMode } from './data';
import type { SortState } from './data';
import { createRunStats, recordHandPlayed, recordBlindComplete } from './data';

// Input
import type { InputState, KeyAction } from './input/keyboard';
import {
	parseKeyEvent,
	createInputState,
	getActionForKey,
	processAction,
	clearSelections as clearInputSelections,
} from './input/keyboard';

// UI
import type { Layout } from './ui/layout';
import { calculateLayout, getHandCardPositions, getPlayAreaCenter } from './ui/layout';
import type { MenuState, MenuAction } from './ui/menu';
import {
	createMenuState,
	processMenuInput,
	keyToMenuInput,
	getTitleRenderData,
	getOptionsRenderData,
	isOnTitleScreen,
	isOnOptionsScreen,
} from './ui/menu';
import type { ShopState, ShopAction } from './ui/shop';
import {
	generateShopInventory,
	processShopInput,
	keyToShopInput,
	getShopRenderData,
	buyJoker,
	buyPack,
	buyVoucher,
	rerollShop,
} from './ui/shop';
import type { PackOpeningState, PackOpeningAction } from './ui/pack-opening';
import {
	openPack,
	processPackInput,
	keyToPackInput,
	getPackOpeningRenderData,
	isPackDone,
	getItemName,
} from './ui/pack-opening';
import type { EndScreenState, EndScreenAction } from './ui/end-screen';
import {
	createEndScreenState,
	createRunStatistics,
	processEndScreenInput,
	keyToEndScreenInput,
	getEndScreenRenderData,
} from './ui/end-screen';
import type { HandPreview } from './ui/hand-preview';
import {
	createHandPreview,
	getPreviewRenderData,
	createPreviewBox,
	PREVIEW_COLORS,
} from './ui/hand-preview';
import type { HelpOverlayState } from './ui/help-overlay';
import {
	createHelpOverlayState,
	toggleHelpOverlay,
	hideHelpOverlay,
	isHelpVisible,
	isShowingPokerHands,
	togglePokerHandReference,
	getHelpRenderData,
	getPokerHandsRenderData,
	createBoxLines,
	formatPokerHand,
} from './ui/help-overlay';

// Animation
import type { LiftAnimationState } from './animation/card-lift';
import {
	createLiftAnimationState,
	addCardToLiftState,
	setSelectedCards,
	moveCursor,
	updateLiftAnimation,
	getCardY,
	clearSelections as clearLiftSelections,
} from './animation/card-lift';
import type { ScorePopupState } from './animation/score-popup';
import {
	createPopupState,
	createScoreSequence,
	updatePopups,
	getRenderablePopups,
	hasActivePopups,
} from './animation/score-popup';

// Render
import { CARD_WIDTH, CARD_HEIGHT, renderCard, renderCardBack, renderCardShadow } from './render';

// Terminal
import {
	parseArgs,
	createConfigFromArgs,
	initializeTerminal,
	cleanupTerminal,
	setupSignalHandlers,
	setupResizeHandler,
} from './terminal/init';
import type { TerminalState } from './terminal/init';

// =============================================================================
// TYPES
// =============================================================================

type Screen = 'menu' | 'playing' | 'shop' | 'pack_opening' | 'end_screen';

interface AppState {
	readonly screen: Screen;
	readonly running: boolean;

	// Display
	readonly width: number;
	readonly height: number;
	readonly buffer: ReturnType<typeof createCellBuffer>;
	readonly layout: Layout;

	// ECS world for card position animation
	readonly world: World;
	readonly cardEntities: Map<string, number>;

	// Menu
	readonly menuState: MenuState;

	// Playing
	readonly gameState: GameState;
	readonly inputState: InputState;
	readonly liftAnimation: LiftAnimationState;
	readonly popupState: ScorePopupState;
	readonly helpOverlay: HelpOverlayState;
	readonly handPreview: HandPreview;
	readonly sortState: SortState;
	readonly scoringPhase: boolean;
	readonly dealingPhase: boolean;
	readonly dealStartTime: number;

	// Run statistics
	readonly handsPlayed: number;
	readonly bestHandType: HandType | null;
	readonly bestHandScore: number;

	// Shop
	readonly shopState: ShopState | null;

	// Pack Opening
	readonly packOpeningState: PackOpeningState | null;

	// End Screen
	readonly endScreenState: EndScreenState | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BG_COLOR = 0x1a472a_ff;
const HEADER_BG = 0x0f2d1a_ff;
const HEADER_FG = 0xffffff_ff;
const STATUS_FG = 0xcccccc_ff;
const ACTION_FG = 0x88cc88_ff;
const CURSOR_FG = 0xffff44_ff;
const SELECTED_BG = 0xffffdd_ff;
const MONEY_COLOR = 0xffdd44_ff;
const TITLE_COLOR = 0xff4444_ff;

const SPRING_STIFFNESS = 12;
const SPRING_DAMPING = 0.7;
const DEAL_STAGGER_MS = 80;
const DEAL_INITIAL_DELAY = 300;

// =============================================================================
// MODULE-LEVEL MUTABLE STATE
// =============================================================================

// Raw input bytes queued from stdin (mutable, drained by input system)
const rawInputQueue: string[] = [];

// Terminal state reference (set in main, used for cleanup)
let termState: TerminalState | null = null;

// =============================================================================
// BUFFER TO ANSI
// =============================================================================

function bufferToAnsi(buffer: ReturnType<typeof createCellBuffer>): string {
	let output = '\x1b[H';
	let lastFg = -1;
	let lastBg = -1;

	for (let y = 0; y < buffer.height; y++) {
		const row = buffer.cells[y];
		if (!row) continue;

		for (let x = 0; x < buffer.width; x++) {
			const cell = row[x];
			if (!cell) continue;

			const fg = cell.fg;
			const bg = cell.bg;

			if (fg !== lastFg || bg !== lastBg) {
				const fgR = (fg >> 24) & 0xff;
				const fgG = (fg >> 16) & 0xff;
				const fgB = (fg >> 8) & 0xff;
				const bgR = (bg >> 24) & 0xff;
				const bgG = (bg >> 16) & 0xff;
				const bgB = (bg >> 8) & 0xff;
				output += `\x1b[38;2;${fgR};${fgG};${fgB};48;2;${bgR};${bgG};${bgB}m`;
				lastFg = fg;
				lastBg = bg;
			}

			output += cell.char;
		}

		if (y < buffer.height - 1) {
			output += '\n';
		}
	}

	return output;
}

// =============================================================================
// CARD ENTITY MANAGEMENT (bitecs)
// =============================================================================

function syncCardEntities(
	world: World,
	hand: readonly Card[],
	positions: readonly { x: number; y: number }[],
	entityMap: Map<string, number>,
	dealFromDeck: boolean,
	deckX: number,
	deckY: number,
): void {
	// Remove entities for cards no longer in hand
	const handIds = new Set(hand.map(c => c.id));
	for (const [cardId, eid] of entityMap) {
		if (!handIds.has(cardId)) {
			removeEntity(world, eid);
			entityMap.delete(cardId);
		}
	}

	// Create entities for new cards
	for (let i = 0; i < hand.length; i++) {
		const card = hand[i];
		if (!card) continue;
		const pos = positions[i];
		if (!pos) continue;

		if (!entityMap.has(card.id)) {
			const eid = addEntity(world);
			entityMap.set(card.id, eid);

			if (dealFromDeck) {
				// Start at deck position, will spring to target
				setPosition(world, eid, deckX, deckY, i);
			} else {
				// Place directly at target
				setPosition(world, eid, pos.x, pos.y, i);
			}
			setVelocity(world, eid, 0, 0);
		}
	}
}

function updateCardSpringPhysics(
	world: World,
	hand: readonly Card[],
	positions: readonly { x: number; y: number }[],
	entityMap: Map<string, number>,
	liftAnimation: LiftAnimationState,
	deltaTime: number,
): boolean {
	let allArrived = true;

	for (let i = 0; i < hand.length; i++) {
		const card = hand[i];
		if (!card) continue;
		const targetPos = positions[i];
		if (!targetPos) continue;

		const eid = entityMap.get(card.id);
		if (eid === undefined) continue;

		const pos = getPosition(world, eid);
		if (!pos) continue;

		// Get lift offset from card-lift animation
		const liftY = getCardY(liftAnimation, card.id);
		const targetY = liftY !== null ? liftY : targetPos.y;
		const targetX = targetPos.x;

		// Spring physics
		let vx = Velocity.x[eid] ?? 0;
		let vy = Velocity.y[eid] ?? 0;

		const dx = targetX - pos.x;
		const dy = targetY - pos.y;

		const fx = SPRING_STIFFNESS * dx;
		const fy = SPRING_STIFFNESS * dy;

		vx += fx * deltaTime;
		vy += fy * deltaTime;

		vx *= Math.pow(SPRING_DAMPING, deltaTime * 60);
		vy *= Math.pow(SPRING_DAMPING, deltaTime * 60);

		const newX = pos.x + vx * deltaTime * 60;
		const newY = pos.y + vy * deltaTime * 60;

		const dist = Math.sqrt(dx * dx + dy * dy);
		const speed = Math.sqrt(vx * vx + vy * vy);

		if (dist < 0.5 && speed < 0.5) {
			Position.x[eid] = targetX;
			Position.y[eid] = targetY;
			Velocity.x[eid] = 0;
			Velocity.y[eid] = 0;
		} else {
			Position.x[eid] = newX;
			Position.y[eid] = newY;
			Velocity.x[eid] = vx;
			Velocity.y[eid] = vy;
			allArrived = false;
		}
	}

	return allArrived;
}

// =============================================================================
// SCREEN TRANSITIONS
// =============================================================================

function transitionToPlaying(state: AppState): AppState {
	const gameState = createGameState();
	const { newState } = startRound(gameState);
	const layout = calculateLayout(state.width, state.height);
	const positions = getHandCardPositions(layout, newState.hand.length);

	// Build lift animation state for new hand
	let liftAnim = createLiftAnimationState();
	for (let i = 0; i < newState.hand.length; i++) {
		const card = newState.hand[i];
		const pos = positions[i];
		if (card && pos) {
			liftAnim = addCardToLiftState(liftAnim, card.id, pos.y);
		}
	}

	// Sync ECS entities (deal from deck)
	const deckPos = layout.deckPosition;
	syncCardEntities(state.world, newState.hand, positions, state.cardEntities, true, deckPos.x, deckPos.y);

	return {
		...state,
		screen: 'playing',
		gameState: newState,
		inputState: createInputState(),
		liftAnimation: liftAnim,
		popupState: createPopupState(),
		helpOverlay: createHelpOverlayState(),
		handPreview: createHandPreview([]),
		sortState: createSortState(),
		scoringPhase: false,
		dealingPhase: true,
		dealStartTime: Date.now(),
		handsPlayed: 0,
		bestHandType: null,
		bestHandScore: 0,
		layout,
	};
}

function transitionToShop(state: AppState): AppState {
	const roundResult = endRound(state.gameState);
	const shopInventory = generateShopInventory(
		roundResult.newState.currentAnte,
		roundResult.newState.jokers.map(j => j.id),
	);

	return {
		...state,
		screen: 'shop',
		gameState: roundResult.newState,
		shopState: shopInventory,
		popupState: createPopupState(),
	};
}

function transitionToNextRound(state: AppState): AppState {
	// Advance to next blind
	let gs = state.gameState;
	const isBoss = isCurrentBossBlind(gs);
	gs = isBoss ? nextAnte(gs) : nextBlind(gs);

	const { newState } = startRound(gs);
	const layout = calculateLayout(state.width, state.height);
	const positions = getHandCardPositions(layout, newState.hand.length);

	let liftAnim = createLiftAnimationState();
	for (let i = 0; i < newState.hand.length; i++) {
		const card = newState.hand[i];
		const pos = positions[i];
		if (card && pos) {
			liftAnim = addCardToLiftState(liftAnim, card.id, pos.y);
		}
	}

	const deckPos = layout.deckPosition;
	syncCardEntities(state.world, newState.hand, positions, state.cardEntities, true, deckPos.x, deckPos.y);

	return {
		...state,
		screen: 'playing',
		gameState: newState,
		inputState: createInputState(),
		liftAnimation: liftAnim,
		popupState: createPopupState(),
		helpOverlay: createHelpOverlayState(),
		handPreview: createHandPreview([]),
		scoringPhase: false,
		dealingPhase: true,
		dealStartTime: Date.now(),
		shopState: null,
		packOpeningState: null,
		layout,
	};
}

function transitionToEndScreen(state: AppState, type: 'victory' | 'game_over'): AppState {
	const stats = createRunStatistics(
		state.gameState,
		state.handsPlayed,
		state.bestHandType,
		state.bestHandScore,
	);

	return {
		...state,
		screen: 'end_screen',
		endScreenState: createEndScreenState(type, stats),
	};
}

function transitionToPackOpening(state: AppState, packIndex: number): AppState {
	if (!state.shopState) return state;

	const packResult = buyPack(state.shopState, packIndex, state.gameState.money);
	if (!packResult.success || !packResult.pack) return state;

	const newGameState = spendMoney(state.gameState, packResult.cost);
	if (!newGameState) return state;

	const packState = openPack(packResult.pack, newGameState.jokers.map(j => j.id));

	return {
		...state,
		gameState: newGameState,
		shopState: packResult.newState,
		packOpeningState: packState,
		screen: 'pack_opening',
	};
}

// =============================================================================
// SYNC LIFT ANIMATION WITH INPUT STATE
// =============================================================================

function syncLiftWithInput(
	liftAnim: LiftAnimationState,
	inputState: InputState,
	hand: readonly Card[],
): LiftAnimationState {
	// Set selected cards
	const selectedIds = inputState.selectedCards
		.filter(i => i < hand.length)
		.map(i => hand[i]!.id);
	let anim = setSelectedCards(liftAnim, selectedIds);

	// Set cursor
	const cursorCard = hand[inputState.cursorPosition];
	if (cursorCard) {
		anim = moveCursor(anim, cursorCard.id);
	}

	return anim;
}

// =============================================================================
// INPUT SYSTEM
// =============================================================================

function handleMenuInput(state: AppState, key: string): AppState {
	// Quit on q from title
	if (key === 'q' && isOnTitleScreen(state.menuState)) {
		return { ...state, running: false };
	}

	const menuInput = keyToMenuInput(key);
	if (!menuInput) return state;

	const [newMenuState, action] = processMenuInput(state.menuState, menuInput);

	let newState = { ...state, menuState: newMenuState };

	switch (action.type) {
		case 'start_game':
			return transitionToPlaying(newState);
		case 'quit':
			return { ...newState, running: false };
		default:
			return newState;
	}
}

function handlePlayingInput(state: AppState, key: string, action: KeyAction | null): AppState {
	// Help overlay intercepts all input when visible
	if (isHelpVisible(state.helpOverlay)) {
		return { ...state, helpOverlay: hideHelpOverlay(state.helpOverlay) };
	}

	// Block input during scoring/dealing
	if (state.scoringPhase || state.dealingPhase) return state;

	// Help toggle
	if (key === '?') {
		return {
			...state,
			helpOverlay: toggleHelpOverlay(state.helpOverlay, 'playing'),
		};
	}

	// Poker hands reference
	if (key === 'H') {
		return {
			...state,
			helpOverlay: togglePokerHandReference(state.helpOverlay),
		};
	}

	// Sort hand
	if (key === 's' || key === 'S') {
		const newSortState = cycleSortMode(state.sortState);
		const sortedHand = sortHand(state.gameState.hand, newSortState);
		const newGameState: GameState = { ...state.gameState, hand: sortedHand };
		const newInputState = clearInputSelections(state.inputState);

		const positions = getHandCardPositions(state.layout, sortedHand.length);
		let liftAnim = createLiftAnimationState();
		for (let i = 0; i < sortedHand.length; i++) {
			const card = sortedHand[i];
			const pos = positions[i];
			if (card && pos) {
				liftAnim = addCardToLiftState(liftAnim, card.id, pos.y);
			}
		}

		return {
			...state,
			gameState: newGameState,
			inputState: newInputState,
			sortState: newSortState,
			liftAnimation: liftAnim,
			handPreview: createHandPreview([]),
		};
	}

	if (!action) return state;

	// Quit
	if (action === 'QUIT') {
		return { ...state, running: false };
	}

	// Card selection and cursor actions
	const newInputState = processAction(state.inputState, action, state.gameState.hand.length);

	// Update preview and lift animation for selection changes
	const selectedCards = newInputState.selectedCards
		.filter(i => i < state.gameState.hand.length)
		.map(i => state.gameState.hand[i]!);
	const newPreview = createHandPreview(selectedCards);
	const newLiftAnim = syncLiftWithInput(state.liftAnimation, newInputState, state.gameState.hand);

	let newState: AppState = {
		...state,
		inputState: newInputState,
		handPreview: newPreview,
		liftAnimation: newLiftAnim,
	};

	// Handle play action
	if (action === 'PLAY_CARDS' && newInputState.selectedCards.length > 0) {
		const result = playAndDraw(state.gameState, newInputState.selectedCards);
		if (result.success) {
			const { newState: gs, handResult, scoreResult, blindBeaten } = result.data;

			// Score popup
			const center = getPlayAreaCenter(state.layout);
			const popups = createScoreSequence(
				state.popupState,
				scoreResult.baseChips,
				scoreResult.cardChips,
				scoreResult.mult,
				scoreResult.total,
				getHandName(handResult.type),
				center.x,
				center.y,
			);

			// Track stats
			const newHandsPlayed = state.handsPlayed + 1;
			const newBestType = !state.bestHandType || scoreResult.total > state.bestHandScore
				? handResult.type : state.bestHandType;
			const newBestScore = Math.max(state.bestHandScore, scoreResult.total);

			// Sync entities for new hand
			const positions = getHandCardPositions(state.layout, gs.hand.length);
			let liftAnim = createLiftAnimationState();
			for (let i = 0; i < gs.hand.length; i++) {
				const card = gs.hand[i];
				const pos = positions[i];
				if (card && pos) {
					liftAnim = addCardToLiftState(liftAnim, card.id, pos.y);
				}
			}
			syncCardEntities(
				state.world, gs.hand, positions, state.cardEntities,
				true, state.layout.deckPosition.x, state.layout.deckPosition.y,
			);

			newState = {
				...newState,
				gameState: gs,
				inputState: clearInputSelections(createInputState()),
				liftAnimation: liftAnim,
				popupState: popups,
				handPreview: createHandPreview([]),
				scoringPhase: true,
				handsPlayed: newHandsPlayed,
				bestHandType: newBestType,
				bestHandScore: newBestScore,
			};
		}
	}

	// Handle discard action
	if (action === 'DISCARD_CARDS' && newInputState.selectedCards.length > 0) {
		const result = discardAndDraw(state.gameState, newInputState.selectedCards);
		if (result.success) {
			const gs = result.data.newState;

			const positions = getHandCardPositions(state.layout, gs.hand.length);
			let liftAnim = createLiftAnimationState();
			for (let i = 0; i < gs.hand.length; i++) {
				const card = gs.hand[i];
				const pos = positions[i];
				if (card && pos) {
					liftAnim = addCardToLiftState(liftAnim, card.id, pos.y);
				}
			}
			syncCardEntities(
				state.world, gs.hand, positions, state.cardEntities,
				true, state.layout.deckPosition.x, state.layout.deckPosition.y,
			);

			newState = {
				...newState,
				gameState: gs,
				inputState: clearInputSelections(createInputState()),
				liftAnimation: liftAnim,
				handPreview: createHandPreview([]),
			};
		}
	}

	return newState;
}

function handleShopInput(state: AppState, key: string): AppState {
	if (!state.shopState) return state;

	if (key === 'q') return { ...state, running: false };

	if (key === '?') {
		return {
			...state,
			helpOverlay: toggleHelpOverlay(state.helpOverlay, 'shop'),
		};
	}

	if (isHelpVisible(state.helpOverlay)) {
		return { ...state, helpOverlay: hideHelpOverlay(state.helpOverlay) };
	}

	const shopInput = keyToShopInput(key);
	if (!shopInput) return state;

	const [newShopState, shopAction] = processShopInput(
		state.shopState,
		shopInput,
		state.gameState.money,
		state.gameState.jokers.length,
	);

	let newState: AppState = { ...state, shopState: newShopState };

	switch (shopAction.type) {
		case 'buy_joker': {
			const result = buyJoker(
				newShopState,
				shopAction.index,
				state.gameState.money,
				state.gameState.jokers.length,
			);
			if (result.success && result.joker) {
				const gs = spendMoney(state.gameState, result.cost);
				if (gs) {
					const withJoker = addJokerToState(gs, result.joker);
					newState = { ...newState, gameState: withJoker, shopState: result.newState };
				}
			}
			break;
		}
		case 'buy_pack': {
			return transitionToPackOpening(newState, shopAction.index);
		}
		case 'buy_voucher': {
			const result = buyVoucher(newShopState, state.gameState.money);
			if (result.success) {
				const gs = spendMoney(state.gameState, result.cost);
				if (gs) {
					newState = { ...newState, gameState: gs, shopState: result.newState };
				}
			}
			break;
		}
		case 'reroll': {
			const result = rerollShop(
				newShopState,
				state.gameState.money,
				state.gameState.currentAnte,
				state.gameState.jokers.map(j => j.id),
			);
			if (result.success) {
				const gs = spendMoney(state.gameState, result.cost);
				if (gs) {
					newState = { ...newState, gameState: gs, shopState: result.newState };
				}
			}
			break;
		}
		case 'next_round': {
			return transitionToNextRound(newState);
		}
	}

	return newState;
}

function handlePackOpeningInput(state: AppState, key: string): AppState {
	if (!state.packOpeningState) return state;

	const packInput = keyToPackInput(key);
	if (!packInput) return state;

	const [newPackState, packAction] = processPackInput(state.packOpeningState, packInput);
	let newState: AppState = { ...state, packOpeningState: newPackState };

	// Handle take actions
	if (packAction.type === 'take_joker' && packAction.item.joker) {
		const withJoker = addJokerToState(state.gameState, packAction.item.joker);
		newState = { ...newState, gameState: withJoker };
	}

	// Return to shop when done
	if (isPackDone(newPackState) || packAction.type === 'done' || packAction.type === 'skip_all') {
		return { ...newState, screen: 'shop', packOpeningState: null };
	}

	return newState;
}

function handleEndScreenInput(state: AppState, key: string): AppState {
	if (!state.endScreenState) return state;

	const endInput = keyToEndScreenInput(key);
	if (!endInput) return state;

	const [newEndState, endAction] = processEndScreenInput(state.endScreenState, endInput);
	let newState: AppState = { ...state, endScreenState: newEndState };

	switch (endAction.type) {
		case 'new_run':
		case 'retry':
			return transitionToPlaying(newState);
		case 'main_menu':
			return { ...newState, screen: 'menu', menuState: createMenuState() };
	}

	return newState;
}

// =============================================================================
// RENDERING FUNCTIONS
// =============================================================================

function renderMenuScreen(state: AppState): void {
	const { buffer, width, height, menuState } = state;

	fillRect(buffer, 0, 0, width, height, ' ', 0xffffff_ff, BG_COLOR);

	if (isOnTitleScreen(menuState)) {
		const data = getTitleRenderData(menuState, width, height);

		// Title art
		for (const line of data.titleLines) {
			renderText(buffer, line.x, line.y, line.text, TITLE_COLOR, BG_COLOR);
		}

		// Subtitle
		renderText(buffer, data.subtitle.x, data.subtitle.y, data.subtitle.text, 0xaaaaaa_ff, BG_COLOR);

		// Menu items
		for (const item of data.menuItems) {
			const fg = item.selected ? 0xffffff_ff : (item.enabled ? 0xcccccc_ff : 0x666666_ff);
			const bg = item.selected ? 0x2a5a3a_ff : BG_COLOR;
			renderText(buffer, item.x, item.y, item.text, fg, bg);
		}

		// Footer
		renderText(buffer, data.footer.x, data.footer.y, data.footer.text, 0x888888_ff, BG_COLOR);
	} else if (isOnOptionsScreen(menuState)) {
		const data = getOptionsRenderData(menuState, width, height);

		renderText(buffer, data.title.x, data.title.y, data.title.text, HEADER_FG, BG_COLOR);

		for (const item of data.items) {
			const prefix = item.selected ? '> ' : '  ';
			const text = item.value ? `${prefix}${item.label}: ${item.value}` : `${prefix}${item.label}`;
			const fg = item.selected ? 0xffffff_ff : 0xcccccc_ff;
			renderText(buffer, item.x, item.y, text, fg, BG_COLOR);
		}

		renderText(buffer, data.footer.x, data.footer.y, data.footer.text, 0x888888_ff, BG_COLOR);
	}
}

function renderPlayingScreen(state: AppState): void {
	const { buffer, width, height, gameState, inputState, layout, world, cardEntities } = state;

	fillRect(buffer, 0, 0, width, height, ' ', 0xffffff_ff, BG_COLOR);

	// Header bar
	const status = getRoundStatus(gameState);
	const headerText = ` Ante ${status.ante} | ${status.blind} | Score: ${status.score}/${status.target} | $${gameState.money} `;
	fillRect(buffer, 0, 0, width, 1, ' ', HEADER_FG, HEADER_BG);
	renderText(buffer, 1, 0, headerText, HEADER_FG, HEADER_BG);

	// Deck display
	const deckX = layout.deckPosition.x;
	const deckY = layout.deckPosition.y;
	if (gameState.deck.length > 0) {
		const stackCount = Math.min(gameState.deck.length, 3);
		for (let i = stackCount - 1; i >= 0; i--) {
			renderCardBack(buffer, deckX + i * 0.5, deckY + i * 0.3);
		}
		const countText = `${gameState.deck.length}`;
		renderText(
			buffer,
			deckX + Math.floor(CARD_WIDTH / 2) - Math.floor(countText.length / 2),
			deckY + CARD_HEIGHT + 1,
			countText,
			0xaaaaaa_ff,
			BG_COLOR,
		);
	}

	// Score popups
	const now = Date.now();
	const renderablePopups = getRenderablePopups(state.popupState, now);
	for (const popup of renderablePopups) {
		const textX = popup.x - Math.floor(popup.text.length / 2);
		renderText(buffer, textX, popup.y, popup.text, popup.color, BG_COLOR);
	}

	// Hand cards (rendered using ECS positions)
	const positions = getHandCardPositions(layout, gameState.hand.length);
	const sortedByZ: { card: Card; x: number; y: number; index: number }[] = [];

	for (let i = 0; i < gameState.hand.length; i++) {
		const card = gameState.hand[i];
		if (!card) continue;

		const eid = cardEntities.get(card.id);
		let cx: number;
		let cy: number;

		if (eid !== undefined) {
			const ecsPos = getPosition(world, eid);
			cx = ecsPos ? ecsPos.x : (positions[i]?.x ?? 0);
			cy = ecsPos ? ecsPos.y : (positions[i]?.y ?? 0);
		} else {
			cx = positions[i]?.x ?? 0;
			cy = positions[i]?.y ?? 0;
		}

		sortedByZ.push({ card, x: cx, y: cy, index: i });
	}

	// Render cards back to front
	for (const { card, x, y, index } of sortedByZ) {
		const isSelected = inputState.selectedCards.includes(index);
		renderCardShadow(buffer, x, y, 1, 1);
		renderCard(buffer, card, x, y, isSelected);

		// Cursor indicator
		if (index === inputState.cursorPosition && !state.dealingPhase) {
			const cursorX = Math.floor(x) + Math.floor(CARD_WIDTH / 2);
			const cursorY = Math.floor(y) + CARD_HEIGHT;
			renderText(buffer, cursorX, cursorY, '^', CURSOR_FG, BG_COLOR);
		}

		// Card number
		if (!state.dealingPhase) {
			const numX = Math.floor(x) + Math.floor(CARD_WIDTH / 2);
			const numY = Math.floor(y) - 1;
			if (numY >= 0) {
				renderText(buffer, numX, numY, `${index + 1}`, 0x888888_ff, BG_COLOR);
			}
		}
	}

	// Hand preview box (right side of play area)
	if (!state.dealingPhase && !state.scoringPhase) {
		const previewBox = createPreviewBox(state.handPreview);
		const previewX = width - previewBox.width - 2;
		const previewY = layout.playArea.y;

		const previewData = getPreviewRenderData(state.handPreview);
		for (let i = 0; i < previewBox.lines.length; i++) {
			const line = previewBox.lines[i];
			if (line) {
				const fg = i === 1 ? previewData.titleColor : 0xcccccc_ff;
				renderText(buffer, previewX, previewY + i, line, fg, BG_COLOR);
			}
		}
	}

	// Status bar
	const statusY = layout.statusBar.y;
	const statusText = ` Hands: ${status.hands} | Discards: ${status.discards} | Deck: ${gameState.deck.length} `;
	fillRect(buffer, 0, statusY, width, 1, ' ', STATUS_FG, HEADER_BG);
	renderText(buffer, 1, statusY, statusText, STATUS_FG, HEADER_BG);

	// Action bar
	const actionY = layout.actionBar.y;
	const dealingMsg = state.dealingPhase ? '  Dealing...' : '';
	const scoringMsg = state.scoringPhase ? '  Scoring...' : '';
	const actionText = state.dealingPhase
		? dealingMsg
		: state.scoringPhase
			? scoringMsg
			: ' [Enter] Play  [D] Discard  [S] Sort  [?] Help  [Q] Quit';
	fillRect(buffer, 0, actionY, width, 1, ' ', ACTION_FG, HEADER_BG);
	renderText(buffer, 1, actionY, actionText, ACTION_FG, HEADER_BG);

	// Help overlay
	if (isHelpVisible(state.helpOverlay)) {
		renderHelpOverlay(state);
	}
}

function renderHelpOverlay(state: AppState): void {
	const { buffer, width, height, helpOverlay } = state;

	if (isShowingPokerHands(helpOverlay)) {
		const data = getPokerHandsRenderData({}, width, height);
		const boxLines = createBoxLines(data.boxX, data.boxY, data.boxWidth, data.boxHeight);

		// Draw box background
		fillRect(buffer, data.boxX, data.boxY, data.boxWidth, data.boxHeight, ' ', 0xffffff_ff, 0x111111_ee);

		// Draw box border
		for (const line of boxLines) {
			renderText(buffer, line.x, line.y, line.text, 0x888888_ff, 0x111111_ee);
		}

		// Title
		const titleX = data.boxX + Math.floor((data.boxWidth - data.title.length) / 2);
		renderText(buffer, titleX, data.boxY + 1, data.title, MONEY_COLOR, 0x111111_ee);

		// Hands
		for (let i = 0; i < data.hands.length; i++) {
			const hand = data.hands[i];
			if (!hand) continue;
			const line = formatPokerHand(hand);
			renderText(buffer, data.boxX + 2, data.boxY + 3 + i, line, 0xcccccc_ff, 0x111111_ee);
		}

		// Footer
		const footerX = data.boxX + Math.floor((data.boxWidth - data.footer.length) / 2);
		renderText(buffer, footerX, data.boxY + data.boxHeight - 2, data.footer, 0x888888_ff, 0x111111_ee);
	} else {
		const data = getHelpRenderData(helpOverlay, width, height);
		const boxLines = createBoxLines(data.boxX, data.boxY, data.boxWidth, data.boxHeight);

		fillRect(buffer, data.boxX, data.boxY, data.boxWidth, data.boxHeight, ' ', 0xffffff_ff, 0x111111_ee);

		for (const line of boxLines) {
			renderText(buffer, line.x, line.y, line.text, 0x888888_ff, 0x111111_ee);
		}

		const titleX = data.boxX + Math.floor((data.boxWidth - data.title.length) / 2);
		renderText(buffer, titleX, data.boxY + 1, data.title, MONEY_COLOR, 0x111111_ee);

		let lineY = data.boxY + 3;
		for (const section of data.sections) {
			renderText(buffer, data.boxX + 2, lineY, section.title, 0xaaaaaa_ff, 0x111111_ee);
			lineY++;
			for (const binding of section.bindings) {
				const keysStr = binding.keys.join('/');
				const line = `  ${keysStr.padEnd(12)} ${binding.description}`;
				renderText(buffer, data.boxX + 2, lineY, line, 0xcccccc_ff, 0x111111_ee);
				lineY++;
			}
			lineY++;
		}

		const footerX = data.boxX + Math.floor((data.boxWidth - data.footer.length) / 2);
		renderText(buffer, footerX, data.boxY + data.boxHeight - 2, data.footer, 0x888888_ff, 0x111111_ee);
	}
}

function renderShopScreen(state: AppState): void {
	if (!state.shopState) return;

	const { buffer, width, height, gameState, shopState } = state;
	const renderData = getShopRenderData(shopState, gameState.money, gameState.jokers.length);

	fillRect(buffer, 0, 0, width, height, ' ', 0xffffff_ff, BG_COLOR);

	// Header
	fillRect(buffer, 0, 0, width, 1, ' ', HEADER_FG, HEADER_BG);
	const headerText = ` SHOP | $${renderData.money} `;
	renderText(buffer, 1, 0, headerText, MONEY_COLOR, HEADER_BG);

	let y = 3;

	// Jokers section
	renderText(buffer, 2, y, 'JOKERS:', 0xaaaaaa_ff, BG_COLOR);
	y++;
	for (let i = 0; i < renderData.jokerSlots.length; i++) {
		const slot = renderData.jokerSlots[i];
		if (!slot) continue;

		const isSelected = renderData.selectedSection === 'jokers' && renderData.selectedIndex === i;
		const prefix = isSelected ? '> ' : '  ';

		if (slot.sold) {
			renderText(buffer, 2, y, `${prefix}[SOLD]`, 0x666666_ff, BG_COLOR);
		} else if (slot.joker) {
			const text = `${prefix}${slot.joker.name} ($${slot.price})`;
			const fg = isSelected ? 0xffffff_ff : 0xcccccc_ff;
			renderText(buffer, 2, y, text, fg, isSelected ? 0x2a5a3a_ff : BG_COLOR);
			renderText(buffer, 6, y + 1, slot.joker.description, 0x888888_ff, BG_COLOR);
			y++;
		}
		y++;
	}

	y++;

	// Packs section
	renderText(buffer, 2, y, 'BOOSTER PACKS:', 0xaaaaaa_ff, BG_COLOR);
	y++;
	for (let i = 0; i < renderData.packSlots.length; i++) {
		const slot = renderData.packSlots[i];
		if (!slot) continue;

		const isSelected = renderData.selectedSection === 'packs' && renderData.selectedIndex === i;
		const prefix = isSelected ? '> ' : '  ';

		if (slot.sold) {
			renderText(buffer, 2, y, `${prefix}[SOLD]`, 0x666666_ff, BG_COLOR);
		} else if (slot.pack) {
			const text = `${prefix}${slot.pack.name} ($${slot.pack.price})`;
			const fg = isSelected ? 0xffffff_ff : 0xcccccc_ff;
			renderText(buffer, 2, y, text, fg, isSelected ? 0x2a5a3a_ff : BG_COLOR);
			renderText(buffer, 6, y + 1, slot.pack.description, 0x888888_ff, BG_COLOR);
			y++;
		}
		y++;
	}

	y++;

	// Voucher
	renderText(buffer, 2, y, 'VOUCHER:', 0xaaaaaa_ff, BG_COLOR);
	y++;
	const vSlot = renderData.voucherSlot;
	const vSelected = renderData.selectedSection === 'voucher';
	const vPrefix = vSelected ? '> ' : '  ';
	if (vSlot.sold) {
		renderText(buffer, 2, y, `${vPrefix}[SOLD]`, 0x666666_ff, BG_COLOR);
	} else if (vSlot.voucher) {
		const text = `${vPrefix}${vSlot.voucher.name} ($${vSlot.voucher.price})`;
		renderText(buffer, 2, y, text, vSelected ? 0xffffff_ff : 0xcccccc_ff, vSelected ? 0x2a5a3a_ff : BG_COLOR);
		renderText(buffer, 6, y + 1, vSlot.voucher.description, 0x888888_ff, BG_COLOR);
		y++;
	}
	y += 2;

	// Actions
	const rerollSelected = renderData.selectedSection === 'actions' && renderData.selectedIndex === 0;
	const nextSelected = renderData.selectedSection === 'actions' && renderData.selectedIndex === 1;

	const rerollText = `${rerollSelected ? '> ' : '  '}[R] Reroll ($${renderData.rerollCost})`;
	const nextText = `${nextSelected ? '> ' : '  '}[N] Next Round`;

	renderText(buffer, 2, y, rerollText, rerollSelected ? 0xffffff_ff : ACTION_FG, rerollSelected ? 0x2a5a3a_ff : BG_COLOR);
	y++;
	renderText(buffer, 2, y, nextText, nextSelected ? 0xffffff_ff : ACTION_FG, nextSelected ? 0x2a5a3a_ff : BG_COLOR);

	// Footer
	const footerText = ' [Enter] Buy  [R] Reroll  [N] Next Round  [?] Help  [Q] Quit';
	fillRect(buffer, 0, height - 1, width, 1, ' ', ACTION_FG, HEADER_BG);
	renderText(buffer, 1, height - 1, footerText, ACTION_FG, HEADER_BG);

	// Help overlay
	if (isHelpVisible(state.helpOverlay)) {
		renderHelpOverlay(state);
	}
}

function renderPackOpeningScreen(state: AppState): void {
	if (!state.packOpeningState) return;

	const { buffer, width, height } = state;
	const data = getPackOpeningRenderData(state.packOpeningState);

	fillRect(buffer, 0, 0, width, height, ' ', 0xffffff_ff, BG_COLOR);

	// Title
	const titleX = Math.floor((width - data.packName.length) / 2);
	renderText(buffer, titleX, 2, data.packName, MONEY_COLOR, BG_COLOR);

	// Picks remaining
	const picksText = `Choose ${data.picksRemaining} of ${data.maxSelections}`;
	const picksX = Math.floor((width - picksText.length) / 2);
	renderText(buffer, picksX, 4, picksText, 0xaaaaaa_ff, BG_COLOR);

	// Items
	const itemWidth = 20;
	const totalWidth = data.items.length * itemWidth;
	const startX = Math.floor((width - totalWidth) / 2);
	const itemY = 7;

	for (let i = 0; i < data.items.length; i++) {
		const item = data.items[i];
		if (!item) continue;

		const x = startX + i * itemWidth;
		const isCursor = i === data.cursorIndex;
		const prefix = isCursor ? '> ' : '  ';
		const name = getItemName(item);

		const fg = item.selected ? 0x666666_ff : (isCursor ? 0xffffff_ff : 0xcccccc_ff);
		const bg = isCursor ? 0x2a5a3a_ff : BG_COLOR;

		const displayName = item.selected ? `[TAKEN] ${name}` : `${prefix}${name}`;
		renderText(buffer, x, itemY, displayName, fg, bg);
	}

	// Footer
	const footerText = ' [Enter] Take  [Left/Right] Browse  [S] Skip';
	fillRect(buffer, 0, height - 1, width, 1, ' ', ACTION_FG, HEADER_BG);
	renderText(buffer, 1, height - 1, footerText, ACTION_FG, HEADER_BG);
}

function renderEndScreen(state: AppState): void {
	if (!state.endScreenState) return;

	const { buffer, width, height, endScreenState } = state;

	fillRect(buffer, 0, 0, width, height, ' ', 0xffffff_ff, BG_COLOR);

	const data = getEndScreenRenderData(endScreenState, width, height);

	// Text lines
	for (const line of data.lines) {
		renderText(buffer, line.x, line.y, line.text, line.color, BG_COLOR);
	}

	// Options
	for (const option of data.options) {
		const fg = option.selected ? 0xffffff_ff : 0xcccccc_ff;
		const bg = option.selected ? 0x2a5a3a_ff : BG_COLOR;
		renderText(buffer, option.x, option.y, option.label, fg, bg);
	}
}

// =============================================================================
// SYSTEMS
// =============================================================================

function createInputProcessingSystem() {
	return createInputSystem<AppState>('input', (state, _ctx) => {
		if (rawInputQueue.length === 0) return state;

		// Drain all queued input
		const inputs = rawInputQueue.splice(0, rawInputQueue.length);
		let currentState = state;

		for (const raw of inputs) {
			const event = parseKeyEvent(raw);

			// Ctrl+C always quits
			if (event.ctrl && event.key === 'c') {
				return { ...currentState, running: false };
			}

			const action = getActionForKey(event);

			switch (currentState.screen) {
				case 'menu':
					currentState = handleMenuInput(currentState, event.key);
					break;
				case 'playing':
					currentState = handlePlayingInput(currentState, event.key, action);
					break;
				case 'shop':
					currentState = handleShopInput(currentState, event.key);
					break;
				case 'pack_opening':
					currentState = handlePackOpeningInput(currentState, event.key);
					break;
				case 'end_screen':
					currentState = handleEndScreenInput(currentState, event.key);
					break;
			}

			if (!currentState.running) break;
		}

		return currentState;
	});
}

function createGameLogicSystem() {
	return createLogicSystem<AppState>('game-logic', (state, _ctx) => {
		if (state.screen !== 'playing') return state;

		// Check if scoring phase is complete (popups done)
		if (state.scoringPhase) {
			const now = Date.now();
			if (!hasActivePopups(state.popupState, now)) {
				// Scoring done, check game end
				const endState = getGameEndState(state.gameState);

				if (endState.type === 'victory') {
					return transitionToEndScreen(state, 'victory');
				}
				if (endState.type === 'lost') {
					return transitionToEndScreen(state, 'game_over');
				}

				// Check if blind beaten (go to shop)
				if (state.gameState.score >= state.gameState.currentBlind.chipTarget) {
					// Check for victory condition
					if (isCurrentBossBlind(state.gameState) && isFinalAnte(state.gameState)) {
						return transitionToEndScreen(state, 'victory');
					}
					return transitionToShop(state);
				}

				return { ...state, scoringPhase: false };
			}
		}

		return state;
	});
}

function createAnimationUpdateSystem() {
	return createAnimationSystem<AppState>('animation', (state, ctx) => {
		if (state.screen !== 'playing') return state;

		const positions = getHandCardPositions(state.layout, state.gameState.hand.length);

		// Update card lift animation
		const newLiftAnim = updateLiftAnimation(state.liftAnimation, ctx.deltaTime);

		// Update spring physics for card entities
		const allArrived = updateCardSpringPhysics(
			state.world,
			state.gameState.hand,
			positions,
			state.cardEntities,
			newLiftAnim,
			ctx.deltaTime,
		);

		// Update dealing phase
		let dealingPhase = state.dealingPhase;
		if (dealingPhase && allArrived) {
			const elapsed = Date.now() - state.dealStartTime;
			if (elapsed > DEAL_INITIAL_DELAY + state.gameState.hand.length * DEAL_STAGGER_MS + 200) {
				dealingPhase = false;
			}
		}

		// Update score popups
		const newPopups = updatePopups(state.popupState);

		return {
			...state,
			liftAnimation: newLiftAnim,
			popupState: newPopups,
			dealingPhase,
		};
	});
}

function createRenderingSystem() {
	return createRenderSystem<AppState>('render', (state, _ctx) => {
		// Resize buffer if needed
		let { buffer } = state;
		if (buffer.width !== state.width || buffer.height !== state.height) {
			buffer = createCellBuffer(state.width, state.height);
		}

		const newState = { ...state, buffer };

		switch (state.screen) {
			case 'menu':
				renderMenuScreen(newState);
				break;
			case 'playing':
				renderPlayingScreen(newState);
				break;
			case 'shop':
				renderShopScreen(newState);
				break;
			case 'pack_opening':
				renderPackOpeningScreen(newState);
				break;
			case 'end_screen':
				renderEndScreen(newState);
				break;
		}

		return newState;
	});
}

function createOutputSystem(stdout: WriteStream) {
	return createPostRenderSystem<AppState>('output', (state, _ctx) => {
		if (!state.running) {
			if (termState) {
				cleanupTerminal(termState);
			}
			process.exit(0);
		}

		stdout.write(bufferToAnsi(state.buffer));
		return state;
	});
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
	const stdout = process.stdout as WriteStream;
	const stdin = process.stdin as ReadStream;

	// Parse CLI arguments
	const args = parseArgs(process.argv.slice(2));

	if (args.help) {
		console.log('Balatro Terminal Edition');
		console.log('Usage: npx tsx examples/balatro/index.ts [options]');
		console.log('Options: --no-mouse, --no-sound, --seed <n>, --help');
		process.exit(0);
	}

	const config = createConfigFromArgs(args);

	// Initialize terminal
	termState = initializeTerminal(stdout, stdin, config);
	const { width, height } = termState;

	// Set up signal handlers
	setupSignalHandlers(() => {
		if (termState) cleanupTerminal(termState);
	});

	// Set up resize handler
	setupResizeHandler(stdout, (newWidth, newHeight) => {
		const current = gameLoop.getGameState();
		if (current) {
			// Can't mutate state from here, but we can queue a resize
			// We'll handle resize in the layout by checking stdout dimensions each frame
		}
	});

	// Create initial state
	const world = createWorld();
	const buffer = createCellBuffer(width, height);
	const layout = calculateLayout(width, height);

	const initialState: AppState = {
		screen: 'menu',
		running: true,
		width,
		height,
		buffer,
		layout,
		world,
		cardEntities: new Map(),
		menuState: createMenuState(),
		gameState: createGameState(),
		inputState: createInputState(),
		liftAnimation: createLiftAnimationState(),
		popupState: createPopupState(),
		helpOverlay: createHelpOverlayState(),
		handPreview: createHandPreview([]),
		sortState: createSortState(),
		scoringPhase: false,
		dealingPhase: false,
		dealStartTime: 0,
		handsPlayed: 0,
		bestHandType: null,
		bestHandScore: 0,
		shopState: null,
		packOpeningState: null,
		endScreenState: null,
	};

	// Create systems
	const systems = [
		createInputProcessingSystem(),
		createGameLogicSystem(),
		createAnimationUpdateSystem(),
		createRenderingSystem(),
		createOutputSystem(stdout),
	];

	// Create and start the game loop
	const gameLoop = createGameLoop(systems, {
		targetFps: 60,
		maxDeltaTime: 0.1,
		fixedTimestep: 0,
	});

	// Set up stdin listener (pushes raw bytes to queue)
	stdin.on('data', (data: Buffer) => {
		rawInputQueue.push(data.toString());
	});

	// Handle terminal resize in the render system by checking stdout each frame
	// Override the layout system to pick up resize
	const originalStart = gameLoop.start.bind(gameLoop);

	// Start the loop
	await gameLoop.start({
		...initialState,
		width: stdout.columns ?? width,
		height: stdout.rows ?? height,
	});
}

main().catch((err) => {
	if (termState) {
		cleanupTerminal(termState);
	} else {
		process.stdout.write('\x1b[?1049l');
		process.stdout.write('\x1b[?25h');
		process.stdout.write('\x1b[0m');
	}
	console.error('Error:', err);
	process.exit(1);
});
