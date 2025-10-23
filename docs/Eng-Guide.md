# Engineering Guide: F1 Start Challenge

## 1. Overview

This document provides the technical implementation plan for the F1 Start Challenge Devvit Web application. Its purpose is to guide developers through the architecture, key components, data management, and integration points necessary to build, test, and submit the project successfully for the Reddit & Kiro Hackathon.

## 2. Tech Stack & Initial Setup

- **Platform:** Reddit Developer Platform (Devvit Web)
- **Core Framework:** React (via Devvit template) with TypeScript
- **State Management:** React Hooks (`useState`, `useRef`, `useReducer` if needed)
- **Storage:** Reddit Key-Value (KV) Storage
- **Developer Workflow:** Kiro
- **Version Control:** Git & GitHub

### Initial Project Scaffolding

Get started by using the official Devvit CLI to create a new project from a React template.

```bash
npm create @reddit/devvit@latest
# Follow the prompts, selecting a React-based template.
cd your-project-name
npm install
```

## 3. Project Structure

A clean and organized file structure is crucial for rapid development.

````
.
├── .kiro/
│   ├── specs/
│   │   └── game-states.kiro.spec  // Defines UI states for Kiro
│   ├── hooks/
│   │   └── timing-control.kiro.hook // Intercepts RNG/timing for testing
│   └── steer/
│       └── game-tuning.kiro.steer   // UI for live-tuning game variables
├── public/
├── src/
│   ├── components/                // React components
│   │   ├── App.tsx                // Main application component
│   │   ├── SplashScreen.tsx
│   │   ├── GameCanvas.tsx         // Core game logic and UI
│   │   └── ResultsScreen.tsx
│   ├── data/
│   │   └── drivers.json           // Static driver data
│   ├── hooks/                     // Custom React hooks
│   │   └── useGameLogic.ts
│   ├── styles/
│   │   └── main.css
│   └── utils/                     // Helper functions
│       ├── timing.ts              // high-res timer functions
│       └── random.ts              // Seeded RNG for challenges
└── devvit.yaml```

## 4. Core Component Implementation

### 4.1. `App.tsx` - The State Orchestrator
This component will manage the overall game state and render the appropriate component.

*   **State Management:** Use a state variable to manage the current view.
    ```typescript
    type GameState = 'splash' | 'playing' | 'result';
    const [gameState, setGameState] = useState<GameState>('splash');
    ```
*   **Responsibilities:**
    *   Renders `SplashScreen` when `gameState` is 'splash'.
    *   Renders `GameCanvas` when `gameState` is 'playing'.
    *   Renders `ResultsScreen` when `gameState` is 'result', passing down the final time.
    *   Holds the result of a game run to pass to the `ResultsScreen`.

### 4.2. `GameCanvas.tsx` - The Heart of the Game
This component contains the most critical logic: the light sequence, input handling, and timing.

*   **Timing Precision:** Use `performance.now()` for all timing measurements. It provides sub-millisecond precision and is monotonic, meaning it's not affected by system time changes. A `useRef` is ideal for storing the start time to prevent re-renders.
    ```typescript
    const lightsOutAt = useRef<number | null>(null);

    const handlePlayerInput = () => {
        const inputTime = performance.now();
        if (lightsOutAt.current === null) {
            // False Start!
            setResult({ type: 'false_start' });
        } else {
            const reactionTime = inputTime - lightsOutAt.current;
            setResult({ type: 'success', time: reactionTime });
        }
    };
    ```

*   **Light Sequence:** Use `useEffect` with `setTimeout` to manage the animation sequence. Clean up timers on component unmount to prevent memory leaks.

    ```typescript
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        // Logic to turn on lights one-by-one
        // ...
        const randomDelay = getDeterministicDelay(seed); // From utils
        const lightsOutTimer = setTimeout(() => {
            lightsOutAt.current = performance.now();
            // Set state to turn lights off in UI
        }, 2000 + randomDelay); // e.g., 2s base + random delay

        timers.push(lightsOutTimer);

        return () => timers.forEach(clearTimeout); // Cleanup
    }, [seed]); // Re-run effect if the seed changes (for challenges)
    ```

### 4.3. `utils/random.ts` - Deterministic RNG
For the pseudo-synchronous challenge mode to work, the random delay must be identical for both players. This requires a seeded pseudo-random number generator (PRNG). Do not use `Math.random()`.

```typescript
// A simple Linear Congruential Generator (LCG) is sufficient.
function seededRandom(seed: number): number {
  let state = seed;
  return function() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Generate a new seed for each new "host" game
export const createNewSeed = () => new Date().getTime();

// Get a delay within a specific range using the seeded RNG
export function getDeterministicDelay(seed: number, minMs: number, maxMs: number): number {
  const random = seededRandom(seed)();
  return minMs + Math.floor(random * (maxMs - minMs));
}
````

## 5. Data Models & KV Storage Interaction

Define clear TypeScript interfaces for all data structures.

```typescript
interface LeaderboardEntry {
  user: string;
  time_ms: number;
  timestamp: string; // ISO 8601
}

interface Challenge {
  creator: string;
  reaction_ms: number;
  seed: number;
  createdAt: string; // ISO 8601
}
```

### Leaderboard Read-Modify-Write Pattern

To handle potential race conditions when writing to the leaderboard, use an optimistic "read-modify-write" approach.

```typescript
import { kv } from '@reddit/devvit-sdk';

async function submitToLeaderboard(newEntry: LeaderboardEntry): Promise<void> {
  const LEADERBOARD_KEY = 'leaderboard:global';
  const MAX_ENTRIES = 100;

  try {
    // 1. Read
    const currentBoard = (await kv.get(LEADERBOARD_KEY)) as LeaderboardEntry[] | undefined;
    const board = currentBoard || [];

    // 2. Modify
    board.push(newEntry);
    board.sort((a, b) => a.time_ms - b.time_ms);
    const updatedBoard = board.slice(0, MAX_ENTRIES);

    // 3. Write
    await kv.set(LEADERBOARD_KEY, updatedBoard);
  } catch (error) {
    console.error('Failed to write to leaderboard:', error);
    // Handle error gracefully in the UI
  }
}
```

## 6. Kiro Integration - A Practical Guide

This integration is critical for the "Best Kiro Developer Experience" award.

**Step 1: Define Game States in a Spec (`.kiro/specs/game-states.kiro.spec`)**

```
# Defines the possible states of the game UI for easy visualization in Kiro.
spec game-states:
  - Splash: The initial welcome screen.
  - LightsOn: The F1 lights are animating on.
  - AwaitingInput: The lights are out, waiting for the player to react.
  - Result: The screen showing the player's reaction time.
  - FalseStart: The screen shown after a false start.
```

**Step 2: Create a Hook to Intercept Timing (`.kiro/hooks/timing-control.kiro.hook`)**
This allows Kiro to override the random delay for testing specific scenarios.

```javascript
// In your game's timing utility
let delayOverride = null;
export function getDeterministicDelay(seed, min, max) {
  if (delayOverride !== null) return delayOverride;
  // ... original seeded RNG logic
}

// In the Kiro hook
kiro.hook('setDelayOverride', (ms) => {
  // This function will be callable from Kiro's steering panel
  delayOverride = ms;
});
```

**Step 3: Build a Steering Panel (`.kiro/steer/game-tuning.kiro.steer`)**
This creates a custom UI inside the Kiro IDE for live-tuning the game.

```
# Provides a live control panel for tuning game mechanics without reloading.
steer game-tuning:
  - header: Game Timing Control
  - slider:
      id: delay_override
      label: Force Light Delay (ms)
      min: 50
      max: 3000
      step: 10
      on_change: -> kiro.call_hook('setDelayOverride', @value)
  - button:
      label: Reset Delay to Random
      on_click: -> kiro.call_hook('setDelayOverride', null)
  - header: Data Generation
  - button:
      label: Populate Leaderboard with 50 entries
      on_click: -> kiro.call_hook('generateLeaderboardData', { count: 50 })
```

This steering panel provides immense value by allowing instant iteration on game feel and easy setup for testing UI components that rely on data.

## 7. Key Technical Challenges & Solutions

- **Anti-Cheat:** Implement basic, client-side sanity checks. Any reaction time under a humanly possible threshold (e.g., 80-100ms) should be flagged and not submitted to the leaderboard. This is a sufficient measure for the hackathon's scope.
  ```typescript
  if (reactionTime < 80) {
    // Show the time to the user but disable leaderboard submission
    console.warn(`Implausible time detected: ${reactionTime}ms`);
    return;
  }
  ```
- **Asset Loading:** Keep images and fonts optimized to ensure the custom splash screen appears quickly, maximizing user retention.
- **Error Handling:** Gracefully handle failures with the KV Store (e.g., if a read or write fails). Display a non-intrusive error message to the user ("Could not load leaderboard, please try again later.")

## 8. Hackathon Sprint Plan

- **Day 1: Foundation & Core Loop.**

  - Set up the Devvit project with the file structure.
  - Implement the `SplashScreen` and `GameCanvas` components.
  - Build the core timing logic and light animation sequence.
  - **Goal:** A playable, single-player game with accurate timing.

- **Day 2: Data & Persistence.**

  - Implement the `ResultsScreen`.
  - Create the static `drivers.json` and integrate the comparison logic.
  - Implement the leaderboard KV store logic (read/write).
  - **Goal:** Players can see their results and submit them to a persistent global leaderboard.

- **Day 3: Community & Challenges.**

  - Implement the deterministic RNG (`seededRandom`).
  - Build the "Create Challenge" flow, saving a challenge object to the KV store.
  - Build the "Accept Challenge" flow, including the side-by-side "ghost" replay UI.
  - **Goal:** The pseudo-synchronous multiplayer is fully functional.

- **Day 4: Polish & Kiro.**

  - Focus on UI polish: CSS animations, responsive design, and accessibility checks.
  - Fully implement the Kiro spec, hook, and steering panel.
  - Record a <3 minute video demonstrating the Kiro workflow improvements.
  - **Goal:** The app is feature-complete, looks great, and the Kiro submission materials are ready.

- **Day 5: Final Testing & Submission.**
  - Conduct thorough end-to-end testing on multiple devices/browsers.
  - Write the `README.md`, finalize the submission text, and double-check all hackathon requirements.
  - Deploy the app and create the public demo post.
  - **Goal:** Submit the project with confidence.
