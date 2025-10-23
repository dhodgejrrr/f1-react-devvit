import React, { useState, useEffect } from 'react';
import { ChallengeResult } from '../../../shared/types/game.js';
import { ChallengeManager } from '../../services/ChallengeManager.js';
import { ChallengeHistoryService } from '../../services/ChallengeHistoryService.js';
import { SocialShareService } from '../../services/SocialShareService.js';
import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';
import { ScreenTransition } from '../ui/ScreenTransitions.js';

interface ChallengeResultsScreenProps {
  result: ChallengeResult;
  challengeManager: ChallengeManager;
  onPlayAgain: () => void;
  onCreateNewChallenge: () => void;
  onBackToMenu: () => void;
  onViewLeaderboard: () => void;
  onViewChallengeHistory?: () => void;
}

export const ChallengeResultsScreen: React.FC<ChallengeResultsScreenProps> = ({
  result,
  challengeManager,
  onPlayAgain,
  onCreateNewChallenge,
  onBackToMenu,
  onViewLeaderboard,
  onViewChallengeHistory
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [shareText, setShareText] = useState('');
  const [copied, setCopied] = useState(false);
  const [challengeStats, setChallengeStats] = useState<any>(null);

  useEffect(() => {
    // Generate share text when component mounts
    const sharePackage = SocialShareService.createSharingPackage(
      result, 
      'challenge_result'
    );
    setShareText(sharePackage.text);

    // Record challenge completion in history
    ChallengeHistoryService.recordChallengeCompleted(
      result.challengeId,
      result,
      'Opponent' // We'll need to get actual opponent name from session
    );

    // Load challenge statistics
    const stats = ChallengeHistoryService.getStatistics();
    setChallengeStats(stats);
  }, [result]);

  const formatTime = (ms: number): string => {
    return `${ms}ms`;
  };

  const getWinnerColor = (winner: string): string => {
    switch (winner) {
      case 'user': return '#00FF00'; // Green
      case 'opponent': return '#FF0000'; // Red
      case 'tie': return '#FFFF00'; // Yellow
      default: return '#FFFFFF'; // White
    }
  };

  const getWinnerMessage = (): string => {
    const { winner, marginOfVictory } = result;
    
    if (winner === 'user') {
      return `YOU WIN BY ${marginOfVictory}MS!`;
    } else if (winner === 'opponent') {
      return `YOU LOSE BY ${marginOfVictory}MS!`;
    } else {
      return `IT'S A TIE! (±${marginOfVictory}MS)`;
    }
  };

  const getWinnerIcon = (): string => {
    switch (result.winner) {
      case 'user': return '🏆';
      case 'opponent': return '😤';
      case 'tie': return '🤝';
      default: return '⚡';
    }
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

  const handleShare = async () => {
    try {
      const sharePackage = SocialShareService.createSharingPackage(
        result, 
        'challenge_result'
      );

      const success = await SocialShareService.shareNative(
        sharePackage.title,
        sharePackage.text,
        sharePackage.url
      );

      if (!success) {
        // Fallback to showing share modal
        setShowShareModal(true);
      }

      // Track sharing attempt
      SocialShareService.trackShare('native', 'challenge_result', success);
    } catch (error) {
      console.error('Error sharing:', error);
      setShowShareModal(true);
    }
  };

  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'reddit' | 'linkedin') => {
    const sharePackage = SocialShareService.createSharingPackage(
      result, 
      'challenge_result'
    );

    SocialShareService.openSocialShare(platform, sharePackage.text, sharePackage.url);
    SocialShareService.trackShare(platform, 'challenge_result', true);
    setShowSocialModal(false);
  };

  const handleCopyToClipboard = async () => {
    const success = await SocialShareService.copyToClipboard(shareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    SocialShareService.trackShare('clipboard', 'challenge_result', success);
  };

  const handleCreateReChallenge = () => {
    // Create a new challenge with the same settings
    onCreateNewChallenge();
  };

  const calculateMarginOfVictory = (): number => {
    return Math.abs(result.userTime - result.opponentTime);
  };

  const getPerformanceMessage = (): string => {
    const margin = calculateMarginOfVictory();
    const { winner } = result;
    
    if (winner === 'user') {
      if (margin < 10) return 'BARELY WON!';
      if (margin < 50) return 'SOLID VICTORY!';
      if (margin < 100) return 'DOMINANT WIN!';
      return 'CRUSHING VICTORY!';
    } else if (winner === 'opponent') {
      if (margin < 10) return 'SO CLOSE!';
      if (margin < 50) return 'GOOD EFFORT!';
      if (margin < 100) return 'ROOM FOR IMPROVEMENT!';
      return 'BETTER LUCK NEXT TIME!';
    } else {
      return 'PERFECTLY MATCHED!';
    }
  };

  return (
    <ScreenTransition isVisible={true} direction="fade" duration={300}>
      <div className="challenge-results-screen">
        <div className="results-container">
          {/* Header */}
          <div className="results-header">
            <h1>CHALLENGE COMPLETE</h1>
            <div className="challenge-id">ID: {result.challengeId}</div>
          </div>

          {/* Winner Declaration */}
          <div className="winner-section">
            <div 
              className="winner-message"
              style={{ color: getWinnerColor(result.winner) }}
            >
              <span className="winner-icon">{getWinnerIcon()}</span>
              <span className="winner-text">{getWinnerMessage()}</span>
            </div>
          </div>

          {/* Head-to-Head Comparison */}
          <div className="comparison-section">
            <div className="comparison-grid">
              {/* User Result */}
              <div className={`result-card ${result.winner === 'user' ? 'winner' : ''}`}>
                <div className="result-label">YOU</div>
                <div className="result-time">{formatTime(result.userTime)}</div>
                <div 
                  className="result-rating"
                  style={{ color: getRatingColor(result.userRating) }}
                >
                  {result.userRating.toUpperCase()}
                </div>
                {result.winner === 'user' && (
                  <div className="winner-badge">WINNER!</div>
                )}
              </div>

              {/* VS Divider */}
              <div className="vs-divider">
                <div className="vs-text">VS</div>
                <div className="margin-text">
                  ±{result.marginOfVictory}ms
                </div>
              </div>

              {/* Opponent Result */}
              <div className={`result-card ${result.winner === 'opponent' ? 'winner' : ''}`}>
                <div className="result-label">OPPONENT</div>
                <div className="result-time">{formatTime(result.opponentTime)}</div>
                <div 
                  className="result-rating"
                  style={{ color: getRatingColor(result.opponentRating) }}
                >
                  {result.opponentRating.toUpperCase()}
                </div>
                {result.winner === 'opponent' && (
                  <div className="winner-badge">WINNER!</div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="analysis-section">
            <h3>PERFORMANCE ANALYSIS</h3>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="analysis-label">MARGIN OF VICTORY:</span>
                <span className="analysis-value">{result.marginOfVictory}ms</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">YOUR IMPROVEMENT:</span>
                <span className="analysis-value">
                  {result.userTime < result.opponentTime ? 
                    `+${result.marginOfVictory}ms faster` : 
                    `-${result.marginOfVictory}ms slower`}
                </span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">RESULT:</span>
                <span 
                  className="analysis-value"
                  style={{ color: getWinnerColor(result.winner) }}
                >
                  {result.winner === 'user' ? 'VICTORY' : 
                   result.winner === 'opponent' ? 'DEFEAT' : 'DRAW'}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Message */}
          <div className="performance-message">
            <div className="performance-text">
              {getPerformanceMessage()}
            </div>
            <div className="margin-detail">
              Margin of Victory: {calculateMarginOfVictory()}ms
            </div>
          </div>

          {/* Challenge Statistics */}
          {challengeStats && (
            <div className="challenge-stats-preview">
              <h3>YOUR CHALLENGE RECORD</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{challengeStats.wins}</span>
                  <span className="stat-label">WINS</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{challengeStats.losses}</span>
                  <span className="stat-label">LOSSES</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{challengeStats.ties}</span>
                  <span className="stat-label">TIES</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{Math.round(challengeStats.winRate * 100)}%</span>
                  <span className="stat-label">WIN RATE</span>
                </div>
              </div>
              <Button 
                onClick={() => setShowStatsModal(true)}
                variant="secondary"
                size="small"
              >
                VIEW DETAILED STATS
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <div className="primary-actions">
              <Button 
                onClick={handleShare}
                variant="primary"
              >
                📱 QUICK SHARE
              </Button>
              <Button 
                onClick={() => setShowSocialModal(true)}
                variant="primary"
              >
                🌐 SOCIAL MEDIA
              </Button>
              <Button 
                onClick={handleCreateReChallenge}
                variant="primary"
              >
                🔄 RE-CHALLENGE
              </Button>
            </div>
            
            <div className="secondary-actions">
              <Button 
                onClick={onPlayAgain}
                variant="secondary"
              >
                PLAY AGAIN
              </Button>
              <Button 
                onClick={onViewLeaderboard}
                variant="secondary"
              >
                LEADERBOARD
              </Button>
              {onViewChallengeHistory && (
                <Button 
                  onClick={onViewChallengeHistory}
                  variant="secondary"
                >
                  CHALLENGE HISTORY
                </Button>
              )}
              <Button 
                onClick={onBackToMenu}
                variant="secondary"
              >
                MAIN MENU
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Share Modal */}
        {showShareModal && (
          <Modal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            title="QUICK SHARE"
          >
            <div className="share-modal-content">
              <div className="share-text-area">
                <textarea
                  value={shareText}
                  readOnly
                  rows={4}
                  className="share-textarea"
                />
              </div>
              
              <div className="share-actions">
                <Button
                  onClick={handleCopyToClipboard}
                  variant="primary"
                  disabled={copied}
                >
                  {copied ? '✅ COPIED!' : '📋 COPY TO CLIPBOARD'}
                </Button>
                <Button
                  onClick={() => setShowShareModal(false)}
                  variant="secondary"
                >
                  CLOSE
                </Button>
              </div>

              <div className="share-instructions">
                <p>Copy this text and share it anywhere!</p>
              </div>
            </div>
          </Modal>
        )}

        {/* Social Media Share Modal */}
        {showSocialModal && (
          <Modal
            isOpen={showSocialModal}
            onClose={() => setShowSocialModal(false)}
            title="SHARE ON SOCIAL MEDIA"
          >
            <div className="social-modal-content">
              <div className="social-preview">
                <h4>PREVIEW:</h4>
                <div className="preview-text">{shareText}</div>
              </div>
              
              <div className="social-platforms">
                <Button
                  onClick={() => handleSocialShare('twitter')}
                  variant="primary"
                  className="social-button twitter"
                >
                  🐦 TWITTER
                </Button>
                <Button
                  onClick={() => handleSocialShare('facebook')}
                  variant="primary"
                  className="social-button facebook"
                >
                  📘 FACEBOOK
                </Button>
                <Button
                  onClick={() => handleSocialShare('reddit')}
                  variant="primary"
                  className="social-button reddit"
                >
                  🤖 REDDIT
                </Button>
                <Button
                  onClick={() => handleSocialShare('linkedin')}
                  variant="primary"
                  className="social-button linkedin"
                >
                  💼 LINKEDIN
                </Button>
              </div>

              <div className="social-actions">
                <Button
                  onClick={handleCopyToClipboard}
                  variant="secondary"
                >
                  {copied ? '✅ COPIED!' : '📋 COPY TEXT'}
                </Button>
                <Button
                  onClick={() => setShowSocialModal(false)}
                  variant="secondary"
                >
                  CLOSE
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Challenge Statistics Modal */}
        {showStatsModal && challengeStats && (
          <Modal
            isOpen={showStatsModal}
            onClose={() => setShowStatsModal(false)}
            title="CHALLENGE STATISTICS"
          >
            <div className="stats-modal-content">
              <div className="stats-overview">
                <h4>OVERALL PERFORMANCE</h4>
                <div className="stats-detailed-grid">
                  <div className="stat-row">
                    <span className="stat-label">Total Challenges:</span>
                    <span className="stat-value">{challengeStats.totalChallengesCompleted}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Win Rate:</span>
                    <span className="stat-value">{Math.round(challengeStats.winRate * 100)}%</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Current Streak:</span>
                    <span className={`stat-value ${challengeStats.currentStreak > 0 ? 'positive' : challengeStats.currentStreak < 0 ? 'negative' : ''}`}>
                      {challengeStats.currentStreak > 0 ? `+${challengeStats.currentStreak}` : challengeStats.currentStreak}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Longest Win Streak:</span>
                    <span className="stat-value">{challengeStats.longestWinStreak}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Average Margin:</span>
                    <span className="stat-value">{Math.round(challengeStats.averageMargin)}ms</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Best Win Margin:</span>
                    <span className="stat-value positive">{challengeStats.bestWinMargin}ms</span>
                  </div>
                  {challengeStats.worstLossMargin > 0 && (
                    <div className="stat-row">
                      <span className="stat-label">Worst Loss Margin:</span>
                      <span className="stat-value negative">{challengeStats.worstLossMargin}ms</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="stats-breakdown">
                <h4>RESULTS BREAKDOWN</h4>
                <div className="breakdown-chart">
                  <div className="breakdown-item wins">
                    <div className="breakdown-bar" style={{ width: `${(challengeStats.wins / challengeStats.totalChallengesCompleted) * 100}%` }}></div>
                    <span className="breakdown-label">Wins: {challengeStats.wins}</span>
                  </div>
                  <div className="breakdown-item losses">
                    <div className="breakdown-bar" style={{ width: `${(challengeStats.losses / challengeStats.totalChallengesCompleted) * 100}%` }}></div>
                    <span className="breakdown-label">Losses: {challengeStats.losses}</span>
                  </div>
                  <div className="breakdown-item ties">
                    <div className="breakdown-bar" style={{ width: `${(challengeStats.ties / challengeStats.totalChallengesCompleted) * 100}%` }}></div>
                    <span className="breakdown-label">Ties: {challengeStats.ties}</span>
                  </div>
                </div>
              </div>

              <div className="stats-actions">
                {onViewChallengeHistory && (
                  <Button
                    onClick={() => {
                      setShowStatsModal(false);
                      onViewChallengeHistory();
                    }}
                    variant="primary"
                  >
                    VIEW FULL HISTORY
                  </Button>
                )}
                <Button
                  onClick={() => setShowStatsModal(false)}
                  variant="secondary"
                >
                  CLOSE
                </Button>
              </div>
            </div>
          </Modal>
        )}

        <style>{`
          .challenge-results-screen {
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

          .results-container {
            max-width: 800px;
            width: 100%;
            text-align: center;
          }

          .results-header {
            margin-bottom: 40px;
          }

          .results-header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #FFFF00;
          }

          .challenge-id {
            font-size: 12px;
            color: #CCCCCC;
            text-transform: uppercase;
          }

          .winner-section {
            margin-bottom: 40px;
            padding: 30px;
            background: #111111;
            border: 3px solid;
            border-color: ${getWinnerColor(result.winner)};
          }

          .winner-message {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            font-size: 20px;
            font-weight: bold;
          }

          .winner-icon {
            font-size: 30px;
          }

          .comparison-section {
            margin-bottom: 40px;
          }

          .comparison-grid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 20px;
            align-items: center;
          }

          .result-card {
            background: #111111;
            border: 2px solid #333333;
            padding: 25px;
            position: relative;
            transition: all 0.3s ease;
          }

          .result-card.winner {
            border-color: #00FF00;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
          }

          .result-label {
            font-size: 14px;
            color: #CCCCCC;
            margin-bottom: 10px;
          }

          .result-time {
            font-size: 28px;
            color: #FFFFFF;
            margin-bottom: 10px;
          }

          .result-rating {
            font-size: 12px;
            margin-bottom: 10px;
          }

          .winner-badge {
            position: absolute;
            top: -10px;
            right: -10px;
            background: #00FF00;
            color: #000000;
            padding: 5px 10px;
            font-size: 8px;
            transform: rotate(15deg);
          }

          .vs-divider {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }

          .vs-text {
            font-size: 24px;
            color: #FFFF00;
          }

          .margin-text {
            font-size: 12px;
            color: #CCCCCC;
          }

          .analysis-section {
            background: #111111;
            border: 1px solid #333333;
            padding: 25px;
            margin-bottom: 40px;
          }

          .analysis-section h3 {
            font-size: 16px;
            color: #FFFF00;
            margin-bottom: 20px;
          }

          .analysis-grid {
            display: grid;
            gap: 15px;
          }

          .analysis-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #333333;
          }

          .analysis-label {
            font-size: 10px;
            color: #CCCCCC;
          }

          .analysis-value {
            font-size: 10px;
            color: #FFFFFF;
          }

          .action-buttons {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .primary-actions,
          .secondary-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .share-modal-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .share-text-area {
            width: 100%;
          }

          .share-textarea {
            width: 100%;
            background: #111111;
            color: #FFFFFF;
            border: 1px solid #333333;
            padding: 15px;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            resize: vertical;
            min-height: 100px;
          }

          .share-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
          }

          .share-instructions {
            text-align: center;
          }

          .share-instructions p {
            font-size: 10px;
            color: #CCCCCC;
            margin: 0;
          }

          /* Performance Message Styles */
          .performance-message {
            background: #111111;
            border: 2px solid #FFFF00;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
          }

          .performance-text {
            font-size: 18px;
            color: #FFFF00;
            margin-bottom: 10px;
            font-weight: bold;
          }

          .margin-detail {
            font-size: 12px;
            color: #CCCCCC;
          }

          /* Challenge Statistics Preview */
          .challenge-stats-preview {
            background: #111111;
            border: 1px solid #333333;
            padding: 20px;
            margin-bottom: 30px;
          }

          .challenge-stats-preview h3 {
            font-size: 14px;
            color: #FFFF00;
            margin-bottom: 15px;
            text-align: center;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 15px;
          }

          .stat-item {
            text-align: center;
            padding: 10px;
            background: #222222;
            border: 1px solid #333333;
          }

          .stat-value {
            display: block;
            font-size: 20px;
            color: #FFFFFF;
            margin-bottom: 5px;
          }

          .stat-label {
            display: block;
            font-size: 8px;
            color: #CCCCCC;
          }

          /* Social Media Modal Styles */
          .social-modal-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .social-preview {
            background: #111111;
            border: 1px solid #333333;
            padding: 15px;
          }

          .social-preview h4 {
            font-size: 12px;
            color: #FFFF00;
            margin-bottom: 10px;
          }

          .preview-text {
            font-size: 10px;
            color: #FFFFFF;
            line-height: 1.4;
          }

          .social-platforms {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }

          .social-button {
            padding: 15px !important;
            font-size: 12px !important;
          }

          .social-button.twitter {
            background: #1DA1F2 !important;
          }

          .social-button.facebook {
            background: #4267B2 !important;
          }

          .social-button.reddit {
            background: #FF4500 !important;
          }

          .social-button.linkedin {
            background: #0077B5 !important;
          }

          .social-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
          }

          /* Statistics Modal Styles */
          .stats-modal-content {
            display: flex;
            flex-direction: column;
            gap: 25px;
          }

          .stats-overview h4,
          .stats-breakdown h4 {
            font-size: 14px;
            color: #FFFF00;
            margin-bottom: 15px;
            text-align: center;
          }

          .stats-detailed-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #333333;
          }

          .stat-row .stat-label {
            font-size: 10px;
            color: #CCCCCC;
          }

          .stat-row .stat-value {
            font-size: 10px;
            color: #FFFFFF;
          }

          .stat-row .stat-value.positive {
            color: #00FF00;
          }

          .stat-row .stat-value.negative {
            color: #FF0000;
          }

          .breakdown-chart {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .breakdown-item {
            position: relative;
            background: #222222;
            height: 30px;
            display: flex;
            align-items: center;
            padding: 0 10px;
          }

          .breakdown-bar {
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            transition: width 0.3s ease;
          }

          .breakdown-item.wins .breakdown-bar {
            background: #00FF00;
          }

          .breakdown-item.losses .breakdown-bar {
            background: #FF0000;
          }

          .breakdown-item.ties .breakdown-bar {
            background: #FFFF00;
          }

          .breakdown-label {
            position: relative;
            z-index: 1;
            font-size: 10px;
            color: #FFFFFF;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          }

          .stats-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
          }

          @media (max-width: 768px) {
            .results-container {
              padding: 10px;
            }

            .results-header h1 {
              font-size: 18px;
            }

            .winner-message {
              font-size: 16px;
              flex-direction: column;
              gap: 10px;
            }

            .comparison-grid {
              grid-template-columns: 1fr;
              gap: 15px;
            }

            .vs-divider {
              order: -1;
            }

            .result-time {
              font-size: 24px;
            }

            .performance-text {
              font-size: 16px;
            }

            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }

            .stat-value {
              font-size: 18px;
            }

            .primary-actions,
            .secondary-actions {
              flex-direction: column;
              align-items: center;
            }

            .share-actions,
            .social-actions,
            .stats-actions {
              flex-direction: column;
            }

            .social-platforms {
              grid-template-columns: 1fr;
            }

            .social-button {
              padding: 12px !important;
            }
          }
        `}</style>
      </div>
    </ScreenTransition>
  );
};