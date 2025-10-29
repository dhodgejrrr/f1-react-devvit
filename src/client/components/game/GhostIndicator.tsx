import React, { useState, useEffect } from 'react';

interface GhostIndicatorProps {
  opponentTime: number; // Opponent's reaction time in ms
  lightsOutTime: number; // When lights went out
  isVisible: boolean; // Whether to show the ghost
  opponentName: string; // Name of the opponent
  showSideBySide?: boolean; // Whether to show side-by-side comparison
  userReactionTime?: number; // User's reaction time for comparison
  challengeMode?: boolean; // Whether in challenge mode
}

export const GhostIndicator: React.FC<GhostIndicatorProps> = ({
  opponentTime,
  lightsOutTime,
  isVisible,
  opponentName,
  showSideBySide = false,
  userReactionTime,
  challengeMode = false
}) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showGhost, setShowGhost] = useState<boolean>(false);
  const [ghostTriggered, setGhostTriggered] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  useEffect(() => {
    if (!isVisible || lightsOutTime === 0) {
      setShowGhost(false);
      setGhostTriggered(false);
      return;
    }

    // Start timing from when lights go out
    const startTime = performance.now();

    const updateTimer = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      setCurrentTime(elapsed);

      // Show ghost when opponent would have reacted
      if (elapsed >= opponentTime && !ghostTriggered) {
        setShowGhost(true);
        setGhostTriggered(true);
        
        // Hide ghost after 2 seconds
        setTimeout(() => {
          setShowGhost(false);
        }, 2000);
      }

      // Continue updating if we haven't reached the target time yet
      if (elapsed < opponentTime + 2000) {
        requestAnimationFrame(updateTimer);
      }
    };

    requestAnimationFrame(updateTimer);
  }, [lightsOutTime, opponentTime, isVisible, ghostTriggered]);

  // Show comparison when user has reacted and we have both times
  useEffect(() => {
    if (showSideBySide && userReactionTime !== undefined && ghostTriggered) {
      setShowComparison(true);
    }
  }, [showSideBySide, userReactionTime, ghostTriggered]);

  // Reset when visibility changes
  useEffect(() => {
    if (!isVisible) {
      setCurrentTime(0);
      setShowGhost(false);
      setGhostTriggered(false);
      setShowComparison(false);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const getWinner = (): 'user' | 'opponent' | 'tie' | null => {
    if (userReactionTime === undefined) return null;
    const difference = Math.abs(userReactionTime - opponentTime);
    if (difference <= 5) return 'tie';
    return userReactionTime < opponentTime ? 'user' : 'opponent';
  };

  const getMarginOfVictory = (): number => {
    if (userReactionTime === undefined) return 0;
    return Math.abs(userReactionTime - opponentTime);
  };

  return (
    <div className={`ghost-indicator ${challengeMode ? 'challenge-mode' : ''}`}>
      {/* Side-by-side comparison */}
      {showComparison && showSideBySide && userReactionTime !== undefined && (
        <div className="side-by-side-comparison">
          <div className="comparison-header">
            <h3>HEAD-TO-HEAD RESULTS</h3>
          </div>
          <div className="comparison-grid">
            <div className="player-result user">
              <div className="player-label">YOU</div>
              <div className="player-time">{(userReactionTime / 1000).toFixed(4)}</div>
              <div className={`player-status ${getWinner() === 'user' ? 'winner' : getWinner() === 'tie' ? 'tie' : 'loser'}`}>
                {getWinner() === 'user' ? '🏆 WINNER' : 
                 getWinner() === 'tie' ? '🤝 TIE' : 
                 '😤 DEFEATED'}
              </div>
            </div>
            <div className="vs-divider">VS</div>
            <div className="player-result opponent">
              <div className="player-label">{opponentName.toUpperCase()}</div>
              <div className="player-time">{opponentTime}ms</div>
              <div className={`player-status ${getWinner() === 'opponent' ? 'winner' : getWinner() === 'tie' ? 'tie' : 'loser'}`}>
                {getWinner() === 'opponent' ? '🏆 WINNER' : 
                 getWinner() === 'tie' ? '🤝 TIE' : 
                 '😤 DEFEATED'}
              </div>
            </div>
          </div>
          <div className="margin-info">
            MARGIN: {getMarginOfVictory()}ms
          </div>
        </div>
      )}

      {/* Ghost reaction indicator */}
      {showGhost && !showComparison && (
        <div className="ghost-reaction">
          <div className="ghost-flash"></div>
          <div className="ghost-info">
            <div className="ghost-name">{opponentName}</div>
            <div className="ghost-time">{opponentTime}ms</div>
          </div>
        </div>
      )}

      {/* Progress indicator showing when opponent will react */}
      {!ghostTriggered && lightsOutTime > 0 && !showComparison && (
        <div className="ghost-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{
                width: `${Math.min((currentTime / opponentTime) * 100, 100)}%`
              }}
            ></div>
          </div>
          <div className="progress-label">
            GHOST: {opponentName} ({opponentTime}ms)
          </div>
        </div>
      )}

      <style>{`
        .ghost-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          font-family: 'Press Start 2P', monospace;
        }

        .ghost-indicator.challenge-mode {
          top: 10px;
          right: 10px;
        }

        .side-by-side-comparison {
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #00FFFF;
          padding: 20px;
          min-width: 300px;
          animation: comparisonAppear 0.5s ease-out;
        }

        .comparison-header {
          text-align: center;
          margin-bottom: 15px;
        }

        .comparison-header h3 {
          font-size: 10px;
          color: #00FFFF;
          margin: 0;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 15px;
          align-items: center;
          margin-bottom: 15px;
        }

        .player-result {
          text-align: center;
          padding: 10px;
          border: 1px solid #333333;
          background: rgba(0, 0, 0, 0.8);
        }

        .player-result.user {
          border-color: #00FF00;
        }

        .player-result.opponent {
          border-color: #FF6600;
        }

        .player-label {
          font-size: 8px;
          color: #CCCCCC;
          margin-bottom: 5px;
        }

        .player-time {
          font-size: 14px;
          color: #FFFFFF;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .player-status {
          font-size: 7px;
          padding: 3px 6px;
          border-radius: 0;
        }

        .player-status.winner {
          background: #00FF00;
          color: #000000;
        }

        .player-status.loser {
          background: #FF0000;
          color: #FFFFFF;
        }

        .player-status.tie {
          background: #FFFF00;
          color: #000000;
        }

        .vs-divider {
          font-size: 12px;
          color: #00FFFF;
          font-weight: bold;
          text-align: center;
        }

        .margin-info {
          text-align: center;
          font-size: 8px;
          color: #FFFF00;
          padding: 8px;
          border-top: 1px solid #333333;
        }

        .ghost-reaction {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: ghostAppear 0.3s ease-out;
        }

        .ghost-flash {
          width: 60px;
          height: 60px;
          background: rgba(0, 255, 255, 0.8);
          border: 2px solid #00FFFF;
          border-radius: 50%;
          animation: ghostPulse 0.5s ease-in-out infinite alternate;
          box-shadow: 
            0 0 20px #00FFFF,
            inset 0 0 20px rgba(0, 255, 255, 0.3);
        }

        .ghost-info {
          margin-top: 10px;
          text-align: center;
          background: rgba(0, 0, 0, 0.8);
          padding: 8px 12px;
          border: 1px solid #00FFFF;
        }

        .ghost-name {
          font-size: 8px;
          color: #00FFFF;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .ghost-time {
          font-size: 10px;
          color: #FFFFFF;
        }

        .ghost-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 200px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #00FFFF;
          margin-bottom: 8px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00FFFF, #0080FF);
          transition: width 0.1s linear;
          box-shadow: 0 0 10px #00FFFF;
        }

        .progress-label {
          font-size: 8px;
          color: #00FFFF;
          text-align: center;
          background: rgba(0, 0, 0, 0.8);
          padding: 4px 8px;
          border: 1px solid #00FFFF;
          white-space: nowrap;
        }

        @keyframes ghostAppear {
          from {
            opacity: 0;
            transform: scale(0.5) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes ghostPulse {
          from {
            transform: scale(1);
            box-shadow: 
              0 0 20px #00FFFF,
              inset 0 0 20px rgba(0, 255, 255, 0.3);
          }
          to {
            transform: scale(1.1);
            box-shadow: 
              0 0 30px #00FFFF,
              inset 0 0 30px rgba(0, 255, 255, 0.5);
          }
        }

        @keyframes comparisonAppear {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(-30px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (max-width: 768px) {
          .ghost-indicator {
            top: 10px;
            right: 10px;
          }

          .ghost-flash {
            width: 40px;
            height: 40px;
          }

          .ghost-info {
            padding: 6px 8px;
          }

          .ghost-name {
            font-size: 6px;
          }

          .ghost-time {
            font-size: 8px;
          }

          .progress-bar {
            height: 6px;
          }

          .progress-label {
            font-size: 6px;
            padding: 3px 6px;
          }

          .ghost-progress {
            min-width: 150px;
          }
        }
      `}</style>
    </div>
  );
};