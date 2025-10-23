import { 
  Challenge, 
  ChallengeSession, 
  ChallengeResult, 
  GameConfiguration 
} from '../../shared/types/game.js';
import { 
  ChallengeCreateRequest,
  ChallengeCreateResponse,
  ChallengeLoadResponse,
  ChallengeAcceptResponse,
  ChallengeSubmitResponse
} from '../../shared/types/api.js';
import { TimingEngine, TimingConfig, ReplayData } from '../engines/TimingEngine.js';

/**
 * Client-side Challenge Manager
 * Handles challenge creation, acceptance, and deterministic replay
 * Enhanced with replay validation and session management
 */
export class ChallengeManager {
  private currentSession: ChallengeSession | null = null;
  private timingEngine: TimingEngine | null = null;
  private replayData: ReplayData | null = null;
  private sessionStorage: Map<string, any> = new Map();

  /**
   * Create a new challenge from a game result
   */
  async createChallenge(
    reactionTime: number,
    rating: string,
    gameConfig: GameConfiguration
  ): Promise<{ challengeId: string; challengeUrl: string; expiresAt: string }> {
    const request: ChallengeCreateRequest = {
      reactionTime,
      rating,
      gameConfig
    };

    const response = await fetch('/api/challenge/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create challenge');
    }

    const result: ChallengeCreateResponse = await response.json();
    
    if (!result.success || !result.challengeId || !result.challengeUrl || !result.expiresAt) {
      throw new Error(result.error || 'Invalid challenge creation response');
    }

