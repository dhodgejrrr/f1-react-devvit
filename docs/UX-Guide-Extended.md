# UI/UX Guide v2: F1 Start Challenge

**Authentic Pole Position Aesthetic for Modern Web**

---

## 1. Design Philosophy: Arcade Minimalism

### 1.1 Core Principle

**"Every pixel serves the gameplay."**

This is not a modern web app with arcade styling—this is an authentic 1982 arcade experience translated to modern browsers. We prioritize:

- **Instant readability** over decorative elements
- **High contrast** over subtle gradients
- **Immediate feedback** over smooth transitions
- **Functional layout** over creative experimentation

### 1.2 Historical Context

Namco's _Pole Position_ (1982) was designed for dimly-lit arcade environments with CRT displays. Colors had to pop, text had to be legible from 3 feet away, and every element needed to withstand the visual noise of a busy arcade. We honor these constraints even though our canvas is a smartphone screen.

---

## 2. Typography System

### 2.1 Font Family

**Primary Font:** `"Press Start 2P", monospace`

**Fallback Stack:**

```css
font-family: 'Press Start 2P', 'Courier New', Courier, monospace;
```

**Why This Font:**

- Authentic 8-bit bitmap aesthetic
- Excellent readability at small sizes
- Web-safe via Google Fonts
- Zero licensing issues

**Loading Strategy:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
  rel="stylesheet"
/>
```

### 2.2 Type Scale

```css
:root {
  /* Base size: 16px on desktop, 14px on mobile */
  --font-size-xs: 0.75rem; /* 12px - Small labels */
  --font-size-sm: 0.875rem; /* 14px - Secondary text */
  --font-size-base: 1rem; /* 16px - Body text */
  --font-size-lg: 1.25rem; /* 20px - Section headers */
  --font-size-xl: 1.5rem; /* 24px - Screen titles */
  --font-size-2xl: 2rem; /* 32px - Important numbers */
  --font-size-3xl: 3rem; /* 48px - Hero text (reaction time) */
}
```

### 2.3 Typography Rules

**MANDATORY:**

- ✅ ALL TEXT MUST BE UPPERCASE
- ✅ No font smoothing or anti-aliasing
- ✅ Letter spacing: 0.05em minimum
- ✅ Line height: 1.4-1.6 for readability

**CSS Implementation:**

```css
body {
  font-family: 'Press Start 2P', monospace;
  text-transform: uppercase;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  font-smooth: never;
  letter-spacing: 0.05em;
  line-height: 1.5;
}
```

**FORBIDDEN:**

- ❌ Mixed case text
- ❌ Italic or oblique styles
- ❌ Multiple font families
- ❌ Text shadows (except light glow effects)

---

## 3. Color System

### 3.1 Core Palette

```css
:root {
  /* Primary Colors */
  --black: #000000; /* Background */
  --white: #ffffff; /* Primary text */
  --yellow: #ffff00; /* Highlights, success */
  --red: #ff0000; /* Danger, lights */

  /* Secondary Colors */
  --gray-dark: #202020; /* Light off state */
  --gray-mid: #808080; /* Borders, disabled */
  --gray-light: #c0c0c0; /* Secondary text */

  /* Accent Colors */
  --gold: #ffd700; /* Perfect rating */
  --cyan: #00ffff; /* Info (sparingly) */
  --green: #00ff00; /* Brief success flash only */
  --magenta: #ff00ff; /* Warnings/flags */
}
```

### 3.2 Color Usage Guidelines

#### Background Colors

- **Primary background:** Always `#000000` (pure black)
- **Never use:** Dark grays, gradients, textures
- **Exception:** Semi-transparent overlays for modals (`rgba(0, 0, 0, 0.9)`)

#### Text Colors

- **Default text:** `#FFFFFF` (white)
- **Emphasis:** `#FFFF00` (yellow)
- **De-emphasis:** `#808080` (gray)
- **Error state:** `#FF0000` (red)

**Example Hierarchy:**

```css
.title {
  color: var(--yellow); /* Important */
  font-size: var(--font-size-xl);
}

.body-text {
  color: var(--white); /* Standard */
  font-size: var(--font-size-base);
}

.subtitle {
  color: var(--gray-light); /* Less important */
  font-size: var(--font-size-sm);
}
```

#### Interactive Elements

- **Default state:** White border, transparent background
- **Hover state:** White background with 10% opacity
- **Active state:** White background with 20% opacity
- **Disabled state:** Gray border, 50% opacity

**CRITICAL: No color-coded buttons.** Text and position indicate function, not color.

---

## 4. Component Library

### 4.1 Starting Lights (Primary Component)

#### Structure

```html
<div class="lights-container">
  <div class="light" data-index="0"></div>
  <div class="light" data-index="1"></div>
  <div class="light" data-index="2"></div>
  <div class="light" data-index="3"></div>
  <div class="light" data-index="4"></div>
</div>
```

#### Styling

```css
.lights-container {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.light {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--gray-dark);
  border: 3px solid #404040;
  position: relative;
  transition:
    background-color 0.05s ease-out,
    box-shadow 0.05s ease-out,
    transform 0.05s ease-out;
  will-change: background-color, box-shadow, transform;
}

.light.on {
  background: var(--red);
  border-color: #ff3333;
  box-shadow:
    0 0 20px rgba(255, 0, 0, 0.8),
    0 0 40px rgba(255, 0, 0, 0.5),
    0 0 60px rgba(255, 0, 0, 0.3),
    inset 0 0 15px rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .lights-container {
    gap: 12px;
    padding: 20px 10px;
  }

  .light {
    width: 50px;
    height: 50px;
    border-width: 2px;
  }
}
```

#### Animation Sequence

```javascript
// CORRECT: Accumulating lights
async function startLightSequence() {
  for (let i = 0; i < 5; i++) {
    await sleep(900); // 900ms interval
    lights[i].classList.add('on');
    playBeep(BEEP_FREQUENCIES[i]);
  }

  // Random delay
  const delay = 500 + Math.random() * 2000;
  await sleep(delay);

  // All off simultaneously
  lights.forEach((light) => light.classList.remove('on'));
  return performance.now(); // Return exact timestamp
}
```

---

### 4.2 Text Button

#### Structure

```html
<button class="text-button primary">
  <span class="button-label">Press Start</span>
</button>
```

#### Styling

```css
.text-button {
  background: transparent;
  border: 2px solid var(--white);
  color: var(--white);
  padding: 12px 24px;
  font-size: var(--font-size-base);
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition:
    background-color 0.1s,
    transform 0.05s;
  position: relative;
}

.text-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.text-button:active {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(2px);
}

.text-button:disabled {
  border-color: var(--gray-mid);
  color: var(--gray-mid);
  cursor: not-allowed;
  opacity: 0.5;
}

/* Primary variant - larger, more prominent */
.text-button.primary {
  border-width: 3px;
  padding: 16px 32px;
  font-size: var(--font-size-lg);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .text-button {
    padding: 10px 20px;
    font-size: var(--font-size-sm);
  }

  .text-button.primary {
    padding: 14px 28px;
    font-size: var(--font-size-base);
  }
}
```

#### Flashing Animation (for primary CTA)

```css
@keyframes buttonFlash {
  0%,
  49% {
    border-color: var(--white);
    color: var(--white);
  }
  50%,
  100% {
    border-color: var(--yellow);
    color: var(--yellow);
  }
}

.text-button.flashing {
  animation: buttonFlash 1s steps(1) infinite;
}
```

---

### 4.3 HUD Text Display

#### Structure

```html
<div class="hud-bar">
  <div class="hud-item">
    <span class="hud-label">Best:</span>
    <span class="hud-value">0.186s</span>
  </div>
  <div class="hud-item">
    <span class="hud-label">Last:</span>
    <span class="hud-value">0.215s</span>
  </div>
</div>
```

#### Styling

```css
.hud-bar {
  display: flex;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--black);
  border-bottom: 2px solid var(--gray-mid);
}

.hud-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.hud-label {
  color: var(--gray-light);
  font-size: var(--font-size-xs);
}

.hud-value {
  color: var(--white);
  font-size: var(--font-size-sm);
}

.hud-value.highlight {
  color: var(--yellow);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .hud-bar {
    padding: 12px 16px;
  }

  .hud-item {
    gap: 6px;
  }
}
```

---

### 4.4 Result Display

#### Large Time Display

```html
<div class="result-time">
  <div class="time-value">0.186</div>
  <div class="time-unit">sec</div>
</div>
```

```css
.result-time {
  text-align: center;
  padding: 40px 20px;
}

.time-value {
  color: var(--yellow);
  font-size: var(--font-size-3xl);
  line-height: 1;
  margin-bottom: 8px;
  text-shadow: 0 0 20px rgba(255, 255, 0, 0.5);
}

.time-unit {
  color: var(--white);
  font-size: var(--font-size-base);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .result-time {
    padding: 30px 15px;
  }

  .time-value {
    font-size: var(--font-size-2xl);
  }

  .time-unit {
    font-size: var(--font-size-sm);
  }
}
```

#### Rating Display

```html
<div class="rating-display rating-perfect">★★★ Perfect! ★★★</div>
```

```css
.rating-display {
  text-align: center;
  padding: 16px;
  font-size: var(--font-size-lg);
  margin: 20px 0;
}

.rating-perfect {
  color: var(--gold);
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
}

.rating-excellent {
  color: var(--yellow);
}

.rating-good {
  color: var(--white);
}

.rating-slow {
  color: var(--gray-light);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .rating-display {
    font-size: var(--font-size-base);
    padding: 12px;
  }
}
```

---

### 4.5 Leaderboard Table

#### Structure

```html
<div class="leaderboard">
  <div class="leaderboard-row rank-1">
    <span class="rank">1</span>
    <span class="username">u/SpeedRacer</span>
    <span class="time">0.142 sec</span>
  </div>
  <div class="leaderboard-row rank-user">
    <span class="rank">12</span>
    <span class="username">u/You</span>
    <span class="time">0.186 sec</span>
  </div>
  <!-- more rows -->
</div>
```

#### Styling

```css
.leaderboard {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 50px 1fr 100px;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--gray-dark);
  align-items: center;
  transition: background-color 0.2s;
}

.leaderboard-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.rank {
  color: var(--gray-light);
  font-size: var(--font-size-sm);
  text-align: right;
}

.username {
  color: var(--white);
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  color: var(--white);
  font-size: var(--font-size-sm);
  text-align: right;
}

/* Special ranks */
.rank-1 .rank,
.rank-1 .username,
.rank-1 .time {
  color: var(--gold);
}

.rank-2 .rank,
.rank-2 .username,
.rank-2 .time {
  color: var(--gray-light);
}

.rank-3 .rank,
.rank-3 .username,
.rank-3 .time {
  color: #cd7f32; /* Bronze */
}

.rank-user {
  background: rgba(255, 255, 0, 0.1);
  border: 1px solid var(--yellow);
}

.rank-user .rank,
.rank-user .username,
.rank-user .time {
  color: var(--yellow);
}

/* Flagged scores */
.rank-flagged .time::after {
  content: ' ⚠';
  color: var(--magenta);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .leaderboard {
    padding: 15px 10px;
  }

  .leaderboard-row {
    grid-template-columns: 40px 1fr 80px;
    gap: 8px;
    padding: 10px 6px;
  }

  .rank,
  .username,
  .time {
    font-size: var(--font-size-xs);
  }
}
```

