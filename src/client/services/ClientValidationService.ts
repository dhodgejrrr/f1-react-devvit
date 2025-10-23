import type { 
  GameResult, 
  UserPreferences
} from '../../shared/types/game.js';
import type { 
  ScoreSubmissionRequest,
  UserActivityRequest 
} from '../../shared/types/api.js';

/**
 * Client-side validation service for immediate feedback
 * Provides fast validation before server submission
 */
export class ClientValidationService {
  
  /**
   * Validate game result before submission
   */
  static validateGameResult(result: GameResult): ClientValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate reaction time
    if (typeof result.reactionTime !== 'number' || isNaN(result.reactionTime)) {
      errors.push('Reaction time must be a valid number');
    } else {
      if (result.reactionTime < 0) {
        errors.push('Reaction time cannot be negative');
      } else if (result.reactionTime < 80) {
        errors.push('Reaction time is impossibly fast (minimum 80ms)');
      } else if (result.reactionTime < 120) {
        warnings.push('Reaction time is suspiciously fast');
      } else if (result.reactionTime > 2000) {
        warnings.push('Reaction time is unusually slow');
      }
    }

    // Validate rating
    const validRatings = ['perfect', 'excellent', 'good', 'fair', 'slow', 'false_start'];
    if (!validRatings.includes(result.rating)) {
      errors.push('Invalid rating value');
    }

    // Validate rating consistency with reaction time
    if (!ClientValidationService.isRatingConsistent(result.reactionTime, result.rating)) {
      warnings.push('Rating does not match reaction time');
    }

    // Validate percentile
    if (typeof result.communityPercentile !== 'number' || 
        result.communityPercentile < 0 || 
        result.communityPercentile > 100) {
      errors.push('Community percentile must be between 0 and 100');
    }

    // Validate driver comparison
    if (!result.driverComparison || typeof result.driverComparison !== 'object') {
      errors.push('Driver comparison data is required');
    } else {
      if (typeof result.driverComparison.userTime !== 'number') {
        errors.push('Driver comparison user time must be a number');
      }
      if (!Array.isArray(result.driverComparison.fasterThan)) {
        errors.push('Driver comparison fasterThan must be an array');
      }
      if (!Array.isArray(result.driverComparison.slowerThan)) {
        errors.push('Driver comparison slowerThan must be an array');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSubmit: errors.length === 0,
      confidence: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0
    };
  }

  /**
   * Validate score submission request
   */
  static validateScoreSubmission(submission: ScoreSubmissionRequest): ClientValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate reaction time
    if (typeof submission.reactionTime !== 'number' || isNaN(submission.reactionTime)) {
      errors.push('Reaction time must be a valid number');
    } else if (submission.reactionTime < 80) {
      errors.push('Reaction time is too fast to be human');
    } else if (submission.reactionTime > 2000) {
      warnings.push('Reaction time is very slow');
    }

    // Validate rating
    const validRatings = ['perfect', 'excellent', 'good', 'fair', 'slow', 'false_start'];
    if (!validRatings.includes(submission.rating)) {
      errors.push('Invalid rating');
    }

    // Validate timestamp
    try {
      const timestamp = new Date(submission.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      
      if (isNaN(timestamp.getTime())) {
        errors.push('Invalid timestamp format');
      } else if (timeDiff < 0) {
        errors.push('Timestamp cannot be in the future');
      } else if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        warnings.push('Timestamp is quite old');
      }
    } catch (error) {
      errors.push('Invalid timestamp');
    }

    // Validate scope
    if (!submission.scope) {
      errors.push('Scope is required');
    } else if (submission.scope !== 'global' && !submission.scope.match(/^r\/[a-zA-Z0-9_]{3,21}$/)) {
      errors.push('Invalid scope format');
    }

