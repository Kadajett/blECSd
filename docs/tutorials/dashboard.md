# Tutorial: System Dashboard

**Difficulty:** Intermediate
**Time:** 45 minutes
**Concepts:** Layouts, progress bars, auto-refresh, multiple panels

In this tutorial, you'll build a system monitoring dashboard that displays CPU, memory, and process information with auto-refresh.

## What You'll Build

```
┌─ System Dashboard ────────────────────────────────────────┐
│                                                           │
│ ┌─ CPU ─────────────┐  ┌─ Memory ──────────┐             │
│ │ Core 0  ████░░ 65%│  │ Used  ████████░ 78%│             │
│ │ Core 1  ██░░░░ 32%│  │ Swap  ██░░░░░░░ 23%│             │
│ │ Core 2  █████░ 89%│  │                    │             │
│ │ Core 3  ███░░░ 54%│  │ 12.4 GB / 16 GB    │             │
│ └───────────────────┘  └────────────────────┘             │
│                                                           │
│ ┌─ Top Processes ─────────────────────────────────────┐  │
│ │ PID    NAME              CPU%   MEM%   TIME         │  │
│ │ 1234   node              12.5   3.2    00:15:23     │  │
│ │ 5678   chrome            8.7    15.4   01:23:45     │  │
│ │ 9012   code              5.2    8.1    00:45:12     │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ Last updated: 14:32:15 | Refresh: 2s | [q] Quit          │
└───────────────────────────────────────────────────────────┘
```

## Prerequisites

- Completed [Todo List Tutorial](./todo-list.md)
- Understanding of async intervals
- System stats familiarity (optional)

## Step 1: Project Setup

Create `dashboard.ts`:

```typescript
import { createWorld, addEntity, createScreenEntity } from 'blecsd/core';
import { createRenderPipeline, onShutdown } from 'blecsd';
import { setPosition, setDimensions } from 'blecsd/components';
import { layoutSystem, renderSystem, outputSystem } from 'blecsd/systems';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { type KeyEvent, createProgram } from 'blecsd/terminal';
import {
  createPanel, createText, createProgressBar, createLayout,
} from 'blecsd/widgets';
import { setContent, setParent, setStyle } from 'blecsd/components';
import { setProgress } from 'blecsd/components';
import * as os from 'os';

const world = createWorld();
const scheduler = createScheduler();

scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
scheduler.registerSystem(LoopPhase.POST_RENDER, outputSystem);

const program = createProgram({
  useAlternateScreen: true,
  hideCursor: true,
});
program.init();

// Initialize render pipeline
const { cols: columns, rows } = createRenderPipeline(process.stdout);
createScreenEntity(world, { width: columns, height: rows });
const shutdown = onShutdown(world, { program });
```

## Step 2: System Stats Functions

```typescript
interface CpuCore {
  id: number;
  usage: number;
}

interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  usedPercent: number;
  swapTotal: number;
  swapUsed: number;
  swapPercent: number;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  memPercent: number;
  time: string;
}

// Track previous CPU times for usage calculation
let prevCpuTimes: os.CpuInfo[] | null = null;

function getCpuUsage(): CpuCore[] {
  const cpus = os.cpus();
  const cores: CpuCore[] = [];

  cpus.forEach((cpu, index) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;

    let usage = 0;
    if (prevCpuTimes) {
      const prevTotal = Object.values(prevCpuTimes[index].times).reduce((a, b) => a + b, 0);
      const prevIdle = prevCpuTimes[index].times.idle;

      const totalDiff = total - prevTotal;
      const idleDiff = idle - prevIdle;

      usage = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
    }

    cores.push({ id: index, usage: Math.round(usage) });
  });

  prevCpuTimes = cpus;
  return cores;
}

function getMemoryInfo(): MemoryInfo {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;

  return {
    total,
    used,
    free,
    usedPercent: Math.round((used / total) * 100),
    swapTotal: 0,  // Node.js doesn't expose swap info directly
    swapUsed: 0,
    swapPercent: 0,
  };
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

## Step 3: Create Main Layout

```typescript
// Main container panel
const mainPanel = createPanel(world, addEntity(world), {
  title: 'System Dashboard',
  x: 0,
  y: 0,
  width: columns,
  height: rows,
  border: { type: 'line', ch: 'single' },
}).eid;

