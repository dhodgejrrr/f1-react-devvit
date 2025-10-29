import { KVStorageService } from './KVStorageService.js';
// import { DataMigrationService } from './DataMigrationService.js'; // Commented out to avoid unused import
import type { 
  LeaderboardEntry, 
  LeaderboardScope, 
  TimeFilter,
  ValidationResult 
} from '../../shared/types/index.js';

/**
 * Leaderboard Service for managing game scores and rankings
 * Implements CRUD operations with atomic updates and automatic pruning
 */
export class LeaderboardService {
  private static readonly MAX_ENTRIES_PER_BOARD = 100;
  private static readonly LEADERBOARD_TTL = 30 * 24 * 60 * 60; // 30 days

  /**
   * Submit a score to the leaderboard
   */
  static async submitScore(entry: LeaderboardEntry): Promise<SubmissionResult> {
    try {
      // Validate the entry first
      const validation = LeaderboardService.validateSubmission(entry);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'VALIDATION_FAILED',
          message: `Submission validation failed: ${validation.flags.join(', ')}`,
          entry: null
        };
      }

      const leaderboardKey = KVStorageService.keys.leaderboard(entry.scope, entry.period);
      
      // Use atomic update to safely modify leaderboard
      const updatedLeaderboard = await KVStorageService.atomicUpdate<LeaderboardData>(
        leaderboardKey,
        (current) => {
          const leaderboard = current || { entries: [], lastUpdated: new Date().toISOString() };
          
          // Add new entry
          leaderboard.entries.push(entry);
          
          // Sort by reaction time (ascending - faster is better)
          leaderboard.entries.sort((a, b) => a.reactionTime - b.reactionTime);
          
          // Prune to top 100 entries
          if (leaderboard.entries.length > LeaderboardService.MAX_ENTRIES_PER_BOARD) {
            leaderboard.entries = leaderboard.entries.slice(0, LeaderboardService.MAX_ENTRIES_PER_BOARD);
          }
          
          leaderboard.lastUpdated = new Date().toISOString();
          return leaderboard;
        },
        LeaderboardService.LEADERBOARD_TTL
      );

      // Find the user's rank in the updated leaderboard
      const userRank = updatedLeaderboard.entries.findIndex(e => 
        e.userId === entry.userId && e.timestamp === entry.timestamp
      ) + 1;