#### Layout Structure

```
┌─────────────────────────────────┐
│                                 │  20% - Spacer
│     F1 START CHALLENGE          │  Title area
│     TEST YOUR REFLEXES          │  Subtitle
│                                 │
│      > PRESS START <            │  30% - Primary CTA (flashing)
│                                 │
│   LEADERBOARD  |  HOW TO PLAY   │  20% - Secondary actions
│                                 │
│                                 │  30% - Spacer
└─────────────────────────────────┘
```

#### HTML Structure

```html
<div class="screen splash-screen">
  <div class="splash-content">
    <h1 class="game-title">F1 Start Challenge</h1>
    <p class="game-subtitle">Test Your Reflexes</p>

    <button class="text-button primary flashing" onclick="startGame()">
      <span class="button-cursor">&gt;</span> Press Start <span class="button-cursor">&lt;</span>
    </button>

    <div class="secondary-nav">
      <button class="text-button" onclick="showLeaderboard()">Leaderboard</button>
      <span class="nav-separator">|</span>
      <button class="text-button" onclick="showInstructions()">How To Play</button>
    </div>
  </div>

  <!-- Optional: Show after first game -->
  <div class="personal-best" style="display: none;">
    <span class="best-label">Your Best:</span>
    <span class="best-value">0.186s</span>
  </div>
</div>
```

#### CSS

```css
.splash-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--black);
}

.splash-content {
  text-align: center;
  max-width: 600px;
}

.game-title {
  color: var(--yellow);
  font-size: var(--font-size-2xl);
  margin-bottom: 16px;
  line-height: 1.2;
  text-shadow: 0 0 20px rgba(255, 255, 0, 0.3);
}

.game-subtitle {
  color: var(--white);
  font-size: var(--font-size-base);
  margin-bottom: 60px;
  opacity: 0.8;
}

.button-cursor {
  color: var(--yellow);
}

.secondary-nav {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
}

.nav-separator {
  color: var(--gray-mid);
  font-size: var(--font-size-base);
}

.personal-best {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  font-size: var(--font-size-sm);
}

.best-label {
  color: var(--gray-light);
}

.best-value {
  color: var(--yellow);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .game-title {
    font-size: var(--font-size-xl);
  }

  .game-subtitle {
    font-size: var(--font-size-sm);
    margin-bottom: 40px;
  }

  .secondary-nav {
    flex-direction: column;
    gap: 12px;
    margin-top: 30px;
  }

  .nav-separator {
    display: none;
  }
}
```

#### Challenge Mode Variant

```html
<!-- When accessed via challenge link -->
<div class="challenge-banner">
  <div class="challenge-icon">⚡</div>
  <div class="challenge-text"><span class="challenger">u/PlayerName</span> Challenges You!</div>
</div>

<button class="text-button primary flashing" onclick="acceptChallenge()">Accept Challenge</button>
```

```css
.challenge-banner {
  background: rgba(255, 0, 0, 0.1);
  border: 2px solid var(--red);
  padding: 20px;
  margin-bottom: 40px;
  text-align: center;
}

.challenge-icon {
  font-size: var(--font-size-2xl);
  margin-bottom: 12px;
}

.challenge-text {
  font-size: var(--font-size-base);
  color: var(--white);
}

.challenger {
  color: var(--yellow);
  font-weight: bold;
}
```

---

### 5.2 Game Canvas

#### Layout Structure

```
┌─────────────────────────────────┐
│ BEST: 0.186s    LAST: 0.215s    │  10% - HUD bar
│                                 │
│                                 │  20% - Spacer
│     [●][●][●][○][○]            │  40% - Lights (focal point)
│                                 │
│         READY...                │  10% - Status text
│                                 │  20% - Spacer
└─────────────────────────────────┘
```

#### HTML Structure

```html
<div class="screen game-screen">
  <div class="hud-bar">
    <div class="hud-item">
      <span class="hud-label">Best:</span>
      <span class="hud-value highlight">0.186s</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">Last:</span>
      <span class="hud-value">0.215s</span>
    </div>
  </div>

  <div class="game-canvas">
    <div class="lights-container">
      <div class="light" data-index="0"></div>
      <div class="light" data-index="1"></div>
      <div class="light" data-index="2"></div>
      <div class="light" data-index="3"></div>
      <div class="light" data-index="4"></div>
    </div>

    <div class="status-text">Ready...</div>

    <!-- Challenge mode only -->
    <div class="ghost-indicator" style="display: none;">
      <div class="ghost-label">Opponent</div>
      <div class="ghost-marker"></div>
    </div>
  </div>
</div>
```

#### CSS

```css
.game-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--black);
}

.game-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 40px 20px;
}

.status-text {
  margin-top: 40px;
  font-size: var(--font-size-lg);
  color: var(--white);
  text-align: center;
  min-height: 32px; /* Prevent layout shift */
}

.status-text.hidden {
  opacity: 0;
}

/* Ghost indicator for challenges */
.ghost-indicator {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ghost-label {
  font-size: var(--font-size-xs);
  color: var(--gray-light);
}

.ghost-marker {
  width: 40px;
  height: 4px;
  background: var(--yellow);
  opacity: 0;
  transition: opacity 0.2s;
}

.ghost-marker.visible {
  opacity: 0.6;
  animation: ghostPulse 0.5s ease-out;
}

@keyframes ghostPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .game-canvas {
    padding: 20px 10px;
  }

  .status-text {
    margin-top: 30px;
    font-size: var(--font-size-base);
  }
}
```

---

### 5.3 Results Screen

#### Layout Structure

```
┌─────────────────────────────────┐
│                                 │  15% - Spacer
│         0.186 SEC               │  20% - Hero time
│                                 │
│   ⚡ FASTER THAN HAMILTON       │  15% - Context
│   📊 TOP 12% OF COMMUNITY       │
│                                 │
│      > PLAY AGAIN <             │  15% - Primary action
│                                 │
│    SUBMIT TO LEADERBOARD        │  15% - Secondary actions
│    CHALLENGE A FRIEND           │
│                                 │
│                                 │  20% - Spacer
└─────────────────────────────────┘
```

#### HTML Structure

```html
<div class="screen results-screen">
  <div class="results-content">
    <!-- Time Display -->
    <div class="result-time">
      <div class="time-value">0.186</div>
      <div class="time-unit">sec</div>
    </div>

    <!-- Rating -->
    <div class="rating-display rating-excellent">⚡ Excellent! ⚡</div>

    <!-- Comparisons -->
    <div class="comparison-section">
      <div class="comparison-item driver-comparison">
        <span class="comparison-icon">🏎️</span>
        <span class="comparison-text">Faster than Hamilton</span>
      </div>
      <div class="comparison-item percentile-comparison">
        <span class="comparison-icon">📊</span>
        <span class="comparison-text">Top 12% of Community</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="results-actions">
      <button class="text-button primary flashing" onclick="playAgain()">
        <span class="button-cursor">&gt;</span> Play Again <span class="button-cursor">&lt;</span>
      </button>

      <button class="text-button" onclick="submitScore()">Submit to Leaderboard</button>

      <button class="text-button" onclick="createChallenge()">Challenge a Friend</button>
    </div>
  </div>
</div>
```

#### CSS

```css
.results-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--black);
}

.results-content {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.comparison-section {
  margin: 30px 0 50px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: var(--font-size-base);
}

.comparison-icon {
  font-size: var(--font-size-lg);
}

.driver-comparison .comparison-text {
  color: var(--yellow);
}

.percentile-comparison .comparison-text {
  color: var(--white);
}

.results-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .comparison-section {
    margin: 20px 0 40px;
    gap: 12px;
  }

  .comparison-item {
    font-size: var(--font-size-sm);
  }

  .results-actions {
    gap: 12px;
  }
}
```

#### False Start Variant

```html
<div class="screen results-screen false-start">
  <div class="false-start-icon">⚠️</div>
  <div class="false-start-title">False Start!</div>
  <div class="false-start-message">You reacted too early</div>

  <button class="text-button primary flashing" onclick="playAgain()">Try Again</button>

  <button class="text-button" onclick="backToMenu()">Back to Menu</button>
</div>
```

```css
.false-start-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.false-start-title {
  color: var(--red);
  font-size: var(--font-size-2xl);
  margin-bottom: 16px;
  text-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
}

.false-start-message {
  color: var(--white);
  font-size: var(--font-size-base);
  margin-bottom: 50px;
  opacity: 0.8;
}
```

#### Challenge Result Variant

```html
<div class="challenge-result">
  <div class="result-banner winner">You Win!</div>

  <div class="time-comparison">
    <div class="time-row user-time">
      <span class="player-label">You:</span>
      <span class="player-time">0.186 sec</span>
    </div>
    <div class="time-row opponent-time">
      <span class="player-label">u/Opponent:</span>
      <span class="player-time">0.215 sec</span>
    </div>
  </div>

  <div class="margin-display">Won by <span class="margin-value">29</span> milliseconds</div>

  <div class="challenge-actions">
    <button class="text-button primary" onclick="challengeSomeoneElse()">
      Challenge Someone Else
    </button>
    <button class="text-button" onclick="backToMenu()">Back to Menu</button>
  </div>
</div>
```

```css
.result-banner {
  font-size: var(--font-size-2xl);
  padding: 20px;
  margin-bottom: 30px;
  border: 3px solid;
}

.result-banner.winner {
  color: var(--yellow);
  border-color: var(--yellow);
  background: rgba(255, 255, 0, 0.1);
  text-shadow: 0 0 20px rgba(255, 255, 0, 0.5);
}

.result-banner.loser {
  color: var(--gray-light);
  border-color: var(--gray-mid);
  background: rgba(128, 128, 128, 0.1);
}

.time-comparison {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--gray-dark);
}

.time-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-base);
}

.user-time .player-label,
.user-time .player-time {
  color: var(--yellow);
}

.opponent-time .player-label,
.opponent-time .player-time {
  color: var(--white);
}

.margin-display {
  font-size: var(--font-size-sm);
  color: var(--gray-light);
  margin-bottom: 40px;
}

.margin-value {
  color: var(--white);
  font-weight: bold;
}

.challenge-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
```

