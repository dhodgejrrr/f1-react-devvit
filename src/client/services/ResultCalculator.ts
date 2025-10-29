import { GameResult, F1Driver, DriverComparison } from '../types/index.js';

/**
 * Result Calculator Service
 * 
 * Handles reaction time calculation, rating assignment, and driver comparisons
 * Implements the rating system and community percentile calculations
 */

export type RatingType = 'perfect' | 'excellent' | 'good' | 'fair' | 'slow' | 'false_start';

export interface RatingThresholds {
  perfect: number;    // < 200ms
  excellent: number;  // 200-300ms
  good: number;       // 300-400ms
  fair: number;       // 400-500ms
  // slow: 500ms+
}

export interface RatingConfig {
  thresholds: RatingThresholds;
  colors: Record<RatingType, string>;
  messages: Record<RatingType, string>;
  icons: Record<RatingType, string>;
}

// Default rating configuration
const DEFAULT_RATING_CONFIG: RatingConfig = {
  thresholds: {
    perfect: 200,
    excellent: 300,
    good: 400,
    fair: 500,
  },
  colors: {
    perfect: '#FFD700',    // Gold
    excellent: '#00FF00',  // Green
    good: '#0080FF',       // Blue
    fair: '#FFA500',       // Orange
    slow: '#808080',       // Gray
    false_start: '#FF0000', // Red
  },
  messages: {
    perfect: 'PERFECT REACTION TIME!',
    excellent: 'EXCELLENT REACTION!',
    good: 'GOOD REACTION TIME!',
    fair: 'FAIR REACTION TIME',
    slow: 'SLOW REACTION TIME',
    false_start: 'FALSE START! Wait for the lights to go out.',
  },
  icons: {
    perfect: '⚡',
    excellent: '🏎️',
    good: '🏁',
    fair: '🚗',
    slow: '🐌',
    false_start: '🚫',
  },
};

// F1 Driver Database (simulated professional reaction times)
const F1_DRIVERS: F1Driver[] = [
  {
    id: 'verstappen',
    name: 'Max Verstappen',
    team: 'Red Bull Racing',
    avgReactionTime: 175,
    consistency: 0.95,
    championships: 3,
    isActive: true,
  },
  {
    id: 'hamilton',
    name: 'Lewis Hamilton',
    team: 'Mercedes',
    avgReactionTime: 180,
    consistency: 0.92,
    championships: 7,
    isActive: true,
  },
  {
    id: 'leclerc',
    name: 'Charles Leclerc',
    team: 'Ferrari',
    avgReactionTime: 185,
    consistency: 0.88,
    championships: 0,
    isActive: true,
  },
  {
    id: 'russell',
    name: 'George Russell',
    team: 'Mercedes',
    avgReactionTime: 190,
    consistency: 0.85,
    championships: 0,
    isActive: true,
  },
  {
    id: 'norris',
    name: 'Lando Norris',
    team: 'McLaren',
    avgReactionTime: 195,
    consistency: 0.82,
    championships: 0,
    isActive: true,
  },
  {
    id: 'sainz',
    name: 'Carlos Sainz Jr.',
    team: 'Ferrari',
    avgReactionTime: 192,
    consistency: 0.84,
    championships: 0,
    isActive: true,
  },
  {
    id: 'piastri',
    name: 'Oscar Piastri',
    team: 'McLaren',
    avgReactionTime: 198,
    consistency: 0.80,
    championships: 0,
    isActive: true,
  },
  {
    id: 'alonso',
    name: 'Fernando Alonso',
    team: 'Aston Martin',
    avgReactionTime: 188,
    consistency: 0.90,
    championships: 2,
    isActive: true,
  },
  {
    id: 'perez',
    name: 'Sergio Pérez',
    team: 'Red Bull Racing',
    avgReactionTime: 200,
    consistency: 0.78,
    championships: 0,
    isActive: true,
  },
  {
    id: 'stroll',
    name: 'Lance Stroll',
    team: 'Aston Martin',
    avgReactionTime: 205,
    consistency: 0.75,
    championships: 0,
    isActive: true,
  },
];

export class ResultCalculator {
  private config: RatingConfig;
  private drivers: F1Driver[];

  constructor(config: RatingConfig = DEFAULT_RATING_CONFIG) {
    this.config = config;
    this.drivers = [...F1_DRIVERS];
  }

  /**
   * Calculate complete game result from reaction time
   */
  calculateResult(
    reactionTime: number,
    userHistory?: number[],
    communityData?: number[]
  ): GameResult {
    // Handle false start
    if (reactionTime < 0) {
      return this.createFalseStartResult();
    }

    // Calculate rating
    const rating = this.calculateRating(reactionTime);

    // Get driver comparison
    const driverComparison = this.getDriverComparison(reactionTime);

    // Calculate community percentile
    const communityPercentile = this.calculateCommunityPercentile(
      reactionTime,
      communityData
    );

    // Check if personal best
    const isPersonalBest = this.isPersonalBest(reactionTime, userHistory);

    return {
      reactionTime: Math.round(reactionTime * 1000) / 1000,
      rating,
      driverComparison,
      communityPercentile,
      isPersonalBest,
    };
  }

  /**
   * Calculate rating based on reaction time thresholds
   */
  calculateRating(reactionTime: number): RatingType {
    const { thresholds } = this.config;

    if (reactionTime < 0) return 'false_start';
    if (reactionTime < thresholds.perfect) return 'perfect';
    if (reactionTime < thresholds.excellent) return 'excellent';
    if (reactionTime < thresholds.good) return 'good';
    if (reactionTime < thresholds.fair) return 'fair';
    return 'slow';
  }

