# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Focus Flow — a minimal Pomodoro-style focus timer with task tracking. Vanilla HTML/CSS/JS, no build step, no dependencies, no package manager.

## Commands

Run the local dev server (PowerShell + `HttpListener`, serves on port 5500):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:5500. Alternatively, open `index.html` directly in a browser — the app works without a server since it has no server-side dependencies.

There is no build, lint, or test tooling in this repo — no `package.json`, no test framework. Verify changes by loading the page in a browser.

## Architecture

Three files, no modules/bundler:

- `index.html` — markup only; all interactive elements are referenced by `id` from `script.js` via a single `el = { ... }` lookup object at the top of the file.
- `style.css` — theming via CSS custom properties defined on `:root` (colors, radius). Per-mode gradient colors (`--ring-color-1`/`--ring-color-2`) are swapped at runtime by JS when the timer mode changes.
- `script.js` — a single IIFE containing the entire app. No classes, no framework.

### State model

All app state lives in one `state` object (tasks, active task, per-mode durations, session history by day, streak), persisted to `localStorage` under the key `focusFlow.v1` via `loadState()`/`saveState()`. `loadState()` merges saved data over hardcoded defaults so old/missing keys don't break on load.

Timer-runtime values (`mode`, `secondsLeft`, `totalSeconds`, `timerId`, `isRunning`) are separate module-level variables, not part of `state` — they're not persisted and reset on page reload.

### Flow

- `setMode(mode)` switches Focus/Short Break/Long Break, updates the active tab, swaps the ring's CSS gradient variables, and (unless told not to) resets the countdown.
- `tick()` runs every second via `setInterval`; hitting zero calls `completeSession()`, which plays a Web Audio chime, records the completed session into `state.history` (keyed by ISO date) and the active task's `pomos` count, updates the day streak (`bumpStreak()`), and auto-advances mode — every 4th focus session cycles to a long break, otherwise short break; a completed break always returns to focus.
- Task CRUD (`addTask`/`toggleTaskDone`/`deleteTask`/`setActiveTask`) and duration settings (`applyDurationInputs`) each mutate `state` directly, call `saveState()`, then re-render the relevant DOM section (`renderTasks()`, `renderStats()`, `renderSessionDots()`) — there's no diffing; renders wipe and rebuild the relevant DOM subtree (e.g. `taskList.innerHTML = ""` then rebuilt from `state.tasks`).

## Repo layout

This repo (`focus-flow/`) is nested inside a parent folder (`Mr Comment/`) that also holds unrelated `.claude` configuration — the parent folder is not itself a git repo. Treat `focus-flow/` as the project root.
