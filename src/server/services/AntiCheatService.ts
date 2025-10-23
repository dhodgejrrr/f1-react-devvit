import type { 
  ValidationResult, 
  OutlierAnalysis, 
  BehaviorProfile,
  GameResult,
  UserSession,
  SessionStatistics
} from '../../shared/types/index.js';

/**
 * Comprehensive Anti-Cheat Service implementing multi-layer validation
 * Requirement 8.1: Plausibility validation system with enhanced monitoring
 * Requirement 8.2: Statistical outlier detection
 */
export class AntiCheatService {
  
  // Human reaction time bounds (milliseconds) - Requirement 8.1
  private static readonly MIN_HUMAN_REACTION = 80;
  private static readonly MAX_HUMAN_REACTION = 1000;
  private static readonly SUSPICIOUS_THRESHOLD = 120;
  private static readonly VERY_FAST_THRESHOLD = 150;
  
  // Enhanced validation thresholds - Requirement 8.1
  private static readonly IMPOSSIBLE_FAST_THRESHOLD = 50; // Physically impossible
  private static readonly SUPERHUMAN_THRESHOLD = 100; // Elite athlete level
  
  // Session validation thresholds - Requirement 8.1: Session duration validation
  private static readonly MIN_SESSION_DURATION = 2000; // 2 seconds minimum
  private static readonly MIN_GAME_DURATION = 1500; // Minimum time for a complete game
  private static readonly MAX_SUBMISSIONS_PER_SESSION = 50;
  private static readonly INSTANT_SUBMISSION_THRESHOLD = 500; // Less than 500ms is suspicious
  
  // Statistical analysis parameters
  private static readonly OUTLIER_Z_SCORE_THRESHOLD = 2.5;
  private static readonly CONSISTENCY_THRESHOLD = 0.15; // 15% coefficient of variation
  private static readonly FALSE_START_RATE_THRESHOLD = 0.05; // 5% false start rate is suspicious
  
  /**
   * Enhanced plausibility validation system
   * Requirement 8.1: Create reaction time bounds checking and impossible time detection
   */
  static validatePlausibility(
    reactionTime: number, 
    sessionData: Partial<UserSession>,
    deviceCapabilities?: DeviceCapabilities,
    gameStartTime?: number
  ): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;
    
    // Basic number validation
    if (typeof reactionTime !== 'number' || isNaN(reactionTime) || !isFinite(reactionTime)) {
      return {
        isValid: false,
        confidence: 0,
        flags: ['INVALID_NUMBER'],
        action: 'reject'
      };
    }
    
    // Enhanced reaction time bounds checking - Requirement 8.1
    if (reactionTime < this.IMPOSSIBLE_FAST_THRESHOLD) {
      flags.push('PHYSICALLY_IMPOSSIBLE');
      confidence = 0;
    } else if (reactionTime < this.MIN_HUMAN_REACTION) {
      flags.push('IMPOSSIBLY_FAST');
      confidence = 0;
    } else if (reactionTime < this.SUPERHUMAN_THRESHOLD) {
      flags.push('SUPERHUMAN_SPEED');
      confidence = 0.1;
    } else if (reactionTime < this.SUSPICIOUS_THRESHOLD) {
      flags.push('SUSPICIOUSLY_FAST');
      confidence = 0.2;
    } else if (reactionTime < this.VERY_FAST_THRESHOLD) {
      flags.push('VERY_FAST');
      confidence = 0.6;
    }
    
    if (reactionTime > this.MAX_HUMAN_REACTION) {
      flags.push('UNUSUALLY_SLOW');
      confidence = Math.min(confidence, 0.8);
    }
    
    // Precision analysis - suspicious if too precise or round
    const precisionAnalysis = this.analyzePrecision(reactionTime);
    flags.push(...precisionAnalysis.flags);
    confidence = Math.min(confidence, precisionAnalysis.confidence);
    
    // Enhanced session duration validation - Requirement 8.1
    const sessionValidation = this.validateSessionDuration(sessionData, gameStartTime);
    flags.push(...sessionValidation.flags);
    confidence = Math.min(confidence, sessionValidation.confidence);
    
    // Device capability validation - Requirement 8.1
    if (deviceCapabilities) {
      const deviceValidation = this.validateDeviceCapabilities(reactionTime, deviceCapabilities);
      flags.push(...deviceValidation.flags);
      confidence = Math.min(confidence, deviceValidation.confidence);
    }
    
