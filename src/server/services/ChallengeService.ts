import type { Context } from '@devvit/web/server';
import { KVStorageService } from './KVStorageService.js';
import { ValidationService } from './ValidationService.js';
import { 
  Challenge, 
  ChallengeAttempt, 
  ChallengeSession, 
  ChallengeResult,
  GameConfiguration 
} from '../../shared/types/game.js';

interface ReplayValidationData {
  seed: number;
  sequenceHash: string;
  lightTimings: number[];
  totalDuration: number;
  timestamp: number;
}

interface DeterministicSession {
  challengeId: string;
  seed: number;
  createdAt: string;
  validatedAt?: string;
  replayData?: ReplayValidationData;
}

export class ChallengeService {
  private context: Context;
  private sessionCache: Map<string, DeterministicSession> = new Map();

  constructor(context: Context) {
    this.context = context;
  }

  /**
   * Create a new challenge from a game result
   */
  async createChallenge(
    username: string,
    reactionTime: number,
    gameConfig: GameConfiguration
  ): Promise<{ challengeId: string; challengeUrl: string; expiresAt: string }> {
    // Generate unique challenge ID
    const challengeId = this.generateChallengeId();
    
    // Generate deterministic seed for reproducible gameplay
    const seed = this.generateSeed();
    
    // Set expiration to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const challenge: Challenge = {
      id: challengeId,
      creator: username,
      creatorTime: reactionTime,
      seed: seed,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
      acceptedBy: [],
      gameConfig: gameConfig
    };

    // Store challenge in KV storage with 7-day TTL
    const key = `challenge:${challengeId}`;
    await KVStorageService.set(key, challenge, 7 * 24 * 60 * 60); // 7 days in seconds

    // Generate shareable URL
    const challengeUrl = this.generateChallengeUrl(challengeId);

