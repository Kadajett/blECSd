# Balatro Terminal Card Game

A terminal-based poker card game inspired by Balatro, demonstrating blECSd's capabilities for:

- **Fast animations** - Card dealing, scoring effects, and smooth transitions
- **Mouse support** - Click to select cards, hover effects
- **Keyboard controls** - Full keyboard navigation for accessibility
- **Complex game state** - Deck management, hand evaluation, scoring system

## Features

- Draw and discard poker mechanics
- Hand evaluation (pairs, flushes, straights, etc.)
- Score multipliers and chip calculations
- Animated card movements
- Visual scoring feedback

## Usage

```bash
pnpm --filter balatro-example start
```

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| `1-5` | Toggle card selection |
| `←/→` or `h/l` | Move card cursor |
| `Space` | Toggle current card |
| `Enter` | Play selected cards |
| `d` | Discard selected cards |
| `n` | Draw new cards |
| `q` | Quit |

### Mouse

- **Click card** - Toggle selection
- **Hover card** - Highlight card
- **Click "Play"** - Play selected cards
- **Click "Discard"** - Discard selected cards

## Architecture

This example demonstrates:

1. **ECS for Game State**
   - Card entities with Position, Velocity, Renderable components
   - Animation system for smooth card movements
   - Selection system for card picking

2. **Data Outside ECS**
   - Deck and hand management in plain data structures
   - Poker hand evaluation as pure functions
   - Score calculations

3. **Input Handling**
   - Mouse position tracking
   - Keyboard event processing
   - Input priority (always processed first)

4. **Animation System**
   - Spring physics for card movements
   - Easing functions for score popups
   - Staggered card dealing
