# Product Requirements Document: F1 Start Challenge

## 1. Executive Summary

**F1 Start Challenge** is a polished, bite-sized reaction time game for Reddit's Developer Platform. Built using **Devvit Web**, the game challenges redditors to test their reflexes against the iconic Formula 1 starting lights. The core gameplay is a single-player loop, but the experience is amplified through community-focused features like persistent leaderboards, head-to-head "pseudo-synchronous" challenges, and "Pro vs. Community" performance comparisons. The project is strategically designed to compete for top honors in the **Community Play** and **Best Kiro Developer Experience** categories of the Reddit & Kiro Hackathon.

## 2. The Opportunity & Strategic Alignment

### 2.1. The Problem

Reddit's feed is a competitive space for attention. To succeed, a game must be instantly understandable, visually striking, and provide a compelling reason for repeat engagement. Many web games are too complex or require too much time, failing to capture the "in-and-out" nature of feed browsing.

### 2.2. Our Solution

The F1 Start Challenge is designed around the core principles of successful Reddit Community Games:

- **Bite-Sized:** A single gameplay loop takes less than 10 seconds, respecting the user's time and encouraging quick, repeated plays. [cite: Games-Guide.md]
- **Designed for the Feed:** The F1 starting lights are universally recognized and create a visually arresting first impression within the interactive post. [cite: Games-Guide.md]
- **Content Flywheel:** The game generates its own content through two mechanisms:
  1.  **Player-Generated Content:** The "Challenge" feature allows players to create new, shareable gameplay posts.
  2.  **Scheduled Content:** Daily and weekly leaderboards automatically refresh, creating a consistent reason for the community to return. [cite: Games-Guide.md]
- **Asynchronous & Scalable:** The core loop is single-player, while the "pseudo-synchronous" multiplayer and leaderboards allow for massive, asynchronous community interaction. The game is equally fun for 1 or 1,000 players. [cite: Games-Guide.md]

## 3. Goals & Success Criteria

### 3.1. Primary Goals

1.  **Win "Best Game - Community Play":** Create a deeply engaging social experience through leaderboards and challenges that bring redditors together. [cite: Hackathon-Base.md]
2.  **Win "Best Kiro Developer Experience":** Demonstrate a creative and significant improvement in development workflow through the strategic use of Kiro's specs, hooks, and steering. [cite: Hackathon-Base.md]
3.  **Achieve "Polish":** Deliver an app that is Beta/GA ready, featuring a custom splash screen, responsive design, and a delightful, bug-free UX to score maximum points with judges. [cite: Hackathon-Base.md]

### 3.2. Success Metrics

- **Engagement:** High ratio of "Play Again" taps per session.
- **Virality:** High number of challenges created and accepted per day.
- **Community:** Daily active users submitting scores to the leaderboard.
- **Kiro Submission:** A comprehensive video and write-up demonstrating tangible development efficiency gains.

## 4. Feature Specification

### 4.1. Core Gameplay Loop (Must-Have)

#### 4.1.1. Custom Splash Screen

- **Description:** The initial view of the interactive post before the game starts. This is a mandatory element for scoring high on "Polish." [cite: Hackathon-Base.md]
- **User Story:** As a new player, I want to see a clear, branded entry screen that tells me what the game is and invites me to play.
- **Requirements:**
  - "F1 Start Challenge" branding/logo.
  - A concise tagline: "Test your reaction time against the pros."
  - Primary CTA: "START RACE"
  - Secondary buttons: "Leaderboard," "How to Play."

#### 4.1.2. F1 Starting Light Sequence

- **Description:** The central game mechanic. An authentic, five-light animated sequence.
- **User Story:** As a player, I want to experience an authentic F1 start sequence to test my reaction.
- **Requirements:**
  - Five red lights animate, turning on one by one with a 1-second interval.
  - Once all five lights are on, there is a randomized delay (e.g., between 0.2 and 3.0 seconds).
  - After the delay, all five lights extinguish simultaneously. This moment is `lightsOutAt`.
  - The timing must use `performance.now()` for high-resolution accuracy.

#### 4.1.3. Reaction Timing & False Start Detection

