# F1 Start Challenge

An authentic Formula 1 starting light reaction time game built for Reddit using Devvit. Test your reflexes against the official F1 starting sequence and compete with other Reddit users!

## What is F1 Start Challenge?

F1 Start Challenge recreates the authentic Formula 1 race start experience with pixel-perfect accuracy. Players must wait for five red lights to illuminate one by one, then react as quickly as possible when all lights go out simultaneously - just like real F1 drivers at the start of a Grand Prix.

The game features:
- **Authentic F1 Starting Sequence**: Five red lights activate at precise 900ms intervals, followed by a random delay (500-2500ms) before lights out
- **High-Precision Timing**: Millisecond-accurate reaction time measurement using `performance.now()` API for professional-grade accuracy
- **Professional Driver Comparisons**: Compare your times against real F1 drivers including Max Verstappen (175ms avg), Lewis Hamilton (180ms avg), and Charles Leclerc (185ms avg)
- **Advanced Competition System**: Global and subreddit-specific leaderboards with daily, weekly, and all-time rankings
- **Deterministic Challenge Mode**: Create reproducible challenges using seeded random generation for fair head-to-head competition
- **Comprehensive Accessibility**: Full screen reader support, audio announcements, keyboard navigation, and high contrast modes

## What Makes This Game Innovative?

### 🎯 **Authentic F1 Experience**
- Recreates the exact timing and visual design of real Formula 1 starting lights with 80px circular red lights
- Uses actual F1 driver reaction time data for realistic comparisons (Verstappen: 175ms, Hamilton: 180ms, Leclerc: 185ms)
- Implements the same random delay system used in professional racing (500-2500ms unpredictable timing)
- Authentic arcade-style visual design with retro "Press Start 2P" font and high-contrast colors

### ⚡ **High-Precision Timing Engine**
- Millisecond-accurate timing using `performance.now()` API for professional-grade measurement
- Deterministic replay system for fair challenges using seeded random number generation
- Advanced false start detection with automatic cooldown periods (600ms penalty)
- GPU-accelerated animations with optimized performance for smooth 60fps gameplay

### 🏆 **Advanced Competition Features**
- **Deterministic Challenges**: Create challenges with identical light sequences using cryptographic seeds for fair competition
- **Ghost Indicators**: Visual and audio cues showing when opponents reacted during challenge mode
- **Statistical Analysis**: Comprehensive performance analytics including percentile rankings and improvement tracking
- **Anti-Cheat System**: Server-side plausibility validation and rate limiting to prevent cheating
- **Leaderboard System**: Global and subreddit-specific rankings with time-based filtering (daily/weekly/all-time)

### ♿ **Comprehensive Accessibility**
- Full audio-only mode with detailed voice announcements for visually impaired users
- Screen reader compatibility with ARIA labels, live regions, and semantic HTML
- Complete keyboard navigation support (Tab, Enter, Spacebar, Arrow keys)
- High contrast mode, large text options, and reduced motion settings
- Mobile-optimized touch controls with haptic feedback support

### 🔊 **Immersive Audio System**
- Web Audio API integration with authentic F1-style beeps for each light activation
- Dynamic result sounds based on performance rating (perfect/excellent/good/fair/slow/false start)
- Haptic feedback on mobile devices using the Vibration API
- Customizable audio mixing with separate volume controls for lights, results, and UI sounds
- Audio announcer system providing complete game state descriptions for accessibility

## Technology Stack

