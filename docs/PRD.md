# F1 Start Challenge — Product Requirements Document (PRD)

Short pitch:  
**F1 Start Challenge** — a polished Devvit Web interactive-post game that tests reaction time using the iconic F1 starting lights. Single-player core loop + community leaderboards + “Pro vs Community” driver cards + false-start detection + a convincing **pseudo-synchronous** head-to-head mode. Built with Devvit Web, Kiro for developer workflow, and Reddit KV for persistent leaderboards and challenge storage. Focus the submission on Community Play and the Best Kiro Developer Experience categories of the hackathon.

---

# 1 — Goals & Success Criteria

**Primary goals**

- Build a polished, mobile-friendly, instantly-playable reaction game inside a Reddit interactive post.
- Drive community engagement via leaderboards, daily/weekly events, and challenge posts.
- Demonstrate exceptional use of Kiro to earn the Best Kiro Developer Experience prize.

**Success metrics**

- Retention: % of users who play >1 run in a session.
- Virality: average shares/challenges per post.
- Leaderboard activity: daily leaderboard reads/writes per subreddit.
- Kiro submission quality: documented use of specs/hooks/steering and included `/.kiro` directory in repo.

**Hackathon alignment** (from the event notes you provided)

- Must be built on **Devvit Web** and comply with Devvit Rules.
- Polish matters: custom splash screen, responsive design, Beta/GA readiness score higher.
- For Kiro prize: include `/.kiro` directory, open-source licensed repo, and a write-up/video showing how Kiro improved dev workflow.

---

# 2 — Product Overview & Feature List

## 2.1 Core features (must-haves)

1. **Start Light Sequence** — authentic five-lights animation: lights come on, random delay, lights out.
2. **Reaction Timing** — measure ms between lights out and user click/tap.
3. **False-Start Detection** — click before lights out → immediate false start result.
4. **Result Screen** — display reaction time, percentile vs community / drivers, “Play Again” and “Challenge” CTA.
5. **Driver Cards (Pro vs Community)** — JSON dataset of driver average reaction times; show cards and percentiles relative to them.
6. **Leaderboards (KV storage)** — per-subreddit and global leaderboards, daily/weekly views.
7. **Pseudo-Synchronous Multiplayer** — “Challenge” flow: one player creates a challenge recording (delay seed + reaction), second player plays and sees an animated side-by-side replay comparing both.
8. **Polish** — custom splash screen, small animations, responsive layout, accessible buttons, and subtle audio (optional & opt-out).

## 2.2 Nice-to-haves / stretch

- Streaks: best average over N runs.
- Seasonal/event themes (wet start, safety car start) via toggle.
- Social share cards (image + stats) for cross-posting.
- Premium cosmetics via Payments API (if pursuing post-hackathon).
- Multi-driver comparison (show percentile against full grid).
- Replay GIF export (if feasible).

---

# 3 — UX & Flows

## 3.1 Onboarding / Splash

- Custom splash: brand logo, short description (“Beat the pros — how fast can you react?”), Play button, Leaderboard, How to play (short).
- Accessibility check: large tappable start button, color contrast for lights, keyboard support for desktop.

## 3.2 Single Play Flow (fastest path)

1. Player taps **Start**.
2. Lights animate (on → all lit), random delay starts.
3. Lights out → timer starts on lights out.
4. Player clicks/taps → compute `reaction = clickedAt - lightsOutAt`.

   - If clicked before lightsOut: mark false-start.

5. Result modal: show reaction (ms), compare to driver cards and community avg, show percentiles, show CTAs: _Play Again_, _Challenge_, _Share_, _Save to leaderboard_ (if signed in).

## 3.3 Leaderboard Flow

- On result, user can submit time to leaderboard — confirm username visibility (use Reddit username by default).
- Leaderboard views:
  - **Global**
  - **Subreddit**
  - **Daily / Weekly / All-time**
- Show top N and user’s rank if present.

## 3.4 Challenge (Pseudo-Synchronous Multiplayer) Flow

1. Player A creates a challenge: plays and chooses “Create Challenge”.
2. App stores challenge object in KV: `{ creator: "u/A", seed: 12345, recordedDelay, reaction, createdAt }`.

   - Important: store the RNG seed or recorded delay so replays are deterministic.