// Create a horizontal layout for CPU and Memory panels
const topLayout = createLayout(world, addEntity(world), {
  x: 1,
  y: 1,
  width: columns - 2,
  height: 8,
  direction: 'row',
  gap: 2,
}).eid;
setParent(world, topLayout, mainPanel);
```

## Step 4: CPU Panel

```typescript
const cpuPanel = createPanel(world, addEntity(world), {
  title: 'CPU',
  width: Math.floor((columns - 4) / 2),
  height: 8,
  border: { type: 'line', ch: 'single' },
}).eid;
setParent(world, cpuPanel, topLayout);

// Create progress bars for each core
const cpuBars: number[] = [];
const cpuLabels: number[] = [];
const cpuCount = Math.min(os.cpus().length, 8); // Max 8 cores displayed

for (let i = 0; i < cpuCount; i++) {
  const label = createText(world, addEntity(world), {
    x: 1,
    y: i + 1,
    content: `Core ${i}`,
  }).eid;
  setParent(world, label, cpuPanel);
  cpuLabels.push(label);

  const bar = createProgressBar(world, {
    x: 9,
    y: i + 1,
    width: 12,
    min: 0,
    max: 100,
    value: 0,
    showPercentage: true,
  }).eid;
  setParent(world, bar, cpuPanel);
  cpuBars.push(bar);
}
```

## Step 5: Memory Panel

```typescript
const memPanel = createPanel(world, addEntity(world), {
  title: 'Memory',
  width: Math.floor((columns - 4) / 2),
  height: 8,
  border: { type: 'line', ch: 'single' },
}).eid;
setParent(world, memPanel, topLayout);

// Memory used bar
const memUsedLabel = createText(world, addEntity(world), {
  x: 1,
  y: 1,
  content: 'Used',
}).eid;
setParent(world, memUsedLabel, memPanel);

const memUsedBar = createProgressBar(world, {
  x: 7,
  y: 1,
  width: 15,
  min: 0,
  max: 100,
  value: 0,
  showPercentage: true,
}).eid;
setParent(world, memUsedBar, memPanel);

// Swap bar
const swapLabel = createText(world, addEntity(world), {
  x: 1,
  y: 2,
  content: 'Swap',
}).eid;
setParent(world, swapLabel, memPanel);

const swapBar = createProgressBar(world, {
  x: 7,
  y: 2,
  width: 15,
  min: 0,
  max: 100,
  value: 0,
  showPercentage: true,
}).eid;
setParent(world, swapBar, memPanel);

// Memory info text
const memInfoText = createText(world, addEntity(world), {
  x: 1,
  y: 4,
  content: '',
}).eid;
setParent(world, memInfoText, memPanel);
```

## Step 6: Process List Panel

```typescript
const processPanel = createPanel(world, addEntity(world), {
  title: 'Top Processes',
  x: 1,
  y: 10,
  width: columns - 2,
  height: rows - 13,
  border: { type: 'line', ch: 'single' },
}).eid;
setParent(world, processPanel, mainPanel);

// Process list header
const processHeader = createText(world, addEntity(world), {
  x: 1,
  y: 1,
  content: 'PID'.padEnd(8) + 'NAME'.padEnd(20) + 'CPU%'.padEnd(8) + 'MEM%'.padEnd(8) + 'TIME',
  fg: 0xffff00ff,
}).eid;
setParent(world, processHeader, processPanel);

// Process list items
const processItems: number[] = [];
const maxProcesses = rows - 16;

for (let j = 0; j < maxProcesses; j++) {
  const item = createText(world, addEntity(world), {
    x: 1,
    y: j + 2,
    content: '',
  }).eid;
  setParent(world, item, processPanel);
  processItems.push(item);
}
```

## Step 7: Status Bar

```typescript
const statusBar = createText(world, addEntity(world), {
  x: 0,
  y: rows - 1,
  content: '',
  fg: 0x000000ff,
  bg: 0xccccccff,
}).eid;
setDimensions(world, statusBar, columns, 1);

