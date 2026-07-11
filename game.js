// --- Canvas setup ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const waveStatusEl = document.getElementById("wave-status");
const waveLabelEl = document.getElementById("wave-label");
const waveCountdownEl = document.getElementById("wave-countdown");
const muteBtn = document.getElementById("mute-btn");
const startScreen = document.getElementById("start-screen");
const mobileControls = document.getElementById("mobile-controls");
const instructionsDesktop = document.getElementById("instructions-desktop");
const instructionsMobile = document.getElementById("instructions-mobile");
const startPromptDesktop = document.querySelector(".start-prompt-desktop");
const startPromptMobile = document.querySelector(".start-prompt-mobile");

let W = 800;
let H = 600;
const DESKTOP_W = 800;
const DESKTOP_H = 600;
let inputMode = "desktop";

// --- Game state ---
let score = 0;
let gameOver = false;
let waitingToStart = true;
let screenShake = 0;
let particles = [];
let rocks = [];
let bullets = [];
let ufos = [];
let ufoSpawnTimer = 0;
let ufoNextSpawn = 0;
let ufoAudioState = "none";
let rockCount = 4;
let shipDebris = [];
let shipBreakActive = false;
let shipBreakTimer = 0;

const HIGH_SCORE_KEY = "asteroidsHighScores";
const MAX_HIGH_SCORES = 5;
let highScores = loadHighScores();

let lastFrameTime = performance.now();
const REFERENCE_FPS = 60;
const MAX_DELTA_TIME = 0.05;
const SHIP_BREAK_DURATION = 50 / REFERENCE_FPS;

function timeScale(dt) {
  return dt * REFERENCE_FPS;
}

const keys = {};

// --- Input mode & mobile controls ---
const mobileInput = { fire: false };
const joystick = {
  active: false,
  touchId: null,
  normX: 0,
  normY: 0,
  power: 0,
  angle: 0,
  centerX: 0,
  centerY: 0,
  maxRadius: 58,
};

const JOYSTICK_DEAD_ZONE = 0.12;
const MOBILE_MAX_TURN_SPEED = 2.8;

const mouse = {
  x: 0,
  y: 0,
  leftDown: false,
  tracking: false,
  power: 0,
  angle: 0,
};

const MOUSE_MAX_DISTANCE_RATIO = 0.35;
const MOUSE_DEAD_ZONE = 0.08;

// --- Shockwave ---
let shockwaves = [];
let shockwaveCooldownUntil = 0;
const SHOCKWAVE_COOLDOWN = 5000;
const SHOCKWAVE_EXPAND_SPEED = 4;

// --- UFO enemy (hunter — no shooting) ---
const UFO_RADIUS = 22;
const UFO_VISUAL_RADIUS = 32;
const UFO_CRUISE_SPEED = 1.5;
const UFO_SPEED = 2.4;
const UFO_CHASE_RANGE = 180;
const UFO_SCORE = 500;
const UFO_SPAWN_MIN = 12;
const UFO_SPAWN_MAX = 28;

// --- Ship settings ---
const ship = {
  x: W / 2,
  y: H / 2,
  angle: -Math.PI / 2,
  vx: 0,
  vy: 0,
  radius: 14,
  thrustPower: 0.09,
  reversePower: 0.02,
  rotateSpeed: 0.06,
  maxSpeed: 7,
  friction: 0.992,
};

// --- Rock size definitions ---
const ROCK_SIZES = {
  large:  { radius: 45, score: 20, sides: 10 },
  medium: { radius: 28, score: 50, sides: 8 },
  small:  { radius: 16, score: 100, sides: 6 },
};

// --- Web Audio (retro SFX, no external files) ---
const sfx = {
  ctx: null,
  master: null,
  noiseBuffer: null,
  thrustOsc: null,
  thrustGain: null,
  thrustFilter: null,
  thrustActive: false,
  ufoPatrolOsc: null,
  ufoPatrolGain: null,
  ufoPatrolPulse: null,
  ufoPatrolPulseDepth: null,
  ufoPatrolActive: false,
  ufoChaseOsc: null,
  ufoChaseGain: null,
  ufoChasePulse: null,
  ufoChasePulseDepth: null,
  ufoChaseActive: false,
  muted: false,
  volume: 0.6,
  ready: false,
};

function initAudio() {
  if (sfx.ready) return;
  sfx.ctx = new (window.AudioContext || window.webkitAudioContext)();
  sfx.master = sfx.ctx.createGain();
  sfx.master.gain.value = sfx.volume;
  sfx.master.connect(sfx.ctx.destination);

  const sampleRate = sfx.ctx.sampleRate;
  const noiseLength = sampleRate * 0.5;
  sfx.noiseBuffer = sfx.ctx.createBuffer(1, noiseLength, sampleRate);
  const noiseData = sfx.noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseLength; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  sfx.thrustOsc = sfx.ctx.createOscillator();
  sfx.thrustOsc.type = "sine";
  sfx.thrustOsc.frequency.value = 42;
  sfx.thrustFilter = sfx.ctx.createBiquadFilter();
  sfx.thrustFilter.type = "lowpass";
  sfx.thrustFilter.frequency.value = 120;
  sfx.thrustGain = sfx.ctx.createGain();
  sfx.thrustGain.gain.value = 0;
  sfx.thrustOsc.connect(sfx.thrustFilter);
  sfx.thrustFilter.connect(sfx.thrustGain);
  sfx.thrustGain.connect(sfx.master);
  sfx.thrustOsc.start();

  initUfoSoundNodes();

  sfx.ready = true;
}

function initUfoSoundNodes() {
  if (!sfx.ctx || sfx.ufoPatrolOsc) return;
  const ctx = sfx.ctx;

  sfx.ufoPatrolOsc = ctx.createOscillator();
  sfx.ufoPatrolOsc.type = "sine";
  sfx.ufoPatrolOsc.frequency.value = 75;
  sfx.ufoPatrolGain = ctx.createGain();
  sfx.ufoPatrolGain.gain.value = 0;
  sfx.ufoPatrolPulse = ctx.createOscillator();
  sfx.ufoPatrolPulse.type = "sine";
  sfx.ufoPatrolPulse.frequency.value = 2.2;
  sfx.ufoPatrolPulseDepth = ctx.createGain();
  sfx.ufoPatrolPulseDepth.gain.value = 0.008;
  sfx.ufoPatrolOsc.connect(sfx.ufoPatrolGain);
  sfx.ufoPatrolGain.connect(sfx.master);
  sfx.ufoPatrolPulse.connect(sfx.ufoPatrolPulseDepth);
  sfx.ufoPatrolPulseDepth.connect(sfx.ufoPatrolGain.gain);
  sfx.ufoPatrolOsc.start();
  sfx.ufoPatrolPulse.start();

  sfx.ufoChaseOsc = ctx.createOscillator();
  sfx.ufoChaseOsc.type = "square";
  sfx.ufoChaseOsc.frequency.value = 108;
  sfx.ufoChaseGain = ctx.createGain();
  sfx.ufoChaseGain.gain.value = 0;
  sfx.ufoChasePulse = ctx.createOscillator();
  sfx.ufoChasePulse.type = "sine";
  sfx.ufoChasePulse.frequency.value = 7;
  sfx.ufoChasePulseDepth = ctx.createGain();
  sfx.ufoChasePulseDepth.gain.value = 0.012;
  sfx.ufoChaseOsc.connect(sfx.ufoChaseGain);
  sfx.ufoChaseGain.connect(sfx.master);
  sfx.ufoChasePulse.connect(sfx.ufoChasePulseDepth);
  sfx.ufoChasePulseDepth.connect(sfx.ufoChaseGain.gain);
  sfx.ufoChaseOsc.start();
  sfx.ufoChasePulse.start();
}