---

### 5.4 Leaderboard Screen

#### Layout Structure

```
┌─────────────────────────────────┐
│        LEADERBOARD              │  10% - Title
│                                 │
│  [GLOBAL] [r/FORMULA1]          │  10% - Scope filter
│  [DAILY] [WEEKLY] [ALL-TIME]    │  10% - Period filter
│                                 │
│  1  u/SpeedRacer    0.142 SEC   │
│  2  u/FastFingers   0.156 SEC   │  50% - Scores
│  3  u/Lightning     0.163 SEC   │  (scrollable)
│  ...                            │
│                                 │
│  Showing Top 100 of 5,432       │  10% - Stats
│                                 │
│         [BACK]                  │  10% - Navigation
└─────────────────────────────────┘
```

#### HTML Structure

```html
<div class="screen leaderboard-screen">
  <div class="leaderboard-header">
    <h2 class="screen-title">Leaderboard</h2>

    <div class="filter-group">
      <div class="filter-buttons scope-filter">
        <button class="filter-button active" data-scope="global">Global</button>
        <button class="filter-button" data-scope="subreddit">r/Formula1</button>
      </div>

      <div class="filter-buttons period-filter">
        <button class="filter-button" data-period="daily">Daily</button>
        <button class="filter-button" data-period="weekly">Weekly</button>
        <button class="filter-button active" data-period="alltime">All-Time</button>
      </div>
    </div>
  </div>

  <div class="leaderboard-content">
    <div class="leaderboard">
      <!-- Rows generated dynamically -->
    </div>
  </div>

  <div class="leaderboard-footer">
    <div class="leaderboard-stats">
      Showing Top <span class="stat-value">100</span> of <span class="stat-value">5,432</span>
    </div>

    <button class="text-button" onclick="backToMenu()">Back</button>
  </div>
</div>
```

#### CSS

```css
.leaderboard-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--black);
  padding: 20px;
}

.leaderboard-header {
  margin-bottom: 30px;
}

.screen-title {
  color: var(--yellow);
  font-size: var(--font-size-xl);
  text-align: center;
  margin-bottom: 30px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.filter-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.filter-button {
  background: transparent;
  border: 2px solid var(--gray-mid);
  color: var(--gray-light);
  padding: 8px 16px;
  font-size: var(--font-size-sm);
  font-family: inherit;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-button:hover {
  border-color: var(--white);
  color: var(--white);
}

.filter-button.active {
  border-color: var(--yellow);
  color: var(--yellow);
  background: rgba(255, 255, 0, 0.1);
}

.leaderboard-content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.leaderboard-footer {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  padding-top: 20px;
  border-top: 2px solid var(--gray-dark);
}

.leaderboard-stats {
  font-size: var(--font-size-sm);
  color: var(--gray-light);
}

.stat-value {
  color: var(--white);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .leaderboard-screen {
    padding: 15px 10px;
  }

  .screen-title {
    font-size: var(--font-size-lg);
  }

  .filter-buttons {
    gap: 8px;
  }

  .filter-button {
    padding: 6px 12px;
    font-size: var(--font-size-xs);
  }
}
```

---

### 5.5 Modal Overlays

#### How To Play Modal

```html
<div class="modal-overlay" onclick="closeModal()">
  <div class="modal-content" onclick="event.stopPropagation()">
    <h3 class="modal-title">How To Play</h3>

    <div class="instructions-list">
      <div class="instruction-step">
        <div class="step-number">1</div>
        <div class="step-text">Wait for lights to turn on one by one</div>
      </div>

      <div class="instruction-step">
        <div class="step-number">2</div>
        <div class="step-text">When all lights go out, click as fast as you can</div>
      </div>

      <div class="instruction-step">
        <div class="step-number">3</div>
        <div class="step-text">Don't click too early! That's a false start</div>
      </div>
    </div>

    <div class="tip-box">
      <div class="tip-icon">💡</div>
      <div class="tip-text">Tip: Use spacebar for faster reactions</div>
    </div>

    <button class="text-button primary" onclick="closeModal()">Got It</button>
  </div>
</div>
```

#### CSS

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--black);
  border: 3px solid var(--white);
  padding: 40px 30px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  color: var(--yellow);
  font-size: var(--font-size-lg);
  text-align: center;
  margin-bottom: 30px;
}

.instructions-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 30px;
}

.instruction-step {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.step-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 2px solid var(--yellow);
  color: var(--yellow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-base);
}

.step-text {
  color: var(--white);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.tip-box {
  background: rgba(255, 255, 0, 0.1);
  border: 2px solid var(--yellow);
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 30px;
}

.tip-icon {
  font-size: var(--font-size-xl);
  flex-shrink: 0;
}

.tip-text {
  color: var(--white);
  font-size: var(--font-size-sm);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .modal-content {
    padding: 30px 20px;
  }

  .modal-title {
    font-size: var(--font-size-base);
  }

  .instructions-list {
    gap: 20px;
  }

  .step-number {
    width: 28px;
    height: 28px;
    font-size: var(--font-size-sm);
  }

  .step-text,
  .tip-text {
    font-size: var(--font-size-xs);
  }
}
```

---

## 6. Animation & Feedback System

### 6.1 Screen Flash Effects

```javascript
function flashScreen(color, duration = 200) {
  const overlay = document.createElement('div');
  overlay.className = 'flash-overlay';
  overlay.style.setProperty('--flash-color', color);
  overlay.style.setProperty('--flash-duration', `${duration}ms`);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), duration);
}

// Usage
flashScreen('#FFD700', 200); // Gold flash for perfect
flashScreen('#FFFF00', 200); // Yellow flash for excellent
flashScreen('#FF0000', 300); // Red flash for false start
```

```css
.flash-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--flash-color);
  opacity: 0;
  pointer-events: none;
  z-index: 9999;
  animation: flashAnimation var(--flash-duration) ease-out;
}

@keyframes flashAnimation {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 0;
  }
}
```

### 6.2 Screen Transitions

```javascript
function transitionTo(screenId) {
  const currentScreen = document.querySelector('.screen.active');
  const nextScreen = document.getElementById(screenId);

  currentScreen.classList.add('exiting');

  setTimeout(() => {
    currentScreen.classList.remove('active', 'exiting');
    nextScreen.classList.add('active', 'entering');

    setTimeout(() => {
      nextScreen.classList.remove('entering');
    }, 300);
  }, 300);
}
```

```css
.screen {
  display: none;
  opacity: 0;
  transform: translateY(20px);
}

.screen.active {
  display: flex;
}

.screen.entering {
  animation: screenEnter 0.3s ease-out forwards;
}

.screen.exiting {
  animation: screenExit 0.3s ease-out forwards;
}

@keyframes screenEnter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes screenExit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}
```

---

## 7. Responsive Design Guidelines

### 7.1 Breakpoints

```css
/* Mobile first approach */
:root {
  --container-padding: 20px;
  --element-gap: 16px;
}

/* Tablet: 641px and up */
@media (min-width: 641px) {
  :root {
    --container-padding: 40px;
    --element-gap: 20px;
  }
}

/* Desktop: 1024px and up */
@media (min-width: 1024px) {
  :root {
    --container-padding: 60px;
    --element-gap: 24px;
  }
}
```

### 7.2 Touch Targets

```css
/* Minimum 44x44px touch targets for mobile */
.text-button,
.filter-button,
.leaderboard-row {
  min-height: 44px;
  min-width: 44px;
}

/* Add extra padding for comfortable tapping */
@media (max-width: 640px) {
  .text-button {
    padding: 12px 24px;
  }
}
```

### 7.3 Font Scaling

```css
/* Base font size scales with viewport */
html {
  font-size: 14px;
}

@media (min-width: 641px) {
  html {
    font-size: 16px;
  }
}

@media (min-width: 1024px) {
  html {
    font-size: 18px;
  }
}
```

---

## 8. Accessibility Guidelines

### 8.1 Keyboard Navigation

```javascript
// Global keyboard handler
document.addEventListener('keydown', (e) => {
  const activeScreen = getActiveScreen();

  switch (activeScreen) {
    case 'splash':
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        startGame();
      }
      break;

    case 'game':
      if (e.key === ' ') {
        e.preventDefault();
        handleReaction();
      }
      break;

    case 'results':
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        playAgain();
      }
      if (e.key === 'Escape') {
        backToMenu();
      }
      break;
  }
});
```

### 8.2 ARIA Labels

````html
<button class="text-button primary" aria-label="Start new game" role="button">Press Start</button>

<div class="lights-container" role="status" aria-live="polite" aria-label="Starting lights">
  <!-- lights -->
</div>

<div class="result-time" role="status" aria-live="assertive" aria-label="Your reaction time">
  # UI/UX Guide v2: F1 Start Challenge **Authentic Pole Position Aesthetic for Modern Web** --- ##
  1. Design Philosophy: Arcade Minimalism ### 1.1 Core Principle **"Every pixel serves the
  gameplay."** This is not a modern web app with arcade styling—this is an authentic 1982 arcade
  experience translated to modern browsers. We prioritize: - **Instant readability** over decorative
  elements - **High contrast** over subtle gradients - **Immediate feedback** over smooth
  transitions - **Functional layout** over creative experimentation ### 1.2 Historical Context
  Namco's *Pole Position* (1982) was designed for dimly-lit arcade environments with CRT displays.
  Colors had to pop, text had to be legible from 3 feet away, and every element needed to withstand
  the visual noise of a busy arcade. We honor these constraints even though our canvas is a
  smartphone screen. --- ## 2. Typography System ### 2.1 Font Family **Primary Font:** `"Press Start
  2P", monospace` **Fallback Stack:** ```css font-family: "Press Start 2P", "Courier New", Courier,
  monospace;
</div>
````

**Why This Font:**

- Authentic 8-bit bitmap aesthetic
- Excellent readability at small sizes
- Web-safe via Google Fonts
- Zero licensing issues

**Loading Strategy:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
  rel="stylesheet"
