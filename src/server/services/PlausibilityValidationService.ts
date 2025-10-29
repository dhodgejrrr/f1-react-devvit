import { KVStorageService } from './KVStorageService.js';
import { AntiCheatService, type DeviceCapabilities, type ValidationLogEntry, type ValidationSessionContext } from './AntiCheatService.js';
import { SecurityMonitoringService } from './SecurityMonitoringService.js';
import type {
  ValidationResult,
  OutlierAnalysis,
  BehaviorProfile,
  UserSession,
  GameResult
} from '../../shared/types/index.js';

/**
 * Plausibility Validation Service - Task 8.1 Implementation
 * Comprehensive validation system with enhanced monitoring and logging
 * 
 * Requirements implemented:
 * - Reaction time bounds checking (80ms minimum, 1000ms maximum)
 * - Impossible time detection and automatic flagging
 * - Session duration validation to prevent instant submissions
 * - Device capability detection for timing precision
 * - Validation result logging and monitoring
 */
export class PlausibilityValidationService {

  // Validation constants - Requirement 8.1
  private static readonly VALIDATION_BOUNDS = {
    MIN_HUMAN_REACTION: 1,     // Minimum human reaction time (ms)
    MAX_HUMAN_REACTION: 1000,   // Maximum reasonable reaction time (ms)
    IMPOSSIBLE_THRESHOLD: 50,   // Physically impossible threshold (ms)
    SUPERHUMAN_THRESHOLD: 100,  // Elite athlete threshold (ms)
    SUSPICIOUS_THRESHOLD: 120   // Suspicious but possible threshold (ms)
  } as const;

  // Session validation constants
  private static readonly SESSION_VALIDATION = {
    MIN_SESSION_DURATION: 2000,    // Minimum session duration (ms)
    MIN_GAME_DURATION: 1500,       // Minimum individual game duration (ms)
    INSTANT_THRESHOLD: 500,        // Instant submission threshold (ms)
    MAX_SUBMISSIONS_PER_HOUR: 100  // Maximum submissions per hour
  } as const;

