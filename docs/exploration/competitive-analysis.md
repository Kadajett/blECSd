# Terminal UI Library Competitive Analysis

**Date:** February 13, 2026
**Researcher:** Claude (researcher agent)
**Purpose:** Comprehensive analysis of competing TUI libraries to identify feature gaps and architectural patterns for blECSd

## Executive Summary

This analysis covers 15+ terminal UI libraries across 8 programming languages. Key findings:

1. **CSS-like styling** is a major differentiator (Textual leads here)
2. **Virtual scrolling** for large datasets is table stakes
3. **Spring-physics animations** are becoming standard for modern UIs
4. **Search/grep in scrollback** is surprisingly rare as a built-in feature
5. **Accessibility (screen readers)** is only seriously addressed by Textual
6. **Layout systems** vary widely: constraint-based (Ratatui), CSS Grid (Textual), manual (BubbleTea)

---

## 1. Ratatui (Rust)

**Repository:** [github.com/ratatui/ratatui](https://github.com/ratatui/ratatui)
**Stars:** 18.2K | **Downloads:** 16.9M (crates.io) | **Dependent Crates:** 2,200+

### Architecture

- **Immediate-mode rendering**: Redraw entire UI each frame
- **Zero-cost abstractions**: Sub-millisecond rendering
- **Modular workspace** (as of 0.30.0): `ratatui-core` for widget libraries, main `ratatui` for apps
- **Unopinionated**: No forced event loop or app structure

### Widget Catalog

**Built-in widgets:**
- Charts (bar, line, sparkline)
- Tables with sorting/scrolling
- Gauges and progress bars
- Lists (scrollable, selectable)
- Tabs
- Calendar
- Block (container with borders)
- Paragraph (wrapped text)

**Community widgets:** 40+ additional widget crates

### Key Features

- **Constraint-based layouts**: `Length`, `Min`, `Max`, `Ratio`, `Percentage`
- **Nested layouts**: Build complex grids by composing layouts
- **Multiple backends**: crossterm, termion, termwiz
- **Scroll windowing**: Only render visible rows for performance
- **Painter's algorithm**: Efficient damage buffer rendering

### Layout System

Constraint-based responsive layouts that auto-adapt to terminal size. Supports:
- Horizontal/vertical splits
- Nested layouts
- Percentage-based sizing
- Min/max constraints
- Flex layouts

### Theming/Styling

**Approach:** Programmatic styling via `Style` struct

```rust
Style::default()
    .fg(Color::Red)
    .bg(Color::Black)
    .add_modifier(Modifiers::BOLD)
```

- Granular control but verbose
- No CSS-like stylesheets
- Styles associated with `Span` for inline text styling

### Performance

- **Sub-millisecond rendering** with immediate mode
- **60+ FPS** even with complex layouts
- **Query caching** for filter operations
- **Separate update intervals**: metrics vs UI refresh

### What blECSd is Missing

1. ❌ **Constraint-based layout system** - We have manual positioning
2. ❌ **Built-in chart widgets** - No data visualization
3. ❌ **Scroll windowing optimization** - We render full lists
4. ❌ **Multiple backend support** - We're tied to one terminal abstraction
5. ⚠️ **Painter's algorithm** - We could optimize damage detection
6. ❌ **Widget ecosystem** - No community widget packages (yet)

### Sources
- [Ratatui Official Site](https://ratatui.rs/)
- [Ratatui GitHub](https://github.com/ratatui/ratatui)
- [Ratatui Documentation](https://docs.rs/ratatui/latest/ratatui/)
- [Creating a TUI in Rust](https://raysuliteanu.medium.com/creating-a-tui-in-rust-e284d31983b3)

---

## 2. Textual (Python)

**Repository:** [github.com/Textualize/textual](https://github.com/Textualize/textual)
**Stars:** 33.5K | **PyPI Latest:** 7.5.0 (Jan 30, 2026)

### Architecture

- **Framework model**: Manages app lifecycle
- **CSS-based styling**: TCSS (Textual CSS)
- **Async rendering**: Built on Python's asyncio
- **Web & terminal**: Same app runs in browser or terminal
- **Event-driven**: Callbacks for key/mouse/timer events

### Widget Catalog

**Comprehensive built-in widgets:**
- Buttons, checkboxes, radio buttons
- Text inputs, text areas (multi-line editable)
- Tree controls with expansion
- Data tables (sortable, selectable)
- Progress bars, loading indicators
- Tabs, collapsible sections
- Command palette (fuzzy search)
- Select, multi-select dropdowns
- Log viewer with filtering

**All widgets scrollable by default**

### Key Features

- **CSS styling**: Separate `.tcss` files for styling
- **Spatial mapping algorithm**: Constant-time visibility checks for 1000+ widgets
- **Developer console**: Connect from another terminal to see logs/events
- **Command palette**: Built-in Ctrl+P fuzzy search
- **Screen reader support**: Accessibility built-in
- **Hot reload**: CSS changes apply instantly
- **Jupyter notebook embedding** (coming soon)

### Layout System

**Multiple layout modes:**
1. **Docking**: Dock widgets to edges (top, bottom, left, right)
2. **Grid**: CSS Grid-like system with rows/columns
3. **Horizontal/Vertical**: Simple flex-like layouts
4. **Layers**: Z-index based layering

### Theming/Styling

**Approach:** TCSS (Textual Cascading Style Sheets)

```tcss
Button {
    background: $primary;
    color: $text;
    border: solid $accent;
}

Button:hover {
    background: $primary-darken-2;
}
```

- **Selectors**: Class, ID, pseudo-classes (`:hover`, `:focus`)
- **Variables**: Define color schemes
- **Cascading**: Specificity rules like CSS
- **Theme system**: High-contrast, color-blind themes

### Performance

- **Spatial mapping**: O(1) visibility detection for scrolling
- **Virtual scrolling**: Render only visible widgets
- **Grid-based partitioning**: Efficient culling for large UIs
- **Optimized algorithms**: [Detailed blog post](https://textual.textualize.io/blog/2024/12/12/algorithms-for-high-performance-terminal-apps/)

### Accessibility

✅ **Best-in-class accessibility:**
- Screen reader integration
- Monochrome mode
- High-contrast themes
- Color-blind friendly themes
- Keyboard navigation focus indicators

### What blECSd is Missing

1. ❌ **CSS-like styling system** - Our theming is programmatic
2. ❌ **Command palette** - No fuzzy search UI
3. ❌ **Web compatibility** - Terminal only
4. ❌ **Developer console** - No separate log viewer
5. ❌ **Accessibility features** - No screen reader support
6. ❌ **Hot reload** - Restart required for changes
7. ❌ **Multi-line text editor** - No TextArea equivalent
8. ❌ **Tree control** - No expandable tree widget
9. ❌ **Spatial mapping algorithm** - Could improve scrolling perf

### Sources
- [Textual Official Site](https://textual.textualize.io/)
- [Textual GitHub](https://github.com/Textualize/textual)
- [Python Textual: Build Beautiful UIs](https://realpython.com/python-textual/)
- [Algorithms for high performance terminal apps](https://textual.textualize.io/blog/2024/12/12/algorithms-for-high-performance-terminal-apps/)

---

## 3. BubbleTea (Go)

**Repository:** [github.com/charmbracelet/bubbletea](https://github.com/charmbracelet/bubbletea)
**Stars:** 39.1K | **Dependent Apps:** 10,000+

### Architecture

- **Elm Architecture**: Model-Update-View pattern
- **Functional design**: Pure update functions
- **Framerate-based renderer**: Optimized redraw timing
- **Charm ecosystem**: Integrates with bubbles, lipgloss, harmonica

### Widget Catalog

**Bubbles component library:**
- Text input (single-line)
- Text area (multi-line, vim keybindings)
- List (scrollable, filterable)
- Table (sortable)
- Progress bar, spinner
- Viewport (scrollable region)
- Paginator
- File picker
- Help menu

**Note:** Fewer built-in widgets than Ratatui/Textual

### Key Features

- **Elm-style architecture**: Clean separation of concerns
- **Mouse support**: Click, scroll, drag
- **Focus reporting**: Track terminal focus
- **Production-ready**: Battle-tested in major apps (Glow, Huh, Crush)
- **Harmonica integration**: Spring-physics animations
- **Lipgloss styling**: Rich text formatting library

### Layout System

**Approach:** Manual layout in View functions

- No declarative layout system
- Use lipgloss for text positioning
- Developer responsible for sizing calculations
- Flexible but requires more code

### Theming/Styling

**Approach:** Lipgloss library for text styling

```go
lipgloss.NewStyle().
    Foreground(lipgloss.Color("#FF0000")).
    Background(lipgloss.Color("#000000")).
    Bold(true)
```

- **No CSS**: Programmatic styling
- **Lipgloss**: Separate library for "makeup for CLI"
- **Themes**: Managed in View functions
- **Charm ecosystem**: Pre-built color schemes available

### Performance

- **Framerate optimization**: Intelligent redraw timing
- **Event batching**: Process multiple events per frame
- **Efficient updates**: Only changed components re-render

### Animation System

**Harmonica:** Spring animation library

```go
spring := harmonica.NewSpring(harmonica.FPS(60), 6.0, 0.5)
spring.Update() // Apply spring physics
```

- **Spring physics**: Natural, organic motion
- **Damping & stiffness**: Configurable parameters
- **60 FPS target**: Smooth animations

### What blECSd is Missing

1. ❌ **Spring-physics animation system** - We have no animation framework
2. ❌ **Text formatting library** - No equivalent to lipgloss
3. ❌ **Framerate optimization** - We don't batch redraws intelligently
4. ⚠️ **File picker widget** - Could be useful for TUI apps
5. ❌ **Pre-built themes** - No ecosystem of color schemes
6. ⚠️ **Viewport widget** - We have scrolling but not as a reusable component

### Sources
- [BubbleTea GitHub](https://github.com/charmbracelet/bubbletea)
- [Developing a terminal UI in Go with Bubble Tea](https://packagemain.tech/p/terminal-ui-bubble-tea)
- [Terminal UI: BubbleTea vs Ratatui](https://www.glukhov.org/post/2026/02/tui-frameworks-bubbletea-go-vs-ratatui-rust/)

---

## 4. FTXUI (C++)

**Repository:** [github.com/ArthurSonzogni/FTXUI](https://github.com/ArthurSonzogni/FTXUI)
**Stars:** ~7K (estimate)

### Architecture

- **Functional, declarative**: Inspired by React
- **Three-layer architecture**:
  1. **Screen**: Low-level ANSI escape codes
  2. **DOM**: Hierarchical elements, responsive layout
  3. **Component**: Interactive stateful widgets

### Widget Catalog

**Built-in components:**
- Checkbox, radio buttons
- Input box
- Menu (vertical, horizontal)
- Buttons
- Sliders
- Dropdown menus
- Modal dialogs

**Note:** Must compose or extend for complex widgets

### Key Features

- **Declarative UI**: Describe UI as function composition
- **Responsive elements**: Auto-adapt to terminal size
- **Keyboard & mouse**: Full input support
- **Animations**: Built-in animation support
- **Cross-platform**: Works on Unix and Windows

### Layout System

**Approach:** Functional composition

```cpp
auto component = Container::Vertical({
    Renderer([] { return text("Header"); }),
    input | border,
    button | center
});
```

- **Flexbox-like**: Vertical/horizontal containers
- **Element decorators**: `border`, `center`, `flex`
- **Responsive**: Elements query available space

### Theming/Styling

**Approach:** Inline styling via element decorators

- Colors, borders, backgrounds applied to elements
- No stylesheet system
- Style as part of element tree

### What blECSd is Missing

1. ❌ **Three-layer architecture** - Clear separation of screen/DOM/component
2. ❌ **Declarative UI composition** - We're more imperative
3. ⚠️ **Animation framework** - They have built-in support
4. ⚠️ **Modal dialog system** - We could add this

### Sources
- [FTXUI GitHub](https://github.com/ArthurSonzogni/FTXUI)
- [FTXUI Introduction](https://arthursonzogni.github.io/FTXUI/)

---

## 5. Notcurses (C)

**Repository:** [github.com/dankamongmen/notcurses](https://github.com/dankamongmen/notcurses)

### Architecture

- **Multimedia TUI**: Images, video, sprites
- **Thread-safe**: Designed for parallel programs
- **Two modes**:
  - **TUI mode**: Full-screen, non-scrolling
  - **CLI mode**: Scrolling output

### Key Features

- **24-bit color** natively
- **Bitmap graphics**: Sixel, Kitty, Linux framebuffer
- **Video playback**: Full multimedia support
- **Unicode EGC**: Extended Grapheme Cluster support
- **Unambiguous keyboard protocols**
- **Sprite system**: For terminal games

### What blECSd is Missing

1. ❌ **Multimedia support** - No images, video, sprites
2. ❌ **Sixel/Kitty graphics** - We're text-only
3. ❌ **Thread safety guarantees** - Not a design goal yet
4. ⚠️ **TUI vs CLI modes** - We could support both

**Note:** Notcurses is overkill for most TUI apps but shows what's possible

### Sources
- [Notcurses Official Site](https://notcurses.com/)
- [Notcurses GitHub](https://github.com/dankamongmen/notcurses)
- [Terminal Magic With Notcurses](https://hackaday.com/2021/05/20/terminal-magic-with-notcurses/)

---

## 6. Cursive (Rust)

**Repository:** [github.com/gyscos/cursive](https://github.com/gyscos/cursive)

### Architecture

- **Event-driven**: Callback-based reactivity
- **ncurses-based**: Traditional curses approach
- **High-level framework**: More batteries-included than Ratatui

### Widget Catalog

- Menu bars
- Text areas
- Lists, select views
- Dialog boxes
- Buttons, checkboxes, radio buttons
- Progress bars

### Key Features

- **Theme system**: Custom colors and styles
- **Event callbacks**: Set triggers for user actions
- **Backend flexibility**: ncurses, termion, crossterm, pancurses
- **Linux TTY compatible**: Works on barebones terminals

### Layout System

**Approach:** View composition

```rust
LinearLayout::vertical()
    .child(TextView::new("Header"))
    .child(Button::new("Click me", |s| { ... }))
```

### What blECSd is Missing

1. ⚠️ **Menu bar widget** - Could be useful
2. ⚠️ **Dialog box system** - Modals/alerts
3. ⚠️ **Backend abstraction** - We're coupled to one implementation

### Sources
- [Cursive GitHub](https://github.com/gyscos/cursive)
- [Cursive: Writing terminal applications in Rust](https://cafbit.com/post/cursive_writing_terminal_applications_in_rust/)

---

## 7. tview (Go)

**Repository:** [github.com/rivo/tview](https://github.com/rivo/tview)

### Architecture

- **Widget-centric**: Rich, interactive widgets
- **tcell-based**: Version 2 of tcell renderer
- **Backwards-compatible**: Stable API guarantees

### Widget Catalog

- **TextView**: Multi-color, scrollable, highlighted text
- **TextArea**: Editable multi-line text
- **Table**: Scrollable tabular data
- **List**: Selectable list items
- **Form**: Input forms (text, checkboxes, buttons, dropdowns)
- **TreeView**: Hierarchical tree structure
- **Flex**: Flexible layout container
- **Grid**: Grid-based layout
- **Modal**: Dialog boxes
- **Pages**: Multi-page navigation

### Key Features

- **Mouse & paste events**: Full input support
- **Focus management**: On-focus actions, key bindings
- **Backwards compatibility**: Won't break on upgrades
- **Rich widgets**: More built-in widgets than most libraries

### What blECSd is Missing

1. ❌ **TreeView widget** - Hierarchical data display
2. ❌ **Form abstraction** - Combined input widgets
3. ❌ **Pages/navigation system** - Multi-screen apps
4. ⚠️ **Grid layout** - We have manual positioning

### Sources
- [tview GitHub](https://github.com/rivo/tview)
- [Building A Terminal User Interface With Golang](https://earthly.dev/blog/tui-app-with-go/)

---

## 8. Rich (Python)

**Repository:** [github.com/Textualize/rich](https://github.com/Textualize/rich)
**Stars:** ~50K (estimate)

**Note:** Rich is primarily a *rendering library*, not a full TUI framework

### Key Features

- **Beautiful terminal output**: Tables, markdown, syntax highlighting
- **Progress bars**: Multiple simultaneous progress displays
- **Logging**: Colorized, formatted logs
- **Inspect**: Generate reports on Python objects
- **Layout**: Subdivide terminal into regions
- **Console abstraction**: Unified output interface

### What Rich Brings (Not TUI)

- **Rendering primitives**: We might want similar output quality
- **Layout subdivisions**: Dashboard-like interfaces
- **Syntax highlighting**: Code display in TUI apps

### Sources
- [Rich GitHub](https://github.com/Textualize/rich)
- [Rich Documentation](https://rich.readthedocs.io/)

---

## 9. Urwid (Python)

**Repository:** [github.com/urwid/urwid](https://github.com/urwid/urwid)

### Architecture

- **Widget construction set**: Low-level building blocks
- **Event loop**: Built-in async event handling
- **Display modules**: Multiple backend support

### Widget Catalog

- **ListBox**: Powerful scrolling with list walkers
- **Edit**: Text input and modification
- **Button, CheckBox, RadioButton**: Input widgets
- **Simple graphics**: Character-style drawing

### Key Features

- **Display attributes**: 24-bit, 256-color, bold, underline
- **Responsive design**: Terminal resize support
- **Widget caching**: Canvas cache for performance
- **List walkers**: Custom scrolling behavior

### What blECSd is Missing

1. ⚠️ **List walker abstraction** - Custom scroll logic
2. ⚠️ **Canvas caching** - Performance optimization
3. ⚠️ **Multiple display backends** - Backend abstraction

### Sources
- [Urwid GitHub](https://github.com/urwid/urwid)
- [Urwid Library Overview](https://urwid.org/manual/overview.html)

---

## 10. prompt_toolkit (Python)

**Repository:** [github.com/prompt-toolkit/python-prompt-toolkit](https://github.com/prompt-toolkit/python-prompt-toolkit)

**Note:** Primarily for command-line prompts, but has full-screen TUI capabilities

### Key Features

- **Syntax highlighting**: Real-time as-you-type
- **Advanced prompts**: GNU readline replacement
- **Full-screen apps**: Window, VSplit, HSplit, Float containers
- **Widgets**: TextArea, Button, Frame, VerticalLine
- **UIControl system**: Low-level content generation

### What blECSd is Missing

1. ⚠️ **As-you-type syntax highlighting** - Could enhance text inputs
2. ⚠️ **Float container** - Floating/overlay elements
3. ⚠️ **Scrolling abstraction** - Window handles line wrapping & scroll

### Sources
- [prompt_toolkit GitHub](https://github.com/prompt-toolkit/python-prompt-toolkit)
- [prompt_toolkit Documentation](https://python-prompt-toolkit.readthedocs.io/)

---

## 11. gocui (Go)

**Repository:** [github.com/jroimartin/gocui](https://github.com/jroimartin/gocui)

### Architecture

- **Minimalist**: Simple API, few abstractions
- **View-based**: Views implement `io.ReadWriter`
- **Manager system**: Layout functions for dynamic updates
- **Keybindings**: Global and view-level

### Key Features

- **Overlapping views**: Z-order support
- **Runtime modification**: Change GUI during execution
- **Mouse support**: Built-in
- **Flexible layouts**: Managers control view positioning

### Limitations

- **No built-in widgets**: Must write input fields, buttons yourself
- **Low-level**: More code for basic UI

### What blECSd is Missing

1. ⚠️ **Manager abstraction** - Dynamic layout functions
2. ✅ **We have overlapping views** - Already supported

### Sources
- [gocui GitHub](https://github.com/jroimartin/gocui)
- [Building A Graphical User Interface in the Terminal using Go](https://marmelab.com/blog/2023/03/13/building-graphical-ui-go.html)

---

## 12. Brick (Haskell)

**Repository:** [github.com/jtdaugherty/brick](https://github.com/jtdaugherty/brick)

### Architecture

- **Declarative**: Pure functions describe UI
- **vty-based**: Cross-platform (Unix, Windows)
- **Event handler + drawing function**: Clean separation

### Key Features

- **Declarative layout**: Combinators for positioning
- **Scrollable by default**: Most widgets scroll for free
- **Attribute management**: Runtime customization per-widget
- **Extension API**: Build your own widget packages
- **Predictable layouts**: Auto-handle terminal resize

### What blECSd is Missing

1. ⚠️ **Declarative combinators** - We're more imperative
2. ✅ **Scrollable widgets** - We support this
3. ⚠️ **Extension API** - No formal widget plugin system

### Sources
- [Brick on Hackage](https://hackage.haskell.org/package/brick)
- [Brick GitHub](https://github.com/jtdaugherty/brick)
- [Introduction to Brick](https://samtay.github.io/posts/introduction-to-brick)

---

## 13. Tuile (Zig) - ARCHIVED

**Repository:** [github.com/akarpovskii/tuile](https://github.com/akarpovskii/tuile)

**Status:** ⚠️ **Archived** - No longer maintained

### Features (When Active)

- Blocks with borders
- Labels, buttons
- Flex layouts
- Event handling

**Alternative:** **libvaxis** or **TUI.zig** (actively maintained)

### Sources
- [Tuile GitHub (archived)](https://github.com/akarpovskii/tuile)
- [libvaxis](https://github.com/rockorager/libvaxis)

---

## 14. Blessed (Node.js) - ORIGINAL

**Repository:** [github.com/chjj/blessed](https://github.com/chjj/blessed)

**Note:** This is the library blECSd is inspired by (but NOT backwards-compatible)

### Architecture

- **ncurses reimplementation**: Pure JS terminfo/termcap parser
- **Widget API**: DOM-like interface
- **Prototypal inheritance**: Deep class hierarchies

### Key Features

- **Optimized rendering**: CSR, BCE, painter's algorithm, damage buffer
- **Transparent elements**: 50% opacity via color blending
- **Hover & focus styles**: Mouse-based interactions
- **Terminal compatibility**: Extensive terminfo support

### Widget Catalog

- Extensive (100+ built-in widgets including graphs, forms, tables, etc.)

### What We're Improving Over Blessed

1. ✅ **ECS instead of classes** - Composition over inheritance
2. ✅ **TypeScript instead of JavaScript** - Type safety
3. ✅ **Modern testing** - Vitest instead of manual tests
4. ✅ **Immutable state** - Functional programming
5. ⚠️ **Transparency** - We don't have color blending yet

### Sources
- [Blessed GitHub](https://github.com/chjj/blessed)
- [Blessed on npm](https://www.npmjs.com/package/blessed)

---

## Feature Comparison Matrix

| Feature | Ratatui | Textual | BubbleTea | FTXUI | Notcurses | Cursive | tview | blECSd |
|---------|---------|---------|-----------|-------|-----------|---------|-------|--------|
| **Layout System** | Constraint | CSS Grid | Manual | Flexbox | Manual | View Compose | Grid/Flex | Manual |
| **Theming** | Programmatic | TCSS (CSS) | Lipgloss | Inline | Inline | Theme API | Inline | ❌ None |
| **Animations** | ❌ | ✅ | ✅ (Harmonica) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Virtual Scrolling** | ✅ | ✅ (Spatial) | ⚠️ Manual | ⚠️ | ⚠️ | ✅ | ✅ | ❌ |
| **Accessibility** | ❌ | ✅ (Screen reader) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-Select** | ✅ List | ✅ Widget | ⚠️ Custom | ⚠️ | ❌ | ✅ | ✅ | ❌ |
| **Search/Grep** | ❌ | ✅ (Cmd palette) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Tree View** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Chart Widgets** | ✅ | ⚠️ Limited | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Text Editor** | ❌ | ✅ (TextArea) | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Command Palette** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Modal Dialogs** | ⚠️ Custom | ✅ | ⚠️ Custom | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Multimedia** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## Top 10 Feature Recommendations for blECSd

Based on the competitive analysis, here are the highest-value features blECSd should implement:

### 1. **CSS-like Stylesheet System** (Inspired by Textual)
**Why:** Separation of styling from logic is a huge DX win. Declarative styles are easier to theme and maintain.

**Implementation:** `.blecsd.css` files with selectors, properties, and cascading rules.

```css
.button {
  bg: blue;
  fg: white;
  border: rounded;
}

.button:hover {
  bg: blue-light;
}
```

### 2. **Command Palette / Fuzzy Search UI** (Inspired by Textual)
**Why:** Modern UI pattern users expect (VSCode, Sublime, etc.). Enables discoverability and keyboard-driven workflows.

**Implementation:** Ctrl+P opens fuzzy search over registered commands/actions.

### 3. **Spring-Physics Animation System** (Inspired by BubbleTea + Harmonica)
**Why:** Modern UIs need smooth, organic motion. Spring physics feel better than linear easing.

**Implementation:** Animation component with spring parameters (stiffness, damping).

```typescript
const spring = createSpring(world, eid, {
  stiffness: 6.0,
  damping: 0.5,
  target: { x: 100, y: 50 }
});
```

### 4. **Virtual Scrolling with Spatial Mapping** (Inspired by Textual)
**Why:** Handle 10,000+ item lists without performance degradation.

**Implementation:** Grid-based spatial map for O(1) visibility checks instead of iterating all entities.

### 5. **Constraint-Based Layout System** (Inspired by Ratatui)
**Why:** Responsive layouts that adapt to terminal size automatically. Less manual positioning code.

**Implementation:** `Constraint` component with types: `Length`, `Percentage`, `Min`, `Max`, `Ratio`.

```typescript
layoutVertical(world, [
  { constraint: Percentage(50), widget: topPanel },
  { constraint: Min(10), widget: statusBar }
]);
```

### 6. **Multi-Select List Widget** (Standard across all)
**Why:** Core UX pattern for selection workflows (file pickers, checkboxes, etc.).

**Implementation:** `MultiSelect` component with space-to-toggle, visual indicators.

### 7. **Search/Grep in Scrollback** (Missing from most!)
**Why:** Critical for log viewers, terminal history, debugging. Ctrl+F is expected.

**Implementation:** Search overlay with regex support, highlight matches, jump navigation.

### 8. **Tree View Widget** (Inspired by tview, Textual)
**Why:** Common pattern for file explorers, JSON viewers, hierarchical data.

**Implementation:** `TreeNode` component with expand/collapse, indentation, keyboard nav.

### 9. **Text Editor Widget (TextArea)** (Inspired by Textual, tview)
**Why:** Multi-line editable text is needed for forms, code editors, note-taking apps.

**Implementation:** `TextArea` component with line wrapping, cursor position, undo/redo.

### 10. **Accessibility: Screen Reader Support** (Textual is the ONLY one!)
**Why:** Inclusive design. Terminal apps should be usable by everyone.

**Implementation:** Emit accessibility events via terminal escape codes, ARIA-like roles.

---

## Additional Observations

### Search/Grep in Scrollback is Rare
Only **Textual** has a built-in command palette with search. This is a **huge opportunity** for blECSd to differentiate.

### CSS Styling is a Major Advantage
**Textual's TCSS** is a game-changer for developer experience. Declarative styling >>> programmatic styling.

### Animation is Becoming Standard
**BubbleTea** (Harmonica) and **FTXUI** have animation systems. Users expect smooth transitions in modern UIs.

### Virtual Scrolling is Table Stakes
**Ratatui** and **Textual** both optimize for large datasets. blECSd needs this for real-world apps.

### Widget Ecosystems Matter
**Ratatui** has 2,200+ dependent crates. **BubbleTea** has 10,000+ apps. Community widgets are a force multiplier.

### Accessibility is Neglected
**Only Textual** seriously addresses screen readers. This is a **competitive advantage** if blECSd supports it.

---

## Conclusion

blECSd has a strong ECS foundation, but we're missing key features users expect from modern TUI libraries:

**Quick Wins:**
1. Multi-select list widget (standard everywhere)
2. Search/grep overlay (unique opportunity!)
3. Constraint-based layouts (Ratatui proves this works)

**Medium-Term:**
4. CSS-like styling (huge DX improvement)
5. Command palette (modern UI pattern)
6. Virtual scrolling optimization

**Long-Term:**
7. Spring-physics animations (polish)
8. Tree view widget (common use case)
9. Text editor widget (complex but valuable)
10. Accessibility support (be the second library to do this!)

**Next Steps:**
1. Share these findings with the "planner" teammate
2. Prioritize which features fit into the 0.4.0 roadmap
3. Prototype CSS-like styling as a proof-of-concept
4. Implement search/grep overlay (low-hanging fruit with high impact)

---

**Research completed:** February 13, 2026
**Total libraries analyzed:** 14 (across 8 languages)
**Total web searches conducted:** 20+
