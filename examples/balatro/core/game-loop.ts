/**
 * Main Game Loop and System Scheduler
 *
 * Implements the core game loop with proper system ordering.
 * Input is ALWAYS processed first, followed by game logic, animation, and rendering.
 *
 * @module balatro/core/game-loop
 */

// =============================================================================
// TYPES
// =============================================================================

export type GamePhase =
	| 'DEALING'
	| 'PLAYING'
	| 'SCORING'
	| 'SHOPPING'
	| 'GAME_OVER'
	| 'VICTORY';

export type SystemPhase =
	| 'INPUT'
	| 'GAME_LOGIC'
	| 'ANIMATION'
	| 'LAYOUT'
	| 'RENDER'
	| 'POST_RENDER';

export interface FrameContext {
	readonly deltaTime: number;
	readonly totalTime: number;
	readonly frameCount: number;
	readonly phase: GamePhase;
}

export interface System<TState> {
	readonly name: string;
	readonly phase: SystemPhase;
	run: (state: TState, ctx: FrameContext) => TState;
}

export interface GameLoopConfig {
	/** Target frames per second */
	readonly targetFps: number;
	/** Maximum delta time to prevent spiral of death */
	readonly maxDeltaTime: number;
	/** Fixed timestep for physics (0 = use deltaTime) */
	readonly fixedTimestep: number;
}

export interface GameLoopState {
	readonly running: boolean;
	readonly phase: GamePhase;
	readonly frameCount: number;
	readonly totalTime: number;
	readonly lastFrameTime: number;
	readonly fps: number;
	readonly fpsFrameCount: number;
	readonly fpsLastUpdate: number;
}

