import { useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/DataService.js';
import type { UserSession, UserPreferences } from '../types/index.js';

/**
 * Hook for managing user session and preferences
 * Provides methods for tracking activity and updating preferences
 */
export function useUserSession() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize user session from server
   */
  const initializeSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await DataService.initializeGame();
      if (response.type === 'game_init') {
        setUserSession(response.session);
        
        // Track session initialization
        await DataService.trackActivity({
          type: 'game_start',
          data: { sessionId: response.session.userId }
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize session';
      setError(errorMessage);
      console.error('Session initialization failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await DataService.updatePreferences(preferences);
      if (response.type === 'preferences_update' && response.success && response.preferences) {
        setUserSession(prev => prev ? {
          ...prev,
          preferences: response.preferences!
        } : null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      console.error('Preferences update failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Track user activity
   */
  const trackActivity = useCallback(async (
    type: 'game_start' | 'game_complete' | 'leaderboard_view' | 'challenge_create' | 'challenge_accept' | 'score_submission_attempt' | 'score_submission_success' | 'score_submission_failed',
    data?: any
  ) => {
    try {
      await DataService.trackActivity({ type, data });
    } catch (err) {
      // Activity tracking failures are non-critical
      console.warn('Activity tracking failed:', err);
    }
  }, []);

  /**
   * Get user statistics
   */
  const getUserStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await DataService.getUserStats();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user stats';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get activity history
   */
  const getActivityHistory = useCallback(async () => {
    try {
      const response = await DataService.getActivityHistory();
      return response.activities;
    } catch (err) {
      console.error('Failed to fetch activity history:', err);
      return [];
    }
  }, []);

  /**
   * Delete all user data (privacy compliance)
   */
  const deleteUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await DataService.deleteUserData();
      if (response.success) {
        setUserSession(null);
        // Clear local storage
        DataService.saveToLocalStorage('user_session', null);
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update personal best locally (optimistic update)
   */
  const updatePersonalBest = useCallback((newBest: number) => {
    setUserSession(prev => {
      if (!prev) return null;
      
      if (!prev.personalBest || newBest < prev.personalBest) {
        return {
          ...prev,
          personalBest: newBest
        };
      }
      return prev;
    });
  }, []);

  /**
   * Update session statistics locally (optimistic update)
   */
  const updateSessionStats = useCallback((
    reactionTime: number,
    isFalseStart: boolean,
    isPerfect: boolean
  ) => {
    setUserSession(prev => {
      if (!prev) return null;

      const stats = { ...prev.sessionStats };
      stats.gamesPlayed += 1;

      if (!isFalseStart) {
        // Update average time (running average)
        const totalTime = stats.averageTime * (stats.gamesPlayed - 1) + reactionTime;
        stats.averageTime = totalTime / stats.gamesPlayed;

        if (isPerfect) {
          stats.perfectScores += 1;
        }

        // Simple improvement rate calculation
        const perfectRate = stats.perfectScores / stats.gamesPlayed;
        const falseStartRate = stats.falseStarts / stats.gamesPlayed;
        stats.improvementRate = Math.max(0, perfectRate - falseStartRate);
      } else {
        stats.falseStarts += 1;
      }

      return {
        ...prev,
        sessionStats: stats
      };
    });
  }, []);

  /**
   * Get behavioral profile for anti-cheat analysis
   */
  const getBehavioralProfile = useCallback(() => {
    if (!userSession) return null;

    const stats = userSession.sessionStats;
    return {
      userId: userSession.userId,
      gamesPlayed: stats.gamesPlayed,
      averageTime: stats.averageTime,
      falseStartRate: stats.gamesPlayed > 0 ? stats.falseStarts / stats.gamesPlayed : 0,
      perfectScoreRate: stats.gamesPlayed > 0 ? stats.perfectScores / stats.gamesPlayed : 0,
      improvementRate: stats.improvementRate,
      consistencyScore: calculateConsistencyScore(stats),
      suspiciousFlags: analyzeSuspiciousPatterns(stats),
      sessionDuration: Date.now() - userSession.sessionStart,
      lastActive: userSession.sessionStart
    };
  }, [userSession]);

  /**
   * Check if user is anonymous
   */
  const isAnonymous = useCallback(() => {
    return !userSession || userSession.userId === 'anonymous';
  }, [userSession]);

  /**
   * Get user preferences with fallbacks
   */
  const getPreferences = useCallback(() => {
    return userSession?.preferences || {
      audioEnabled: true,
      audioVolume: 0.7,
      lightSoundVolume: 0.8,
      resultSoundVolume: 0.9,
      uiSoundVolume: 0.6,
      difficultyMode: 'normal',
      preferredScope: 'global' as const,
      accessibilityMode: false
    };
  }, [userSession]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Persist session to localStorage
  useEffect(() => {
    if (userSession) {
      DataService.saveToLocalStorage('user_session', userSession);
    }
  }, [userSession]);

  return {
    // State
    userSession,
    loading,
    error,

    // Actions
    initializeSession,
    updatePreferences,
    trackActivity,
    getUserStats,
    getActivityHistory,
    deleteUserData,
    updatePersonalBest,
    updateSessionStats,

    // Computed values
    getBehavioralProfile,
    isAnonymous,
    getPreferences,

    // Utilities
    clearError: () => setError(null)
  };
}

/**
 * Calculate consistency score for behavioral analysis
 */
function calculateConsistencyScore(stats: any): number {
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
function analyzeSuspiciousPatterns(stats: any): string[] {
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