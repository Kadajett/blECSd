# Beads Ticket Audit Report

## Summary

- **Total Issues:** 193
- **Epics:** 19
- **Potential Duplicates:** 3
- **Missing Blockers:** 35+ relationships
- **Missing Functionality:** 25+ features need tickets

---

## Part 1: Potential Duplicates

### 1. `blessed-edo` duplicates `blessed-19j.*` tasks
- `blessed-edo`: "Project setup: TypeScript, bitecs, Zod, Biome, Vitest"
- `blessed-19j.1` through `blessed-19j.7` cover the exact same items individually

**Recommendation:** Close `blessed-edo` as duplicate - it's already broken down into subtasks.

### 2. `blessed-bjw.3` and `blessed-bjw.13` overlap
- `blessed-bjw.3`: "Create tag parsing system"
- `blessed-bjw.13`: "Create nested tag parsing"

**Recommendation:** Keep both - .3 is the basic system, .13 is specifically for nested tags like `{bold}{red-fg}text{/red-fg}{/bold}`. Add .3 as blocker for .13.

### 3. `blessed-ree.7` and `blessed-ree.22` overlap
- `blessed-ree.7`: "Create focus management system"
- `blessed-ree.22`: "Create focus stack management"

**Recommendation:** Keep both - .7 is basic focus tracking, .22 is the modal/overlay stack. Add .7 as blocker for .22.

---

## Part 2: Missing Blocker Relationships

### Critical Foundation Chain

```
blessed-19j (Infrastructure)
  └─> blocks ALL other epics

blessed-0t8 (ECS Core)
  └─> blocks blessed-ree, blessed-bjw, blessed-wlg, blessed-i7e,
      blessed-b5i, blessed-294, blessed-zrt, blessed-c6n

blessed-mtg (Terminal I/O)
  └─> blocks blessed-ree, blessed-n37

blessed-hyf (Terminfo)
  └─> blocks blessed-mtg.4 (Program class needs terminfo)
```

### Specific Missing Dependencies

| Blocker | Blocked By | Reason |
|---------|-----------|--------|
| blessed-19j.1-7 | ALL other tasks | Infrastructure must exist first |
| blessed-0t8.1 (Position) | blessed-ree.3, blessed-bjw.9 | Components need Position defined |
| blessed-0t8.2 (Dimensions) | blessed-ree.3, blessed-bjw.17 | Need Dimensions for size calc |
| blessed-0t8.3 (Renderable) | blessed-ree.5 | Render system needs Renderable |
| blessed-0t8.4 (Hierarchy) | blessed-bjw.1, blessed-ree.4 | Layout needs parent-child |
| blessed-0t8.12 (Scheduler) | blessed-hla.1 | Game loop uses scheduler |
| blessed-vdk.1-3 | blessed-ree.5 | Rendering needs color system |
| blessed-etz.1-3 | blessed-ree.5, blessed-bjw.2 | Unicode width for rendering |
| blessed-mtg.1 (ANSI codes) | blessed-mtg.2-7 | All output uses ANSI codes |
| blessed-mtg.4 (Program) | blessed-ree.3 | Screen needs Program |
| blessed-ree.1 (Cell) | blessed-ree.2 | Double buffer needs Cell |
| blessed-ree.2 (Double buffer) | blessed-ree.5, blessed-ree.6 | Render needs buffers |
| blessed-ree.3 (Screen entity) | blessed-ree.4-8 | Layout/render need Screen |
| blessed-ree.4 (Layout) | blessed-wlg.*, blessed-bjw.9 | Widgets need layout |
| blessed-ree.5 (Render) | ALL widgets | Widgets render to screen |
| blessed-n37.1 (Key parser) | blessed-n37.3, blessed-n37.5 | Input system needs parser |
| blessed-n37.2 (Mouse parser) | blessed-n37.3, blessed-n37.5 | Input system needs parser |
| blessed-hla.1 (Game loop) | blessed-hla.2-6 | Loop features need base loop |
| blessed-2qm.1 (EventEmitter) | blessed-2qm.2-5 | Events need emitter |
| blessed-2qm.3 (State machine) | blessed-2qm.4-6 | SM system needs framework |
| blessed-wlg.1 (Box) | blessed-wlg.2-7, blessed-b5i.*, blessed-i7e.* | Most widgets extend Box |
| blessed-bjw.1 (Box render) | blessed-wlg.1 | Box widget needs renderer |
| blessed-bjw.3 (Tag parsing) | blessed-bjw.13 | Nested tags need base parser |
| blessed-ree.7 (Focus mgmt) | blessed-ree.22 | Focus stack needs base focus |
| blessed-b5i.1 (Form) | blessed-b5i.2-10 | Form inputs go in Form |
| blessed-i7e.1 (List component) | blessed-i7e.2 | List widget needs component |
| blessed-i7e.3 (Table component) | blessed-i7e.4-5 | Table widgets need component |

