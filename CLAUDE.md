# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development server

```bash
npx http-server . -p 8080 --cors
```

Open `http://127.0.0.1:8080` in a browser to run the game.

## Architecture

This is a single-page vanilla JS breakout game with no build step or dependencies.

- `index.html` — layout, Canvas element, score/lives/level UI, loads `main.js`
- `main.js` — all game logic and rendering via Canvas 2D API

### main.js structure

| Section | Lines | Description |
|---------|-------|-------------|
| 定数・状態変数 | 1–37 | Canvas ref, sizes/speeds as constants, mutable game state (`score`, `lives`, `level`, `paddle`, `ball`, `bricks`) |
| 初期化 | 39–90 | `init()`, `resetPaddle()`, `resetBall()`, `buildBricks()` |
| 入力処理 | 92–127 | Keyboard (`keys` map), mouse/touch → paddle X, Space/click → `ball.launched` |
| `update()` | 129–227 | Per-frame logic: paddle move → ball move → wall/paddle/brick collision → fall detection → level clear |
| `draw()` | 249–292 | Full-canvas redraw each frame: bricks, paddle (linear gradient), ball (radial gradient), launch guide line |
| ゲームループ | 308–329 | `requestAnimationFrame` loop; `startGame()` wired to the Start button |

### Collision model

- **Wall/ceiling**: flip velocity component on penetration, correct position.
- **Paddle**: hit position relative to paddle center maps to reflection angle (max ±60°), speed magnitude preserved via `Math.hypot`.
- **Bricks**: AABB overlap on all four sides; minimum overlap side determines whether `vx` or `vy` is flipped. One brick per frame.

## Environment

- Devcontainer: Debian Bookworm + Node.js + GitHub CLI
- Playwright Chromium deps installed via `post_create.sh` (available for automated browser testing if needed)
