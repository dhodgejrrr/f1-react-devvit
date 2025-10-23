/**
 * High-Precision Timing Engine for F1 Start Challenge
 * 
 * Provides millisecond-precision timing using performance.now() API
 * Supports deterministic seeding for challenge mode reproducibility
 * Handles light sequence timing and user input measurement
 */

export interface TimingConfig {
  lightInterval: number; // Default: 900ms
  minRandomDelay: number; // Default: 500ms
  maxRandomDelay: number; // Default: 2500ms
  seed?: number; // For deterministic challenges
}

export interface LightSequenceResult {
  lightsOutTime: number;
  totalSequenceTime: number;
  lightActivationTimes: number[];
  randomDelay: number;
  seed?: number;
  sequenceHash?: string;
  replayData?: ReplayData;
}

export interface ReplayData {
  seed: number;
  randomSequence: number[];
  lightTimings: number[];
  totalDuration: number;
  sequenceHash: string;
}

export interface ReactionMeasurement {
  inputTime: number;
  reactionTime: number;
  isValid: boolean;
  precision: number; // Timing precision in ms
}

/**
 * Seeded Random Number Generator for deterministic challenges
 * Uses a simple Linear Congruential Generator (LCG) algorithm
 * Enhanced for deterministic replay system
 */
class SeededRandom {
  private seed: number;
  private current: number;
  private callCount: number = 0;
  private sequence: number[] = [];

  constructor(seed: number) {
    this.seed = seed;
    this.current = seed;
    this.callCount = 0;
    this.sequence = [];
  }

  next(): number {
    // LCG parameters (same as used in glibc)
    this.current = (this.current * 1103515245 + 12345) & 0x7fffffff;
    const value = this.current / 0x7fffffff;
    
    // Track sequence for replay validation
    this.sequence.push(value);
    this.callCount++;
    
    return value;
  }

  reset(): void {
    this.current = this.seed;
    this.callCount = 0;
    this.sequence = [];
  }

  /**
   * Get the current state for replay validation
   */
  getState(): {
    seed: number;
    current: number;
    callCount: number;
    sequence: number[];
  } {
    return {
      seed: this.seed,
      current: this.current,
      callCount: this.callCount,
      sequence: [...this.sequence]
    };
  }

  /**
   * Restore state from a previous session
   */
  setState(state: {
    seed: number;
    current: number;
    callCount: number;
    sequence: number[];
  }): void {
    this.seed = state.seed;
    this.current = state.current;
    this.callCount = state.callCount;
    this.sequence = [...state.sequence];
  }

  /**
   * Validate that two sequences are identical (for replay integrity)
   */
  static validateSequence(sequence1: number[], sequence2: number[]): boolean {
    if (sequence1.length !== sequence2.length) {
      return false;
    }
    
    for (let i = 0; i < sequence1.length; i++) {
      // Use small epsilon for floating point comparison
      if (Math.abs(sequence1[i] - sequence2[i]) > 1e-10) {
        return false;
      }
    }
    
    return true;
  }
}

export class TimingEngine {
  private config: TimingConfig;
  private seededRandom: SeededRandom | null = null;
  private sequenceStartTime: number = 0;
  private lightsOutTime: number = 0;
  private lightActivationTimes: number[] = [];
  private isSequenceActive: boolean = false;
  private timingPrecision: number = 1; // ms
  private replayMode: boolean = false;
  private replayData: ReplayData | null = null;

  // Event callbacks
  private onLightActivate?: (index: number, timestamp: number) => void;
  private onLightsOut?: (timestamp: number) => void;
  private onSequenceComplete?: (result: LightSequenceResult) => void;

  constructor(config: TimingConfig) {
    this.config = { ...config };
    this.validateTimingPrecision();
    
    if (config.seed !== undefined) {
      this.setSeed(config.seed);
    }
  }

  /**
   * Set deterministic seed for challenge mode
   */
  setSeed(seed: number): void {
    this.seededRandom = new SeededRandom(seed);
    this.replayMode = true;
  }

  /**
   * Clear seed to use normal random generation
   */
  clearSeed(): void {
    this.seededRandom = null;
    this.replayMode = false;
    this.replayData = null;
  }

  /**
   * Enable replay mode with existing replay data
   */
  enableReplayMode(replayData: ReplayData): void {
    this.replayMode = true;
    this.replayData = replayData;
    this.setSeed(replayData.seed);
  }

  /**
   * Check if engine is in replay mode
   */
  isInReplayMode(): boolean {
    return this.replayMode;
  }

  /**
   * Get current replay data
   */
  getReplayData(): ReplayData | null {
    return this.replayData;
  }

  /**
   * Get current high-precision timestamp
   */
  getCurrentTime(): number {
    return performance.now();
  }