const UFO_PATROL_VOLUME = 0.022;
const UFO_CHASE_VOLUME = 0.032;

function playUfoAppearSfx() {
  if (!sfx.ready || sfx.muted) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain);
  gain.connect(sfx.master);
  osc.start(now);
  osc.stop(now + 0.22);
}

function playUfoDestroyedSound() {
  if (!sfx.ready || sfx.muted) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;

  const zap = ctx.createOscillator();
  const zapGain = ctx.createGain();
  zap.type = "sawtooth";
  zap.frequency.setValueAtTime(720, now);
  zap.frequency.exponentialRampToValueAtTime(90, now + 0.28);
  zapGain.gain.setValueAtTime(0.11, now);
  zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  zap.connect(zapGain);
  zapGain.connect(sfx.master);
  zap.start(now);
  zap.stop(now + 0.32);

  const ping = ctx.createOscillator();
  const pingGain = ctx.createGain();
  ping.type = "square";
  ping.frequency.setValueAtTime(960, now);
  ping.frequency.exponentialRampToValueAtTime(180, now + 0.14);
  pingGain.gain.setValueAtTime(0.09, now);
  pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  ping.connect(pingGain);
  pingGain.connect(sfx.master);
  ping.start(now);
  ping.stop(now + 0.18);

  playNoiseBurst(0.1, 0.07, 2600);
}

function startUfoPatrolHum() {
  if (!sfx.ready || sfx.muted || sfx.ufoPatrolActive) return;
  initUfoSoundNodes();
  stopUfoChaseHum();
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  sfx.ufoPatrolPulseDepth.gain.setValueAtTime(0.008, now);
  sfx.ufoPatrolGain.gain.cancelScheduledValues(now);
  sfx.ufoPatrolGain.gain.setValueAtTime(0, now);
  sfx.ufoPatrolGain.gain.linearRampToValueAtTime(UFO_PATROL_VOLUME, now + 0.3);
  sfx.ufoPatrolActive = true;
}

function stopUfoPatrolHum() {
  if (!sfx.ready || !sfx.ufoPatrolActive) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  sfx.ufoPatrolGain.gain.cancelScheduledValues(now);
  sfx.ufoPatrolGain.gain.setValueAtTime(sfx.ufoPatrolGain.gain.value, now);
  sfx.ufoPatrolGain.gain.linearRampToValueAtTime(0, now + 0.2);
  sfx.ufoPatrolPulseDepth.gain.setValueAtTime(0, now + 0.2);
  sfx.ufoPatrolActive = false;
}

function startUfoChaseHum() {
  if (!sfx.ready || sfx.muted || sfx.ufoChaseActive) return;
  initUfoSoundNodes();
  stopUfoPatrolHum();
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  sfx.ufoChasePulseDepth.gain.setValueAtTime(0.012, now);
  sfx.ufoChaseGain.gain.cancelScheduledValues(now);
  sfx.ufoChaseGain.gain.setValueAtTime(0, now);
  sfx.ufoChaseGain.gain.linearRampToValueAtTime(UFO_CHASE_VOLUME, now + 0.15);
  sfx.ufoChaseActive = true;
}

function stopUfoChaseHum() {
  if (!sfx.ready || !sfx.ufoChaseActive) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  sfx.ufoChaseGain.gain.cancelScheduledValues(now);
  sfx.ufoChaseGain.gain.setValueAtTime(sfx.ufoChaseGain.gain.value, now);
  sfx.ufoChaseGain.gain.linearRampToValueAtTime(0, now + 0.2);
  sfx.ufoChasePulseDepth.gain.setValueAtTime(0, now + 0.2);
  sfx.ufoChaseActive = false;
}

function setUfoAudioState(next) {
  if (ufoAudioState === next) return;
  if (ufoAudioState === "patrol") stopUfoPatrolHum();
  if (ufoAudioState === "chase") stopUfoChaseHum();
  ufoAudioState = next;
  if (next === "patrol") startUfoPatrolHum();
  else if (next === "chase") startUfoChaseHum();
}

function stopAllUfoSounds() {
  if (ufoAudioState === "none") return;
  if (ufoAudioState === "patrol") stopUfoPatrolHum();
  else if (ufoAudioState === "chase") stopUfoChaseHum();
  ufoAudioState = "none";
}

function beginUfoChase(ufo) {
  if (ufo.chasing) return;
  ufo.chasing = true;
  setUfoAudioState("chase");
}

function onUfoRemoved() {
  stopAllUfoSounds();
}

function resumeAudio() {
  initAudio();
  if (sfx.ctx.state === "suspended") {
    sfx.ctx.resume();
  }
}

function setMuted(muted) {
  sfx.muted = muted;
  if (sfx.master) {
    sfx.master.gain.value = muted ? 0 : sfx.volume;
  }
  if (muted) {
    stopThrustSound();
    stopAllUfoSounds();
  }
  muteBtn.textContent = muted ? "SFX OFF" : "SFX ON";
}

function playNoiseBurst(duration, gainPeak, filterFreq) {
  if (!sfx.ready || sfx.muted) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = sfx.noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainPeak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfx.master);
  source.start(now);
  source.stop(now + duration + 0.05);
}

function playLaserSound() {
  if (!sfx.ready || sfx.muted) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.07);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain);
  gain.connect(sfx.master);
  osc.start(now);
  osc.stop(now + 0.08);
}

function playRockHitSound() {
  if (!sfx.ready || sfx.muted) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain);
  gain.connect(sfx.master);
  osc.start(now);
  osc.stop(now + 0.06);
  playNoiseBurst(0.04, 0.1, 1800);
}

function playExplosionSound(size) {
  if (!sfx.ready || sfx.muted) return;
  const settings = {
    large:  { duration: 0.35, gain: 0.28, freq: 900 },
    medium: { duration: 0.22, gain: 0.18, freq: 1200 },
    small:  { duration: 0.12, gain: 0.1, freq: 1600 },
  };
  const config = settings[size] || settings.small;
  playNoiseBurst(config.duration, config.gain, config.freq);
}

const THRUST_HUM_VOLUME = 0.04;

function startThrustSound() {
  if (!sfx.ready || sfx.muted || sfx.thrustActive) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  sfx.thrustGain.gain.cancelScheduledValues(now);
  sfx.thrustGain.gain.setValueAtTime(0, now);
  sfx.thrustGain.gain.linearRampToValueAtTime(THRUST_HUM_VOLUME, now + 0.25);
  sfx.thrustActive = true;
}

