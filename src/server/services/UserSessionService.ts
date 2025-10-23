import { reddit } from '@devvit/web/server';
import { KVStorageService } from './KVStorageService.js';
import { DataMigrationService } from './DataMigrationService.js';
import type { 
  UserSession, 
  UserPreferences, 
  SessionStatistics
} from '../../shared/types/index.js';

/**
 * User Session Service for managing user data and preferences
 * Handles Reddit API integration, personal bests, and behavioral analytics
 */
export class UserSessionService {
  private static readonly USER_TTL = 90 * 24 * 60 * 60; // 90 days
  private static readonly SESSION_TTL = 24 * 60 * 60; // 24 hours

  /**
   * Initialize or retrieve user session
   */
  static async initializeSession(userId?: string): Promise<UserSession> {
    try {
      // Get current user from Reddit API
      const username = await reddit.getCurrentUsername();
      const actualUserId = userId || username || 'anonymous';
      
      if (actualUserId === 'anonymous') {
        return UserSessionService.createAnonymousSession();
      }

      // Try to load existing session
      const existingSession = await UserSessionService.getSession(actualUserId);
      if (existingSession) {
        // Update last active time
        existingSession.sessionStart = Date.now();
        await UserSessionService.saveSession(existingSession);
        return existingSession;
      }

      // Create new session
      const newSession = await UserSessionService.createNewSession(actualUserId, username || actualUserId);
      await UserSessionService.saveSession(newSession);
      
      return newSession;

    } catch (error) {
      console.error('Failed to initialize session:', error);
      return UserSessionService.createAnonymousSession();
    }
  }

