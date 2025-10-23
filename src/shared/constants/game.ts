// Game constants and configuration
export const GAME_CONFIG = {
  // Timing constants
  LIGHT_INTERVAL: 900, // ms between light activations
  MIN_RANDOM_DELAY: 500, // ms minimum delay after all lights on
  MAX_RANDOM_DELAY: 2500, // ms maximum delay after all lights on

  // Validation constants
  MIN_HUMAN_REACTION: 80, // ms - minimum possible human reaction time
  MAX_HUMAN_REACTION: 1000, // ms - maximum reasonable reaction time
  FALSE_START_COOLDOWN: 600, // ms cooldown after false start

  // Performance constants
  TARGET_FPS: 60,
  MAX_INPUT_LATENCY: 16, // ms

  // Rate limiting
  SUBMISSIONS_PER_MINUTE: 3,
  SUBMISSIONS_PER_HOUR: 20,
  SUBMISSIONS_PER_DAY: 100,
} as const;

export const RATING_THRESHOLDS = {
  PERFECT: 200, // ms
  EXCELLENT: 300, // ms
  GOOD: 400, // ms
  // FAIR: anything above GOOD
} as const;

export const COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  YELLOW: '#FFFF00',
  RED: '#FF0000',
  GREEN: '#00FF00',
  GOLD: '#FFD700',
} as const;

export const LIGHT_COUNT = 5;