      return {
        success: true,
        entry,
        rank: userRank > 0 ? userRank : null,
        totalEntries: updatedLeaderboard.entries.length
      };

    } catch (error) {
      console.error('Failed to submit score:', error);
      return {
        success: false,
        error: 'SUBMISSION_FAILED',
        message: 'Failed to submit score to leaderboard',
        entry: null
      };
    }
  }

  /**
   * Get leaderboard entries with filtering
   */
  static async getLeaderboard(
    scope: LeaderboardScope, 
    filter: TimeFilter,
    limit: number = 25
  ): Promise<LeaderboardEntry[]> {
    try {
      const leaderboardKey = KVStorageService.keys.leaderboard(scope, filter);
      const leaderboard = await KVStorageService.get<LeaderboardData>(leaderboardKey);
      
      if (!leaderboard) {
        return [];
      }

      // Filter by time period if needed
      const filteredEntries = LeaderboardService.filterByTimePeriod(leaderboard.entries, filter);
      
      // Return top entries up to limit
      return filteredEntries.slice(0, limit);

    } catch (error) {
      console.error(`Failed to get leaderboard for ${scope}:${filter}:`, error);
      return [];
    }
  }

  /**
   * Get user's rank in a specific leaderboard
   */
  static async getUserRank(
    userId: string, 
    scope: LeaderboardScope, 
    filter: TimeFilter
  ): Promise<number | null> {
    try {
      const entries = await LeaderboardService.getLeaderboard(scope, filter);
      const userEntry = entries.find(entry => entry.userId === userId);
      
      if (!userEntry) {
        return null;
      }

      return entries.findIndex(entry => entry.userId === userId) + 1;

    } catch (error) {
      console.error(`Failed to get user rank for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get user's personal best score
   */
  static async getUserPersonalBest(
    userId: string, 
    scope: LeaderboardScope
  ): Promise<LeaderboardEntry | null> {
    try {
      // Check all time periods for user's best score
      const timeFilters: TimeFilter[] = ['daily', 'weekly', 'alltime'];
      let personalBest: LeaderboardEntry | null = null;

      for (const filter of timeFilters) {
        const entries = await LeaderboardService.getLeaderboard(scope, filter);
        const userEntries = entries.filter(entry => entry.userId === userId);
        
        if (userEntries.length > 0) {
          const bestInPeriod = userEntries.reduce((best, current) => 
            current.reactionTime < best.reactionTime ? current : best
          );
          
          if (!personalBest || bestInPeriod.reactionTime < personalBest.reactionTime) {
            personalBest = bestInPeriod;
          }
        }
      }

      return personalBest;

    } catch (error) {
      console.error(`Failed to get personal best for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get leaderboard statistics
   */
  static async getLeaderboardStats(
    scope: LeaderboardScope, 
    filter: TimeFilter
  ): Promise<LeaderboardStats> {
    try {
      const entries = await LeaderboardService.getLeaderboard(scope, filter);
      
      if (entries.length === 0) {
        return {
          totalEntries: 0,
          averageTime: 0,
          bestTime: 0,
          worstTime: 0,
          medianTime: 0
        };
      }

      const times = entries.map(entry => entry.reactionTime).sort((a, b) => a - b);
      const sum = times.reduce((acc, time) => acc + time, 0);
      
      return {
        totalEntries: entries.length,
        averageTime: sum / entries.length,
        bestTime: times[0] || 0,
        worstTime: times[times.length - 1] || 0,
        medianTime: times[Math.floor(times.length / 2)] || 0
      };

    } catch (error) {
      console.error(`Failed to get leaderboard stats for ${scope}:${filter}:`, error);
      return {
        totalEntries: 0,
        averageTime: 0,
        bestTime: 0,
        worstTime: 0,
        medianTime: 0
      };
    }
  }

  /**
   * Calculate user's percentile ranking with statistical methods
   */
  static async getUserPercentile(
    userId: string,
    reactionTime: number,
    scope: LeaderboardScope,
    filter: TimeFilter
  ): Promise<number> {
    try {
      const entries = await LeaderboardService.getLeaderboard(scope, filter);
      
      if (entries.length === 0) {
        return 100; // User is the only one, so 100th percentile
      }

      if (entries.length === 1) {
        return 100; // Only user in leaderboard
      }

      // Use linear interpolation for more accurate percentile calculation
      const sortedTimes = entries.map(entry => entry.reactionTime).sort((a, b) => a - b);
      const betterCount = sortedTimes.filter(time => time < reactionTime).length;
      const equalCount = sortedTimes.filter(time => time === reactionTime).length;
      
      // Calculate percentile using the formula: (betterCount + 0.5 * equalCount) / totalCount * 100
      const percentile = ((betterCount + 0.5 * equalCount) / entries.length) * 100;
      
      return Math.round(Math.max(1, Math.min(100, percentile)));

    } catch (error) {
      console.error(`Failed to calculate percentile for ${userId}:`, error);
      return 50; // Default to median
    }
  }

  /**
   * Get detailed ranking information for a user
   */
  static async getUserRankingDetails(
    userId: string,
    scope: LeaderboardScope,
    filter: TimeFilter
  ): Promise<UserRankingDetails | null> {
    try {
      const entries = await LeaderboardService.getLeaderboard(scope, filter);
      const userEntryIndex = entries.findIndex(entry => entry.userId === userId);
      const userEntry = entries[userEntryIndex];
      
      if (!userEntry || userEntryIndex === -1) {
        return null;
      }

      const rank = userEntryIndex + 1;
      const percentile = await LeaderboardService.getUserPercentile(userId, userEntry.reactionTime, scope, filter);
      
      // Calculate improvement metrics
      const userEntries = entries.filter(entry => entry.userId === userId);
      const improvementRate = userEntries.length > 0 ? LeaderboardService.calculateImprovementRate(userEntries) : 0;
      
      // Find nearby competitors
      const nearbyCompetitors = entries.length > 0 ? LeaderboardService.getNearbyCompetitors(entries, rank) : [];
      
      return {
        rank,
        percentile,
        totalPlayers: entries.length,
        reactionTime: userEntry.reactionTime,
        improvementRate,
        nearbyCompetitors,
        isTopTen: rank <= 10,
        isTopPercent: percentile >= 99
      };

    } catch (error) {
      console.error(`Failed to get ranking details for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Calculate improvement rate based on user's historical performance
   */
  private static calculateImprovementRate(userEntries: LeaderboardEntry[]): number {
    if (userEntries.length < 2) return 0;

    // Sort by timestamp to get chronological order
    const sortedEntries = userEntries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstEntry = sortedEntries[0];
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    
    if (!firstEntry || !lastEntry) return 0;

    const firstTime = firstEntry.reactionTime;
    const lastTime = lastEntry.reactionTime;
    
    // Calculate percentage improvement (negative means faster times)
    const improvement = ((firstTime - lastTime) / firstTime) * 100;
    
    return Math.round(improvement * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get nearby competitors for ranking context
   */
  private static getNearbyCompetitors(
    entries: LeaderboardEntry[], 
    userRank: number
  ): NearbyCompetitor[] {
    const competitors: NearbyCompetitor[] = [];
    const startIndex = Math.max(0, userRank - 3); // 2 above
    const endIndex = Math.min(entries.length, userRank + 2); // 2 below
    
    for (let i = startIndex; i < endIndex; i++) {
      const entry = entries[i];
      const rank = i + 1;
      
      if (rank !== userRank && entry) { // Exclude the user themselves and ensure entry exists
        const userEntry = entries[userRank - 1];
        if (userEntry && entry) {
          competitors.push({
            rank,
            username: entry.username,
            reactionTime: entry.reactionTime,
            timeDifference: entry.reactionTime - userEntry.reactionTime
          });
        }
      }
    }
    
    return competitors;
  }

  /**
   * Get community comparison messaging
   */
  static async getCommunityComparison(
    reactionTime: number,
    scope: LeaderboardScope,
    filter: TimeFilter
  ): Promise<CommunityComparison> {
    try {
      const stats = await LeaderboardService.getLeaderboardStats(scope, filter);
      
      if (stats.totalEntries === 0) {
        return {
          message: "BE THE FIRST TO SET A TIME!",
          icon: "🏁",
          color: "color-yellow",
          category: "first"
        };
      }

      const percentile = await LeaderboardService.getUserPercentile('temp', reactionTime, scope, filter);
      
      // Generate contextual messages based on performance
      if (percentile >= 99) {
        return {
          message: "ELITE PERFORMANCE! TOP 1%",
          icon: "👑",
          color: "color-gold",
          category: "elite"
        };
      } else if (percentile >= 95) {
        return {
          message: "EXCEPTIONAL! TOP 5%",
          icon: "⭐",
          color: "color-gold",
          category: "exceptional"
        };
      } else if (percentile >= 90) {
        return {
          message: "EXCELLENT! TOP 10%",
          icon: "🔥",
          color: "color-green",
          category: "excellent"
        };
      } else if (percentile >= 75) {
        return {
          message: "ABOVE AVERAGE! TOP 25%",
          icon: "📈",
          color: "color-green",
          category: "above_average"
        };
      } else if (percentile >= 50) {
        return {
          message: "SOLID PERFORMANCE!",
          icon: "👍",
          color: "color-yellow",
          category: "average"
        };
      } else if (percentile >= 25) {
        return {
          message: "ROOM FOR IMPROVEMENT",
          icon: "💪",
          color: "color-white",
          category: "below_average"
        };
      } else {
        return {
          message: "KEEP PRACTICING!",
          icon: "🎯",
          color: "color-white",
          category: "needs_practice"
        };
      }

    } catch (error) {
      console.error('Failed to get community comparison:', error);
      return {
        message: "PERFORMANCE RECORDED",
        icon: "📊",
        color: "color-white",
        category: "unknown"
      };
    }
  }

  /**
   * Track rank changes for notifications
   */
  static async trackRankChange(
    oldRank: number | null,
    newRank: number
  ): Promise<RankChangeNotification | null> {
    try {
      if (oldRank === null) {
        return {
          type: 'first_rank',
          message: `WELCOME TO THE LEADERBOARD! RANK #${newRank}`,
          icon: '🎉',
          color: 'color-green'
        };
      }

      const rankDifference = oldRank - newRank; // Positive means improvement
      
      if (rankDifference > 0) {
        if (newRank <= 10 && oldRank > 10) {
          return {
            type: 'top_ten',
            message: `TOP 10! CLIMBED ${rankDifference} RANKS TO #${newRank}`,
            icon: '🏆',
            color: 'color-gold'
          };
        } else if (rankDifference >= 10) {
          return {
            type: 'major_improvement',
            message: `GREAT IMPROVEMENT! UP ${rankDifference} RANKS TO #${newRank}`,
            icon: '🚀',
            color: 'color-green'
          };
        } else if (rankDifference >= 5) {
          return {
            type: 'improvement',
            message: `CLIMBING UP! +${rankDifference} RANKS TO #${newRank}`,
            icon: '📈',
            color: 'color-yellow'
          };
        }
      } else if (rankDifference < -5) {
        return {
          type: 'decline',
          message: `DROPPED ${Math.abs(rankDifference)} RANKS TO #${newRank}`,
          icon: '📉',
          color: 'color-white'
        };
      }

      return null; // No significant change

    } catch (error) {
      console.error('Failed to track rank change:', error);
      return null;
    }
  }

  /**
   * Remove flagged or invalid entries
   */
  static async removeEntry(
    userId: string, 
    timestamp: string, 
    scope: LeaderboardScope, 
    filter: TimeFilter
  ): Promise<boolean> {
    try {
      const leaderboardKey = KVStorageService.keys.leaderboard(scope, filter);
      
      await KVStorageService.atomicUpdate<LeaderboardData>(
        leaderboardKey,
        (current) => {
          if (!current) return { entries: [], lastUpdated: new Date().toISOString() };
          
          current.entries = current.entries.filter(entry => 
            !(entry.userId === userId && entry.timestamp === timestamp)
          );
          
          current.lastUpdated = new Date().toISOString();
          return current;
        }
      );

      return true;

    } catch (error) {
      console.error(`Failed to remove entry for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Validate a leaderboard submission
   */
  static validateSubmission(entry: LeaderboardEntry): ValidationResult {
    const flags: string[] = [];
    let confidence = 1.0;

    // Check reaction time bounds
    if (entry.reactionTime < 80) {
      flags.push('IMPOSSIBLY_FAST');
      confidence = 0;
    } else if (entry.reactionTime < 120) {
      flags.push('SUSPICIOUSLY_FAST');
      confidence = 0.3;
    }

    if (entry.reactionTime > 2000) {
      flags.push('UNUSUALLY_SLOW');
      confidence = 0.8;
    }

    // Check timestamp validity
    const submissionTime = new Date(entry.timestamp);
    const now = new Date();
    const timeDiff = now.getTime() - submissionTime.getTime();
    
    if (timeDiff < 0) {
      flags.push('FUTURE_TIMESTAMP');
      confidence = 0;
    } else if (timeDiff > 60000) { // More than 1 minute old
      flags.push('STALE_SUBMISSION');
      confidence = 0.7;
    }

    // Check required fields
    if (!entry.userId || !entry.username || !entry.scope) {
      flags.push('MISSING_REQUIRED_FIELDS');
      confidence = 0;
    }

    const isValid = confidence > 0.5 && !flags.includes('IMPOSSIBLY_FAST') && !flags.includes('FUTURE_TIMESTAMP');
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
   * Filter entries by time period
   */
  private static filterByTimePeriod(entries: LeaderboardEntry[], filter: TimeFilter): LeaderboardEntry[] {
    if (filter === 'alltime') {
      return entries;
    }

    const now = new Date();
    const cutoffTime = new Date();

    switch (filter) {
      case 'daily':
        cutoffTime.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        cutoffTime.setDate(now.getDate() - 7);
        break;
    }

    return entries.filter(entry => new Date(entry.timestamp) >= cutoffTime);
  }

  /**
   * Check for duplicate submissions to prevent spam
   */
  static async checkDuplicateSubmission(
    userId: string,
    reactionTime: number,
    scope: LeaderboardScope,
    period: TimeFilter,
    timeWindowMs: number = 10000 // 10 seconds - longer window for checking recent submissions
  ): Promise<DuplicateCheckResult> {
    try {
      const entries = await LeaderboardService.getLeaderboard(scope, period, 50); // Check recent entries
      const now = Date.now();
      
      // Find recent submissions from the same user
      const recentSubmissions = entries.filter(entry => {
        if (entry.userId !== userId) return false;
        
        const submissionTime = new Date(entry.timestamp).getTime();
        const timeDiff = now - submissionTime;
        
        return timeDiff <= timeWindowMs;
      });

      // Check for exact or suspiciously similar reaction times
      const duplicates = recentSubmissions.filter(entry => {
        const timeDiff = Math.abs(entry.reactionTime - reactionTime);
        const submissionTime = new Date(entry.timestamp).getTime();
        const timeGap = now - submissionTime;
        
        // Exact match within 1ms and submitted within 2 seconds = likely duplicate
        if (timeDiff <= 1 && timeGap <= 2000) {
          return true;
        }
        
        // Very similar times (within 3ms) submitted very quickly (within 500ms) = suspicious
        if (timeDiff <= 3 && timeGap <= 500) {
          return true;
        }
        
        return false;
      });

      if (duplicates.length > 0) {
        return {
          isDuplicate: true,
          existingEntry: duplicates[0] || null,
          message: 'Similar score submitted recently'
        };
      }

      // Check for rapid successive submissions (potential automation)
      // Allow more submissions but with a shorter time window for automation detection
      const veryRecentSubmissions = recentSubmissions.filter(entry => {
        const submissionTime = new Date(entry.timestamp).getTime();
        const timeDiff = now - submissionTime;
        return timeDiff <= 1000; // Only check last 1 second for automation
      });

      if (veryRecentSubmissions.length >= 2) {
        return {
          isDuplicate: true,
          existingEntry: veryRecentSubmissions[0] || null,
          message: 'Submissions too rapid - please wait a moment between games'
        };
      }

      return {
        isDuplicate: false,
        existingEntry: null,
        message: 'No duplicate found'
      };

    } catch (error) {
      console.error(`Failed to check duplicate submission for ${userId}:`, error);
      // On error, allow submission to avoid blocking legitimate users
      return {
        isDuplicate: false,
        existingEntry: null,
        message: 'Duplicate check failed, allowing submission'
      };
    }
  }

  /**
   * Get achievement status for a user
   */
  static async getUserAchievements(
    userId: string,
    scope: LeaderboardScope,
    filter: TimeFilter
  ): Promise<Achievement[]> {
    try {
      const achievements: Achievement[] = [];
      const rankingDetails = await LeaderboardService.getUserRankingDetails(userId, scope, filter);
      
      if (!rankingDetails) return achievements;

      // Top performer achievements
      if (rankingDetails.rank === 1) {
        achievements.push({
          id: 'champion',
          name: 'CHAMPION',
          description: 'Reached #1 on the leaderboard',
          icon: '👑',
          color: 'color-gold',
          unlockedAt: new Date().toISOString()
        });
      } else if (rankingDetails.isTopTen) {
        achievements.push({
          id: 'top_ten',
          name: 'TOP TEN',
          description: 'Reached top 10 on the leaderboard',
          icon: '🏆',
          color: 'color-gold',
          unlockedAt: new Date().toISOString()
        });
      }

      // Percentile achievements
      if (rankingDetails.isTopPercent) {
        achievements.push({
          id: 'elite',
          name: 'ELITE PLAYER',
          description: 'Top 1% performance',
          icon: '⭐',
          color: 'color-gold',
          unlockedAt: new Date().toISOString()
        });
      } else if (rankingDetails.percentile >= 95) {
        achievements.push({
          id: 'exceptional',
          name: 'EXCEPTIONAL',
          description: 'Top 5% performance',
          icon: '🔥',
          color: 'color-green',
          unlockedAt: new Date().toISOString()
        });
      }

      // Improvement achievements
      if (rankingDetails.improvementRate >= 20) {
        achievements.push({
          id: 'rapid_improvement',
          name: 'RAPID IMPROVEMENT',
          description: '20%+ improvement in reaction time',
          icon: '🚀',
          color: 'color-green',
          unlockedAt: new Date().toISOString()
        });
      }

      return achievements;

    } catch (error) {
      console.error(`Failed to get achievements for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Calculate detailed performance metrics
   */
  static async getPerformanceMetrics(
    userId: string,
    scope: LeaderboardScope,
    filter: TimeFilter
  ): Promise<PerformanceMetrics | null> {
    try {
      const entries = await LeaderboardService.getLeaderboard(scope, filter);
      const userEntries = entries.filter(entry => entry.userId === userId);
      
      if (userEntries.length === 0) return null;

      const reactionTimes = userEntries.map(entry => entry.reactionTime);
      const bestTime = Math.min(...reactionTimes);
      const worstTime = Math.max(...reactionTimes);
      const averageTime = reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length;
      
      // Calculate consistency (lower standard deviation = more consistent)
      const variance = reactionTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / reactionTimes.length;
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = Math.max(0, 100 - (standardDeviation / averageTime) * 100);

      // Calculate improvement trend
      const sortedByTime = userEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const recentEntries = sortedByTime.slice(-5); // Last 5 games
      const earlyEntries = sortedByTime.slice(0, 5); // First 5 games
      
      const recentAverage = recentEntries.reduce((sum, entry) => sum + entry.reactionTime, 0) / recentEntries.length;
      const earlyAverage = earlyEntries.reduce((sum, entry) => sum + entry.reactionTime, 0) / earlyEntries.length;
      const improvementTrend = ((earlyAverage - recentAverage) / earlyAverage) * 100;

      return {
        bestTime,
        worstTime,
        averageTime: Math.round(averageTime),
        consistencyScore: Math.round(consistencyScore),
        improvementTrend: Math.round(improvementTrend * 100) / 100,
        totalGames: userEntries.length,
        recentForm: Math.round(recentAverage)
      };

    } catch (error) {
      console.error(`Failed to get performance metrics for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get competitive analysis comparing user to similar-ranked players
   */
  static async getCompetitiveAnalysis(
    userId: string,
    scope: LeaderboardScope,
    filter: TimeFilter
  ): Promise<CompetitiveAnalysis | null> {
    try {
      const rankingDetails = await LeaderboardService.getUserRankingDetails(userId, scope, filter);
      if (!rankingDetails) return null;

      const entries = await LeaderboardService.getLeaderboard(scope, filter);
      const userRank = rankingDetails.rank;
      
      // Get players within ±10 ranks
      const startRank = Math.max(1, userRank - 10);
      const endRank = Math.min(entries.length, userRank + 10);
      const competitorRange = entries.slice(startRank - 1, endRank);
      
      const competitorTimes = competitorRange.map(entry => entry.reactionTime);
      const averageCompetitorTime = competitorTimes.reduce((sum, time) => sum + time, 0) / competitorTimes.length;
      
      const userTime = rankingDetails.reactionTime;
      const timeGapToNext = userRank > 1 ? userTime - entries[userRank - 2].reactionTime : 0;
      const timeGapFromPrevious = userRank < entries.length ? entries[userRank].reactionTime - userTime : 0;

      return {
        userRank,
        totalPlayers: entries.length,
        timeToNextRank: Math.abs(timeGapToNext),
        timeFromPreviousRank: timeGapFromPrevious,
        averageInRange: Math.round(averageCompetitorTime),
        performanceVsRange: userTime < averageCompetitorTime ? 'above' : 'below',
        ranksToTopTen: Math.max(0, userRank - 10),
        ranksToTopPercent: Math.max(0, userRank - Math.ceil(entries.length * 0.01))
      };

    } catch (error) {
      console.error(`Failed to get competitive analysis for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Cleanup old entries (maintenance function)
   */
  static async cleanupOldEntries(): Promise<number> {
    try {
      // This would be called periodically to clean up old daily/weekly entries
      // Implementation depends on available Redis operations in Devvit
      console.log('Cleanup old entries requested');
      return 0;
    } catch (error) {
      console.error('Failed to cleanup old entries:', error);
      return 0;
    }
  }
}

/**
 * Supporting interfaces
 */
interface LeaderboardData {
  entries: LeaderboardEntry[];
  lastUpdated: string;
}

interface LeaderboardStats {
  totalEntries: number;
  averageTime: number;
  bestTime: number;
  worstTime: number;
  medianTime: number;
}

interface SubmissionResult {
  success: boolean;
  entry: LeaderboardEntry | null;
  rank?: number | null;
  totalEntries?: number;
  error?: string;
  message?: string;
}

interface UserRankingDetails {
  rank: number;
  percentile: number;
  totalPlayers: number;
  reactionTime: number;
  improvementRate: number;
  nearbyCompetitors: NearbyCompetitor[];
  isTopTen: boolean;
  isTopPercent: boolean;
}

interface NearbyCompetitor {
  rank: number;
  username: string;
  reactionTime: number;
  timeDifference: number; // Difference from user's time
}

interface CommunityComparison {
  message: string;
  icon: string;
  color: string;
  category: 'first' | 'elite' | 'exceptional' | 'excellent' | 'above_average' | 'average' | 'below_average' | 'needs_practice' | 'unknown';
}

interface RankChangeNotification {
  type: 'first_rank' | 'top_ten' | 'major_improvement' | 'improvement' | 'decline';
  message: string;
  icon: string;
  color: string;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingEntry: LeaderboardEntry | null;
  message: string;
}

interface UserRankingDetails {
  rank: number;
  percentile: number;
  totalPlayers: number;
  reactionTime: number;
  improvementRate: number;
  nearbyCompetitors: NearbyCompetitor[];
  isTopTen: boolean;
  isTopPercent: boolean;
}

interface NearbyCompetitor {
  rank: number;
  username: string;
  reactionTime: number;
  timeDifference: number; // Difference from user's time
}

interface CommunityComparison {
  message: string;
  icon: string;
  color: string;
  category: 'first' | 'elite' | 'exceptional' | 'excellent' | 'above_average' | 'average' | 'below_average' | 'needs_practice' | 'unknown';
}

interface RankChangeNotification {
  type: 'first_rank' | 'top_ten' | 'major_improvement' | 'improvement' | 'decline';
  message: string;
  icon: string;
  color: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt: string;
}

interface PerformanceMetrics {
  bestTime: number;
  worstTime: number;
  averageTime: number;
  consistencyScore: number; // 0-100, higher is more consistent
  improvementTrend: number; // Percentage improvement over time
  totalGames: number;
  recentForm: number; // Average of last 5 games
}

interface CompetitiveAnalysis {
  userRank: number;
  totalPlayers: number;
  timeToNextRank: number; // Milliseconds needed to improve one rank
  timeFromPreviousRank: number; // Milliseconds gap from player below
  averageInRange: number; // Average time of players within ±10 ranks
  performanceVsRange: 'above' | 'below'; // Performance vs similar-ranked players
  ranksToTopTen: number;
  ranksToTopPercent: number;
}