3. Player B clicks “Accept Challenge”:

   - App loads creator’s seed/delay and creates identical light timing.
   - App plays both: animate Player A’s replay (ghost) + live Player B lights side-by-side or top/bottom.
   - After Player B runs, show side-by-side results, declare winner.

4. Discussion/Comments: encourage posting a public demo post to challenge others.

**Rationale:** True WebSocket real-time play is not possible in Reddit embedding. This delivers a perceptively real-time experience while staying within platform constraints.

---

# 4 — Data Model & Storage

## 4.1 Driver dataset (static JSON)

`drivers.json` (bundled with app)

```json
[
  { "id": "verstappen", "name": "Max Verstappen", "avg_reaction": 0.28, "source": "simulation" },
  { "id": "hamilton", "name": "Lewis Hamilton", "avg_reaction": 0.29, "source": "simulation" },
  { "id": "norris", "name": "Lando Norris", "avg_reaction": 0.3, "source": "simulation" }
]
```

- `avg_reaction` in seconds (float).
- Percentile calc: compare user reaction to distribution (see analytics section).

## 4.2 Leaderboard KV schema

- Key: `leaderboard:global` → value: JSON array sorted ascending by time (ms)
- Key per subreddit: `leaderboard:r/<subreddit>` → same structure
- Each entry:

```json
{
  "user": "u/SpeedyDave",
  "time_ms": 231,
  "timestamp": "2025-10-22T11:20:00Z",
  "challengeId": null
}
```

- Keep only top N (e.g., 100) to limit KV size.

## 4.3 Challenge object schema

Key: `challenge:<uuid>`  
Value:

```json
{
  "creator": "u/A",
  "seed": 12345,
  "delay_ms": 875, // deterministic delay from seed
  "reaction_ms": 223,
  "createdAt": "2025-10-22T11:20:00Z",
  "scope": "r/f1startchallenge" // optional
}
```

- Store limited TTL (e.g., 30 days) depending on policy and storage quotas.

## 4.4 User privacy & data minimization

- Prefer Reddit username only; do not collect PII outside Reddit.
- Offer opt-out before publishing to leaderboard.
- Comply with platform rules re: data retention and user consent.

---

# 5 — Architecture & Engineering Notes

## 5.1 High-level architecture

- **Frontend:** Devvit Web interactive post UI (React or light-weight framework).
- **Storage:** Reddit KV for leaderboards & challenges.
- **Bundled assets:** driver JSON, images, CSS, `.kiro` specs.
- **Optional backend:** None required. If you want analytics beyond KV, use an external service (with user consent) — but for hackathon keep it serverless (no extra infra).

## 5.2 Timing & Precision

- Use high-resolution `performance.now()` for timing in ms (avoid `Date.now()` for accuracy).
- Use deterministic RNG for pseudo-synchronous mode — store seed and computed delay so Player B experiences the exact same timing.
- Debounce/tolerance: ensure click handlers are robust to double-taps; ignore repeat events within 10ms.

## 5.3 False start handling

- If click occurs during pre-lights or while lights are on (before lightsOut), classify as `false_start`.
- UX: show message and optionally record this attempt with a marker rather than a numeric time.
- Prevent spamming: add a small cooldown (e.g., 600ms) after a false start before allowing a new run to avoid accidental rapid retries.

## 5.4 Leaderboard concurrency & KV limitations

- KV writes must handle race conditions (multiple users saving near-simultaneously).
  - Strategy: optimistic concurrency. Read, insert, write with compare-and-swap if available; otherwise write append and reconcile on reads.
  - Limit size: keep top N and prune older entries.
- Throttle writes: only allow a leaderboard write per user per X minutes (to avoid heavy write load or abuse).

## 5.5 Security & Abuse mitigation

- Rate limit per IP/user for leaderboard writes.
- Validate any client-submitted time server-side (or at least verify formatting and reasonable bounds — e.g., 50ms–2000ms).
- Anti-cheat considerations:
  - Browser-based measurement cannot be 100% cheat-proof (user could manipulate JS).
  - Mitigation: detect impossible times (<50ms) and flag/remove; rely on community reporting for suspect entries.

## 5.6 Kiro integration plan (developer experience)

- **/.kiro** at project root with:
  - specs for UI states (`pre-lights`, `lights-on`, `lights-out`, `result`).
  - hooks for timing functions and RNG steering.
  - steering scripts for toggling delay distributions and test parameters.
