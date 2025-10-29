import { KVStorageService } from './KVStorageService.js';
import type { RateLimitResult } from '../../shared/types/leaderboard.js';

/**
 * Enhanced Rate Limiting Service for preventing abuse and ensuring fair play
 * Requirement 8.3: Implement per-user submission rate limits and IP-based rate limiting
 * Implements sliding window rate limiting with multiple time periods, progressive penalties, and whitelist system
 */
export class RateLimitService {
  // Rate limit configurations - Requirement 8.3: per-user submission rate limits
  private static readonly LIMITS = {
    score_submission: {
      minute: 10,   // 10 submissions per minute (allow rapid gameplay)
      hour: 50,     // 50 submissions per hour  
      day: 200      // 200 submissions per day
    },
    leaderboard_view: {
      minute: 100,  // 100 views per minute (allow frequent refreshes)
      hour: 1000,   // 1000 views per hour
      day: 5000     // 5000 views per day
    },
    challenge_create: {
      minute: 5,    // 5 challenges per minute
      hour: 20,     // 20 challenges per hour
      day: 100      // 100 challenges per day
    },
    challenge_accept: {
      minute: 10,   // 10 accepts per minute
      hour: 50,     // 50 accepts per hour
      day: 300      // 300 accepts per day
    }
  } as const;

  // IP-based rate limits - Requirement 8.3: Add IP-based rate limiting
  private static readonly IP_LIMITS = {
    score_submission: {
      minute: 10,   // 10 submissions per minute per IP
      hour: 100,    // 100 submissions per hour per IP
      day: 500      // 500 submissions per day per IP
    },
    general: {
      minute: 100,  // 100 requests per minute per IP
      hour: 2000,   // 2000 requests per hour per IP
      day: 10000    // 10000 requests per day per IP
    }
  } as const;

  // Progressive penalty system - Requirement 8.3: Build temporary bans and progressive penalties
  private static readonly PENALTY_LEVELS = {
    1: { duration: 5 * 60 * 1000, multiplier: 1.5 },      // 5 minutes, 1.5x stricter limits
    2: { duration: 15 * 60 * 1000, multiplier: 2 },       // 15 minutes, 2x stricter limits
    3: { duration: 60 * 60 * 1000, multiplier: 3 },       // 1 hour, 3x stricter limits
    4: { duration: 6 * 60 * 60 * 1000, multiplier: 5 },   // 6 hours, 5x stricter limits
    5: { duration: 24 * 60 * 60 * 1000, multiplier: 10 }  // 24 hours, 10x stricter limits
  } as const;

  // Whitelist system - Requirement 8.3: Implement whitelist system for verified users
  private static readonly WHITELIST_MULTIPLIERS = {
    verified: 2,    // 2x higher limits for verified users
    moderator: 5,   // 5x higher limits for moderators
    admin: 10       // 10x higher limits for admins
  } as const;

  private static readonly TTL = {
    minute: 60,           // 1 minute
    hour: 60 * 60,        // 1 hour
    day: 24 * 60 * 60     // 24 hours
  } as const;

  /**
   * Enhanced rate limit check with IP-based limiting and progressive penalties
   * Requirement 8.3: Implement per-user submission rate limits and IP-based rate limiting
   */
  static async checkRateLimit(
    userId: string, 
    action: keyof typeof RateLimitService.LIMITS,
    ipAddress?: string,
    userLevel?: keyof typeof RateLimitService.WHITELIST_MULTIPLIERS
  ): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      
      // Check for active penalties first
      const penaltyResult = await RateLimitService.checkActivePenalty(userId);
      if (!penaltyResult.allowed) {
        return penaltyResult;
      }
      
      // Get base limits and apply whitelist multipliers
      let limits = { ...RateLimitService.LIMITS[action] };
      if (userLevel && RateLimitService.WHITELIST_MULTIPLIERS[userLevel]) {
        const multiplier = RateLimitService.WHITELIST_MULTIPLIERS[userLevel];
        limits = {
          minute: limits.minute * multiplier,
          hour: limits.hour * multiplier,
          day: limits.day * multiplier
        };
      }
      