/>
```

### 2.2 Type Scale

```css
:root {
  /* Base size: 16px on desktop, 14px on mobile */
  --font-size-xs: 0.75rem; /* 12px - Small labels */
  --font-size-sm: 0.875rem; /* 14px - Secondary text */
  --font-size-base: 1rem; /* 16px - Body text */
  --font-size-lg: 1.25rem; /* 20px - Section headers */
  --font-size-xl: 1.5rem; /* 24px - Screen titles */
  --font-size-2xl: 2rem; /* 32px - Important numbers */
  --font-size-3xl: 3rem; /* 48px - Hero text (reaction time) */
}
```

### 2.3 Typography Rules

**MANDATORY:**

- ✅ ALL TEXT MUST BE UPPERCASE
- ✅ No font smoothing or anti-aliasing
- ✅ Letter spacing: 0.05em minimum
- ✅ Line height: 1.4-1.6 for readability

**CSS Implementation:**

```css
body {
  font-family: 'Press Start 2P', monospace;
  text-transform: uppercase;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  font-smooth: never;
  letter-spacing: 0.05em;
  line-height: 1.5;
}
```

**FORBIDDEN:**

- ❌ Mixed case text
- ❌ Italic or oblique styles
- ❌ Multiple font families
- ❌ Text shadows (except light glow effects)

---

## 3. Color System

### 3.1 Core Palette

```css
:root {
  /* Primary Colors */
  --black: #000000; /* Background */
  --white: #ffffff; /* Primary text */
  --yellow: #ffff00; /* Highlights, success */
  --red: #ff0000; /* Danger, lights */

  /* Secondary Colors */
  --gray-dark: #202020; /* Light off state */
  --gray-mid: #808080; /* Borders, disabled */
  --gray-light: #c0c0c0; /* Secondary text */

  /* Accent Colors */
  --gold: #ffd700; /* Perfect rating */
  --cyan: #00ffff; /* Info (sparingly) */
  --green: #00ff00; /* Brief success flash only */
  --magenta: #ff00ff; /* Warnings/flags */
}
```

### 3.2 Color Usage Guidelines

#### Background Colors

- **Primary background:** Always `#000000` (pure black)
- **Never use:** Dark grays, gradients, textures
- **Exception:** Semi-transparent overlays for modals (`rgba(0, 0, 0, 0.9)`)

#### Text Colors

- **Default text:** `#FFFFFF` (white)
- **Emphasis:** `#FFFF00` (yellow)
- **De-emphasis:** `#808080` (gray)
- **Error state:** `#FF0000` (red)

**Example Hierarchy:**

```css
.title {
  color: var(--yellow); /* Important */
  font-size: var(--font-size-xl);
}

.body-text {
  color: var(--white); /* Standard */
  font-size: var(--font-size-base);
}

.subtitle {
  color: var(--gray-light); /* Less important */
  font-size: var(--font-size-sm);
}
```

#### Interactive Elements

- **Default state:** White border, transparent background
- **Hover state:** White background with 10% opacity
- **Active state:** White background with 20% opacity
- **Disabled state:** Gray border, 50% opacity

**CRITICAL: No color-coded buttons.** Text and position indicate function, not color.

---

## 4. Component Library

### 4.1 Starting Lights (Primary Component)

#### Structure

```html
<div class="lights-container">
  <div class="light" data-index="0"></div>
  <div class="light" data-index="1"></div>
  <div class="light" data-index="2"></div>
  <div class="light" data-index="3"></div>
  <div class="light" data-index="4"></div>
</div>
```

#### Styling

```css
.lights-container {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.light {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--gray-dark);
  border: 3px solid #404040;
  position: relative;
  transition:
    background-color 0.05s ease-out,
    box-shadow 0.05s ease-out,
    transform 0.05s ease-out;
  will-change: background-color, box-shadow, transform;
}

.light.on {
  background: var(--red);
  border-color: #ff3333;
  box-shadow:
    0 0 20px rgba(255, 0, 0, 0.8),
    0 0 40px rgba(255, 0, 0, 0.5),
    0 0 60px rgba(255, 0, 0, 0.3),
    inset 0 0 15px rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .lights-container {
    gap: 12px;
    padding: 20px 10px;
  }

  .light {
    width: 50px;
    height: 50px;
    border-width: 2px;
  }
}
```

#### Animation Sequence

```javascript
// CORRECT: Accumulating lights
async function startLightSequence() {
  for (let i = 0; i < 5; i++) {
    await sleep(900); // 900ms interval
    lights[i].classList.add('on');
    playBeep(BEEP_FREQUENCIES[i]);
  }

  // Random delay
  const delay = 500 + Math.random() * 2000;
  await sleep(delay);

  // All off simultaneously
  lights.forEach((light) => light.classList.remove('on'));
  return performance.now(); // Return exact timestamp
}
```

---

### 4.2 Text Button

#### Structure

```html
<button class="text-button primary">
  <span class="button-label">Press Start</span>
</button>
```

#### Styling

```css
.text-button {
  background: transparent;
  border: 2px solid var(--white);
  color: var(--white);
  padding: 12px 24px;
  font-size: var(--font-size-base);
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition:
    background-color 0.1s,
    transform 0.05s;
  position: relative;
}

.text-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.text-button:active {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(2px);
}

.text-button:disabled {
  border-color: var(--gray-mid);
  color: var(--gray-mid);
  cursor: not-allowed;
  opacity: 0.5;
}

/* Primary variant - larger, more prominent */
.text-button.primary {
  border-width: 3px;
  padding: 16px 32px;
  font-size: var(--font-size-lg);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .text-button {
    padding: 10px 20px;
    font-size: var(--font-size-sm);
  }

  .text-button.primary {
    padding: 14px 28px;
    font-size: var(--font-size-base);
  }
}
```

#### Flashing Animation (for primary CTA)

```css
@keyframes buttonFlash {
  0%,
  49% {
    border-color: var(--white);
    color: var(--white);
  }
  50%,
  100% {
    border-color: var(--yellow);
    color: var(--yellow);
  }
}

.text-button.flashing {
  animation: buttonFlash 1s steps(1) infinite;
}
```

---

### 4.3 HUD Text Display

#### Structure

```html
<div class="hud-bar">
  <div class="hud-item">
    <span class="hud-label">Best:</span>
    <span class="hud-value">0.186s</span>
  </div>
  <div class="hud-item">
    <span class="hud-label">Last:</span>
    <span class="hud-value">0.215s</span>
  </div>
</div>
```

#### Styling

```css
.hud-bar {
  display: flex;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--black);
  border-bottom: 2px solid var(--gray-mid);
}

.hud-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.hud-label {
  color: var(--gray-light);
  font-size: var(--font-size-xs);
}

.hud-value {
  color: var(--white);
  font-size: var(--font-size-sm);
}

.hud-value.highlight {
  color: var(--yellow);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .hud-bar {
    padding: 12px 16px;
  }

  .hud-item {
    gap: 6px;
  }
}
```

---

### 4.4 Result Display

#### Large Time Display

```html
<div class="result-time">
  <div class="time-value">0.186</div>
  <div class="time-unit">sec</div>
</div>
```

```css
.result-time {
  text-align: center;
  padding: 40px 20px;
}

.time-value {
  color: var(--yellow);
  font-size: var(--font-size-3xl);
  line-height: 1;
  margin-bottom: 8px;
  text-shadow: 0 0 20px rgba(255, 255, 0, 0.5);
}

.time-unit {
  color: var(--white);
  font-size: var(--font-size-base);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .result-time {
    padding: 30px 15px;
  }

  .time-value {
    font-size: var(--font-size-2xl);
  }

  .time-unit {
    font-size: var(--font-size-sm);
  }
}
```

#### Rating Display

```html
<div class="rating-display rating-perfect">★★★ Perfect! ★★★</div>
```

```css
.rating-display {
  text-align: center;
  padding: 16px;
  font-size: var(--font-size-lg);
  margin: 20px 0;
}

.rating-perfect {
  color: var(--gold);
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
}

.rating-excellent {
  color: var(--yellow);
}

.rating-good {
  color: var(--white);
}

.rating-slow {
  color: var(--gray-light);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .rating-display {
    font-size: var(--font-size-base);
    padding: 12px;
  }
}
```

---

### 4.5 Leaderboard Table

#### Structure

```html
<div class="leaderboard">
  <div class="leaderboard-row rank-1">
    <span class="rank">1</span>
    <span class="username">u/SpeedRacer</span>
    <span class="time">0.142 sec</span>
  </div>
  <div class="leaderboard-row rank-user">
    <span class="rank">12</span>
    <span class="username">u/You</span>
    <span class="time">0.186 sec</span>
  </div>
  <!-- more rows -->
</div>
```

#### Styling

```css
.leaderboard {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 50px 1fr 100px;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--gray-dark);
  align-items: center;
  transition: background-color 0.2s;
}

.leaderboard-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.rank {
  color: var(--gray-light);
  font-size: var(--font-size-sm);
  text-align: right;
}

.username {
  color: var(--white);
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  color: var(--white);
  font-size: var(--font-size-sm);
  text-align: right;
}

/* Special ranks */
.rank-1 .rank,
.rank-1 .username,
.rank-1 .time {
  color: var(--gold);
}

.rank-2 .rank,
.rank-2 .username,
.rank-2 .time {
  color: var(--gray-light);
}

.rank-3 .rank,
.rank-3 .username,
.rank-3 .time {
  color: #cd7f32; /* Bronze */
}

.rank-user {
  background: rgba(255, 255, 0, 0.1);
  border: 1px solid var(--yellow);
}

.rank-user .rank,
.rank-user .username,
.rank-user .time {
  color: var(--yellow);
}

/* Flagged scores */
.rank-flagged .time::after {
  content: ' ⚠';
  color: var(--magenta);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .leaderboard {
    padding: 15px 10px;
  }

  .leaderboard-row {
    grid-template-columns: 40px 1fr 80px;
    gap: 8px;
    padding: 10px 6px;
  }

  .rank,
  .username,
  .time {
    font-size: var(--font-size-xs);
  }
}
```

<div 
  class="result-time"
  role="status"
  aria-live="assertive"
  aria-label="Your reaction time">
  0.186 sec
</div>
```

### 8.3 Focus States

```css
/* Visible focus indicators */
*:focus {
  outline: 2px solid var(--yellow);
  outline-offset: 4px;
}

/* Enhanced focus for buttons */
.text-button:focus {
  outline: 3px solid var(--yellow);
  outline-offset: 4px;
  background: rgba(255, 255, 0, 0.1);
}

/* Focus visible only for keyboard navigation */
*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 4px;
}
```

### 8.4 Screen Reader Announcements

```javascript
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 1000);
}

// Usage examples
announceToScreenReader('Game starting. Wait for lights.');
announceToScreenReader('All lights are on. Get ready!');
announceToScreenReader('Lights out! React now!');
announceToScreenReader('Your reaction time: 186 milliseconds. Excellent!');
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 9. Performance Optimization

### 9.1 GPU-Accelerated Properties

```css
/* ALWAYS use these for animations */
.animated-element {
  /* ✅ Good - GPU accelerated */
  transform: translateX(10px);
  opacity: 0.5;

  /* ❌ Bad - causes reflow */
  /* left: 10px; */
  /* width: 100px; */
  /* margin-left: 10px; */
}

/* Force GPU layer creation */
.light,
.flash-overlay,
.screen {
  will-change: transform, opacity;
}

/* Remove will-change after animation */
.light:not(.animating) {
  will-change: auto;
}
```

