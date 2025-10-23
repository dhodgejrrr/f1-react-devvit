import {
  GameState,
  GameConfiguration,
  GameResult,
  LightState,
  UserSession,
} from '../../shared/types/game.js';
import { TimingEngine, InputHandler, type TimingConfig } from '../engines/TimingEngine.js';
import { ResultCalculator } from './ResultCalculator.js';
import { audioSystem } from './AudioSystem.js';
import { audioAnnouncer } from './AudioAnnouncer.js';

/**
 * Core game manager that orchestrates the F1 Start Challenge game logic
 * Implements the GameManager interface from the design specification
 */
export class GameManager {
  private _currentState: GameState = GameState.SPLASH;
  private _gameConfig: GameConfiguration;
  private _userSession: UserSession | null = null;

  // Timing engines
  private _timingEngine: TimingEngine;
  private _inputHandler: InputHandler;
  private _resultCalculator: ResultCalculator;

  // Timing state
  private _lightsOutTime: number | null = null;
  private _lights: LightState[] = [];

  // Challenge state
  private _challengeId: string | null = null;
  private _ghostTiming: number | null = null;

  // Event callbacks
  private _onStateChange?: (state: GameState) => void;
  private _onLightActivate?: (index: number, timestamp: number) => void;
  private _onLightsOut?: (timestamp: number) => void;
  private _onResult?: (result: GameResult) => void;
  private _onError?: (error: string) => void;

  // Activity tracking
  private _activityTracker?: (type: 'game_start' | 'game_complete' | 'leaderboard_view' | 'challenge_create' | 'challenge_accept', data?: any) => Promise<void>;

  constructor(config: GameConfiguration) {
    this._gameConfig = { ...config };
    this._initializeLights();
    
    // Initialize timing engine
    const timingConfig: TimingConfig = {
      lightInterval: config.lightInterval,
      minRandomDelay: config.minRandomDelay,
      maxRandomDelay: config.maxRandomDelay,
    };
    
    this._timingEngine = new TimingEngine(timingConfig);
    this._inputHandler = new InputHandler(this._timingEngine);
    this._resultCalculator = new ResultCalculator();
    
    this._setupTimingEngineCallbacks();
    this._setupInputHandlerCallbacks();
  }

  // Getters
  get currentState(): GameState {
    return this._currentState;
  }

  get gameConfig(): GameConfiguration {
    return { ...this._gameConfig };
  }

  get userSession(): UserSession | null {
    return this._userSession;
  }

  get lights(): LightState[] {
    return [...this._lights];
  }

  get challengeId(): string | null {
    return this._challengeId;
  }

  get ghostTiming(): number | null {
    return this._ghostTiming;
  }

  // Event handlers
  onStateChange(callback: (state: GameState) => void): void {
    this._onStateChange = callback;
  }

  onLightActivate(callback: (index: number, timestamp: number) => void): void {
    this._onLightActivate = callback;
  }

  onLightsOut(callback: (timestamp: number) => void): void {
    this._onLightsOut = callback;
  }

  onResult(callback: (result: GameResult) => void): void {
    this._onResult = callback;
  }

  onError(callback: (error: string) => void): void {
    this._onError = callback;
  }

  // Activity tracking
  setActivityTracker(tracker: (type: 'game_start' | 'game_complete' | 'leaderboard_view' | 'challenge_create' | 'challenge_accept', data?: any) => Promise<void>): void {
    this._activityTracker = tracker;
  }

  // Core Methods
  async initializeGame(): Promise<void> {
    try {
      // Initialize lights
      this._initializeLights();

      // Initialize audio system
      if (audioSystem.isSupported()) {
        try {
          await audioSystem.initialize();
        } catch (error) {
          console.warn('Audio initialization failed, continuing without audio:', error);
        }
      }

      // Transition to ready state
      this.transitionToState(GameState.READY);

      // Load user session if available
      await this._loadUserSession();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize game';
      this._onError?.(errorMessage);
      throw error;
    }
  }

  async startGameSequence(): Promise<void> {
    try {
      if (this._currentState !== GameState.READY) {
        throw new Error('Game must be in READY state to start sequence');
      }

      // Track game start activity
      await this._trackActivity('game_start', {
        challengeId: this._challengeId,
        difficulty: this._gameConfig.difficultyMode,
        timestamp: Date.now()
      });

      // Reset lights and timing
      this._initializeLights();
      this._lightsOutTime = null;

      // Announce game start
      audioAnnouncer.announceGameStart();

      // Transition to lights sequence
      this.transitionToState(GameState.LIGHTS_SEQUENCE);

      // Start the light sequence
      await this._runLightSequence();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start game sequence';
      this._onError?.(errorMessage);
      throw error;
    }
  }