  /**
   * Main validation entry point - Enhanced plausibility validation
   * Requirement 8.1: Comprehensive validation with all sub-requirements
   */
  static async validateGameSubmission(
    gameResult: GameResult,
    userSession: UserSession,
    deviceCapabilities?: DeviceCapabilities,
    gameStartTime?: number
  ): Promise<PlausibilityValidationResult> {

    const validationStart = performance.now();

    try {
      // 1. Basic plausibility validation
      const plausibilityResult = AntiCheatService.validatePlausibility(
        gameResult.reactionTime,
        userSession,
        deviceCapabilities,
        gameStartTime
      );

      // 2. Enhanced bounds checking
      const boundsResult = this.validateReactionTimeBounds(gameResult.reactionTime);

      // 3. Session duration validation
      const sessionContext: ValidationSessionContext = {
        sessionDuration: Date.now() - userSession.sessionStart,
        gameCount: userSession.sessionStats.gamesPlayed,
        gameStartTime,
        userAgent: deviceCapabilities?.userAgent
      };

      const sessionResult = this.validateSessionIntegrity(sessionContext);

      // 4. Device capability validation
      const deviceResult = deviceCapabilities ?
        this.validateDeviceCapabilities(gameResult.reactionTime, deviceCapabilities) :
        { isValid: true, flags: [], confidence: 1.0 };

      // 5. Combine all validation results
      const combinedResult = this.combineValidationResults([
        plausibilityResult,
        boundsResult,
        sessionResult,
        deviceResult
      ]);

      // 6. Create comprehensive log entry
      const logEntry = this.createValidationLogEntry(
        userSession.userId,
        gameResult,
        combinedResult,
        deviceCapabilities,
        sessionContext,
        performance.now() - validationStart
      );

      // 7. Store validation log
      await this.storeValidationLog(logEntry);

      // 8. Update monitoring metrics
      await this.updateValidationMetrics(logEntry);

      // 9. Check for automatic flagging
      const shouldAutoFlag = this.shouldAutoFlag(combinedResult);
      if (shouldAutoFlag) {
        await this.handleAutoFlag(logEntry);
      }

      return {
        validation: combinedResult,
        logEntry,
        processingTime: performance.now() - validationStart,
        autoFlagged: shouldAutoFlag
      };

    } catch (error) {
      console.error('Plausibility validation failed:', error);

      // Return safe fallback result
      return {
        validation: {
          isValid: false,
          confidence: 0,
          flags: ['VALIDATION_ERROR'],
          action: 'reject'
        },
        logEntry: null,
        processingTime: performance.now() - validationStart,
        autoFlagged: true,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Enhanced reaction time bounds checking
   * Requirement 8.1: Create reaction time bounds checking (80ms minimum, 1000ms maximum)
   */
  private static validateReactionTimeBounds(reactionTime: number): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    // Input validation
    if (typeof reactionTime !== 'number' || isNaN(reactionTime) || !isFinite(reactionTime)) {
      return {
        isValid: false,
        confidence: 0,
        flags: ['INVALID_REACTION_TIME_FORMAT'],
        action: 'reject'
      };
    }

    // Impossible time detection - Requirement 8.1
    if (reactionTime < this.VALIDATION_BOUNDS.IMPOSSIBLE_THRESHOLD) {
      flags.push('PHYSICALLY_IMPOSSIBLE_TIME');
      confidence = 0;
    } else if (reactionTime < this.VALIDATION_BOUNDS.MIN_HUMAN_REACTION) {
      flags.push('IMPOSSIBLY_FAST_HUMAN_REACTION');
      confidence = 0;
    } else if (reactionTime < this.VALIDATION_BOUNDS.SUPERHUMAN_THRESHOLD) {
      flags.push('SUPERHUMAN_REACTION_TIME');
      confidence = 0.1;
    } else if (reactionTime < this.VALIDATION_BOUNDS.SUSPICIOUS_THRESHOLD) {
      flags.push('SUSPICIOUSLY_FAST_REACTION');
      confidence = 0.3;
    }

    // Upper bounds checking
    if (reactionTime > this.VALIDATION_BOUNDS.MAX_HUMAN_REACTION) {
      flags.push('UNUSUALLY_SLOW_REACTION');
      confidence = Math.min(confidence, 0.8);
    }

    // Precision analysis
    const precisionFlags = this.analyzePrecisionPattern(reactionTime);
    flags.push(...precisionFlags.flags);
    confidence = Math.min(confidence, precisionFlags.confidence);

    const isValid = confidence > 0.5 && !flags.some(f =>
      f.includes('IMPOSSIBLE') || f.includes('IMPOSSIBLY')
    );

    const action: 'accept' | 'flag' | 'reject' =
      confidence === 0 ? 'reject' :
        confidence >= 0.8 ? 'accept' : 'flag';

    return { isValid, confidence, flags, action };
  }

  /**
   * Session duration validation to prevent instant submissions
   * Requirement 8.1: Implement session duration validation to prevent instant submissions
   */
  private static validateSessionIntegrity(context: ValidationSessionContext): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    // Check session duration
    if (context.sessionDuration < this.SESSION_VALIDATION.INSTANT_THRESHOLD) {
      flags.push('INSTANT_SUBMISSION_DETECTED');
      confidence = 0;
    } else if (context.sessionDuration < this.SESSION_VALIDATION.MIN_SESSION_DURATION) {
      flags.push('VERY_QUICK_SUBMISSION');
      confidence = 0.2;
    }

    // Check individual game duration
    if (context.gameStartTime) {
      const gameDuration = Date.now() - context.gameStartTime;

      if (gameDuration < this.SESSION_VALIDATION.MIN_GAME_DURATION) {
        flags.push('GAME_DURATION_TOO_SHORT');
        confidence = Math.min(confidence, 0.1);
      }

      // Expected minimum for full F1 sequence (5 lights * 900ms + random delay)
      const expectedMinDuration = 5 * 900 + 500; // ~5 seconds minimum
      if (gameDuration < expectedMinDuration) {
        flags.push('SKIPPED_LIGHT_SEQUENCE_SUSPECTED');
        confidence = Math.min(confidence, 0.3);
      }
    }

    // Check submission rate
    const submissionsPerHour = this.calculateSubmissionRate(context);
    if (submissionsPerHour > this.SESSION_VALIDATION.MAX_SUBMISSIONS_PER_HOUR) {
      flags.push('EXCESSIVE_SUBMISSION_RATE');
      confidence = Math.min(confidence, 0.4);
    }

    const isValid = confidence > 0.5 && !flags.includes('INSTANT_SUBMISSION_DETECTED');
    const action: 'accept' | 'flag' | 'reject' =
      flags.includes('INSTANT_SUBMISSION_DETECTED') ? 'reject' :
        confidence >= 0.8 ? 'accept' : 'flag';

    return { isValid, confidence, flags, action };
  }

  /**
   * Enhanced device capability detection for timing precision
   * Requirement 8.1: Build device capability detection for timing precision
   */
  private static validateDeviceCapabilities(
    reactionTime: number,
    capabilities: DeviceCapabilities
  ): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    // High-resolution timing validation
    if (!capabilities.highResolutionTime && reactionTime < 150) {
      flags.push('NO_HIGH_RESOLUTION_TIMING');
      confidence = 0.4;
    }

    // Performance API validation
    if (!capabilities.performanceAPI && reactionTime < 120) {
      flags.push('NO_PERFORMANCE_API');
      confidence = 0.3;
    }

    // Mobile device limitations
    if (capabilities.isMobile) {
      const mobileValidation = this.validateMobileCapabilities(reactionTime, capabilities);
      flags.push(...mobileValidation.flags);
      confidence = Math.min(confidence, mobileValidation.confidence);
    }

    // Browser-specific validation
    if (capabilities.userAgent) {
      const browserValidation = this.validateBrowserCapabilities(reactionTime, capabilities.userAgent);
      flags.push(...browserValidation.flags);
      confidence = Math.min(confidence, browserValidation.confidence);
    }

    // Timing precision validation
    if (capabilities.timingPrecision) {
      const precisionValidation = this.validateTimingPrecision(reactionTime, capabilities.timingPrecision);
      flags.push(...precisionValidation.flags);
      confidence = Math.min(confidence, precisionValidation.confidence);
    }

    const isValid = confidence > 0.5;
    const action: 'accept' | 'flag' | 'reject' =
      confidence >= 0.8 ? 'accept' :
        confidence >= 0.3 ? 'flag' : 'reject';

    return { isValid, confidence, flags, action };
  }

