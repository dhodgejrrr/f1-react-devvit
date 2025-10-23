// Leaderboard and challenge types
import type { LeaderboardScope, TimeFilter } from './game.js';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  reactionTime: number; // milliseconds
  timestamp: string; // ISO 8601
  scope: LeaderboardScope;
  period: TimeFilter;
  flagged: boolean;
}

export interface Challenge {
  id: string;
  creator: string;
  creatorTime: number;
  seed: number; // For deterministic timing
  createdAt: string;
  expiresAt: string;
  acceptedBy: ChallengeAttempt[];
}

export interface ChallengeAttempt {
  userId: string;
  username: string;
  reactionTime: number;
  timestamp: string;
}

export interface ChallengeSession {
  challenge: Challenge;
  seed: number;
  ghostTiming: number;
  isActive: boolean;
}

export interface ChallengeResult {
  winner: string;
  margin: number;
  challengerTime: number;
  opponentTime: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-1
  flags: string[];
  action: 'accept' | 'flag' | 'reject';
}

export interface OutlierAnalysis {
  isOutlier: boolean;
  zScore: number;
  confidence: number;
  reason: string;
}

export interface BehaviorProfile {
  consistencyScore: number;
  falseStartRate: number;
  improvementPattern: number;
  suspiciousFlags: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  reason?: string;
}
