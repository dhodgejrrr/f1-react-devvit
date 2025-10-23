// Core game types and interfaces
export enum GameState {
  SPLASH = 'SPLASH',
  READY = 'READY',
  LIGHTS_SEQUENCE = 'LIGHTS_SEQUENCE',
  WAITING_FOR_INPUT = 'WAITING_FOR_INPUT',
  SHOWING_RESULTS = 'SHOWING_RESULTS',
  LEADERBOARD = 'LEADERBOARD',
  CHALLENGE = 'CHALLENGE',
}

export interface GameConfiguration {
  lightInterval: number; // 900ms default
  minRandomDelay: number; // 500ms
  maxRandomDelay: number; // 2500ms
  difficultyMode: 'easy' | 'normal' | 'hard' | 'pro';
}

export interface GameResult {
  reactionTime: number;
  rating: 'perfect' | 'excellent' | 'good' | 'fair' | 'slow' | 'false_start';
  driverComparison: DriverComparison;
  communityPercentile: number;
  isPersonalBest: boolean;
}

export interface DriverComparison {
  userTime: number;
  fasterThan: F1Driver[];
  slowerThan: F1Driver[];
  message: string;
  icon: string;
  color: string;
}

export interface F1Driver {
  id: string;
  name: string;
  team: string;
  avgReactionTime: number; // milliseconds
  consistency: number; // 0-1 scale
  championships: number;
  isActive: boolean;
}

export interface LightState {
  index: number;
  isActive: boolean;
  activatedAt: number;
}

export interface UserSession {
  userId: string;
  username: string;
  sessionStart: number;
  personalBest: number | null;
  sessionStats: SessionStatistics;
  preferences: UserPreferences;
}

export interface SessionStatistics {
  gamesPlayed: number;
  averageTime: number;
  falseStarts: number;
  perfectScores: number;
  improvementRate: number;
}

export interface UserPreferences {
  audioEnabled: boolean;
  audioVolume: number;
  lightSoundVolume: number;
  resultSoundVolume: number;
  uiSoundVolume: number;
  difficultyMode: string;
  preferredScope: LeaderboardScope;
  accessibilityMode: boolean;
}

export type LeaderboardScope = 'global' | `r/${string}`;
export type TimeFilter = 'daily' | 'weekly' | 'alltime';

// Challenge System Types
export interface Challenge {
  id: string;
  creator: string;
  creatorTime: number;
  seed: number; // For deterministic timing
  createdAt: string;
  expiresAt: string;
  acceptedBy: ChallengeAttempt[];
  gameConfig: GameConfiguration;
}

export interface ChallengeAttempt {
  userId: string;
  username: string;
  reactionTime: number;
  completedAt: string;
  rating: string;
}

export interface ChallengeSession {
  challenge: Challenge;
  seed: number;
  ghostTiming: number;
  isActive: boolean;
  opponentData?: ChallengeAttempt;
  replayData?: ReplayValidationData;
  sessionId?: string;
  synchronized?: boolean;
}

export interface ReplayValidationData {
  seed: number;
  sequenceHash: string;
  lightTimings: number[];
  totalDuration: number;
  timestamp: number;
}

export interface DeterministicSession {
  challengeId: string;
  seed: number;
  createdAt: string;
  validatedAt?: string;
  replayData?: ReplayValidationData;
}

export interface ChallengeResult {
  challengeId: string;
  userTime: number;
  opponentTime: number;
  winner: 'user' | 'opponent' | 'tie';
  marginOfVictory: number;
  userRating: string;
  opponentRating: string;
}