  handleUserInput(_event: InputEvent): void {
    const timestamp = performance.now();

    // Check if input is allowed
    if (this._currentState === GameState.LIGHTS_SEQUENCE) {
      // False start - input before lights out
      this._handleFalseStart(timestamp);
      return;
    }

    if (this._currentState === GameState.WAITING_FOR_INPUT && this._lightsOutTime) {
      // Valid reaction - calculate reaction time
      const reactionTime = timestamp - this._lightsOutTime;
      this._handleValidReaction(reactionTime, timestamp);
      return;
    }

    // Input not allowed in current state
    console.warn('Input ignored - not in valid state for user input');
  }

  processResults(reactionTime: number): GameResult {
    // Get user history for personal best calculation
    const userHistory = this._userSession?.sessionStats 
      ? this._getUserReactionHistory() 
      : undefined;

    // Get community data (placeholder - would come from leaderboard service)
    const communityData = undefined; // TODO: Implement in leaderboard system

    // Calculate complete result using ResultCalculator
    const result = this._resultCalculator.calculateResult(
      reactionTime,
      userHistory,
      communityData
    );

    // Update user session stats
    this._updateSessionStats(result);

    return result;
  }

  transitionToState(newState: GameState): void {
    const previousState = this._currentState;
    this._currentState = newState;

    console.log(`Game state transition: ${previousState} -> ${newState}`);
    this._onStateChange?.(newState);
  }

  resetGame(): void {
    this._initializeLights();
    this._lightsOutTime = null;
    this._challengeId = null;
    this._ghostTiming = null;
    this.transitionToState(GameState.READY);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<GameConfiguration>): void {
    this._gameConfig = { ...this._gameConfig, ...newConfig };
    
    // Update timing engine configuration
    const timingConfig: Partial<TimingConfig> = {};
    if (newConfig.lightInterval !== undefined) {
      timingConfig.lightInterval = newConfig.lightInterval;
    }
    if (newConfig.minRandomDelay !== undefined) {
      timingConfig.minRandomDelay = newConfig.minRandomDelay;
    }
    if (newConfig.maxRandomDelay !== undefined) {
      timingConfig.maxRandomDelay = newConfig.maxRandomDelay;
    }
    
    this._timingEngine.updateConfig(timingConfig);
  }

  // Challenge methods
  setChallenge(challengeId: string, ghostTiming: number): void {
    this._challengeId = challengeId;
    this._ghostTiming = ghostTiming;
    
    // Set deterministic seed for challenge mode
    const seed = this._generateSeedFromChallengeId(challengeId);
    this._timingEngine.setSeed(seed);
  }

  clearChallenge(): void {
    this._challengeId = null;
    this._ghostTiming = null;
    
    // Clear deterministic seed
    this._timingEngine.clearSeed();
  }

  // Input control methods
  enableInput(): void {
    this._inputHandler.enable();
  }

  disableInput(): void {
    this._inputHandler.disable();
  }

  isInputEnabled(): boolean {
    return this._inputHandler.isInputEnabled();
  }

  isInCooldown(): boolean {
    return this._inputHandler.isInCooldownPeriod();
  }

  forceEnableInput(): void {
    this._inputHandler.forceEnable();
  }

  getInputStatus(): {
    enabled: boolean;
    inCooldown: boolean;
    lastInputTime: number;
    debounceTime: number;
    cooldownDuration: number;
  } {
    return this._inputHandler.getStatus();
  }

  // Private methods
  private _initializeLights(): void {
    this._lights = Array.from({ length: 5 }, (_, index) => ({
      index,
      isActive: false,
      activatedAt: 0,
    }));
  }

  private async _runLightSequence(): Promise<void> {
    try {
      // Disable input during sequence - false starts will be detected by InputHandler
      this._inputHandler.disable();
      
      // Start the timing engine sequence
      const result = await this._timingEngine.startSequence();
      
      // Store lights out time
      this._lightsOutTime = result.lightsOutTime;
      
      // Enable input after lights out (only if not in cooldown)
      this._inputHandler.enable();
      
      // Schedule ghost sound if in challenge mode
      if (this._ghostTiming !== null) {
        this._scheduleGhostSound(this._ghostTiming);
      }
      
      // Transition to waiting for input state
      this.transitionToState(GameState.WAITING_FOR_INPUT);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Light sequence failed';
      this._onError?.(errorMessage);
      throw error;
    }
  }