  /**
   * Start the F1 light sequence
   */
  async startSequence(): Promise<LightSequenceResult> {
    if (this.isSequenceActive) {
      throw new Error('Light sequence already active');
    }

    this.isSequenceActive = true;
    this.sequenceStartTime = this.getCurrentTime();
    this.lightActivationTimes = [];
    this.lightsOutTime = 0;

    try {
      // Activate lights sequentially
      for (let i = 0; i < 5; i++) {
        await this.wait(this.config.lightInterval);
        const timestamp = this.getCurrentTime();
        this.lightActivationTimes.push(timestamp);
        this.onLightActivate?.(i, timestamp);
      }

      // Generate random delay
      const randomDelay = this.generateDeterministicDelay();
      await this.wait(randomDelay);

      // Lights out!
      this.lightsOutTime = this.getCurrentTime();
      this.onLightsOut?.(this.lightsOutTime);

      // Generate replay data for deterministic challenges
      const replayData = this.generateReplayData(randomDelay);
      
      const result: LightSequenceResult = {
        lightsOutTime: this.lightsOutTime,
        totalSequenceTime: this.lightsOutTime - this.sequenceStartTime,
        lightActivationTimes: [...this.lightActivationTimes],
        randomDelay,
        seed: this.seededRandom?.getState().seed,
        sequenceHash: replayData?.sequenceHash,
        replayData
      };

      this.onSequenceComplete?.(result);
      this.isSequenceActive = false;

      return result;
    } catch (error) {
      this.isSequenceActive = false;
      throw error;
    }
  }

  /**
   * Record user reaction and calculate reaction time
   */
  recordReaction(): ReactionMeasurement {
    const inputTime = this.getCurrentTime();
    
    if (this.lightsOutTime === 0) {
      throw new Error('Cannot record reaction - lights have not gone out yet');
    }

    const reactionTime = inputTime - this.lightsOutTime;
    const isValid = this.validateReactionTime(reactionTime);

    return {
      inputTime,
      reactionTime,
      isValid,
      precision: this.timingPrecision,
    };
  }

  /**
   * Check if sequence is currently active
   */
  isSequenceRunning(): boolean {
    return this.isSequenceActive;
  }

  /**
   * Get the timestamp when lights went out
   */
  getLightsOutTime(): number {
    return this.lightsOutTime;
  }

  /**
   * Generate deterministic delay for challenges or random delay for normal play
   */
  generateDeterministicDelay(): number {
    const { minRandomDelay, maxRandomDelay } = this.config;
    
    if (this.seededRandom) {
      // Use seeded random for deterministic challenges
      const normalizedRandom = this.seededRandom.next();
      return minRandomDelay + normalizedRandom * (maxRandomDelay - minRandomDelay);
    }

    // Use normal random for regular play
    return minRandomDelay + Math.random() * (maxRandomDelay - minRandomDelay);
  }

