// Client-side interfaces
import type {
  GameState,
  GameConfiguration,
  GameResult,
  LightState,
} from '../../shared/types/index.js';

export interface GameManager {
  // State Management
  currentState: GameState;
  gameConfig: GameConfiguration;

  // Core Methods
  initializeGame(): Promise<void>;
  startGameSequence(): Promise<void>;
  handleUserInput(event: InputEvent): void;
  processResults(reactionTime: number): GameResult;

  // State Transitions
  transitionToState(newState: GameState): void;
  resetGame(): void;
}

export interface TimingEngine {
  // High-Precision Timing
  startSequence(config: GameConfiguration): Promise<number>;
  recordReaction(): number;
  getCurrentTime(): number; // performance.now() wrapper

  // Light Sequence Control
  activateLight(index: number): void;
  deactivateAllLights(): void;
  isSequenceActive(): boolean;

  // Deterministic Seeding (for challenges)
  setSeed(seed: number): void;
  generateDeterministicDelay(): number;
}

export interface AudioSystem {
  // Audio Management
  initialize(): Promise<void>;
  playLightSound(lightIndex: number): void;
  playResultSound(type: 'perfect' | 'excellent' | 'good' | 'fair' | 'slow' | 'false_start'): void;
  playUISound(type: 'button_click' | 'navigation' | 'error' | 'success'): void;
  playGhostSound(): void;
  
  // Volume Control
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  setCategoryVolume(category: 'lights' | 'results' | 'ui', volume: number): void;
  
  // Audio Mixing System
  getAllVolumes(): { master: number; lights: number; results: number; ui: number; };
  setAllVolumes(volumes: { master?: number; lights?: number; results?: number; ui?: number; }): void;
  resetVolumes(): void;

  // Getters
  isSupported(): boolean;
  getContext(): AudioContext | null;
  isMuted(): boolean;
  getVolume(): number;
  getCategoryVolume(category: 'lights' | 'results' | 'ui'): number;
  isInitialized(): boolean;

  // Cleanup
  destroy(): void;
}

export interface AntiCheatEngine {
  // Validation
  validateReactionTime(time: number): ValidationResult;
  analyzeUserPattern(userId: string, newTime: number): OutlierAnalysis;
  trackBehavioralMetrics(session: UserSession): BehaviorProfile;
  enforceRateLimit(userId: string): RateLimitResult;
}

// Component Props Interfaces
export interface LightsComponentProps {
  lights: LightState[];
  onUserInput: (timestamp: number) => void;
  isInputEnabled: boolean;
  ghostIndicator?: GhostIndicator;
}

export interface ResultsScreenProps {
  result: GameResult;
  onPlayAgain: () => void;
  onSubmitScore: () => void;
  onCreateChallenge: () => void;
  onBackToMenu: () => void;
}

export interface GhostIndicator {
  visible: boolean;
  timing: number;
  opacity: number;
}

// Device Capabilities Interface for Task 8.1
export interface DeviceCapabilities {
  highResolutionTime: boolean;
  performanceAPI: boolean;
  isMobile: boolean;
  timingPrecision?: number; // milliseconds
  userAgent?: string;
  screenRefreshRate?: number;
}

// Import types from shared
import type {
  UserSession,
  ValidationResult,
  OutlierAnalysis,
  BehaviorProfile,
  RateLimitResult,
} from '../../shared/types/index.js';