function stopThrustSound() {
  if (!sfx.ready || !sfx.thrustActive) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  sfx.thrustGain.gain.cancelScheduledValues(now);
  sfx.thrustGain.gain.setValueAtTime(sfx.thrustGain.gain.value, now);
  sfx.thrustGain.gain.linearRampToValueAtTime(0, now + 0.2);
  sfx.thrustActive = false;
}

function playGameOverSound() {
  if (!sfx.ready || sfx.muted) return;
  stopThrustSound();
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  const notes = [440, 330, 220, 110];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.14;
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.14, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
    osc.connect(gain);
    gain.connect(sfx.master);
    osc.start(start);
    osc.stop(start + 0.14);
  });
}

function playStartSound() {
  if (!sfx.ready || sfx.muted) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.07;
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
    osc.connect(gain);
    gain.connect(sfx.master);
    osc.start(start);
    osc.stop(start + 0.09);
  });
}

function playShockwaveSound() {
  if (!sfx.ready || sfx.muted) return;
  const ctx = sfx.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(sfx.master);
  osc.start(now);
  osc.stop(now + 0.32);
  playNoiseBurst(0.2, 0.12, 500);
}

function goToTitleScreen() {
  gameOver = false;
  waitingToStart = true;
  shipBreakActive = false;
  shipBreakTimer = 0;
  shipDebris = [];
  stopThrustSound();
  score = 0;
  scoreEl.textContent = "Score: 0";
  rocks = [];
  bullets = [];
  particles = [];
  shockwaves = [];
  resetUfoSpawning();
  screenShake = 0;
  for (const key in keys) keys[key] = false;
  ship.x = W / 2;
  ship.y = H / 2;
  ship.angle = -Math.PI / 2;
  ship.vx = 0;
  ship.vy = 0;
  resetMouse();
  spawnInitialRocks(4);
  startScreen.classList.remove("hidden");
}

function beginGame() {
  resumeAudio();
  if (sfx.muted) setMuted(true);
  waitingToStart = false;
  startScreen.classList.add("hidden");
  resetGame();
  playStartSound();
}

// --- Input mode detection & responsive layout ---
function detectInputMode() {
  const isNarrow = window.innerWidth <= 768;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return isNarrow || hasTouch ? "mobile" : "desktop";
}

function resizeGame() {
  inputMode = detectInputMode();
  document.body.classList.toggle("mobile-mode", inputMode === "mobile");
  document.body.classList.toggle("desktop-mode", inputMode === "desktop");

  if (inputMode === "mobile") {
    W = window.innerWidth;
    H = Math.floor(window.innerHeight * 0.66);
    mobileControls.classList.remove("hidden");
    instructionsDesktop.classList.add("hidden");
    instructionsMobile.classList.remove("hidden");
    startPromptDesktop.classList.add("hidden");
    startPromptMobile.classList.remove("hidden");
  } else {
    W = DESKTOP_W;
    H = DESKTOP_H;
    mobileControls.classList.add("hidden");
    instructionsDesktop.classList.remove("hidden");
    instructionsMobile.classList.add("hidden");
    startPromptDesktop.classList.remove("hidden");
    startPromptMobile.classList.add("hidden");
  }

  canvas.width = W;
  canvas.height = H;

  if (waitingToStart || gameOver) {
    ship.x = W / 2;
    ship.y = H / 2;
  }
}

function resetJoystick() {
  joystick.active = false;
  joystick.touchId = null;
  joystick.normX = 0;
  joystick.normY = 0;
  joystick.power = 0;
  joystick.angle = 0;
  mobileInput.fire = false;
  const knob = document.getElementById("joystick-knob");
  if (knob) {
    knob.style.transform = "translate(0px, 0px)";
    knob.style.transition = "transform 0.08s ease-out";
  }
}

function shortestAngleDiff(from, to) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function updateJoystickInput() {
  joystick.power = 0;
  joystick.angle = 0;

  if (inputMode !== "mobile" || !joystick.active) {
    joystick.normX = 0;
    joystick.normY = 0;
    return;
  }

  joystick.power = Math.min(1, Math.sqrt(
    joystick.normX * joystick.normX + joystick.normY * joystick.normY
  ));

  if (joystick.power > 0.001) {
    joystick.angle = Math.atan2(joystick.normY, joystick.normX);
  }
}

function updateMobileShip(dt) {
  let thrusting = false;
  const ts = timeScale(dt);

  if (!joystick.active || joystick.power <= JOYSTICK_DEAD_ZONE) {
    stopThrustSound();
    return thrusting;
  }

  const joyAngle = joystick.angle;
  const power = joystick.power;
  const angleDiff = shortestAngleDiff(ship.angle, joyAngle);

  // Smoothly rotate toward joystick direction (shortest path)
  const turnStep = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), MOBILE_MAX_TURN_SPEED * dt);
  ship.angle += turnStep;

  const facingAlign = Math.cos(shortestAngleDiff(ship.angle, joyAngle));
  const speed = shipSpeed();
  let braking = false;

  if (speed > 0.2) {
    const velAngle = Math.atan2(ship.vy, ship.vx);
    const velAlign = Math.cos(shortestAngleDiff(velAngle, joyAngle));

    // Joystick pushed opposite to drift direction — counter-thrust
    if (velAlign < -0.35) {
      const brakeStrength = power * Math.abs(velAlign) * ship.reversePower * ts;
      ship.vx -= Math.cos(velAngle) * brakeStrength;
      ship.vy -= Math.sin(velAngle) * brakeStrength;
      braking = true;
      thrusting = true;
      startThrustSound();
    }
  }

  if (!braking) {
    if (facingAlign > 0.6) {
      const thrustStrength = power * facingAlign * ship.thrustPower * ts;
      ship.vx += Math.cos(ship.angle) * thrustStrength;
      ship.vy += Math.sin(ship.angle) * thrustStrength;
      thrusting = true;
      startThrustSound();
    } else if (facingAlign > 0.15) {
      const thrustStrength = power * facingAlign * ship.thrustPower * ts * 0.35;
      ship.vx += Math.cos(ship.angle) * thrustStrength;
      ship.vy += Math.sin(ship.angle) * thrustStrength;
      thrusting = true;
      startThrustSound();
    }
  }

  return thrusting;
}

function resetMouse() {
  mouse.leftDown = false;
  mouse.tracking = false;
  mouse.power = 0;
  mouse.angle = 0;
}

function updateDesktopMouseInput() {
  mouse.power = 0;
  mouse.angle = 0;

  if (!mouse.tracking) return;

  const dx = mouse.x - ship.x;
  const dy = mouse.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = Math.max(40, Math.min(W, H) * MOUSE_MAX_DISTANCE_RATIO);
  mouse.power = Math.min(1, dist / maxDist);

  if (dist > 1) {
    mouse.angle = Math.atan2(dy, dx);
  }
}