---

## Part 3: Missing Functionality (Need New Tickets)

Based on comprehensive audit of the original blessed library:

### HIGH PRIORITY - Core Features

#### 1. Terminal Emulator Widget (NEW EPIC?)
- Embeds a terminal emulator inside the blessed application
- Integrates with `term.js` for terminal emulation
- Integrates with `pty.js` for pseudo-terminal spawning
- **Original:** `lib/widgets/terminal.js`

#### 2. tmux Pass-through Support
- Wrapping escape sequences in DCS passthrough
- tmux version detection
- Handling tmux's terminal capabilities
- **Add to:** blessed-mtg epic

#### 3. Terminal Response Parsing
- Device Attributes (DA, Primary/Secondary)
- Device Status Reports (DSR) - cursor position, printer status
- Window manipulation responses
- **Add to:** blessed-mtg epic

#### 4. Character Set/Charset Handling
- G0-G3 character set designation
- DEC Special Graphics character set (line drawing)
- `smacs`/`rmacs` for alternate character set mode
- **Add to:** blessed-mtg epic

#### 5. Clipboard Integration
- `copyToClipboard()` for iTerm2
- OSC 52 for clipboard data
- **Note:** blessed-mtg.9 mentions this, may need expansion

#### 6. Cursor Customization
- Cursor shape (block, underline, line/bar)
- Cursor blink on/off
- Cursor color (OSC 12)
- **Note:** blessed-mtg.8 exists but may need expansion

#### 7. External Editor Integration
- `readEditor()` method to spawn external editor ($EDITOR)
- Returns edited content
- **Add to:** blessed-ree or new utility epic

#### 8. Spawn/Exec for External Processes
- `spawn()` and `exec()` methods for running external programs
- Handles terminal state save/restore
- **Note:** blessed-mtg.13 exists for this

### MEDIUM PRIORITY - UX Features

#### 9. Video Player Widget
- Plays video using mplayer/mpv with caca output
- Auto-detects mplayer vs mpv
- **Add to:** blessed-j3b (Image & Media) or blessed-zrt

#### 10. Overlay Image (w3m-based)
- Displays actual images overlaid on terminal using w3mimgdisplay
- Pixel-precise positioning
- **Note:** blessed-j3b mentions W3M but may need explicit ticket

#### 11. Tag Parsing/Generation System (Explicit)
- `{bold}text{/bold}`, `{red-fg}text{/red-fg}` markup
- `parseTags()`, `generateTags()`, `stripTags()`
- **Note:** blessed-bjw.3 exists but description may be incomplete

#### 12. Debug Log Widget (Built-in)
- Toggle with F12
- Draggable, scrollable debug panel
- Vi-keys support
- **Note:** blessed-hmk.5 mentions debug overlay

#### 13. Screenshot Functionality
- `screenshot()` method to capture screen content as text/ANSI
- **Add to:** blessed-ree epic