### 9.2 Debouncing & Throttling

```javascript
// Prevent double-tap issues
let inputCooldown = false;

function handleReaction(event) {
  if (inputCooldown) return;

  inputCooldown = true;
  processReaction();

  setTimeout(() => {
    inputCooldown = false;
  }, 800); // 800ms cooldown
}

// Throttle scroll events for leaderboard
let scrollThrottle = null;

leaderboardElement.addEventListener('scroll', () => {
  if (scrollThrottle) return;

  scrollThrottle = setTimeout(() => {
    checkIfNearBottom();
    scrollThrottle = null;
  }, 100);
});
```

### 9.3 Lazy Loading

```javascript
// Load leaderboard data only when needed
async function showLeaderboard() {
  showLoadingState();

  try {
    const data = await fetchLeaderboardData();
    renderLeaderboard(data);
  } catch (error) {
    showErrorState();
  }
}

// Progressive rendering for large lists
function renderLeaderboard(data) {
  const batchSize = 20;
  let currentIndex = 0;

  function renderBatch() {
    const batch = data.slice(currentIndex, currentIndex + batchSize);
    batch.forEach((entry) => appendLeaderboardRow(entry));

    currentIndex += batchSize;

    if (currentIndex < data.length) {
      requestAnimationFrame(renderBatch);
    }
  }

  renderBatch();
}
```

---

## 10. Audio Implementation

### 10.1 Web Audio API Setup

```javascript
let audioContext = null;
let isMuted = false;

function initAudio() {
  // Create on user interaction (required by browser autoplay policy)
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Resume if suspended
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playBeep(frequency, duration = 0.08, volume = 0.5) {
  if (isMuted || !audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  gainNode.gain.value = volume;
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}
```

### 10.2 Sound Effects Library

```javascript
const SOUNDS = {
  // Light activation beeps (ascending)
  light1: { frequency: 440, duration: 0.08 }, // A4
  light2: { frequency: 494, duration: 0.08 }, // B4
  light3: { frequency: 523, duration: 0.08 }, // C5
  light4: { frequency: 587, duration: 0.08 }, // D5
  light5: { frequency: 659, duration: 0.1 }, // E5

  // Result sounds
  perfect: { frequency: 880, duration: 0.3, volume: 0.6 },
  excellent: { frequency: 659, duration: 0.2, volume: 0.5 },
  good: { frequency: 523, duration: 0.15, volume: 0.5 },
  falseStart: { frequency: 110, duration: 0.5, type: 'sawtooth', volume: 0.4 },

  // UI sounds
  buttonClick: { frequency: 440, duration: 0.05, volume: 0.3 },
  ghost: { frequency: 440, duration: 0.05, volume: 0.2 },
};

function playSound(soundName) {
  const sound = SOUNDS[soundName];
  if (!sound) return;

  playBeep(sound.frequency, sound.duration, sound.volume);
}
```

### 10.3 Mute Toggle

```html
<button class="mute-toggle" onclick="toggleMute()" aria-label="Toggle sound">
  <span class="mute-icon">🔊</span>
</button>
```

```css
.mute-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  background: transparent;
  border: 2px solid var(--white);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s;
}

.mute-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.mute-toggle.muted .mute-icon::before {
  content: '🔇';
}

.mute-icon {
  font-size: 24px;
}
```

```javascript
function toggleMute() {
  isMuted = !isMuted;
  const button = document.querySelector('.mute-toggle');
  button.classList.toggle('muted', isMuted);

  // Save preference
  localStorage.setItem('f1-start-muted', isMuted);

  // Feedback beep (if unmuting)
  if (!isMuted) {
    playSound('buttonClick');
  }
}

// Load preference on init
function loadMutePreference() {
  isMuted = localStorage.getItem('f1-start-muted') === 'true';
  document.querySelector('.mute-toggle')?.classList.toggle('muted', isMuted);
}
```

---

## 11. Error States & Loading

### 11.1 Loading Indicator

```html
<div class="loading-overlay">
  <div class="loading-spinner">
    <div class="spinner-light"></div>
    <div class="spinner-light"></div>
    <div class="spinner-light"></div>
    <div class="spinner-light"></div>
    <div class="spinner-light"></div>
  </div>
  <div class="loading-text">Loading...</div>
</div>
```

```css
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--black);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.spinner-light {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--gray-dark);
  animation: spinnerPulse 1.4s ease-in-out infinite;
}

.spinner-light:nth-child(1) {
  animation-delay: 0s;
}
.spinner-light:nth-child(2) {
  animation-delay: 0.2s;
}
.spinner-light:nth-child(3) {
  animation-delay: 0.4s;
}
.spinner-light:nth-child(4) {
  animation-delay: 0.6s;
}
.spinner-light:nth-child(5) {
  animation-delay: 0.8s;
}

@keyframes spinnerPulse {
  0%,
  80%,
  100% {
    background: var(--gray-dark);
    transform: scale(1);
  }
  40% {
    background: var(--red);
    transform: scale(1.2);
  }
}

.loading-text {
  color: var(--white);
  font-size: var(--font-size-base);
}
```

### 11.2 Error State

```html
<div class="error-state">
  <div class="error-icon">⚠️</div>
  <div class="error-title">Connection Error</div>
  <div class="error-message">
    Unable to load leaderboard data. Please check your connection and try again.
  </div>
  <button class="text-button primary" onclick="retry()">Retry</button>
  <button class="text-button" onclick="backToMenu()">Back to Menu</button>
</div>
```

```css
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  min-height: 400px;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  animation: errorShake 0.5s ease-in-out;
}

@keyframes errorShake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

.error-title {
  color: var(--red);
  font-size: var(--font-size-xl);
  margin-bottom: 16px;
}

.error-message {
  color: var(--white);
  font-size: var(--font-size-sm);
  max-width: 400px;
  margin-bottom: 30px;
  line-height: 1.6;
  opacity: 0.8;
}
```

### 11.3 Empty State (No Scores)

```html
<div class="empty-state">
  <div class="empty-icon">🏁</div>
  <div class="empty-title">No Scores Yet</div>
  <div class="empty-message">Be the first to set a time on this leaderboard!</div>
  <button class="text-button primary" onclick="playGame()">Set First Score</button>
</div>
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-title {
  color: var(--white);
  font-size: var(--font-size-xl);
  margin-bottom: 16px;
}

.empty-message {
  color: var(--gray-light);
  font-size: var(--font-size-base);
  max-width: 400px;
  margin-bottom: 30px;
}
```

---

## 12. Implementation Checklist

### 12.1 Visual Polish

- [ ] All fonts load correctly (Press Start 2P)
- [ ] All text is uppercase
- [ ] No anti-aliasing on text
- [ ] Black background everywhere
- [ ] Correct color palette applied
- [ ] Light glow effects implemented
- [ ] Screen flashes on results
- [ ] Smooth 60fps animations
- [ ] No layout shift during loading

### 12.2 Interactive Elements

- [ ] All buttons have hover states
- [ ] Focus indicators visible
- [ ] Touch targets ≥44x44px on mobile
- [ ] Double-tap prevention working
- [ ] Keyboard navigation functional
- [ ] ARIA labels on all interactive elements

### 12.3 Responsive Design

- [ ] Works on 320px width (small mobile)
- [ ] Works on tablet (768px)
- [ ] Works on desktop (1920px)
- [ ] Lights scale proportionally
- [ ] Text remains readable at all sizes
- [ ] No horizontal scrolling

### 12.4 Audio

- [ ] Web Audio API initialized on first interaction
- [ ] All sound effects play correctly
- [ ] Mute toggle works and persists
- [ ] No audio glitches or clipping
- [ ] iOS Safari compatibility verified

### 12.5 Performance

- [ ] Bundle size <500KB
- [ ] Load time <2s on 3G
- [ ] 60fps during animations
- [ ] No janky scrolling
- [ ] Memory usage acceptable (<50MB)

### 12.6 Accessibility

- [ ] Keyboard navigation complete
- [ ] Screen reader announcements working
- [ ] Focus indicators visible
- [ ] Color contrast ratios pass WCAG AA
- [ ] Alt text on all images/icons

### 12.7 Error Handling

- [ ] Loading states implemented
- [ ] Error states designed
- [ ] Empty states designed
- [ ] Network failures handled gracefully
- [ ] User feedback for all actions

---

## 13. Browser Testing Matrix

### Required Testing

| Browser | Version | Platform | Priority |
| ------- | ------- | -------- | -------- |
| Chrome  | 90+     | Desktop  | High     |
| Chrome  | 90+     | Android  | High     |
| Safari  | 14+     | iOS      | High     |
| Safari  | 14+     | macOS    | Medium   |
| Firefox | 88+     | Desktop  | Medium   |
| Edge    | 90+     | Desktop  | Low      |

### Known Issues & Workarounds

**iOS Safari:**

- `performance.now()` may have reduced precision (1ms vs 0.1ms)
- Workaround: Round displayed times to nearest 10ms if precision < 1ms

**Chrome Android:**

- Touch events may have slight delay
- Workaround: Use `touch-action: manipulation` CSS

**Firefox:**

- Web Audio API may require user gesture
- Workaround: Initialize on first button click

---

## 14. Design Tokens (CSS Variables)

Complete reference for all design tokens:

```css
:root {
  /* Colors */
  --color-black: #000000;
  --color-white: #ffffff;
  --color-yellow: #ffff00;
  --color-red: #ff0000;
  --color-gray-dark: #202020;
  --color-gray-mid: #808080;
  --color-gray-light: #c0c0c0;
  --color-gold: #ffd700;
  --color-cyan: #00ffff;
  --color-green: #00ff00;
  --color-magenta: #ff00ff;

  /* Typography */
  --font-primary: 'Press Start 2P', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-3xl: 3rem;
  --letter-spacing: 0.05em;
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.6;

  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 30px;
  --spacing-2xl: 40px;
  --spacing-3xl: 60px;

  /* Layout */
  --container-max-width: 600px;
  --border-width: 2px;
  --border-width-thick: 3px;
  --border-radius: 0; /* No rounded corners - pure arcade */

  /* Timing */
  --transition-fast: 0.1s;
  --transition-normal: 0.2s;
  --transition-slow: 0.3s;

  /* Z-index layers */
  --z-base: 0;
  --z-hud: 10;
  --z-modal: 100;
  --z-flash: 9999;

  /* Light dimensions */
  --light-size-desktop: 80px;
  --light-size-mobile: 50px;
  --light-gap-desktop: 20px;
  --light-gap-mobile: 12px;
}
```

---

## 15. Final Guidelines

### DO's ✅

- Keep every design decision simple and functional
- Prioritize readability over aesthetics
- Use instant state changes (no fades)
- Maintain strict color palette
- Test on real devices frequently
- Optimize for 60fps
- Make touch targets generous on mobile
- Provide immediate feedback for all actions

