export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

// Game API Types
export type GameInitResponse = {
  type: 'game_init';
  session: import('./game.js').UserSession;
  leaderboardStats: LeaderboardStatsResponse;
};

export type ScoreSubmissionRequest = {
  reactionTime: number;
  rating: string;
  timestamp: string;
  scope: string;
  period: string;
};

export type ScoreSubmissionResponse = {
  type: 'score_submission';
  success: boolean;
  rank?: number | undefined;
  totalEntries?: number | undefined;
  personalBest?: number | undefined;
  percentile?: number | undefined;
  error?: string;
};

export type LeaderboardRequest = {
  scope: string;
  period: string;
  limit?: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  entries: import('./leaderboard.js').LeaderboardEntry[];
  userRank?: number | undefined;
  stats: LeaderboardStatsResponse;
};

export type LeaderboardStatsResponse = {
  totalEntries: number;
  averageTime: number;
  bestTime: number;
  worstTime: number;
  medianTime: number;
};

export type PreferencesUpdateRequest = {
  preferences: Partial<import('./game.js').UserPreferences>;
};

export type PreferencesUpdateResponse = {
  type: 'preferences_update';
  success: boolean;
  preferences?: import('./game.js').UserPreferences | undefined;
  error?: string;
};

export type UserStatsResponse = {
  type: 'user_stats';
  personalBest?: number | undefined;
  sessionStats: import('./game.js').SessionStatistics;
  behavioralProfile?: any;
};

export type ErrorResponse = {
  type: 'error';
  code: string;
  message: string;
  recoverable: boolean;
  action: 'retry' | 'wait' | 'continue' | 'refresh';
};

// User Activity API Types
export type UserActivityRequest = {
  type: 'game_start' | 'game_complete' | 'leaderboard_view' | 'challenge_create' | 'challenge_accept' | 'score_submission_attempt' | 'score_submission_success' | 'score_submission_failed';
  data?: any;
};

export type UserActivityResponse = {
  type: 'game_start' | 'game_complete' | 'leaderboard_view' | 'challenge_create' | 'challenge_accept' | 'score_submission_attempt' | 'score_submission_success' | 'score_submission_failed';
  data?: any;
  timestamp: number;
};

export type ActivityTrackingResponse = {
  type: 'activity_tracking';
  success: boolean;
  error?: string;
};

export type ActivityHistoryResponse = {
  type: 'activity_history';
  activities: UserActivityResponse[];
};

export type DataDeletionResponse = {
  type: 'data_deletion';
  success: boolean;
  error?: string;
};

// Challenge API Types
export type ChallengeCreateRequest = {
  reactionTime: number;
  rating: string;
  gameConfig: import('./game.js').GameConfiguration;
};

export type ChallengeCreateResponse = {
  type: 'challenge_create';
  success: boolean;
  challengeId?: string;
  challengeUrl?: string;
  expiresAt?: string;
  error?: string;
};

export type ChallengeLoadRequest = {
  challengeId: string;
};

export type ChallengeLoadResponse = {
  type: 'challenge_load';
  success: boolean;
  challenge?: import('./game.js').Challenge;
  error?: string;
};

export type ChallengeAcceptRequest = {
  challengeId: string;
};

export type ChallengeAcceptResponse = {
  type: 'challenge_accept';
  success: boolean;
  session?: import('./game.js').ChallengeSession;
  error?: string;
};

export type ChallengeSubmitRequest = {
  challengeId: string;
  reactionTime: number;
  rating: string;
};

export type ChallengeSubmitResponse = {
  type: 'challenge_submit';
  success: boolean;
  result?: import('./game.js').ChallengeResult;
  error?: string;
};

// Deterministic Replay API Types
export type ReplayValidationRequest = {
  challengeId: string;
  replayData: import('./game.js').ReplayValidationData;
};

export type ReplayValidationResponse = {
  type: 'replay_validation';
  success: boolean;
  validation?: {
    isValid: boolean;
    errors: string[];
    confidence: number;
  };
  error?: string;
};

export type TimingSynchronizationRequest = {
  challengeId: string;
  participants?: string[];
};

export type TimingSynchronizationResponse = {
  type: 'timing_synchronization';
  success: boolean;
  synchronization?: {
    synchronized: boolean;
    participants: string[];
    syncTimestamp: number;
  };
  error?: string;
};

export type DeterministicSessionResponse = {
  type: 'deterministic_session';
  success: boolean;
  session?: import('./game.js').DeterministicSession;
  error?: string;
};
