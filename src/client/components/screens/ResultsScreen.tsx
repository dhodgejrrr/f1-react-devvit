import { useState, useEffect } from 'react';
import { useGameContext } from '../../hooks/useGameContext.js';
import { GameState, LeaderboardScope, TimeFilter } from '../../../shared/types/game.js';
import { ScreenTransition, FadeTransition, StaggeredAnimation } from '../ui/ScreenTransitions.js';
import { ResultDisplay, ScreenFlash, AchievementBadge, PulseAnimation } from '../ui/VisualFeedback.js';
import { RankingDisplay } from '../ui/RankingDisplay.js';
import { DataService } from '../../services/DataService.js';
import { useUserSession } from '../../hooks/useUserSession.js';
import type { ScoreSubmissionResponse } from '../../types/index.js';

interface SubmissionState {
  isSubmitting: boolean;
  showModal: boolean;
  submitted: boolean;
  error: string | null;
  result: ScoreSubmissionResponse | null;
  scope: LeaderboardScope;
  period: TimeFilter;
  canRetry?: boolean;
}

export const ResultsScreen = () => {
  const { state, dispatch } = useGameContext();
  const { userSession, trackActivity } = useUserSession();
  const result = state.currentResult;
  const [showAchievement, setShowAchievement] = useState(false);
  const [screenFlashType, setScreenFlashType] = useState<'red' | 'green' | 'gold' | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showRankingDetails, setShowRankingDetails] = useState(false);
  
  // Score submission state
  const [submission, setSubmission] = useState<SubmissionState>({
    isSubmitting: false,
    showModal: false,
    submitted: false,
    error: null,
    result: null,
    scope: userSession?.preferences.preferredScope || 'global',
    period: 'alltime'
  });

  // Rate limit status
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);

  // Trigger screen flash and achievement on mount
  useEffect(() => {
    if (result) {
      // Trigger screen flash based on result
      if (result.rating === 'false_start') {
        setScreenFlashType('red');
      } else if (result.rating === 'perfect') {
        setScreenFlashType('gold');
      } else if (result.rating === 'excellent' || result.rating === 'good') {
        setScreenFlashType('green');
      }

      // Show achievement for personal best
      if (result.isPersonalBest && result.rating !== 'false_start') {
        setTimeout(() => setShowAchievement(true), 800);
      }

      // Start entrance animations
      setTimeout(() => setIsAnimating(false), 100);
    }
  }, [result]);

  const handlePlayAgain = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const handleBackToMenu = () => {
    dispatch({ type: 'TRANSITION_STATE', payload: GameState.SPLASH });
  };

  const handleViewLeaderboard = () => {
    dispatch({ type: 'TRANSITION_STATE', payload: GameState.LEADERBOARD });
  };

  const [challengeCreation, setChallengeCreation] = useState<{
    isCreating: boolean;
    showModal: boolean;
    created: boolean;
    error: string | null;
    challengeData: { challengeId: string; challengeUrl: string; expiresAt: string } | null;
  }>({
    isCreating: false,
    showModal: false,
    created: false,
    error: null,
    challengeData: null
  });

  const handleCreateChallenge = async () => {
    if (!result || !userSession) {
      console.error('Cannot create challenge: missing result or user session');
      return;
    }

    // Don't allow challenge creation for false starts
    if (result.rating === 'false_start') {
      alert('Cannot create challenge with a false start result.');
      return;
    }

    setChallengeCreation(prev => ({ ...prev, showModal: true, error: null }));
  };

  const handleConfirmChallengeCreation = async () => {
    if (!result || !userSession) return;

    setChallengeCreation(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      // Import ChallengeManager dynamically to avoid circular dependencies
      const { ChallengeManager } = await import('../../services/ChallengeManager.js');
      const challengeManager = new ChallengeManager();

      // Create challenge with current game result
      const challengeData = await challengeManager.createChallenge(
        result.reactionTime,
        result.rating,
        state.gameConfig
      );

      setChallengeCreation(prev => ({
        ...prev,
        isCreating: false,
        created: true,
        challengeData,
        showModal: false
      }));
      
      // Track challenge creation activity
      await trackActivity({
        type: 'challenge_create',
        data: {
          challengeId: challengeData.challengeId,
          reactionTime: result.reactionTime,
          rating: result.rating,
          expiresAt: challengeData.expiresAt
        }
      });

    } catch (error) {
      console.error('Failed to create challenge:', error);
      
      let errorMessage = 'Failed to create challenge. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('ANONYMOUS_USER')) {
          errorMessage = 'You must be logged in to create challenges.';
        } else if (error.message.includes('INVALID_REACTION_TIME')) {
          errorMessage = 'Invalid reaction time for challenge creation.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setChallengeCreation(prev => ({
        ...prev,
        isCreating: false,
        error: errorMessage
      }));
    }
  };

  const handleCancelChallengeCreation = () => {
    setChallengeCreation(prev => ({ 
      ...prev, 
      showModal: false, 
      error: null,
      isCreating: false 
    }));
  };

  const handleShareChallenge = async (method: 'copy' | 'reddit' | 'native') => {
    if (!challengeCreation.challengeData) return;

    const { challengeUrl, challengeId } = challengeCreation.challengeData;
    const shareText = `🏎️ F1 Start Challenge! I got ${result?.reactionTime}ms (${result?.rating.toUpperCase()}). Can you beat my reaction time? Challenge ID: ${challengeId}`;
    const fullShareText = `${shareText}\n\n${challengeUrl}`;

    try {
      switch (method) {
        case 'copy':
          await navigator.clipboard.writeText(fullShareText);
          alert('Challenge link copied to clipboard!');
          break;
          
        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: 'F1 Start Challenge',
              text: shareText,
              url: challengeUrl
            });
          } else {
            // Fallback to copy
            await navigator.clipboard.writeText(fullShareText);
            alert('Challenge link copied to clipboard!');
          }
          break;
          
        case 'reddit':
          // Create a Reddit post URL with pre-filled content
          const redditTitle = encodeURIComponent(`F1 Start Challenge: ${result?.reactionTime}ms reaction time!`);
          const redditText = encodeURIComponent(`I just achieved a ${result?.reactionTime}ms reaction time (${result?.rating.toUpperCase()}) in the F1 Start Challenge!\n\nCan you beat my time? Accept my challenge here: ${challengeUrl}\n\nChallenge expires: ${new Date(challengeCreation.challengeData.expiresAt).toLocaleDateString()}`);
          const redditUrl = `https://www.reddit.com/submit?title=${redditTitle}&text=${redditText}`;
          window.open(redditUrl, '_blank');
          break;
      }
    } catch (error) {
      console.error('Failed to share challenge:', error);
      alert('Failed to share challenge. Please try copying the link manually.');
    }
  };

  const handleCloseChallengeSuccess = () => {
    setChallengeCreation(prev => ({ 
      ...prev, 
      created: false, 
      challengeData: null 
    }));
  };

  // Score submission handlers
  const handleSubmitScore = async () => {
    if (!result || result.rating === 'false_start' || submission.submitted) return;
    
    // Check rate limit status before showing modal
    try {
      const rateLimitData = await DataService.getRateLimitStatus('score_submission');
      setRateLimitStatus(rateLimitData);
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
    }
    
    setSubmission(prev => ({ ...prev, showModal: true, error: null }));
  };

  const handleConfirmSubmission = async () => {
    if (!result || !userSession) return;

    setSubmission(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Track submission attempt
      trackActivity('score_submission_attempt', {
        reactionTime: result.reactionTime,
        rating: result.rating,
        scope: submission.scope,
        period: submission.period
      });

      const submissionRequest = {
        reactionTime: result.reactionTime,
        rating: result.rating,
        timestamp: new Date().toISOString(),
        scope: submission.scope,
        period: submission.period
      };

      const response = await DataService.submitScore(submissionRequest);

      // Update submission state with optimistic UI
      setSubmission(prev => ({
        ...prev,
        isSubmitting: false,
        submitted: true,
        showModal: false,
        result: response,
        error: null
      }));

      // Track successful submission
      trackActivity('score_submission_success', {
        reactionTime: result.reactionTime,
        rank: response.rank,
        percentile: response.percentile
      });

      // Show achievement if it's a new personal best
      if (response.personalBest && response.personalBest === result.reactionTime) {
        setTimeout(() => setShowAchievement(true), 500);
      }

      // Show detailed ranking information after successful submission
      setTimeout(() => setShowRankingDetails(true), 1000);

    } catch (error) {
      console.error('Score submission failed:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to submit score';
      let canRetry = true;
      
      if (error instanceof Error) {
        if (error.message.includes('RATE_LIMITED') || error.message.includes('Too Many Requests') || (error as any)?.status === 429) {
          errorMessage = 'Too many submissions. Please wait a minute before trying again.';
          canRetry = false;
        } else if (error.message.includes('DUPLICATE_SUBMISSION')) {
          errorMessage = 'This score has already been submitted.';
          canRetry = false;
        } else if (error.message.includes('VALIDATION_FAILED')) {
          errorMessage = 'Invalid score data. Please try playing again.';
          canRetry = false;
        } else {
          errorMessage = error.message;
        }
      }
      
      // Handle submission error with rollback
      setSubmission(prev => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage,
        showModal: canRetry, // Only keep modal open if retry is possible
        canRetry
      }));

      // Track submission failure
      trackActivity('score_submission_failed', {
        reactionTime: result.reactionTime,
        error: errorMessage
      });

      // If can't retry, close modal after showing error briefly
      if (!canRetry) {
        setTimeout(() => {
          setSubmission(prev => ({ ...prev, showModal: false, error: null }));
        }, 3000);
      }
    }
  };

  const handleCancelSubmission = () => {
    setSubmission(prev => ({ 
      ...prev, 
      showModal: false, 
      error: null,
      isSubmitting: false 
    }));
  };

  const handleRetrySubmission = () => {
    setSubmission(prev => ({ ...prev, error: null }));
    handleConfirmSubmission();
  };

  const handleScopeChange = (newScope: LeaderboardScope) => {
    setSubmission(prev => ({ ...prev, scope: newScope }));
  };

  const handlePeriodChange = (newPeriod: TimeFilter) => {
    setSubmission(prev => ({ ...prev, period: newPeriod }));
  };





  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-arcade text-large color-red">NO RESULT DATA</div>
      </div>
    );
  }

  // Get result color based on rating
  const getResultColor = () => {
    if (result.rating === 'false_start') return 'color-red';
    if (result.rating === 'perfect') return 'color-gold';
    if (result.rating === 'excellent') return 'color-green';
    if (result.rating === 'good') return 'color-yellow';
    return 'color-white';
  };

  // Get result message
  const getResultMessage = () => {
    if (result.rating === 'false_start') {
      return 'FALSE START!';
    }
    return 'REACTION TIME';
  };

  // Create action buttons array for staggered animation
  const actionButtons = [
    <button
      key="play-again"
      onClick={handlePlayAgain}
      className="text-arcade arcade-focus instant-change touch-target"
      style={{
        padding: 'var(--spacing-md) var(--spacing-lg)',
        backgroundColor: 'var(--color-green)',
        color: 'var(--color-black)',
        fontSize: 'clamp(16px, 3vw, 20px)',
        border: '2px solid var(--color-white)',
        borderRadius: '0',
        cursor: 'pointer',
        width: '100%'
      }}
    >
      PLAY AGAIN
    </button>
  ];

  if (result.rating !== 'false_start') {
    actionButtons.push(
      <button
        key="submit-score"
        onClick={handleSubmitScore}
        disabled={submission.submitted || submission.isSubmitting}
        className="text-arcade arcade-focus instant-change touch-target"
        style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          backgroundColor: submission.submitted 
            ? 'var(--color-green)' 
            : submission.isSubmitting 
              ? 'var(--color-black)' 
              : 'var(--color-yellow)',
          color: submission.submitted || submission.isSubmitting 
            ? 'var(--color-white)' 
            : 'var(--color-black)',
          fontSize: 'clamp(16px, 3vw, 20px)',
          border: '2px solid var(--color-white)',
          borderRadius: '0',
          cursor: submission.submitted || submission.isSubmitting ? 'not-allowed' : 'pointer',
          opacity: submission.submitted || submission.isSubmitting ? 0.8 : 1,
          width: '100%'
        }}
      >
        {submission.submitted 
          ? '✓ SCORE SUBMITTED' 
          : submission.isSubmitting 
            ? 'SUBMITTING...' 
            : 'SUBMIT SCORE'}
      </button>
    );

    // Add challenge creation button
    actionButtons.push(
      <button
        key="create-challenge"
        onClick={handleCreateChallenge}
        disabled={challengeCreation.created || challengeCreation.isCreating}
        className="text-arcade arcade-focus instant-change touch-target"
        style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          backgroundColor: challengeCreation.created 
            ? 'var(--color-green)' 
            : challengeCreation.isCreating 
              ? 'var(--color-black)' 
              : 'var(--color-blue)',
          color: challengeCreation.created || challengeCreation.isCreating 
            ? 'var(--color-white)' 
            : 'var(--color-white)',
          fontSize: 'clamp(16px, 3vw, 20px)',
          border: '2px solid var(--color-white)',
          borderRadius: '0',
          cursor: challengeCreation.created || challengeCreation.isCreating ? 'not-allowed' : 'pointer',
          opacity: challengeCreation.created || challengeCreation.isCreating ? 0.8 : 1,
          width: '100%'
        }}
      >
        {challengeCreation.created 
          ? '✓ CHALLENGE CREATED' 
          : challengeCreation.isCreating 
            ? 'CREATING...' 
            : 'CREATE CHALLENGE'}
      </button>
    );
  }

  const secondaryButtons = [];
  
  if (result.rating !== 'false_start') {
    secondaryButtons.push(
      <button
        key="ranking-details"
        onClick={() => setShowRankingDetails(!showRankingDetails)}
        className="text-arcade arcade-focus instant-change touch-target"
        style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          backgroundColor: showRankingDetails ? 'var(--color-yellow)' : 'var(--color-black)',
          color: showRankingDetails ? 'var(--color-black)' : 'var(--color-white)',
          fontSize: 'clamp(12px, 2.5vw, 16px)',
          border: '2px solid var(--color-white)',
          borderRadius: '0',
          cursor: 'pointer'
        }}
      >
        {showRankingDetails ? 'HIDE ANALYSIS' : 'SHOW ANALYSIS'}
      </button>,
      <button
        key="create-challenge"
        onClick={handleCreateChallenge}
        disabled={challengeCreation.isCreating || challengeCreation.created}
        className="text-arcade arcade-focus instant-change touch-target"
        style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          backgroundColor: challengeCreation.created 
            ? 'var(--color-green)' 
            : challengeCreation.isCreating 
              ? 'var(--color-black)' 
              : 'var(--color-black)',
          color: challengeCreation.created || challengeCreation.isCreating 
            ? 'var(--color-white)' 
            : 'var(--color-white)',
          fontSize: 'clamp(12px, 2.5vw, 16px)',
          border: '2px solid var(--color-white)',
          borderRadius: '0',
          cursor: challengeCreation.created || challengeCreation.isCreating ? 'not-allowed' : 'pointer',
          opacity: challengeCreation.created || challengeCreation.isCreating ? 0.8 : 1
        }}
      >
        {challengeCreation.created 
          ? '✓ CHALLENGE CREATED' 
          : challengeCreation.isCreating 
            ? 'CREATING...' 
            : 'CREATE CHALLENGE'}
      </button>
    );
  }

  secondaryButtons.push(
    <button
      key="leaderboard"
      onClick={handleViewLeaderboard}
      className="text-arcade arcade-focus instant-change touch-target"
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: 'var(--color-black)',
        color: 'var(--color-white)',
        fontSize: 'clamp(12px, 2.5vw, 16px)',
        border: '2px solid var(--color-white)',
        borderRadius: '0',
        cursor: 'pointer'
      }}
    >
      LEADERBOARD
    </button>,
    <button
      key="main-menu"
      onClick={handleBackToMenu}
      className="text-arcade arcade-focus instant-change touch-target"
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: 'var(--color-black)',
        color: 'var(--color-white)',
        fontSize: 'clamp(12px, 2.5vw, 16px)',
        border: '2px solid var(--color-white)',
        borderRadius: '0',
        cursor: 'pointer'
      }}
    >
      MAIN MENU
    </button>
  );

  return (
    <ScreenTransition isVisible={true} direction="fade" duration={300}>
      <div className="arcade-container" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        gap: 'var(--spacing-xl)', 
        padding: 'var(--spacing-lg)' 
      }}>
        {/* Screen Flash Effect */}
        <ScreenFlash 
          type={screenFlashType} 
          onComplete={() => setScreenFlashType(null)} 
        />

        {/* Hero Result Display */}
        <FadeTransition isVisible={!isAnimating} delay={200} duration={500}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <h1 className={`text-arcade text-hero instant-change ${getResultColor()}`}>
              {getResultMessage()}
            </h1>

            {result.rating !== 'false_start' && (
              <PulseAnimation isActive={result.rating === 'perfect'} color="gold">
                <div className="text-arcade color-white" style={{ fontSize: 'clamp(48px, 10vw, 80px)', lineHeight: '1' }}>
                  {result.reactionTime}
                  <span className="text-arcade color-white" style={{ fontSize: 'clamp(24px, 5vw, 40px)' }}>MS</span>
                </div>
              </PulseAnimation>
            )}
          </div>
        </FadeTransition>

        {/* Enhanced Result Display */}
        <FadeTransition isVisible={!isAnimating} delay={400} duration={500}>
          <ResultDisplay
            time={result.reactionTime}
            rating={result.rating}
            isPersonalBest={result.isPersonalBest}
            driverComparison={result.driverComparison}
            communityPercentile={result.communityPercentile}
          />
        </FadeTransition>

        {/* Performance Stats */}
        {result.rating !== 'false_start' && (
          <FadeTransition isVisible={!isAnimating} delay={600} duration={500}>
            <div className="arcade-container" style={{
              backgroundColor: 'var(--color-black)',
              padding: 'var(--spacing-lg)',
              border: '2px solid var(--color-white)',
              maxWidth: '400px',
              width: '100%'
            }}>
              <h3 className="text-arcade text-large color-yellow" style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
                PERFORMANCE
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-arcade text-small color-white">RATING:</span>
                  <span className={`text-arcade text-small ${getResultColor()}`}>{result.rating.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-arcade text-small color-white">PERCENTILE:</span>
                  <span className="text-arcade text-small color-white">{result.communityPercentile}%</span>
                </div>
                {result.driverComparison && (
                  <div style={{ marginTop: 'var(--spacing-sm)' }}>
                    <div className="text-arcade text-small color-white" style={{ textAlign: 'center' }}>
                      {result.driverComparison.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FadeTransition>
        )}

        {/* Detailed Ranking Analysis */}
        {result.rating !== 'false_start' && showRankingDetails && (
          <RankingDisplay
            reactionTime={result.reactionTime}
            scope={submission.scope}
            period={submission.period}
            isVisible={showRankingDetails}
          />
        )}

        {/* Action Buttons with Staggered Animation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', width: '100%', maxWidth: '600px' }}>
          <StaggeredAnimation
            items={actionButtons}
            isVisible={!isAnimating}
            staggerDelay={150}
            animationType="slide-up"
          />
        </div>

        {/* Secondary Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <StaggeredAnimation
              items={secondaryButtons}
              isVisible={!isAnimating}
              staggerDelay={100}
              animationType="fade"
            />
          </div>
        </div>

        {/* Tips for improvement */}
        {result.rating === 'false_start' && (
          <FadeTransition isVisible={!isAnimating} delay={800} duration={500}>
            <div className="text-arcade text-small color-white" style={{ textAlign: 'center', maxWidth: '400px' }}>
              <p style={{ marginBottom: 'var(--spacing-xs)' }}>REMEMBER: WAIT FOR ALL LIGHTS TO GO OUT BEFORE REACTING</p>
              <p>PATIENCE IS KEY TO A GOOD START!</p>
            </div>
          </FadeTransition>
        )}

        {/* Submission Success Feedback */}
        {submission.submitted && submission.result && (
          <FadeTransition isVisible={true} delay={0} duration={500}>
            <div className="arcade-container" style={{
              backgroundColor: 'var(--color-black)',
              padding: 'var(--spacing-lg)',
              border: '2px solid var(--color-green)',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center'
            }}>
              <div className="text-arcade text-medium color-green" style={{ marginBottom: 'var(--spacing-md)' }}>
                ✓ SCORE SUBMITTED!
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {submission.result.rank && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-arcade text-small color-white">YOUR RANK:</span>
                    <span className="text-arcade text-small color-yellow">#{submission.result.rank}</span>
                  </div>
                )}
                {submission.result.percentile && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-arcade text-small color-white">PERCENTILE:</span>
                    <span className="text-arcade text-small color-white">{submission.result.percentile}%</span>
                  </div>
                )}
                {submission.result.totalEntries && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-arcade text-small color-white">TOTAL PLAYERS:</span>
                    <span className="text-arcade text-small color-white">{submission.result.totalEntries}</span>
                  </div>
                )}
              </div>
            </div>
          </FadeTransition>
        )}

        {/* Challenge Creation Modal */}
        {challengeCreation.showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-lg)'
          }}>
            <FadeTransition isVisible={true} delay={0} duration={200}>
              <div className="arcade-container" style={{
                backgroundColor: 'var(--color-black)',
                padding: 'var(--spacing-xl)',
                border: '2px solid var(--color-white)',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <h2 className="text-arcade text-large color-yellow" style={{ 
                  textAlign: 'center', 
                  marginBottom: 'var(--spacing-lg)' 
                }}>
                  CREATE CHALLENGE
                </h2>

                {/* Error Display */}
                {challengeCreation.error && (
                  <div style={{
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid var(--color-red)',
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    textAlign: 'center'
                  }}>
                    <div className="text-arcade text-small color-red" style={{ marginBottom: 'var(--spacing-sm)' }}>
                      CHALLENGE CREATION FAILED
                    </div>
                    <div className="text-arcade text-small color-white">
                      {challengeCreation.error}
                    </div>
                  </div>
                )}

                {/* Challenge Preview */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)',
                  textAlign: 'center'
                }}>
                  <div className="text-arcade text-medium color-white" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    YOUR TIME: {result?.reactionTime}MS
                  </div>
                  <div className={`text-arcade text-small ${getResultColor()}`} style={{ marginBottom: 'var(--spacing-sm)' }}>
                    RATING: {result?.rating.toUpperCase()}
                  </div>
                  <div className="text-arcade text-small color-white">
                    DIFFICULTY: {state.gameConfig.difficultyMode.toUpperCase()}
                  </div>
                </div>

                {/* Challenge Information */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 0, 0.1)',
                  border: '1px solid var(--color-yellow)',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div className="text-arcade text-small color-yellow" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    CHALLENGE DETAILS:
                  </div>
                  <div className="text-arcade text-small color-white" style={{ lineHeight: '1.4' }}>
                    • Opponents will face the same light sequence timing<br/>
                    • Challenge expires in 7 days<br/>
                    • Results will show head-to-head comparison<br/>
                    • You can share the challenge link on Reddit or social media
                  </div>
                </div>

                {/* Game Configuration Display */}
                <div style={{
                  backgroundColor: 'rgba(0, 255, 255, 0.1)',
                  border: '1px solid var(--color-white)',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div className="text-arcade text-small color-white" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    GAME SETTINGS:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-arcade text-small color-white">Light Interval:</span>
                      <span className="text-arcade text-small color-yellow">{state.gameConfig.lightInterval}ms</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-arcade text-small color-white">Random Delay:</span>
                      <span className="text-arcade text-small color-yellow">
                        {state.gameConfig.minRandomDelay}-{state.gameConfig.maxRandomDelay}ms
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-arcade text-small color-white">Difficulty:</span>
                      <span className="text-arcade text-small color-yellow">
                        {state.gameConfig.difficultyMode.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                  <button
                    onClick={handleConfirmChallengeCreation}
                    disabled={challengeCreation.isCreating}
                    className="text-arcade arcade-focus instant-change touch-target"
                    style={{
                      padding: 'var(--spacing-md)',
                      backgroundColor: challengeCreation.isCreating ? 'var(--color-black)' : 'var(--color-green)',
                      color: challengeCreation.isCreating ? 'var(--color-white)' : 'var(--color-black)',
                      fontSize: 'clamp(12px, 2.5vw, 16px)',
                      border: '2px solid var(--color-white)',
                      borderRadius: '0',
                      cursor: challengeCreation.isCreating ? 'not-allowed' : 'pointer',
                      opacity: challengeCreation.isCreating ? 0.6 : 1,
                      flex: 1
                    }}
                  >
                    {challengeCreation.isCreating ? 'CREATING...' : 'CREATE CHALLENGE'}
                  </button>
                  <button
                    onClick={handleCancelChallengeCreation}
                    disabled={challengeCreation.isCreating}
                    className="text-arcade arcade-focus instant-change touch-target"
                    style={{
                      padding: 'var(--spacing-md)',
                      backgroundColor: 'var(--color-black)',
                      color: 'var(--color-white)',
                      fontSize: 'clamp(12px, 2.5vw, 16px)',
                      border: '2px solid var(--color-white)',
                      borderRadius: '0',
                      cursor: challengeCreation.isCreating ? 'not-allowed' : 'pointer',
                      opacity: challengeCreation.isCreating ? 0.6 : 1,
                      flex: 1
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </FadeTransition>
          </div>
        )}

        {/* Challenge Success Display */}
        {challengeCreation.created && challengeCreation.challengeData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: 'var(--spacing-lg)'
          }}>
            <FadeTransition isVisible={true} delay={0} duration={300}>
              <div className="arcade-container" style={{
                backgroundColor: 'var(--color-black)',
                padding: 'var(--spacing-xl)',
                border: '2px solid var(--color-green)',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                textAlign: 'center'
              }}>
                <div className="text-arcade text-large color-green" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  ✓ CHALLENGE CREATED!
                </div>

                {/* Challenge Details */}
                <div style={{
                  backgroundColor: 'rgba(0, 255, 0, 0.1)',
                  border: '1px solid var(--color-green)',
                  padding: 'var(--spacing-lg)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div className="text-arcade text-medium color-white" style={{ marginBottom: 'var(--spacing-md)' }}>
                    CHALLENGE ID: {challengeCreation.challengeData.challengeId}
                  </div>
                  <div className="text-arcade text-small color-white" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    YOUR TIME TO BEAT: {result?.reactionTime}MS ({result?.rating.toUpperCase()})
                  </div>
                  <div className="text-arcade text-small color-white">
                    EXPIRES: {new Date(challengeCreation.challengeData.expiresAt).toLocaleDateString()} at {new Date(challengeCreation.challengeData.expiresAt).toLocaleTimeString()}
                  </div>
                </div>

                {/* Challenge URL Display */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--color-white)',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)',
                  wordBreak: 'break-all'
                }}>
                  <div className="text-arcade text-small color-yellow" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    CHALLENGE URL:
                  </div>
                  <div className="text-arcade text-small color-white" style={{ 
                    fontFamily: 'monospace',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--color-white)'
                  }}>
                    {challengeCreation.challengeData.challengeUrl}
                  </div>
                </div>

                {/* Share Options */}
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div className="text-arcade text-small color-yellow" style={{ marginBottom: 'var(--spacing-md)' }}>
                    SHARE YOUR CHALLENGE:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <button
                      onClick={() => handleShareChallenge('copy')}
                      className="text-arcade arcade-focus instant-change touch-target"
                      style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--color-yellow)',
                        color: 'var(--color-black)',
                        fontSize: 'clamp(12px, 2.5vw, 16px)',
                        border: '2px solid var(--color-white)',
                        borderRadius: '0',
                        cursor: 'pointer'
                      }}
                    >
                      📋 COPY LINK TO CLIPBOARD
                    </button>
                    <button
                      onClick={() => handleShareChallenge('reddit')}
                      className="text-arcade arcade-focus instant-change touch-target"
                      style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--color-black)',
                        color: 'var(--color-white)',
                        fontSize: 'clamp(12px, 2.5vw, 16px)',
                        border: '2px solid var(--color-white)',
                        borderRadius: '0',
                        cursor: 'pointer'
                      }}
                    >
                      🔗 SHARE ON REDDIT
                    </button>
                    {navigator.share && (
                      <button
                        onClick={() => handleShareChallenge('native')}
                        className="text-arcade arcade-focus instant-change touch-target"
                        style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'var(--color-black)',
                          color: 'var(--color-white)',
                          fontSize: 'clamp(12px, 2.5vw, 16px)',
                          border: '2px solid var(--color-white)',
                          borderRadius: '0',
                          cursor: 'pointer'
                        }}
                      >
                        📱 SHARE VIA DEVICE
                      </button>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 0, 0.1)',
                  border: '1px solid var(--color-yellow)',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div className="text-arcade text-small color-yellow" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    HOW IT WORKS:
                  </div>
                  <div className="text-arcade text-small color-white" style={{ lineHeight: '1.4', textAlign: 'left' }}>
                    1. Share the challenge link with friends<br/>
                    2. They click the link to accept your challenge<br/>
                    3. They play with the same exact timing sequence<br/>
                    4. Results show head-to-head comparison<br/>
                    5. Challenge expires automatically in 7 days
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleCloseChallengeSuccess}
                  className="text-arcade arcade-focus instant-change touch-target"
                  style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    backgroundColor: 'var(--color-green)',
                    color: 'var(--color-black)',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    border: '2px solid var(--color-white)',
                    borderRadius: '0',
                    cursor: 'pointer'
                  }}
                >
                  CLOSE
                </button>
              </div>
            </FadeTransition>
          </div>
        )}

        {/* Score Submission Modal */}
        {submission.showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-lg)'
          }}>
            <FadeTransition isVisible={true} delay={0} duration={200}>
              <div className="arcade-container" style={{
                backgroundColor: 'var(--color-black)',
                padding: 'var(--spacing-xl)',
                border: '2px solid var(--color-white)',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <h2 className="text-arcade text-large color-yellow" style={{ 
                  textAlign: 'center', 
                  marginBottom: 'var(--spacing-lg)' 
                }}>
                  SUBMIT SCORE
                </h2>

                {/* Error Display */}
                {submission.error && (
                  <div style={{
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid var(--color-red)',
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    textAlign: 'center'
                  }}>
                    <div className="text-arcade text-small color-red" style={{ marginBottom: 'var(--spacing-sm)' }}>
                      SUBMISSION FAILED
                    </div>
                    <div className="text-arcade text-small color-white">
                      {submission.error}
                    </div>
                  </div>
                )}

                {/* Score Summary */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)',
                  textAlign: 'center'
                }}>
                  <div className="text-arcade text-medium color-white" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    YOUR TIME: {result?.reactionTime}MS
                  </div>
                  <div className={`text-arcade text-small ${getResultColor()}`}>
                    RATING: {result?.rating.toUpperCase()}
                  </div>
                </div>

                {/* Scope Selection */}
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div className="text-arcade text-small color-yellow" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    LEADERBOARD SCOPE:
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    {(['global', 'r/subreddit'] as LeaderboardScope[]).map((scope) => (
                      <button
                        key={scope}
                        onClick={() => handleScopeChange(scope)}
                        disabled={submission.isSubmitting}
                        className="text-arcade arcade-focus instant-change touch-target"
                        style={{
                          padding: 'var(--spacing-sm) var(--spacing-md)',
                          backgroundColor: submission.scope === scope ? 'var(--color-yellow)' : 'var(--color-black)',
                          color: submission.scope === scope ? 'var(--color-black)' : 'var(--color-white)',
                          fontSize: 'clamp(10px, 2vw, 14px)',
                          border: '2px solid var(--color-white)',
                          borderRadius: '0',
                          cursor: submission.isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: submission.isSubmitting ? 0.6 : 1,
                          flex: 1
                        }}
                      >
                        {scope === 'global' ? 'GLOBAL' : 'SUBREDDIT'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period Selection */}
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div className="text-arcade text-small color-yellow" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    TIME PERIOD:
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    {(['alltime', 'weekly', 'daily'] as TimeFilter[]).map((period) => (
                      <button
                        key={period}
                        onClick={() => handlePeriodChange(period)}
                        disabled={submission.isSubmitting}
                        className="text-arcade arcade-focus instant-change touch-target"
                        style={{
                          padding: 'var(--spacing-sm)',
                          backgroundColor: submission.period === period ? 'var(--color-yellow)' : 'var(--color-black)',
                          color: submission.period === period ? 'var(--color-black)' : 'var(--color-white)',
                          fontSize: 'clamp(8px, 1.5vw, 12px)',
                          border: '2px solid var(--color-white)',
                          borderRadius: '0',
                          cursor: submission.isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: submission.isSubmitting ? 0.6 : 1,
                          flex: 1
                        }}
                      >
                        {period.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rate Limit Information */}
                {rateLimitStatus && rateLimitStatus.remaining && (
                  <div style={{
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid var(--color-white)',
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)'
                  }}>
                    <div className="text-arcade text-small color-white" style={{ marginBottom: 'var(--spacing-sm)' }}>
                      SUBMISSION LIMITS:
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                      <span className="text-arcade text-small color-white">Remaining today:</span>
                      <span className="text-arcade text-small color-yellow">{rateLimitStatus.remaining.day}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                      <span className="text-arcade text-small color-white">Remaining this hour:</span>
                      <span className="text-arcade text-small color-yellow">{rateLimitStatus.remaining.hour}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-arcade text-small color-white">Remaining this minute:</span>
                      <span className="text-arcade text-small color-yellow">{rateLimitStatus.remaining.minute}</span>
                    </div>
                    {rateLimitStatus.isLimited && (
                      <div className="text-arcade text-small color-red" style={{ marginTop: 'var(--spacing-sm)' }}>
                        ⚠️ RATE LIMIT REACHED - PLEASE WAIT
                      </div>
                    )}
                  </div>
                )}

                {/* Consent Notice */}
                <div style={{
                  backgroundColor: 'rgba(255, 255, 0, 0.1)',
                  border: '1px solid var(--color-yellow)',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div className="text-arcade text-small color-yellow" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    PRIVACY NOTICE:
                  </div>
                  <div className="text-arcade text-small color-white" style={{ lineHeight: '1.4' }}>
                    Your username and reaction time will be stored in the leaderboard. 
                    You can delete your data anytime from the settings menu.
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                  {submission.error ? (
                    <>
                      {submission.canRetry !== false && (
                        <button
                          onClick={handleRetrySubmission}
                          disabled={submission.isSubmitting}
                          className="text-arcade arcade-focus instant-change touch-target"
                          style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--color-yellow)',
                            color: 'var(--color-black)',
                            fontSize: 'clamp(12px, 2.5vw, 16px)',
                            border: '2px solid var(--color-white)',
                            borderRadius: '0',
                            cursor: submission.isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: submission.isSubmitting ? 0.6 : 1,
                            flex: 1
                          }}
                        >
                          {submission.isSubmitting ? 'RETRYING...' : 'RETRY'}
                        </button>
                      )}
                      <button
                        onClick={handleCancelSubmission}
                        disabled={submission.isSubmitting}
                        className="text-arcade arcade-focus instant-change touch-target"
                        style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'var(--color-black)',
                          color: 'var(--color-white)',
                          fontSize: 'clamp(12px, 2.5vw, 16px)',
                          border: '2px solid var(--color-white)',
                          borderRadius: '0',
                          cursor: submission.isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: submission.isSubmitting ? 0.6 : 1,
                          flex: submission.canRetry !== false ? 1 : 2
                        }}
                      >
                        {submission.canRetry === false ? 'CLOSE' : 'CANCEL'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleConfirmSubmission}
                        disabled={submission.isSubmitting || (rateLimitStatus?.isLimited)}
                        className="text-arcade arcade-focus instant-change touch-target"
                        style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: (rateLimitStatus?.isLimited) ? 'var(--color-black)' : 'var(--color-green)',
                          color: (rateLimitStatus?.isLimited) ? 'var(--color-red)' : 'var(--color-black)',
                          fontSize: 'clamp(12px, 2.5vw, 16px)',
                          border: '2px solid var(--color-white)',
                          borderRadius: '0',
                          cursor: (submission.isSubmitting || rateLimitStatus?.isLimited) ? 'not-allowed' : 'pointer',
                          opacity: (submission.isSubmitting || rateLimitStatus?.isLimited) ? 0.6 : 1,
                          flex: 1
                        }}
                      >
                        {submission.isSubmitting ? 'SUBMITTING...' : 
                         rateLimitStatus?.isLimited ? 'RATE LIMITED' : 'CONFIRM SUBMIT'}
                      </button>
                      <button
                        onClick={handleCancelSubmission}
                        disabled={submission.isSubmitting}
                        className="text-arcade arcade-focus instant-change touch-target"
                        style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'var(--color-black)',
                          color: 'var(--color-white)',
                          fontSize: 'clamp(12px, 2.5vw, 16px)',
                          border: '2px solid var(--color-white)',
                          borderRadius: '0',
                          cursor: submission.isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: submission.isSubmitting ? 0.6 : 1,
                          flex: 1
                        }}
                      >
                        CANCEL
                      </button>
                    </>
                  )}
                </div>
              </div>
            </FadeTransition>
          </div>
        )}

        {/* Achievement Badge */}
        {showAchievement && result.isPersonalBest && (
          <AchievementBadge
            achievement={{
              title: 'PERSONAL BEST!',
              description: 'New fastest reaction time!',
              icon: '🏆',
              rarity: result.rating === 'perfect' ? 'legendary' : 'epic'
            }}
            isVisible={showAchievement}
            onClose={() => setShowAchievement(false)}
          />
        )}
      </div>
    </ScreenTransition>
  );
};