  private _handleFalseStart(timestamp: number): void {
    console.log('False start detected at:', timestamp);
    
    // Input handler already disabled itself and started cooldown
    
    // Use ResultCalculator for false start result
    const result = this._resultCalculator.calculateResult(-1);

    // Track false start activity
    this._trackActivity('game_complete', {
      reactionTime: -1,
      rating: 'false_start',
      isPersonalBest: false,
      challengeId: this._challengeId,
      timestamp: Date.now()
    });

    // Play false start sound
    audioSystem.playResultSound('false_start');
    
    // Announce false start for accessibility
    audioAnnouncer.announceResult(-1, 'false_start');

    // Transition to results and notify
    this.transitionToState(GameState.SHOWING_RESULTS);
    this._onResult?.(result);
    
    // The InputHandler manages its own cooldown period (600ms)
    // No need to manage it here as well
  }

  private _handleValidReaction(reactionTime: number, _timestamp: number): void {
    const result = this.processResults(reactionTime);
    
    // Track game completion activity
    this._trackActivity('game_complete', {
      reactionTime: result.reactionTime,
      rating: result.rating,
      isPersonalBest: result.isPersonalBest,
      challengeId: this._challengeId,
      timestamp: Date.now()
    });
    
    // Play result sound
    audioSystem.playResultSound(result.rating);
    
    // Announce result for accessibility
    audioAnnouncer.announceResult(result.reactionTime, result.rating);
    
    // Announce driver comparison if available
    if (result.driverComparison) {
      audioAnnouncer.announceDriverComparison(
        result.driverComparison.fasterThan.length,
        result.driverComparison.slowerThan.length
      );
    }
    
    // Announce percentile if available
    if (result.communityPercentile > 0) {
      audioAnnouncer.announcePercentile(result.communityPercentile);
    }
    
    // Announce personal best
    if (result.isPersonalBest) {
      audioAnnouncer.announcePersonalBest();
    }
    
    this.transitionToState(GameState.SHOWING_RESULTS);
    this._onResult?.(result);
  }

  // Get user's reaction time history for personal best calculation
  private _getUserReactionHistory(): number[] {
    if (!this._userSession) return [];
    
    // In a real implementation, this would return the user's historical reaction times
    // For now, we'll use the personal best if available
    const history: number[] = [];
    
    if (this._userSession.personalBest) {
      history.push(this._userSession.personalBest);
    }
    
    return history;
  }

  private _updateSessionStats(result: GameResult): void {
    if (!this._userSession) return;

    const stats = this._userSession.sessionStats;
    stats.gamesPlayed += 1;

    if (result.rating !== 'false_start') {
      // Update average time
      const totalTime = stats.averageTime * (stats.gamesPlayed - 1) + result.reactionTime;
      stats.averageTime = totalTime / stats.gamesPlayed;

      // Update personal best
      if (result.isPersonalBest) {
        this._userSession.personalBest = result.reactionTime;
      }

      // Count perfect scores
      if (result.rating === 'perfect') {
        stats.perfectScores += 1;
      }
    } else {
      stats.falseStarts += 1;
    }

    // Calculate improvement rate (simplified)
    stats.improvementRate = stats.perfectScores / Math.max(stats.gamesPlayed, 1);
  }

  private async _loadUserSession(): Promise<void> {
    // In a real implementation, this would load from the server
    // For now, create a mock session
    if (!this._userSession) {
      this._userSession = {
        userId: 'mock-user-id',
        username: 'Player',
        sessionStart: Date.now(),
        personalBest: null,
        sessionStats: {
          gamesPlayed: 0,
          averageTime: 0,
          falseStarts: 0,
          perfectScores: 0,
          improvementRate: 0,
        },
        preferences: {
          audioEnabled: true,
          audioVolume: 0.7,
          lightSoundVolume: 0.8,
          resultSoundVolume: 0.9,
          uiSoundVolume: 0.5,
          difficultyMode: 'normal',
          preferredScope: 'global',
          accessibilityMode: false,
        },
      };
    }

    // Sync audio preferences with audio system
    this._syncAudioPreferences();
  }

  private _syncAudioPreferences(): void {
    if (!this._userSession) return;

    const prefs = this._userSession.preferences;
    audioSystem.setMuted(!prefs.audioEnabled);
    audioSystem.setVolume(prefs.audioVolume);
    audioSystem.setCategoryVolume('lights', prefs.lightSoundVolume);
    audioSystem.setCategoryVolume('results', prefs.resultSoundVolume);
    audioSystem.setCategoryVolume('ui', prefs.uiSoundVolume);
  }



