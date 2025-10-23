import { ChallengeResult, GameResult } from '../../shared/types/game.js';

/**
 * Social Share Service
 * Handles sharing of game results and challenges across different platforms
 */
export class SocialShareService {
  
  /**
   * Create share text for a regular game result
   */
  static createGameResultShareText(result: GameResult): string {
    const { reactionTime, rating, driverComparison, communityPercentile } = result;
    
    let shareText = `🏎️ F1 Start Challenge: ${reactionTime}ms (${rating.toUpperCase()})`;
    
    // Add driver comparison if available
    if (driverComparison.fasterThan.length > 0) {
      shareText += ` - Faster than ${driverComparison.fasterThan.length} F1 drivers!`;
    }
    
    // Add percentile if available
    if (communityPercentile > 0) {
      shareText += ` Top ${Math.round((1 - communityPercentile / 100) * 100)}% of players!`;
    }
    
    shareText += ' Can you beat my time? #F1StartChallenge';
    
    return shareText;
  }

  /**
   * Create share text for a challenge result
   */
  static createChallengeResultShareText(result: ChallengeResult): string {
    const { userTime, opponentTime, winner, marginOfVictory } = result;
    
    let resultText = '';
    if (winner === 'user') {
      resultText = `I won by ${marginOfVictory}ms! 🏆`;
    } else if (winner === 'opponent') {
      resultText = `I lost by ${marginOfVictory}ms 😤 Time for revenge!`;
    } else {
      resultText = `We tied within ${marginOfVictory}ms! 🤝`;
    }

    return `🏎️ F1 Start Challenge: ${userTime}ms vs ${opponentTime}ms - ${resultText} #F1StartChallenge`;
  }

  /**
   * Create share text for a new challenge
   */
  static createChallengeShareText(
    creatorTime: number, 
    rating: string, 
    challengeUrl: string
  ): string {
    return `🏎️ I challenge you to beat my ${creatorTime}ms (${rating.toUpperCase()}) F1 start time! Think you're faster? ${challengeUrl} #F1StartChallenge`;
  }

