#!/usr/bin/env node
/**
 * Balatro Card Demo - Dealing Animation
 *
 * Demonstrates:
 * - Cards dealing from deck to hand with stagger
 * - Spring physics for smooth card movement
 * - Hand layout with card overlap
 * - Deck rendering with stacked cards
 *
 * @module examples/balatro
 */

import { addEntity, createWorld } from 'bitecs';
import type { World, Entity } from 'blecsd';
import {
	Position,
	setPosition,
	getPosition,
	Velocity,
	setVelocity,
	setZIndex,
	getZIndex,
	createCellBuffer,
	fillRect,
	renderText,
} from 'blecsd';

import { createDeck, shuffleDeck } from './data';
import type { Card } from './data';
import { CARD_WIDTH, CARD_HEIGHT, renderCard, renderCardShadow, renderCardBack } from './render';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Number of cards in hand */
const HAND_SIZE = 8;

/** Card overlap in hand (pixels between card left edges) */
const CARD_OVERLAP = 5;

/** Deck position (top-left of screen) */
const DECK_X = 3;
const DECK_Y = 2;

/** Stagger delay between dealing each card (ms) */
const DEAL_STAGGER_MS = 80;

/** Spring physics settings */
const SPRING_STIFFNESS = 12;
const SPRING_DAMPING = 0.7;

/** Frame rate target */
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

/** Background color (casino green) */
const BG_COLOR = 0x1a472a_ff;

/** Deck remaining cards to show stacked */
const DECK_STACK_VISIBLE = 5;

// =============================================================================
// TYPES
// =============================================================================

type CardState = 'in_deck' | 'dealing' | 'in_hand';

interface CardEntity {
	readonly eid: Entity;
	readonly card: Card;
	state: CardState;
	targetX: number;
	targetY: number;
	dealTime: number; // When this card should start dealing
	handIndex: number; // Position in hand (0-7)
}

interface AppState {
	readonly world: World;
	readonly cards: CardEntity[];
	readonly deckCards: readonly Card[]; // Cards remaining in deck
	buffer: ReturnType<typeof createCellBuffer>;
	width: number;
	height: number;
	running: boolean;
	frameCount: number;
	lastFpsUpdate: number;
	fps: number;
	gameStartTime: number;
	dealingComplete: boolean;
}

// =============================================================================
// LAYOUT CALCULATIONS
// =============================================================================

/**
 * Calculates the X position for a card in the hand.
 */
function getHandCardX(handIndex: number, totalCards: number, screenWidth: number): number {
	const totalHandWidth = (totalCards - 1) * CARD_OVERLAP + CARD_WIDTH;
	const startX = Math.floor((screenWidth - totalHandWidth) / 2);
	return startX + handIndex * CARD_OVERLAP;
}

/**
 * Calculates the Y position for the hand (near bottom of screen).
 */
function getHandY(screenHeight: number): number {
	return screenHeight - CARD_HEIGHT - 2;
}

// =============================================================================
// ENTITY CREATION
// =============================================================================

/**
 * Creates a card entity starting in the deck.
 */
function createCardEntity(
	world: World,
	card: Card,
	handIndex: number,
	totalCards: number,
	width: number,
	height: number,
	gameStartTime: number,
): CardEntity {
	const eid = addEntity(world);

	// Start at deck position (slightly offset for stack effect)
	const stackOffset = Math.min(handIndex, DECK_STACK_VISIBLE) * 0.3;
	setPosition(world, eid, DECK_X + stackOffset, DECK_Y + stackOffset, handIndex);
	setVelocity(world, eid, 0, 0);
	setZIndex(world, eid, handIndex);

	// Calculate target position in hand
	const targetX = getHandCardX(handIndex, totalCards, width);
	const targetY = getHandY(height);

	// Calculate when this card should start dealing
	const dealTime = gameStartTime + 500 + handIndex * DEAL_STAGGER_MS;

	return {
		eid,
		card,
		state: 'in_deck',
		targetX,
		targetY,
		dealTime,
		handIndex,
	};
}

// =============================================================================
// ANIMATION
// =============================================================================

/**
 * Updates card positions using spring physics toward targets.
 */
