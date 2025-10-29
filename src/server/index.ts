import express from 'express';
import { 
  InitResponse, 
  IncrementResponse, 
  DecrementResponse,
  GameInitResponse,
  ScoreSubmissionRequest,
  ScoreSubmissionResponse,
  LeaderboardResponse,
  PreferencesUpdateRequest,
  PreferencesUpdateResponse,
  UserStatsResponse,
  UserActivityRequest,
  UserActivityResponse,
  ErrorResponse,
  ChallengeCreateRequest,
  ChallengeCreateResponse,
  ChallengeLoadResponse,
  ChallengeAcceptRequest,
  ChallengeAcceptResponse,
  ChallengeSubmitRequest,
  ChallengeSubmitResponse
} from '../shared/types/api.js';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post.js';
import { LeaderboardService } from './services/LeaderboardService.js';
import { UserSessionService } from './services/UserSessionService.js';
import { ValidationService, ErrorRecoveryService } from './services/ValidationService.js';
import { ErrorHandlingService, OperationError } from './services/ErrorHandlingService.js';
import { KVStorageService } from './services/KVStorageService.js';
import { DataMigrationService } from './services/DataMigrationService.js';
import { RateLimitService } from './services/RateLimitService.js';
import { ChallengeService } from './services/ChallengeService.js';
import { AntiCheatService } from './services/AntiCheatService.js';
import { StatisticalAnalysisService } from './services/StatisticalAnalysisService.js';
import { SecurityMonitoringService } from './services/SecurityMonitoringService.js';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

// Middleware for IP address extraction and rate limiting
app.use((req, res, next) => {
  // Extract IP address from various headers (Devvit may provide these)
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  const clientIp = req.headers['x-client-ip'] as string;
  
  // Use the first available IP, fallback to connection remote address
  req.clientIP = forwarded?.split(',')[0]?.trim() || 
                 realIp || 
                 clientIp || 
                 req.socket?.remoteAddress || 
                 'unknown';
  
  next();
});

// Middleware for general rate limiting (applies to all endpoints)
app.use(async (req, res, next) => {
  try {
    // Skip rate limiting for health checks and internal endpoints
    if (req.path.includes('/health') || req.path.includes('/internal/')) {
      return next();
    }

    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';
    const ipAddress = req.clientIP;

    // Check general rate limits for the IP
    if (ipAddress && ipAddress !== 'unknown') {
      const ipRateLimit = await RateLimitService.checkRateLimit(
        `ip:${ipAddress}`, 
        'leaderboard_view', // Use general action for non-specific endpoints
        ipAddress
      );

      if (!ipRateLimit.allowed) {
        res.status(429).json({
          type: 'error',
          code: 'IP_RATE_LIMITED',
          message: RateLimitService.getRateLimitMessage(ipRateLimit, 'request'),
          recoverable: true,
          action: 'wait'
        });
        return;
      }

      // Record IP action for general requests
      await RateLimitService.recordIPAction(ipAddress, 'general_request');
    }

    next();
  } catch (error) {
    console.error('Rate limiting middleware error:', error);
    // Continue on rate limiting errors to avoid blocking legitimate users
    next();
  }
});

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Game API Endpoints

router.get<{}, GameInitResponse | ErrorResponse>('/api/game/init', async (_req, res): Promise<void> => {
  try {
    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const session = await UserSessionService.initializeSession();
        const scope = session.preferences.preferredScope;
        const stats = await LeaderboardService.getLeaderboardStats(scope, 'alltime');
        
        return {
          type: 'game_init' as const,
          session,
          leaderboardStats: stats
        };
      },
      'game_init'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      const errorResponse: ErrorResponse = {
        type: 'error',
        code: result.error?.code || 'UNKNOWN_ERROR',
        message: result.error?.message || 'Failed to initialize game',
        recoverable: true,
        action: 'retry'
      };
      res.status(500).json(errorResponse);
    }
  } catch (error) {
    console.error('Game init error:', error);
    res.status(500).json({
      type: 'error',
      code: 'INIT_FAILED',
      message: 'Failed to initialize game session',
      recoverable: true,
      action: 'retry'
    });
  }
});

