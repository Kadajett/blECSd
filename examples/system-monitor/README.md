# System Monitor Dashboard Example

An htop-like real-time system monitor demonstrating blECSd's capabilities for building dashboard applications.

## Features

- **CPU Monitoring**: Per-core usage with progress bars and history sparklines
- **Memory Monitoring**: RAM usage with progress bar and history graph
- **System Info**: Hostname, platform, kernel, uptime, process count
- **Real-time Updates**: Stats refresh every second
- **Color-coded Thresholds**: Green (<50%), Yellow (50-80%), Red (>80%)
- **Braille Sparklines**: History graphs using Unicode braille characters
- **Panel Navigation**: Tab to cycle focus between panels

## Running

```bash
# Development mode (recommended)
pnpm dev

# Or build and run
pnpm build
pnpm start
```

## Keybindings

| Key | Action |
|-----|--------|
| q | Quit |
| Ctrl+C | Quit |
| r | Refresh immediately |
| Tab | Cycle panel focus |

## Architecture

The dashboard uses a simple update loop pattern:

1. **Data Collection**: Poll system stats every second using Node.js `os` module
2. **History Tracking**: Maintain rolling history for sparkline graphs
3. **Threshold Colors**: Dynamically color progress bars based on usage levels
4. **Efficient Rendering**: Only re-render when data changes

```
┌────────────────────────────────────────┬───────────────────────┐
│               CPU                      │        System         │
│ CPU 0  ██████████░░░░░░░░░░   45.2%   │ Hostname:  my-pc      │
│ CPU 1  ████████████████░░░░   82.1%   │ Platform:  linux x64  │
│ CPU 2  ████████░░░░░░░░░░░░   38.5%   │ Kernel:    6.1.0      │
│ CPU 3  ██████████████░░░░░░   71.0%   │ Uptime:    5d 2h 30m  │
│ Avg: 59.2%  Load: 2.45 1.82 1.56      │ Processes: ~150       │
├────────────────────────────────────────│ CPUs:      4 cores    │
│              Memory                    │                       │
│ RAM  ████████████░░░░░░░░░░   58.3%   │                       │
│ Used: 9.2G / 15.8G                    │                       │
│ History: ⣿⣷⣶⣴⣤⣄⣀⡀               │                       │
└────────────────────────────────────────┴───────────────────────┘
 q:Quit  r:Refresh  Tab:Next Panel                      12:34:56
```

## Sparklines

The history graphs use Unicode braille characters to show trends over time:

- Each character can represent 8 vertical levels
- Shows the last 60 seconds of data
- Useful for spotting spikes and trends

## Color Thresholds

| Usage | Color | Meaning |
|-------|-------|---------|
| 0-49% | Green | Normal |
| 50-79% | Yellow | Warning |
| 80-100% | Red | Critical |

## Technical Notes

- Uses Node.js `os` module for cross-platform stats
- CPU usage calculated from delta of CPU times between samples
- Memory includes all non-free memory (buffers, cached, etc.)
- Process count is estimated from load average
