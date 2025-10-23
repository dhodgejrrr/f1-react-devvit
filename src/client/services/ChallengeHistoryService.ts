import { ChallengeResult } from '../../shared/types/game.js';

/**
 * Challenge History Service
 * Manages local storage of challenge history and statistics
 */
/**
 * Challenge history entry
 */
interface ChallengeHistoryEntry {
  challengeId: string;
  type: 'created' | 'accepted' | 'completed';
  timestamp: string;
  result?: ChallengeResult;
  opponentName?: string;
  userTime?: number;
  opponentTime?: number;
  won?: boolean;
}

/**
 * Challenge statistics
 */
interface ChallengeStats {
  totalChallengesCreated: number;
  totalChallengesAccepted: number;
  totalChallengesCompleted: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  averageMargin: number;
  bestWinMargin: number;
  worstLossMargin: number;
  currentStreak: number;
  longestWinStreak: number;
}

export class ChallengeHistoryService {
  private static readonly STORAGE_KEY = 'f1-challenge-history';
  private static readonly MAX_HISTORY_ITEMS = 100;

  /**
   * Add a challenge history entry
   */
  static addHistoryEntry(entry: Omit<ChallengeHistoryEntry, 'timestamp'>): void {
    try {
      const history = this.getHistory();
      const newEntry: ChallengeHistoryEntry = {
        ...entry,
        timestamp: new Date().toISOString()
      };

      history.unshift(newEntry);

      // Keep only the most recent entries
      if (history.length > this.MAX_HISTORY_ITEMS) {
        history.splice(this.MAX_HISTORY_ITEMS);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save challenge history:', error);
    }
  }

  /**
   * Get challenge history
   */
  static getHistory(): ChallengeHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load challenge history:', error);
      return [];
    }
  }

  /**
   * Record challenge creation
   */
  static recordChallengeCreated(challengeId: string): void {
    this.addHistoryEntry({
      challengeId,
      type: 'created'
    });
  }

  /**
   * Record challenge acceptance
   */
  static recordChallengeAccepted(challengeId: string, opponentName: string): void {
    this.addHistoryEntry({
      challengeId,
      type: 'accepted',
      opponentName
    });
  }

  /**
   * Record challenge completion
   */
  static recordChallengeCompleted(
    challengeId: string,
    result: ChallengeResult,
    opponentName: string
  ): void {
    this.addHistoryEntry({
      challengeId,
      type: 'completed',
      result,
      opponentName,
      userTime: result.userTime,
      opponentTime: result.opponentTime,
      won: result.winner === 'user'
    });
  }

  /**
   * Get challenge statistics
   */
  static getStatistics(): ChallengeStats {
    const history = this.getHistory();
    const completedChallenges = history.filter(entry => entry.type === 'completed');
    
    const stats: ChallengeStats = {
      totalChallengesCreated: history.filter(entry => entry.type === 'created').length,
      totalChallengesAccepted: history.filter(entry => entry.type === 'accepted').length,
      totalChallengesCompleted: completedChallenges.length,
      wins: 0,
      losses: 0,
      ties: 0,
      winRate: 0,
      averageMargin: 0,
      bestWinMargin: 0,
      worstLossMargin: 0,
      currentStreak: 0,
      longestWinStreak: 0
    };

    if (completedChallenges.length === 0) {
      return stats;
    }

    // Calculate win/loss/tie counts
    let totalMargin = 0;
    let winMargins: number[] = [];
    let lossMargins: number[] = [];
    
    completedChallenges.forEach(entry => {
      if (entry.result) {
        const margin = entry.result.marginOfVictory;
        totalMargin += margin;

        if (entry.result.winner === 'user') {
          stats.wins++;
          winMargins.push(margin);
        } else if (entry.result.winner === 'opponent') {
          stats.losses++;
          lossMargins.push(margin);
        } else {
          stats.ties++;
        }
      }
    });

    // Calculate derived statistics
    stats.winRate = stats.wins / completedChallenges.length;
    stats.averageMargin = totalMargin / completedChallenges.length;
    stats.bestWinMargin = winMargins.length > 0 ? Math.max(...winMargins) : 0;
    stats.worstLossMargin = lossMargins.length > 0 ? Math.max(...lossMargins) : 0;

    // Calculate streaks
    const streaks = this.calculateStreaks(completedChallenges);
    stats.currentStreak = streaks.current;
    stats.longestWinStreak = streaks.longestWin;

    return stats;
  }

  /**
   * Calculate win/loss streaks
   */
  private static calculateStreaks(completedChallenges: ChallengeHistoryEntry[]): {
    current: number;
    longestWin: number;
  } {
    if (completedChallenges.length === 0) {
      return { current: 0, longestWin: 0 };
    }

    let currentStreak = 0;
    let longestWinStreak = 0;
    let currentWinStreak = 0;
    let lastResult: 'win' | 'loss' | 'tie' | null = null;

    // Process challenges in chronological order (reverse of storage order)
    const chronological = [...completedChallenges].reverse();

    chronological.forEach(entry => {
      if (!entry.result) return;

      const result = entry.result.winner === 'user' ? 'win' : 
                    entry.result.winner === 'opponent' ? 'loss' : 'tie';

      // Update current streak
      if (lastResult === null || lastResult === result) {
        currentStreak = result === 'win' ? currentStreak + 1 : 
                      result === 'loss' ? currentStreak - 1 : currentStreak;
      } else {
        currentStreak = result === 'win' ? 1 : result === 'loss' ? -1 : 0;
      }

      // Update win streak tracking
      if (result === 'win') {
        currentWinStreak++;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else {
        currentWinStreak = 0;
      }

      lastResult = result;
    });

    return {
      current: currentStreak,
      longestWin: longestWinStreak
    };
  }

  /**
   * Get recent challenges
   */
  static getRecentChallenges(limit: number = 10): ChallengeHistoryEntry[] {
    const history = this.getHistory();
    return history.slice(0, limit);
  }

  /**
   * Get challenges by type
   */
  static getChallengesByType(type: 'created' | 'accepted' | 'completed'): ChallengeHistoryEntry[] {
    const history = this.getHistory();
    return history.filter(entry => entry.type === type);
  }

  /**
   * Check if user has completed a specific challenge
   */
  static hasCompletedChallenge(challengeId: string): boolean {
    const history = this.getHistory();
    return history.some(entry => 
      entry.challengeId === challengeId && entry.type === 'completed'
    );
  }

  /**
   * Get performance trend (last N challenges)
   */
  static getPerformanceTrend(challengeCount: number = 10): {
    trend: 'improving' | 'declining' | 'stable';
    recentWinRate: number;
    previousWinRate: number;
    change: number;
  } {
    const completedChallenges = this.getChallengesByType('completed');
    
    if (completedChallenges.length < challengeCount * 2) {
      return {
        trend: 'stable',
        recentWinRate: 0,
        previousWinRate: 0,
        change: 0
      };
    }

    const recent = completedChallenges.slice(0, challengeCount);
    const previous = completedChallenges.slice(challengeCount, challengeCount * 2);

    const recentWins = recent.filter(entry => entry.won).length;
    const previousWins = previous.filter(entry => entry.won).length;

    const recentWinRate = recentWins / recent.length;
    const previousWinRate = previousWins / previous.length;
    const change = recentWinRate - previousWinRate;

    let trend: 'improving' | 'declining' | 'stable';
    if (Math.abs(change) < 0.1) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }

    return {
      trend,
      recentWinRate,
      previousWinRate,
      change
    };
  }

  /**
   * Clear all challenge history
   */
  static clearHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear challenge history:', error);
    }
  }

  /**
   * Export challenge history as JSON
   */
  static exportHistory(): string {
    const history = this.getHistory();
    const stats = this.getStatistics();
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0',
      statistics: stats,
      history: history
    }, null, 2);
  }

  /**
   * Import challenge history from JSON
   */
  static importHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.history && Array.isArray(data.history)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data.history));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import challenge history:', error);
      return false;
    }
  }

  /**
   * Get challenge history with pagination
   */
  static getHistoryPaginated(page: number = 1, pageSize: number = 10): {
    entries: ChallengeHistoryEntry[];
    totalPages: number;
    currentPage: number;
    totalEntries: number;
  } {
    const history = this.getHistory();
    const totalEntries = history.length;
    const totalPages = Math.ceil(totalEntries / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const entries = history.slice(startIndex, endIndex);

    return {
      entries,
      totalPages,
      currentPage: page,
      totalEntries
    };
  }

  /**
   * Search challenge history
   */
  static searchHistory(query: string): ChallengeHistoryEntry[] {
    const history = this.getHistory();
    const lowerQuery = query.toLowerCase();

    return history.filter(entry => 
      entry.challengeId.toLowerCase().includes(lowerQuery) ||
      entry.opponentName?.toLowerCase().includes(lowerQuery) ||
      entry.type.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get challenge history grouped by date
   */
  static getHistoryGroupedByDate(): { [date: string]: ChallengeHistoryEntry[] } {
    const history = this.getHistory();
    const grouped: { [date: string]: ChallengeHistoryEntry[] } = {};

    history.forEach(entry => {
      const date = new Date(entry.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });

    return grouped;
  }

  /**
   * Get recent activity summary
   */
  static getRecentActivitySummary(days: number = 7): {
    totalChallenges: number;
    wins: number;
    losses: number;
    ties: number;
    averageMargin: number;
    bestPerformance: ChallengeHistoryEntry | null;
    worstPerformance: ChallengeHistoryEntry | null;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentHistory = this.getHistory().filter(entry => 
      new Date(entry.timestamp) >= cutoffDate && entry.type === 'completed'
    );

    if (recentHistory.length === 0) {
      return {
        totalChallenges: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        averageMargin: 0,
        bestPerformance: null,
        worstPerformance: null
      };
    }

    let wins = 0;
    let losses = 0;
    let ties = 0;
    let totalMargin = 0;
    let bestPerformance: ChallengeHistoryEntry | null = null;
    let worstPerformance: ChallengeHistoryEntry | null = null;

    recentHistory.forEach(entry => {
      if (entry.result) {
        const margin = entry.result.marginOfVictory;
        totalMargin += margin;

        if (entry.result.winner === 'user') {
          wins++;
          if (!bestPerformance || margin > (bestPerformance.result?.marginOfVictory || 0)) {
            bestPerformance = entry;
          }
        } else if (entry.result.winner === 'opponent') {
          losses++;
          if (!worstPerformance || margin > (worstPerformance.result?.marginOfVictory || 0)) {
            worstPerformance = entry;
          }
        } else {
          ties++;
        }
      }
    });

    return {
      totalChallenges: recentHistory.length,
      wins,
      losses,
      ties,
      averageMargin: totalMargin / recentHistory.length,
      bestPerformance,
      worstPerformance
    };
  }

  /**
   * Get challenge statistics by opponent
   */
  static getStatsByOpponent(): { [opponent: string]: {
    totalChallenges: number;
    wins: number;
    losses: number;
    ties: number;
    winRate: number;
    averageMargin: number;
  }} {
    const history = this.getHistory().filter(entry => 
      entry.type === 'completed' && entry.opponentName
    );

    const statsByOpponent: { [opponent: string]: any } = {};

    history.forEach(entry => {
      const opponent = entry.opponentName!;
      
      if (!statsByOpponent[opponent]) {
        statsByOpponent[opponent] = {
          totalChallenges: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          winRate: 0,
          averageMargin: 0,
          totalMargin: 0
        };
      }

      const stats = statsByOpponent[opponent];
      stats.totalChallenges++;
      
      if (entry.result) {
        stats.totalMargin += entry.result.marginOfVictory;
        
        if (entry.result.winner === 'user') {
          stats.wins++;
        } else if (entry.result.winner === 'opponent') {
          stats.losses++;
        } else {
          stats.ties++;
        }
      }
    });

    // Calculate derived statistics
    Object.keys(statsByOpponent).forEach(opponent => {
      const stats = statsByOpponent[opponent];
      stats.winRate = stats.wins / stats.totalChallenges;
      stats.averageMargin = stats.totalMargin / stats.totalChallenges;
      delete stats.totalMargin; // Remove temporary field
    });

    return statsByOpponent;
  }
}