function updateDesktopMouseShip(dt) {
  updateDesktopMouseInput();
  let thrusting = false;
  const ts = timeScale(dt);

  if (!mouse.tracking || mouse.power <= MOUSE_DEAD_ZONE) {
    if (!keys.KeyW) stopThrustSound();
    return thrusting;
  }

  const targetAngle = mouse.angle;
  const power = mouse.power;
  const angleDiff = shortestAngleDiff(ship.angle, targetAngle);

  const turnStep = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), MOBILE_MAX_TURN_SPEED * dt);
  ship.angle += turnStep;

  const facingAlign = Math.cos(shortestAngleDiff(ship.angle, targetAngle));
  const speed = shipSpeed();
  let braking = false;

  if (speed > 0.2) {
    const velAngle = Math.atan2(ship.vy, ship.vx);
    const velAlign = Math.cos(shortestAngleDiff(velAngle, targetAngle));

    if (velAlign < -0.35) {
      const brakeStrength = power * Math.abs(velAlign) * ship.reversePower * ts;
      ship.vx -= Math.cos(velAngle) * brakeStrength;
      ship.vy -= Math.sin(velAngle) * brakeStrength;
      braking = true;
      thrusting = true;
      startThrustSound();
    }
  }

  if (!braking) {
    if (facingAlign > 0.6) {
      const thrustStrength = power * facingAlign * ship.thrustPower * ts;
      ship.vx += Math.cos(ship.angle) * thrustStrength;
      ship.vy += Math.sin(ship.angle) * thrustStrength;
      thrusting = true;
      startThrustSound();
    } else if (facingAlign > 0.15) {
      const thrustStrength = power * facingAlign * ship.thrustPower * ts * 0.35;
      ship.vx += Math.cos(ship.angle) * thrustStrength;
      ship.vy += Math.sin(ship.angle) * thrustStrength;
      thrusting = true;
      startThrustSound();
    } else if (!keys.KeyW) {
      stopThrustSound();
    }
  }

  return thrusting;
}

function getCanvasMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function isDesktopGameplayActive() {
  return inputMode === "desktop" && !waitingToStart && !gameOver && !shipBreakActive;
}

function setupDesktopMouseControls() {
  canvas.addEventListener("mousemove", (e) => {
    if (!isDesktopGameplayActive()) return;
    const pos = getCanvasMousePos(e);
    mouse.x = pos.x;
    mouse.y = pos.y;
    mouse.tracking = true;
  });

  canvas.addEventListener("mouseleave", () => {
    mouse.tracking = false;
    mouse.leftDown = false;
    if (!keys.KeyW) stopThrustSound();
  });

  canvas.addEventListener("mousedown", (e) => {
    if (!isDesktopGameplayActive()) return;
    const pos = getCanvasMousePos(e);
    mouse.x = pos.x;
    mouse.y = pos.y;
    mouse.tracking = true;
    if (e.button === 0) {
      mouse.leftDown = true;
      shoot();
    } else if (e.button === 2) {
      e.preventDefault();
      activateShockwave();
    }
  });

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouse.leftDown = false;
  });
}

function setupMobileControls() {
  const zone = document.getElementById("joystick-zone");
  const base = document.getElementById("joystick-base");
  const knob = document.getElementById("joystick-knob");
  const fireBtn = document.getElementById("fire-btn");
  const waveBtn = document.getElementById("wave-btn");

  function getJoystickMaxRadius() {
    const baseRect = base.getBoundingClientRect();
    const knobRect = knob.getBoundingClientRect();
    const baseRadius = baseRect.width / 2;
    const knobRadius = knobRect.width / 2;
    return Math.max(8, baseRadius - knobRadius - 2);
  }

  function moveKnob(touch) {
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = getJoystickMaxRadius();

    joystick.centerX = centerX;
    joystick.centerY = centerY;
    joystick.maxRadius = maxRadius;

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    joystick.normX = dx / maxRadius;
    joystick.normY = dy / maxRadius;
    knob.style.transition = "none";
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function findJoystickTouch(touches) {
    for (const touch of touches) {
      if (touch.identifier === joystick.touchId) return touch;
    }
    return null;
  }

  zone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (waitingToStart || gameOver || shipBreakActive) return;
    const touch = e.changedTouches[0];
    joystick.active = true;
    joystick.touchId = touch.identifier;
    moveKnob(touch);
  }, { passive: false });

  function onJoystickTouchMove(e) {
    if (!joystick.active) return;
    const touch = findJoystickTouch(e.touches);
    if (touch) {
      e.preventDefault();
      moveKnob(touch);
    }
  }

  zone.addEventListener("touchmove", onJoystickTouchMove, { passive: false });
  document.addEventListener("touchmove", onJoystickTouchMove, { passive: false });

  function endJoystick(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystick.touchId) {
        resetJoystick();
        stopThrustSound();
        break;
      }
    }
  }

  zone.addEventListener("touchend", endJoystick);
  zone.addEventListener("touchcancel", endJoystick);
  document.addEventListener("touchend", endJoystick);
  document.addEventListener("touchcancel", endJoystick);

  fireBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (waitingToStart || gameOver || shipBreakActive) return;
    mobileInput.fire = true;
    shoot();
  }, { passive: false });

  fireBtn.addEventListener("touchend", () => {
    mobileInput.fire = false;
  });

  waveBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (waitingToStart || gameOver || shipBreakActive) return;
    activateShockwave();
  }, { passive: false });

  startScreen.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (waitingToStart && inputMode === "mobile") beginGame();
  }, { passive: false });

  canvas.addEventListener("touchstart", (e) => {
    if (gameOver && inputMode === "mobile") {
      e.preventDefault();
      goToTitleScreen();
    }
  }, { passive: false });
}

function isShockwaveReady() {
  return Date.now() >= shockwaveCooldownUntil;
}

function getWaveCooldownSeconds() {
  const remainingMs = shockwaveCooldownUntil - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

function updateWaveUI() {
  const ready = isShockwaveReady();
  const secondsLeft = getWaveCooldownSeconds();

  if (waveStatusEl) {
    waveStatusEl.classList.toggle("on-cooldown", !ready);
    if (waveLabelEl) waveLabelEl.textContent = "WAVE READY";
    if (waveCountdownEl) {
      waveCountdownEl.textContent = ready ? "" : String(secondsLeft);
    }
  }

  const waveBtn = document.getElementById("wave-btn");
  if (waveBtn) {
    waveBtn.classList.toggle("on-cooldown", !ready);
    if (inputMode === "mobile") {
      waveBtn.textContent = ready ? "WAVE" : String(secondsLeft);
    } else {
      waveBtn.textContent = "WAVE";
    }
  }
}

function activateShockwave() {
  if (!isShockwaveReady()) return false;
  if (waitingToStart || gameOver || shipBreakActive) return false;

  shockwaveCooldownUntil = Date.now() + SHOCKWAVE_COOLDOWN;
  shockwaves.push({
    x: ship.x,
    y: ship.y,
    radius: ship.radius * 0.5,
    maxRadius: ship.radius * 5,
    speed: SHOCKWAVE_EXPAND_SPEED,
    hitSet: new WeakSet(),
  });
  playShockwaveSound();
  updateWaveUI();
  return true;
}

function updateShockwaves(dt) {
  const ts = timeScale(dt);
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const wave = shockwaves[i];
    wave.radius += wave.speed * ts;
    if (wave.radius >= wave.maxRadius) {
      shockwaves.splice(i, 1);
    }
  }
  checkShockwaveRockCollisions(ts);
}