function updateStatusBar(): void {
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);
  const status = `Last updated: ${time} | Refresh: ${refreshInterval / 1000}s | [r] Refresh | [+/-] Speed | [q] Quit`;
  setContent(world, statusBar, status.padEnd(columns));
}
```

## Step 8: Update Functions

```typescript
function updateCpuPanel(): void {
  const cpuData = getCpuUsage() ?? [];

  cpuData.slice(0, cpuCount).forEach((core, index) => {
    setProgress(world, cpuBars[index], core.usage);

    // Color based on usage
    const color = core.usage > 80 ? 0xff0000ff :
                  core.usage > 50 ? 0xffff00ff :
                  0x00ff00ff;
    setStyle(world, cpuBars[index], { fg: color });
  });
}

function updateMemoryPanel(): void {
  const mem = getMemoryInfo() ?? { total: 1, used: 0, free: 1, usedPercent: 0, swapTotal: 0, swapUsed: 0, swapPercent: 0 };

  setProgress(world, memUsedBar, mem.usedPercent);
  setProgress(world, swapBar, mem.swapPercent);

  const infoText = `${formatBytes(mem.used)} / ${formatBytes(mem.total)}`;
  setContent(world, memInfoText, infoText);

  // Color based on usage
  const memColor = mem.usedPercent > 90 ? 0xff0000ff :
                   mem.usedPercent > 70 ? 0xffff00ff :
                   0x00ff00ff;
  setStyle(world, memUsedBar, { fg: memColor });
}

function updateProcessList(): void {
  // In a real app, you'd use a process listing library
  // This is a simplified mock
  const processes: ProcessInfo[] = [
    { pid: process.pid, name: 'node (this)', cpuPercent: 5.2, memPercent: 2.1, time: '00:01:23' },
    // Add more mock processes or use actual process listing
  ];

  processItems.forEach((item, index) => {
    if (index < processes.length) {
      const p = processes[index];
      const line = String(p.pid).padEnd(8) +
                   p.name.slice(0, 18).padEnd(20) +
                   p.cpuPercent.toFixed(1).padStart(6).padEnd(8) +
                   p.memPercent.toFixed(1).padStart(6).padEnd(8) +
                   p.time;
      setContent(world, item, line);
    } else {
      setContent(world, item, '');
    }
  });
}

function refreshDashboard(): void {
  updateCpuPanel();
  updateMemoryPanel();
  updateProcessList();
  updateStatusBar();
  scheduler.run(world, 0);
}
```

## Step 9: Auto-Refresh and Input

```typescript
let refreshInterval = 2000; // 2 seconds
let refreshTimer: NodeJS.Timeout | null = null;

function startAutoRefresh(): void {
  stopAutoRefresh();
  refreshTimer = setInterval(refreshDashboard, refreshInterval);
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function handleKey(key: KeyEvent): void {
  switch (key.name) {
    case 'r':
      // Manual refresh
      refreshDashboard();
      break;

    case '+':
    case '=':
      // Faster refresh
      refreshInterval = Math.max(500, refreshInterval - 500);
      startAutoRefresh();
      updateStatusBar();
      break;

    case '-':
      // Slower refresh
      refreshInterval = Math.min(10000, refreshInterval + 500);
      startAutoRefresh();
      updateStatusBar();
      break;

    case 'q':
      stopAutoRefresh();
      shutdown();
      break;
  }
}

// Use createProgram's built-in key event handling
program.on('key', handleKey);
```

## Step 10: Main Loop

```typescript
// Handle resize
program.on('resize', () => {
  refreshDashboard();
});

// Initial render and start auto-refresh
refreshDashboard();
startAutoRefresh();
```

## Step 11: Run the App

```bash
npx tsx dashboard.ts
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `r` | Manual refresh |
| `+` / `=` | Faster refresh |
| `-` | Slower refresh |
| `q` | Quit |

## Exercises

1. **Add disk usage:** Show disk space for mounted volumes
2. **Add network stats:** Show network I/O rates
3. **Add process filtering:** Filter processes by name
4. **Add history graphs:** Show CPU/memory over time
5. **Add alerts:** Flash when values exceed thresholds

## What You Learned

- Creating complex multi-panel layouts
- Using progress bars for metrics
- Auto-refresh with intervals
- Dynamic color coding based on values
- System stats collection

## Next Steps

- [Simple Game Tutorial](./simple-game.md) - Build an interactive game
- [Layout Reference](../api/widgets/layout.md) - Full layout API
- [ProgressBar Reference](../api/components/progressBar.md) - Progress bar API
