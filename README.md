# Retro Space Shooter

## About This Game

**Retro Space Shooter** is a simple retro arcade-style space shooter inspired by classic vector arcade games like *Asteroids*.

The game uses a black background and white line-art graphics for a clean, old-school arcade look. You control a triangular spaceship, shoot floating rocks, avoid collisions, and try to earn the highest score you can.

This project was built with AI assistance using [Cursor](https://cursor.com).

---

## Game Controls

### Desktop

| Key | Action |
|-----|--------|
| **W** | Thrust forward |
| **A** | Rotate left |
| **D** | Rotate right |
| **S** | Reverse thrust / slow down |
| **Spacebar** | Shoot (in game) / start or return to title (on title & game over screens) |
| **E** | Shockwave |

### Mobile

- **Joystick** — drag toward where you want to fly; pull opposite to drift to slow down
- **FIRE** — shoot
- **WAVE** — shockwave
- **Tap** title screen to start; **tap** game over screen to return to title

Use the **SFX ON / OFF** button in the top-right corner to mute or unmute sound.

---

## Gameplay Features

- **Black background with white retro vector style** — no images, only simple outlines
- **Spaceship movement with inertia** — the ship drifts in space and does not stop instantly
- **Shooting system** — fire bullets with the spacebar
- **Rock spawning** — asteroids float around the screen; new waves spawn when all rocks are destroyed
- **Rock splitting** — large rocks break into medium rocks, and medium rocks break into small rocks
- **Rock-to-rock collisions** — rocks bounce off each other when they collide
- **Explosion particles** — white particle bursts when rocks are destroyed
- **Smoke trail particles** — small white dots trail behind the ship when thrusting
- **Score system** — earn points for destroying rocks
- **High score board** — top 5 scores are saved in your browser
- **Game over screen** — shows your score, high scores, and restart instructions
- **Ship destruction effect** — the ship breaks into 3 pieces on collision
- **Title screen flow** — press **Space** (desktop) or tap (mobile) to start; return to title after game over
- **Shockwave ability** — expanding dotted ring breaks rocks; **E** on desktop, **WAVE** button on mobile
- **Desktop + mobile layouts** — auto-detects device; desktop uses an 800×600 game box, mobile uses a touch controller panel
- **Direction-based mobile joystick** — ship steers toward the joystick direction with inertia
- **Delta time movement** — consistent gameplay speed across different frame rates and devices
- **Retro arcade sound effects** — laser, explosions, thrust hum, shockwave, and game over tones (Web Audio API)

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

---

## How To Run The Game

### Option 1: Open directly in a browser

1. Download or clone this project
2. Open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari)

No installation or build step is required.

### Option 2: Run a local server

If you have Python installed:

```bash
cd "Retro Asteroids Game"
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

If you have Node.js installed:

```bash
cd "Retro Asteroids Game"
npx serve .
```

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
├── index.html    # Main HTML page and game canvas
├── style.css     # UI and layout styles
├── game.js       # Game logic, physics, particles, and audio
└── README.md     # This file
```

---

## Future Ideas

- Power-ups
- Levels
- Boss fight
- More sound effects
- Online/global high score leaderboard

---

## License

This is a beginner-friendly learning project. Feel free to use, modify, and share it.