  /**
   * Analyze precision patterns for suspicious behavior
   */
  private static analyzePrecisionPattern(reactionTime: number): { flags: string[]; confidence: number } {
    const flags: string[] = [];
    let confidence = 1.0;

    // Check for suspiciously round numbers
    if (reactionTime % 10 === 0 && reactionTime < 300) {
      flags.push('SUSPICIOUS_ROUND_NUMBER');
      confidence = 0.7;
    }

    // Check for repeated patterns
    const str = reactionTime.toString();
    if (str.length > 3) {
      const digits = str.replace('.', '');
      if (this.hasRepeatingPattern(digits)) {
        flags.push('REPEATING_DIGIT_PATTERN');
        confidence = 0.6;
      }
    }

    // Check decimal precision
    const decimalPlaces = (str.split('.')[1] || '').length;
    if (decimalPlaces > 3) {
      flags.push('EXCESSIVE_DECIMAL_PRECISION');
      confidence = 0.5;
    } else if (decimalPlaces === 0 && reactionTime < 200) {
      flags.push('NO_DECIMAL_PRECISION_SUSPICIOUS');
      confidence = 0.8;
    }

    return { flags, confidence };
  }

  /**
   * Validate mobile device capabilities
   */
  private static validateMobileCapabilities(
    reactionTime: number,
    capabilities: DeviceCapabilities
  ): { flags: string[]; confidence: number } {
    const flags: string[] = [];
    let confidence = 1.0;

    // Mobile timing limitations
    if (reactionTime < 100) {
      flags.push('MOBILE_IMPOSSIBLE_PRECISION');
      confidence = 0.2;
    } else if (reactionTime < 120) {
      flags.push('MOBILE_SUSPICIOUS_TIMING');
      confidence = 0.6;
    }

    // Screen refresh rate validation
    if (capabilities.screenRefreshRate) {
      if (capabilities.screenRefreshRate < 60 && reactionTime < 120) {
        flags.push('LOW_REFRESH_RATE_MISMATCH');
        confidence = Math.min(confidence, 0.5);
      }
    }

    return { flags, confidence };
  }