#### 14. Scroll Region Optimization (CSR)
- Hardware scroll region support via `csr`/`decstbm`
- `insertLine`, `deleteLine` for optimized scrolling
- **Note:** blessed-ree.11 exists for this

#### 15. Border Docking System
- `dockBorders` option for intelligent border merging
- Calculates proper line-drawing characters at borders
- **Note:** blessed-ree.14 exists for this

### LOWER PRIORITY - Specialized

#### 16. SIGTSTP (Ctrl+Z) Handling
- Proper terminal suspend/resume
- `sigtstp()` and `pause()`/`resume()` methods
- **Note:** blessed-mtg.14 exists for this

#### 17. Lock/Grab Keys System
- `lockKeys` - prevent all key events
- `grabKeys` - exclusive key handling
- `ignoreLocked` - keys that bypass lock
- **Note:** blessed-n37.9 exists for this

#### 18. Draggable Elements
- `options.draggable` flag on elements
- **Note:** blessed-bjw.6 mentions drag and drop

#### 19. Hover Effects System
- `hoverEffects` and `focusEffects` options
- Style changes on hover/focus
- **Note:** blessed-bjw.8 exists for this

#### 20. Shadow Effects
- `shadow` option for drop shadows on elements
- **Note:** blessed-bjw.14 exists for this

---

## Part 4: Tickets That Need Description Updates

Several tickets exist but may need expanded descriptions:

| Ticket | Current | Should Include |
|--------|---------|----------------|
| blessed-mtg.9 | "title and clipboard functions" | OSC 52, iTerm2 clipboard |
| blessed-mtg.8 | "cursor style functions" | Shape, color, blink |
| blessed-bjw.3 | "tag parsing system" | parseTags, generateTags, stripTags, escape sequences |
| blessed-j3b epic | mentions W3M | Add explicit w3mimgdisplay ticket |

---

## Part 5: Recommended Actions

### Immediate (Before Starting Work)

1. **Close blessed-edo** as duplicate of blessed-19j.* tasks
2. **Add blocker relationships** for the critical foundation chain:
   ```bash
   # Infrastructure blocks ECS
   bd dep add blessed-0t8 blessed-19j
   # ECS blocks Screen/Rendering
   bd dep add blessed-ree blessed-0t8
   # Terminal I/O blocks Screen
   bd dep add blessed-ree blessed-mtg
   # etc.
   ```

### Short-term (Create New Tickets)

1. Create ticket: "Create tmux pass-through support" under blessed-mtg
2. Create ticket: "Create terminal response parser" under blessed-mtg
3. Create ticket: "Create character set (charset) handling" under blessed-mtg
4. Create ticket: "Create screenshot capture method" under blessed-ree
5. Create ticket: "Create external editor integration" under blessed-ree or blessed-hmk

### Consider for Future

1. Terminal emulator widget (may be out of scope for game library)
2. Video player widget (may be out of scope)
3. More extensive image overlay support

---

## Appendix: Dependency Graph (Simplified)

```
Infrastructure (19j)
    │
    ├──► ECS Core (0t8)
    │        │
    │        ├──► Screen/Rendering (ree)
    │        │        │
    │        │        └──► All Widgets
    │        │
    │        ├──► Element System (bjw)
    │        │
    │        └──► Game Features (c6n)
    │
    ├──► Terminal I/O (mtg)
    │        │
    │        └──► Screen/Rendering (ree)
    │
    ├──► Terminfo (hyf)
    │        │
    │        └──► Terminal I/O (mtg)
    │
    ├──► Colors (vdk)
    │        │
    │        └──► Screen/Rendering (ree)
    │
    ├──► Unicode (etz)
    │        │
    │        └──► Screen/Rendering (ree)
    │
    └──► Events (2qm)
             │
             └──► Input System (n37)
                      │
                      └──► Game Loop (hla)
```

---

## Part 6: Second Audit - Comprehensive Code Review (Added after deep dive)

A thorough file-by-file audit revealed significantly more missing functionality:

