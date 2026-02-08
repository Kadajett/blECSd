<!-- filepath: docs/guides/benchmarking.md -->
# Benchmarking Guide

This guide explains how to run benchmarks, interpret results, and use the performance regression detection system.

## Overview

blECSd includes a comprehensive benchmarking system with:

- **CI Benchmarks**: Fast benchmarks suitable for CI/CD performance checks
- **Scenario Benchmarks**: Real-world usage scenario benchmarks
- **Performance Regression Detection**: Automated checks against stored baselines
- **GitHub Actions Integration**: Automatic performance checks on pull requests

## Running Benchmarks

### All Benchmarks

Run all benchmarks in the project:

```bash
pnpm bench
```

This runs all `*.bench.ts` files using Vitest's benchmark runner.

### CI Benchmarks

Fast benchmarks optimized for CI performance regression detection:

```bash
pnpm bench:ci
```

These benchmarks focus on critical hot paths:
- Entity creation and component operations
- System execution (layout, render, movement)
- Full render cycles with various entity counts

### Scenario Benchmarks

Real-world usage scenario benchmarks:

```bash
pnpm bench:scenarios
```

Scenarios include:
- **Dashboard**: Multi-panel dashboards with real-time updates
- **Log Viewer**: Scrolling through large datasets
- **File Browser**: Tree navigation and expansion
- **Text Editor**: Cursor movement and text operations

### Specific Benchmark Files

Run a specific benchmark file:

```bash
pnpm vitest bench benchmarks/ci.bench.ts
pnpm vitest bench benchmarks/scenarios-dashboard.bench.ts
```

## Performance Regression Detection

### How It Works

1. **Baseline Storage**: Performance baselines are stored as JSON files in `benchmarks/baselines/`
2. **Comparison**: New benchmark results are compared against the baseline
3. **Threshold Detection**: If any benchmark regresses by more than 20%, the check fails
4. **CI Integration**: Pull requests automatically run performance checks

### Creating/Updating Baselines

Update the baseline after performance improvements or when baselines become outdated:

```bash
pnpm bench:update-baseline
```

This:
1. Runs the CI benchmarks
2. Saves results to `benchmarks/baselines/ci.json`
3. Commits the baseline (if desired)

**When to update:**
- After implementing performance optimizations
- When baselines are stale (>1 month old)
- After major architectural changes

### Checking for Regressions

Check if current code has performance regressions:

```bash
pnpm bench:check-regression
```

This:
1. Runs CI benchmarks
2. Compares against the baseline
3. Fails if any benchmark regresses >20%

Output example:

```
📊 Performance Comparison Results

────────────────────────────────────────────────────────────────────────────────
✅ create 100 entities
   Baseline: 145.32K ops/sec | Current: 148.76K ops/sec
   Change: +2.37%

❌ render 50 entities
   Baseline: 12.45K ops/sec | Current: 9.82K ops/sec
   Change: -21.12%
   ⚠️  REGRESSION DETECTED (threshold: 20%)

────────────────────────────────────────────────────────────────────────────────

❌ Performance regressions detected!
```

### CI Integration

The performance check workflow runs automatically on pull requests:

1. Checks if a baseline exists
2. Runs CI benchmarks
3. Compares results against baseline
4. Comments on PR with results
5. Fails the build if regressions are detected

**Workflow file**: `.github/workflows/perf-check.yml`

## Writing Benchmarks

### Basic Structure

Use Vitest's `bench` function:

```typescript
import { describe, bench } from 'vitest';
import { createWorld, addEntity } from 'blecsd';

describe('Entity Operations', () => {
  bench('create 100 entities', () => {
    const world = createWorld();
    for (let i = 0; i < 100; i++) {
      addEntity(world);
    }
  });
});
```

### Best Practices

1. **Keep CI benchmarks fast** (< 1 second each)
   - Focus on hot paths
   - Use small entity counts (10-100)
   - Minimal setup/teardown

2. **Make benchmarks representative**
   - Reflect real-world usage
   - Test complete flows, not isolated functions
   - Include setup costs when relevant

3. **Avoid noise**
   - Use consistent iterations
   - Minimize variance with warmup
   - Run on consistent hardware

4. **Name benchmarks clearly**
   ```typescript
   // Good
   bench('render 50 entities with layout')

   // Bad
   bench('test 1')
   ```