    // Games played validation
    if (sessionData.sessionStats) {
      if (sessionData.sessionStats.gamesPlayed > this.MAX_SUBMISSIONS_PER_SESSION) {
        flags.push('EXCESSIVE_SUBMISSIONS');
        confidence = Math.min(confidence, 0.3);
      }
    }
    
    // Automatic flagging for impossible times - Requirement 8.1
    const shouldAutoFlag = flags.includes('PHYSICALLY_IMPOSSIBLE') || 
                          flags.includes('IMPOSSIBLY_FAST') || 
                          flags.includes('INSTANT_SUBMISSION');
    
    const isValid = confidence > 0.5 && !shouldAutoFlag;
    const action: 'accept' | 'flag' | 'reject' = 
      shouldAutoFlag ? 'reject' :
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
   * Statistical outlier detection using z-score analysis
   * Requirement 8.2: Implement user performance history tracking and z-score analysis
   */
  static detectOutlier(
    newTime: number, 
    userHistory: number[], 
    sessionStats: SessionStatistics
  ): OutlierAnalysis {
    
    if (userHistory.length < 3) {
      return {
        isOutlier: false,
        zScore: 0,
        confidence: 0.5,
        reason: 'INSUFFICIENT_HISTORY'
      };
    }
    
    // Calculate z-score
    const mean = userHistory.reduce((sum, time) => sum + time, 0) / userHistory.length;
    const variance = userHistory.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / userHistory.length;
    const standardDeviation = Math.sqrt(variance);
    
    if (standardDeviation === 0) {
      return {
        isOutlier: true,
        zScore: Infinity,
        confidence: 0.9,
        reason: 'ZERO_VARIANCE_SUSPICIOUS'
      };
    }
    
    const zScore = Math.abs(newTime - mean) / standardDeviation;
    const isOutlier = zScore > this.OUTLIER_Z_SCORE_THRESHOLD;
    
    // Additional analysis for improvement patterns
    let reason = 'NORMAL_VARIATION';
    let confidence = 0.7;
    
    if (isOutlier) {
      if (newTime < mean) {
        // Sudden improvement
        const improvementPercent = ((mean - newTime) / mean) * 100;
        if (improvementPercent > 30) {
          reason = 'DRAMATIC_IMPROVEMENT';
          confidence = 0.9;
        } else if (improvementPercent > 15) {
          reason = 'SIGNIFICANT_IMPROVEMENT';
          confidence = 0.8;
        } else {
          reason = 'MODERATE_IMPROVEMENT';
          confidence = 0.6;
        }
      } else {
        reason = 'PERFORMANCE_DEGRADATION';
        confidence = 0.5; // Less suspicious
      }
    }
    
    // Check for bot-like consistency
    const coefficientOfVariation = standardDeviation / mean;
    if (coefficientOfVariation < this.CONSISTENCY_THRESHOLD && userHistory.length > 10) {
      return {
        isOutlier: true,
        zScore,
        confidence: 0.95,
        reason: 'BOT_LIKE_CONSISTENCY'
      };
    }
    
    return {
      isOutlier,
      zScore,
      confidence,
      reason
    };
  }
  