  /**
   * Share using native Web Share API if available
   */
  static async shareNative(
    title: string, 
    text: string, 
    url?: string
  ): Promise<boolean> {
    if (!navigator.share) {
      return false;
    }

    try {
      await navigator.share({
        title,
        text,
        url: url || window.location.href
      });
      return true;
    } catch (error) {
      // User cancelled or error occurred
      console.log('Native sharing cancelled or failed:', error);
      return false;
    }
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      } catch (fallbackError) {
        console.error('Failed to copy to clipboard:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Generate social media sharing URLs
   */
  static generateSocialUrls(text: string, url?: string): {
    twitter: string;
    facebook: string;
    reddit: string;
    linkedin: string;
  } {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url || window.location.href);

    return {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encodedText}`
    };
  }

  /**
   * Open social media sharing in new window
   */
  static openSocialShare(platform: 'twitter' | 'facebook' | 'reddit' | 'linkedin', text: string, url?: string): void {
    const urls = this.generateSocialUrls(text, url);
    const shareUrl = urls[platform];
    
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(
      shareUrl,
      'share',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  }

  /**
   * Create a shareable image URL (placeholder for future implementation)
   */
  static async generateResultImage(_result: GameResult | ChallengeResult): Promise<string | null> {
    // This would generate a shareable image with the result
    // For now, return null as this requires canvas/image generation
    console.log('Image generation not yet implemented');
    return null;
  }

  /**
   * Track sharing analytics
   */
  static trackShare(
    platform: string, 
    contentType: 'game_result' | 'challenge_result' | 'challenge_invite',
    success: boolean
  ): void {
    // Track sharing events for analytics
    console.log(`Share tracked: ${platform}, ${contentType}, success: ${success}`);
    
    // This could be integrated with analytics services
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'share', {
        method: platform,
        content_type: contentType,
        success: success
      });
    }
  }

  /**
   * Get sharing capabilities of the current browser/device
   */
  static getSharingCapabilities(): {
    nativeShare: boolean;
    clipboard: boolean;
    socialMedia: boolean;
  } {
    return {
      nativeShare: !!navigator.share,
      clipboard: !!navigator.clipboard,
      socialMedia: true // Always available via URLs
    };
  }

  /**
   * Create a complete sharing package for a result
   */
  static createSharingPackage(
    result: GameResult | ChallengeResult,
    type: 'game_result' | 'challenge_result' | 'challenge_invite',
    challengeUrl?: string
  ): {
    text: string;
    title: string;
    url?: string;
    socialUrls: ReturnType<typeof SocialShareService.generateSocialUrls>;
  } {
    let text: string;
    let title: string;
    
    if (type === 'challenge_result' && 'winner' in result) {
      text = this.createChallengeResultShareText(result);
      title = 'F1 Start Challenge Result';
    } else if (type === 'challenge_invite' && challengeUrl) {
      const gameResult = result as GameResult;
      text = this.createChallengeShareText(gameResult.reactionTime, gameResult.rating, challengeUrl);
      title = 'F1 Start Challenge Invitation';
    } else {
      text = this.createGameResultShareText(result as GameResult);
      title = 'F1 Start Challenge Result';
    }

    const url = challengeUrl || window.location.href;
    const socialUrls = this.generateSocialUrls(text, url);

    return {
      text,
      title,
      url,
      socialUrls
    };
  }

  /**
   * Create enhanced challenge result share text with statistics
   */
  static createEnhancedChallengeResultShareText(
    result: ChallengeResult,
    userStats?: { wins: number; losses: number; winRate: number }
  ): string {
    const { userTime, opponentTime, winner, marginOfVictory } = result;
    
    let resultText = '';
    let emoji = '';
    
    if (winner === 'user') {
      emoji = marginOfVictory < 10 ? '😅' : marginOfVictory < 50 ? '🏆' : '🔥';
      resultText = `I won by ${marginOfVictory}ms! ${emoji}`;
    } else if (winner === 'opponent') {
      emoji = marginOfVictory < 10 ? '😤' : marginOfVictory < 50 ? '😔' : '💀';
      resultText = `I lost by ${marginOfVictory}ms ${emoji} Time for revenge!`;
    } else {
      resultText = `We tied within ${marginOfVictory}ms! 🤝 Perfectly matched!`;
    }

    let shareText = `🏎️ F1 Start Challenge: ${userTime}ms vs ${opponentTime}ms - ${resultText}`;
    
    // Add user statistics if provided
    if (userStats && userStats.wins + userStats.losses > 0) {
      const winRate = Math.round(userStats.winRate * 100);
      shareText += ` | Record: ${userStats.wins}W-${userStats.losses}L (${winRate}%)`;
    }
    
    shareText += ' #F1StartChallenge';
    
    return shareText;
  }

  /**
   * Create share text for challenge statistics
   */
  static createStatsShareText(stats: {
    totalChallenges: number;
    wins: number;
    losses: number;
    ties: number;
    winRate: number;
    longestWinStreak: number;
  }): string {
    const winRate = Math.round(stats.winRate * 100);
    
    let performanceEmoji = '';
    if (winRate >= 80) performanceEmoji = '🔥';
    else if (winRate >= 60) performanceEmoji = '💪';
    else if (winRate >= 40) performanceEmoji = '⚡';
    else performanceEmoji = '🎯';

    return `🏎️ My F1 Start Challenge Stats ${performanceEmoji}\n` +
           `📊 ${stats.totalChallenges} challenges: ${stats.wins}W-${stats.losses}L-${stats.ties}T (${winRate}%)\n` +
           `🏆 Longest win streak: ${stats.longestWinStreak}\n` +
           `Think you can beat my record? #F1StartChallenge`;
  }

  /**
   * Create share text for re-challenge invitation
   */
  static createReChallengeShareText(
    originalResult: ChallengeResult,
    challengeUrl: string
  ): string {
    const { winner, marginOfVictory, userTime } = originalResult;
    
    let challengeText = '';
    if (winner === 'user') {
      challengeText = `I beat you by ${marginOfVictory}ms last time! Think you can get revenge?`;
    } else if (winner === 'opponent') {
      challengeText = `You beat me by ${marginOfVictory}ms, but I've been practicing! Ready for round 2?`;
    } else {
      challengeText = `We tied within ${marginOfVictory}ms! Let's settle this once and for all!`;
    }

    return `🏎️ F1 Start Challenge Rematch! ${challengeText} My time: ${userTime}ms. ${challengeUrl} #F1StartChallenge`;
  }

  /**
   * Generate hashtags based on performance
   */
  static generatePerformanceHashtags(result: GameResult | ChallengeResult): string[] {
    const hashtags = ['#F1StartChallenge', '#ReactionTime', '#F1'];
    
    if ('winner' in result) {
      // Challenge result
      const { winner, marginOfVictory } = result;
      
      if (winner === 'user') {
        hashtags.push('#Victory', '#Winner');
        if (marginOfVictory > 100) hashtags.push('#Domination');
        if (marginOfVictory < 10) hashtags.push('#CloseCall');
      } else if (winner === 'opponent') {
        hashtags.push('#Rematch', '#Revenge');
      } else {
        hashtags.push('#Tie', '#PerfectMatch');
      }
    } else {
      // Game result
      const { rating, reactionTime } = result;
      
      if (rating === 'perfect') hashtags.push('#Perfect', '#Lightning');
      if (rating === 'excellent') hashtags.push('#Excellent', '#Fast');
      if (reactionTime < 200) hashtags.push('#SubTwoHundred', '#Elite');
      if (reactionTime < 150) hashtags.push('#Incredible', '#Superhuman');
    }
    
    return hashtags;
  }

  /**
   * Create platform-specific share text
   */
  static createPlatformSpecificText(
    baseText: string,
    platform: 'twitter' | 'facebook' | 'reddit' | 'linkedin',
    result: GameResult | ChallengeResult
  ): string {
    const hashtags = this.generatePerformanceHashtags(result);
    
    switch (platform) {
      case 'twitter':
        // Twitter has character limits, keep it concise
        const twitterHashtags = hashtags.slice(0, 3).join(' ');
        return `${baseText} ${twitterHashtags}`;
        
      case 'facebook':
        // Facebook allows longer posts, add more context
        return `${baseText}\n\nTest your reflexes against the iconic F1 starting sequence! 🏁`;
        
      case 'reddit':
        // Reddit prefers descriptive titles
        return `${baseText}\n\nJust completed an F1 Start Challenge - who else is playing this?`;
        
      case 'linkedin':
        // LinkedIn is more professional
        return `${baseText}\n\nInteresting reaction time challenge based on Formula 1 starting procedures. Great for testing focus and reflexes!`;
        
      default:
        return baseText;
    }
  }

  /**
   * Batch share to multiple platforms
   */
  static async batchShare(
    result: GameResult | ChallengeResult,
    platforms: ('twitter' | 'facebook' | 'reddit' | 'linkedin')[],
    type: 'game_result' | 'challenge_result' | 'challenge_invite',
    challengeUrl?: string
  ): Promise<{ platform: string; success: boolean; error?: string }[]> {
    const results = [];
    
    for (const platform of platforms) {
      try {
        const sharePackage = this.createSharingPackage(result, type, challengeUrl);
        const platformText = this.createPlatformSpecificText(
          sharePackage.text, 
          platform, 
          result
        );
        
        this.openSocialShare(platform, platformText, sharePackage.url);
        this.trackShare(platform, type, true);
        
        results.push({ platform, success: true });
      } catch (error) {
        console.error(`Failed to share to ${platform}:`, error);
        this.trackShare(platform, type, false);
        results.push({ 
          platform, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
}