function updateSpringPhysics(state: AppState, deltaTime: number): void {
	const { world, cards } = state;
	const now = Date.now();

	for (const cardEntity of cards) {
		const { eid, state: cardState, targetX, targetY, dealTime } = cardEntity;

		// Check if card should start dealing
		if (cardState === 'in_deck' && now >= dealTime) {
			cardEntity.state = 'dealing';
		}

		// Only animate cards that are dealing or in hand
		if (cardEntity.state === 'in_deck') continue;

		const pos = getPosition(world, eid);
		if (!pos) continue;

		// Get current velocity
		let vx = Velocity.x[eid] ?? 0;
		let vy = Velocity.y[eid] ?? 0;

		// Calculate spring force toward target
		const dx = targetX - pos.x;
		const dy = targetY - pos.y;

		// Spring force: F = -k * displacement
		const fx = SPRING_STIFFNESS * dx;
		const fy = SPRING_STIFFNESS * dy;

		// Apply spring force to velocity
		vx += fx * deltaTime;
		vy += fy * deltaTime;

		// Apply damping
		vx *= Math.pow(SPRING_DAMPING, deltaTime * 60);
		vy *= Math.pow(SPRING_DAMPING, deltaTime * 60);

		// Update position
		const newX = pos.x + vx * deltaTime * 60;
		const newY = pos.y + vy * deltaTime * 60;

		// Check if card has arrived (close enough and slow enough)
		const dist = Math.sqrt(dx * dx + dy * dy);
		const speed = Math.sqrt(vx * vx + vy * vy);

		if (dist < 0.5 && speed < 0.5) {
			// Snap to target
			Position.x[eid] = targetX;
			Position.y[eid] = targetY;
			Velocity.x[eid] = 0;
			Velocity.y[eid] = 0;
			cardEntity.state = 'in_hand';
		} else {
			Position.x[eid] = newX;
			Position.y[eid] = newY;
			Velocity.x[eid] = vx;
			Velocity.y[eid] = vy;
		}
	}

	// Check if all cards have been dealt
	if (!state.dealingComplete) {
		const allInHand = cards.every(c => c.state === 'in_hand');
		if (allInHand) {
			state.dealingComplete = true;
		}
	}
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders the deck (stack of face-down cards).
 */
function renderDeck(
	buffer: ReturnType<typeof createCellBuffer>,
	remainingCount: number,
): void {
	// Render stacked cards to show deck thickness
	const stackCount = Math.min(remainingCount, DECK_STACK_VISIBLE);

	for (let i = stackCount - 1; i >= 0; i--) {
		const offsetX = i * 0.5;
		const offsetY = i * 0.3;

		// Render shadow for bottom card only
		if (i === stackCount - 1) {
			renderCardShadow(buffer, DECK_X + offsetX, DECK_Y + offsetY, 1, 1);
		}

		renderCardBack(buffer, DECK_X + offsetX, DECK_Y + offsetY);
	}

	// Show count below deck
	if (remainingCount > 0) {
		const countText = `${remainingCount}`;
		renderText(
			buffer,
			DECK_X + Math.floor(CARD_WIDTH / 2) - Math.floor(countText.length / 2),
			DECK_Y + CARD_HEIGHT + 1,
			countText,
			0xaaaaaa_ff,
			BG_COLOR,
		);
	}
}

/**
 * Renders all cards to the buffer.
 */
function render(state: AppState): void {
	const { world, cards, deckCards, buffer, width, height, fps, dealingComplete } = state;

	// Clear buffer with casino green background
	fillRect(buffer, 0, 0, width, height, ' ', 0xffffff_ff, BG_COLOR);

	// Render deck (cards still in deck)
	const cardsInDeck = cards.filter(c => c.state === 'in_deck').length;
	const totalDeckCards = deckCards.length + cardsInDeck;
	if (totalDeckCards > 0) {
		renderDeck(buffer, totalDeckCards);
	}

	// Sort cards by z-index for correct layering
	const sortedCards = [...cards]
		.filter(c => c.state !== 'in_deck')
		.sort((a, b) => {
			const zA = getZIndex(world, a.eid);
			const zB = getZIndex(world, b.eid);
			return zA - zB;
		});

	// Render dealing/hand cards (back to front)
	for (const { eid, card } of sortedCards) {
		const pos = getPosition(world, eid);
		if (!pos) continue;

		// Render shadow
		renderCardShadow(buffer, pos.x, pos.y, 1, 1);

		// Render card face-up
		renderCard(buffer, card, pos.x, pos.y, false);
	}

	// Render status bar
	const statusText = dealingComplete
		? ` Hand dealt! | FPS: ${fps.toFixed(0)} | Press R to redeal, Q to quit `
		: ` Dealing... | FPS: ${fps.toFixed(0)} | Press Q to quit `;
	renderText(buffer, 0, 0, statusText, 0xffffff_ff, 0x000000_cc);

	// Render instructions at bottom
	const helpText = 'BALATRO - Terminal Edition';
	renderText(
		buffer,
		Math.floor((width - helpText.length) / 2),
		height - 1,
		helpText,
		0x88aa88_ff,
		BG_COLOR,
	);
}

// =============================================================================
// TERMINAL OUTPUT
// =============================================================================

/**
 * Converts cell buffer to ANSI escape sequences.
 */
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
// GAME SETUP
// =============================================================================

/**
 * Initializes/resets the game state for a new deal.
 */
function setupDeal(state: AppState): void {
	const { world, width, height } = state;
	const gameStartTime = Date.now();

	// Shuffle deck
	const deck = shuffleDeck(createDeck());

	// Clear existing cards
	state.cards.length = 0;

	// Create hand cards
	for (let i = 0; i < HAND_SIZE; i++) {
		const card = deck[i];
		if (card) {
			state.cards.push(
				createCardEntity(world, card, i, HAND_SIZE, width, height, gameStartTime),
			);
		}
	}

	// Store remaining deck
	(state as { deckCards: readonly Card[] }).deckCards = Object.freeze(deck.slice(HAND_SIZE));
	state.gameStartTime = gameStartTime;
	state.dealingComplete = false;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
	const stdout = process.stdout;
	const stdin = process.stdin;

	const width = stdout.columns ?? 80;
	const height = stdout.rows ?? 24;

	// Create world and buffer
	const world = createWorld();
	const buffer = createCellBuffer(width, height);

	const state: AppState = {
		world,
		cards: [],
		deckCards: [],
		buffer,
		width,
		height,
		running: true,
		frameCount: 0,
		lastFpsUpdate: Date.now(),
		fps: 0,
		gameStartTime: Date.now(),
		dealingComplete: false,
	};

	// Initial deal
	setupDeal(state);

	// Setup terminal
	stdout.write('\x1b[?1049h');
	stdout.write('\x1b[?25l');
	stdin.setRawMode?.(true);
	stdin.resume();

	// Handle input
	stdin.on('data', (data: Buffer) => {
		const str = data.toString();
		if (str === 'q' || str === 'Q' || str === '\x03') {
			state.running = false;
		} else if ((str === 'r' || str === 'R') && state.dealingComplete) {
			// Redeal
			setupDeal(state);
		}
	});

	// Handle resize
	stdout.on('resize', () => {
		state.width = stdout.columns ?? 80;
		state.height = stdout.rows ?? 24;
		state.buffer = createCellBuffer(state.width, state.height);

		// Recalculate hand positions
		for (const cardEntity of state.cards) {
			cardEntity.targetX = getHandCardX(cardEntity.handIndex, HAND_SIZE, state.width);
			cardEntity.targetY = getHandY(state.height);
		}
	});

	// Main loop
	let lastTime = Date.now();

	const loop = (): void => {
		if (!state.running) {
			stdout.write('\x1b[?25h');
			stdout.write('\x1b[?1049l');
			stdout.write('\x1b[0m');
			process.exit(0);
		}

		const now = Date.now();
		const deltaTime = (now - lastTime) / 1000;
		lastTime = now;

		// Update FPS counter
		state.frameCount++;
		if (now - state.lastFpsUpdate >= 1000) {
			state.fps = state.frameCount / ((now - state.lastFpsUpdate) / 1000);
			state.frameCount = 0;
			state.lastFpsUpdate = now;
		}

		// Update spring physics
		updateSpringPhysics(state, deltaTime);

		// Render
		render(state);

		// Output
		stdout.write(bufferToAnsi(state.buffer));

		// Schedule next frame
		const elapsed = Date.now() - now;
		const delay = Math.max(0, FRAME_TIME - elapsed);
		setTimeout(loop, delay);
	};

	// Start loop
	loop();
}

main().catch((err) => {
	process.stdout.write('\x1b[?1049l');
	process.stdout.write('\x1b[?25h');
	process.stdout.write('\x1b[0m');
	console.error('Error:', err);
	process.exit(1);
});
