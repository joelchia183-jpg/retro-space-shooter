# Retro Space Shooter

## About This Game

**Retro Space Shooter** is a simple retro arcade-style space shooter inspired by classic vector arcade games like *Asteroids*.

The game uses a black background and white line-art graphics for a clean, old-school arcade look. You control a triangular spaceship, shoot floating rocks, dodge a hunter UFO, avoid collisions, and try to earn the highest score you can.

This project was built with AI assistance using [Cursor](https://cursor.com).

---

## Game Controls

### Desktop

| Key / Input | Action |
|-------------|--------|
| **W** | Thrust forward |
| **A** | Rotate left |
| **D** | Rotate right |
| **S** | Reverse thrust / slow down |
| **Spacebar** | Shoot (in game) / start or return to title (on title & game over screens) |
| **E** | Shockwave |
| **Mouse over canvas** | Ship rotates toward cursor; distance from ship controls thrust power |
| **Left click (hold)** | Fire |
| **Right click** | Shockwave |

### Mobile

- **Joystick** — drag toward where you want to fly; pull opposite to drift to slow down
- **FIRE** — shoot
- **WAVE** — shockwave
- **Tap** title screen to start; **tap** game over screen to return to title

Use the **SFX ON / OFF** button in the top-right corner to mute or unmute sound.

### Beta test (desktop)

| Key | Action |
|-----|--------|
| **U** | Force-spawn a UFO for testing |

---

## Gameplay Features

- **Black background with white retro vector style** — no image files; everything is drawn with Canvas line art
- **Spaceship movement with inertia** — the ship drifts in space and does not stop instantly
- **Shooting system** — fire bullets with Space (desktop) or FIRE (mobile)
- **Rock spawning** — asteroids float around the screen; new waves spawn when all rocks are destroyed
- **Rock splitting** — large rocks break into medium rocks, and medium rocks break into small rocks
- **Rock-to-rock collisions** — rocks bounce off each other when they collide
- **UFO hunter enemy** — a classic flying saucer that crosses the screen, chases you when you get close, and causes game over on contact
- **Explosion particles** — white particle bursts when rocks or UFOs are destroyed
- **Smoke trail particles** — small white dots trail behind the ship when thrusting
- **Score system** — earn points for destroying rocks; UFOs are worth 500 points
- **High score board** — top 5 scores are saved in your browser (`localStorage`)
- **Game over screen** — shows your score, high scores, and restart instructions
- **Ship destruction effect** — the ship breaks into 3 pieces on collision
- **Title screen flow** — press **Space** (desktop) or tap (mobile) to start; return to title after game over
- **Shockwave ability** — expanding dotted ring breaks rocks and destroys UFOs; **E** on desktop, **WAVE** button on mobile (5-second cooldown)
- **Desktop + mobile layouts** — auto-detects device; desktop uses an 800×600 game box, mobile uses a touch controller panel
- **Direction-based mobile joystick** — ship steers toward the joystick direction with inertia
- **Delta time movement** — consistent gameplay speed across different frame rates and devices
- **Retro arcade sound effects** — laser, explosions, thrust hum, shockwave, game over, and UFO sounds (Web Audio API, no external audio files)

---

## UFO Enemy

The UFO is a **hunter** — it does **not** shoot projectiles.

| Behavior | Details |
|----------|---------|
| **Spawn** | One UFO at a time, entering from a random screen edge every 12–28 seconds |
| **Patrol** | If you stay far away, it cruises straight across the play area and exits |
| **Chase** | If you enter its detection range (~180 px), it locks on and pursues you |
| **Rocks** | Rocks bounce off the UFO instead of breaking |
| **Ship contact** | Game over |
| **Destroyed by** | Bullets or shockwave (+500 score) |

**UFO sounds**

- **Appear** — short rising retro beep when it enters
- **Patrol hum** — soft looping hum while cruising (stops on chase, removal, or game over)
- **Chase hum** — faster, more urgent pulsing tone while hunting
- **Destroyed** — distinct electronic zap (different from rock break sounds)

Hum loops use persistent Web Audio nodes and only start/stop on state changes (not every frame). Audio respects the mute button and requires a user interaction to start (same as other SFX).

---

## Version History

### Version 1.0

- Created the first playable version
- Added spaceship movement with inertia and drifting
- Added shooting system
- Added rock spawning
- Added rock collision
- Added rock splitting system
- Added particle explosion when rocks break
- Added smoke trail particles behind the spaceship
- Added score system
- Added game over and restart flow
- Added retro arcade visual style
- Added retro arcade sound effects
- Added high score saving (top 5)
- Added start screen
- Added rock-to-rock bounce physics
- Added ship break-apart effect on collision
- Added progressive rock waves

### Version 2.0

- Added desktop and mobile support with automatic layout detection
- Added mobile Game Boy-style controller with joystick, **FIRE**, and **WAVE** buttons
- Replaced mobile virtual key mapping with direction-based joystick steering
- Added shockwave ability (**E** on desktop, **WAVE** on mobile) with 5-second cooldown
- Added shockwave cooldown UI with greyed **WAVE READY** label and countdown timer
- Updated title and game over flow — **Space** returns to title screen after game over
- Restored desktop mode to a fixed 800×600 bordered game box
- Added delta time updates so movement and effects stay consistent across 30, 60, and higher FPS
- Increased overall sound volume for clearer retro SFX

### Version 2.1

- Added UFO hunter enemy (patrol, chase, rock bounce, collision game over)
- Added classic flying saucer vector art (separate visual size and collision radius)
- Added desktop mouse aim, thrust-by-distance, click-to-fire, and right-click shockwave
- Added UFO sound effects: appear, patrol hum, chase hum, and destroyed zap
- Added slower UFO cruise speed when not chasing
- Added **U** key to force-spawn a UFO for beta testing

---

## How To Run The Game

### Option 1: Open directly in a browser

1. Download or clone this project
2. Open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari)

No installation or build step is required.

### Option 2: Run a local server

If you have Node.js installed (recommended):

```bash
cd "Retro Asteroids Game"
npx serve . -l tcp://0.0.0.0:8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

If you have Python installed:

```bash
cd "Retro Asteroids Game"
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

> **Note:** Error `-102` / connection refused usually means the local server is not running. Start the server and keep the terminal open while you play.

### Option 3: Publish with GitHub Pages

1. Push this project to a GitHub repository
2. Go to **Settings → Pages**
3. Set the source branch (usually `main`) and folder (`/root`)
4. Save and wait for GitHub Pages to deploy
5. Open the published URL in your browser

---

## Project Structure

```
Retro Asteroids Game/
├── index.html    # Main HTML page, canvas, and UI
├── style.css     # UI and layout styles (desktop + mobile)
├── game.js       # Game logic, physics, particles, UFO, and audio
└── README.md     # This file
```

---

## Future Ideas

- Power-ups
- Levels / boss fight
- Online/global high score leaderboard
- Additional enemy types

---

## License

This is a beginner-friendly learning project. Feel free to use, modify, and share it.