export interface GameLoop<TState> {
	readonly state: GameLoopState;
	start: (initialState: TState) => Promise<void>;
	stop: () => void;
	transitionTo: (phase: GamePhase) => void;
	getGameState: () => TState | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_LOOP_CONFIG: GameLoopConfig = {
	targetFps: 60,
	maxDeltaTime: 0.1, // 100ms max
	fixedTimestep: 0, // Use deltaTime
};

/** System phases in execution order */
const PHASE_ORDER: readonly SystemPhase[] = [
	'INPUT',
	'GAME_LOGIC',
	'ANIMATION',
	'LAYOUT',
	'RENDER',
	'POST_RENDER',
];

// =============================================================================
// GAME LOOP STATE
// =============================================================================

/**
 * Creates initial game loop state.
 */
export function createLoopState(initialPhase: GamePhase = 'DEALING'): GameLoopState {
	return {
		running: false,
		phase: initialPhase,
		frameCount: 0,
		totalTime: 0,
		lastFrameTime: Date.now(),
		fps: 0,
		fpsFrameCount: 0,
		fpsLastUpdate: Date.now(),
	};
}

/**
 * Updates FPS counter.
 */
function updateFps(state: GameLoopState, now: number): GameLoopState {
	const elapsed = now - state.fpsLastUpdate;

	if (elapsed >= 1000) {
		return {
			...state,
			fps: state.fpsFrameCount / (elapsed / 1000),
			fpsFrameCount: 0,
			fpsLastUpdate: now,
		};
	}

	return {
		...state,
		fpsFrameCount: state.fpsFrameCount + 1,
	};
}

// =============================================================================
// SYSTEM MANAGEMENT
// =============================================================================

/**
 * Groups systems by phase.
 */
function groupSystemsByPhase<TState>(
	systems: readonly System<TState>[],
): Map<SystemPhase, System<TState>[]> {
	const groups = new Map<SystemPhase, System<TState>[]>();

	for (const phase of PHASE_ORDER) {
		groups.set(phase, []);
	}

	for (const system of systems) {
		const group = groups.get(system.phase);
		if (group) {
			group.push(system);
		}
	}

	return groups;
}

/**
 * Runs all systems for a single frame.
 */
function runSystems<TState>(
	state: TState,
	systems: Map<SystemPhase, System<TState>[]>,
	ctx: FrameContext,
): TState {
	let currentState = state;

	for (const phase of PHASE_ORDER) {
		const phaseSystems = systems.get(phase) ?? [];

		for (const system of phaseSystems) {
			currentState = system.run(currentState, ctx);
		}
	}

	return currentState;
}

// =============================================================================
// GAME LOOP
// =============================================================================

/**
 * Creates a game loop with the specified systems.
 *
 * @param systems - Systems to run each frame
 * @param config - Loop configuration
 * @returns GameLoop controller
 */
export function createGameLoop<TState>(
	systems: readonly System<TState>[],
	config: GameLoopConfig = DEFAULT_LOOP_CONFIG,
): GameLoop<TState> {
	let loopState = createLoopState();
	let gameState: TState | null = null;
	const systemGroups = groupSystemsByPhase(systems);

	const frameTime = 1000 / config.targetFps;

	const loop = {
		get state() {
			return loopState;
		},

		async start(initialState: TState): Promise<void> {
			gameState = initialState;
			loopState = {
				...loopState,
				running: true,
				lastFrameTime: Date.now(),
				fpsLastUpdate: Date.now(),
			};

			const runFrame = (): void => {
				if (!loopState.running) return;

				const now = Date.now();
				let deltaTime = (now - loopState.lastFrameTime) / 1000;

				// Clamp delta time
				deltaTime = Math.min(deltaTime, config.maxDeltaTime);

				// Use fixed timestep if configured
				if (config.fixedTimestep > 0) {
					deltaTime = config.fixedTimestep;
				}

				// Update loop state
				loopState = {
					...loopState,
					frameCount: loopState.frameCount + 1,
					totalTime: loopState.totalTime + deltaTime,
					lastFrameTime: now,
				};
				loopState = updateFps(loopState, now);

				// Create frame context
				const ctx: FrameContext = {
					deltaTime,
					totalTime: loopState.totalTime,
					frameCount: loopState.frameCount,
					phase: loopState.phase,
				};

				// Run all systems
				if (gameState !== null) {
					gameState = runSystems(gameState, systemGroups, ctx);
				}

				// Schedule next frame
				const elapsed = Date.now() - now;
				const delay = Math.max(0, frameTime - elapsed);
				setTimeout(runFrame, delay);
			};

			// Start the loop
			runFrame();
		},

		stop(): void {
			loopState = { ...loopState, running: false };
		},

		transitionTo(phase: GamePhase): void {
			loopState = { ...loopState, phase };
		},

		getGameState(): TState | null {
			return gameState;
		},
	};

	return loop;
}

// =============================================================================
// SYSTEM HELPERS
// =============================================================================

/**
 * Creates a system with the specified phase and run function.
 */
export function createSystem<TState>(
	name: string,
	phase: SystemPhase,
	run: (state: TState, ctx: FrameContext) => TState,
): System<TState> {
	return { name, phase, run };
}

/**
 * Creates an input system (always runs first).
 */
export function createInputSystem<TState>(
	name: string,
	run: (state: TState, ctx: FrameContext) => TState,
): System<TState> {
	return createSystem(name, 'INPUT', run);
}

/**
 * Creates a game logic system.
 */
export function createLogicSystem<TState>(
	name: string,
	run: (state: TState, ctx: FrameContext) => TState,
): System<TState> {
	return createSystem(name, 'GAME_LOGIC', run);
}

/**
 * Creates an animation system.
 */
export function createAnimationSystem<TState>(
	name: string,
	run: (state: TState, ctx: FrameContext) => TState,
): System<TState> {
	return createSystem(name, 'ANIMATION', run);
}

/**
 * Creates a layout system.
 */
export function createLayoutSystem<TState>(
	name: string,
	run: (state: TState, ctx: FrameContext) => TState,
): System<TState> {
	return createSystem(name, 'LAYOUT', run);
}

/**
 * Creates a render system.
 */
export function createRenderSystem<TState>(
	name: string,
	run: (state: TState, ctx: FrameContext) => TState,
): System<TState> {
	return createSystem(name, 'RENDER', run);
}

/**
 * Creates a post-render system.
 */
export function createPostRenderSystem<TState>(
	name: string,
	run: (state: TState, ctx: FrameContext) => TState,
): System<TState> {
	return createSystem(name, 'POST_RENDER', run);
}

// =============================================================================
// PHASE CHECKS
// =============================================================================

/**
 * Checks if the game is in a playable phase.
 */
export function isPlayablePhase(phase: GamePhase): boolean {
	return phase === 'PLAYING';
}

/**
 * Checks if the game is in an animation phase.
 */
export function isAnimatingPhase(phase: GamePhase): boolean {
	return phase === 'DEALING' || phase === 'SCORING';
}

/**
 * Checks if the game is in a terminal phase.
 */
export function isTerminalPhase(phase: GamePhase): boolean {
	return phase === 'GAME_OVER' || phase === 'VICTORY';
}

/**
 * Gets the next phase after dealing completes.
 */
export function getPhaseAfterDealing(): GamePhase {
	return 'PLAYING';
}

/**
 * Gets the next phase after scoring completes.
 */
export function getPhaseAfterScoring(blindBeaten: boolean, handsRemaining: number): GamePhase {
	if (blindBeaten) {
		return 'SHOPPING';
	}
	if (handsRemaining <= 0) {
		return 'GAME_OVER';
	}
	return 'PLAYING';
}