### New Tickets Created (32 total)

#### From program.js (5 tickets):
| ID | Title | Priority |
|----|-------|----------|
| blessed-mtg.18 | Debug logging system | P2 |
| blessed-mtg.19 | Media copy (print) functions | P3 |
| blessed-mtg.20 | Rectangular area operations | P3 |
| blessed-mtg.21 | Window manipulation functions | P2 |
| blessed-mtg.22 | DEC locator operations | P3 |

#### From node.js (4 tickets):
| ID | Title | Priority |
|----|-------|----------|
| blessed-bjw.18 | Node tree manipulation API | **P0** |
| blessed-bjw.19 | Tree traversal utilities | P1 |
| blessed-bjw.20 | Node lifecycle events | P1 |
| blessed-bjw.21 | Node data storage API | P2 |

#### From element.js (6 tickets):
| ID | Title | Priority |
|----|-------|----------|
| blessed-bjw.22 | Element visibility methods | **P0** |
| blessed-bjw.23 | Element content methods | **P0** |
| blessed-bjw.24 | sattr style encoding | **P0** |
| blessed-bjw.25 | Element input enable methods | P1 |
| blessed-bjw.26 | Z-order management methods | P1 |
| blessed-bjw.27 | Label system | P1 |

#### From screen.js (6 tickets):
| ID | Title | Priority |
|----|-------|----------|
| blessed-ree.25 | Key lock and grab system | **P0** |
| blessed-ree.26 | Screen input setup methods | **P0** |
| blessed-ree.27 | Hover tooltip system | P1 |
| blessed-ree.28 | Attribute encoding methods | **P0** |
| blessed-ree.29 | Child process spawning | P2 |
| blessed-ree.30 | setEffects system | P1 |

#### From tput.js (6 tickets):
| ID | Title | Priority |
|----|-------|----------|
| blessed-hyf.8 | Termcap parser | P1 |
| blessed-hyf.9 | Captoinfo converter | P1 |
| blessed-hyf.10 | Feature detection system | P1 |
| blessed-hyf.11 | Padding system | P2 |
| blessed-hyf.12 | sprintf implementation | P1 |
| blessed-hyf.13 | ACS character maps | P1 |

#### From events.js/helpers.js (3 tickets):
| ID | Title | Priority |
|----|-------|----------|
| blessed-2qm.7 | EventEmitter utilities | P1 |
| blessed-bjw.28 | Tag generation utilities | P1 |
| blessed-etz.6 | Unicode utilities | P2 |

### Critical P0 Tickets Added

These are **essential** for the library to function:

1. **blessed-bjw.18** - Node tree manipulation (append, remove, etc.)
2. **blessed-bjw.22** - Visibility methods (hide, show, toggle)
3. **blessed-bjw.23** - Content methods (setContent, getContent)
4. **blessed-bjw.24** - sattr style encoding (converts style to render attributes)
5. **blessed-ree.25** - Key lock/grab (essential for game input)
6. **blessed-ree.26** - Screen input setup (mouse/key initialization)
7. **blessed-ree.28** - Attribute encoding (attrCode/codeAttr for rendering)

### Widget-Specific Gaps Identified

The widget audit revealed many per-widget features that may need to be added to existing tickets or documented separately:

- **List**: Array-like methods, fuzzyFind, pick(), full vi keybindings
- **Listbar**: Command objects, horizontal scrolling, per-command shortcuts
- **ScrollableBox**: Scrollbar dragging, CSR optimization, track styling
- **Table**: Column width calculation, box-drawing borders
- **Textarea**: External editor, inputOnFocus, screen focus management
- **Form**: Per-type reset behavior, autoNext, nested traversal
- **All widgets**: Many detailed features in the audit report


---

## Part 7: Final Coverage Verification

### Complete File-to-Ticket Mapping

All 46 source files (23,011 lines) now have explicit ticket coverage:

