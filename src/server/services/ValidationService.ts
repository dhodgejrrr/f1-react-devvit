import type { 
  LeaderboardEntry, 
  UserPreferences, 
  ValidationResult,
  GameResult,
  UserSession
} from '../../shared/types/index.js';
import { AntiCheatService, type DeviceCapabilities } from './AntiCheatService.js';
import { StatisticalAnalysisService } from './StatisticalAnalysisService.js';
import { SecurityMonitoringService } from './SecurityMonitoringService.js';
import { PlausibilityValidationService } from './PlausibilityValidationService.js';

/**
 * Validation Service for client-side and server-side data validation
 * Implements comprehensive validation rules with graceful error handling
 */
export class ValidationService {
  
  /**
   * Enhanced game result validation with comprehensive plausibility checking
   * Integrates Task 8.1 implementation
   */
  static async validateGameResult(
    result: GameResult, 
    userSession: UserSession,
    userHistory?: number[],
    deviceCapabilities?: DeviceCapabilities,
    gameStartTime?: number
  ): Promise<ValidationResult> {
    // Use enhanced plausibility validation service - Task 8.1 implementation
    const plausibilityResult = await PlausibilityValidationService.validateGameSubmission(
      result,
      userSession,
      deviceCapabilities,
      gameStartTime
    );
    
    // Extract validation result from comprehensive plausibility check
    const validation = plausibilityResult.validation;
    let flags = [...validation.flags];
    let confidence = validation.confidence;

    // Statistical outlier detection
    if (userHistory && userHistory.length > 0) {
      const outlierAnalysis = StatisticalAnalysisService.performZScoreAnalysis(
        result.reactionTime,
        userHistory
      );
      
      if (outlierAnalysis.isOutlier && outlierAnalysis.confidence > 0.7) {
        flags.push(`STATISTICAL_OUTLIER_${outlierAnalysis.reason}`);
        confidence = Math.min(confidence, 1 - outlierAnalysis.confidence);
      }
    }

    // Validate rating consistency
    if (!ValidationService.isRatingConsistent(result.reactionTime, result.rating)) {
      flags.push('INCONSISTENT_RATING');
      confidence *= 0.7;
    }

    // Validate percentile range
    if (result.communityPercentile < 0 || result.communityPercentile > 100) {
      flags.push('INVALID_PERCENTILE');
      confidence *= 0.8;
    }

    const isValid = confidence > 0.5 && !flags.includes('IMPOSSIBLY_FAST');
    const action: 'accept' | 'flag' | 'reject' = 
      confidence >= 0.8 ? 'accept' : 
      confidence >= 0.3 ? 'flag' : 'reject';

    // Security logging is handled by PlausibilityValidationService
    // Additional logging for validation service context
    if (action !== 'accept' && userSession?.userId) {
      await SecurityMonitoringService.logSecurityEvent({
        type: action === 'reject' ? 'impossible_time' : 'suspicious_activity',
        userId: userSession.userId,
        data: { 
          reactionTime: result.reactionTime, 
          flags, 
          confidence,
          validation: { isValid, action },
          plausibilityResult: plausibilityResult.autoFlagged
        }
      });
    }

    return {
      isValid,
      confidence,
      flags,
      action
    };
  }

  /**
   * Validate leaderboard entry
   */
  static validateLeaderboardEntry(entry: LeaderboardEntry): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    // Required fields validation
    if (!entry.userId || typeof entry.userId !== 'string') {
      flags.push('MISSING_USER_ID');
      confidence = 0;
    }

    if (!entry.username || typeof entry.username !== 'string') {
      flags.push('MISSING_USERNAME');
      confidence = 0;
    }

    if (!entry.scope || typeof entry.scope !== 'string') {
      flags.push('MISSING_SCOPE');
      confidence = 0;
    }

    // Validate reaction time
    const timeValidation = ValidationService.validateReactionTime(entry.reactionTime);
    flags.push(...timeValidation.flags);
    confidence = Math.min(confidence, timeValidation.confidence);

    // Validate timestamp
    const timestampValidation = ValidationService.validateTimestamp(entry.timestamp);
    flags.push(...timestampValidation.flags);
    confidence = Math.min(confidence, timestampValidation.confidence);