function checkShockwaveRockCollisions(ts) {
  for (const wave of shockwaves) {
    for (let j = rocks.length - 1; j >= 0; j--) {
      const rock = rocks[j];
      if (wave.hitSet.has(rock)) continue;

      const dist = distance(wave.x, wave.y, rock.x, rock.y);
      const ringTouchesRock =
        wave.radius >= dist - rock.radius &&
        wave.radius <= dist + rock.radius + wave.speed * ts;

      if (ringTouchesRock) {
        wave.hitSet.add(rock);
        breakRock(rock, j);
      }
    }

    for (let k = ufos.length - 1; k >= 0; k--) {
      const ufo = ufos[k];
      if (wave.hitSet.has(ufo)) continue;
      const dist = distance(wave.x, wave.y, ufo.x, ufo.y);
      const ringTouchesUfo =
        wave.radius >= dist - ufo.radius &&
        wave.radius <= dist + ufo.radius + wave.speed * ts;
      if (ringTouchesUfo) {
        wave.hitSet.add(ufo);
        destroyUfo(k);
      }
    }
  }
}

function drawShockwaves() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  for (const wave of shockwaves) {
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// --- Input ---
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") e.preventDefault();

  if (waitingToStart) {
    if (e.code === "Space") beginGame();
    return;
  }

  if (gameOver) {
    if (e.code === "Space") goToTitleScreen();
    return;
  }

  if (e.code === "KeyE" && !e.repeat && inputMode === "desktop") {
    activateShockwave();
    return;
  }

  if (e.code === "KeyU" && !e.repeat) {
    spawnUfo(true);
    return;
  }

  keys[e.code] = true;
  if (e.code === "KeyW") startThrustSound();
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
  if (e.code === "KeyW" && !mouse.leftDown) stopThrustSound();
});

muteBtn.addEventListener("click", () => {
  if (!sfx.ready) {
    sfx.muted = !sfx.muted;
    muteBtn.textContent = sfx.muted ? "SFX OFF" : "SFX ON";
    return;
  }
  setMuted(!sfx.muted);
});
// --- Helpers ---
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function wrapPosition(obj) {
  if (obj.x < -obj.radius) obj.x = W + obj.radius;
  if (obj.x > W + obj.radius) obj.x = -obj.radius;
  if (obj.y < -obj.radius) obj.y = H + obj.radius;
  if (obj.y > H + obj.radius) obj.y = -obj.radius;
}

function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function shipSpeed() {
  return Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
}

function loadHighScores() {
  try {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (!saved) return [];
    const scores = JSON.parse(saved);
    return Array.isArray(scores) ? scores.slice(0, MAX_HIGH_SCORES) : [];
  } catch {
    return [];
  }
}

function saveHighScores() {
  localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(highScores));
}

function addHighScore(newScore) {
  highScores.push(newScore);
  highScores.sort((a, b) => b - a);
  highScores = highScores.slice(0, MAX_HIGH_SCORES);
  saveHighScores();
}

function triggerGameOver() {
  createShipDebris();
  shipBreakActive = true;
  shipBreakTimer = 0;
  stopAllUfoSounds();
  playGameOverSound();
  rocks = [];
  bullets = [];
  shockwaves = [];
  ufos = [];
  ufoSpawnTimer = 0;
  ufoNextSpawn = rand(UFO_SPAWN_MIN, UFO_SPAWN_MAX);
  screenShake = 12;
  addExplosionParticles(ship.x, ship.y, 18);
}

// --- Rock creation ---
function createRockShape(sides, radius) {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const r = radius * rand(0.7, 1.0);
    points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return points;
}

function randomVelocity(speedMin, speedMax) {
  const angle = rand(0, Math.PI * 2);
  const speed = rand(speedMin, speedMax);
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function createRock(x, y, size, vx, vy) {
  const config = ROCK_SIZES[size];
  let rockVx = vx;
  let rockVy = vy;

  if (rockVx === undefined || rockVy === undefined) {
    const vel = randomVelocity(0.2, 0.5);
    rockVx = vel.vx;
    rockVy = vel.vy;
  }

  return {
    x,
    y,
    size,
    radius: config.radius,
    score: config.score,
    points: createRockShape(config.sides, config.radius),
    vx: rockVx,
    vy: rockVy,
    spin: rand(-0.03, 0.03),
    angle: rand(0, Math.PI * 2),
  };
}

const ROCK_BOUNCE_DRAG = 0.01;

function rockSpeed(rock) {
  return Math.sqrt(rock.vx * rock.vx + rock.vy * rock.vy);
}

function reduceRockSpeed(rock, amount) {
  const speed = rockSpeed(rock);
  if (speed === 0) return;
  const newSpeed = Math.max(0, speed - amount);
  rock.vx = (rock.vx / speed) * newSpeed;
  rock.vy = (rock.vy / speed) * newSpeed;
}

function bounceTwoBodies(a, massA, b, massB, dragA, dragB) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist >= minDist) return false;

  if (dist === 0) {
    const angle = rand(0, Math.PI * 2);
    dx = Math.cos(angle);
    dy = Math.sin(angle);
    dist = 1;
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;

  if (velAlongNormal > 0) return true;

  const impulse = (2 * velAlongNormal) / (massA + massB);
  a.vx += impulse * massB * nx;
  a.vy += impulse * massB * ny;
  b.vx -= impulse * massA * nx;
  b.vy -= impulse * massA * ny;

  if (dragA) reduceRockSpeed(a, dragA);
  if (dragB) reduceRockSpeed(b, dragB);
  return true;
}

function resolveRockCollisions() {
  for (let i = 0; i < rocks.length; i++) {
    for (let j = i + 1; j < rocks.length; j++) {
      const a = rocks[i];
      const b = rocks[j];
      bounceTwoBodies(
        a, a.radius * a.radius,
        b, b.radius * b.radius,
        ROCK_BOUNCE_DRAG, ROCK_BOUNCE_DRAG
      );
    }
  }
}

function spawnRocks(count) {
  const margin = Math.max(20, Math.min(50, W * 0.08));
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(margin, W - margin);
      y = rand(margin, H - margin);
    } while (distance(x, y, ship.x, ship.y) < 150);
    rocks.push(createRock(x, y, "large"));
  }
}

function spawnInitialRocks(count) {
  rocks = [];
  rockCount = count;
  spawnRocks(count);
}

function spawnNextWave() {
  rockCount += 1;
  spawnRocks(rockCount);
}

// --- UFO enemy ---
function resetUfoSpawning() {
  stopAllUfoSounds();
  ufos = [];
  ufoSpawnTimer = 0;
  ufoNextSpawn = rand(UFO_SPAWN_MIN, UFO_SPAWN_MAX);
}