  // Setup timing engine callbacks
  private _setupTimingEngineCallbacks(): void {
    this._timingEngine.onLightActivated((index, timestamp) => {
      // Update light state
      this._lights[index] = {
        index,
        isActive: true,
        activatedAt: timestamp,
      };
      
      // Play light activation sound
      audioSystem.playLightSound(index);
      
      // Announce light activation for accessibility
      audioAnnouncer.announceLightActivated(index, 5);
      
      // Notify listeners
      this._onLightActivate?.(index, timestamp);
    });

    this._timingEngine.onLightsExtinguished((timestamp) => {
      // Turn off all lights
      this._lights = this._lights.map((light) => ({ ...light, isActive: false }));
      
      // Store lights out time
      this._lightsOutTime = timestamp;
      
      // Announce lights out for accessibility
      audioAnnouncer.announceLightsOut();
      
      // Notify listeners
      this._onLightsOut?.(timestamp);
    });

    this._timingEngine.onSequenceCompleted((result) => {
      console.log('Light sequence completed:', result);
    });
  }

  // Setup input handler callbacks
  private _setupInputHandlerCallbacks(): void {
    this._inputHandler.onValidReaction((measurement) => {
      // Process valid reaction
      const result = this.processResults(measurement.reactionTime);
      this.transitionToState(GameState.SHOWING_RESULTS);
      this._onResult?.(result);
    });

    this._inputHandler.onFalseStartDetected((timestamp) => {
      // Handle false start
      this._handleFalseStart(timestamp);
    });

    this._inputHandler.onInvalidInputDetected((reason) => {
      console.warn('Invalid input detected:', reason);
    });
  }

  // Generate seed from challenge ID for deterministic timing
  private _generateSeedFromChallengeId(challengeId: string): number {
    let seed = 0;
    for (let i = 0; i < challengeId.length; i++) {
      seed = ((seed << 5) - seed + challengeId.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(seed);
  }

  // Schedule ghost sound to play at opponent's reaction time
  private _scheduleGhostSound(ghostTiming: number): void {
    setTimeout(() => {
      // Only play if still in waiting for input state (user hasn't reacted yet)
      if (this._currentState === GameState.WAITING_FOR_INPUT) {
        audioSystem.playGhostSound();
        audioAnnouncer.announceGhostIndicator(ghostTiming);
      }
    }, ghostTiming);
  }

  // Audio control methods
  setAudioEnabled(enabled: boolean): void {
    if (this._userSession) {
      this._userSession.preferences.audioEnabled = enabled;
      audioSystem.setMuted(!enabled);
    }
  }

  setAudioVolume(volume: number): void {
    if (this._userSession) {
      this._userSession.preferences.audioVolume = volume;
      audioSystem.setVolume(volume);
    }
  }

  setCategoryVolume(category: 'lights' | 'results' | 'ui', volume: number): void {
    if (!this._userSession) return;

    switch (category) {
      case 'lights':
        this._userSession.preferences.lightSoundVolume = volume;
        break;
      case 'results':
        this._userSession.preferences.resultSoundVolume = volume;
        break;
      case 'ui':
        this._userSession.preferences.uiSoundVolume = volume;
        break;
    }
    
    audioSystem.setCategoryVolume(category, volume);
  }

  getAudioEnabled(): boolean {
    return this._userSession?.preferences.audioEnabled ?? true;
  }

  getAudioVolume(): number {
    return this._userSession?.preferences.audioVolume ?? 0.7;
  }

  getCategoryVolume(category: 'lights' | 'results' | 'ui'): number {
    if (!this._userSession) return 0.5;

    switch (category) {
      case 'lights':
        return this._userSession.preferences.lightSoundVolume;
      case 'results':
        return this._userSession.preferences.resultSoundVolume;
      case 'ui':
        return this._userSession.preferences.uiSoundVolume;
      default:
        return 0.5;
    }
  }

  // Audio announcer controls
  setAudioAnnouncerEnabled(enabled: boolean): void {
    audioAnnouncer.setEnabled(enabled);
  }

  getAudioAnnouncerEnabled(): boolean {
    return audioAnnouncer.isEnabled();
  }

  isAudioAnnouncerSupported(): boolean {
    return audioAnnouncer.isSupported();
  }

  // Private activity tracking method
  private async _trackActivity(type: 'game_start' | 'game_complete' | 'leaderboard_view' | 'challenge_create' | 'challenge_accept', data?: any): Promise<void> {
    try {
      if (this._activityTracker) {
        await this._activityTracker(type, data);
      }
    } catch (error) {
      // Activity tracking failures should not interrupt game flow
      console.warn('Activity tracking failed:', error);
    }
  }

  // Clean up resources
  destroy(): void {
    this._inputHandler.destroy();
    audioSystem.destroy();
  }
}