- Use Kiro for:
  - Live tuning of delays and RNG distributions.
  - Automating test runs to generate synthetic leaderboard entries during development.
  - Snapshotting state to reproduce bugs (store seed + state).
- Document the Kiro usage in `README.md` and record a short 2–3 minute video showing:
  - how you tuned the delay distribution,
  - how you used steering to reproduce a false start,
  - and how `/.kiro` hooks sped development and QA.

**Important for submission:** ensure the repo includes the `.kiro` directory and it is **not** in `.gitignore`.

---

# 6 — UI / Visual & Accessibility Requirements

## 6.1 Visual polish

- Custom splash screen + game canvas sized to interactive post constraints.
- CSS animations for lights with GPU-accelerated transforms.
- Small sound effects for lights out and result (user opt-in due to Reddit environment).
- Responsive layout that fits:
  - Desktop interactive post width
  - Reddit mobile embedded view (single column)
- Contrast: red lights on dark background with accessible color alternatives for colorblind users (use patterns or labels).

## 6.2 Accessibility

- Keyboard support (space/enter to start and space to react).
- ARIA labels for interactive elements.
- High-contrast mode and reduced-motion toggle.

---

# 7 — Analytics, Metrics & Testing Plan

## 7.1 Analytics to capture (minimal)

- Plays (counts)
- Successful times, false starts
- Leaderboard submissions
- Challenge creations & accepts
- Device/browser (for debugging)
- Keep analytics lightweight; prefer an opt-in model or aggregate non-PII.

## 7.2 Testing

- Unit tests for timing logic (simulate delays & clicks).
- Integration tests for pseudo-synchronous flow (verify seed → same delay).
- Cross-browser QA: desktop Chrome/Firefox/Safari, mobile Safari & Chrome.
- Simulate slow devices to ensure animations and timing still measured accurately.
- Edge tests:
  - Tap before lights out → false start
  - Double taps
  - Rapid retries
  - Very low/high latency devices

---

# 8 — Edge Cases, Pros & Cons, Tradeoffs

## 8.1 Pseudo-synchronous vs true realtime

- **Pros (Pseudo-synchronous)**
  - Works within Reddit Devvit sandbox (no persistent sockets).
  - Deterministic replay ensures fairness and perceived simultaneity.
  - Low infra complexity — no backend servers required.
- **Cons**
  - Not truly live — latency is irrelevant but some users might perceive it as “not live”.
  - Requires deterministic recording; seed leakage or manipulation risk if not secured.

**Decision:** Use pseudo-synchronous. It gives near-live experience with platform-compatible architecture and is judge-friendly (creative solution).

## 8.2 Serverless KV-only vs adding backend

- **KV-only**
  - Simpler, aligns with Devvit features.
  - Good for leaderboards and small persistent objects.
  - Limited by KV size & rates.
- **Backend**
  - Pros: more robust conflict handling, richer analytics, anti-cheat.
  - Cons: adds hosting, infra, complexity — risk for hackathon time constraints.

**Decision:** Start KV-first. Add a backend later if needed for scale/anti-cheat.

## 8.3 Anti-cheat tradeoffs

- High fidelity anti-cheat is expensive.
- Use plausibility checks and community moderation early; reserve advanced checks for post-hackathon iterations.

---

# 9 — Dev & Release Checklist (Hackathon Submission Ready)

**Repo & code**

- Public GitHub repo, OSI-approved license (e.g., MIT).
- `/.kiro` at root (specs, hooks, steering) — not ignored.
- Clean README: how to run, Kiro notes, how to reproduce dev flows.
- Build script that produces production bundle for Devvit.

**App**

- Devvit Web app listing submitted to developer.reddit.com (link ready).
- In-post demo: public subreddit + interactive post implementing the game.
- Custom splash screen and responsive design implemented.
- Driver JSON included, comparators implemented.
- Leaderboard and Challenge flows fully functional.

**Kiro submission**

- `/.kiro` present and used to tune game (include config and examples).
- Short 2–3 minute video or write-up describing Kiro usage (how it sped up iteration, what steering was used, reproducible examples).
- Mark submission as intended for Kiro award per hackathon instructions.

**QA**

- Cross-browser mobile/desktop testing done.
- False-start and edge cases covered by tests.
- Accessibility checks completed.