  /**
   * Get existing user session
   */
  static async getSession(userId: string): Promise<UserSession | null> {
    try {
      const sessionKey = KVStorageService.keys.user(userId);
      const rawSession = await KVStorageService.get<any>(sessionKey);
      
      if (!rawSession) {
        return null;
      }

      // Apply data migration if needed
      const migratedSession = await DataMigrationService.migrateUserSession(userId, rawSession);
      
      // Save migrated session if it was changed
      if (JSON.stringify(rawSession) !== JSON.stringify(migratedSession)) {
        await UserSessionService.saveSession(migratedSession);
      }
      
      return migratedSession;
    } catch (error) {
      console.error(`Failed to get session for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Save user session
   */
  static async saveSession(session: UserSession): Promise<boolean> {
    try {
      const sessionKey = KVStorageService.keys.user(session.userId);
      return await KVStorageService.set(sessionKey, session, UserSessionService.USER_TTL);
    } catch (error) {
      console.error(`Failed to save session for ${session.userId}:`, error);
      return false;
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const session = await UserSessionService.getSession(userId);
      if (!session) {
        console.error(`No session found for user ${userId}`);
        return false;
      }

      // Merge preferences
      session.preferences = { ...session.preferences, ...preferences };
      
      return await UserSessionService.saveSession(session);

    } catch (error) {
      console.error(`Failed to update preferences for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user preferences
   */
  static async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const session = await UserSessionService.getSession(userId);
      if (!session) {
        return null;
      }

      // Apply preference migration if needed
      const migratedPreferences = await DataMigrationService.migrateUserPreferences(userId, session.preferences);
      
      // Update session if preferences were migrated
      if (JSON.stringify(session.preferences) !== JSON.stringify(migratedPreferences)) {
        session.preferences = migratedPreferences;
        await UserSessionService.saveSession(session);
      }
      
      return migratedPreferences;
    } catch (error) {
      console.error(`Failed to get preferences for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update session statistics after a game
   */
  static async updateSessionStats(
    userId: string, 
    reactionTime: number, 
    isFalseStart: boolean,
    isPerfect: boolean
  ): Promise<SessionStatistics | null> {
    try {
      const session = await UserSessionService.getSession(userId);
      if (!session) {
        console.error(`No session found for user ${userId}`);
        return null;
      }

      const stats = session.sessionStats;
      
      // Update statistics
      stats.gamesPlayed += 1;
      
      if (!isFalseStart) {
        // Update average time (running average)
        const totalTime = stats.averageTime * (stats.gamesPlayed - 1) + reactionTime;
        stats.averageTime = totalTime / stats.gamesPlayed;
        
        // Update personal best
        if (!session.personalBest || reactionTime < session.personalBest) {
          session.personalBest = reactionTime;
        }
        
        if (isPerfect) {
          stats.perfectScores += 1;
        }
        
        // Calculate improvement rate
        stats.improvementRate = UserSessionService.calculateImprovementRate(stats);
      } else {
        stats.falseStarts += 1;
      }

      await UserSessionService.saveSession(session);
      return stats;

    } catch (error) {
      console.error(`Failed to update session stats for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get user's behavioral profile for anti-cheat analysis
   */
  static async getBehavioralProfile(userId: string): Promise<BehavioralProfile | null> {
    try {
      const session = await UserSessionService.getSession(userId);
      if (!session) {
        return null;
      }

      const stats = session.sessionStats;
      const profile: BehavioralProfile = {
        userId,
        gamesPlayed: stats.gamesPlayed,
        averageTime: stats.averageTime,
        falseStartRate: stats.gamesPlayed > 0 ? stats.falseStarts / stats.gamesPlayed : 0,
        perfectScoreRate: stats.gamesPlayed > 0 ? stats.perfectScores / stats.gamesPlayed : 0,
        improvementRate: stats.improvementRate,
        consistencyScore: UserSessionService.calculateConsistencyScore(stats),
        suspiciousFlags: UserSessionService.analyzeSuspiciousPatterns(stats),
        sessionDuration: Date.now() - session.sessionStart,
        lastActive: session.sessionStart
      };

      return profile;

    } catch (error) {
      console.error(`Failed to get behavioral profile for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Track user activity for analytics
   */
  static async trackActivity(userId: string, activity: UserActivity): Promise<boolean> {
    try {
      const activityKey = `${KVStorageService.keys.user(userId)}:activity`;
      
      await KVStorageService.atomicUpdate<UserActivity[]>(
        activityKey,
        (current) => {
          const activities = current || [];
          activities.push({
            ...activity,
            timestamp: Date.now()
          });
          
          // Keep only last 100 activities
          return activities.slice(-100);
        },
        UserSessionService.SESSION_TTL
      );

      return true;

    } catch (error) {
      console.error(`Failed to track activity for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user activity history
   */
  static async getActivityHistory(userId: string): Promise<UserActivity[]> {
    try {
      const activityKey = `${KVStorageService.keys.user(userId)}:activity`;
      const activities = await KVStorageService.get<UserActivity[]>(activityKey);
      return activities || [];
    } catch (error) {
      console.error(`Failed to get activity history for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Create anonymous session for non-logged-in users
   */
  private static createAnonymousSession(): UserSession {
    return {
      userId: 'anonymous',
      username: 'Anonymous',
      sessionStart: Date.now(),
      personalBest: null,
      sessionStats: UserSessionService.createDefaultStats(),
      preferences: UserSessionService.createDefaultPreferences()
    };
  }

  /**
   * Create new user session
   */
  private static async createNewSession(userId: string, username: string): Promise<UserSession> {
    return {
      userId,
      username,
      sessionStart: Date.now(),
      personalBest: null,
      sessionStats: UserSessionService.createDefaultStats(),
      preferences: UserSessionService.createDefaultPreferences()
    };
  }

  /**
   * Create default session statistics
   */
  private static createDefaultStats(): SessionStatistics {
    return {
      gamesPlayed: 0,
      averageTime: 0,
      falseStarts: 0,
      perfectScores: 0,
      improvementRate: 0
    };
  }

  /**
   * Create default user preferences
   */
  private static createDefaultPreferences(): UserPreferences {
    return {
      audioEnabled: true,
      audioVolume: 0.7,
      lightSoundVolume: 0.8,
      resultSoundVolume: 0.9,
      uiSoundVolume: 0.6,
      difficultyMode: 'normal',
      preferredScope: 'global',
      accessibilityMode: false
    };
  }

  /**
   * Calculate improvement rate based on recent performance
   */
  private static calculateImprovementRate(stats: SessionStatistics): number {
    if (stats.gamesPlayed < 5) {
      return 0; // Not enough data
    }

    // Simple improvement calculation - could be enhanced with more sophisticated analysis
    const perfectRate = stats.perfectScores / stats.gamesPlayed;
    const falseStartRate = stats.falseStarts / stats.gamesPlayed;
    
    // Higher perfect rate and lower false start rate indicate improvement
    return Math.max(0, perfectRate - falseStartRate);
  }

  /**
   * Calculate consistency score for behavioral analysis
   */
  private static calculateConsistencyScore(stats: SessionStatistics): number {
    if (stats.gamesPlayed < 3) {
      return 0.5; // Default neutral score
    }

    // Consistency is inversely related to false start rate
    const falseStartRate = stats.falseStarts / stats.gamesPlayed;
    const consistencyScore = Math.max(0, 1 - (falseStartRate * 2));
    
    return Math.min(1, consistencyScore);
  }

  /**
   * Analyze suspicious patterns in user behavior
   */
  private static analyzeSuspiciousPatterns(stats: SessionStatistics): string[] {
    const flags: string[] = [];

    // Zero false starts over many games is suspicious
    if (stats.gamesPlayed > 10 && stats.falseStarts === 0) {
      flags.push('NO_FALSE_STARTS');
    }

    // Extremely high perfect score rate
    if (stats.gamesPlayed > 5 && (stats.perfectScores / stats.gamesPlayed) > 0.8) {
      flags.push('HIGH_PERFECT_RATE');
    }

    // Unusually consistent average time
    if (stats.averageTime > 0 && stats.averageTime < 150) {
      flags.push('CONSISTENTLY_FAST');
    }

    return flags;
  }

  /**
   * Privacy-compliant data cleanup
   */
  static async deleteUserData(userId: string): Promise<boolean> {
    try {
      const sessionKey = KVStorageService.keys.user(userId);
      const prefsKey = KVStorageService.keys.userPrefs(userId);
      const statsKey = KVStorageService.keys.userStats(userId);
      const activityKey = `${sessionKey}:activity`;

      await Promise.all([
        KVStorageService.delete(sessionKey),
        KVStorageService.delete(prefsKey),
        KVStorageService.delete(statsKey),
        KVStorageService.delete(activityKey)
      ]);

      return true;

    } catch (error) {
      console.error(`Failed to delete user data for ${userId}:`, error);
      return false;
    }
  }
}

/**
 * Supporting interfaces
 */
interface BehavioralProfile {
  userId: string;
  gamesPlayed: number;
  averageTime: number;
  falseStartRate: number;
  perfectScoreRate: number;
  improvementRate: number;
  consistencyScore: number;
  suspiciousFlags: string[];
  sessionDuration: number;
  lastActive: number;
}

interface UserActivity {
  type: 'game_start' | 'game_complete' | 'leaderboard_view' | 'challenge_create' | 'challenge_accept' | 'score_submission_attempt' | 'score_submission_success' | 'score_submission_failed';
  data?: any;
  timestamp?: number;
}