- **Description:** Precisely measuring the player's reaction time and handling jump starts.
- **User Story:** As a player, I expect my reaction time to be measured accurately in milliseconds, and to be penalized if I start too early.
- **Requirements:**
  - The game listens for a click/tap or a keypress (Spacebar).
  - If input is received _before_ `lightsOutAt`, the game immediately ends, displaying a "False Start" message.
  - If input is received _after_ `lightsOutAt`, the reaction time is calculated as `reactionTime = inputAt - lightsOutAt`.
  - A small debounce/cooldown (e.g., 500ms) should prevent accidental double-taps from restarting the game instantly.

#### 4.1.4. Results Screen

- **Description:** A modal or screen that displays the player's performance and encourages re-engagement.
- **User Story:** As a player, after I react, I want to see my time immediately, understand how it compares to others, and decide what to do next.
- **Requirements:**
  - Display reaction time in milliseconds (e.g., "215 ms").
  - Display "False Start" if applicable.
  - Show comparison data (see 4.2.1. Driver Cards).
  - CTAs: "Play Again," "Submit to Leaderboard," "Create Challenge."

### 4.2. Community & Social Features (Must-Have for Community Play Award)

#### 4.2.1. Driver Cards & Community Percentile

- **Description:** A static dataset of simulated pro driver reaction times to provide context for the player's score.
- **User Story:** As a player, I want to know if my reaction time is good, so comparing it to F1 drivers makes it more meaningful.
- **Requirements:**
  - A bundled `drivers.json` file with simulated data (e.g., `{"name": "Max Verstappen", "avg_reaction_ms": 180}`).
  - The results screen will show the player's time relative to these drivers (e.g., "Faster than Hamilton, slower than Verstappen").
  - It will also calculate and display a community percentile based on leaderboard data (e.g., "Faster than 88% of r/formula1").

#### 4.2.2. Persistent Leaderboards

- **Description:** Global and subreddit-specific leaderboards using Reddit's Key-Value (KV) Storage.
- **User Story:** As a competitive player, I want to submit my best time to a leaderboard to see how I rank against my community and everyone on Reddit.
- **Requirements:**
  - Players can submit their score from the results screen. A consent confirmation ("Your username will be public") must be shown.
  - The leaderboard will have filterable views: Global vs. Subreddit, and Daily / Weekly / All-Time.
  - The KV store will hold a sorted list of the top 100 entries to manage storage size.
  - **Concurrency Handling:** The write logic must be optimistic. It will read the current leaderboard, insert the new score, re-sort, trim to 100, and then write it back. This minimizes the risk of race conditions.

#### 4.2.3. Pseudo-Synchronous Multiplayer Challenge

- **Description:** The key feature for demonstrating "Community Play." A player can challenge another to a deterministic, re-playable race that feels live.
- **User Story:** As a player, I want to directly challenge my friend to prove my reaction time is better than theirs.
- **Requirements:**

  1.  **Challenge Creation:** Player A completes a run and clicks "Create Challenge."
  2.  **Data Storage:** The app generates a unique challenge ID and stores an object in the KV store with a TTL (e.g., 7 days). The object contains: `{ creator: "u/PlayerA", reaction_ms: 215, seed: 123456 }`. The `seed` is crucial for a deterministic (identical) light delay for the opponent.
  3.  **Challenge Acceptance:** A new post is created or a link is shared. Player B clicks "Accept Challenge."
  4.  **The "Race":** The app loads the challenge object. Player B's game uses the _same seed_, ensuring the light delay is identical to Player A's. The UI displays an animation of Player A's "ghost" reaction alongside Player B's live run.
  5.  **Results:** A final screen shows both reaction times side-by-side and declares a winner.

- **Pro/Con Analysis:**
  - **Pro:** This innovative approach provides a compelling real-time feel without requiring WebSockets or a dedicated backend server, staying within the Devvit platform's constraints. It's a creative solution judges will appreciate.
  - **Con:** It is not truly live, which may be apparent to some users. This is a necessary trade-off for platform compatibility. We will be transparent about this in the documentation.

### 4.3. Polish & UX (Must-Have for "Delightful UX" Criteria)

- **Responsive Design:** The UI must be fully functional and look great on web, iOS, and Android Reddit clients.
- **Subtle Audio:** Optional, opt-in sound effects for light sequences and results to enhance immersion.
- **Accessibility:**
  - High-contrast color scheme for lights.
  - Keyboard accessibility (Spacebar for start/react).
  - ARIA labels for all interactive elements.