| File | Lines | Epic | Tickets |
|------|-------|------|---------|
| program.js | 4,295 | mtg | 22 tickets |
| tput.js | 3,022 | hyf | 13 tickets |
| element.js | 2,570 | bjw | 29 tickets |
| screen.js | 2,298 | ree | 30 tickets |
| tng.js | 1,755 | j3b | 4 tickets |
| unicode.js | 790 | etz | 6 tickets |
| overlayimage.js | 717 | j3b | j3b.6 |
| list.js | 599 | i7e | 4 tickets |
| colors.js | 530 | vdk | 6 tickets |
| alias.js | 526 | hyf | hyf.7 |
| terminal.js | 412 | zrt | zrt.4 |
| listbar.js | 411 | i7e | i7e.6 |
| scrollablebox.js | 389 | wlg | wlg.4 |
| table.js | 354 | i7e | 2 tickets |
| textarea.js | 342 | b5i | b5i.6 |
| keys.js | 339 | n37 | 3 tickets |
| node.js | 282 | bjw | 4 tickets |
| listtable.js | 280 | i7e | i7e.5 |
| form.js | 267 | b5i | b5i.1 |
| layout.js | 233 | wlg | wlg.5 |
| gpmclient.js | 221 | n37 | n37.6 |
| filemanager.js | 212 | zrt | zrt.2 |
| events.js | 189 | 2qm | 3 tickets |
| ansiimage.js | 167 | j3b | j3b.3 |
| helpers.js | 165 | bjw | bjw.29 |
| bigtext.js | 159 | zrt | zrt.3 |
| progressbar.js | 157 | b5i | b5i.7 |
| video.js | 126 | j3b | j3b.5 |
| message.js | 123 | 294 | 294.1 |
| prompt.js | 120 | 294 | 294.2 |
| question.js | 116 | 294 | 294.3 |
| checkbox.js | 91 | b5i | b5i.3 |
| loading.js | 88 | 294 | 294.4 |
| log.js | 83 | zrt | zrt.1 |
| textbox.js | 77 | b5i | b5i.5 |
| button.js | 62 | b5i | b5i.2 |
| radiobutton.js | 61 | b5i | b5i.4 |
| image.js | 61 | j3b | j3b.7 |
| widget.js | 60 | hmk | hmk.6 |
| line.js | 56 | wlg | wlg.3 |
| radioset.js | 36 | b5i | b5i.4 |
| text.js | 35 | wlg | wlg.2 |
| scrollabletext.js | 35 | wlg | wlg.8 |
| input.js | 34 | b5i | b5i.11 |
| box.js | 34 | wlg | wlg.1 |
| blessed.js | 32 | hmk | hmk.1 |

### Final Statistics

- **Total Tickets:** 236
- **Epics:** 19
- **Tasks:** 216
- **Lines of Code Covered:** 23,011 (100%)
- **Files Covered:** 46 (100%)

### Coverage by Epic

| Epic | Focus | Tasks |
|------|-------|-------|
| blessed-19j | Core Infrastructure | 9 |
| blessed-0t8 | bitecs ECS Core | 14 |
| blessed-mtg | Terminal I/O | 22 |
| blessed-hyf | Terminfo/Termcap | 13 |
| blessed-bjw | Element & Node | 29 |
| blessed-ree | Screen & Rendering | 30 |
| blessed-2qm | Events & State | 7 |
| blessed-n37 | Input System | 10 |
| blessed-hla | Game Loop | 6 |
| blessed-etz | Unicode | 6 |
| blessed-vdk | Colors | 6 |
| blessed-wlg | Layout Widgets | 8 |
| blessed-i7e | List/Table Widgets | 9 |
| blessed-b5i | Form Widgets | 11 |
| blessed-c6n | Game Features | 14 |
| blessed-294 | Dialogs | 5 |
| blessed-zrt | Specialized Widgets | 4 |
| blessed-j3b | Image/Media | 7 |
| blessed-hmk | Public API | 6 |