function spawnUfo(force = false) {
  if (!force && ufos.length > 0) return;
  if (force) {
    stopAllUfoSounds();
    ufos.length = 0;
  }

  const side = Math.floor(rand(0, 4));
  const pad = UFO_RADIUS + 20;
  let x, y, vx, vy;

  // Enter from a random edge and cruise straight toward the opposite side.
  if (side === 0) {
    x = rand(pad, W - pad);
    y = -pad;
    vx = 0;
    vy = UFO_CRUISE_SPEED;
  } else if (side === 1) {
    x = W + pad;
    y = rand(pad, H - pad);
    vx = -UFO_CRUISE_SPEED;
    vy = 0;
  } else if (side === 2) {
    x = rand(pad, W - pad);
    y = H + pad;
    vx = 0;
    vy = -UFO_CRUISE_SPEED;
  } else {
    x = -pad;
    y = rand(pad, H - pad);
    vx = UFO_CRUISE_SPEED;
    vy = 0;
  }

  ufos.push({
    x,
    y,
    vx,
    vy,
    cruiseVx: vx,
    cruiseVy: vy,
    radius: UFO_RADIUS,
    visualRadius: UFO_VISUAL_RADIUS,
    speed: UFO_SPEED,
    chasing: false,
    bobPhase: rand(0, Math.PI * 2),
  });

  playUfoAppearSfx();
  setUfoAudioState("patrol");
}

function updateUfoSpawning(dt) {
  if (ufos.length > 0) return;
  ufoSpawnTimer += dt;
  if (ufoSpawnTimer >= ufoNextSpawn) {
    ufoSpawnTimer = 0;
    ufoNextSpawn = rand(UFO_SPAWN_MIN, UFO_SPAWN_MAX);
    spawnUfo();
  }
}

function normalizeUfoSpeed(ufo) {
  const sp = Math.sqrt(ufo.vx * ufo.vx + ufo.vy * ufo.vy);
  if (sp === 0) return;
  ufo.vx = (ufo.vx / sp) * ufo.speed;
  ufo.vy = (ufo.vy / sp) * ufo.speed;
}

function isUfoOffScreen(ufo) {
  const pad = ufo.radius + 50;
  return ufo.x < -pad || ufo.x > W + pad || ufo.y < -pad || ufo.y > H + pad;
}

function resolveUfoRockCollisions() {
  const ufoMass = UFO_RADIUS * UFO_RADIUS * 4;

  for (const ufo of ufos) {
    for (const rock of rocks) {
      const hit = bounceTwoBodies(
        rock, rock.radius * rock.radius,
        ufo, ufoMass,
        ROCK_BOUNCE_DRAG, 0
      );
      if (hit && ufo.chasing) {
        normalizeUfoSpeed(ufo);
      }
    }
  }
}

function updateUfos(dt) {
  const ts = timeScale(dt);

  for (let i = ufos.length - 1; i >= 0; i--) {
    const ufo = ufos[i];
    const distToShip = distance(ufo.x, ufo.y, ship.x, ship.y);

    // Latch onto the hero once they enter detection range.
    if (distToShip < UFO_CHASE_RANGE) {
      beginUfoChase(ufo);
    }

    if (ufo.chasing) {
      const angle = Math.atan2(ship.y - ufo.y, ship.x - ufo.x);
      ufo.vx = Math.cos(angle) * ufo.speed;
      ufo.vy = Math.sin(angle) * ufo.speed;
    } else {
      // Far from the hero: keep cruising across the play area.
      ufo.vx = ufo.cruiseVx;
      ufo.vy = ufo.cruiseVy;
    }

    ufo.x += ufo.vx * ts;
    ufo.y += ufo.vy * ts;

    if (isUfoOffScreen(ufo)) {
      ufos.splice(i, 1);
      onUfoRemoved();
    }
  }

  resolveUfoRockCollisions();
}

function destroyUfo(index) {
  const ufo = ufos[index];
  score += UFO_SCORE;
  scoreEl.textContent = "Score: " + score;
  addExplosionParticles(ufo.x, ufo.y, 22);
  playUfoDestroyedSound();
  screenShake = 10;
  ufos.splice(index, 1);
  onUfoRemoved();
}

function getUfoDrawScale(ufo) {
  if (ufo.visualRadius != null) return ufo.visualRadius;
  if (ufo.size != null) return ufo.size;
  if (ufo.radius != null) return ufo.radius;
  return 32;
}

function drawUFO(renderCtx, ufo) {
  const s = ufo.visualRadius || Math.max(getUfoDrawScale(ufo), 32);

  renderCtx.save();
  renderCtx.translate(ufo.x, ufo.y);

  const bob = Math.sin(performance.now() * 0.004 + (ufo.bobPhase || 0)) * 1.2;
  renderCtx.translate(0, bob);

  renderCtx.strokeStyle = "#ffffff";
  renderCtx.lineWidth = 2;
  renderCtx.lineCap = "round";
  renderCtx.lineJoin = "round";

  const rx = s;
  const ry = s * 0.32;
  const domeR = rx * 0.44;
  const domeBaseY = -ry * 0.1;

  // Main saucer body — wide ellipse
  renderCtx.beginPath();
  renderCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  renderCtx.stroke();

  // Lower hull — weighted underside arc
  renderCtx.beginPath();
  renderCtx.moveTo(-rx * 0.86, ry * 0.4);
  renderCtx.quadraticCurveTo(0, ry * 1.3, rx * 0.86, ry * 0.4);
  renderCtx.stroke();

  // Cockpit dome — centered semi-circle
  renderCtx.beginPath();
  renderCtx.arc(0, domeBaseY, domeR, Math.PI, 0);
  renderCtx.stroke();

  // Antenna mast and ball tip
  const domeTopY = domeBaseY - domeR;
  const antennaTop = domeTopY - s * 0.22;
  renderCtx.beginPath();
  renderCtx.moveTo(0, domeTopY);
  renderCtx.lineTo(0, antennaTop);
  renderCtx.stroke();
  renderCtx.beginPath();
  renderCtx.arc(0, antennaTop - s * 0.04, s * 0.045, 0, Math.PI * 2);
  renderCtx.stroke();

  // Five portlights along a slight midsection curve
  [-0.44, -0.22, 0, 0.22, 0.44].forEach((off, i) => {
    const px = off * rx * 0.94;
    const py = -ry * 0.06 + Math.pow(Math.abs(off), 1.6) * ry * 0.1;
    const isCenter = i === 2;
    renderCtx.beginPath();
    renderCtx.ellipse(
      px,
      py,
      isCenter ? s * 0.055 : s * 0.065,
      isCenter ? s * 0.055 : s * 0.038,
      0,
      0,
      Math.PI * 2
    );
    renderCtx.stroke();
  });

  renderCtx.restore();
}

function drawUfos() {
  for (const ufo of ufos) {
    drawUFO(ctx, ufo);
  }
}