### CI Benchmark Guidelines

Benchmarks in `benchmarks/ci.bench.ts` should:

- Complete in < 1 second each
- Test critical performance paths
- Be deterministic (no randomness)
- Use small, fixed entity counts

Example:

```typescript
describe('CI: System Operations', () => {
  bench('layout 50 entities', () => {
    const world = createWorld();
    initializeScreen(world, 80, 24);

    for (let i = 0; i < 50; i++) {
      const eid = addEntity(world);
      setPosition(world, eid, i % 80, Math.floor(i / 80));
      setDimensions(world, eid, { width: 10, height: 2 });
    }

    layoutSystem(world);
  });
});
```

### Scenario Benchmark Guidelines

Benchmarks in `benchmarks/scenarios-*.bench.ts` should:

- Test real-world usage scenarios
- Use realistic data volumes
- Simulate user interactions
- Test complete feature flows

Example:

```typescript
describe('Dashboard Scenario', () => {
  bench('16-panel dashboard @ 60 FPS (1000 frames)', () => {
    const world = createWorld();
    initializeScreen(world, 80, 24);

    const panels = createDashboard(world, 16);

    // Simulate 1000 frames of updates
    for (let frame = 0; frame < 1000; frame++) {
      for (let i = 0; i < panels.length; i++) {
        updatePanelData(world, panels[i], Math.sin(frame * 0.1 + i) * 100);
      }
      scheduler.run(world, 1 / 60);
    }
  });
});
```

## Baseline Management

### Baseline File Format

Baselines are stored as JSON:

```json
{
  "timestamp": "2026-02-08T18:45:00.000Z",
  "benchmarks": {
    "create 100 entities": {
      "name": "create 100 entities",
      "hz": 145320.5,
      "mean": 6882.3,
      "variance": 0
    }
  }
}
```

### Baseline Location

- **CI Baselines**: `benchmarks/baselines/ci.json`
- **Future Baselines**: Add more baseline files as needed

### Version Control

**Should baselines be committed?**

✅ **Yes, commit baselines** for:
- CI benchmarks (enables regression detection)
- Stable performance expectations
- Historical tracking

❌ **Don't commit baselines** for:
- Machine-specific benchmarks
- Experimental scenarios

## Troubleshooting

### Baseline Not Found

```
❌ No baseline found!
   Expected baseline at: benchmarks/baselines/ci.json
   Run "pnpm bench:update-baseline" to create a baseline.
```

**Solution**: Run `pnpm bench:update-baseline` to create the baseline.

### False Positive Regressions

If you see false regressions due to noisy benchmarks:

1. **Check variance**: High variance indicates unstable benchmarks
2. **Run multiple times**: Confirm regression is consistent
3. **Adjust threshold**: Increase threshold in `check-perf-regression.ts` (default: 20%)
4. **Fix benchmark**: Reduce noise sources (random data, I/O, etc.)

### CI Benchmark Timeouts

If CI benchmarks timeout:

1. **Check entity counts**: Keep counts small (< 100)
2. **Check iterations**: Reduce frame counts in scenarios
3. **Profile slow benchmarks**: Identify bottlenecks
4. **Split benchmarks**: Break into smaller tests

## Performance Tips

### Optimizing for Benchmarks

When improving performance:

1. **Profile first**: Use Chrome DevTools or Node profiler
2. **Focus on hot paths**: Optimize systems that run every frame
3. **Measure impact**: Run benchmarks before and after changes
4. **Avoid premature optimization**: Profile before optimizing

### Interpreting Results

- **ops/sec**: Operations per second (higher is better)
- **mean**: Average time per operation in nanoseconds
- **Regression**: Performance drop > threshold (20%)
- **Improvement**: Performance gain > threshold (20%)

### Common Performance Issues

1. **Array allocations**: Use typed arrays, avoid spreads
2. **Object creation**: Reuse objects, use object pools
3. **String concatenation**: Use arrays, join at end
4. **Component lookups**: Cache component references
5. **Query overhead**: Minimize query calls in hot loops

## See Also

- [Testing Guide](./testing.md): Unit and integration testing
- [Performance Optimization Guide](./performance.md): Performance best practices
- [GitHub Actions](../../.github/workflows/): CI/CD workflows