  /**
   * Behavioral analysis for detecting automated play
   * Requirement 8.2: Add consistency analysis for identifying bot-like behavior
   */
  static analyzeBehavior(sessionStats: SessionStatistics, userHistory: number[]): BehaviorProfile {
    const suspiciousFlags: string[] = [];
    
    // False start rate analysis
    const falseStartRate = sessionStats.gamesPlayed > 0 ? 
      sessionStats.falseStarts / sessionStats.gamesPlayed : 0;
    
    if (falseStartRate < this.FALSE_START_RATE_THRESHOLD && sessionStats.gamesPlayed > 20) {
      suspiciousFlags.push('UNUSUALLY_LOW_FALSE_START_RATE');
    }
    
    if (falseStartRate > 0.5) {
      suspiciousFlags.push('EXCESSIVE_FALSE_STARTS');
    }
    
    // Consistency analysis
    let consistencyScore = 0.5;
    if (userHistory.length > 5) {
      const mean = userHistory.reduce((sum, time) => sum + time, 0) / userHistory.length;
      const variance = userHistory.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / userHistory.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / mean;
      
      consistencyScore = Math.max(0, Math.min(1, 1 - (coefficientOfVariation * 5)));
      
      if (coefficientOfVariation < 0.05 && userHistory.length > 10) {
        suspiciousFlags.push('MACHINE_LIKE_PRECISION');
      }
    }
    
    // Improvement pattern analysis
    let improvementPattern = 0;
    if (userHistory.length > 10) {
      const firstHalf = userHistory.slice(0, Math.floor(userHistory.length / 2));
      const secondHalf = userHistory.slice(Math.floor(userHistory.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
      
      improvementPattern = (firstAvg - secondAvg) / firstAvg;
      
      if (improvementPattern > 0.3) {
        suspiciousFlags.push('UNREALISTIC_IMPROVEMENT_RATE');
      }
    }
    
    return {
      consistencyScore,
      falseStartRate,
      improvementPattern,
      suspiciousFlags
    };
  }
  
  /**
   * Enhanced session duration validation to prevent instant submissions
   * Requirement 8.1: Implement session duration validation to prevent instant submissions
   */
  private static validateSessionDuration(
    sessionData: Partial<UserSession>,
    gameStartTime?: number
  ): { flags: string[]; confidence: number } {
    const flags: string[] = [];
    let confidence = 1.0;
    
    const now = Date.now();
    
    // Check overall session duration
    if (sessionData.sessionStart) {
      const sessionDuration = now - sessionData.sessionStart;
      
      if (sessionDuration < this.INSTANT_SUBMISSION_THRESHOLD) {
        flags.push('INSTANT_SUBMISSION');
        confidence = 0;
      } else if (sessionDuration < this.MIN_SESSION_DURATION) {
        flags.push('VERY_QUICK_SUBMISSION');
        confidence = 0.2;
      }
    }
    
    // Check individual game duration if provided
    if (gameStartTime) {
      const gameDuration = now - gameStartTime;
      
      if (gameDuration < this.MIN_GAME_DURATION) {
        flags.push('GAME_TOO_SHORT');
        confidence = Math.min(confidence, 0.1);
      }
      
      // Check for suspiciously consistent game durations
      if (sessionData.sessionStats && sessionData.sessionStats.gamesPlayed > 5) {
        // This would require tracking game durations in session stats
        // For now, we'll flag if the game duration is exactly the minimum expected
        const expectedMinDuration = 5000; // 5 seconds for full light sequence + reaction
        if (gameDuration < expectedMinDuration) {
          flags.push('SKIPPED_LIGHT_SEQUENCE');
          confidence = Math.min(confidence, 0.3);
        }
      }
    }
    
    return { flags, confidence };
  }

  /**
   * Analyze timing precision for suspicious patterns
   */
  private static analyzePrecision(reactionTime: number): { flags: string[]; confidence: number } {
    const flags: string[] = [];
    let confidence = 1.0;
    
    // Check for suspiciously round numbers
    if (reactionTime % 10 === 0 && reactionTime < 300) {
      flags.push('SUSPICIOUS_ROUND_NUMBER');
      confidence = 0.7;
    }
    
    // Check for repeated decimal patterns
    const decimalPart = reactionTime % 1;
    if (decimalPart === 0 && reactionTime < 200) {
      flags.push('NO_DECIMAL_PRECISION');
      confidence = 0.8;
    }
    
    // Check for impossible precision (too many decimal places)
    const decimalPlaces = (reactionTime.toString().split('.')[1] || '').length;
    if (decimalPlaces > 3) {
      flags.push('EXCESSIVE_PRECISION');
      confidence = 0.6;
    }
    
    return { flags, confidence };
  }
  
  /**
   * Enhanced device capability detection for timing precision
   * Requirement 8.1: Build device capability detection for timing precision
   */
  private static validateDeviceCapabilities(
    reactionTime: number, 
    capabilities: DeviceCapabilities
  ): { flags: string[]; confidence: number } {
    const flags: string[] = [];
    let confidence = 1.0;
    
    // Check if device supports high-resolution timing
    if (!capabilities.highResolutionTime && reactionTime < 150) {
      flags.push('DEVICE_PRECISION_MISMATCH');
      confidence = 0.4;
    }
    
    // Check performance API availability
    if (!capabilities.performanceAPI && reactionTime < 100) {
      flags.push('TIMING_API_UNAVAILABLE');
      confidence = 0.3;
    }
    
    // Enhanced mobile device validation
    if (capabilities.isMobile) {
      if (reactionTime < 100) {
        flags.push('MOBILE_IMPOSSIBLE_PRECISION');
        confidence = 0.2;
      } else if (reactionTime < 120) {
        flags.push('MOBILE_TIMING_SUSPICIOUS');
        confidence = 0.6;
      }
      
      // Check for mobile-specific timing issues
      if (capabilities.screenRefreshRate && capabilities.screenRefreshRate < 60 && reactionTime < 120) {
        flags.push('LOW_REFRESH_RATE_MISMATCH');
        confidence = Math.min(confidence, 0.5);
      }
    }
    
    // Enhanced browser timing precision validation
    if (capabilities.timingPrecision) {
      if (capabilities.timingPrecision > 5 && reactionTime < 100) {
        flags.push('LOW_PRECISION_DEVICE');
        confidence = 0.5;
      } else if (capabilities.timingPrecision > 1 && reactionTime < 80) {
        flags.push('PRECISION_CAPABILITY_MISMATCH');
        confidence = 0.3;
      }
    }
    
    // User agent analysis for known limitations
    if (capabilities.userAgent) {
      const userAgent = capabilities.userAgent.toLowerCase();
      
      // Check for browsers with known timing limitations
      if (userAgent.includes('safari') && !userAgent.includes('chrome') && reactionTime < 100) {
        flags.push('SAFARI_TIMING_LIMITATION');
        confidence = Math.min(confidence, 0.6);
      }
      
      // Check for older browsers
      if (userAgent.includes('msie') || userAgent.includes('trident')) {
        flags.push('LEGACY_BROWSER_TIMING');
        confidence = Math.min(confidence, 0.7);
      }
    }
    
    return { flags, confidence };
  }
  
  /**
   * Enhanced validation result logging and monitoring system
   * Requirement 8.1: Create validation result logging and monitoring
   */
  static createValidationLog(
    userId: string,
    reactionTime: number,
    validationResult: ValidationResult,
    outlierAnalysis?: OutlierAnalysis,
    behaviorProfile?: BehaviorProfile,
    deviceCapabilities?: DeviceCapabilities,
    sessionContext?: ValidationSessionContext
  ): ValidationLogEntry {
    const logEntry: ValidationLogEntry = {
      userId,
      timestamp: new Date().toISOString(),
      reactionTime,
      validation: validationResult,
      outlierAnalysis,
      behaviorProfile,
      deviceCapabilities,
      sessionContext,
      severity: this.calculateSeverity(validationResult, outlierAnalysis, behaviorProfile),
      metadata: this.generateLogMetadata(validationResult, deviceCapabilities, sessionContext)
    };
    
    // Add automatic escalation for critical issues
    if (logEntry.severity === 'critical') {
      logEntry.requiresReview = true;
      logEntry.escalationReason = this.determineEscalationReason(validationResult);
    }
    
    return logEntry;
  }
  
  /**
   * Generate comprehensive metadata for validation logs
   */
  private static generateLogMetadata(
    validation: ValidationResult,
    deviceCapabilities?: DeviceCapabilities,
    sessionContext?: ValidationSessionContext
  ): ValidationLogMetadata {
    return {
      flagCount: validation.flags.length,
      primaryFlag: validation.flags[0] || 'NONE',
      deviceType: deviceCapabilities?.isMobile ? 'mobile' : 'desktop',
      timingPrecision: deviceCapabilities?.timingPrecision || 0,
      sessionDuration: sessionContext?.sessionDuration || 0,
      gameCount: sessionContext?.gameCount || 0,
      browserInfo: this.extractBrowserInfo(deviceCapabilities?.userAgent),
      riskScore: this.calculateRiskScore(validation)
    };
  }
  
  /**
   * Extract browser information from user agent
   */
  private static extractBrowserInfo(userAgent?: string): BrowserInfo {
    if (!userAgent) {
      return { name: 'unknown', version: 'unknown', engine: 'unknown' };
    }
    
    const ua = userAgent.toLowerCase();
    let name = 'unknown';
    let engine = 'unknown';
    
    if (ua.includes('chrome')) {
      name = 'chrome';
      engine = 'blink';
    } else if (ua.includes('firefox')) {
      name = 'firefox';
      engine = 'gecko';
    } else if (ua.includes('safari')) {
      name = 'safari';
      engine = 'webkit';
    } else if (ua.includes('edge')) {
      name = 'edge';
      engine = 'blink';
    }
    
    return { name, version: 'unknown', engine };
  }
  
  /**
   * Calculate risk score based on validation results
   */
  private static calculateRiskScore(validation: ValidationResult): number {
    let riskScore = 0;
    
    // Base risk from confidence (inverted)
    riskScore += (1 - validation.confidence) * 50;
    
    // Add risk for specific flags
    const flagRisks: Record<string, number> = {
      'PHYSICALLY_IMPOSSIBLE': 100,
      'IMPOSSIBLY_FAST': 90,
      'INSTANT_SUBMISSION': 80,
      'SUPERHUMAN_SPEED': 70,
      'BOT_LIKE_CONSISTENCY': 60,
      'MACHINE_LIKE_PRECISION': 50,
      'SUSPICIOUSLY_FAST': 40,
      'DEVICE_PRECISION_MISMATCH': 30,
      'VERY_FAST': 20
    };
    
    validation.flags.forEach(flag => {
      riskScore += flagRisks[flag] || 10;
    });
    
    return Math.min(100, Math.max(0, riskScore));
  }
  
  /**
   * Determine escalation reason for critical validations
   */
  private static determineEscalationReason(validation: ValidationResult): string {
    if (validation.flags.includes('PHYSICALLY_IMPOSSIBLE')) {
      return 'Physically impossible reaction time detected';
    }
    if (validation.flags.includes('IMPOSSIBLY_FAST')) {
      return 'Impossibly fast reaction time for human';
    }
    if (validation.flags.includes('INSTANT_SUBMISSION')) {
      return 'Instant submission without proper game duration';
    }
    if (validation.confidence === 0) {
      return 'Zero confidence validation result';
    }
    return 'Multiple high-risk validation flags detected';
  }
  
  /**
   * Calculate severity level for monitoring
   */
  private static calculateSeverity(
    validation: ValidationResult,
    outlier?: OutlierAnalysis,
    behavior?: BehaviorProfile
  ): 'low' | 'medium' | 'high' | 'critical' {
    
    if (validation.action === 'reject' || validation.flags.includes('IMPOSSIBLY_FAST')) {
      return 'critical';
    }
    
    if (outlier?.isOutlier && outlier.confidence > 0.8) {
      return 'high';
    }
    
    if (behavior?.suspiciousFlags.length && behavior.suspiciousFlags.length > 2) {
      return 'high';
    }
    
    if (validation.action === 'flag' || validation.confidence < 0.6) {
      return 'medium';
    }
    
    return 'low';
  }
}

/**
 * Device capabilities interface for timing validation
 */
export interface DeviceCapabilities {
  highResolutionTime: boolean;
  performanceAPI: boolean;
  isMobile: boolean;
  timingPrecision?: number; // milliseconds
  userAgent?: string;
  screenRefreshRate?: number;
}

/**
 * Enhanced validation log entry for comprehensive monitoring
 */
export interface ValidationLogEntry {
  userId: string;
  timestamp: string;
  reactionTime: number;
  validation: ValidationResult;
  outlierAnalysis?: OutlierAnalysis;
  behaviorProfile?: BehaviorProfile;
  deviceCapabilities?: DeviceCapabilities;
  sessionContext?: ValidationSessionContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: ValidationLogMetadata;
  requiresReview?: boolean;
  escalationReason?: string;
}

/**
 * Session context for validation logging
 */
export interface ValidationSessionContext {
  sessionDuration: number;
  gameCount: number;
  gameStartTime?: number;
  previousValidations?: ValidationResult[];
  userAgent?: string;
  ipAddress?: string; // For rate limiting context
}

/**
 * Metadata for validation logs
 */
export interface ValidationLogMetadata {
  flagCount: number;
  primaryFlag: string;
  deviceType: 'mobile' | 'desktop';
  timingPrecision: number;
  sessionDuration: number;
  gameCount: number;
  browserInfo: BrowserInfo;
  riskScore: number;
}

/**
 * Browser information extracted from user agent
 */
export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
}