router.post<{}, ScoreSubmissionResponse | ErrorResponse, ScoreSubmissionRequest>(
  '/api/game/submit-score',
  async (req, res): Promise<void> => {
    try {
      const { reactionTime, rating, timestamp, scope, period } = req.body;
      
      // Get current user and IP
      const username = await reddit.getCurrentUsername();
      const userId = username || 'anonymous';
      const ipAddress = req.clientIP;

      // Check whitelist status for enhanced limits
      const whitelistStatus = await RateLimitService.getWhitelistStatus(userId);
      const userLevel = whitelistStatus?.level;

      // Check rate limiting with IP and whitelist support
      const rateLimitCheck = await RateLimitService.checkRateLimit(
        userId, 
        'score_submission', 
        ipAddress, 
        userLevel
      );
      
      // Temporarily disable rate limiting for debugging
      if (false && !rateLimitCheck.allowed) {
        res.status(429).json({
          type: 'error',
          code: 'RATE_LIMITED',
          message: RateLimitService.getRateLimitMessage(rateLimitCheck, 'submission'),
          recoverable: true,
          action: 'wait'
        });
        return;
      }

      // Check if CAPTCHA is required for suspicious activity
      const captchaRequirement = await RateLimitService.requiresCaptcha(userId, ipAddress);
      if (captchaRequirement.required) {
        // In a real implementation, you would verify CAPTCHA token here
        // For now, we'll just flag it and continue with enhanced monitoring
        console.warn(`CAPTCHA required for user ${userId} from IP ${ipAddress}: ${captchaRequirement.reason}`);
        
        // You could return a CAPTCHA challenge here:
        // res.status(403).json({
        //   type: 'error',
        //   code: 'CAPTCHA_REQUIRED',
        //   message: 'Please complete CAPTCHA verification',
        //   recoverable: true,
        //   action: 'captcha',
        //   difficulty: captchaRequirement.difficulty
        // });
        // return;
      }

      // Create leaderboard entry
      const entry = {
        userId,
        username: username || 'Anonymous',
        reactionTime,
        timestamp,
        scope: scope as any,
        period: period as any,
        flagged: false
      };

      // Validate entry
      const validation = ValidationService.validateLeaderboardEntry(entry);
      if (!validation.isValid) {
        // Try to recover from validation errors
        const recovery = ErrorRecoveryService.recoverFromValidationError(entry, validation);
        if (!recovery.recovered) {
          res.status(400).json({
            type: 'error',
            code: 'VALIDATION_FAILED',
            message: `Invalid submission: ${validation.flags.join(', ')}`,
            recoverable: false,
            action: 'retry'
          });
          return;
        }
        Object.assign(entry, recovery.data);
      }

      // Check for duplicate submissions (same user, same time, within 5 seconds)
      const duplicateCheck = await LeaderboardService.checkDuplicateSubmission(
        userId, 
        reactionTime, 
        scope as any, 
        period as any
      );
      
      if (duplicateCheck.isDuplicate) {
        res.status(409).json({
          type: 'error',
          code: 'DUPLICATE_SUBMISSION',
          message: 'This score has already been submitted recently',
          recoverable: false,
          action: 'continue'
        });
        return;
      }

      // Record the rate limit action before processing
      await RateLimitService.recordAction(userId, 'score_submission');
      
      // Record IP action for tracking
      if (ipAddress && ipAddress !== 'unknown') {
        await RateLimitService.recordIPAction(ipAddress, 'score_submission');
      }

      // Submit score with error handling
      const result = await ErrorHandlingService.executeWithRetry(
        async () => {
          const submission = await LeaderboardService.submitScore(entry);
          if (!submission.success) {
            throw new OperationError('SUBMISSION_FAILED', submission.message || 'Failed to submit score');
          }
          return submission;
        },
        'score_submission'
      );

      if (result.success && result.data) {
        // Update user session stats
        const sessionStats = await UserSessionService.updateSessionStats(
          userId,
          reactionTime,
          rating === 'false_start',
          rating === 'perfect'
        );

        // Calculate percentile
        const percentile = await LeaderboardService.getUserPercentile(
          userId,
          reactionTime,
          scope as any,
          period as any
        );

        // Check if this is a personal best
        const personalBest = sessionStats ? 
          (sessionStats.gamesPlayed === 1 || reactionTime < (sessionStats.averageTime || Infinity)) :
          false;

        res.json({
          type: 'score_submission',
          success: true,
          rank: result.data.rank || undefined,
          totalEntries: result.data.totalEntries || undefined,
          percentile: percentile || undefined,
          personalBest: personalBest ? reactionTime : undefined
        });
      } else {
        res.status(500).json({
          type: 'error',
          code: result.error?.code || 'SUBMISSION_FAILED',
          message: result.error?.message || 'Failed to submit score',
          recoverable: true,
          action: 'retry'
        });
      }

    } catch (error) {
      console.error('Score submission error:', error);
      res.status(500).json({
        type: 'error',
        code: 'SUBMISSION_ERROR',
        message: 'An error occurred while submitting your score',
        recoverable: true,
        action: 'retry'
      });
    }
  }
);

router.get<{}, LeaderboardResponse | ErrorResponse>('/api/leaderboard', async (req, res): Promise<void> => {
  try {
    const { scope = 'global', period = 'alltime', limit = 100 } = req.query as any;
    
    // Apply rate limiting for leaderboard views
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';
    const ipAddress = req.clientIP;

    if (userId !== 'anonymous') {
      const whitelistStatus = await RateLimitService.getWhitelistStatus(userId);
      const rateLimitCheck = await RateLimitService.checkRateLimit(
        userId, 
        'leaderboard_view', 
        ipAddress, 
        whitelistStatus?.level
      );
      
      // Temporarily disable rate limiting for debugging
      if (false && !rateLimitCheck.allowed) {
        res.status(429).json({
          type: 'error',
          code: 'RATE_LIMITED',
          message: RateLimitService.getRateLimitMessage(rateLimitCheck, 'leaderboard view'),
          recoverable: true,
          action: 'wait'
        });
        return;
      }

      // Record the rate limit action
      await RateLimitService.recordAction(userId, 'leaderboard_view');
    }
    
    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const entries = await LeaderboardService.getLeaderboard(scope as any, period as any, Number(limit));
        const stats = await LeaderboardService.getLeaderboardStats(scope as any, period as any);
        
        // Get user rank if logged in
        const username = await reddit.getCurrentUsername();
        let userRank: number | undefined;
        if (username) {
          userRank = await LeaderboardService.getUserRank(username, scope as any, period as any) || undefined;
        }

        return {
          type: 'leaderboard' as const,
          entries,
          userRank,
          stats
        };
      },
      'leaderboard_fetch'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'LEADERBOARD_FAILED',
        message: result.error?.message || 'Failed to fetch leaderboard',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({
      type: 'error',
      code: 'LEADERBOARD_ERROR',
      message: 'Failed to load leaderboard',
      recoverable: true,
      action: 'retry'
    });
  }
});