- **Animations:** Smooth, GPU-accelerated CSS animations for lights and screen transitions.

## 5. Kiro Developer Experience Strategy

This project will treat Kiro as a core part of the development and testing workflow, not an add-on. The submission video and write-up will focus on these key areas:

#### 5.1. **Problem:** Manual Testing is Slow and Repetitive

- Tuning the random delay for the lights requires changing code and reloading.
- Testing specific edge cases like false starts or impossibly fast reactions is difficult to reproduce consistently.
- Populating the leaderboard with test data is tedious.

#### 5.2. **Kiro Solution:**

1.  **Live Tuning with Steering:**

    - A steering file (`/steer/game-tuning.kiro.steer`) will be created to expose variables like `minDelay`, `maxDelay`, and `gameMode` to the Kiro IDE.
    - **Demonstration:** The video will show a developer live-adjusting the delay range with a slider in the Kiro UI and seeing the changes instantly in the game without a reload, dramatically speeding up the process of finding the "sweet spot" for gameplay.

2.  **Reproducible States with Specs and Hooks:**

    - Specs will define all possible game states: `Splash`, `LightsOn`, `AwaitingInput`, `Result`, `FalseStart`.
    - A hook (`/hooks/timing-control.kiro.hook`) will intercept the game's timing and RNG functions.
    - **Demonstration:** The video will show how to use Kiro to force a specific delay (e.g., exactly 500ms) or to simulate a user click at a precise moment (e.g., 10ms before lights out) to reliably reproduce and debug the false start logic.

3.  **Automated Test Data Generation:**
    - A steering script will include a function to `generateLeaderboard(n=50)`.
    - **Demonstration:** The video will show the developer clicking a single button in Kiro to populate the KV leaderboard with 50 realistic-looking entries, enabling immediate testing of the leaderboard UI and logic.

#### 5.3. **Impact & Submission Requirements**

- **Quantifiable Gain:** "Kiro reduced our iteration and testing cycle for gameplay tuning from minutes to seconds."
- **Repository:** The public GitHub repo will include the `/.kiro` directory, which will **not** be in `.gitignore`. [cite: Hackathon-Base.md]
- **Video:** A concise <3 minute video will be produced demonstrating the three points above, making it clear how Kiro provided a creative solution that significantly improved the developer experience. [cite: Hackathon-Base.md]

## 6. Technical Architecture

- **Frontend:** Devvit Web (using React from a template).
- **State Management:** React Hooks (useState, useContext).
- **Storage:** Reddit's built-in Key-Value (KV) Storage for all persistent data (leaderboards, challenges). No external database is required.
- **Assets:** All assets (images, fonts, JSON data) will be bundled with the application.
- **Anti-Cheat:**
  - **Client-Side Validation:** The app will discard impossibly fast reaction times (e.g., < 80ms) as they are likely bots or glitches.
  - **Rate Limiting:** Leaderboard submissions will be rate-limited per user to prevent spam.
  - **Tradeoff:** Perfect anti-cheat is impossible in a client-side game. This approach provides a reasonable deterrent for a hackathon project, relying on plausibility checks and community moderation.

## 7. Post-Hackathon Vision: Sustaining Success

This project is not just for a hackathon. If successful, it can be expanded via Reddit's developer programs.

- **Reddit Developer Funds:** The game's content flywheel and addictive loop are designed to drive viewership and create a new community (e.g., r/F1StartChallenge), making it eligible for rewards. [cite: Hackathon-Base.md]
- **Payments API:** Future iterations could introduce premium cosmetic features (e.g., different car themes, light colors) using the Payments sandbox APIs, creating a monetization path. [cite: Hackathon-Base.md]

## 8. Final Submission Checklist

- [ ] **App Listing:** Link to the app on developer.reddit.com.
- [ ] **Demo Post:** Link to a public post in a dedicated subreddit running the game.
- [ ] **Open Source Repo:** URL to public GitHub repository with an OSI-approved license.
- [ ] **`.kiro` Directory:** Confirm the `/.kiro` directory is present at the root and not ignored.
- [ ] **Kiro Write-up/Video:** Detailed write-up OR <3 minute video demonstrating Kiro's impact on development.
- [ ] **Developer Feedback Survey:** Complete the optional survey for a shot at the Best Feedback prize.