### DON'Ts ❌

- Don't use gradients or textures
- Don't add decorative elements
- Don't use mixed case text
- Don't use multiple fonts
- Don't add rounded corners
- Don't use subtle animations
- Don't compromise on contrast
- Don't ignore accessibility

### When In Doubt

Ask: "Would this exist in a 1982 arcade cabinet?"

- If yes → Include it
- If no → Remove it

---

## 16. Version History

**v2.0** (Current)

- Complete rewrite based on authentic Pole Position style guide
- Corrected light sequence (accumulating, not sequential)
- Fixed color palette (yellow for success, not green)
- Removed color-coded buttons
- Added comprehensive component library
- Enhanced accessibility guidelines
- Added performance optimization section

**v1.0** (Original)

- Initial UX guide with modern web conventions
- Contained inaccuracies in arcade aesthetic
- Color-coded buttons (incorrect for 1982 style)

---

## 17. Quick Reference

### Component Checklist

- [ ] Starting Lights (5 circles, accumulating)
- [ ] Text Buttons (border-only, no fill)
- [ ] HUD Display (top bar stats)
- [ ] Result Time Display (hero text)
- [ ] Rating Display (with appropriate color)
- [ ] Leaderboard Table (grid layout)
- [ ] Modal Overlays (centered, bordered)
- [ ] Loading Spinner (5-light pulse)
- [ ] Error States (icon + message + actions)
- [ ] Mute Toggle (top-right corner)

### Color Quick Reference

```
Success: #FFFF00 (yellow)
Perfect: #FFD700 (gold)
Danger: #FF0000 (red)
Info: #FFFFFF (white)
Light On: #FF0000 (red)
Light Off: #202020 (dark gray)
```

### Animation Quick Reference

```
Light transition: 0.05s ease-out
Screen transition: 0.3s ease-out
Button hover: 0.1s
Flash duration: 0.2s
```

---

**Document Status:** Ready for Implementation  
**Last Updated:** [Current Date]  
**Approved By:** [Awaiting Approval]  
**Questions?** Refer to Pole Position Style Guide or PRD v3#### Layout Structure

```
┌─────────────────────────────────┐
│                                 │  20% - Spacer
│     F1 START CHALLENGE          │  Title area
│     TEST YOUR REFLEXES          │  Subtitle
│                                 │
│      > PRESS START <            │  30% - Primary CTA (flashing)
│                                 │
│   LEADERBOARD  |  HOW TO PLAY   │  20% - Secondary actions
│                                 │
│                                 │  30% - Spacer
└─────────────────────────────────┘
```

#### HTML Structure

```html
<div class="screen splash-screen">
  <div class="splash-content">
    <h1 class="game-title">F1 Start Challenge</h1>
    <p class="game-subtitle">Test Your Reflexes</p>

    <button class="text-button primary flashing" onclick="startGame()">
      <span class="button-cursor">&gt;</span> Press Start <span class="button-cursor">&lt;</span>
    </button>

    <div class="secondary-nav">
      <button class="text-button" onclick="showLeaderboard()">Leaderboard</button>
      <span class="nav-separator">|</span>
      <button class="text-button" onclick="showInstructions()">How To Play</button>
    </div>
  </div>

  <!-- Optional: Show after first game -->
  <div class="personal-best" style="display: none;">
    <span class="best-label">Your Best:</span>
    <span class="best-value">0.186s</span>
  </div>
</div>
```

#### CSS

```css
.splash-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--black);
}

.splash-content {
  text-align: center;
  max-width: 600px;
}

.game-title {
  color: var(--yellow);
  font-size: var(--font-size-2xl);
  margin-bottom: 16px;
  line-height: 1.2;
  text-shadow: 0 0 20px rgba(255, 255, 0, 0.3);
}

.game-subtitle {
  color: var(--white);
  font-size: var(--font-size-base);
  margin-bottom: 60px;
  opacity: 0.8;
}

.button-cursor {
  color: var(--yellow);
}

.secondary-nav {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
}

.nav-separator {
  color: var(--gray-mid);
  font-size: var(--font-size-base);
}

.personal-best {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  font-size: var(--font-size-sm);
}

.best-label {
  color: var(--gray-light);
}

.best-value {
  color: var(--yellow);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .game-title {
    font-size: var(--font-size-xl);
  }

  .game-subtitle {
    font-size: var(--font-size-sm);
    margin-bottom: 40px;
  }

  .secondary-nav {
    flex-direction: column;
    gap: 12px;
    margin-top: 30px;
  }

  .nav-separator {
    display: none;
  }
}
```

#### Challenge Mode Variant

```html
<!-- When accessed via challenge link -->
<div class="challenge-banner">
  <div class="challenge-icon">⚡</div>
  <div class="challenge-text"><span class="challenger">u/PlayerName</span> Challenges You!</div>
</div>

<button class="text-button primary flashing" onclick="acceptChallenge()">Accept Challenge</button>
```

```css
.challenge-banner {
  background: rgba(255, 0, 0, 0.1);
  border: 2px solid var(--red);
  padding: 20px;
  margin-bottom: 40px;
  text-align: center;
}

.challenge-icon {
  font-size: var(--font-size-2xl);
  margin-bottom: 12px;
}

.challenge-text {
  font-size: var(--font-size-base);
  color: var(--white);
}

.challenger {
  color: var(--yellow);
  font-weight: bold;
}
```

---

### 5.2 Game Canvas

#### Layout Structure

```
┌─────────────────────────────────┐
│ BEST: 0.186s    LAST: 0.215s    │  10% - HUD bar
│                                 │
│                                 │  20% - Spacer
│     [●][●][●][○][○]            │  40% - Lights (focal point)
│                                 │
│         READY...                │  10% - Status text
│                                 │  20% - Spacer
└─────────────────────────────────┘
```

#### HTML Structure

```html
<div class="screen game-screen">
  <div class="hud-bar">
    <div class="hud-item">
      <span class="hud-label">Best:</span>
      <span class="hud-value highlight">0.186s</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">Last:</span>
      <span class="hud-value">0.215s</span>
    </div>
  </div>

  <div class="game-canvas">
    <div class="lights-container">
      <div class="light" data-index="0"></div>
      <div class="light" data-index="1"></div>
      <div class="light" data-index="2"></div>
      <div class="light" data-index="3"></div>
      <div class="light" data-index="4"></div>
    </div>

    <div class="status-text">Ready...</div>

    <!-- Challenge mode only -->
    <div class="ghost-indicator" style="display: none;">
      <div class="ghost-label">Opponent</div>
      <div class="ghost-marker"></div>
    </div>
  </div>
</div>
```

#### CSS

```css
.game-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--black);
}

.game-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 40px 20px;
}

.status-text {
  margin-top: 40px;
  font-size: var(--font-size-lg);
  color: var(--white);
  text-align: center;
  min-height: 32px; /* Prevent layout shift */
}

.status-text.hidden {
  opacity: 0;
}

/* Ghost indicator for challenges */
.ghost-indicator {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ghost-label {
  font-size: var(--font-size-xs);
  color: var(--gray-light);
}

.ghost-marker {
  width: 40px;
  height: 4px;
  background: var(--yellow);
  opacity: 0;
  transition: opacity 0.2s;
}

.ghost-marker.visible {
  opacity: 0.6;
  animation: ghostPulse 0.5s ease-out;
}

@keyframes ghostPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .game-canvas {
    padding: 20px 10px;
  }

  .status-text {
    margin-top: 30px;
    font-size: var(--font-size-base);
  }
}
```

---

### 5.3 Results Screen

#### Layout Structure

```
┌─────────────────────────────────┐
│                                 │  15% - Spacer
│         0.186 SEC               │  20% - Hero time
│                                 │
│   ⚡ FASTER THAN HAMILTON       │  15% - Context
│   📊 TOP 12% OF COMMUNITY       │
│                                 │
│      > PLAY AGAIN <             │  15% - Primary action
│                                 │
│    SUBMIT TO LEADERBOARD        │  15% - Secondary actions
│    CHALLENGE A FRIEND           │
│                                 │
│                                 │  20% - Spacer
└─────────────────────────────────┘
```

#### HTML Structure

```html
<div class="screen results-screen">
  <div class="results-content">
    <!-- Time Display -->
    <div class="result-time">
      <div class="time-value">0.186</div>
      <div class="time-unit">sec</div>
    </div>

    <!-- Rating -->
    <div class="rating-display rating-excellent">⚡ Excellent! ⚡</div>

    <!-- Comparisons -->
    <div class="comparison-section">
      <div class="comparison-item driver-comparison">
        <span class="comparison-icon">🏎️</span>
        <span class="comparison-text">Faster than Hamilton</span>
      </div>
      <div class="comparison-item percentile-comparison">
        <span class="comparison-icon">📊</span>
        <span class="comparison-text">Top 12% of Community</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="results-actions">
      <button class="text-button primary flashing" onclick="playAgain()">
        <span class="button-cursor">&gt;</span> Play Again <span class="button-cursor">&lt;</span>
      </button>

      <button class="text-button" onclick="submitScore()">Submit to Leaderboard</button>

      <button class="text-button" onclick="createChallenge()">Challenge a Friend</button>
    </div>
  </div>
</div>
```

#### CSS

```css
.results-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--black);
}

.results-content {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.comparison-section {
  margin: 30px 0 50px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: var(--font-size-base);
}

.comparison-icon {
  font-size: var(--font-size-lg);
}

.driver-comparison .comparison-text {
  color: var(--yellow);
}

.percentile-comparison .comparison-text {
  color: var(--white);
}

.results-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .comparison-section {
    margin: 20px 0 40px;
    gap: 12px;
  }

  .comparison-item {
    font-size: var(--font-size-sm);
  }

  .results-actions {
    gap: 12px;
  }
}
```

#### False Start Variant

```html
<div class="screen results-screen false-start">
  <div class="false-start-icon">⚠️</div>
  <div class="false-start-title">False Start!</div>
  <div class="false-start-message">You reacted too early</div>

  <button class="text-button primary flashing" onclick="playAgain()">Try Again</button>

  <button class="text-button" onclick="backToMenu()">Back to Menu</button>
</div>
```

```css
.false-start-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.false-start-title {
  color: var(--red);
  font-size: var(--font-size-2xl);
  margin-bottom: 16px;
  text-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
}

.false-start-message {
  color: var(--white);
  font-size: var(--font-size-base);
  margin-bottom: 50px;
  opacity: 0.8;
}
```

#### Challenge Result Variant