// User ranking details endpoint
router.get<{}, any | ErrorResponse>('/api/user/ranking', async (req, res): Promise<void> => {
  try {
    const { scope = 'global', period = 'alltime' } = req.query as any;
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Ranking details not available for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const rankingDetails = await LeaderboardService.getUserRankingDetails(userId, scope as any, period as any);
        return {
          type: 'user_ranking' as const,
          details: rankingDetails
        };
      },
      'user_ranking'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'RANKING_FAILED',
        message: result.error?.message || 'Failed to fetch ranking details',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('User ranking error:', error);
    res.status(500).json({
      type: 'error',
      code: 'RANKING_ERROR',
      message: 'Failed to load ranking details',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Community comparison endpoint
router.get<{}, any | ErrorResponse>('/api/community/comparison', async (req, res): Promise<void> => {
  try {
    const { reactionTime, scope = 'global', period = 'alltime' } = req.query as any;
    
    if (!reactionTime || isNaN(Number(reactionTime))) {
      res.status(400).json({
        type: 'error',
        code: 'INVALID_REACTION_TIME',
        message: 'Valid reaction time is required',
        recoverable: false,
        action: 'retry'
      });
      return;
    }

    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const comparison = await LeaderboardService.getCommunityComparison(
          Number(reactionTime), 
          scope as any, 
          period as any
        );
        return {
          type: 'community_comparison' as const,
          comparison
        };
      },
      'community_comparison'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'COMPARISON_FAILED',
        message: result.error?.message || 'Failed to get community comparison',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Community comparison error:', error);
    res.status(500).json({
      type: 'error',
      code: 'COMPARISON_ERROR',
      message: 'Failed to load community comparison',
      recoverable: true,
      action: 'retry'
    });
  }
});

// User achievements endpoint
router.get<{}, any | ErrorResponse>('/api/user/achievements', async (req, res): Promise<void> => {
  try {
    const { scope = 'global', period = 'alltime' } = req.query as any;
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Achievements not available for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const achievements = await LeaderboardService.getUserAchievements(userId, scope as any, period as any);
        return {
          type: 'user_achievements' as const,
          achievements
        };
      },
      'user_achievements'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'ACHIEVEMENTS_FAILED',
        message: result.error?.message || 'Failed to fetch achievements',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('User achievements error:', error);
    res.status(500).json({
      type: 'error',
      code: 'ACHIEVEMENTS_ERROR',
      message: 'Failed to load achievements',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Performance metrics endpoint
router.get<{}, any | ErrorResponse>('/api/user/performance', async (req, res): Promise<void> => {
  try {
    const { scope = 'global', period = 'alltime' } = req.query as any;
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Performance metrics not available for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const metrics = await LeaderboardService.getPerformanceMetrics(userId, scope as any, period as any);
        return {
          type: 'performance_metrics' as const,
          metrics
        };
      },
      'performance_metrics'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'PERFORMANCE_FAILED',
        message: result.error?.message || 'Failed to fetch performance metrics',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      type: 'error',
      code: 'PERFORMANCE_ERROR',
      message: 'Failed to load performance metrics',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Competitive analysis endpoint
router.get<{}, any | ErrorResponse>('/api/user/competitive-analysis', async (req, res): Promise<void> => {
  try {
    const { scope = 'global', period = 'alltime' } = req.query as any;
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Competitive analysis not available for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const analysis = await LeaderboardService.getCompetitiveAnalysis(userId, scope as any, period as any);
        return {
          type: 'competitive_analysis' as const,
          analysis
        };
      },
      'competitive_analysis'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'ANALYSIS_FAILED',
        message: result.error?.message || 'Failed to fetch competitive analysis',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Competitive analysis error:', error);
    res.status(500).json({
      type: 'error',
      code: 'ANALYSIS_ERROR',
      message: 'Failed to load competitive analysis',
      recoverable: true,
      action: 'retry'
    });
  }
});

router.post<{}, PreferencesUpdateResponse | ErrorResponse, PreferencesUpdateRequest>(
  '/api/user/preferences',
  async (req, res): Promise<void> => {
    try {
      const { preferences } = req.body;
      
      // Validate preferences
      const validation = ValidationService.validateUserPreferences(preferences);
      if (!validation.isValid) {
        res.status(400).json({
          type: 'error',
          code: 'INVALID_PREFERENCES',
          message: `Invalid preferences: ${validation.flags.join(', ')}`,
          recoverable: false,
          action: 'retry'
        });
        return;
      }

      const username = await reddit.getCurrentUsername();
      const userId = username || 'anonymous';

      const result = await ErrorHandlingService.executeWithRetry(
        async () => {
          const success = await UserSessionService.updatePreferences(userId, preferences);
          if (!success) {
            throw new OperationError('PREFERENCES_UPDATE_FAILED', 'Failed to update preferences');
          }
          
          const updatedPreferences = await UserSessionService.getPreferences(userId);
          return { success, preferences: updatedPreferences };
        },
        'preferences_update'
      );

      if (result.success && result.data) {
        res.json({
          type: 'preferences_update',
          success: result.data.success,
          preferences: result.data.preferences ?? undefined
        });
      } else {
        res.status(500).json({
          type: 'error',
          code: result.error?.code || 'PREFERENCES_FAILED',
          message: result.error?.message || 'Failed to update preferences',
          recoverable: true,
          action: 'retry'
        });
      }

    } catch (error) {
      console.error('Preferences update error:', error);
      res.status(500).json({
        type: 'error',
        code: 'PREFERENCES_ERROR',
        message: 'Failed to update user preferences',
        recoverable: true,
        action: 'retry'
      });
    }
  }
);

router.get<{}, UserStatsResponse | ErrorResponse>('/api/user/stats', async (_req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const session = await UserSessionService.getSession(userId);
        const behavioralProfile = await UserSessionService.getBehavioralProfile(userId);
        
        return {
          type: 'user_stats' as const,
          personalBest: session?.personalBest || undefined,
          sessionStats: session?.sessionStats || {
            gamesPlayed: 0,
            averageTime: 0,
            falseStarts: 0,
            perfectScores: 0,
            improvementRate: 0
          },
          behavioralProfile
        };
      },
      'user_stats'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'STATS_FAILED',
        message: result.error?.message || 'Failed to fetch user stats',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      type: 'error',
      code: 'STATS_ERROR',
      message: 'Failed to load user statistics',
      recoverable: true,
      action: 'retry'
    });
  }
});

// User activity tracking endpoint
router.post<{}, { success: boolean } | ErrorResponse, { activity: UserActivityRequest }>(
  '/api/user/activity',
  async (req, res): Promise<void> => {
    try {
      const { activity } = req.body;
      
      const username = await reddit.getCurrentUsername();
      const userId = username || 'anonymous';

      // Validate activity data
      const validation = ValidationService.validateUserActivity(activity);
      if (!validation.isValid) {
        res.status(400).json({
          type: 'error',
          code: 'INVALID_ACTIVITY',
          message: `Invalid activity data: ${validation.flags.join(', ')}`,
          recoverable: false,
          action: 'retry'
        });
        return;
      }

      const result = await ErrorHandlingService.executeWithRetry(
        async () => {
          const success = await UserSessionService.trackActivity(userId, activity);
          if (!success) {
            throw new OperationError('ACTIVITY_TRACKING_FAILED', 'Failed to track user activity');
          }
          return { success };
        },
        'activity_tracking'
      );

      if (result.success && result.data) {
        res.json(result.data);
      } else {
        res.status(500).json({
          type: 'error',
          code: result.error?.code || 'ACTIVITY_FAILED',
          message: result.error?.message || 'Failed to track activity',
          recoverable: true,
          action: 'retry'
        });
      }

    } catch (error) {
      console.error('Activity tracking error:', error);
      res.status(500).json({
        type: 'error',
        code: 'ACTIVITY_ERROR',
        message: 'Failed to track user activity',
        recoverable: true,
        action: 'retry'
      });
    }
  }
);

// User activity history endpoint
router.get<{}, { activities: UserActivityResponse[] } | ErrorResponse>('/api/user/activity', async (_req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const activities = await UserSessionService.getActivityHistory(userId);
        // Ensure all activities have timestamps
        const activitiesWithTimestamps = activities.map(activity => ({
          ...activity,
          timestamp: activity.timestamp || Date.now()
        }));
        return { activities: activitiesWithTimestamps };
      },
      'activity_history'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'ACTIVITY_HISTORY_FAILED',
        message: result.error?.message || 'Failed to fetch activity history',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Activity history error:', error);
    res.status(500).json({
      type: 'error',
      code: 'ACTIVITY_HISTORY_ERROR',
      message: 'Failed to load activity history',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Privacy compliance - user data deletion endpoint
router.delete<{}, { success: boolean } | ErrorResponse>('/api/user/data', async (_req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Cannot delete data for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const success = await UserSessionService.deleteUserData(userId);
        if (!success) {
          throw new OperationError('DATA_DELETION_FAILED', 'Failed to delete user data');
        }
        return { success };
      },
      'data_deletion'
    );

    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(500).json({
        type: 'error',
        code: result.error?.code || 'DELETION_FAILED',
        message: result.error?.message || 'Failed to delete user data',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Data deletion error:', error);
    res.status(500).json({
      type: 'error',
      code: 'DELETION_ERROR',
      message: 'Failed to delete user data',
      recoverable: true,
      action: 'retry'
    });
  }
});

router.get('/api/health', async (_req, res): Promise<void> => {
  try {
    const healthCheck = await ErrorHandlingService.performHealthCheck();
    res.json(healthCheck);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// KV Storage monitoring endpoints
router.get('/api/storage/status', async (_req, res): Promise<void> => {
  try {
    const [quotaStatus, connectionTest, migrationStatus] = await Promise.all([
      KVStorageService.getQuotaStatus(),
      KVStorageService.testConnection(),
      DataMigrationService.getMigrationStatus()
    ]);

    res.json({
      type: 'storage_status',
      quota: quotaStatus,
      connection: connectionTest,
      migration: migrationStatus,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Storage status error:', error);
    res.status(500).json({
      type: 'error',
      code: 'STORAGE_STATUS_FAILED',
      message: 'Failed to get storage status',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Rate limiting endpoints
router.get('/api/rate-limit/status', async (req, res): Promise<void> => {
  try {
    const { action = 'score_submission' } = req.query as any;
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Rate limit status not available for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    // Note: This endpoint doesn't count against rate limits since it's used to check limits
    const status = await RateLimitService.getRateLimitStatus(userId, action as any);
    
    res.json({
      type: 'rate_limit_status',
      ...status
    });

  } catch (error) {
    console.error('Rate limit status error:', error);
    res.status(500).json({
      type: 'error',
      code: 'RATE_LIMIT_STATUS_FAILED',
      message: 'Failed to get rate limit status',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Suspicious activity detection endpoint
router.get('/api/security/suspicious-activity', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Suspicious activity detection not available for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const suspiciousActivity = await RateLimitService.detectSuspiciousActivity(userId);
    
    res.json({
      type: 'suspicious_activity',
      ...suspiciousActivity
    });

  } catch (error) {
    console.error('Suspicious activity detection error:', error);
    res.status(500).json({
      type: 'error',
      code: 'SUSPICIOUS_ACTIVITY_FAILED',
      message: 'Failed to detect suspicious activity',
      recoverable: true,
      action: 'retry'
    });
  }
});

// CAPTCHA requirement check endpoint
router.get('/api/security/captcha-required', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';
    const ipAddress = req.clientIP;

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'CAPTCHA requirement check not available for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const captchaRequirement = await RateLimitService.requiresCaptcha(userId, ipAddress);
    
    res.json({
      type: 'captcha_requirement',
      ...captchaRequirement
    });

  } catch (error) {
    console.error('CAPTCHA requirement check error:', error);
    res.status(500).json({
      type: 'error',
      code: 'CAPTCHA_CHECK_FAILED',
      message: 'Failed to check CAPTCHA requirement',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Whitelist management endpoints (admin only in real implementation)
router.post('/api/admin/whitelist/add', async (req, res): Promise<void> => {
  try {
    const { targetUserId, level, reason } = req.body;
    const username = await reddit.getCurrentUsername();
    
    // In a real implementation, you'd check if the current user is an admin
    if (!username) {
      res.status(401).json({
        type: 'error',
        code: 'UNAUTHORIZED',
        message: 'Must be logged in to manage whitelist',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    if (!targetUserId || !level || !reason) {
      res.status(400).json({
        type: 'error',
        code: 'MISSING_PARAMETERS',
        message: 'Target user ID, level, and reason are required',
        recoverable: false,
        action: 'retry'
      });
      return;
    }

    const success = await RateLimitService.addToWhitelist(targetUserId, level, reason);
    
    if (success) {
      res.json({
        type: 'whitelist_add',
        success: true,
        message: `User ${targetUserId} added to whitelist with level ${level}`
      });
    } else {
      res.status(500).json({
        type: 'error',
        code: 'WHITELIST_ADD_FAILED',
        message: 'Failed to add user to whitelist',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Whitelist add error:', error);
    res.status(500).json({
      type: 'error',
      code: 'WHITELIST_ADD_ERROR',
      message: 'Failed to add user to whitelist',
      recoverable: true,
      action: 'retry'
    });
  }
});

router.delete('/api/admin/whitelist/:userId', async (req, res): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const username = await reddit.getCurrentUsername();
    
    // In a real implementation, you'd check if the current user is an admin
    if (!username) {
      res.status(401).json({
        type: 'error',
        code: 'UNAUTHORIZED',
        message: 'Must be logged in to manage whitelist',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const success = await RateLimitService.removeFromWhitelist(targetUserId);
    
    if (success) {
      res.json({
        type: 'whitelist_remove',
        success: true,
        message: `User ${targetUserId} removed from whitelist`
      });
    } else {
      res.status(500).json({
        type: 'error',
        code: 'WHITELIST_REMOVE_FAILED',
        message: 'Failed to remove user from whitelist',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Whitelist remove error:', error);
    res.status(500).json({
      type: 'error',
      code: 'WHITELIST_REMOVE_ERROR',
      message: 'Failed to remove user from whitelist',
      recoverable: true,
      action: 'retry'
    });
  }
});

router.get('/api/user/whitelist-status', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const userId = username || 'anonymous';

    if (userId === 'anonymous') {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Whitelist status not available for anonymous users',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const whitelistStatus = await RateLimitService.getWhitelistStatus(userId);
    
    res.json({
      type: 'whitelist_status',
      status: whitelistStatus,
      isWhitelisted: !!whitelistStatus
    });

  } catch (error) {
    console.error('Whitelist status error:', error);
    res.status(500).json({
      type: 'error',
      code: 'WHITELIST_STATUS_FAILED',
      message: 'Failed to get whitelist status',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Rate limit reset endpoint (admin only)
router.post('/api/admin/rate-limit/reset/:userId', async (req, res): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const username = await reddit.getCurrentUsername();
    
    // In a real implementation, you'd check if the current user is an admin
    if (!username) {
      res.status(401).json({
        type: 'error',
        code: 'UNAUTHORIZED',
        message: 'Must be logged in to reset rate limits',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const success = await RateLimitService.resetRateLimit(targetUserId);
    
    if (success) {
      res.json({
        type: 'rate_limit_reset',
        success: true,
        message: `Rate limits reset for user ${targetUserId}`
      });
    } else {
      res.status(500).json({
        type: 'error',
        code: 'RATE_LIMIT_RESET_FAILED',
        message: 'Failed to reset rate limits',
        recoverable: true,
        action: 'retry'
      });
    }

  } catch (error) {
    console.error('Rate limit reset error:', error);
    res.status(500).json({
      type: 'error',
      code: 'RATE_LIMIT_RESET_ERROR',
      message: 'Failed to reset rate limits',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Rate limiting statistics endpoint (admin only)
router.get('/api/admin/rate-limit/stats', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    
    // In a real implementation, you'd check if the current user is an admin
    if (!username) {
      res.status(401).json({
        type: 'error',
        code: 'UNAUTHORIZED',
        message: 'Must be logged in to view rate limit statistics',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const stats = await RateLimitService.getRateLimitStats();
    
    res.json({
      type: 'rate_limit_stats',
      ...stats
    });

  } catch (error) {
    console.error('Rate limit stats error:', error);
    res.status(500).json({
      type: 'error',
      code: 'RATE_LIMIT_STATS_FAILED',
      message: 'Failed to get rate limit statistics',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Data migration endpoints
router.post('/api/migration/check', async (_req, res): Promise<void> => {
  try {
    const migrationResult = await DataMigrationService.checkAndMigrate();
    res.json({
      type: 'migration_result',
      ...migrationResult
    });
  } catch (error) {
    console.error('Migration check error:', error);
    res.status(500).json({
      type: 'error',
      code: 'MIGRATION_FAILED',
      message: 'Failed to check or perform migrations',
      recoverable: true,
      action: 'retry'
    });
  }
});

router.get('/api/migration/status', async (_req, res): Promise<void> => {
  try {
    const status = await DataMigrationService.getMigrationStatus();
    res.json({
      type: 'migration_status',
      ...status
    });
  } catch (error) {
    console.error('Migration status error:', error);
    res.status(500).json({
      type: 'error',
      code: 'MIGRATION_STATUS_FAILED',
      message: 'Failed to get migration status',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Challenge API Endpoints

router.post<{}, ChallengeCreateResponse | ErrorResponse, ChallengeCreateRequest>(
  '/api/challenge/create',
  async (req, res): Promise<void> => {
    try {
      const { reactionTime, gameConfig } = req.body;
      
      const username = await reddit.getCurrentUsername();
      const ipAddress = req.clientIP;

      if (!username) {
        res.status(400).json({
          type: 'error',
          code: 'ANONYMOUS_USER',
          message: 'Must be logged in to create challenges',
          recoverable: false,
          action: 'continue'
        });
        return;
      }

      // Check rate limiting for challenge creation
      const whitelistStatus = await RateLimitService.getWhitelistStatus(username);
      const rateLimitCheck = await RateLimitService.checkRateLimit(
        username, 
        'challenge_create', 
        ipAddress, 
        whitelistStatus?.level
      );
      
      if (!rateLimitCheck.allowed) {
        res.status(429).json({
          type: 'error',
          code: 'RATE_LIMITED',
          message: RateLimitService.getRateLimitMessage(rateLimitCheck, 'challenge creation'),
          recoverable: true,
          action: 'wait'
        });
        return;
      }

      // Validate reaction time
      if (!ValidationService.validateReactionTime(reactionTime)) {
        res.status(400).json({
          type: 'error',
          code: 'INVALID_REACTION_TIME',
          message: 'Invalid reaction time for challenge creation',
          recoverable: false,
          action: 'retry'
        });
        return;
      }

      // Record the rate limit action
      await RateLimitService.recordAction(username, 'challenge_create');
      if (ipAddress && ipAddress !== 'unknown') {
        await RateLimitService.recordIPAction(ipAddress, 'challenge_create');
      }

      const challengeService = new ChallengeService(context);
      
      const result = await ErrorHandlingService.executeWithRetry(
        async () => {
          return await challengeService.createChallenge(
            username,
            reactionTime,
            gameConfig
          );
        },
        'challenge_create'
      );

      if (result.success && result.data) {
        res.json({
          type: 'challenge_create',
          success: true,
          challengeId: result.data.challengeId,
          challengeUrl: result.data.challengeUrl,
          expiresAt: result.data.expiresAt
        });
      } else {
        res.status(500).json({
          type: 'error',
          code: result.error?.code || 'CHALLENGE_CREATE_FAILED',
          message: result.error?.message || 'Failed to create challenge',
          recoverable: true,
          action: 'retry'
        });
      }

    } catch (error) {
      console.error('Challenge creation error:', error);
      res.status(500).json({
        type: 'error',
        code: 'CHALLENGE_CREATE_ERROR',
        message: 'Failed to create challenge',
        recoverable: true,
        action: 'retry'
      });
    }
  }
);

router.get<{ challengeId: string }, ChallengeLoadResponse | ErrorResponse>('/api/challenge/:challengeId', async (req, res): Promise<void> => {
  try {
    const { challengeId } = req.params;
    
    if (!challengeId) {
      res.status(400).json({
        type: 'error',
        code: 'MISSING_CHALLENGE_ID',
        message: 'Challenge ID is required',
        recoverable: false,
        action: 'retry'
      });
      return;
    }

    const challengeService = new ChallengeService(context);
    
    const result = await ErrorHandlingService.executeWithRetry(
      async () => {
        const challenge = await challengeService.loadChallenge(challengeId);
        if (!challenge) {
          throw new OperationError('CHALLENGE_NOT_FOUND', 'Challenge not found or expired');
        }
        return challenge;
      },
      'challenge_load'
    );

    if (result.success && result.data) {
      res.json({
        type: 'challenge_load',
        success: true,
        challenge: result.data
      });
    } else {
      res.status(404).json({
        type: 'error',
        code: result.error?.code || 'CHALLENGE_NOT_FOUND',
        message: result.error?.message || 'Challenge not found',
        recoverable: false,
        action: 'continue'
      });
    }

  } catch (error) {
    console.error('Challenge load error:', error);
    res.status(500).json({
      type: 'error',
      code: 'CHALLENGE_LOAD_ERROR',
      message: 'Failed to load challenge',
      recoverable: true,
      action: 'retry'
    });
  }
});

router.post<{}, ChallengeAcceptResponse | ErrorResponse, ChallengeAcceptRequest>(
  '/api/challenge/accept',
  async (req, res): Promise<void> => {
    try {
      const { challengeId } = req.body;
      
      const username = await reddit.getCurrentUsername();
      const ipAddress = req.clientIP;

      if (!username) {
        res.status(400).json({
          type: 'error',
          code: 'ANONYMOUS_USER',
          message: 'Must be logged in to accept challenges',
          recoverable: false,
          action: 'continue'
        });
        return;
      }

      // Check rate limiting for challenge acceptance
      const whitelistStatus = await RateLimitService.getWhitelistStatus(username);
      const rateLimitCheck = await RateLimitService.checkRateLimit(
        username, 
        'challenge_accept', 
        ipAddress, 
        whitelistStatus?.level
      );
      
      if (!rateLimitCheck.allowed) {
        res.status(429).json({
          type: 'error',
          code: 'RATE_LIMITED',
          message: RateLimitService.getRateLimitMessage(rateLimitCheck, 'challenge acceptance'),
          recoverable: true,
          action: 'wait'
        });
        return;
      }

      // Record the rate limit action
      await RateLimitService.recordAction(username, 'challenge_accept');
      if (ipAddress && ipAddress !== 'unknown') {
        await RateLimitService.recordIPAction(ipAddress, 'challenge_accept');
      }

      const challengeService = new ChallengeService(context);
      
      const result = await ErrorHandlingService.executeWithRetry(
        async () => {
          const session = await challengeService.acceptChallenge(challengeId, username);
          if (!session) {
            throw new OperationError('CHALLENGE_ACCEPT_FAILED', 'Failed to accept challenge');
          }
          return session;
        },
        'challenge_accept'
      );

      if (result.success && result.data) {
        res.json({
          type: 'challenge_accept',
          success: true,
          session: result.data
        });
      } else {
        res.status(500).json({
          type: 'error',
          code: result.error?.code || 'CHALLENGE_ACCEPT_FAILED',
          message: result.error?.message || 'Failed to accept challenge',
          recoverable: true,
          action: 'retry'
        });
      }

    } catch (error) {
      console.error('Challenge accept error:', error);
      res.status(500).json({
        type: 'error',
        code: 'CHALLENGE_ACCEPT_ERROR',
        message: 'Failed to accept challenge',
        recoverable: true,
        action: 'retry'
      });
    }
  }
);

router.post<{}, ChallengeSubmitResponse | ErrorResponse, ChallengeSubmitRequest>(
  '/api/challenge/submit',
  async (req, res): Promise<void> => {
    try {
      const { challengeId, reactionTime, rating } = req.body;
      
      const username = await reddit.getCurrentUsername();

      if (!username) {
        res.status(400).json({
          type: 'error',
          code: 'ANONYMOUS_USER',
          message: 'Must be logged in to submit challenge results',
          recoverable: false,
          action: 'continue'
        });
        return;
      }

      // Validate reaction time
      if (!ValidationService.validateReactionTime(reactionTime)) {
        res.status(400).json({
          type: 'error',
          code: 'INVALID_REACTION_TIME',
          message: 'Invalid reaction time for challenge submission',
          recoverable: false,
          action: 'retry'
        });
        return;
      }

      const challengeService = new ChallengeService(context);
      
      const result = await ErrorHandlingService.executeWithRetry(
        async () => {
          return await challengeService.submitChallengeResult(
            challengeId,
            username,
            reactionTime,
            rating
          );
        },
        'challenge_submit'
      );

      if (result.success && result.data) {
        res.json({
          type: 'challenge_submit',
          success: true,
          result: result.data
        });
      } else {
        res.status(500).json({
          type: 'error',
          code: result.error?.code || 'CHALLENGE_SUBMIT_FAILED',
          message: result.error?.message || 'Failed to submit challenge result',
          recoverable: true,
          action: 'retry'
        });
      }

    } catch (error) {
      console.error('Challenge submit error:', error);
      res.status(500).json({
        type: 'error',
        code: 'CHALLENGE_SUBMIT_ERROR',
        message: 'Failed to submit challenge result',
        recoverable: true,
        action: 'retry'
      });
    }
  }
);

// Challenge cleanup endpoint (for manual cleanup if needed)
// General cleanup route
router.post('/api/challenge/cleanup', async (req, res): Promise<void> => {
  try {
    const challengeService = new ChallengeService(context);
    
    // General cleanup (relies on TTL)
    const result = await challengeService.cleanupExpiredChallenges();
    res.json({
      type: 'challenge_cleanup' as const,
      success: true,
      challengeId: 'all',
      ...result
    });

  } catch (error) {
    console.error('Challenge cleanup error:', error);
    res.status(500).json({
      type: 'error',
      code: 'CHALLENGE_CLEANUP_ERROR',
      message: 'Failed to cleanup challenges',
      recoverable: true,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Specific challenge cleanup route
router.post<{ challengeId: string }>('/api/challenge/cleanup/:challengeId', async (req, res): Promise<void> => {
  try {
    const challengeId = req.params.challengeId;
    const challengeService = new ChallengeService(context);
    
    // Clean up specific challenge
    const cleaned = await challengeService.cleanupSpecificChallenge(challengeId);
    res.json({
      type: 'challenge_cleanup' as const,
      success: true,
      challengeId: challengeId,
      cleaned
    });

  } catch (error) {
    console.error('Challenge cleanup error:', error);
    res.status(500).json({
      type: 'error',
      code: 'CHALLENGE_CLEANUP_ERROR',
      message: 'Failed to cleanup challenge',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Challenge statistics endpoint
router.get('/api/challenge/stats', async (_req, res): Promise<void> => {
  try {
    const challengeService = new ChallengeService(context);
    const stats = await challengeService.getChallengeStats();
    
    res.json({
      type: 'challenge_stats',
      success: true,
      stats
    });

  } catch (error) {
    console.error('Challenge stats error:', error);
    res.status(500).json({
      type: 'error',
      code: 'CHALLENGE_STATS_ERROR',
      message: 'Failed to get challenge statistics',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Deterministic replay validation endpoint
router.post('/api/challenge/validate-replay', async (req, res): Promise<void> => {
  try {
    const { challengeId, replayData } = req.body;
    
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Must be logged in to validate replay data',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    if (!challengeId || !replayData) {
      res.status(400).json({
        type: 'error',
        code: 'MISSING_DATA',
        message: 'Challenge ID and replay data are required',
        recoverable: false,
        action: 'retry'
      });
      return;
    }

    const challengeService = new ChallengeService(context);
    
    const validationResult = await challengeService.validateReplayData(
      challengeId,
      username,
      replayData
    );

    // Store validation result
    await challengeService.storeReplayValidation(challengeId, username, validationResult);

    res.json({
      type: 'replay_validation',
      success: true,
      validation: validationResult
    });

  } catch (error) {
    console.error('Replay validation error:', error);
    res.status(500).json({
      type: 'error',
      code: 'REPLAY_VALIDATION_ERROR',
      message: 'Failed to validate replay data',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Timing synchronization endpoint
router.post('/api/challenge/synchronize', async (req, res): Promise<void> => {
  try {
    const { challengeId, participants } = req.body;
    
    if (!challengeId) {
      res.status(400).json({
        type: 'error',
        code: 'MISSING_CHALLENGE_ID',
        message: 'Challenge ID is required',
        recoverable: false,
        action: 'retry'
      });
      return;
    }

    const challengeService = new ChallengeService(context);
    
    const syncResult = await challengeService.synchronizeTiming(
      challengeId,
      participants || []
    );

    res.json({
      type: 'timing_synchronization',
      success: true,
      synchronization: syncResult
    });

  } catch (error) {
    console.error('Timing synchronization error:', error);
    res.status(500).json({
      type: 'error',
      code: 'SYNC_ERROR',
      message: 'Failed to synchronize timing',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Deterministic session endpoint
router.get('/api/challenge/:challengeId/session', async (req, res): Promise<void> => {
  try {
    const { challengeId } = req.params;
    
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(400).json({
        type: 'error',
        code: 'ANONYMOUS_USER',
        message: 'Must be logged in to get session data',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    const challengeService = new ChallengeService(context);
    
    const session = await challengeService.getDeterministicSession(challengeId, username);

    if (!session) {
      res.status(404).json({
        type: 'error',
        code: 'SESSION_NOT_FOUND',
        message: 'Deterministic session not found',
        recoverable: false,
        action: 'continue'
      });
      return;
    }

    res.json({
      type: 'deterministic_session',
      success: true,
      session
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({
      type: 'error',
      code: 'SESSION_ERROR',
      message: 'Failed to retrieve session data',
      recoverable: true,
      action: 'retry'
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

// Note: Data migrations are handled on-demand during API requests
// since Devvit only provides context during HTTP requests

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
