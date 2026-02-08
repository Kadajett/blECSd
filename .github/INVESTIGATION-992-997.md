# Code Quality Investigation (#992, #997)

## Console.log Audit (#992)

### Findings

After auditing the codebase for console.log statements:

- **Total console.* statements in src/:** ~530
  - console.log: 511
  - console.warn: 7
  - console.error: 11

### Root Cause

Almost all (~528/530) are in JSDoc @example blocks, NOT actual code. These are documentation examples teaching users how to use the API.

### Actual Debugging Statements

**None found.**

### Legitimate Console Statements (Keep)

1. `src/core/inputEventBuffer.ts:186` - console.warn about dropped events (proper error reporting)
2. `src/widgets/terminal.ts:723` - console.warn about missing node-pty dependency (proper error reporting)

### Conclusion

This is a non-issue. JSDoc examples should keep console.log statements to demonstrate usage. The 2 console.warn statements are legitimate error reporting at system boundaries and should remain.

**Status:** ✅ Closed as completed - no code changes needed

---

## God File Refactoring (#997)

### Large Files Identified

| File | Lines | Status |
|------|-------|--------|
| src/terminal/ansi.ts | 3560 | Tracked in #1077 |
| src/core/entities.ts | 2676 | Needs investigation |
| src/components/list.ts | 1890 | Needs investigation |
| src/utils/syntaxHighlight.ts | 1562 | Needs investigation |
| src/components/terminalBuffer.ts | 1515 | Needs investigation |
| src/components/textInput.ts | 1337 | Needs investigation |
| src/widgets/splitPane.ts | 1332 | Needs investigation |

### ansi.ts Analysis (Issue #1077)

**Size:** 3560 lines

**Structure:** 19 logical sections identified:
1. CONSTANTS (lines 11-32)
2. SGR Codes (lines 33-109)
3. COLOR TYPES (lines 110-154)
4. INTERNAL HELPERS (lines 155-213)
5. CURSOR NAMESPACE (lines 214-574)
6. STYLE NAMESPACE (lines 575-793)
7. SCREEN NAMESPACE (lines 794-963)
8. TITLE NAMESPACE (lines 964-1002)
9. MOUSE NAMESPACE (lines 1003-1289)
10. SYNCHRONIZED OUTPUT (lines 1290-1363)
11. BRACKETED PASTE (lines 1364-1412)
12. CLIPBOARD (OSC 52) (lines 1413-1589)
13. TMUX PASS-THROUGH (lines 1590-1750)
14. CHARACTER SET HANDLING (lines 1751-2317)
15. WINDOW MANIPULATION (lines 2318-2660)
16. HYPERLINK SUPPORT (OSC 8) (lines 2661-2904)
17. MEDIA COPY (PRINT) (lines 2905-3091)
18. RECTANGULAR AREA OPS (VT400+) (lines 3092-3313)
19. DEC LOCATOR (ADVANCED MOUSE) (lines 3314-end)

**Downstream Impact:** Only 5 non-test files import from ansi.ts

**Proposed Modules:**
- `constants.ts` - CSI, OSC, ESC, SGR codes
- `cursor.ts` - Cursor control
- `color.ts` - Color types and helpers
- `style.ts` - Text styling
- `screen.ts` - Screen control, titles, window operations
- `mouse.ts` - Mouse tracking
- `advanced.ts` - Advanced features
- `index.ts` - Re-export everything

**Requirements:**
- All existing tests must pass
- No behavior changes
- Preserve exact function signatures
- Incremental approach: extract one section at a time, test after each
- Use re-exports to avoid breaking downstream imports

### Conclusion

God file refactoring requires dedicated focused sprints. Each file needs:
1. Structural analysis (sections, dependencies)
2. Incremental extraction approach
3. Full test validation at each step
4. Separate tracking issue

**Status:** 🔄 Broken into focused issues (#1077 for ansi.ts, others TBD)