- **[Devvit](https://developers.reddit.com/)**: Reddit's developer platform for building immersive games
- **[React](https://react.dev/)**: Frontend UI framework with TypeScript
- **[Vite](https://vite.dev/)**: Build tool for client and server compilation
- **[Express](https://expressjs.com/)**: Backend API server
- **[Redis](https://redis.io/)**: Data persistence via Devvit's KV storage
- **[TypeScript](https://www.typescriptlang.org/)**: Full type safety across the stack

## How to Play

### 🚦 **Basic Gameplay**

1. **Launch the Game**: Click "PRESS START" on the red splash screen to enter the game
2. **Get Ready**: Read the instructions on the ready screen and click "START SEQUENCE" when prepared
3. **Watch the Light Sequence**: 
   - Five red lights will illuminate one by one at exactly 900ms intervals
   - Each light glows bright red with a distinctive glow effect when activated
   - Wait patiently as the sequence builds tension
4. **Critical Moment - Lights Out**: 
   - After all five lights are illuminated, there's a random delay (500-2500ms)
   - ALL lights will suddenly go out simultaneously
   - The screen will turn green and display "GO! GO! GO!"
5. **React Instantly**: Click anywhere on screen or press SPACEBAR the moment you see lights out
6. **View Your Results**: See your precise reaction time, performance rating, and comparison to professional F1 drivers

### ⚠️ **Critical Rules & False Starts**

- **NEVER REACT EARLY**: Clicking during the light sequence triggers an immediate "FALSE START" penalty
- **Wait for Complete Sequence**: All five lights must be fully illuminated before lights out occurs
- **Unpredictable Timing**: The final delay is completely random (500-2500ms) - don't try to predict it
- **Single Attempt**: Each game gives you one chance - there are no second tries
- **Cooldown Period**: After a false start, there's a 600ms cooldown before you can play again

### 🏁 **Professional Scoring System**

Your reaction time is measured and rated against real F1 driver standards:

- **⚡ PERFECT** (Under 200ms): Lightning-fast reflexes - faster than Max Verstappen (175ms average)!
- **🏎️ EXCELLENT** (200-300ms): Professional F1 driver level - matching Hamilton and Leclerc
- **🏁 GOOD** (300-400ms): Above average performance - competitive amateur level
- **🚗 FAIR** (400-500ms): Average human reaction time - room for improvement
- **🐌 SLOW** (Over 500ms): Below average - practice needed to improve reflexes
- **🚫 FALSE START** (Negative time): Penalty for reacting before lights out - automatic disqualification

### 🎮 **Advanced Game Features**

#### **Global Leaderboards**
- **Global Rankings**: Compete against all Reddit users worldwide
- **Subreddit Leaderboards**: Local competition within specific communities  
- **Time Filters**: View daily, weekly, or all-time best performances
- **Detailed Statistics**: See your rank, percentile, and improvement trends
- **Personal Tracking**: Monitor your personal best and session statistics

#### **Challenge Mode (Head-to-Head Competition)**
- **Deterministic Challenges**: Create challenges with identical light sequences using cryptographic seeds
- **Fair Competition**: Both players face exactly the same timing and conditions
- **Ghost Indicators**: See visual/audio cues when your opponent reacted
- **Challenge Sharing**: Share challenge links directly on Reddit posts and comments
- **Results Comparison**: Detailed head-to-head analysis with margin of victory

#### **Comprehensive Accessibility**
- **Accessibility Panel**: Click the ♿ button (top-right corner) to open settings
- **Audio-Only Mode**: Complete voice guidance for visually impaired users
- **Screen Reader Support**: Full compatibility with NVDA, JAWS, and VoiceOver
- **Visual Adjustments**: High contrast mode, large text, and reduced motion options
- **Keyboard Navigation**: Complete game playable without mouse

#### **Audio & Haptic System**
- **Authentic F1 Sounds**: Realistic beeps for each light activation
- **Performance Feedback**: Different sounds for each rating level
- **Mobile Haptics**: Vibration feedback on supported devices
- **Volume Controls**: Separate mixing for lights, results, and UI sounds

### 📱 **Controls & Input Methods**

- **Mouse/Trackpad**: Click anywhere on the game screen to react
- **Keyboard**: Press SPACEBAR for reaction (recommended for precision)
- **Touch Devices**: Tap anywhere on screen (mobile/tablet optimized)
- **Accessibility**: Full keyboard navigation using TAB, ENTER, and arrow keys
- **Voice Control**: Compatible with screen reader navigation commands

### 🏆 **Pro Tips for Better Performance**

1. **Visual Focus Strategy**: Watch the center area to see all five lights simultaneously - don't track individual lights
2. **Relaxation Technique**: Keep your hand and arm relaxed - tension actually slows reaction time
3. **Timing Psychology**: Don't try to predict the random delay - it's designed to be unpredictable (500-2500ms range)
4. **Professional Benchmarks**: F1 drivers average 200-300ms - this is your target range for excellence
5. **Audio Enhancement**: Enable sound effects for additional sensory feedback during the sequence
6. **Practice Consistency**: Focus on consistent technique rather than trying to "game" the system
7. **Device Optimization**: Use a desktop/laptop for best precision - mobile devices may have slight input lag
8. **Environmental Setup**: Minimize distractions and ensure good lighting to see the lights clearly

## Getting Started (Development)

> Make sure you have Node 22 downloaded on your machine before running!

1. Clone this repository or run `npm create devvit@latest --template=react`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Development Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run check`: Type checks, lints, and prettifies your app

## Technical Architecture

### **Client-Side Architecture (`src/client/`)**
- **React Components**: Screen-based architecture with `GameRouter` managing state transitions
- **Game Context**: Centralized state management using React Context and useReducer
- **Timing Engine**: High-precision timing using `performance.now()` with deterministic replay support
- **Audio System**: Web Audio API integration with comprehensive accessibility features
- **Game Manager**: Orchestrates game flow, input handling, and state transitions
- **Input Handler**: Advanced input detection with false start prevention and cooldown management
- **Result Calculator**: Professional scoring system with F1 driver comparisons

### **Server-Side Architecture (`src/server/`)**
- **Express API**: RESTful endpoints starting with `/api/` for leaderboards and challenges
- **Redis Integration**: Persistent storage via Devvit's KV system with quota management
- **Anti-Cheat System**: Server-side plausibility validation and statistical analysis
- **Rate Limiting**: Prevents spam and ensures fair play with configurable limits
- **Security Monitoring**: Real-time detection of suspicious patterns and automated responses
- **Data Migration**: Seamless updates and schema evolution support

### **Shared Architecture (`src/shared/`)**
- **Type Definitions**: Comprehensive TypeScript interfaces for type safety across client/server
- **Game Constants**: Timing configurations, scoring thresholds, and F1 driver data
- **API Contracts**: Request/response type safety ensuring reliable client-server communication

## Performance & Optimization Features

- **GPU Acceleration**: Hardware-accelerated animations using CSS transforms and will-change properties
- **High-Precision Timing**: Sub-millisecond accuracy using `performance.now()` API for professional-grade measurement
- **Mobile Optimization**: Touch-friendly controls, responsive design, and haptic feedback support
- **Accessibility Compliance**: WCAG 2.1 AA compliant with comprehensive screen reader support and keyboard navigation
- **Error Handling**: Robust error boundaries with automatic error reporting and graceful degradation
- **Offline Support**: Local storage fallbacks for user preferences and session data
- **Performance Monitoring**: Real-time FPS monitoring and automatic performance degradation detection
- **Memory Management**: Efficient cleanup of audio contexts and event listeners to prevent memory leaks
- **Network Resilience**: Retry logic and fallback mechanisms for unreliable network conditions

## Cursor Integration

This template comes with a pre-configured cursor environment. To get started, [download cursor](https://www.cursor.com/downloads) and enable the `devvit-mcp` when prompted.

---

**Ready to test your F1 reflexes? Install the app on Reddit and see if you can beat the pros!** 🏎️⚡