  /**
   * Update timing configuration
   */
  updateConfig(newConfig: Partial<TimingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.seed !== undefined) {
      this.setSeed(newConfig.seed);
    }
  }

  /**
   * Set event callbacks
   */
  onLightActivated(callback: (index: number, timestamp: number) => void): void {
    this.onLightActivate = callback;
  }

  onLightsExtinguished(callback: (timestamp: number) => void): void {
    this.onLightsOut = callback;
  }

  onSequenceCompleted(callback: (result: LightSequenceResult) => void): void {
    this.onSequenceComplete = callback;
  }

  /**
   * Reset the timing engine state
   */
  reset(): void {
    this.isSequenceActive = false;
    this.sequenceStartTime = 0;
    this.lightsOutTime = 0;
    this.lightActivationTimes = [];
    
    if (this.seededRandom) {
      this.seededRandom.reset();
    }
  }

  /**
   * Get timing statistics for debugging
   */
  getTimingStats(): {
    precision: number;
    sequenceActive: boolean;
    lightsOutTime: number;
    activationTimes: number[];
  } {
    return {
      precision: this.timingPrecision,
      sequenceActive: this.isSequenceActive,
      lightsOutTime: this.lightsOutTime,
      activationTimes: [...this.lightActivationTimes],
    };
  }

  // Private methods

  /**
   * Validate timing precision and browser capabilities
   */
  private validateTimingPrecision(): void {
    // Test performance.now() precision
    const start = performance.now();
    const end = performance.now();
    const minDiff = end - start;

    // Most modern browsers provide microsecond precision
    if (minDiff > 5) {
      console.warn('Low timing precision detected. Results may be less accurate.');
      this.timingPrecision = 5;
    } else if (minDiff > 1) {
      this.timingPrecision = 1;
    } else {
      this.timingPrecision = 0.1; // Sub-millisecond precision
    }

    // Validate performance.now() is available
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
      throw new Error('High-precision timing not available in this browser');
    }
  }

  /**
   * Validate reaction time is within human-possible ranges
   */
  private validateReactionTime(reactionTime: number): boolean {
    // Human reaction time bounds
    const MIN_HUMAN_REACTION = 80; // ms
    const MAX_REASONABLE_REACTION = 1000; // ms

    return reactionTime >= MIN_HUMAN_REACTION && reactionTime <= MAX_REASONABLE_REACTION;
  }

  /**
   * Promise-based wait utility
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Generate replay data for deterministic challenges
   */
  private generateReplayData(randomDelay: number): ReplayData | null {
    if (!this.seededRandom) {
      return null;
    }

    const state = this.seededRandom.getState();
    const lightTimings = [...this.lightActivationTimes];
    const totalDuration = this.lightsOutTime - this.sequenceStartTime;
    
    // Create a hash of the sequence for integrity validation
    const sequenceHash = this.createSequenceHash(state.sequence, lightTimings, randomDelay);

    return {
      seed: state.seed,
      randomSequence: state.sequence,
      lightTimings,
      totalDuration,
      sequenceHash
    };
  }

  /**
   * Create a hash of the sequence for integrity validation
   */
  private createSequenceHash(randomSequence: number[], lightTimings: number[], randomDelay: number): string {
    const data = {
      randomSequence: randomSequence.map(n => Math.round(n * 1000000)), // Round to avoid floating point issues
      lightTimings: lightTimings.map(t => Math.round(t)),
      randomDelay: Math.round(randomDelay),
      config: {
        lightInterval: this.config.lightInterval,
        minRandomDelay: this.config.minRandomDelay,
        maxRandomDelay: this.config.maxRandomDelay
      }
    };

    // Simple hash function (in production, use a proper crypto hash)
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Validate replay integrity
   */
  validateReplay(expectedReplayData: ReplayData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!this.seededRandom) {
      errors.push('No seeded random generator available');
      return { isValid: false, errors };
    }

    const currentState = this.seededRandom.getState();

    // Validate seed
    if (currentState.seed !== expectedReplayData.seed) {
      errors.push(`Seed mismatch: expected ${expectedReplayData.seed}, got ${currentState.seed}`);
    }

    // Validate random sequence
    if (!SeededRandom.validateSequence(currentState.sequence, expectedReplayData.randomSequence)) {
      errors.push('Random sequence mismatch');
    }

    // Validate light timings (allow small tolerance for timing variations)
    if (this.lightActivationTimes.length !== expectedReplayData.lightTimings.length) {
      errors.push('Light timing count mismatch');
    } else {
      for (let i = 0; i < this.lightActivationTimes.length; i++) {
        const diff = Math.abs(this.lightActivationTimes[i] - expectedReplayData.lightTimings[i]);
        if (diff > 10) { // Allow 10ms tolerance
          errors.push(`Light timing ${i} differs by ${diff}ms (tolerance: 10ms)`);
        }
      }
    }

    // Validate total duration
    const currentDuration = this.lightsOutTime - this.sequenceStartTime;
    const durationDiff = Math.abs(currentDuration - expectedReplayData.totalDuration);
    if (durationDiff > 20) { // Allow 20ms tolerance for total duration
      errors.push(`Total duration differs by ${durationDiff}ms (tolerance: 20ms)`);
    }

    // Validate sequence hash
    const currentHash = this.createSequenceHash(
      currentState.sequence,
      this.lightActivationTimes,
      this.generateDeterministicDelay()
    );
    if (currentHash !== expectedReplayData.sequenceHash) {
      errors.push('Sequence hash mismatch - replay integrity compromised');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Synchronize timing with another engine for fair competition
   */
  synchronizeWith(otherEngine: TimingEngine): {
    synchronized: boolean;
    timeDifference: number;
  } {
    const myTime = this.getCurrentTime();
    const otherTime = otherEngine.getCurrentTime();
    const timeDifference = Math.abs(myTime - otherTime);

    // Consider synchronized if within 5ms
    const synchronized = timeDifference <= 5;

    return {
      synchronized,
      timeDifference
    };
  }

  /**
   * Create a deterministic session for challenge replay
   */
  createDeterministicSession(seed: number, config: TimingConfig): {
    sessionId: string;
    seed: number;
    config: TimingConfig;
    timestamp: number;
  } {
    const sessionId = `session_${seed}_${Date.now()}`;
    
    return {
      sessionId,
      seed,
      config: { ...config },
      timestamp: Date.now()
    };
  }

  /**
   * Restore a deterministic session
   */
  restoreDeterministicSession(session: {
    sessionId: string;
    seed: number;
    config: TimingConfig;
    timestamp: number;
  }): boolean {
    try {
      this.config = { ...session.config };
      this.setSeed(session.seed);
      this.reset();
      return true;
    } catch (error) {
      console.error('Failed to restore deterministic session:', error);
      return false;
    }
  }
}

/**
 * Input Event Handler for high-precision input detection with false start detection
 */
export class InputHandler {
  private timingEngine: TimingEngine;
  private isEnabled: boolean = false;
  private debounceTime: number = 50; // ms
  private lastInputTime: number = 0;
  private isInCooldown: boolean = false;
  private cooldownDuration: number = 600; // ms - false start cooldown

  // Event callbacks
  private onValidInput?: (measurement: ReactionMeasurement) => void;
  private onFalseStart?: (timestamp: number) => void;
  private onInvalidInput?: (reason: string) => void;

  constructor(timingEngine: TimingEngine) {
    this.timingEngine = timingEngine;
    this.setupEventListeners();
  }

  /**
   * Enable input detection (respects cooldown period)
   */
  enable(): void {
    if (!this.isInCooldown) {
      this.isEnabled = true;
    }
  }

  /**
   * Disable input detection
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Check if input is currently enabled
   */
  isInputEnabled(): boolean {
    return this.isEnabled && !this.isInCooldown;
  }

  /**
   * Check if currently in cooldown period
   */
  isInCooldownPeriod(): boolean {
    return this.isInCooldown;
  }

  /**
   * Start cooldown period (typically after false start)
   */
  startCooldown(duration: number = this.cooldownDuration): void {
    this.isEnabled = false;
    this.isInCooldown = true;

    setTimeout(() => {
      this.isInCooldown = false;
      // Don't automatically re-enable input - let the game manager control this
    }, duration);
  }

  /**
   * Force enable input (bypasses cooldown - use carefully)
   */
  forceEnable(): void {
    this.isEnabled = true;
    this.isInCooldown = false;
  }

  /**
   * Set event callbacks
   */
  onValidReaction(callback: (measurement: ReactionMeasurement) => void): void {
    this.onValidInput = callback;
  }

  onFalseStartDetected(callback: (timestamp: number) => void): void {
    this.onFalseStart = callback;
  }

  onInvalidInputDetected(callback: (reason: string) => void): void {
    this.onInvalidInput = callback;
  }

  /**
   * Handle user input (mouse click or keyboard) with comprehensive validation
   */
  private handleInput(event: Event): void {
    const timestamp = performance.now();

    // Prevent default behavior for all input events
    event.preventDefault();

    // Check if input is enabled (includes cooldown check)
    if (!this.isInputEnabled()) {
      if (this.isInCooldown) {
        this.onInvalidInput?.('Input blocked - cooldown period active');
      }
      return;
    }

    // Debounce rapid inputs to prevent double-tap issues
    if (timestamp - this.lastInputTime < this.debounceTime) {
      this.onInvalidInput?.('Input too rapid - debounced');
      return;
    }

    this.lastInputTime = timestamp;

    // Check if sequence is still running (false start detection)
    if (this.timingEngine.isSequenceRunning()) {
      // Disable input immediately to prevent multiple false starts
      this.disable();
      
      // Start cooldown period
      this.startCooldown();
      
      // Notify false start
      this.onFalseStart?.(timestamp);
      return;
    }

    // Check if lights have gone out (valid reaction window)
    if (this.timingEngine.getLightsOutTime() === 0) {
      this.onInvalidInput?.('Lights have not gone out yet');
      return;
    }

    // Disable input immediately after valid reaction to prevent multiple inputs
    this.disable();

    // Record valid reaction
    try {
      const measurement = this.timingEngine.recordReaction();
      this.onValidInput?.(measurement);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.onInvalidInput?.(errorMessage);
    }
  }

  /**
   * Set up DOM event listeners for mouse and keyboard input
   */
  private setupEventListeners(): void {
    // Mouse click handler
    const handleClick = (event: MouseEvent) => {
      this.handleInput(event);
    };

    // Keyboard handler (spacebar)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        this.handleInput(event);
      }
    };

    // Touch handler for mobile devices
    const handleTouchStart = (event: TouchEvent) => {
      // Only handle single touch to avoid multi-touch issues
      if (event.touches.length === 1) {
        this.handleInput(event);
      }
    };

    // Add event listeners
    document.addEventListener('click', handleClick, { passive: false });
    document.addEventListener('keydown', handleKeyDown, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Store cleanup function
    this.cleanup = () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }

  /**
   * Get input handler status for debugging
   */
  getStatus(): {
    enabled: boolean;
    inCooldown: boolean;
    lastInputTime: number;
    debounceTime: number;
    cooldownDuration: number;
  } {
    return {
      enabled: this.isEnabled,
      inCooldown: this.isInCooldown,
      lastInputTime: this.lastInputTime,
      debounceTime: this.debounceTime,
      cooldownDuration: this.cooldownDuration,
    };
  }

  private cleanup?: () => void;

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.cleanup?.();
  }
}