  /**
   * Compare user time against F1 drivers
   */
  getDriverComparison(reactionTime: number): DriverComparison {
    if (reactionTime < 0) {
      return {
        userTime: reactionTime,
        fasterThan: [],
        slowerThan: [],
        message: this.config.messages.false_start,
        icon: this.config.icons.false_start,
        color: this.config.colors.false_start,
      };
    }

    // Sort drivers by reaction time for comparison
    const sortedDrivers = [...this.drivers].sort(
      (a, b) => a.avgReactionTime - b.avgReactionTime
    );

    const fasterThan = sortedDrivers.filter(
      (driver) => reactionTime < driver.avgReactionTime
    );
    const slowerThan = sortedDrivers.filter(
      (driver) => reactionTime >= driver.avgReactionTime
    );

    // Generate comparison message
    const { message, icon, color } = this.generateComparisonMessage(
      reactionTime,
      fasterThan,
      slowerThan
    );

    return {
      userTime: reactionTime,
      fasterThan,
      slowerThan,
      message,
      icon,
      color,
    };
  }

  /**
   * Calculate community percentile ranking
   */
  calculateCommunityPercentile(
    reactionTime: number,
    communityData?: number[]
  ): number {
    if (reactionTime < 0) return 0;

    // If no community data provided, use statistical estimation
    if (!communityData || communityData.length === 0) {
      return this.estimatePercentile(reactionTime);
    }

    // Calculate actual percentile from community data
    const validTimes = communityData.filter((time) => time > 0);
    if (validTimes.length === 0) return this.estimatePercentile(reactionTime);

    const betterTimes = validTimes.filter((time) => time > reactionTime);
    return Math.round((betterTimes.length / validTimes.length) * 100);
  }

  /**
   * Check if this is a personal best
   */
  isPersonalBest(reactionTime: number, userHistory?: number[]): boolean {
    if (reactionTime < 0 || !userHistory || userHistory.length === 0) {
      return false;
    }

    const validHistory = userHistory.filter((time) => time > 0);
    if (validHistory.length === 0) return true;

    return reactionTime < Math.min(...validHistory);
  }

  /**
   * Get rating configuration
   */
  getRatingConfig(): RatingConfig {
    return { ...this.config };
  }

  /**
   * Update rating thresholds
   */
  updateThresholds(newThresholds: Partial<RatingThresholds>): void {
    this.config.thresholds = { ...this.config.thresholds, ...newThresholds };
  }

  /**
   * Get all F1 drivers data
   */
  getDriversData(): F1Driver[] {
    return [...this.drivers];
  }

  // Private methods

  private createFalseStartResult(): GameResult {
    return {
      reactionTime: -1,
      rating: 'false_start',
      driverComparison: {
        userTime: -1,
        fasterThan: [],
        slowerThan: [],
        message: this.config.messages.false_start,
        icon: this.config.icons.false_start,
        color: this.config.colors.false_start,
      },
      communityPercentile: 0,
      isPersonalBest: false,
    };
  }

  private generateComparisonMessage(
    reactionTime: number,
    fasterThan: F1Driver[],
    _slowerThan: F1Driver[]
  ): { message: string; icon: string; color: string } {
    const totalDrivers = this.drivers.length;
    const fasterCount = fasterThan.length;

    if (fasterCount === totalDrivers) {
      return {
        message: '⚡ FASTER THAN ALL F1 DRIVERS! ⚡',
        icon: '⚡',
        color: this.config.colors.perfect,
      };
    }

    if (fasterCount >= totalDrivers * 0.8) {
      return {
        message: `Faster than ${fasterCount}/${totalDrivers} F1 drivers! 🏆`,
        icon: '🏆',
        color: this.config.colors.excellent,
      };
    }

    if (fasterCount >= totalDrivers * 0.5) {
      return {
        message: `Faster than ${fasterCount} F1 drivers!`,
        icon: '🏎️',
        color: this.config.colors.good,
      };
    }

    if (fasterCount > 0) {
      const bestDriver = fasterThan[fasterThan.length - 1]; // Slowest of the faster drivers
      if (bestDriver) {
        return {
          message: `Faster than ${bestDriver.name}!`,
          icon: '🏁',
          color: this.config.colors.fair,
        };
      }
    }

    const fastestDriver = this.drivers.reduce((fastest, driver) =>
      driver.avgReactionTime < fastest.avgReactionTime ? driver : fastest
    );

    return {
      message: `${(Math.round((reactionTime - fastestDriver.avgReactionTime) * 1000) / 1000)}ms behind ${fastestDriver.name}`,
      icon: '🚗',
      color: this.config.colors.slow,
    };
  }

  private estimatePercentile(reactionTime: number): number {
    // Statistical estimation based on typical human reaction time distribution
    // Assumes normal distribution with mean ~300ms, std dev ~50ms
    
    if (reactionTime < 150) return 99;
    if (reactionTime < 200) return 95;
    if (reactionTime < 250) return 85;
    if (reactionTime < 300) return 70;
    if (reactionTime < 350) return 50;
    if (reactionTime < 400) return 30;
    if (reactionTime < 450) return 15;
    if (reactionTime < 500) return 5;
    return 1;
  }
}

// Export singleton instance
export const resultCalculator = new ResultCalculator();