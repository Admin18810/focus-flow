# Focus Flow

A minimal Pomodoro-style focus timer with task tracking, built with vanilla HTML, CSS, and JavaScript — no build step, no dependencies.

## Features

- Focus / Short Break / Long Break timer modes with a circular progress ring
- Automatic cycling: after 4 focus sessions, the app switches to a long break
- Task list — add tasks, mark them done, and track completed focus sessions (🍅) per task
- Daily stats: sessions completed and focus minutes for today
- Day streak tracking for consecutive days with a completed session
- Configurable durations for each mode
- State persisted locally via `localStorage`

## Running locally

Start the included static file server:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
```

Then open [http://localhost:5500](http://localhost:5500) in your browser.

Alternatively, just open `index.html` directly in a browser.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | App markup |
| `style.css` | Styling and theme variables |
| `script.js` | Timer logic, task management, and state persistence |
| `serve.ps1` | Zero-dependency local dev server (PowerShell + `HttpListener`) |
