import type { 
  OutlierAnalysis, 
  BehaviorProfile,
  SessionStatistics,
  ValidationResult
} from '../../shared/types/index.js';

/**
 * Statistical Analysis Service for advanced cheat detection
 * Requirement 8.2: Build statistical outlier detection
 */
export class StatisticalAnalysisService {
  
  // Statistical thresholds
  private static readonly Z_SCORE_THRESHOLD = 2.5;
  private static readonly CONSISTENCY_THRESHOLD = 0.1; // 10% coefficient of variation
  private static readonly MIN_SAMPLES_FOR_ANALYSIS = 5;
  private static readonly IMPROVEMENT_RATE_THRESHOLD = 0.25; // 25% improvement is suspicious
  
  /**
   * Comprehensive user performance history tracking
   * Requirement 8.2: Implement user performance history tracking
   */
  static trackUserPerformance(
    userId: string,
    newTime: number,
    existingHistory: number[]
  ): UserPerformanceProfile {
    
    const updatedHistory = [...existingHistory, newTime];
    
    // Keep only recent history (last 100 games)
    const recentHistory = updatedHistory.slice(-100);
    
    // Calculate basic statistics
    const stats = this.calculateBasicStatistics(recentHistory);
    
    // Detect patterns
    const patterns = this.detectPerformancePatterns(recentHistory);
    
    // Calculate improvement metrics
    const improvement = this.calculateImprovementMetrics(recentHistory);
    
    return {
      userId,
      history: recentHistory,
      statistics: stats,
      patterns,
      improvement,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Advanced z-score analysis with contextual factors
   * Requirement 8.2: Create z-score analysis for detecting unusual improvements
   */
  static performZScoreAnalysis(
    newTime: number,
    userHistory: number[],
    contextualFactors?: ContextualFactors
  ): OutlierAnalysis {
    
    if (userHistory.length < this.MIN_SAMPLES_FOR_ANALYSIS) {
      return {
        isOutlier: false,
        zScore: 0,
        confidence: 0.3,
        reason: 'INSUFFICIENT_DATA'
      };
    }
    
    // Calculate rolling statistics (last 20 games for recent performance)
    const recentHistory = userHistory.slice(-20);
    const stats = this.calculateBasicStatistics(recentHistory);
    
    if (stats.standardDeviation === 0) {
      return {
        isOutlier: true,
        zScore: Infinity,
        confidence: 0.95,
        reason: 'ZERO_VARIANCE_DETECTED'
      };
    }
    
    // Calculate z-score
    const zScore = Math.abs(newTime - stats.mean) / stats.standardDeviation;
    const isOutlier = zScore > this.Z_SCORE_THRESHOLD;
    
    // Contextual analysis
    let confidence = this.calculateBaseConfidence(zScore);
    let reason = this.determineOutlierReason(newTime, stats, zScore);
    
    // Apply contextual adjustments
    if (contextualFactors) {
      const adjustment = this.applyContextualFactors(contextualFactors, confidence);
      confidence = Math.max(0.1, Math.min(0.99, confidence + adjustment));
    }
    
    // Additional pattern analysis
    const patternAnalysis = this.analyzePerformancePattern(userHistory, newTime);
    if (patternAnalysis.suspicious) {
      confidence = Math.max(confidence, patternAnalysis.confidence);
      reason = patternAnalysis.reason;
    }
    
    return {
      isOutlier,
      zScore,
      confidence,
      reason
    };
  }
  
  /**
   * Bot-like behavior detection through consistency analysis
   * Requirement 8.2: Add consistency analysis for identifying bot-like behavior
   */
  static detectBotLikeBehavior(
    userHistory: number[],
    sessionStats: SessionStatistics,
    timingPatterns?: TimingPattern[]
  ): BehaviorProfile {
    
    const suspiciousFlags: string[] = [];
    
    if (userHistory.length < this.MIN_SAMPLES_FOR_ANALYSIS) {
      return {
        consistencyScore: 0.5,
        falseStartRate: sessionStats.falseStarts / Math.max(1, sessionStats.gamesPlayed),
        improvementPattern: 0,
        suspiciousFlags: ['INSUFFICIENT_DATA']
      };
    }
    
    // Consistency analysis
    const stats = this.calculateBasicStatistics(userHistory);
    const coefficientOfVariation = stats.standardDeviation / stats.mean;
    const consistencyScore = 1 - Math.min(1, coefficientOfVariation * 5);
    
    // Bot-like consistency detection
    if (coefficientOfVariation < this.CONSISTENCY_THRESHOLD && userHistory.length > 10) {
      suspiciousFlags.push('MACHINE_LIKE_CONSISTENCY');
    }
    
    // False start rate analysis
    const falseStartRate = sessionStats.falseStarts / Math.max(1, sessionStats.gamesPlayed);
    
    if (falseStartRate < 0.02 && sessionStats.gamesPlayed > 20) {
      suspiciousFlags.push('UNUSUALLY_LOW_FALSE_START_RATE');
    }
    
    if (falseStartRate > 0.6) {
      suspiciousFlags.push('EXCESSIVE_FALSE_STARTS');
    }
    
    // Improvement pattern analysis
    const improvementPattern = this.calculateImprovementPattern(userHistory);
    
    if (improvementPattern > this.IMPROVEMENT_RATE_THRESHOLD) {
      suspiciousFlags.push('UNREALISTIC_IMPROVEMENT_RATE');
    }
    
    // Timing pattern analysis
    if (timingPatterns) {
      const patternFlags = this.analyzeTimingPatterns(timingPatterns);
      suspiciousFlags.push(...patternFlags);
    }
    
    // Rhythm analysis
    const rhythmAnalysis = this.analyzePlayingRhythm(userHistory);
    if (rhythmAnalysis.suspicious) {
      suspiciousFlags.push(rhythmAnalysis.flag);
    }
    
    return {
      consistencyScore,
      falseStartRate,
      improvementPattern,
      suspiciousFlags
    };
  }
  
  /**
   * False start rate behavioral validation
   * Requirement 8.2: Build false start rate analysis for behavioral validation
   */
  static analyzeFalseStartBehavior(
    sessionStats: SessionStatistics,
    recentFalseStarts: boolean[]
  ): FalseStartAnalysis {
    
    const totalGames = sessionStats.gamesPlayed;
    const totalFalseStarts = sessionStats.falseStarts;
    const falseStartRate = totalGames > 0 ? totalFalseStarts / totalGames : 0;
    
    const flags: string[] = [];
    let suspiciousScore = 0;
    
    // Overall false start rate analysis
    if (falseStartRate < 0.01 && totalGames > 50) {
      flags.push('IMPOSSIBLY_LOW_FALSE_START_RATE');
      suspiciousScore += 0.8;
    } else if (falseStartRate < 0.03 && totalGames > 20) {
      flags.push('UNUSUALLY_LOW_FALSE_START_RATE');
      suspiciousScore += 0.6;
    }
    
    if (falseStartRate > 0.7) {
      flags.push('EXCESSIVE_FALSE_STARTS');
      suspiciousScore += 0.4;
    }
    
    // Recent pattern analysis
    if (recentFalseStarts.length >= 10) {
      const recentRate = recentFalseStarts.filter(fs => fs).length / recentFalseStarts.length;
      const rateDifference = Math.abs(falseStartRate - recentRate);
      
      if (rateDifference > 0.3) {
        flags.push('INCONSISTENT_FALSE_START_PATTERN');
        suspiciousScore += 0.5;
      }
    }
    
    // Streak analysis
    const streakAnalysis = this.analyzeFalseStartStreaks(recentFalseStarts);
    if (streakAnalysis.suspicious) {
      flags.push(streakAnalysis.flag);
      suspiciousScore += streakAnalysis.score;
    }
    
    return {
      falseStartRate,
      recentRate: recentFalseStarts.length > 0 ? 
        recentFalseStarts.filter(fs => fs).length / recentFalseStarts.length : 0,
      flags,
      suspiciousScore: Math.min(1, suspiciousScore),
      isNormal: suspiciousScore < 0.3
    };
  }
  
  /**
   * Machine learning-based anomaly detection (simplified implementation)
   * Requirement 8.2: Implement machine learning-based anomaly detection
   */
  static detectAnomalies(
    userProfile: UserPerformanceProfile,
    newGameData: GameDataPoint
  ): AnomalyDetectionResult {
    
    const features = this.extractFeatures(userProfile, newGameData);
    const anomalyScore = this.calculateAnomalyScore(features, userProfile.statistics);
    
    const threshold = 0.7;
    const isAnomaly = anomalyScore > threshold;
    
    const reasons: string[] = [];
    
    // Feature-based analysis
    if (features.reactionTimeDeviation > 3) {
      reasons.push('EXTREME_REACTION_TIME_DEVIATION');
    }
    
    if (features.consistencyChange > 0.5) {
      reasons.push('SUDDEN_CONSISTENCY_CHANGE');
    }
    
    if (features.improvementRate > 0.3) {
      reasons.push('RAPID_IMPROVEMENT');
    }
    
    if (features.timingPrecisionChange > 0.4) {
      reasons.push('TIMING_PRECISION_ANOMALY');
    }
    
    return {
      isAnomaly,
      anomalyScore,
      confidence: Math.min(0.95, anomalyScore),
      reasons,
      features
    };
  }
  
  /**
   * Calculate basic statistical measures
   */
  private static calculateBasicStatistics(data: number[]): BasicStatistics {
    if (data.length === 0) {
      return { mean: 0, median: 0, standardDeviation: 0, variance: 0, min: 0, max: 0 };
    }
    
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const standardDeviation = Math.sqrt(variance);
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    return {
      mean,
      median,
      standardDeviation,
      variance,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }
  
  /**
   * Detect performance patterns over time
   */
  private static detectPerformancePatterns(history: number[]): PerformancePattern {
    if (history.length < 10) {
      return { trend: 'insufficient_data', volatility: 0, cyclical: false };
    }
    
    // Calculate trend using linear regression
    const trend = this.calculateTrend(history);
    
    // Calculate volatility
    const stats = this.calculateBasicStatistics(history);
    const volatility = stats.standardDeviation / stats.mean;
    
    // Detect cyclical patterns (simplified)
    const cyclical = this.detectCyclicalPattern(history);
    
    return { trend, volatility, cyclical };
  }
  
  /**
   * Calculate improvement metrics
   */
  private static calculateImprovementMetrics(history: number[]): ImprovementMetrics {
    if (history.length < 10) {
      return { rate: 0, consistency: 0, recent: 0 };
    }
    
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const rate = (firstAvg - secondAvg) / firstAvg;
    
    // Recent improvement (last 10 vs previous 10)
    const recent = history.length >= 20 ? 
      this.calculateRecentImprovement(history) : 0;
    
    // Consistency of improvement
    const consistency = this.calculateImprovementConsistency(history);
    
    return { rate, consistency, recent };
  }
  
  /**
   * Additional helper methods for comprehensive analysis
   */
  private static calculateBaseConfidence(zScore: number): number {
    return Math.min(0.95, Math.max(0.1, zScore / 5));
  }
  
  private static determineOutlierReason(newTime: number, stats: BasicStatistics, zScore: number): string {
    if (newTime < stats.mean) {
      if (zScore > 4) return 'EXTREME_IMPROVEMENT';
      if (zScore > 3) return 'SIGNIFICANT_IMPROVEMENT';
      return 'MODERATE_IMPROVEMENT';
    } else {
      return 'PERFORMANCE_DEGRADATION';
    }
  }
  
  private static applyContextualFactors(factors: ContextualFactors, baseConfidence: number): number {
    let adjustment = 0;
    
    if (factors.timeOfDay === 'unusual') adjustment += 0.1;
    if (factors.sessionLength === 'short') adjustment += 0.15;
    if (factors.deviceChange) adjustment += 0.2;
    if (factors.networkLatency > 100) adjustment += 0.1;
    
    return adjustment;
  }
  
  private static analyzePerformancePattern(history: number[], newTime: number): PatternAnalysis {
    // Simplified pattern analysis
    const recentAvg = history.slice(-5).reduce((sum, val) => sum + val, 0) / Math.min(5, history.length);
    const improvement = (recentAvg - newTime) / recentAvg;
    
    return {
      suspicious: improvement > 0.4,
      confidence: Math.min(0.9, improvement * 2),
      reason: improvement > 0.4 ? 'SUDDEN_DRAMATIC_IMPROVEMENT' : 'NORMAL_VARIATION'
    };
  }
  
  private static calculateImprovementPattern(history: number[]): number {
    if (history.length < 10) return 0;
    
    const firstQuarter = history.slice(0, Math.floor(history.length / 4));
    const lastQuarter = history.slice(-Math.floor(history.length / 4));
    
    const firstAvg = firstQuarter.reduce((sum, val) => sum + val, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((sum, val) => sum + val, 0) / lastQuarter.length;
    
    return (firstAvg - lastAvg) / firstAvg;
  }
  
  private static analyzeTimingPatterns(patterns: TimingPattern[]): string[] {
    const flags: string[] = [];
    
    // Check for identical timing patterns
    const uniquePatterns = new Set(patterns.map(p => p.signature));
    if (uniquePatterns.size < patterns.length * 0.8) {
      flags.push('REPEATED_TIMING_PATTERNS');
    }
    
    return flags;
  }
  
  private static analyzePlayingRhythm(history: number[]): { suspicious: boolean; flag: string } {
    // Simplified rhythm analysis - check for too regular intervals
    if (history.length < 5) {
      return { suspicious: false, flag: '' };
    }
    
    const intervals = [];
    for (let i = 1; i < history.length; i++) {
      intervals.push(Math.abs(history[i] - history[i-1]));
    }
    
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    
    if (variance < 5 && intervals.length > 10) {
      return { suspicious: true, flag: 'ROBOTIC_TIMING_RHYTHM' };
    }
    
    return { suspicious: false, flag: '' };
  }
  
  private static analyzeFalseStartStreaks(recentFalseStarts: boolean[]): { suspicious: boolean; flag: string; score: number } {
    if (recentFalseStarts.length < 10) {
      return { suspicious: false, flag: '', score: 0 };
    }
    
    // Check for perfect streaks (no false starts for extended periods)
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const falseStart of recentFalseStarts) {
      if (!falseStart) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    if (maxStreak >= 20) {
      return { suspicious: true, flag: 'PERFECT_STREAK_SUSPICIOUS', score: 0.7 };
    }
    
    return { suspicious: false, flag: '', score: 0 };
  }
  
  private static extractFeatures(profile: UserPerformanceProfile, newData: GameDataPoint): AnomalyFeatures {
    const recentStats = this.calculateBasicStatistics(profile.history.slice(-10));
    
    return {
      reactionTimeDeviation: Math.abs(newData.reactionTime - recentStats.mean) / recentStats.standardDeviation,
      consistencyChange: Math.abs(profile.patterns.volatility - newData.sessionVolatility),
      improvementRate: profile.improvement.rate,
      timingPrecisionChange: Math.abs(profile.statistics.standardDeviation - recentStats.standardDeviation) / profile.statistics.standardDeviation
    };
  }
  
  private static calculateAnomalyScore(features: AnomalyFeatures, baseStats: BasicStatistics): number {
    // Weighted combination of features
    const weights = {
      reactionTimeDeviation: 0.4,
      consistencyChange: 0.3,
      improvementRate: 0.2,
      timingPrecisionChange: 0.1
    };
    
    return (
      features.reactionTimeDeviation * weights.reactionTimeDeviation +
      features.consistencyChange * weights.consistencyChange +
      features.improvementRate * weights.improvementRate +
      features.timingPrecisionChange * weights.timingPrecisionChange
    ) / 4;
  }
  
  private static calculateTrend(data: number[]): 'improving' | 'declining' | 'stable' | 'insufficient_data' {
    if (data.length < 5) return 'insufficient_data';
    
    // Simple linear regression slope
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, idx) => sum + val * idx, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (slope < -5) return 'improving'; // Negative slope means improving times
    if (slope > 5) return 'declining';
    return 'stable';
  }
  
  private static detectCyclicalPattern(data: number[]): boolean {
    // Simplified cyclical detection
    if (data.length < 20) return false;
    
    // Check for repeating patterns in chunks
    const chunkSize = 5;
    const chunks = [];
    for (let i = 0; i < data.length - chunkSize; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    
    // Very basic pattern detection
    return chunks.length > 2;
  }
  
  private static calculateRecentImprovement(history: number[]): number {
    const recent = history.slice(-10);
    const previous = history.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length;
    
    return (previousAvg - recentAvg) / previousAvg;
  }
  
  private static calculateImprovementConsistency(history: number[]): number {
    if (history.length < 10) return 0;
    
    // Calculate rolling improvements
    const improvements = [];
    const windowSize = 5;
    
    for (let i = windowSize; i < history.length - windowSize; i++) {
      const before = history.slice(i - windowSize, i);
      const after = history.slice(i, i + windowSize);
      
      const beforeAvg = before.reduce((sum, val) => sum + val, 0) / before.length;
      const afterAvg = after.reduce((sum, val) => sum + val, 0) / after.length;
      
      improvements.push((beforeAvg - afterAvg) / beforeAvg);
    }
    
    // Calculate consistency (inverse of variance)
    const stats = this.calculateBasicStatistics(improvements);
    return 1 / (1 + stats.variance);
  }
}

// Supporting interfaces
export interface UserPerformanceProfile {
  userId: string;
  history: number[];
  statistics: BasicStatistics;
  patterns: PerformancePattern;
  improvement: ImprovementMetrics;
  lastUpdated: string;
}

export interface BasicStatistics {
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
}

export interface PerformancePattern {
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  volatility: number;
  cyclical: boolean;
}

export interface ImprovementMetrics {
  rate: number;
  consistency: number;
  recent: number;
}

export interface ContextualFactors {
  timeOfDay: 'normal' | 'unusual';
  sessionLength: 'short' | 'normal' | 'long';
  deviceChange: boolean;
  networkLatency: number;
}

export interface PatternAnalysis {
  suspicious: boolean;
  confidence: number;
  reason: string;
}

export interface TimingPattern {
  signature: string;
  frequency: number;
}

export interface FalseStartAnalysis {
  falseStartRate: number;
  recentRate: number;
  flags: string[];
  suspiciousScore: number;
  isNormal: boolean;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number;
  confidence: number;
  reasons: string[];
  features: AnomalyFeatures;
}

export interface AnomalyFeatures {
  reactionTimeDeviation: number;
  consistencyChange: number;
  improvementRate: number;
  timingPrecisionChange: number;
}

export interface GameDataPoint {
  reactionTime: number;
  timestamp: number;
  sessionVolatility: number;
}