import React, { useState, useEffect } from 'react';
import { Challenge, ChallengeSession, GameState } from '../../../shared/types/game.js';
import { ChallengeManager } from '../../services/ChallengeManager.js';
import { useGameContext } from '../../hooks/useGameContext.js';
import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { LoadingScreen } from '../ui/LoadingStates.js';

interface ChallengeScreenProps {
  challengeId: string;
  onAcceptChallenge: (session: ChallengeSession) => void;
  onBackToMenu: () => void;
  challengeManager: ChallengeManager;
}

interface ChallengeScreenState {
  challenge: Challenge | null;
  loading: boolean;
  error: string | null;
  accepting: boolean;
  validating: boolean;
  showValidationDetails: boolean;
  validationResult: {
    isValid: boolean;
    errors: string[];
    confidence: number;
  } | null;
}

export const ChallengeScreen: React.FC<ChallengeScreenProps> = ({
  challengeId,
  onAcceptChallenge,
  onBackToMenu,
  challengeManager
}) => {
  const { dispatch } = useGameContext();
  const [state, setState] = useState<ChallengeScreenState>({
    challenge: null,
    loading: true,
    error: null,
    accepting: false,
    validating: false,
    showValidationDetails: false,
    validationResult: null
  });

  // Load challenge data on mount
  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  const loadChallenge = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const challenge = await challengeManager.loadChallenge(challengeId);
      
      if (!challenge) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Challenge not found or has expired' 
        }));
        return;
      }

      setState(prev => ({ 
        ...prev, 
        challenge, 
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to load challenge:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load challenge' 
      }));
    }
  };

  const handleAcceptChallenge = async () => {
    if (!state.challenge) return;

    try {
      setState(prev => ({ ...prev, accepting: true, validating: true }));
      
      // Load and validate the challenge
      const session = await challengeManager.acceptChallenge(challengeId);
      
      // Validate session before proceeding
      if (!challengeManager.validateSession(session)) {
        throw new Error('Invalid challenge session');
      }

      // Create deterministic session for replay consistency
      const deterministicSession = await challengeManager.createDeterministicSession(challengeId);
      
      setState(prev => ({ 
        ...prev, 
        validating: false,
        validationResult: {
          isValid: true,
          errors: [],
          confidence: 1.0
        }
      }));

      // Set challenge session in game context
      dispatch({ type: 'SET_CHALLENGE_SESSION', payload: session });

      // Initialize timing engine for challenge mode
      challengeManager.initializeChallengeTimingEngine(session);

      onAcceptChallenge(session);
    } catch (error) {
      console.error('Failed to accept challenge:', error);
      setState(prev => ({ 
        ...prev, 
        accepting: false,
        validating: false,
        error: error instanceof Error ? error.message : 'Failed to accept challenge',
        validationResult: {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          confidence: 0
        }
      }));
    }
  };

  const formatTime = (ms: number): string => {
    return `${ms}ms`;
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString();
  };

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'perfect': return '#FFD700'; // Gold
      case 'excellent': return '#00FF00'; // Green
      case 'good': return '#FFFF00'; // Yellow
      case 'fair': return '#FFA500'; // Orange
      default: return '#FFFFFF'; // White
    }
  };

  const getRatingDisplay = (rating: string): string => {
    return rating.toUpperCase();
  };

  const getValidationStatusColor = (confidence: number): string => {
    if (confidence >= 0.9) return '#00FF00'; // Green
    if (confidence >= 0.7) return '#FFFF00'; // Yellow
    if (confidence >= 0.5) return '#FFA500'; // Orange
    return '#FF0000'; // Red
  };

  const getValidationStatusText = (confidence: number): string => {
    if (confidence >= 0.9) return 'EXCELLENT';
    if (confidence >= 0.7) return 'GOOD';
    if (confidence >= 0.5) return 'FAIR';
    return 'POOR';
  };

  if (state.loading) {
    return (
      <div className="challenge-screen">
        <div className="challenge-container">
          <LoadingScreen message="LOADING CHALLENGE..." />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="challenge-screen">
        <div className="challenge-container">
          <div className="challenge-error">
            <h2>CHALLENGE ERROR</h2>
            <p>{state.error}</p>
            <div className="challenge-actions">
              <Button 
                onClick={onBackToMenu}
                variant="primary"
              >
                BACK TO MENU
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!state.challenge) {
    return (
      <div className="challenge-screen">
        <div className="challenge-container">
          <div className="challenge-error">
            <h2>CHALLENGE NOT FOUND</h2>
            <p>This challenge may have expired or been removed.</p>
            <div className="challenge-actions">
              <Button 
                onClick={onBackToMenu}
                variant="primary"
              >
                BACK TO MENU
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { challenge } = state;
  const challengeStats = challengeManager.getChallengeStats(challenge);
  const isExpired = new Date(challenge.expiresAt) < new Date();

  return (
    <div className="challenge-screen">
      <div className="challenge-container">
        <div className="challenge-header">
          <h1>F1 START CHALLENGE</h1>
          <div className="challenge-id">ID: {challenge.id}</div>
        </div>

        <div className="challenge-info">
          <div className="challenger-info">
            <h2>CHALLENGER</h2>
            <div className="challenger-details">
              <div className="challenger-name">{challenge.creator}</div>
              <div className="challenger-time">
                <span className="time-value">{formatTime(challenge.creatorTime)}</span>
                <span 
                  className="time-rating"
                  style={{ color: getRatingColor(challengeManager.getOpponentData()?.rating || 'fair') }}
                >
                  {getRatingDisplay(challengeManager.getOpponentData()?.rating || 'FAIR')}
                </span>
              </div>
            </div>
          </div>

          <div className="challenge-details">
            <h3>CHALLENGE DETAILS</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">CREATED:</span>
                <span className="detail-value">{formatDate(challenge.createdAt)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">EXPIRES:</span>
                <span className="detail-value">{formatDate(challenge.expiresAt)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">ATTEMPTS:</span>
                <span className="detail-value">{challengeStats.totalAttempts}</span>
              </div>
              {challengeStats.totalAttempts > 0 && (
                <>
                  <div className="detail-item">
                    <span className="detail-label">BEST TIME:</span>
                    <span className="detail-value">{formatTime(challengeStats.bestTime)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">AVERAGE:</span>
                    <span className="detail-value">{formatTime(Math.round(challengeStats.averageTime))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="game-config">
            <h3>GAME SETTINGS</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">LIGHT INTERVAL:</span>
                <span className="config-value">{challenge.gameConfig.lightInterval}ms</span>
              </div>
              <div className="config-item">
                <span className="config-label">RANDOM DELAY:</span>
                <span className="config-value">
                  {challenge.gameConfig.minRandomDelay}ms - {challenge.gameConfig.maxRandomDelay}ms
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">DIFFICULTY:</span>
                <span className="config-value">{challenge.gameConfig.difficultyMode.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Status */}
        {state.validationResult && (
          <div className="validation-status">
            <h3>CHALLENGE VALIDATION</h3>
            <div className="validation-details">
              <div className="validation-item">
                <span className="validation-label">STATUS:</span>
                <span 
                  className="validation-value"
                  style={{ color: getValidationStatusColor(state.validationResult.confidence) }}
                >
                  {state.validationResult.isValid ? 'VALID' : 'INVALID'}
                </span>
              </div>
              <div className="validation-item">
                <span className="validation-label">CONFIDENCE:</span>
                <span 
                  className="validation-value"
                  style={{ color: getValidationStatusColor(state.validationResult.confidence) }}
                >
                  {getValidationStatusText(state.validationResult.confidence)} ({Math.round(state.validationResult.confidence * 100)}%)
                </span>
              </div>
              {state.validationResult.errors.length > 0 && (
                <div className="validation-errors">
                  <span className="validation-label">ISSUES:</span>
                  <ul>
                    {state.validationResult.errors.map((error, index) => (
                      <li key={index} className="validation-error">{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {state.validationResult.errors.length > 0 && (
              <Button
                onClick={() => setState(prev => ({ ...prev, showValidationDetails: !prev.showValidationDetails }))}
                variant="secondary"
                style={{ marginTop: '10px' }}
              >
                {state.showValidationDetails ? 'HIDE DETAILS' : 'SHOW DETAILS'}
              </Button>
            )}
          </div>
        )}

        <div className="challenge-actions">
          {isExpired ? (
            <div className="expired-message">
              <p>THIS CHALLENGE HAS EXPIRED</p>
              <Button 
                onClick={onBackToMenu}
                variant="primary"
              >
                BACK TO MENU
              </Button>
            </div>
          ) : (
            <>
              <Button 
                onClick={handleAcceptChallenge}
                variant="primary"
                disabled={state.accepting || state.validating}
              >
                {state.validating ? 'VALIDATING...' : 
                 state.accepting ? 'ACCEPTING...' : 
                 'ACCEPT CHALLENGE'}
              </Button>
              <Button 
                onClick={onBackToMenu}
                variant="secondary"
                disabled={state.accepting || state.validating}
              >
                BACK TO MENU
              </Button>
            </>
          )}
        </div>

        <div className="challenge-instructions">
          <h3>HOW IT WORKS</h3>
          <ul>
            <li>You'll face the same random timing as the challenger</li>
            <li>A ghost indicator will show their reaction timing</li>
            <li>Beat their time to win the challenge!</li>
            <li>Results are compared head-to-head</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .challenge-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #000000;
          color: #FFFFFF;
          font-family: 'Press Start 2P', monospace;
          padding: 20px;
        }

        .challenge-container {
          max-width: 800px;
          width: 100%;
          text-align: center;
        }

        .challenge-header {
          margin-bottom: 40px;
        }

        .challenge-header h1 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #FFFF00;
        }

        .challenge-id {
          font-size: 12px;
          color: #CCCCCC;
          text-transform: uppercase;
        }

        .challenge-info {
          display: grid;
          gap: 30px;
          margin-bottom: 40px;
          text-align: left;
        }

        .challenger-info {
          background: #111111;
          border: 2px solid #FFFF00;
          padding: 20px;
          border-radius: 0;
        }

        .challenger-info h2 {
          font-size: 16px;
          margin-bottom: 15px;
          color: #FFFF00;
          text-align: center;
        }

        .challenger-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .challenger-name {
          font-size: 18px;
          color: #FFFFFF;
        }

        .challenger-time {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .time-value {
          font-size: 20px;
          color: #FFFFFF;
          margin-bottom: 5px;
        }

        .time-rating {
          font-size: 12px;
        }

        .challenge-details,
        .game-config {
          background: #111111;
          border: 1px solid #333333;
          padding: 20px;
        }

        .challenge-details h3,
        .game-config h3 {
          font-size: 14px;
          margin-bottom: 15px;
          color: #FFFF00;
          text-align: center;
        }

        .detail-grid,
        .config-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail-item,
        .config-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #333333;
        }

        .detail-label,
        .config-label {
          font-size: 10px;
          color: #CCCCCC;
        }

        .detail-value,
        .config-value {
          font-size: 10px;
          color: #FFFFFF;
        }

        .challenge-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-bottom: 40px;
        }

        .expired-message {
          text-align: center;
        }

        .expired-message p {
          font-size: 14px;
          color: #FF0000;
          margin-bottom: 20px;
        }

        .challenge-instructions {
          background: #111111;
          border: 1px solid #333333;
          padding: 20px;
          text-align: left;
        }

        .challenge-instructions h3 {
          font-size: 14px;
          margin-bottom: 15px;
          color: #FFFF00;
          text-align: center;
        }

        .challenge-instructions ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .challenge-instructions li {
          font-size: 10px;
          color: #CCCCCC;
          margin-bottom: 8px;
          padding-left: 15px;
          position: relative;
        }

        .challenge-instructions li:before {
          content: '▶';
          position: absolute;
          left: 0;
          color: #FFFF00;
        }

        .validation-status {
          background: #111111;
          border: 1px solid #333333;
          padding: 20px;
          margin-bottom: 20px;
          text-align: left;
        }

        .validation-status h3 {
          font-size: 14px;
          margin-bottom: 15px;
          color: #FFFF00;
          text-align: center;
        }

        .validation-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .validation-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #333333;
        }

        .validation-label {
          font-size: 10px;
          color: #CCCCCC;
        }

        .validation-value {
          font-size: 10px;
          font-weight: bold;
        }

        .validation-errors {
          margin-top: 10px;
        }

        .validation-errors ul {
          list-style: none;
          padding: 0;
          margin: 5px 0 0 0;
        }

        .validation-error {
          font-size: 9px;
          color: #FF6666;
          margin-bottom: 5px;
          padding-left: 15px;
          position: relative;
        }

        .validation-error:before {
          content: '⚠';
          position: absolute;
          left: 0;
          color: #FF0000;
        }

        .challenge-error {
          text-align: center;
          padding: 40px;
        }

        .challenge-error h2 {
          font-size: 18px;
          color: #FF0000;
          margin-bottom: 20px;
        }

        .challenge-error p {
          font-size: 12px;
          color: #CCCCCC;
          margin-bottom: 30px;
        }

        @media (max-width: 768px) {
          .challenge-container {
            padding: 10px;
          }

          .challenge-header h1 {
            font-size: 18px;
          }

          .challenger-details {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .detail-grid,
          .config-grid {
            grid-template-columns: 1fr;
          }

          .challenge-actions {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};