    // Validate scope format
    if (!ValidationService.isValidScope(entry.scope)) {
      flags.push('INVALID_SCOPE_FORMAT');
      confidence *= 0.8;
    }

    // Validate period
    if (!['daily', 'weekly', 'alltime'].includes(entry.period)) {
      flags.push('INVALID_PERIOD');
      confidence *= 0.8;
    }

    const isValid = confidence > 0.5 && !flags.includes('MISSING_USER_ID') && !flags.includes('IMPOSSIBLY_FAST');
    const action: 'accept' | 'flag' | 'reject' = 
      confidence >= 0.8 ? 'accept' : 
      confidence >= 0.3 ? 'flag' : 'reject';

    return {
      isValid,
      confidence,
      flags,
      action
    };
  }

  /**
   * Validate user preferences
   */
  static validateUserPreferences(preferences: Partial<UserPreferences>): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    // Validate audio settings
    if (preferences.audioVolume !== undefined) {
      if (typeof preferences.audioVolume !== 'number' || preferences.audioVolume < 0 || preferences.audioVolume > 1) {
        flags.push('INVALID_AUDIO_VOLUME');
        confidence *= 0.8;
      }
    }

    if (preferences.lightSoundVolume !== undefined) {
      if (typeof preferences.lightSoundVolume !== 'number' || preferences.lightSoundVolume < 0 || preferences.lightSoundVolume > 1) {
        flags.push('INVALID_LIGHT_SOUND_VOLUME');
        confidence *= 0.8;
      }
    }

    if (preferences.resultSoundVolume !== undefined) {
      if (typeof preferences.resultSoundVolume !== 'number' || preferences.resultSoundVolume < 0 || preferences.resultSoundVolume > 1) {
        flags.push('INVALID_RESULT_SOUND_VOLUME');
        confidence *= 0.8;
      }
    }

    if (preferences.uiSoundVolume !== undefined) {
      if (typeof preferences.uiSoundVolume !== 'number' || preferences.uiSoundVolume < 0 || preferences.uiSoundVolume > 1) {
        flags.push('INVALID_UI_SOUND_VOLUME');
        confidence *= 0.8;
      }
    }

    // Validate difficulty mode
    if (preferences.difficultyMode !== undefined) {
      if (!['easy', 'normal', 'hard', 'pro'].includes(preferences.difficultyMode)) {
        flags.push('INVALID_DIFFICULTY_MODE');
        confidence *= 0.8;
      }
    }

    // Validate preferred scope
    if (preferences.preferredScope !== undefined) {
      if (!ValidationService.isValidScope(preferences.preferredScope)) {
        flags.push('INVALID_PREFERRED_SCOPE');
        confidence *= 0.8;
      }
    }

    // Validate boolean fields
    if (preferences.audioEnabled !== undefined && typeof preferences.audioEnabled !== 'boolean') {
      flags.push('INVALID_AUDIO_ENABLED');
      confidence *= 0.8;
    }

    if (preferences.accessibilityMode !== undefined && typeof preferences.accessibilityMode !== 'boolean') {
      flags.push('INVALID_ACCESSIBILITY_MODE');
      confidence *= 0.8;
    }

    const isValid = confidence > 0.7;
    const action: 'accept' | 'flag' | 'reject' = 
      confidence >= 0.8 ? 'accept' : 
      confidence >= 0.5 ? 'flag' : 'reject';

    return {
      isValid,
      confidence,
      flags,
      action
    };
  }

  /**
   * Validate reaction time with detailed analysis
   */
  static validateReactionTime(reactionTime: number): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    // Check if it's a number
    if (typeof reactionTime !== 'number' || isNaN(reactionTime)) {
      flags.push('INVALID_NUMBER');
      return { isValid: false, confidence: 0, flags, action: 'reject' };
    }

    // Human reaction time bounds
    if (reactionTime < 80) {
      flags.push('IMPOSSIBLY_FAST');
      confidence = 0;
    } else if (reactionTime < 120) {
      flags.push('SUSPICIOUSLY_FAST');
      confidence = 0.3;
    } else if (reactionTime < 150) {
      flags.push('VERY_FAST');
      confidence = 0.7;
    }

    if (reactionTime > 2000) {
      flags.push('UNUSUALLY_SLOW');
      confidence = 0.8;
    } else if (reactionTime > 1000) {
      flags.push('SLOW');
      confidence = 0.9;
    }

    // Check for suspicious precision (e.g., exactly round numbers)
    if (reactionTime % 10 === 0 && reactionTime < 300) {
      flags.push('SUSPICIOUS_PRECISION');
      confidence *= 0.9;
    }

    const isValid = confidence > 0.5 && !flags.includes('IMPOSSIBLY_FAST');
    const action: 'accept' | 'flag' | 'reject' = 
      confidence >= 0.8 ? 'accept' : 
      confidence >= 0.3 ? 'flag' : 'reject';

    return {
      isValid,
      confidence,
      flags,
      action
    };
  }

  /**
   * Validate timestamp
   */
  static validateTimestamp(timestamp: string): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      if (isNaN(date.getTime())) {
        flags.push('INVALID_TIMESTAMP_FORMAT');
        return { isValid: false, confidence: 0, flags, action: 'reject' };
      }

      const timeDiff = now.getTime() - date.getTime();
      
      // Future timestamp
      if (timeDiff < 0) {
        flags.push('FUTURE_TIMESTAMP');
        confidence = 0;
      }
      
      // Too old (more than 5 minutes)
      if (timeDiff > 5 * 60 * 1000) {
        flags.push('STALE_TIMESTAMP');
        confidence = 0.6;
      }
      
      // Very recent (less than 1 second) - might be suspicious
      if (timeDiff < 1000) {
        flags.push('VERY_RECENT');
        confidence = 0.8;
      }

    } catch (error) {
      flags.push('TIMESTAMP_PARSE_ERROR');
      return { isValid: false, confidence: 0, flags, action: 'reject' };
    }

    const isValid = confidence > 0.5 && !flags.includes('FUTURE_TIMESTAMP');
    const action: 'accept' | 'flag' | 'reject' = 
      confidence >= 0.8 ? 'accept' : 
      confidence >= 0.3 ? 'flag' : 'reject';

    return {
      isValid,
      confidence,
      flags,
      action
    };
  }

  /**
   * Check if rating is consistent with reaction time
   */
  private static isRatingConsistent(reactionTime: number, rating: string): boolean {
    switch (rating) {
      case 'perfect':
        return reactionTime < 200;
      case 'excellent':
        return reactionTime >= 200 && reactionTime < 300;
      case 'good':
        return reactionTime >= 300 && reactionTime < 400;
      case 'fair':
        return reactionTime >= 400 && reactionTime < 600;
      case 'slow':
        return reactionTime >= 600;
      case 'false_start':
        return reactionTime < 0; // False start should have negative time
      default:
        return false;
    }
  }

  /**
   * Validate scope format (global or r/subreddit)
   */
  private static isValidScope(scope: string): boolean {
    if (scope === 'global') {
      return true;
    }
    
    // Check r/subreddit format
    const subredditPattern = /^r\/[a-zA-Z0-9_]{3,21}$/;
    return subredditPattern.test(scope);
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 100); // Limit length
  }

  /**
   * Validate user activity data
   */
  static validateUserActivity(activity: any): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    // Validate activity type
    const validActivityTypes = ['game_start', 'game_complete', 'leaderboard_view', 'challenge_create', 'challenge_accept', 'score_submission_attempt', 'score_submission_success', 'score_submission_failed'];
    if (!activity.type || !validActivityTypes.includes(activity.type)) {
      flags.push('INVALID_ACTIVITY_TYPE');
      confidence = 0;
    }

    // Validate data field (optional but should be object if present)
    if (activity.data !== undefined && activity.data !== null) {
      if (typeof activity.data !== 'object') {
        flags.push('INVALID_ACTIVITY_DATA');
        confidence *= 0.8;
      }
      
      // Check data size to prevent abuse
      try {
        const dataSize = JSON.stringify(activity.data).length;
        if (dataSize > 1000) { // 1KB limit for activity data
          flags.push('ACTIVITY_DATA_TOO_LARGE');
          confidence *= 0.7;
        }
      } catch (error) {
        flags.push('ACTIVITY_DATA_NOT_SERIALIZABLE');
        confidence *= 0.6;
      }
    }

    // Validate timestamp if provided
    if (activity.timestamp !== undefined) {
      const timestampValidation = ValidationService.validateTimestamp(activity.timestamp);
      if (!timestampValidation.isValid) {
        flags.push('INVALID_ACTIVITY_TIMESTAMP');
        confidence *= 0.8;
      }
    }

    const isValid = confidence > 0.5;
    const action: 'accept' | 'flag' | 'reject' = 
      confidence >= 0.8 ? 'accept' : 
      confidence >= 0.3 ? 'flag' : 'reject';

    return {
      isValid,
      confidence,
      flags,
      action
    };
  }

  /**
   * Validate rate limiting data
   */
  static validateRateLimit(userId: string, action: string): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    if (!userId || typeof userId !== 'string') {
      flags.push('INVALID_USER_ID');
      confidence = 0;
    }

    if (!action || typeof action !== 'string') {
      flags.push('INVALID_ACTION');
      confidence = 0;
    }

    const validActions = ['submit_score', 'create_challenge', 'view_leaderboard'];
    if (!validActions.includes(action)) {
      flags.push('UNKNOWN_ACTION');
      confidence = 0.8;
    }

    const isValid = confidence > 0.5;
    const actionResult: 'accept' | 'flag' | 'reject' = 
      confidence >= 0.8 ? 'accept' : 
      confidence >= 0.3 ? 'flag' : 'reject';

    return {
      isValid,
      confidence,
      flags,
      action: actionResult
    };
  }
}