  /**
   * Validate browser-specific capabilities
   */
  private static validateBrowserCapabilities(
    reactionTime: number,
    userAgent: string
  ): { flags: string[]; confidence: number } {
    const flags: string[] = [];
    let confidence = 1.0;

    const ua = userAgent.toLowerCase();

    // Safari timing limitations
    if (ua.includes('safari') && !ua.includes('chrome') && reactionTime < 100) {
      flags.push('SAFARI_TIMING_LIMITATION');
      confidence = 0.6;
    }

    // Legacy browser detection
    if (ua.includes('msie') || ua.includes('trident')) {
      flags.push('LEGACY_BROWSER_TIMING');
      confidence = 0.7;
    }

    // Firefox timing quirks
    if (ua.includes('firefox') && reactionTime < 90) {
      flags.push('FIREFOX_TIMING_SUSPICIOUS');
      confidence = 0.7;
    }

    return { flags, confidence };
  }

  /**
   * Validate timing precision capabilities
   */
  private static validateTimingPrecision(
    reactionTime: number,
    timingPrecision: number
  ): { flags: string[]; confidence: number } {
    const flags: string[] = [];
    let confidence = 1.0;

    if (timingPrecision > 5 && reactionTime < 100) {
      flags.push('LOW_PRECISION_DEVICE_MISMATCH');
      confidence = 0.5;
    } else if (timingPrecision > 1 && reactionTime < 80) {
      flags.push('PRECISION_CAPABILITY_EXCEEDED');
      confidence = 0.3;
    }

    return { flags, confidence };
  }

  /**
   * Combine multiple validation results
   */
  private static combineValidationResults(results: ValidationResult[]): ValidationResult {
    const allFlags = results.flatMap(r => r.flags);
    const minConfidence = Math.min(...results.map(r => r.confidence));
    const hasReject = results.some(r => r.action === 'reject');
    const hasFlag = results.some(r => r.action === 'flag');

    const isValid = results.every(r => r.isValid) && minConfidence > 0.5;
    const action: 'accept' | 'flag' | 'reject' =
      hasReject ? 'reject' :
        hasFlag || minConfidence < 0.8 ? 'flag' : 'accept';

    return {
      isValid,
      confidence: minConfidence,
      flags: [...new Set(allFlags)], // Remove duplicates
      action
    };
  }

  /**
   * Create comprehensive validation log entry
   * Requirement 8.1: Create validation result logging and monitoring
   */
  private static createValidationLogEntry(
    userId: string,
    gameResult: GameResult,
    validation: ValidationResult,
    deviceCapabilities?: DeviceCapabilities,
    sessionContext?: ValidationSessionContext,
    processingTime?: number
  ): ValidationLogEntry {
    return AntiCheatService.createValidationLog(
      userId,
      gameResult.reactionTime,
      validation,
      undefined, // outlierAnalysis - would be added by statistical analysis
      undefined, // behaviorProfile - would be added by behavioral analysis
      deviceCapabilities,
      sessionContext
    );
  }