```html
<div class="challenge-result">
  <div class="result-banner winner">You Win!</div>

  <div class="time-comparison">
    <div class="time-row user-time">
      <span class="player-label">You:</span>
      <span class="player-time">0.186 sec</span>
    </div>
    <div class="time-row opponent-time">
      <span class="player-label">u/Opponent:</span>
      <span class="player-time">0.215 sec</span>
    </div>
  </div>

  <div class="margin-display">Won by <span class="margin-value">29</span> milliseconds</div>

  <div class="challenge-actions">
    <button class="text-button primary" onclick="challengeSomeoneElse()">
      Challenge Someone Else
    </button>
    <button class="text-button" onclick="backToMenu()">Back to Menu</button>
  </div>
</div>
```

```css
.result-banner {
  font-size: var(--font-size-2xl);
  padding: 20px;
  margin-bottom: 30px;
  border: 3px solid;
}

.result-banner.winner {
  color: var(--yellow);
  border-color: var(--yellow);
  background: rgba(255, 255, 0, 0.1);
  text-shadow: 0 0 20px rgba(255, 255, 0, 0.5);
}

.result-banner.loser {
  color: var(--gray-light);
  border-color: var(--gray-mid);
  background: rgba(128, 128, 128, 0.1);
}

.time-comparison {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--gray-dark);
}

.time-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-base);
}

.user-time .player-label,
.user-time .player-time {
  color: var(--yellow);
}

.opponent-time .player-label,
.opponent-time .player-time {
  color: var(--white);
}

.margin-display {
  font-size: var(--font-size-sm);
  color: var(--gray-light);
  margin-bottom: 40px;
}

.margin-value {
  color: var(--white);
  font-weight: bold;
}

.challenge-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
```

---

### 5.4 Leaderboard Screen

#### Layout Structure

```
┌─────────────────────────────────┐
│        LEADERBOARD              │  10% - Title
│                                 │
│  [GLOBAL] [r/FORMULA1]          │  10% - Scope filter
│  [DAILY] [WEEKLY] [ALL-TIME]    │  10% - Period filter
│                                 │
│  1  u/SpeedRacer    0.142 SEC   │
│  2  u/FastFingers   0.156 SEC   │  50% - Scores
│  3  u/Lightning     0.163 SEC   │  (scrollable)
│  ...                            │
│                                 │
│  Showing Top 100 of 5,432       │  10% - Stats
│                                 │
│         [BACK]                  │  10% - Navigation
└─────────────────────────────────┘
```

#### HTML Structure

```html
<div class="screen leaderboard-screen">
  <div class="leaderboard-header">
    <h2 class="screen-title">Leaderboard</h2>

    <div class="filter-group">
      <div class="filter-buttons scope-filter">
        <button class="filter-button active" data-scope="global">Global</button>
        <button class="filter-button" data-scope="subreddit">r/Formula1</button>
      </div>

      <div class="filter-buttons period-filter">
        <button class="filter-button" data-period="daily">Daily</button>
        <button class="filter-button" data-period="weekly">Weekly</button>
        <button class="filter-button active" data-period="alltime">All-Time</button>
      </div>
    </div>
  </div>

  <div class="leaderboard-content">
    <div class="leaderboard">
      <!-- Rows generated dynamically -->
    </div>
  </div>

  <div class="leaderboard-footer">
    <div class="leaderboard-stats">
      Showing Top <span class="stat-value">100</span> of <span class="stat-value">5,432</span>
    </div>

    <button class="text-button" onclick="backToMenu()">Back</button>
  </div>
</div>
```

#### CSS

```css
.leaderboard-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--black);
  padding: 20px;
}

.leaderboard-header {
  margin-bottom: 30px;
}

.screen-title {
  color: var(--yellow);
  font-size: var(--font-size-xl);
  text-align: center;
  margin-bottom: 30px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.filter-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.filter-button {
  background: transparent;
  border: 2px solid var(--gray-mid);
  color: var(--gray-light);
  padding: 8px 16px;
  font-size: var(--font-size-sm);
  font-family: inherit;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-button:hover {
  border-color: var(--white);
  color: var(--white);
}

.filter-button.active {
  border-color: var(--yellow);
  color: var(--yellow);
  background: rgba(255, 255, 0, 0.1);
}

.leaderboard-content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.leaderboard-footer {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  padding-top: 20px;
  border-top: 2px solid var(--gray-dark);
}

.leaderboard-stats {
  font-size: var(--font-size-sm);
  color: var(--gray-light);
}

.stat-value {
  color: var(--white);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .leaderboard-screen {
    padding: 15px 10px;
  }

  .screen-title {
    font-size: var(--font-size-lg);
  }

  .filter-buttons {
    gap: 8px;
  }

  .filter-button {
    padding: 6px 12px;
    font-size: var(--font-size-xs);
  }
}
```

---

### 5.5 Modal Overlays

#### How To Play Modal

```html
<div class="modal-overlay" onclick="closeModal()">
  <div class="modal-content" onclick="event.stopPropagation()">
    <h3 class="modal-title">How To Play</h3>

    <div class="instructions-list">
      <div class="instruction-step">
        <div class="step-number">1</div>
        <div class="step-text">Wait for lights to turn on one by one</div>
      </div>

      <div class="instruction-step">
        <div class="step-number">2</div>
        <div class="step-text">When all lights go out, click as fast as you can</div>
      </div>

      <div class="instruction-step">
        <div class="step-number">3</div>
        <div class="step-text">Don't click too early! That's a false start</div>
      </div>
    </div>

    <div class="tip-box">
      <div class="tip-icon">💡</div>
      <div class="tip-text">Tip: Use spacebar for faster reactions</div>
    </div>

    <button class="text-button primary" onclick="closeModal()">Got It</button>
  </div>
</div>
```

#### CSS

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--black);
  border: 3px solid var(--white);
  padding: 40px 30px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  color: var(--yellow);
  font-size: var(--font-size-lg);
  text-align: center;
  margin-bottom: 30px;
}

.instructions-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 30px;
}

.instruction-step {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.step-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 2px solid var(--yellow);
  color: var(--yellow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-base);
}

.step-text {
  color: var(--white);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.tip-box {
  background: rgba(255, 255, 0, 0.1);
  border: 2px solid var(--yellow);
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 30px;
}

.tip-icon {
  font-size: var(--font-size-xl);
  flex-shrink: 0;
}

.tip-text {
  color: var(--white);
  font-size: var(--font-size-sm);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .modal-content {
    padding: 30px 20px;
  }

  .modal-title {
    font-size: var(--font-size-base);
  }

  .instructions-list {
    gap: 20px;
  }

  .step-number {
    width: 28px;
    height: 28px;
    font-size: var(--font-size-sm);
  }

  .step-text,
  .tip-text {
    font-size: var(--font-size-xs);
  }
}
```

---

## 6. Animation & Feedback System

### 6.1 Screen Flash Effects

```javascript
function flashScreen(color, duration = 200) {
  const overlay = document.createElement('div');
  overlay.className = 'flash-overlay';
  overlay.style.setProperty('--flash-color', color);
  overlay.style.setProperty('--flash-duration', `${duration}ms`);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), duration);
}

// Usage
flashScreen('#FFD700', 200); // Gold flash for perfect
flashScreen('#FFFF00', 200); // Yellow flash for excellent
flashScreen('#FF0000', 300); // Red flash for false start
```

```css
.flash-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--flash-color);
  opacity: 0;
  pointer-events: none;
  z-index: 9999;
  animation: flashAnimation var(--flash-duration) ease-out;
}

@keyframes flashAnimation {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 0;
  }
}
```

### 6.2 Screen Transitions

```javascript
function transitionTo(screenId) {
  const currentScreen = document.querySelector('.screen.active');
  const nextScreen = document.getElementById(screenId);

  currentScreen.classList.add('exiting');

  setTimeout(() => {
    currentScreen.classList.remove('active', 'exiting');
    nextScreen.classList.add('active', 'entering');

    setTimeout(() => {
      nextScreen.classList.remove('entering');
    }, 300);
  }, 300);
}
```

```css
.screen {
  display: none;
  opacity: 0;
  transform: translateY(20px);
}

.screen.active {
  display: flex;
}

.screen.entering {
  animation: screenEnter 0.3s ease-out forwards;
}

.screen.exiting {
  animation: screenExit 0.3s ease-out forwards;
}

@keyframes screenEnter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes screenExit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}
```

---

## 7. Responsive Design Guidelines

### 7.1 Breakpoints

```css
/* Mobile first approach */
:root {
  --container-padding: 20px;
  --element-gap: 16px;
}

/* Tablet: 641px and up */
@media (min-width: 641px) {
  :root {
    --container-padding: 40px;
    --element-gap: 20px;
  }
}

/* Desktop: 1024px and up */
@media (min-width: 1024px) {
  :root {
    --container-padding: 60px;
    --element-gap: 24px;
  }
}
```

### 7.2 Touch Targets

```css
/* Minimum 44x44px touch targets for mobile */
.text-button,
.filter-button,
.leaderboard-row {
  min-height: 44px;
  min-width: 44px;
}

/* Add extra padding for comfortable tapping */
@media (max-width: 640px) {
  .text-button {
    padding: 12px 24px;
  }
}
```

### 7.3 Font Scaling

```css
/* Base font size scales with viewport */
html {
  font-size: 14px;
}

@media (min-width: 641px) {
  html {
    font-size: 16px;
  }
}

@media (min-width: 1024px) {
  html {
    font-size: 18px;
  }
}
```

---

## 8. Accessibility Guidelines

### 8.1 Keyboard Navigation

```javascript
// Global keyboard handler
document.addEventListener('keydown', (e) => {
  const activeScreen = getActiveScreen();

  switch (activeScreen) {
    case 'splash':
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        startGame();
      }
      break;

    case 'game':
      if (e.key === ' ') {
        e.preventDefault();
        handleReaction();
      }
      break;

    case 'results':
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        playAgain();
      }
      if (e.key === 'Escape') {
        backToMenu();
      }
      break;
  }
});
```

### 8.2 ARIA Labels

````html
<button class="text-button primary" aria-label="Start new game" role="button">Press Start</button>

<div class="lights-container" role="status" aria-live="polite" aria-label="Starting lights">
  <!-- lights -->
</div>

<div class="result-time" role="status" aria-live="assertive" aria-label="Your reaction time">
  # UI/UX Guide v2: F1 Start Challenge **Authentic Pole Position Aesthetic for Modern Web** --- ##
  1. Design Philosophy: Arcade Minimalism ### 1.1 Core Principle **"Every pixel serves the
  gameplay."** This is not a modern web app with arcade styling—this is an authentic 1982 arcade
  experience translated to modern browsers. We prioritize: - **Instant readability** over decorative
  elements - **High contrast** over subtle gradients - **Immediate feedback** over smooth
  transitions - **Functional layout** over creative experimentation ### 1.2 Historical Context
  Namco's *Pole Position* (1982) was designed for dimly-lit arcade environments with CRT displays.
  Colors had to pop, text had to be legible from 3 feet away, and every element needed to withstand
  the visual noise of a busy arcade. We honor these constraints even though our canvas is a
  smartphone screen. --- ## 2. Typography System ### 2.1 Font Family **Primary Font:** `"Press Start
  2P", monospace` **Fallback Stack:** ```css font-family: "Press Start 2P", "Courier New", Courier,
  monospace;
