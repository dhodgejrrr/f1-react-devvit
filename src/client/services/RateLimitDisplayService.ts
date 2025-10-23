/**
 * Rate Limit Display Service for F1 Start Challenge
 * Handles client-side rate limiting information and user feedback
 * Requirement 8.3: Create rate limiting and abuse prevention
 */

export interface RateLimitStatus {
  action: string;
  limits: {
    minute: number;
    hour: number;
    day: number;
  };
  usage: {
    minute: number;
    hour: number;
    day: number;
  };
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
  resetTimes: {
    minute: number;
    hour: number;
    day: number;
  };
  isLimited: boolean;
}

export interface WhitelistStatus {
  status: {
    userId: string;
    level: 'verified' | 'moderator' | 'admin';
    reason: string;
    addedAt: number;
    addedBy: string;
  } | null;
  isWhitelisted: boolean;
}

export interface SuspiciousActivityResult {
  userId: string;
  suspicionScore: number;
  flags: string[];
  isSuspicious: boolean;
  recommendation: 'allow' | 'monitor' | 'block';
  timestamp: number;
}

export interface CaptchaRequirement {
  required: boolean;
  reason: string;
  difficulty: 'normal' | 'hard';
}

export class RateLimitDisplayService {
  private static readonly API_BASE = '/api';

  /**
   * Get current rate limit status for user
   */
  static async getRateLimitStatus(action: string = 'score_submission'): Promise<RateLimitStatus | null> {
    try {
      const response = await fetch(`${RateLimitDisplayService.API_BASE}/rate-limit/status?action=${action}`);
      
      if (!response.ok) {
        if (response.status === 400) {
          // Anonymous user - return null
          return null;
        }
        throw new Error(`Rate limit status request failed: ${response.status}`);
      }

      const data = await response.json();
      return data as RateLimitStatus;

    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return null;
    }
  }

  /**
   * Get user's whitelist status
   */
  static async getWhitelistStatus(): Promise<WhitelistStatus | null> {
    try {
      const response = await fetch(`${RateLimitDisplayService.API_BASE}/user/whitelist-status`);
      
      if (!response.ok) {
        if (response.status === 400) {
          // Anonymous user - return null
          return null;
        }
        throw new Error(`Whitelist status request failed: ${response.status}`);
      }

      const data = await response.json();
      return data as WhitelistStatus;

    } catch (error) {
      console.error('Failed to get whitelist status:', error);
      return null;
    }
  }

  /**
   * Check if CAPTCHA is required
   */
  static async getCaptchaRequirement(): Promise<CaptchaRequirement | null> {
    try {
      const response = await fetch(`${RateLimitDisplayService.API_BASE}/security/captcha-required`);
      
      if (!response.ok) {
        if (response.status === 400) {
          // Anonymous user - return null
          return null;
        }
        throw new Error(`CAPTCHA requirement check failed: ${response.status}`);
      }

      const data = await response.json();
      return data as CaptchaRequirement;

    } catch (error) {
      console.error('Failed to check CAPTCHA requirement:', error);
      return null;
    }
  }

  /**
   * Get suspicious activity detection results
   */
  static async getSuspiciousActivity(): Promise<SuspiciousActivityResult | null> {
    try {
      const response = await fetch(`${RateLimitDisplayService.API_BASE}/security/suspicious-activity`);
      
      if (!response.ok) {
        if (response.status === 400) {
          // Anonymous user - return null
          return null;
        }
        throw new Error(`Suspicious activity check failed: ${response.status}`);
      }

      const data = await response.json();
      return data as SuspiciousActivityResult;

    } catch (error) {
      console.error('Failed to get suspicious activity data:', error);
      return null;
    }
  }

  /**
   * Format rate limit message for user display
   */
  static formatRateLimitMessage(status: RateLimitStatus): string {
    if (!status.isLimited) {
      const minRemaining = Math.min(
        status.remaining.minute,
        status.remaining.hour,
        status.remaining.day
      );
      return `${minRemaining} ${status.action}s remaining`;
    }

    // Find the most restrictive limit
    const now = Date.now();
    let shortestResetTime = Infinity;

    if (status.remaining.minute === 0) {
      shortestResetTime = Math.min(shortestResetTime, status.resetTimes.minute);
    }
    if (status.remaining.hour === 0) {
      const hourResetTime = status.resetTimes.hour;
      if (hourResetTime < shortestResetTime) {
        shortestResetTime = hourResetTime;
      }
    }
    if (status.remaining.day === 0) {
      const dayResetTime = status.resetTimes.day;
      if (dayResetTime < shortestResetTime) {
        shortestResetTime = dayResetTime;
      }
    }

    const minutesUntilReset = Math.ceil((shortestResetTime - now) / (60 * 1000));
    
    if (minutesUntilReset <= 1) {
      return 'Rate limit exceeded. Try again in less than a minute.';
    } else if (minutesUntilReset < 60) {
      return `Rate limit exceeded. Try again in ${minutesUntilReset} minutes.`;
    } else {
      const hoursUntilReset = Math.ceil(minutesUntilReset / 60);
      return `Rate limit exceeded. Try again in ${hoursUntilReset} hours.`;
    }
  }