/**
 * Error Recovery Service for handling validation failures gracefully
 */
export class ErrorRecoveryService {
  
  /**
   * Attempt to recover from validation errors
   */
  static recoverFromValidationError(
    data: any, 
    validationResult: ValidationResult
  ): { recovered: boolean; data?: any; message?: string } {
    
    // If data is completely invalid, cannot recover
    if (validationResult.confidence === 0) {
      return {
        recovered: false,
        message: `Cannot recover from validation error: ${validationResult.flags.join(', ')}`
      };
    }

    // Attempt to fix common issues
    let recoveredData = { ...data };
    let recovered = false;

    // Fix timestamp issues
    if (validationResult.flags.includes('STALE_TIMESTAMP')) {
      recoveredData.timestamp = new Date().toISOString();
      recovered = true;
    }

    // Fix reaction time precision issues
    if (validationResult.flags.includes('SUSPICIOUS_PRECISION') && data.reactionTime) {
      // Add small random variation to round numbers
      recoveredData.reactionTime = data.reactionTime + (Math.random() * 2 - 1);
      recovered = true;
    }

    // Fix scope format issues
    if (validationResult.flags.includes('INVALID_SCOPE_FORMAT') && data.scope) {
      if (data.scope.startsWith('r/')) {
        recoveredData.scope = data.scope.toLowerCase();
      } else {
        recoveredData.scope = 'global';
      }
      recovered = true;
    }

    // Fix volume ranges
    ['audioVolume', 'lightSoundVolume', 'resultSoundVolume', 'uiSoundVolume'].forEach(field => {
      if (data[field] !== undefined) {
        if (data[field] < 0) {
          recoveredData[field] = 0;
          recovered = true;
        } else if (data[field] > 1) {
          recoveredData[field] = 1;
          recovered = true;
        }
      }
    });

    return {
      recovered,
      data: recovered ? recoveredData : undefined,
      message: recovered ? 'Data recovered successfully' : 'Could not recover data'
    };
  }

  /**
   * Create fallback data when recovery fails
   */
  static createFallbackData(type: 'leaderboard' | 'preferences' | 'session'): any {
    switch (type) {
      case 'leaderboard':
        return {
          userId: 'anonymous',
          username: 'Anonymous',
          reactionTime: 500,
          timestamp: new Date().toISOString(),
          scope: 'global',
          period: 'alltime',
          flagged: true
        };
        
      case 'preferences':
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
        
      case 'session':
        return {
          userId: 'anonymous',
          username: 'Anonymous',
          sessionStart: Date.now(),
          personalBest: null,
          sessionStats: {
            gamesPlayed: 0,
            averageTime: 0,
            falseStarts: 0,
            perfectScores: 0,
            improvementRate: 0
          },
          preferences: ErrorRecoveryService.createFallbackData('preferences')
        };
        
      default:
        return {};
    }
  }
}