    return {
      challengeId,
      challengeUrl,
      expiresAt
    };
  }

  /**
   * Load a challenge by ID
   */
  async loadChallenge(challengeId: string): Promise<Challenge | null> {
    const key = `challenge:${challengeId}`;
    const challenge = await KVStorageService.get<Challenge>(key);
    
    if (!challenge) {
      return null;
    }

    // Check if challenge has expired
    if (new Date(challenge.expiresAt) < new Date()) {
      // Clean up expired challenge
      await KVStorageService.delete(key);
      return null;
    }

    return challenge;
  }

  /**
   * Accept a challenge and create a deterministic session
   */
  async acceptChallenge(challengeId: string, username: string): Promise<ChallengeSession | null> {
    const challenge = await this.loadChallenge(challengeId);
    
    if (!challenge) {
      return null;
    }

    // Create deterministic session
    const deterministicSession = await this.createDeterministicSession(challengeId, username);
    
    // Check if user already completed this challenge
    const existingAttempt = challenge.acceptedBy.find(attempt => attempt.username === username);
    if (existingAttempt) {
      // Return session with existing attempt data
      return {
        challenge,
        seed: challenge.seed,
        ghostTiming: challenge.creatorTime,
        isActive: true,
        opponentData: {
          userId: 'creator',
          username: challenge.creator,
          reactionTime: challenge.creatorTime,
          completedAt: challenge.createdAt,
          rating: this.calculateRating(challenge.creatorTime)
        }
      };
    }

    return {
      challenge,
      seed: challenge.seed,
      ghostTiming: challenge.creatorTime,
      isActive: true,
      opponentData: {
        userId: 'creator',
        username: challenge.creator,
        reactionTime: challenge.creatorTime,
        completedAt: challenge.createdAt,
        rating: this.calculateRating(challenge.creatorTime)
      }
    };
  }

  /**
   * Create a deterministic session for replay consistency
   */
  async createDeterministicSession(challengeId: string, username: string): Promise<DeterministicSession> {
    const challenge = await this.loadChallenge(challengeId);
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const session: DeterministicSession = {
      challengeId,
      seed: challenge.seed,
      createdAt: new Date().toISOString()
    };

    // Store session for validation
    this.sessionCache.set(`${challengeId}_${username}`, session);
    
    // Also store in KV for persistence
    const sessionKey = `challenge_session:${challengeId}:${username}`;
    await KVStorageService.set(sessionKey, session, 24 * 60 * 60); // 24 hours TTL

    return session;
  }

  /**
   * Validate replay data for integrity
   */
  async validateReplayData(
    challengeId: string, 
    username: string, 
    replayData: ReplayValidationData
  ): Promise<{
    isValid: boolean;
    errors: string[];
    confidence: number;
  }> {
    const errors: string[] = [];
    let confidence = 1.0;

    try {
      // Get the original challenge
      const challenge = await this.loadChallenge(challengeId);
      if (!challenge) {
        errors.push('Challenge not found');
        return { isValid: false, errors, confidence: 0 };
      }

      // Get the deterministic session
      const sessionKey = `challenge_session:${challengeId}:${username}`;
      const session = await KVStorageService.get<DeterministicSession>(sessionKey);
      
      if (!session) {
        errors.push('No session found for replay validation');
        confidence *= 0.5;
      } else {
        // Validate seed
        if (session.seed !== replayData.seed) {
          errors.push('Seed mismatch in replay data');
          confidence *= 0.3;
        }

        // Validate timing bounds
        const expectedMinDuration = 5 * 900 + challenge.gameConfig.minRandomDelay; // 5 lights + min delay
        const expectedMaxDuration = 5 * 900 + challenge.gameConfig.maxRandomDelay; // 5 lights + max delay
        
        if (replayData.totalDuration < expectedMinDuration || replayData.totalDuration > expectedMaxDuration) {
          errors.push(`Total duration ${replayData.totalDuration}ms outside expected bounds [${expectedMinDuration}-${expectedMaxDuration}ms]`);
          confidence *= 0.6;
        }

        // Validate light timing count
        if (replayData.lightTimings.length !== 5) {
          errors.push(`Expected 5 light timings, got ${replayData.lightTimings.length}`);
          confidence *= 0.4;
        }

        // Validate light timing intervals
        for (let i = 1; i < replayData.lightTimings.length; i++) {
          const interval = replayData.lightTimings[i] - replayData.lightTimings[i - 1];
          const expectedInterval = challenge.gameConfig.lightInterval;
          const tolerance = 50; // 50ms tolerance
          
          if (Math.abs(interval - expectedInterval) > tolerance) {
            errors.push(`Light interval ${i} is ${interval}ms, expected ~${expectedInterval}ms (tolerance: ${tolerance}ms)`);
            confidence *= 0.7;
          }
        }

        // Update session with validation data
        session.validatedAt = new Date().toISOString();
        session.replayData = replayData;
        await KVStorageService.set(sessionKey, session, 24 * 60 * 60);
      }

      // Validate sequence hash format
      if (!replayData.sequenceHash || typeof replayData.sequenceHash !== 'string') {
        errors.push('Invalid or missing sequence hash');
        confidence *= 0.8;
      }

      return {
        isValid: errors.length === 0,
        errors,
        confidence
      };

    } catch (error) {
      console.error('Replay validation error:', error);
      return {
        isValid: false,
        errors: ['Validation system error'],
        confidence: 0
      };
    }
  }

  /**
   * Synchronize timing between challenge participants
   */
  async synchronizeTiming(challengeId: string, participants: string[]): Promise<{
    synchronized: boolean;
    participants: string[];
    syncTimestamp: number;
  }> {
    try {
      const syncTimestamp = Date.now();
      
      // For deterministic challenges, synchronization is guaranteed by the seed
      // Store sync data for reference
      const syncKey = `challenge_sync:${challengeId}`;
      const syncData = {
        challengeId,
        participants,
        syncTimestamp,
        synchronized: true
      };
      
      await KVStorageService.set(syncKey, syncData, 60 * 60); // 1 hour TTL
      
      return {
        synchronized: true,
        participants,
        syncTimestamp
      };

    } catch (error) {
      console.error('Timing synchronization error:', error);
      return {
        synchronized: false,
        participants: [],
        syncTimestamp: Date.now()
      };
    }
  }

  /**
   * Get deterministic session data
   */
  async getDeterministicSession(challengeId: string, username: string): Promise<DeterministicSession | null> {
    // Try cache first
    const cacheKey = `${challengeId}_${username}`;
    if (this.sessionCache.has(cacheKey)) {
      return this.sessionCache.get(cacheKey) || null;
    }

    // Try KV storage
    const sessionKey = `challenge_session:${challengeId}:${username}`;
    const session = await KVStorageService.get<DeterministicSession>(sessionKey);
    
    if (session) {
      this.sessionCache.set(cacheKey, session);
    }
    
    return session;
  }

  /**
   * Store replay validation result
   */
  async storeReplayValidation(
    challengeId: string, 
    username: string, 
    validationResult: {
      isValid: boolean;
      errors: string[];
      confidence: number;
    }
  ): Promise<void> {
    const validationKey = `challenge_validation:${challengeId}:${username}`;
    const validationData = {
      challengeId,
      username,
      timestamp: new Date().toISOString(),
      ...validationResult
    };
    
    await KVStorageService.set(validationKey, validationData, 7 * 24 * 60 * 60); // 7 days TTL
  }

  /**
   * Submit a challenge result
   */
  async submitChallengeResult(
    challengeId: string,
    username: string,
    reactionTime: number,
    rating: string
  ): Promise<ChallengeResult | null> {
    const challenge = await this.loadChallenge(challengeId);
    
    if (!challenge) {
      return null;
    }

    // Validate the reaction time
    if (!ValidationService.validateReactionTime(reactionTime)) {
      throw new Error('Invalid reaction time');
    }

    // Create challenge attempt
    const attempt: ChallengeAttempt = {
      userId: username, // Use username as userId for simplicity
      username,
      reactionTime,
      completedAt: new Date().toISOString(),
      rating
    };

    // Add attempt to challenge (or update existing)
    const existingIndex = challenge.acceptedBy.findIndex(a => a.username === username);
    if (existingIndex >= 0) {
      challenge.acceptedBy[existingIndex] = attempt;
    } else {
      challenge.acceptedBy.push(attempt);
    }

    // Update challenge in storage
    const key = `challenge:${challengeId}`;
    await KVStorageService.set(key, challenge, 7 * 24 * 60 * 60);

    // Calculate result
    const result: ChallengeResult = {
      challengeId,
      userTime: reactionTime,
      opponentTime: challenge.creatorTime,
      winner: this.determineWinner(reactionTime, challenge.creatorTime),
      marginOfVictory: Math.abs(reactionTime - challenge.creatorTime),
      userRating: rating,
      opponentRating: this.calculateRating(challenge.creatorTime)
    };

    return result;
  }

  /**
   * Get challenge history for a user
   */
  async getChallengeHistory(): Promise<Challenge[]> {
    // This would require indexing challenges by user
    // For now, return empty array as this is a complex query
    return [];
  }

  /**
   * Clean up expired challenges
   * Note: Since Devvit Redis doesn't support SCAN operations, we rely on TTL for automatic cleanup
   * This method serves as a manual cleanup trigger for specific challenges
   */
  async cleanupExpiredChallenges(): Promise<{ cleaned: number; errors: number }> {
    let cleaned = 0;
    let errors = 0;

    try {
      // Since we can't scan all keys, we rely on the TTL mechanism for automatic cleanup
      // This method can be used to manually clean up specific challenges if needed
      console.log('Challenge cleanup relies on TTL mechanism for automatic expiration');
      
      // In a production system, you might maintain an index of active challenges
      // For now, we'll just log that cleanup is handled by TTL
      return { cleaned, errors };
    } catch (error) {
      console.error('Challenge cleanup failed:', error);
      return { cleaned, errors: errors + 1 };
    }
  }

  /**
   * Get challenge statistics
   * Note: Limited implementation due to lack of key scanning in Devvit Redis
   */
  async getChallengeStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    averageAttempts: number;
    mostPopularChallenge: string | null;
  }> {
    try {
      // Since we can't scan all challenge keys, we return basic stats
      // In a production system, you'd maintain counters and indexes
      console.log('Challenge stats are limited due to Redis SCAN limitations');
      
      return {
        totalActive: 0, // Would need to be tracked separately
        totalExpired: 0, // Would need to be tracked separately
        averageAttempts: 0, // Would need to be calculated from tracked data
        mostPopularChallenge: null // Would need to be tracked separately
      };
    } catch (error) {
      console.error('Failed to get challenge stats:', error);
      return {
        totalActive: 0,
        totalExpired: 0,
        averageAttempts: 0,
        mostPopularChallenge: null
      };
    }
  }

  /**
   * Manually clean up a specific expired challenge
   */
  async cleanupSpecificChallenge(challengeId: string): Promise<boolean> {
    try {
      const challenge = await this.loadChallenge(challengeId);
      
      if (!challenge) {
        // Challenge doesn't exist or already expired/cleaned up
        return true;
      }

      if (new Date(challenge.expiresAt) < new Date()) {
        // Challenge has expired, delete it
        const key = `challenge:${challengeId}`;
        await KVStorageService.delete(key);
        console.log(`Manually cleaned up expired challenge: ${challengeId}`);
        return true;
      }

      // Challenge is still active
      return false;
    } catch (error) {
      console.error(`Error cleaning up specific challenge ${challengeId}:`, error);
      return false;
    }
  }

  /**
   * Generate a unique challenge ID
   */
  private generateChallengeId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Generate a deterministic seed for reproducible gameplay
   */
  private generateSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Generate a shareable challenge URL
   */
  private generateChallengeUrl(challengeId: string): string {
    // Generate URL that works with the current Reddit post context
    // This will be the current post URL with challenge parameter
    const subredditName = this.context.subredditName || 'f1startchallenge';
    const postId = this.context.postId;
    
    if (postId) {
      // Use the current post URL with challenge parameter
      return `https://reddit.com/r/${subredditName}/comments/${postId}?challenge=${challengeId}`;
    } else {
      // Fallback to subreddit URL with challenge parameter
      return `https://reddit.com/r/${subredditName}?challenge=${challengeId}`;
    }
  }

  /**
   * Calculate rating from reaction time
   */
  private calculateRating(reactionTime: number): string {
    if (reactionTime < 200) return 'perfect';
    if (reactionTime < 300) return 'excellent';
    if (reactionTime < 400) return 'good';
    if (reactionTime < 500) return 'fair';
    return 'slow';
  }

  /**
   * Determine winner of a challenge
   */
  private determineWinner(userTime: number, opponentTime: number): 'user' | 'opponent' | 'tie' {
    const difference = Math.abs(userTime - opponentTime);
    
    // Consider times within 5ms as a tie
    if (difference <= 5) {
      return 'tie';
    }
    
    return userTime < opponentTime ? 'user' : 'opponent';
  }
}