  /**
   * Format whitelist status for user display
   */
  static formatWhitelistMessage(status: WhitelistStatus): string {
    if (!status.isWhitelisted || !status.status) {
      return 'Standard rate limits apply';
    }

    const levelNames = {
      verified: 'Verified User',
      moderator: 'Moderator',
      admin: 'Administrator'
    };

    const levelName = levelNames[status.status.level] || 'Special User';
    return `${levelName} - Enhanced rate limits active`;
  }

  /**
   * Format suspicious activity warning
   */
  static formatSuspiciousActivityWarning(activity: SuspiciousActivityResult): string | null {
    if (!activity.isSuspicious) {
      return null;
    }

    const scorePercent = Math.round(activity.suspicionScore * 100);
    
    if (activity.recommendation === 'block') {
      return `⚠️ High suspicious activity detected (${scorePercent}%). Additional verification may be required.`;
    } else if (activity.recommendation === 'monitor') {
      return `⚠️ Unusual activity patterns detected (${scorePercent}%). Please play normally to avoid restrictions.`;
    }

    return null;
  }

  /**
   * Format CAPTCHA requirement message
   */
  static formatCaptchaMessage(requirement: CaptchaRequirement): string | null {
    if (!requirement.required) {
      return null;
    }

    const difficultyText = requirement.difficulty === 'hard' ? 'enhanced ' : '';
    return `🔒 ${difficultyText.toUpperCase()}CAPTCHA verification required: ${requirement.reason}`;
  }

  /**
   * Get comprehensive rate limiting info for display
   */
  static async getComprehensiveStatus(): Promise<{
    rateLimit: RateLimitStatus | null;
    whitelist: WhitelistStatus | null;
    suspicious: SuspiciousActivityResult | null;
    captcha: CaptchaRequirement | null;
    messages: {
      rateLimit?: string;
      whitelist?: string;
      suspicious?: string;
      captcha?: string;
    };
  }> {
    try {
      const [rateLimit, whitelist, suspicious, captcha] = await Promise.all([
        RateLimitDisplayService.getRateLimitStatus(),
        RateLimitDisplayService.getWhitelistStatus(),
        RateLimitDisplayService.getSuspiciousActivity(),
        RateLimitDisplayService.getCaptchaRequirement()
      ]);

      const messages: any = {};

      if (rateLimit) {
        messages.rateLimit = RateLimitDisplayService.formatRateLimitMessage(rateLimit);
      }

      if (whitelist) {
        messages.whitelist = RateLimitDisplayService.formatWhitelistMessage(whitelist);
      }

      if (suspicious) {
        const suspiciousMessage = RateLimitDisplayService.formatSuspiciousActivityWarning(suspicious);
        if (suspiciousMessage) {
          messages.suspicious = suspiciousMessage;
        }
      }

      if (captcha) {
        const captchaMessage = RateLimitDisplayService.formatCaptchaMessage(captcha);
        if (captchaMessage) {
          messages.captcha = captchaMessage;
        }
      }

      return {
        rateLimit,
        whitelist,
        suspicious,
        captcha,
        messages
      };

    } catch (error) {
      console.error('Failed to get comprehensive rate limiting status:', error);
      return {
        rateLimit: null,
        whitelist: null,
        suspicious: null,
        captcha: null,
        messages: {}
      };
    }
  }

  /**
   * Check if user can perform action based on rate limits
   */
  static canPerformAction(status: RateLimitStatus | null): {
    allowed: boolean;
    reason?: string;
  } {
    if (!status) {
      // Anonymous users or error state - allow with caution
      return { allowed: true };
    }

    if (status.isLimited) {
      return {
        allowed: false,
        reason: RateLimitDisplayService.formatRateLimitMessage(status)
      };
    }

    return { allowed: true };
  }

  /**
   * Get rate limit progress percentage (0-100)
   */
  static getRateLimitProgress(status: RateLimitStatus | null): {
    minute: number;
    hour: number;
    day: number;
  } {
    if (!status) {
      return { minute: 0, hour: 0, day: 0 };
    }

    return {
      minute: Math.round((status.usage.minute / status.limits.minute) * 100),
      hour: Math.round((status.usage.hour / status.limits.hour) * 100),
      day: Math.round((status.usage.day / status.limits.day) * 100)
    };
  }

  /**
   * Get time until rate limit resets (in minutes)
   */
  static getTimeUntilReset(status: RateLimitStatus | null): {
    minute: number;
    hour: number;
    day: number;
  } {
    if (!status) {
      return { minute: 0, hour: 0, day: 0 };
    }

    const now = Date.now();
    
    return {
      minute: Math.max(0, Math.ceil((status.resetTimes.minute - now) / (60 * 1000))),
      hour: Math.max(0, Math.ceil((status.resetTimes.hour - now) / (60 * 1000))),
      day: Math.max(0, Math.ceil((status.resetTimes.day - now) / (60 * 1000)))
    };
  }
}