</div>
````

**Why This Font:**

- Authentic 8-bit bitmap aesthetic
- Excellent readability at small sizes
- Web-safe via Google Fonts
- Zero licensing issues

**Loading Strategy:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
  rel="stylesheet"
/>
```

### 2.2 Type Scale

```css
:root {
  /* Base size: 16px on desktop, 14px on mobile */
  --font-size-xs: 0.75rem; /* 12px - Small labels */
  --font-size-sm: 0.875rem; /* 14px - Secondary text */
  --font-size-base: 1rem; /* 16px - Body text */
  --font-size-lg: 1.25rem; /* 20px - Section headers */
  --font-size-xl: 1.5rem; /* 24px - Screen titles */
  --font-size-2xl: 2rem; /* 32px - Important numbers */
  --font-size-3xl: 3rem; /* 48px - Hero text (reaction time) */
}
```

### 2.3 Typography Rules

**MANDATORY:**

- ✅ ALL TEXT MUST BE UPPERCASE
- ✅ No font smoothing or anti-aliasing
- ✅ Letter spacing: 0.05em minimum
- ✅ Line height: 1.4-1.6 for readability

**CSS Implementation:**

```css
body {
  font-family: 'Press Start 2P', monospace;
  text-transform: uppercase;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  font-smooth: never;
  letter-spacing: 0.05em;
  line-height: 1.5;
}
```

**FORBIDDEN:**

- ❌ Mixed case text
- ❌ Italic or oblique styles
- ❌ Multiple font families
- ❌ Text shadows (except light glow effects)

---

## 3. Color System

### 3.1 Core Palette

```css
:root {
  /* Primary Colors */
  --black: #000000; /* Background */
  --white: #ffffff; /* Primary text */
  --yellow: #ffff00; /* Highlights, success */
  --red: #ff0000; /* Danger, lights */

  /* Secondary Colors */
  --gray-dark: #202020; /* Light off state */
  --gray-mid: #808080; /* Borders, disabled */
  --gray-light: #c0c0c0; /* Secondary text */

  /* Accent Colors */
  --gold: #ffd700; /* Perfect rating */
  --cyan: #00ffff; /* Info (sparingly) */
  --green: #00ff00; /* Brief success flash only */
  --magenta: #ff00ff; /* Warnings/flags */
}
```

### 3.2 Color Usage Guidelines

#### Background Colors

- **Primary background:** Always `#000000` (pure black)
- **Never use:** Dark grays, gradients, textures
- **Exception:** Semi-transparent overlays for modals (`rgba(0, 0, 0, 0.9)`)

#### Text Colors

- **Default text:** `#FFFFFF` (white)
- **Emphasis:** `#FFFF00` (yellow)
- **De-emphasis:** `#808080` (gray)
- **Error state:** `#FF0000` (red)

**Example Hierarchy:**

```css
.title {
  color: var(--yellow); /* Important */
  font-size: var(--font-size-xl);
}

.body-text {
  color: var(--white); /* Standard */
  font-size: var(--font-size-base);
}

.subtitle {
  color: var(--gray-light); /* Less important */
  font-size: var(--font-size-sm);
}
```

#### Interactive Elements

- **Default state:** White border, transparent background
- **Hover state:** White background with 10% opacity
- **Active state:** White background with 20% opacity
- **Disabled state:** Gray border, 50% opacity

**CRITICAL: No color-coded buttons.** Text and position indicate function, not color.

---

## 4. Component Library

### 4.1 Starting Lights (Primary Component)

#### Structure

```html
<div class="lights-container">
  <div class="light" data-index="0"></div>
  <div class="light" data-index="1"></div>
  <div class="light" data-index="2"></div>
  <div class="light" data-index="3"></div>
  <div class="light" data-index="4"></div>
</div>
```

#### Styling

```css
.lights-container {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.light {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--gray-dark);
  border: 3px solid #404040;
  position: relative;
  transition:
    background-color 0.05s ease-out,
    box-shadow 0.05s ease-out,
    transform 0.05s ease-out;
  will-change: background-color, box-shadow, transform;
}

.light.on {
  background: var(--red);
  border-color: #ff3333;
  box-shadow:
    0 0 20px rgba(255, 0, 0, 0.8),
    0 0 40px rgba(255, 0, 0, 0.5),
    0 0 60px rgba(255, 0, 0, 0.3),
    inset 0 0 15px rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .lights-container {
    gap: 12px;
    padding: 20px 10px;
  }

  .light {
    width: 50px;
    height: 50px;
    border-width: 2px;
  }
}
```

#### Animation Sequence

```javascript
// CORRECT: Accumulating lights
async function startLightSequence() {
  for (let i = 0; i < 5; i++) {
    await sleep(900); // 900ms interval
    lights[i].classList.add('on');
    playBeep(BEEP_FREQUENCIES[i]);
  }

  // Random delay
  const delay = 500 + Math.random() * 2000;
  await sleep(delay);

  // All off simultaneously
  lights.forEach((light) => light.classList.remove('on'));
  return performance.now(); // Return exact timestamp
}
```

---

### 4.2 Text Button

#### Structure

```html
<button class="text-button primary">
  <span class="button-label">Press Start</span>
</button>
```

#### Styling

```css
.text-button {
  background: transparent;
  border: 2px solid var(--white);
  color: var(--white);
  padding: 12px 24px;
  font-size: var(--font-size-base);
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition:
    background-color 0.1s,
    transform 0.05s;
  position: relative;
}

.text-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.text-button:active {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(2px);
}

.text-button:disabled {
  border-color: var(--gray-mid);
  color: var(--gray-mid);
  cursor: not-allowed;
  opacity: 0.5;
}

/* Primary variant - larger, more prominent */
.text-button.primary {
  border-width: 3px;
  padding: 16px 32px;
  font-size: var(--font-size-lg);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .text-button {
    padding: 10px 20px;
    font-size: var(--font-size-sm);
  }

  .text-button.primary {
    padding: 14px 28px;
    font-size: var(--font-size-base);
  }
}
```

#### Flashing Animation (for primary CTA)

```css
@keyframes buttonFlash {
  0%,
  49% {
    border-color: var(--white);
    color: var(--white);
  }
  50%,
  100% {
    border-color: var(--yellow);
    color: var(--yellow);
  }
}

.text-button.flashing {
  animation: buttonFlash 1s steps(1) infinite;
}
```

---

### 4.3 HUD Text Display

#### Structure

```html
<div class="hud-bar">
  <div class="hud-item">
    <span class="hud-label">Best:</span>
    <span class="hud-value">0.186s</span>
  </div>
  <div class="hud-item">
    <span class="hud-label">Last:</span>
    <span class="hud-value">0.215s</span>
  </div>
</div>
```

#### Styling

```css
.hud-bar {
  display: flex;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--black);
  border-bottom: 2px solid var(--gray-mid);
}

.hud-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.hud-label {
  color: var(--gray-light);
  font-size: var(--font-size-xs);
}

.hud-value {
  color: var(--white);
  font-size: var(--font-size-sm);
}

.hud-value.highlight {
  color: var(--yellow);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .hud-bar {
    padding: 12px 16px;
  }

  .hud-item {
    gap: 6px;
  }
}
```

---

### 4.4 Result Display

#### Large Time Display

```html
<div class="result-time">
  <div class="time-value">0.186</div>
  <div class="time-unit">sec</div>
</div>
```

```css
.result-time {
  text-align: center;
  padding: 40px 20px;
}

.time-value {
  color: var(--yellow);
  font-size: var(--font-size-3xl);
  line-height: 1;
  margin-bottom: 8px;
  text-shadow: 0 0 20px rgba(255, 255, 0, 0.5);
}

.time-unit {
  color: var(--white);
  font-size: var(--font-size-base);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .result-time {
    padding: 30px 15px;
  }

  .time-value {
    font-size: var(--font-size-2xl);
  }

  .time-unit {
    font-size: var(--font-size-sm);
  }
}
```

#### Rating Display

```html
<div class="rating-display rating-perfect">★★★ Perfect! ★★★</div>
```

```css
.rating-display {
  text-align: center;
  padding: 16px;
  font-size: var(--font-size-lg);
  margin: 20px 0;
}

.rating-perfect {
  color: var(--gold);
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
}

.rating-excellent {
  color: var(--yellow);
}

.rating-good {
  color: var(--white);
}

.rating-slow {
  color: var(--gray-light);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .rating-display {
    font-size: var(--font-size-base);
    padding: 12px;
  }
}
```

---

### 4.5 Leaderboard Table

#### Structure

```html
<div class="leaderboard">
  <div class="leaderboard-row rank-1">
    <span class="rank">1</span>
    <span class="username">u/SpeedRacer</span>
    <span class="time">0.142 sec</span>
  </div>
  <div class="leaderboard-row rank-user">
    <span class="rank">12</span>
    <span class="username">u/You</span>
    <span class="time">0.186 sec</span>
  </div>
  <!-- more rows -->
</div>
```

#### Styling

```css
.leaderboard {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 50px 1fr 100px;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--gray-dark);
  align-items: center;
  transition: background-color 0.2s;
}

.leaderboard-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.rank {
  color: var(--gray-light);
  font-size: var(--font-size-sm);
  text-align: right;
}

.username {
  color: var(--white);
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  color: var(--white);
  font-size: var(--font-size-sm);
  text-align: right;
}

/* Special ranks */
.rank-1 .rank,
.rank-1 .username,
.rank-1 .time {
  color: var(--gold);
}

.rank-2 .rank,
.rank-2 .username,
.rank-2 .time {
  color: var(--gray-light);
}

.rank-3 .rank,
.rank-3 .username,
.rank-3 .time {
  color: #cd7f32; /* Bronze */
}

.rank-user {
  background: rgba(255, 255, 0, 0.1);
  border: 1px solid var(--yellow);
}

.rank-user .rank,
.rank-user .username,
.rank-user .time {
  color: var(--yellow);
}

/* Flagged scores */
.rank-flagged .time::after {
  content: ' ⚠';
  color: var(--magenta);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .leaderboard {
    padding: 15px 10px;
  }

  .leaderboard-row {
    grid-template-columns: 40px 1fr 80px;
    gap: 8px;
    padding: 10px 6px;
  }

  .rank,
  .username,
  .time {
    font-size: var(--font-size-xs);
  }
}
```