**Legal & Compliance**

- No copyrighted music in video demo.
- No trademark misuse; use driver names carefully (drivers are public figures — use names as descriptive elements).
- Privacy note: explain that Reddit username will be displayed on leaderboards; option to opt-out.

---

# 10 — Implementation Roadmap (High-level, single sprint for hackathon)

(Assume a short hackathon timeframe — pick minimum viable subset + polish.)

**Day 1**

- Scaffold Devvit Web project from template.
- Add Kiro `.kiro` and basic specs for UI states.
- Implement core reaction loop: lights animation, timing with `performance.now()`, false start detection.

**Day 2**

- Add result screen, driver JSON and driver-card comparator, percentiles.
- Implement KV read for global leaderboard read & write (basic).

**Day 3**

- Implement Challenge creation/accept flows (seed generation & deterministic delay).
- Implement side-by-side pseudo-synchronous replay.

**Day 4**

- Polish UI, responsive styles, accessibility, add splash screen and animations.
- Integrate Kiro steering to tune delay distribution and demonstrate live tuning; record video.

**Day 5**

- Full testing cross-browser, fix bugs, finalize README and submission materials, record demo video <3 minutes, push repo, submit to hackathon.

---

# 11 — Implementation Details & Pseudocode

### Timing (JS)

```js
// use performance.now()
let lightsOutAt = 0;
function startRun() {
  // lights on animation
  const delay = getDeterministicDelay(seed); // ms
  setTimeout(() => {
    lightsOutAt = performance.now();
    // render lights out
  }, delay);
}

function onClick() {
  const now = performance.now();
  if (!lightsOutAt) {
    // clicked before lights out => false start
  } else {
    const reactionMs = now - lightsOutAt;
    // show result
  }
}
```

### Deterministic delay via seed

```js
// small LCG for deterministic RNG
function seededRandom(seed) {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function getDeterministicDelay(seed) {
  const r = seededRandom(seed);
  // map r to desired ms range, say 400ms-1200ms
  return 400 + Math.floor(r * 800);
}
```

### Leaderboard write (pseudo)

```js
async function submitToLeaderboard(kvKey, entry) {
  const current = (await kv.get(kvKey)) || [];
  // insert sorted
  current.push(entry);
  current.sort((a, b) => a.time_ms - b.time_ms);
  const trimmed = current.slice(0, 100);
  await kv.set(kvKey, trimmed);
}
```

---

# 12 — Kiro Write-up Guidance (for judges)

Structure your Kiro-focused write-up / video to clearly demonstrate how Kiro materially improved dev experience:

1. **Problem** — tuning delay distributions and reproducing false-start bugs felt slow using manual reloads.
2. **Kiro solution** — show `specs` defining states, `hooks` used to inject deterministic seeds into test runs, and `steering` used to live adjust delay distribution.
3. **Impact** — demonstrate: before Kiro (manual change + build), after Kiro (live steer + instant replay). Quantify: “reduced test iteration from ~3 minutes to <10s per tweak”.
4. **Reproducibility** — show how Kiro snapshot + seed reproduce a community-reported false start for debugging.
5. **Broader application** — explain how these patterns scale to other Devvit games or UI experiments.

Keep video < 3 minutes. No copyrighted music.

---

# 13 — Submission Materials Checklist (what judges will want)

- App link (developer.reddit.com)
- Demo post link in a public subreddit (with interactive post)
- Public Git repo (MIT/BSD/Apache) with `.kiro/`
- Kiro write-up OR <3 minute demo video (explain Kiro usage)
- Short README: how to run locally & where Kiro lives
- Optional: screenshots or GIFs for splash + leaderboards

---

# 14 — Final Notes & Recommendations

- **Start simple:** get the core reaction experience solid — accurate timing, polished UI, and false-start logic. This is the meat of the experience.
- **Kiro early:** add `/.kiro` early and use it to accelerate tuning. Judges love a clear, reproducible demonstration of how the tool changed your dev flow.
- **Emphasize community:** leaderboards and challenge posts are what will make judges see “massively multiplayer” value even though play is asynchronous.
- **Be transparent about limits:** mention in the README that multiplayer is pseudo-synchronous due to Devvit constraints — present it as a deliberate, creative solution (not a limitation).
- **Make it shareable:** social share cards and easy “challenge a friend” flows increase engagement.

---