      // Apply penalty multipliers if user has violations
      const penaltyLevel = await RateLimitService.getUserPenaltyLevel(userId);
      if (penaltyLevel > 0) {
        const penalty = RateLimitService.PENALTY_LEVELS[penaltyLevel as keyof typeof RateLimitService.PENALTY_LEVELS];
        limits = {
          minute: Math.max(1, Math.floor(limits.minute / penalty.multiplier)),
          hour: Math.max(1, Math.floor(limits.hour / penalty.multiplier)),
          day: Math.max(1, Math.floor(limits.day / penalty.multiplier))
        };
      }
      
      // Check user-based rate limits
      const userResult = await RateLimitService.checkUserRateLimit(userId, action, limits, now);
      if (!userResult.allowed) {
        // Record violation for progressive penalties
        await RateLimitService.recordViolation(userId, action);
        return userResult;
      }
      
      // Check IP-based rate limits if IP provided
      if (ipAddress) {
        const ipResult = await RateLimitService.checkIPRateLimit(ipAddress, action, now);
        if (!ipResult.allowed) {
          return ipResult;
        }
      }
      
      return userResult;

    } catch (error) {
      console.error(`Rate limit check failed for ${userId}:${action}:`, error);
      // On error, allow the action but log it
      return {
        allowed: true,
        remaining: 1,
        resetTime: Date.now() + (60 * 1000),
        reason: 'Rate limit check failed, allowing action'
      };
    }
  }

  /**
   * Record an action for rate limiting
   */
  static async recordAction(
    userId: string, 
    action: keyof typeof RateLimitService.LIMITS
  ): Promise<boolean> {
    try {
      const now = Date.now();
      const rateLimitKey = KVStorageService.keys.rateLimit(userId);
      
      await KVStorageService.atomicUpdate<RateLimitData>(
        rateLimitKey,
        (current) => {
          const data = current || { minute: [], hour: [], day: [] };
          
          // Clean expired entries
          RateLimitService.cleanAndCount(data, now);
          
          // Add new timestamp to all periods
          data.minute.push(now);
          data.hour.push(now);
          data.day.push(now);
          
          return data;
        },
        RateLimitService.TTL.day // Use day TTL as it's the longest period
      );

      return true;

    } catch (error) {
      console.error(`Failed to record action ${action} for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get current rate limit status for user
   */
  static async getRateLimitStatus(
    userId: string, 
    action: keyof typeof RateLimitService.LIMITS
  ): Promise<RateLimitStatus> {
    try {
      const limits = RateLimitService.LIMITS[action];
      const now = Date.now();
      
      const rateLimitKey = KVStorageService.keys.rateLimit(userId);
      const rateLimitData = await KVStorageService.get<RateLimitData>(rateLimitKey) || {
        minute: [],
        hour: [],
        day: []
      };

      const usage = RateLimitService.cleanAndCount(rateLimitData, now);
      
      return {
        action,
        limits,
        usage,
        remaining: {
          minute: Math.max(0, limits.minute - usage.minute),
          hour: Math.max(0, limits.hour - usage.hour),
          day: Math.max(0, limits.day - usage.day)
        },
        resetTimes: {
          minute: now + (60 * 1000),
          hour: now + (60 * 60 * 1000),
          day: now + (24 * 60 * 60 * 1000)
        },
        isLimited: usage.minute >= limits.minute || 
                   usage.hour >= limits.hour || 
                   usage.day >= limits.day
      };

    } catch (error) {
      console.error(`Failed to get rate limit status for ${userId}:${action}:`, error);
      const limits = RateLimitService.LIMITS[action];
      return {
        action,
        limits,
        usage: { minute: 0, hour: 0, day: 0 },
        remaining: limits,
        resetTimes: {
          minute: Date.now() + (60 * 1000),
          hour: Date.now() + (60 * 60 * 1000),
          day: Date.now() + (24 * 60 * 60 * 1000)
        },
        isLimited: false
      };
    }
  }

  /**
   * Reset rate limits for a user (admin function)
   */
  static async resetRateLimit(userId: string): Promise<boolean> {
    try {
      const rateLimitKey = KVStorageService.keys.rateLimit(userId);
      return await KVStorageService.delete(rateLimitKey);
    } catch (error) {
      console.error(`Failed to reset rate limit for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  static async getRateLimitStats(): Promise<RateLimitStats> {
    try {
      // This would require scanning all rate limit keys, which isn't directly supported
      // In a production system, you'd maintain aggregate statistics
      return {
        totalUsers: 0,
        activeUsers: 0,
        blockedRequests: 0,
        allowedRequests: 0,
        topActions: [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to get rate limit stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        blockedRequests: 0,
        allowedRequests: 0,
        topActions: [],
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check for suspicious rate limit patterns
   */
  static async detectSuspiciousActivity(userId: string): Promise<SuspiciousActivityResult> {
    try {
      const actions: (keyof typeof RateLimitService.LIMITS)[] = [
        'score_submission', 'leaderboard_view', 'challenge_create', 'challenge_accept'
      ];
      
      const statuses = await Promise.all(
        actions.map(action => RateLimitService.getRateLimitStatus(userId, action))
      );

      const flags: string[] = [];
      let suspicionScore = 0;

      // Check for patterns that might indicate automation
      statuses.forEach(status => {
        const { usage, limits } = status;
        
        // High usage across all time periods
        if (usage.minute === limits.minute && usage.hour === limits.hour) {
          flags.push(`CONSISTENT_MAX_USAGE_${status.action.toUpperCase()}`);
          suspicionScore += 0.3;
        }
        
        // Hitting limits frequently
        if (status.isLimited) {
          flags.push(`RATE_LIMITED_${status.action.toUpperCase()}`);
          suspicionScore += 0.2;
        }
        
        // Unusual patterns (e.g., exactly same intervals)
        if (usage.minute > 0 && usage.minute === usage.hour && usage.hour === usage.day) {
          flags.push(`UNIFORM_TIMING_${status.action.toUpperCase()}`);
          suspicionScore += 0.4;
        }
      });

      // Multiple actions hitting limits simultaneously
      const limitedActions = statuses.filter(s => s.isLimited).length;
      if (limitedActions >= 2) {
        flags.push('MULTIPLE_ACTIONS_LIMITED');
        suspicionScore += 0.5;
      }

      return {
        userId,
        suspicionScore: Math.min(1.0, suspicionScore),
        flags,
        isSuspicious: suspicionScore > 0.6,
        recommendation: suspicionScore > 0.8 ? 'block' : 
                       suspicionScore > 0.6 ? 'monitor' : 'allow',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`Failed to detect suspicious activity for ${userId}:`, error);
      return {
        userId,
        suspicionScore: 0,
        flags: ['DETECTION_FAILED'],
        isSuspicious: false,
        recommendation: 'allow',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Clean expired entries and count current usage
   */
  private static cleanAndCount(data: RateLimitData, now: number): UsageCounts {
    const minuteAgo = now - (60 * 1000);
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);

    // Remove expired entries
    data.minute = data.minute.filter(timestamp => timestamp > minuteAgo);
    data.hour = data.hour.filter(timestamp => timestamp > hourAgo);
    data.day = data.day.filter(timestamp => timestamp > dayAgo);

    return {
      minute: data.minute.length,
      hour: data.hour.length,
      day: data.day.length
    };
  }

  /**
   * Calculate time until rate limit resets
   */
  static calculateResetTime(timestamps: number[], periodMs: number): number {
    if (timestamps.length === 0) return Date.now();
    
    const oldestTimestamp = Math.min(...timestamps);
    return oldestTimestamp + periodMs;
  }

  /**
   * Check user-specific rate limits
   */
  private static async checkUserRateLimit(
    userId: string,
    action: keyof typeof RateLimitService.LIMITS,
    limits: UsageCounts,
    now: number
  ): Promise<RateLimitResult> {
    const rateLimitKey = KVStorageService.keys.rateLimit(userId);
    const rateLimitData = await KVStorageService.get<RateLimitData>(rateLimitKey) || {
      minute: [],
      hour: [],
      day: []
    };

    const usage = RateLimitService.cleanAndCount(rateLimitData, now);
    
    // Check each time period
    const violations: string[] = [];
    let shortestResetTime = Infinity;

    if (usage.minute >= limits.minute) {
      violations.push(`minute limit (${limits.minute})`);
      const oldestMinute = Math.min(...rateLimitData.minute);
      shortestResetTime = Math.min(shortestResetTime, oldestMinute + (60 * 1000));
    }

    if (usage.hour >= limits.hour) {
      violations.push(`hour limit (${limits.hour})`);
      const oldestHour = Math.min(...rateLimitData.hour);
      shortestResetTime = Math.min(shortestResetTime, oldestHour + (60 * 60 * 1000));
    }

    if (usage.day >= limits.day) {
      violations.push(`day limit (${limits.day})`);
      const oldestDay = Math.min(...rateLimitData.day);
      shortestResetTime = Math.min(shortestResetTime, oldestDay + (24 * 60 * 60 * 1000));
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: shortestResetTime,
        reason: `User rate limit exceeded: ${violations.join(', ')}`
      };
    }

    const remaining = Math.min(
      limits.minute - usage.minute,
      limits.hour - usage.hour,
      limits.day - usage.day
    );

    return {
      allowed: true,
      remaining,
      resetTime: now + (60 * 1000),
      reason: undefined
    };
  }

  /**
   * Check IP-based rate limits - Requirement 8.3: Add IP-based rate limiting
   */
  private static async checkIPRateLimit(
    ipAddress: string,
    action: keyof typeof RateLimitService.LIMITS,
    now: number
  ): Promise<RateLimitResult> {
    const ipLimits = action === 'score_submission' ? 
      RateLimitService.IP_LIMITS.score_submission : 
      RateLimitService.IP_LIMITS.general;
    
    const ipKey = KVStorageService.keys.ipRateLimit(ipAddress);
    const ipData = await KVStorageService.get<RateLimitData>(ipKey) || {
      minute: [],
      hour: [],
      day: []
    };

    const usage = RateLimitService.cleanAndCount(ipData, now);
    
    const violations: string[] = [];
    let shortestResetTime = Infinity;

    if (usage.minute >= ipLimits.minute) {
      violations.push(`IP minute limit (${ipLimits.minute})`);
      const oldestMinute = Math.min(...ipData.minute);
      shortestResetTime = Math.min(shortestResetTime, oldestMinute + (60 * 1000));
    }

    if (usage.hour >= ipLimits.hour) {
      violations.push(`IP hour limit (${ipLimits.hour})`);
      const oldestHour = Math.min(...ipData.hour);
      shortestResetTime = Math.min(shortestResetTime, oldestHour + (60 * 60 * 1000));
    }

    if (usage.day >= ipLimits.day) {
      violations.push(`IP day limit (${ipLimits.day})`);
      const oldestDay = Math.min(...ipData.day);
      shortestResetTime = Math.min(shortestResetTime, oldestDay + (24 * 60 * 60 * 1000));
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: shortestResetTime,
        reason: `IP rate limit exceeded: ${violations.join(', ')}`
      };
    }

    return {
      allowed: true,
      remaining: Math.min(
        ipLimits.minute - usage.minute,
        ipLimits.hour - usage.hour,
        ipLimits.day - usage.day
      ),
      resetTime: now + (60 * 1000),
      reason: undefined
    };
  }

  /**
   * Check for active penalties - Requirement 8.3: Build temporary bans and progressive penalties
   */
  private static async checkActivePenalty(userId: string): Promise<RateLimitResult> {
    const penaltyKey = KVStorageService.keys.userPenalty(userId);
    const penalty = await KVStorageService.get<UserPenalty>(penaltyKey);
    
    if (!penalty || penalty.expiresAt < Date.now()) {
      return { allowed: true, remaining: 1, resetTime: Date.now() };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: penalty.expiresAt,
      reason: `Temporary ban active until ${new Date(penalty.expiresAt).toISOString()}. Reason: ${penalty.reason}`
    };
  }

  /**
   * Get user's current penalty level
   */
  private static async getUserPenaltyLevel(userId: string): Promise<number> {
    const violationKey = KVStorageService.keys.userViolations(userId);
    const violations = await KVStorageService.get<UserViolations>(violationKey);
    
    if (!violations) return 0;
    
    // Count recent violations (last 24 hours)
    const recentViolations = violations.history.filter(
      v => v.timestamp > Date.now() - (24 * 60 * 60 * 1000)
    );
    
    return Math.min(5, recentViolations.length);
  }

  /**
   * Record a rate limit violation for progressive penalties
   */
  private static async recordViolation(userId: string, action: string): Promise<void> {
    const violationKey = KVStorageService.keys.userViolations(userId);
    
    await KVStorageService.atomicUpdate<UserViolations>(
      violationKey,
      (current) => {
        const violations = current || { userId, totalViolations: 0, history: [] };
        
        violations.totalViolations++;
        violations.history.push({
          action,
          timestamp: Date.now(),
          type: 'rate_limit'
        });
        
        // Keep only last 100 violations
        violations.history = violations.history.slice(-100);
        
        return violations;
      },
      7 * 24 * 60 * 60 // 7 days TTL
    );
    
    // Check if penalty should be applied
    const penaltyLevel = await RateLimitService.getUserPenaltyLevel(userId);
    if (penaltyLevel > 0) {
      await RateLimitService.applyPenalty(userId, penaltyLevel, `Rate limit violations: ${action}`);
    }
  }

  /**
   * Apply progressive penalty - Requirement 8.3: Build temporary bans and progressive penalties
   */
  private static async applyPenalty(userId: string, level: number, reason: string): Promise<void> {
    const penaltyConfig = RateLimitService.PENALTY_LEVELS[level as keyof typeof RateLimitService.PENALTY_LEVELS];
    if (!penaltyConfig) return;
    
    const penalty: UserPenalty = {
      userId,
      level,
      reason,
      appliedAt: Date.now(),
      expiresAt: Date.now() + penaltyConfig.duration,
      multiplier: penaltyConfig.multiplier
    };
    
    const penaltyKey = KVStorageService.keys.userPenalty(userId);
    await KVStorageService.set(penaltyKey, penalty, Math.ceil(penaltyConfig.duration / 1000));
  }

  /**
   * Record IP action for rate limiting
   */
  static async recordIPAction(ipAddress: string, action: string): Promise<void> {
    const now = Date.now();
    const ipKey = KVStorageService.keys.ipRateLimit(ipAddress);
    
    await KVStorageService.atomicUpdate<RateLimitData>(
      ipKey,
      (current) => {
        const data = current || { minute: [], hour: [], day: [] };
        
        RateLimitService.cleanAndCount(data, now);
        
        data.minute.push(now);
        data.hour.push(now);
        data.day.push(now);
        
        return data;
      },
      RateLimitService.TTL.day
    );
  }

  /**
   * Whitelist management - Requirement 8.3: Implement whitelist system for verified users
   */
  static async addToWhitelist(
    userId: string, 
    level: keyof typeof RateLimitService.WHITELIST_MULTIPLIERS,
    reason: string
  ): Promise<boolean> {
    try {
      const whitelistKey = KVStorageService.keys.userWhitelist(userId);
      const whitelistEntry: WhitelistEntry = {
        userId,
        level,
        reason,
        addedAt: Date.now(),
        addedBy: 'system' // In real implementation, this would be the admin user
      };
      
      await KVStorageService.set(whitelistKey, whitelistEntry, 365 * 24 * 60 * 60); // 1 year TTL
      return true;
    } catch (error) {
      console.error(`Failed to add ${userId} to whitelist:`, error);
      return false;
    }
  }

  /**
   * Remove from whitelist
   */
  static async removeFromWhitelist(userId: string): Promise<boolean> {
    try {
      const whitelistKey = KVStorageService.keys.userWhitelist(userId);
      return await KVStorageService.delete(whitelistKey);
    } catch (error) {
      console.error(`Failed to remove ${userId} from whitelist:`, error);
      return false;
    }
  }

  /**
   * Get user whitelist status
   */
  static async getWhitelistStatus(userId: string): Promise<WhitelistEntry | null> {
    try {
      const whitelistKey = KVStorageService.keys.userWhitelist(userId);
      return await KVStorageService.get<WhitelistEntry>(whitelistKey);
    } catch (error) {
      console.error(`Failed to get whitelist status for ${userId}:`, error);
      return null;
    }
  }

  /**
   * CAPTCHA integration for suspicious activity - Requirement 8.3: Create CAPTCHA integration
   */
  static async requiresCaptcha(userId: string, ipAddress?: string): Promise<CaptchaRequirement> {
    try {
      // Check user violation history
      const penaltyLevel = await RateLimitService.getUserPenaltyLevel(userId);
      
      // Check suspicious activity
      const suspiciousActivity = await RateLimitService.detectSuspiciousActivity(userId);
      
      // Check IP reputation if available
      let ipSuspicious = false;
      if (ipAddress) {
        const ipViolations = await RateLimitService.getIPViolationCount(ipAddress);
        ipSuspicious = ipViolations > 10;
      }
      
      const requiresCaptcha = penaltyLevel >= 2 || 
                             suspiciousActivity.isSuspicious || 
                             ipSuspicious;
      
      return {
        required: requiresCaptcha,
        reason: requiresCaptcha ? 
          `Suspicious activity detected: ${suspiciousActivity.flags.join(', ')}` : 
          'Normal activity',
        difficulty: penaltyLevel >= 4 ? 'hard' : 'normal'
      };
      
    } catch (error) {
      console.error(`Failed to check CAPTCHA requirement for ${userId}:`, error);
      return { required: false, reason: 'Check failed', difficulty: 'normal' };
    }
  }

  /**
   * Get IP violation count
   */
  private static async getIPViolationCount(ipAddress: string): Promise<number> {
    const ipViolationKey = KVStorageService.keys.ipViolations(ipAddress);
    const violations = await KVStorageService.get<IPViolations>(ipViolationKey);
    
    if (!violations) return 0;
    
    // Count violations in last 24 hours
    const recentViolations = violations.history.filter(
      v => v.timestamp > Date.now() - (24 * 60 * 60 * 1000)
    );
    
    return recentViolations.length;
  }

  /**
   * Get user-friendly rate limit message
   */
  static getRateLimitMessage(result: RateLimitResult, action: string): string {
    if (result.allowed) {
      return `${result.remaining} ${action}s remaining`;
    }

    const resetTime = new Date(result.resetTime);
    const now = new Date();
    const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / (60 * 1000));
    
    if (minutesUntilReset <= 1) {
      return `Rate limit exceeded. Try again in less than a minute.`;
    } else if (minutesUntilReset < 60) {
      return `Rate limit exceeded. Try again in ${minutesUntilReset} minutes.`;
    } else {
      const hoursUntilReset = Math.ceil(minutesUntilReset / 60);
      return `Rate limit exceeded. Try again in ${hoursUntilReset} hours.`;
    }
  }
}

/**
 * Supporting interfaces
 */
interface RateLimitData {
  minute: number[];
  hour: number[];
  day: number[];
}

interface UsageCounts {
  minute: number;
  hour: number;
  day: number;
}

interface RateLimitStatus {
  action: keyof typeof RateLimitService.LIMITS;
  limits: UsageCounts;
  usage: UsageCounts;
  remaining: UsageCounts;
  resetTimes: {
    minute: number;
    hour: number;
    day: number;
  };
  isLimited: boolean;
}

interface RateLimitStats {
  totalUsers: number;
  activeUsers: number;
  blockedRequests: number;
  allowedRequests: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  timestamp: number;
}

interface SuspiciousActivityResult {
  userId: string;
  suspicionScore: number; // 0-1
  flags: string[];
  isSuspicious: boolean;
  recommendation: 'allow' | 'monitor' | 'block';
  timestamp: number;
}

// Enhanced interfaces for abuse prevention
interface UserPenalty {
  userId: string;
  level: number;
  reason: string;
  appliedAt: number;
  expiresAt: number;
  multiplier: number;
}

interface UserViolations {
  userId: string;
  totalViolations: number;
  history: Array<{
    action: string;
    timestamp: number;
    type: 'rate_limit' | 'suspicious_activity' | 'manual';
  }>;
}

interface IPViolations {
  ipAddress: string;
  totalViolations: number;
  history: Array<{
    action: string;
    timestamp: number;
    userId?: string;
  }>;
}

interface WhitelistEntry {
  userId: string;
  level: keyof typeof RateLimitService.WHITELIST_MULTIPLIERS;
  reason: string;
  addedAt: number;
  addedBy: string;
}

interface CaptchaRequirement {
  required: boolean;
  reason: string;
  difficulty: 'normal' | 'hard';
}