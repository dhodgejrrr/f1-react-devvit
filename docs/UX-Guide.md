# UI/UX Guide: F1 Start Challenge

## 1. Guiding Philosophy: "Arcade Clarity"

This guide translates the 1982 _Pole Position_ aesthetic into a modern, interactive Reddit post. Our philosophy is **Clarity over Clutter**. Every element must be immediately understandable and serve a functional purpose. The experience should feel responsive, direct, and authentically retro.

**Primary Font:** "Press Start 2P" (a web-safe, pixel-style font) will be used for all text to maintain the bitmap aesthetic. All text should be in **ALL CAPS**.
**Color Palette:** All colors must adhere strictly to the `Pole-Position-Style-Guide.md`. The primary UI will use a black background (`#000000`) with white (`#FFFFFF`) and yellow (`#FFFF00`) text.

## 2. Core UI Components

These are the reusable building blocks of our interface.

- **Starting Lights:**

  - **Description:** A horizontal row of five large circles (`[●][●][●][●][●]`).
  - **States:** Off (`#202020`), On (`#FF0000` with a subtle glow).
  - **Placement:** Always the focal point of the screen during gameplay.

- **Primary Button:**

  - **Description:** A solid-colored rectangle with a 2-3px solid border of a lighter shade.
  - **Text:** Uses the primary font, centered.
  - **Interaction:** On hover, the background color brightens. On click, it has an inset shadow effect.
  - **Color Coding:**
    - **Start/Action:** Green
    - **Info/Secondary:** Blue
    - **Back/Cancel:** Red

- **HUD Text:**
  - **Description:** High-contrast text for displaying scores and information.
  - **Color:** White (`#FFFFFF`) for standard info, Yellow (`#FFFF00`) for important scores or highlights.

## 3. Screen Layouts & User Flows

### Screen 1: Splash Screen ("Pole Position")

This is the game's main entry point within the Reddit post.

- **Purpose:** To introduce the game and provide primary navigation.
- **Layout:**
  - **Top:** `HUD Text` displaying "HIGH SCORE: [0.123s]".
  - **Center:** Large game title in yellow: "F1 START CHALLENGE".
  - **Below Title:** A flashing green `Primary Button` with the text "PRESS START".
  - **Bottom:** Two smaller blue `Primary Buttons`: "LEADERBOARD" and "CHALLENGES".
- **User Flow:**
  1.  User sees the initial screen. The "PRESS START" button flashes to draw attention.
  2.  **Path A (Play Game):** User clicks "PRESS START". The screen transitions directly to the Game Canvas (Screen 2), starting the "Ready" sequence.
  3.  **Path B (View Leaderboard):** User clicks "LEADERBOARD". The view transitions to the Leaderboard Screen (Screen 4).

### Screen 2: The Game Canvas (Ready > Lights > Go)

This screen is a multi-stage sequence, not a static view.

- **Purpose:** To conduct the core gameplay loop with maximum focus and minimal distraction.
- **Layout:**
  - **Top Bar:** `HUD Text` for "BEST: [0.123s]" and "LAST: [0.245s]".
  - **Center:** The `Starting Lights` component is large and centrally located.
  - **Bottom:** A text area for status updates ("READY...", "FALSE START").
- **User Flow (The Sequence):**
  1.  **"Ready" State:** The screen appears. All five lights are dark. The bottom text displays "READY...". A brief 3-second pause builds anticipation.
  2.  **"Lights On" State:** The lights turn on sequentially from left to right, one per second. Each light activation is paired with an ascending beep sound. All other UI is static.
  3.  **"Waiting" State:** All five lights are now red. There is a random, tense pause between 0.5 and 3.0 seconds.
  4.  **"Go" State:** All five lights extinguish simultaneously. This is the moment the reaction timer starts.
  5.  **User Interaction:** The user must click/tap anywhere on the post.
      - **Outcome A (False Start):** If the user clicks _before_ the lights go out, the screen flashes **red**. The bottom text displays "FALSE START" in red. A loud buzzer sound plays. The sequence ends, and the app transitions to the Results Screen (Screen 3) with a "false start" state.
      - **Outcome B (Successful Start):** If the user clicks _after_ the lights go out, their reaction time is recorded. The screen flashes **green** (for GOOD) or **gold** (for PERFECT). A positive chime sound plays. The app transitions to the Results Screen (Screen 3), passing the recorded time.

### Screen 3: Results Screen

- **Purpose:** To display performance, provide context, and encourage re-engagement.
- **Layout:**
  - **Top:** `HUD Text` reading "REACTION TIME".
  - **Center:** The user's time is displayed in enormous yellow `HUD Text` (e.g., "0.186s").
  - **Below Time:** A rating based on the time is shown in a corresponding color (e.g., "★★★ PERFECT! ★★★" in yellow).
  - **Bottom:** Three `Primary Buttons`: "PLAY AGAIN" (Green), "SUBMIT SCORE" (Blue), "CREATE CHALLENGE" (Blue).
- **User Flow:**
  1.  The user's time and rating are displayed.
  2.  **Path A (Retry):** User clicks "PLAY AGAIN". The app transitions back to the Game Canvas (Screen 2) to start a new sequence.
  3.  **Path B (Submit):** User clicks "SUBMIT SCORE". The button text changes to "SUBMITTING..." and becomes disabled. Upon success, it changes to "SUBMITTED!" before the user is returned to the Splash Screen.
  4.  **Path C (Challenge):** User clicks "CREATE CHALLENGE". A modal appears with a shareable link and a "CLOSE" button.

### Screen 4: Leaderboard Screen

- **Purpose:** To display high scores and foster competition.
- **Layout:** A classic arcade high-score table.
  - **Top:** `HUD Text` title: "LEADERBOARD".
  - **Below Title:** Buttons to toggle between "GLOBAL" / "r/SUBREDDIT" and "DAILY" / "WEEKLY" / "ALL-TIME".
  - **Main Content:** A list of scores: `RANK | USERNAME | TIME`. The user's own score, if present, is highlighted in yellow.
  - **Bottom:** A red `Primary Button`: "BACK".
- **User Flow:**
  1.  The user views the default leaderboard (e.g., Global, All-Time).
  2.  The user can click the toggle buttons to filter the view. The list updates accordingly.
  3.  User clicks "BACK" to return to the Splash Screen (Screen 1).

### Special Flow: Accepting a Challenge

This flow modifies the initial game experience for the challenged player.

1.  A user enters the post via a challenge link.
2.  The Splash Screen (Screen 1) has a modified layout. A large banner appears: "u/PlayerA CHALLENGES YOU!". The "PRESS START" button is replaced with "ACCEPT CHALLENGE".
3.  Upon clicking "ACCEPT CHALLENGE", the user is taken to the Game Canvas (Screen 2).
4.  The Game Canvas has an additional UI element: a small "ghost" indicator showing when Player A reacted.
5.  After the sequence, the user is taken to a special **Challenge Results Screen**. This screen displays both players' times side-by-side and declares a winner with a "YOU WIN!" or "YOU LOSE!" banner. From here, the user can return to the Splash Screen.
