import type {
  GameInitResponse,
  ScoreSubmissionRequest,
  ScoreSubmissionResponse,
  LeaderboardResponse,
  PreferencesUpdateResponse,
  UserStatsResponse,
  ErrorResponse
} from '../../shared/types/api.js';
import type { UserPreferences } from '../../shared/types/game.js';
import type { DeviceCapabilities } from '../types/interfaces.js';
import { ClientValidationService } from './ClientValidationService.js';
import { ErrorReportingService } from './ErrorReportingService.js';
import { DeviceCapabilityService } from './DeviceCapabilityService.js';

/**
 * Client-side data service for API communication
 * Handles all server communication with error handling and offline fallback
 */
export class DataService {
  private static readonly BASE_URL = '/api';

  /**
   * Initialize game session
   */
  static async initializeGame(): Promise<GameInitResponse> {
    try {
      const response = await fetch(`${DataService.BASE_URL}/game/init`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize game');
      }
      
      return data as GameInitResponse;
    } catch (error) {
      console.error('Failed to initialize game:', error);
      throw error;
    }
  }

  /**
   * Submit score to leaderboard
   */
  static async submitScore(submission: ScoreSubmissionRequest): Promise<ScoreSubmissionResponse> {
    // Validate submission client-side first
    const validation = ClientValidationService.validateScoreSubmission(submission);
    if (!validation.isValid) {
      throw new Error(`Invalid submission: ${validation.errors.join(', ')}`);
    }

    return ErrorReportingService.executeWithUserFeedback(
      async () => {
        const response = await fetch(`${DataService.BASE_URL}/game/submit-score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to submit score');
        }
        
        return data as ScoreSubmissionResponse;
      },
      'score_submission'
    ).then(result => {
      if (result.success && result.data) {
        return result.data;
      } else {
        throw result.error || new Error('Score submission failed');
      }
    });
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(
    scope: string = 'global',
    period: string = 'alltime',
    limit: number = 100
  ): Promise<LeaderboardResponse> {
    try {
      const params = new URLSearchParams({
        scope,
        period,
        limit: limit.toString()
      });
      
      const response = await fetch(`${DataService.BASE_URL}/leaderboard?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch leaderboard');
      }
      
      return data as LeaderboardResponse;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get detailed user ranking information
   */
  static async getUserRanking(
    scope: string = 'global',
    period: string = 'alltime'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        scope,
        period
      });
      
      const response = await fetch(`${DataService.BASE_URL}/user/ranking?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch user ranking');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch user ranking:', error);
      throw error;
    }
  }

  /**
   * Get community comparison for a reaction time
   */
  static async getCommunityComparison(
    reactionTime: number,
    scope: string = 'global',
    period: string = 'alltime'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        reactionTime: reactionTime.toString(),
        scope,
        period
      });
      
      const response = await fetch(`${DataService.BASE_URL}/community/comparison?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get community comparison');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get community comparison:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(preferences: Partial<UserPreferences>): Promise<PreferencesUpdateResponse> {
    // Validate preferences client-side first
    const validation = ClientValidationService.validateUserPreferences(preferences);
    if (!validation.isValid) {
      throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
    }

    return ErrorReportingService.executeWithUserFeedback(
      async () => {
        const response = await fetch(`${DataService.BASE_URL}/user/preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ preferences }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to update preferences');
        }
        
        return data as PreferencesUpdateResponse;
      },
      'preferences_update'
    ).then(result => {
      if (result.success && result.data) {
        return result.data;
      } else {
        throw result.error || new Error('Preferences update failed');
      }
    });
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<UserStatsResponse> {
    try {
      const response = await fetch(`${DataService.BASE_URL}/user/stats`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch user stats');
      }
      
      return data as UserStatsResponse;
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      throw error;
    }
  }

  /**
   * Check system health
   */
  static async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${DataService.BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Track user activity for analytics and anti-cheat
   */
  static async trackActivity(activity: {
    type: 'game_start' | 'game_complete' | 'leaderboard_view' | 'challenge_create' | 'challenge_accept' | 'score_submission_attempt' | 'score_submission_success' | 'score_submission_failed';
    data?: any;
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${DataService.BASE_URL}/user/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activity }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to track activity');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to track activity:', error);
      // Don't throw error for activity tracking failures - it's not critical
      return { success: false };
    }
  }

  /**
   * Get user activity history
   */
  static async getActivityHistory(): Promise<{ activities: any[] }> {
    try {
      const response = await fetch(`${DataService.BASE_URL}/user/activity`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch activity history');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch activity history:', error);
      return { activities: [] };
    }
  }

  /**
   * Delete all user data (privacy compliance)
   */
  static async deleteUserData(): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${DataService.BASE_URL}/user/data`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user data');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw error;
    }
  }

  /**
   * Get storage status and quota information
   */
  static async getStorageStatus(): Promise<any> {
    try {
      const response = await fetch(`${DataService.BASE_URL}/storage/status`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get storage status');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get storage status:', error);
      // Return fallback status
      return {
        type: 'storage_status',
        quota: { status: 'unknown', message: 'Unable to check quota' },
        connection: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get user achievements
   */
  static async getUserAchievements(
    scope: string = 'global',
    period: string = 'alltime'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        scope,
        period
      });
      
      const response = await fetch(`${DataService.BASE_URL}/user/achievements?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch achievements');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      return { achievements: [] };
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(
    scope: string = 'global',
    period: string = 'alltime'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        scope,
        period
      });
      
      const response = await fetch(`${DataService.BASE_URL}/user/performance?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch performance metrics');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      return { metrics: null };
    }
  }

  /**
   * Get competitive analysis
   */
  static async getCompetitiveAnalysis(
    scope: string = 'global',
    period: string = 'alltime'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        scope,
        period
      });
      
      const response = await fetch(`${DataService.BASE_URL}/user/competitive-analysis?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch competitive analysis');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch competitive analysis:', error);
      return { analysis: null };
    }
  }

  /**
   * Get rate limit status for current user
   */
  static async getRateLimitStatus(action: string = 'score_submission'): Promise<any> {
    try {
      const params = new URLSearchParams({ action });
      const response = await fetch(`${DataService.BASE_URL}/rate-limit/status?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get rate limit status');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      // Return fallback status
      return {
        type: 'rate_limit_status',
        action,
        limits: { minute: 3, hour: 20, day: 100 },
        usage: { minute: 0, hour: 0, day: 0 },
        remaining: { minute: 3, hour: 20, day: 100 },
        isLimited: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle API errors gracefully
   */
  static handleApiError(error: any): ErrorResponse {
    if (error && typeof error === 'object' && 'type' in error && error.type === 'error') {
      return error as ErrorResponse;
    }
    
    return {
      type: 'error',
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      recoverable: true,
      action: 'retry'
    };
  }

  /**
   * Offline fallback for localStorage
   */
  static getFromLocalStorage<T>(key: string): T | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(`f1_game_${key}`);
        return item ? JSON.parse(item) : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get from localStorage:', error);
      return null;
    }
  }

  /**
   * Save to localStorage as fallback
   */
  static saveToLocalStorage<T>(key: string, data: T): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`f1_game_${key}`, JSON.stringify(data));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }
}