// --- Particles ---
function addSmokeParticle() {
  const speed = shipSpeed();
  const behindAngle = ship.angle + Math.PI + rand(-0.4, 0.4);
  const offsetDist = ship.radius + rand(2, 8);

  particles.push({
    x: ship.x + Math.cos(behindAngle) * offsetDist,
    y: ship.y + Math.sin(behindAngle) * offsetDist,
    vx: Math.cos(behindAngle) * rand(0.2, 0.8) - ship.vx * 0.1,
    vy: Math.sin(behindAngle) * rand(0.2, 0.8) - ship.vy * 0.1,
    life: 1,
    decay: rand(0.02, 0.04),
    size: rand(1, 2.5),
    type: "smoke",
  });
}

function addExplosionParticles(x, y, count) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1, 5);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: rand(0.03, 0.06),
      size: rand(1.5, 3.5),
      type: "explosion",
    });
  }
}

function updateParticles(dt) {
  const ts = timeScale(dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * ts;
    p.y += p.vy * ts;
    p.life -= p.decay * ts;
    if (p.type === "smoke") {
      const drag = Math.pow(0.95, ts);
      p.vx *= drag;
      p.vy *= drag;
    }
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Bullets ---
let lastShot = 0;
const SHOT_COOLDOWN = 200;

function shoot() {
  const now = Date.now();
  if (now - lastShot < SHOT_COOLDOWN) return;
  lastShot = now;

  const noseX = ship.x + Math.cos(ship.angle) * (ship.radius + 6);
  const noseY = ship.y + Math.sin(ship.angle) * (ship.radius + 6);

  bullets.push({
    x: noseX,
    y: noseY,
    vx: Math.cos(ship.angle) * 10 + ship.vx * 0.5,
    vy: Math.sin(ship.angle) * 10 + ship.vy * 0.5,
    life: 80,
  });
  playLaserSound();
}

function updateBullets(dt) {
  const ts = timeScale(dt);
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * ts;
    b.y += b.vy * ts;
    b.life -= ts;
    if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
      bullets.splice(i, 1);
    }
  }
}

function drawBullets() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (const b of bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.5, b.y - b.vy * 0.5);
    ctx.stroke();
  }
}

// --- Ship ---
function updateShip(dt) {
  updateJoystickInput();
  const ts = timeScale(dt);

  let thrusting = false;

  if (inputMode === "mobile") {
    thrusting = updateMobileShip(dt);
  } else if (mouse.tracking) {
    thrusting = updateDesktopMouseShip(dt);

    if (keys.KeyS) {
      ship.vx -= Math.cos(ship.angle) * ship.reversePower * ts;
      ship.vy -= Math.sin(ship.angle) * ship.reversePower * ts;
      thrusting = true;
    }

    if (keys.KeyW) {
      ship.vx += Math.cos(ship.angle) * ship.thrustPower * ts;
      ship.vy += Math.sin(ship.angle) * ship.thrustPower * ts;
      thrusting = true;
      startThrustSound();
    }
  } else {
    if (keys.KeyA) ship.angle -= ship.rotateSpeed * ts;
    if (keys.KeyD) ship.angle += ship.rotateSpeed * ts;

    if (keys.KeyW) {
      ship.vx += Math.cos(ship.angle) * ship.thrustPower * ts;
      ship.vy += Math.sin(ship.angle) * ship.thrustPower * ts;
      thrusting = true;
    }

    if (keys.KeyS) {
      ship.vx -= Math.cos(ship.angle) * ship.reversePower * ts;
      ship.vy -= Math.sin(ship.angle) * ship.reversePower * ts;
      thrusting = true;
    }
  }

  // Light friction keeps drift manageable
  const friction = Math.pow(ship.friction, ts);
  ship.vx *= friction;
  ship.vy *= friction;

  // Cap max speed
  const speed = shipSpeed();
  if (speed > ship.maxSpeed) {
    ship.vx = (ship.vx / speed) * ship.maxSpeed;
    ship.vy = (ship.vy / speed) * ship.maxSpeed;
  }

  ship.x += ship.vx * ts;
  ship.y += ship.vy * ts;
  wrapPosition(ship);

  // Smoke trail — intensity scales with thrust strength and speed
  if (thrusting) {
    const thrustIntensity = inputMode === "mobile"
      ? joystick.power
      : (mouse.tracking ? mouse.power : 1);
    const speedRatio = speed / ship.maxSpeed;
    const spawnChance = (0.3 + speedRatio * 0.7) * thrustIntensity * ts;
    const spawnCount = speedRatio > 0.5 ? 2 : 1;
    if (Math.random() < spawnChance) {
      for (let i = 0; i < spawnCount; i++) addSmokeParticle();
    }
  }

  if (inputMode === "desktop" && (keys.Space || mouse.leftDown)) shoot();
  if (inputMode === "mobile" && mobileInput.fire) shoot();
}

function getShipVertices() {
  const tipX = ship.x + Math.cos(ship.angle) * ship.radius;
  const tipY = ship.y + Math.sin(ship.angle) * ship.radius;
  const leftX = ship.x + Math.cos(ship.angle + 2.5) * ship.radius * 0.7;
  const leftY = ship.y + Math.sin(ship.angle + 2.5) * ship.radius * 0.7;
  const rightX = ship.x + Math.cos(ship.angle - 2.5) * ship.radius * 0.7;
  const rightY = ship.y + Math.sin(ship.angle - 2.5) * ship.radius * 0.7;
  return [
    { x: tipX, y: tipY },
    { x: leftX, y: leftY },
    { x: rightX, y: rightY },
  ];
}

function createShipDebris() {
  const [tip, left, right] = getShipVertices();
  const edges = [
    [tip, left],
    [left, right],
    [right, tip],
  ];

  shipDebris = edges.map(([a, b]) => {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const outwardAngle = Math.atan2(my - ship.y, mx - ship.x);
    const speed = rand(1.5, 3.5);
    return {
      x: mx,
      y: my,
      ax: a.x - mx,
      ay: a.y - my,
      bx: b.x - mx,
      by: b.y - my,
      angle: ship.angle,
      spin: rand(-0.1, 0.1),
      vx: Math.cos(outwardAngle) * speed + ship.vx * 0.4,
      vy: Math.sin(outwardAngle) * speed + ship.vy * 0.4,
      life: 1,
      decay: 0.02,
    };
  });
}

function updateShipDebris(dt) {
  const ts = timeScale(dt);
  const drag = Math.pow(0.98, ts);
  for (const piece of shipDebris) {
    piece.x += piece.vx * ts;
    piece.y += piece.vy * ts;
    piece.angle += piece.spin * ts;
    piece.vx *= drag;
    piece.vy *= drag;
    piece.life -= piece.decay * ts;
  }
  shipDebris = shipDebris.filter((piece) => piece.life > 0);
}

function drawShipDebris() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (const piece of shipDebris) {
    ctx.save();
    ctx.globalAlpha = piece.life;
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.angle);
    ctx.beginPath();
    ctx.moveTo(piece.ax, piece.ay);
    ctx.lineTo(piece.bx, piece.by);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawShip() {
  const [tip, left, right] = getShipVertices();

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.stroke();
}