  /**
   * Store validation log with proper TTL
   */
  private static async storeValidationLog(logEntry: ValidationLogEntry): Promise<void> {
    try {
      const logKey = `validation:log:${logEntry.userId}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;

      // Store with 90-day TTL for compliance
      await KVStorageService.set(logKey, logEntry, 90 * 24 * 60 * 60);

      // Also store in user-specific log for quick access
      const userLogKey = `validation:user:${logEntry.userId}`;
      await KVStorageService.atomicUpdate<ValidationLogEntry[]>(
        userLogKey,
        (current) => {
          const logs = current || [];
          logs.push(logEntry);

          // Keep only last 100 entries per user
          if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
          }

          return logs;
        },
        30 * 24 * 60 * 60 // 30 days TTL
      );

    } catch (error) {
      console.error('Failed to store validation log:', error);
    }
  }

  /**
   * Update validation metrics for monitoring
   */
  private static async updateValidationMetrics(logEntry: ValidationLogEntry): Promise<void> {
    try {
      const metricsKey = 'validation:metrics:hourly';
      const hour = Math.floor(Date.now() / (60 * 60 * 1000));

      await KVStorageService.atomicUpdate<ValidationMetrics>(
        `${metricsKey}:${hour}`,
        (current) => {
          const metrics = current || {
            totalValidations: 0,
            rejectedValidations: 0,
            flaggedValidations: 0,
            acceptedValidations: 0,
            averageConfidence: 0,
            topFlags: new Map(),
            severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
          };

          metrics.totalValidations++;

          switch (logEntry.validation.action) {
            case 'reject':
              metrics.rejectedValidations++;
              break;
            case 'flag':
              metrics.flaggedValidations++;
              break;
            case 'accept':
              metrics.acceptedValidations++;
              break;
          }

          // Update average confidence
          metrics.averageConfidence = (
            (metrics.averageConfidence * (metrics.totalValidations - 1)) +
            logEntry.validation.confidence
          ) / metrics.totalValidations;

          // Update flag counts
          logEntry.validation.flags.forEach(flag => {
            metrics.topFlags.set(flag, (metrics.topFlags.get(flag) || 0) + 1);
          });

          // Update severity distribution
          metrics.severityDistribution[logEntry.severity]++;

          return metrics;
        },
        60 * 60 // 1 hour TTL
      );

    } catch (error) {
      console.error('Failed to update validation metrics:', error);
    }
  }

  /**
   * Check if validation should trigger automatic flagging
   */
  private static shouldAutoFlag(validation: ValidationResult): boolean {
    const criticalFlags = [
      'PHYSICALLY_IMPOSSIBLE_TIME',
      'IMPOSSIBLY_FAST_HUMAN_REACTION',
      'INSTANT_SUBMISSION_DETECTED'
    ];

    return validation.action === 'reject' ||
      validation.confidence === 0 ||
      validation.flags.some(flag => criticalFlags.includes(flag));
  }

  /**
   * Handle automatic flagging
   */
  private static async handleAutoFlag(logEntry: ValidationLogEntry): Promise<void> {
    try {
      // Log security event
      await SecurityMonitoringService.logSecurityEvent({
        type: 'impossible_time',
        userId: logEntry.userId,
        data: {
          reactionTime: logEntry.reactionTime,
          flags: logEntry.validation.flags,
          confidence: logEntry.validation.confidence,
          severity: logEntry.severity
        }
      });

      // Store in auto-flagged users list
      const flaggedKey = `validation:flagged:${logEntry.userId}`;
      await KVStorageService.atomicUpdate<AutoFlaggedUser>(
        flaggedKey,
        (current) => {
          const flagged = current || {
            userId: logEntry.userId,
            firstFlagged: Date.now(),
            flagCount: 0,
            lastFlagged: Date.now(),
            flags: [],
            severity: 'low'
          };

          flagged.flagCount++;
          flagged.lastFlagged = Date.now();
          flagged.flags.push(...logEntry.validation.flags);
          flagged.severity = logEntry.severity;

          return flagged;
        },
        30 * 24 * 60 * 60 // 30 days TTL
      );

    } catch (error) {
      console.error('Failed to handle auto flag:', error);
    }
  }

  /**
   * Helper methods
   */
  private static hasRepeatingPattern(digits: string): boolean {
    if (digits.length < 4) return false;

    for (let i = 0; i < digits.length - 2; i++) {
      if (digits[i] === digits[i + 1] && digits[i + 1] === digits[i + 2]) {
        return true;
      }
    }

    return false;
  }

  private static calculateSubmissionRate(context: ValidationSessionContext): number {
    const hoursActive = Math.max(1, context.sessionDuration / (60 * 60 * 1000));
    return context.gameCount / hoursActive;
  }

  /**
   * Public API methods for monitoring and reporting
   */

  /**
   * Get validation statistics for a user
   */
  static async getUserValidationStats(userId: string): Promise<UserValidationStats | null> {
    try {
      const userLogKey = `validation:user:${userId}`;
      const logs = await KVStorageService.get<ValidationLogEntry[]>(userLogKey);

      if (!logs || logs.length === 0) {
        return null;
      }

      const totalValidations = logs.length;
      const rejectedCount = logs.filter(l => l.validation.action === 'reject').length;
      const flaggedCount = logs.filter(l => l.validation.action === 'flag').length;
      const acceptedCount = logs.filter(l => l.validation.action === 'accept').length;

      const averageConfidence = logs.reduce((sum, l) => sum + l.validation.confidence, 0) / totalValidations;

      const flagFrequency = new Map<string, number>();
      logs.forEach(log => {
        log.validation.flags.forEach(flag => {
          flagFrequency.set(flag, (flagFrequency.get(flag) || 0) + 1);
        });
      });

      return {
        userId,
        totalValidations,
        rejectedCount,
        flaggedCount,
        acceptedCount,
        averageConfidence,
        flagFrequency: Object.fromEntries(flagFrequency),
        lastValidation: Math.max(...logs.map(l => new Date(l.timestamp).getTime())),
        riskLevel: this.calculateUserRiskLevel(logs)
      };

    } catch (error) {
      console.error(`Failed to get validation stats for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Calculate user risk level based on validation history
   */
  private static calculateUserRiskLevel(logs: ValidationLogEntry[]): 'low' | 'medium' | 'high' | 'critical' {
    const recentLogs = logs.filter(l =>
      Date.now() - new Date(l.timestamp).getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    if (recentLogs.length === 0) return 'low';

    const rejectionRate = recentLogs.filter(l => l.validation.action === 'reject').length / recentLogs.length;
    const averageConfidence = recentLogs.reduce((sum, l) => sum + l.validation.confidence, 0) / recentLogs.length;
    const hasCriticalFlags = recentLogs.some(l => l.severity === 'critical');

    if (hasCriticalFlags || rejectionRate > 0.5) return 'critical';
    if (rejectionRate > 0.2 || averageConfidence < 0.5) return 'high';
    if (rejectionRate > 0.1 || averageConfidence < 0.7) return 'medium';

    return 'low';
  }
}

// Supporting interfaces
export interface PlausibilityValidationResult {
  validation: ValidationResult;
  logEntry: ValidationLogEntry | null;
  processingTime: number;
  autoFlagged: boolean;
  error?: string;
}

export interface ValidationMetrics {
  totalValidations: number;
  rejectedValidations: number;
  flaggedValidations: number;
  acceptedValidations: number;
  averageConfidence: number;
  topFlags: Map<string, number>;
  severityDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface AutoFlaggedUser {
  userId: string;
  firstFlagged: number;
  flagCount: number;
  lastFlagged: number;
  flags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface UserValidationStats {
  userId: string;
  totalValidations: number;
  rejectedCount: number;
  flaggedCount: number;
  acceptedCount: number;
  averageConfidence: number;
  flagFrequency: Record<string, number>;
  lastValidation: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}