    return {
      challengeId: result.challengeId,
      challengeUrl: result.challengeUrl,
      expiresAt: result.expiresAt
    };
  }

  /**
   * Load a challenge by ID
   */
  async loadChallenge(challengeId: string): Promise<Challenge | null> {
    const response = await fetch(`/api/challenge/${challengeId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Challenge not found or expired
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to load challenge');
    }

    const result: ChallengeLoadResponse = await response.json();
    
    if (!result.success || !result.challenge) {
      return null;
    }

    return result.challenge;
  }

  /**
   * Accept a challenge and create a deterministic session
   */
  async acceptChallenge(challengeId: string): Promise<ChallengeSession> {
    const response = await fetch('/api/challenge/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ challengeId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to accept challenge');
    }

    const result: ChallengeAcceptResponse = await response.json();
    
    if (!result.success || !result.session) {
      throw new Error(result.error || 'Invalid challenge acceptance response');
    }

    this.currentSession = result.session;
    return result.session;
  }

  /**
   * Submit challenge result
   */
  async submitChallengeResult(
    challengeId: string,
    reactionTime: number,
    rating: string
  ): Promise<ChallengeResult> {
    const response = await fetch('/api/challenge/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        challengeId,
        reactionTime,
        rating
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit challenge result');
    }

    const result: ChallengeSubmitResponse = await response.json();
    
    if (!result.success || !result.result) {
      throw new Error(result.error || 'Invalid challenge submission response');
    }

    return result.result;
  }

  /**
   * Initialize a deterministic timing engine for challenge mode
   */
  initializeChallengeTimingEngine(session: ChallengeSession): TimingEngine {
    const timingConfig: TimingConfig = {
      lightInterval: session.challenge.gameConfig.lightInterval,
      minRandomDelay: session.challenge.gameConfig.minRandomDelay,
      maxRandomDelay: session.challenge.gameConfig.maxRandomDelay,
      seed: session.seed // This ensures deterministic timing
    };

    this.timingEngine = new TimingEngine(timingConfig);
    
    // Store session data for replay validation
    this.storeSessionData(session.challenge.id, {
      seed: session.seed,
      config: timingConfig,
      timestamp: Date.now(),
      challengeId: session.challenge.id
    });

    return this.timingEngine;
  }

  /**
   * Store session data for replay validation
   */
  private storeSessionData(challengeId: string, data: any): void {
    this.sessionStorage.set(challengeId, data);
    
    // Also store in localStorage for persistence
    try {
      const storageKey = `challenge_session_${challengeId}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to store session data in localStorage:', error);
    }
  }

  /**
   * Retrieve session data for replay validation
   */
  private retrieveSessionData(challengeId: string): any | null {
    // Try memory first
    if (this.sessionStorage.has(challengeId)) {
      return this.sessionStorage.get(challengeId);
    }

    // Try localStorage
    try {
      const storageKey = `challenge_session_${challengeId}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.sessionStorage.set(challengeId, parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to retrieve session data from localStorage:', error);
    }

    return null;
  }

  /**
   * Validate replay integrity for a challenge session
   */
  validateReplayIntegrity(challengeId: string, replayData: ReplayData): {
    isValid: boolean;
    errors: string[];
    confidence: number;
  } {
    const errors: string[] = [];
    let confidence = 1.0;

    // Check if we have stored session data
    const sessionData = this.retrieveSessionData(challengeId);
    if (!sessionData) {
      errors.push('No session data found for validation');
      confidence *= 0.5;
    } else {
      // Validate seed matches
      if (sessionData.seed !== replayData.seed) {
        errors.push('Seed mismatch in replay data');
        confidence *= 0.3;
      }

      // Validate timing configuration
      if (sessionData.config) {
        const configMatch = 
          sessionData.config.lightInterval === replayData.lightTimings?.length * 900 && // Approximate check
          sessionData.config.seed === replayData.seed;
        
        if (!configMatch) {
          errors.push('Configuration mismatch in replay data');
          confidence *= 0.7;
        }
      }
    }

    // Validate timing engine if available
    if (this.timingEngine && this.timingEngine.isInReplayMode()) {
      const engineValidation = this.timingEngine.validateReplay(replayData);
      if (!engineValidation.isValid) {
        errors.push(...engineValidation.errors);
        confidence *= 0.4;
      }
    }

    // Validate sequence hash integrity
    if (!replayData.sequenceHash) {
      errors.push('Missing sequence hash for integrity validation');
      confidence *= 0.8;
    }

    // Validate timing bounds
    if (replayData.totalDuration < 4500 || replayData.totalDuration > 10000) {
      errors.push('Total duration outside expected bounds');
      confidence *= 0.6;
    }

    return {
      isValid: errors.length === 0,
      errors,
      confidence
    };
  }

  /**
   * Create a deterministic session with enhanced validation
   */
  async createDeterministicSession(challengeId: string): Promise<{
    sessionId: string;
    seed: number;
    synchronized: boolean;
    replayReady: boolean;
  }> {
    const challenge = await this.loadChallenge(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const session = await this.acceptChallenge(challengeId);
    if (!session) {
      throw new Error('Failed to accept challenge');
    }

    // Initialize timing engine with deterministic seed
    const engine = this.initializeChallengeTimingEngine(session);
    
    // Create deterministic session
    const deterministicSession = engine.createDeterministicSession(
      session.seed,
      session.challenge.gameConfig
    );

    // Store enhanced session data
    this.storeSessionData(challengeId, {
      ...deterministicSession,
      challengeId,
      opponentData: session.opponentData,
      ghostTiming: session.ghostTiming
    });

    return {
      sessionId: deterministicSession.sessionId,
      seed: deterministicSession.seed,
      synchronized: true, // Always true for deterministic sessions
      replayReady: true
    };
  }

  /**
   * Synchronize timing with opponent for fair competition
   */
  synchronizeWithOpponent(_opponentTimingData?: any): {
    synchronized: boolean;
    timeDifference: number;
    fairPlay: boolean;
  } {
    if (!this.timingEngine) {
      return {
        synchronized: false,
        timeDifference: Infinity,
        fairPlay: false
      };
    }

    // For deterministic challenges, synchronization is guaranteed by the seed
    if (this.timingEngine.isInReplayMode()) {
      return {
        synchronized: true,
        timeDifference: 0,
        fairPlay: true
      };
    }

    // For live challenges, we'd need real-time synchronization
    // This is a placeholder for future live multiplayer features
    return {
      synchronized: false,
      timeDifference: 0,
      fairPlay: true
    };
  }

  /**
   * Get replay data for the current session
   */
  getCurrentReplayData(): ReplayData | null {
    return this.replayData;
  }

  /**
   * Set replay data for validation
   */
  setReplayData(replayData: ReplayData): void {
    this.replayData = replayData;
    
    if (this.timingEngine) {
      this.timingEngine.enableReplayMode(replayData);
    }
  }

  /**
   * Get the current challenge session
   */
  getCurrentSession(): ChallengeSession | null {
    return this.currentSession;
  }

  /**
   * Clear the current session
   */
  clearSession(): void {
    this.currentSession = null;
    this.timingEngine = null;
  }

  /**
   * Check if currently in a challenge session
   */
  isInChallengeMode(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Get ghost timing data for visualization
   */
  getGhostTiming(): number | null {
    return this.currentSession?.ghostTiming || null;
  }

  /**
   * Get opponent data for display
   */
  getOpponentData(): { username: string; reactionTime: number; rating: string } | null {
    if (!this.currentSession?.opponentData) {
      return null;
    }

    return {
      username: this.currentSession.opponentData.username,
      reactionTime: this.currentSession.opponentData.reactionTime,
      rating: this.currentSession.opponentData.rating
    };
  }

  /**
   * Validate challenge session integrity
   */
  validateSession(session: ChallengeSession): boolean {
    // Check if challenge has expired
    if (new Date(session.challenge.expiresAt) < new Date()) {
      return false;
    }

    // Validate seed is present for deterministic replay
    if (typeof session.seed !== 'number') {
      return false;
    }

    // Validate game configuration
    const config = session.challenge.gameConfig;
    if (!config || 
        typeof config.lightInterval !== 'number' ||
        typeof config.minRandomDelay !== 'number' ||
        typeof config.maxRandomDelay !== 'number') {
      return false;
    }

    return true;
  }

  /**
   * Generate a shareable challenge URL
   */
  generateShareableUrl(challengeId: string): string {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('challenge', challengeId);
    return currentUrl.toString();
  }

  /**
   * Parse challenge ID from URL parameters
   */
  getChallengeIdFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('challenge');
  }

  /**
   * Check if there's a challenge in the URL and automatically load it
   */
  async autoLoadChallengeFromUrl(): Promise<ChallengeSession | null> {
    const challengeId = this.getChallengeIdFromUrl();
    
    if (!challengeId) {
      return null;
    }

    try {
      // Load the challenge
      const challenge = await this.loadChallenge(challengeId);
      
      if (!challenge) {
        console.warn(`Challenge ${challengeId} not found or expired`);
        // Remove the challenge parameter from URL
        this.removeChallengeFromUrl();
        return null;
      }

      // Accept the challenge automatically
      const session = await this.acceptChallenge(challengeId);
      
      if (!session) {
        console.warn(`Failed to accept challenge ${challengeId}`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to auto-load challenge from URL:', error);
      // Remove the challenge parameter from URL on error
      this.removeChallengeFromUrl();
      return null;
    }
  }

  /**
   * Remove challenge parameter from URL
   */
  removeChallengeFromUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('challenge');
    
    // Update URL without reloading the page
    window.history.replaceState({}, document.title, url.toString());
  }

  /**
   * Add challenge parameter to URL
   */
  addChallengeToUrl(challengeId: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set('challenge', challengeId);
    
    // Update URL without reloading the page
    window.history.replaceState({}, document.title, url.toString());
  }

  /**
   * Create challenge share text for social media
   */
  createShareText(challengeResult: ChallengeResult): string {
    const { userTime, opponentTime, winner, marginOfVictory } = challengeResult;
    
    let resultText = '';
    if (winner === 'user') {
      resultText = `I beat my opponent by ${marginOfVictory}ms! 🏆`;
    } else if (winner === 'opponent') {
      resultText = `My opponent beat me by ${marginOfVictory}ms! 😤`;
    } else {
      resultText = `We tied within ${marginOfVictory}ms! 🤝`;
    }

    return `F1 Start Challenge: ${userTime}ms vs ${opponentTime}ms - ${resultText} Can you beat us? #F1StartChallenge`;
  }

  /**
   * Get challenge statistics for display
   */
  getChallengeStats(challenge: Challenge): {
    totalAttempts: number;
    averageTime: number;
    bestTime: number;
    worstTime: number;
  } {
    const attempts = challenge.acceptedBy;
    
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageTime: 0,
        bestTime: 0,
        worstTime: 0
      };
    }

    const times = attempts.map(attempt => attempt.reactionTime);
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    
    return {
      totalAttempts: attempts.length,
      averageTime: totalTime / attempts.length,
      bestTime: Math.min(...times),
      worstTime: Math.max(...times)
    };
  }

  /**
   * Check if user has already completed this challenge
   */
  hasUserCompletedChallenge(challenge: Challenge, userId: string): boolean {
    return challenge.acceptedBy.some(attempt => attempt.userId === userId);
  }

  /**
   * Get user's previous attempt on this challenge
   */
  getUserPreviousAttempt(challenge: Challenge, userId: string): {
    reactionTime: number;
    rating: string;
    completedAt: string;
  } | null {
    const attempt = challenge.acceptedBy.find(attempt => attempt.userId === userId);
    
    if (!attempt) {
      return null;
    }

    return {
      reactionTime: attempt.reactionTime,
      rating: attempt.rating,
      completedAt: attempt.completedAt
    };
  }

  /**
   * Create a re-challenge from an existing challenge result
   */
  async createReChallenge(
    originalChallengeResult: ChallengeResult,
    newReactionTime: number,
    newRating: string,
    gameConfig: GameConfiguration
  ): Promise<{ challengeId: string; challengeUrl: string; expiresAt: string }> {
    // Create a new challenge with improved time
    const newChallenge = await this.createChallenge(newReactionTime, newRating, gameConfig);
    
    // Store reference to original challenge for context
    try {
      const storageKey = `rechallenge_${newChallenge.challengeId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        originalChallengeId: originalChallengeResult.challengeId,
        originalResult: originalChallengeResult,
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to store re-challenge context:', error);
    }

    return newChallenge;
  }

  /**
   * Get re-challenge context if this challenge is a re-challenge
   */
  getReChallengeContext(challengeId: string): {
    originalChallengeId: string;
    originalResult: ChallengeResult;
    createdAt: string;
  } | null {
    try {
      const storageKey = `rechallenge_${challengeId}`;
      const data = localStorage.getItem(storageKey);
      
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to retrieve re-challenge context:', error);
    }
    
    return null;
  }

  /**
   * Generate enhanced share text for challenge results
   */
  createEnhancedShareText(
    challengeResult: ChallengeResult,
    userStats?: { wins: number; losses: number; winRate: number }
  ): string {
    const { winner, marginOfVictory } = challengeResult;
    
    let resultText = '';
    let performanceNote = '';
    
    if (winner === 'user') {
      if (marginOfVictory < 10) {
        resultText = `I barely won by ${marginOfVictory}ms! 😅`;
        performanceNote = 'That was close!';
      } else if (marginOfVictory < 50) {
        resultText = `I won by ${marginOfVictory}ms! 🏆`;
        performanceNote = 'Solid victory!';
      } else if (marginOfVictory < 100) {
        resultText = `I dominated with a ${marginOfVictory}ms victory! 🔥`;
        performanceNote = 'Crushing it!';
      } else {
        resultText = `I absolutely destroyed them by ${marginOfVictory}ms! 💀`;
        performanceNote = 'No mercy!';
      }
    } else if (winner === 'opponent') {
      if (marginOfVictory < 10) {
        resultText = `I lost by just ${marginOfVictory}ms! 😤`;
        performanceNote = 'So close! Rematch time!';
      } else if (marginOfVictory < 50) {
        resultText = `I lost by ${marginOfVictory}ms 😔`;
        performanceNote = 'I can do better!';
      } else {
        resultText = `I got destroyed by ${marginOfVictory}ms 💀`;
        performanceNote = 'Back to training!';
      }
    } else {
      resultText = `We tied within ${marginOfVictory}ms! 🤝`;
      performanceNote = 'Perfectly matched!';
    }

    let shareText = `🏎️ F1 Start Challenge: ${challengeResult.userTime}ms vs ${challengeResult.opponentTime}ms\n${resultText}\n${performanceNote}`;
    
    // Add user statistics if provided
    if (userStats && userStats.wins + userStats.losses > 0) {
      const winRate = Math.round(userStats.winRate * 100);
      shareText += `\n\n📊 My Record: ${userStats.wins}W-${userStats.losses}L (${winRate}% win rate)`;
    }
    
    shareText += '\n\nCan you beat us? #F1StartChallenge';
    
    return shareText;
  }

  /**
   * Create share text for a new challenge invitation
   */
  createChallengeInviteText(
    creatorTime: number,
    rating: string,
    challengeUrl: string,
    context?: string
  ): string {
    let challengeText = `🏎️ I challenge you to beat my ${creatorTime}ms (${rating.toUpperCase()}) F1 start time!`;
    
    if (context) {
      challengeText += `\n\n${context}`;
    }
    
    challengeText += `\n\nThink you're faster? Prove it: ${challengeUrl}`;
    challengeText += '\n\n#F1StartChallenge #ReactionTime #Challenge';
    
    return challengeText;
  }

  /**
   * Get challenge performance analysis
   */
  analyzeChallengePerformance(result: ChallengeResult): {
    performance: 'excellent' | 'good' | 'average' | 'poor';
    message: string;
    suggestions: string[];
    nextGoal: string;
  } {
    const { winner, marginOfVictory } = result;
    
    let performance: 'excellent' | 'good' | 'average' | 'poor';
    let message: string;
    let suggestions: string[] = [];
    let nextGoal: string;
    
    if (winner === 'user') {
      if (marginOfVictory > 100) {
        performance = 'excellent';
        message = 'Outstanding performance! You completely dominated this challenge.';
        suggestions = [
          'Challenge more experienced players',
          'Try harder difficulty settings',
          'Share your technique with others'
        ];
        nextGoal = 'Maintain this level and challenge top players';
      } else if (marginOfVictory > 50) {
        performance = 'good';
        message = 'Great job! You won with a solid margin.';
        suggestions = [
          'Work on consistency',
          'Try to increase your margin of victory',
          'Challenge players with similar skill levels'
        ];
        nextGoal = 'Aim for 100ms+ victory margins';
      } else {
        performance = 'average';
        message = 'Close victory! You barely edged out your opponent.';
        suggestions = [
          'Focus on reaction time training',
          'Practice the light sequence timing',
          'Work on reducing false starts'
        ];
        nextGoal = 'Win by 50ms+ consistently';
      }
    } else if (winner === 'opponent') {
      if (marginOfVictory > 100) {
        performance = 'poor';
        message = 'Tough loss. Your opponent was significantly faster.';
        suggestions = [
          'Practice basic reaction time exercises',
          'Study the F1 light sequence pattern',
          'Focus on anticipation without false starting'
        ];
        nextGoal = 'Reduce the gap to under 100ms';
      } else if (marginOfVictory > 50) {
        performance = 'average';
        message = 'Decent effort, but there\'s room for improvement.';
        suggestions = [
          'Work on your timing precision',
          'Practice with similar difficulty opponents',
          'Analyze your false start rate'
        ];
        nextGoal = 'Get within 50ms of your opponents';
      } else {
        performance = 'good';
        message = 'Very close! You almost had them.';
        suggestions = [
          'Fine-tune your reaction timing',
          'Challenge them to a rematch',
          'Focus on mental preparation'
        ];
        nextGoal = 'Turn these close losses into wins';
      }
    } else {
      performance = 'good';
      message = 'Perfect tie! You\'re evenly matched with your opponent.';
      suggestions = [
        'Challenge them again for a tiebreaker',
        'Work on consistency to edge out ties',
        'Try different difficulty settings'
      ];
      nextGoal = 'Break ties with consistent sub-200ms times';
    }
    
    return {
      performance,
      message,
      suggestions,
      nextGoal
    };
  }

  /**
   * Get recommended next challenges based on performance
   */
  getRecommendedChallenges(
    userPerformance: { averageTime: number; winRate: number; totalChallenges: number }
  ): {
    difficulty: 'easier' | 'similar' | 'harder';
    description: string;
    targetTime: number;
  }[] {
    const recommendations = [];
    
    if (userPerformance.winRate > 0.7) {
      // User is doing well, suggest harder challenges
      recommendations.push({
        difficulty: 'harder' as const,
        description: 'Challenge top players to test your limits',
        targetTime: userPerformance.averageTime - 50
      });
    }
    
    if (userPerformance.winRate < 0.3) {
      // User is struggling, suggest easier challenges
      recommendations.push({
        difficulty: 'easier' as const,
        description: 'Build confidence with achievable challenges',
        targetTime: userPerformance.averageTime + 50
      });
    }
    
    // Always suggest similar level challenges
    recommendations.push({
      difficulty: 'similar' as const,
      description: 'Find evenly matched opponents for competitive games',
      targetTime: userPerformance.averageTime
    });
    
    return recommendations;
  }
}