    // Validate period
    const validPeriods = ['daily', 'weekly', 'alltime'];
    if (!validPeriods.includes(submission.period)) {
      errors.push('Invalid time period');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSubmit: errors.length === 0,
      confidence: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0
    };
  }

  /**
   * Validate user preferences
   */
  static validateUserPreferences(preferences: Partial<UserPreferences>): ClientValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate audio volumes (0-1 range)
    const volumeFields = ['audioVolume', 'lightSoundVolume', 'resultSoundVolume', 'uiSoundVolume'];
    volumeFields.forEach(field => {
      const value = (preferences as any)[field];
      if (value !== undefined) {
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field} must be a number`);
        } else if (value < 0 || value > 1) {
          errors.push(`${field} must be between 0 and 1`);
        }
      }
    });

    // Validate difficulty mode
    if (preferences.difficultyMode !== undefined) {
      const validModes = ['easy', 'normal', 'hard', 'pro'];
      if (!validModes.includes(preferences.difficultyMode)) {
        errors.push('Invalid difficulty mode');
      }
    }

    // Validate preferred scope
    if (preferences.preferredScope !== undefined) {
      if (preferences.preferredScope !== 'global' && 
          !preferences.preferredScope.match(/^r\/[a-zA-Z0-9_]{3,21}$/)) {
        errors.push('Invalid preferred scope format');
      }
    }

    // Validate boolean fields
    const booleanFields = ['audioEnabled', 'accessibilityMode'];
    booleanFields.forEach(field => {
      const value = (preferences as any)[field];
      if (value !== undefined && typeof value !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSubmit: errors.length === 0,
      confidence: errors.length === 0 ? 1.0 : 0.0
    };
  }

  /**
   * Validate user activity data
   */
  static validateUserActivity(activity: UserActivityRequest): ClientValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate activity type
    const validTypes = ['game_start', 'game_complete', 'leaderboard_view', 'challenge_create', 'challenge_accept'];
    if (!validTypes.includes(activity.type)) {
      errors.push('Invalid activity type');
    }

    // Validate data field if present
    if (activity.data !== undefined) {
      if (activity.data !== null && typeof activity.data !== 'object') {
        errors.push('Activity data must be an object or null');
      }
      
      // Check data size
      try {
        const dataSize = JSON.stringify(activity.data).length;
        if (dataSize > 1000) { // 1KB limit
          warnings.push('Activity data is quite large');
        }
        if (dataSize > 5000) { // 5KB hard limit
          errors.push('Activity data is too large');
        }
      } catch (error) {
        errors.push('Activity data is not serializable');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSubmit: errors.length === 0,
      confidence: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.0
    };
  }

  /**
   * Validate form input in real-time
   */
  static validateFormField(fieldName: string, value: any, fieldType: string): FieldValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (fieldType) {
      case 'reactionTime':
        if (value === '' || value === null || value === undefined) {
          // Empty is okay for optional fields
          break;
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push('Must be a valid number');
        } else if (numValue < 0) {
          errors.push('Cannot be negative');
        } else if (numValue < 80) {
          errors.push('Too fast to be human (minimum 80ms)');
        } else if (numValue < 120) {
          warnings.push('Suspiciously fast');
        } else if (numValue > 2000) {
          warnings.push('Very slow reaction time');
        }
        break;

      case 'volume':
        if (value === '' || value === null || value === undefined) {
          break;
        }
        const volValue = Number(value);
        if (isNaN(volValue)) {
          errors.push('Must be a valid number');
        } else if (volValue < 0) {
          errors.push('Cannot be negative');
        } else if (volValue > 1) {
          errors.push('Cannot be greater than 1');
        }
        break;

      case 'username':
        if (typeof value !== 'string') {
          errors.push('Must be text');
        } else if (value.length > 50) {
          errors.push('Too long (maximum 50 characters)');
        } else if (value.length > 0 && value.length < 3) {
          warnings.push('Very short username');
        }
        break;

      case 'scope':
        if (typeof value !== 'string') {
          errors.push('Must be text');
        } else if (value !== 'global' && !value.match(/^r\/[a-zA-Z0-9_]{3,21}$/)) {
          errors.push('Must be "global" or "r/subreddit" format');
        }
        break;

      default:
        // Generic validation
        if (typeof value === 'string' && value.length > 1000) {
          warnings.push('Very long input');
        }
    }

    return {
      fieldName,
      isValid: errors.length === 0,
      errors,
      warnings,
      value
    };
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 1000); // Limit length
  }

  /**
   * Check if rating is consistent with reaction time
   */
  private static isRatingConsistent(reactionTime: number, rating: string): boolean {
    if (typeof reactionTime !== 'number' || isNaN(reactionTime)) {
      return false;
    }

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
   * Validate network connectivity
   */
  static async checkNetworkConnectivity(): Promise<NetworkStatus> {
    try {
      // Check if we're online (browser environment)
      if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
        if (!navigator.onLine) {
          return {
            isOnline: false,
            latency: -1,
            message: 'Device appears to be offline'
          };
        }
      }

      // Test connectivity with a simple request
      const startTime = performance.now();
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const latency = performance.now() - startTime;

      return {
        isOnline: response.ok,
        latency: Math.round(latency),
        message: response.ok ? 'Connected' : 'Server unreachable'
      };
    } catch (error) {
      return {
        isOnline: false,
        latency: -1,
        message: 'Network error: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  /**
   * Validate browser compatibility
   */
  static validateBrowserCompatibility(): BrowserCompatibility {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for required APIs
    if (typeof performance === 'undefined' || !performance.now) {
      issues.push('High-resolution timing not supported');
    }

    if (typeof localStorage === 'undefined') {
      warnings.push('Local storage not available');
    }

    if (typeof fetch === 'undefined') {
      issues.push('Fetch API not supported');
    }

    // Check for Web Audio API
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      warnings.push('Web Audio API not supported - audio features disabled');
    }

    // Check for modern JavaScript features
    try {
      // Test for async/await support by checking if async functions exist
      const AsyncFunction = (async () => {}).constructor;
      if (!AsyncFunction) {
        issues.push('Modern JavaScript features not supported');
      }
    } catch (error) {
      issues.push('Modern JavaScript features not supported');
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      warnings,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    };
  }
}

/**
 * Supporting interfaces
 */
interface ClientValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canSubmit: boolean;
  confidence: number;
}

interface FieldValidationResult {
  fieldName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  value: any;
}

interface NetworkStatus {
  isOnline: boolean;
  latency: number;
  message: string;
}

interface BrowserCompatibility {
  isCompatible: boolean;
  issues: string[];
  warnings: string[];
  userAgent: string;
}