// --- Rocks ---
function updateRocks(dt) {
  const ts = timeScale(dt);
  for (const rock of rocks) {
    rock.x += rock.vx * ts;
    rock.y += rock.vy * ts;
    rock.angle += rock.spin * ts;
    wrapPosition(rock);
  }
  resolveRockCollisions();
}

function drawRocks() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (const rock of rocks) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);
    ctx.beginPath();
    const pts = rock.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function breakRock(rock, index) {
  score += rock.score;
  scoreEl.textContent = "Score: " + score;

  const x = rock.x;
  const y = rock.y;

  playRockHitSound();
  playExplosionSound(rock.size);

  if (rock.size === "large") {
    screenShake = 12;
    addExplosionParticles(x, y, 24);
    const pieceCount = Math.floor(rand(2, 4));
    for (let i = 0; i < pieceCount; i++) {
      const vel = randomVelocity(0, 1.0);
      rocks.push(createRock(
        x, y, "medium",
        vel.vx,
        vel.vy
      ));
    }
  } else if (rock.size === "medium") {
    addExplosionParticles(x, y, 14);
    for (let i = 0; i < 2; i++) {
      const vel = randomVelocity(0.8, 2.0);
      rocks.push(createRock(
        x, y, "small",
        vel.vx,
        vel.vy
      ));
    }
  } else {
    addExplosionParticles(x, y, 6);
  }

  rocks.splice(index, 1);
}

function checkCollisions() {
  // Bullet vs rock
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    let hit = false;

    for (let j = rocks.length - 1; j >= 0; j--) {
      const rock = rocks[j];
      if (distance(b.x, b.y, rock.x, rock.y) < rock.radius) {
        bullets.splice(i, 1);
        breakRock(rock, j);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    for (let k = ufos.length - 1; k >= 0; k--) {
      const ufo = ufos[k];
      if (distance(b.x, b.y, ufo.x, ufo.y) < ufo.radius) {
        bullets.splice(i, 1);
        destroyUfo(k);
        break;
      }
    }
  }

  // Ship vs rock / UFO
  if (!gameOver && !shipBreakActive) {
    for (const rock of rocks) {
      if (distance(ship.x, ship.y, rock.x, rock.y) < rock.radius + ship.radius - 4) {
        triggerGameOver();
        return;
      }
    }

    for (const ufo of ufos) {
      if (distance(ship.x, ship.y, ufo.x, ufo.y) < ufo.radius + ship.radius - 4) {
        triggerGameOver();
        return;
      }
    }
  }
}

// --- Drawing ---
function drawGameOver() {
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";

  const mobile = inputMode === "mobile";
  const titleSize = mobile ? Math.max(16, H * 0.055) : 36;
  const scoreSize = mobile ? Math.max(11, H * 0.032) : 22;
  const headingSize = mobile ? Math.max(10, H * 0.028) : 20;
  const entrySize = mobile ? Math.max(9, H * 0.025) : 18;
  const hintSize = mobile ? Math.max(9, H * 0.024) : 18;
  const lineGap = mobile ? Math.max(14, H * 0.048) : 30;

  let y = mobile ? H * 0.1 : 150;

  ctx.font = `${titleSize}px Courier New`;
  ctx.fillText("GAME OVER", W / 2, y);

  y += mobile ? H * 0.08 : 45;
  ctx.font = `${scoreSize}px Courier New`;
  ctx.fillText("Score: " + score, W / 2, y);

  y += mobile ? H * 0.07 : 50;
  ctx.font = `${headingSize}px Courier New`;
  ctx.fillText("HIGH SCORES", W / 2, y);

  y += mobile ? H * 0.06 : 35;
  ctx.font = `${entrySize}px Courier New`;
  for (let i = 0; i < MAX_HIGH_SCORES; i++) {
    const rank = i + 1;
    const value = highScores[i] !== undefined ? highScores[i] : "---";
    const isCurrentScore = highScores[i] === score && score > 0;
    ctx.fillText(rank + ".  " + value + (isCurrentScore ? "  *" : ""), W / 2, y);
    y += lineGap;
  }

  ctx.font = `${hintSize}px Courier New`;
  const restartHint = mobile
    ? "Tap screen to return to title"
    : "Press SPACE to return to title";
  ctx.fillText(restartHint, W / 2, H - (mobile ? H * 0.06 : 60));
  ctx.textAlign = "left";
}

function updateScreenShake(dt) {
  if (screenShake <= 0) return;
  const ts = timeScale(dt);
  screenShake *= Math.pow(0.85, ts);
  if (screenShake < 0.5) screenShake = 0;
}

function draw() {
  ctx.save();

  // Screen shake
  if (screenShake > 0) {
    const shakeX = rand(-screenShake, screenShake);
    const shakeY = rand(-screenShake, screenShake);
    ctx.translate(shakeX, shakeY);
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(-10, -10, W + 20, H + 20);

  if (shipBreakActive) {
    drawParticles();
    drawShipDebris();
  } else if (!gameOver) {
    drawRocks();
    drawUfos();
    drawBullets();
    drawParticles();
    drawShockwaves();
    drawShip();
  } else {
    drawGameOver();
  }

  ctx.restore();
}

// --- Game loop ---
function update(currentTime) {
  const dt = Math.min((currentTime - lastFrameTime) / 1000, MAX_DELTA_TIME);
  lastFrameTime = currentTime;

  if (!waitingToStart && !gameOver && !shipBreakActive) {
    updateShip(dt);
    updateRocks(dt);
    updateUfos(dt);
    updateUfoSpawning(dt);
    updateBullets(dt);
    updateShockwaves(dt);
    checkCollisions();
    if (rocks.length === 0) spawnNextWave();
  }

  if (shipBreakActive) {
    shipBreakTimer += dt;
    updateShipDebris(dt);
    if (shipBreakTimer >= SHIP_BREAK_DURATION) {
      shipBreakActive = false;
      gameOver = true;
      addHighScore(score);
      shipDebris = [];
      particles = [];
      shockwaves = [];
      screenShake = 0;
    }
  }

  updateScreenShake(dt);
  updateWaveUI();
  updateParticles(dt);
  draw();
  requestAnimationFrame(update);
}

function resetGame() {
  stopThrustSound();
  score = 0;
  gameOver = false;
  shipBreakActive = false;
  shipBreakTimer = 0;
  shipDebris = [];
  shockwaves = [];
  shockwaveCooldownUntil = 0;
  screenShake = 0;
  particles = [];
  bullets = [];
  ship.x = W / 2;
  ship.y = H / 2;
  ship.angle = -Math.PI / 2;
  ship.vx = 0;
  ship.vy = 0;
  scoreEl.textContent = "Score: 0";
  for (const key in keys) keys[key] = false;
  resetJoystick();
  resetMouse();
  resetUfoSpawning();
  spawnInitialRocks(4);
  updateWaveUI();
}

// --- Start ---
resizeGame();
setupMobileControls();
setupDesktopMouseControls();
window.addEventListener("resize", resizeGame);
spawnInitialRocks(4);
resetUfoSpawning();
lastFrameTime = performance.now();
requestAnimationFrame(update);
