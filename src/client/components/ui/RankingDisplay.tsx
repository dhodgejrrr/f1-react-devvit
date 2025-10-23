import { useState, useEffect } from 'react';
import { DataService } from '../../services/DataService.js';
import { FadeTransition } from './ScreenTransitions.js';

interface RankingDisplayProps {
  reactionTime: number;
  scope: string;
  period: string;
  isVisible: boolean;
}

interface RankingData {
  percentile: number;
  rank?: number;
  totalPlayers: number;
  achievements: Achievement[];
  performanceMetrics: PerformanceMetrics | null;
  competitiveAnalysis: CompetitiveAnalysis | null;
  communityComparison: CommunityComparison;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt: string;
}

interface PerformanceMetrics {
  bestTime: number;
  worstTime: number;
  averageTime: number;
  consistencyScore: number;
  improvementTrend: number;
  totalGames: number;
  recentForm: number;
}

interface CompetitiveAnalysis {
  userRank: number;
  totalPlayers: number;
  timeToNextRank: number;
  timeFromPreviousRank: number;
  averageInRange: number;
  performanceVsRange: 'above' | 'below';
  ranksToTopTen: number;
  ranksToTopPercent: number;
}

interface CommunityComparison {
  message: string;
  icon: string;
  color: string;
  category: string;
}

export const RankingDisplay = ({ reactionTime, scope, period, isVisible }: RankingDisplayProps) => {
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && reactionTime > 0) {
      loadRankingData();
    }
  }, [isVisible, reactionTime, scope, period]);

  const loadRankingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        userRankingResponse,
        achievementsResponse,
        performanceResponse,
        competitiveResponse,
        comparisonResponse
      ] = await Promise.all([
        DataService.getUserRanking(scope, period),
        DataService.getUserAchievements(scope, period),
        DataService.getPerformanceMetrics(scope, period),
        DataService.getCompetitiveAnalysis(scope, period),
        DataService.getCommunityComparison(reactionTime, scope, period)
      ]);

      const rankingDetails = userRankingResponse.details;
      
      setRankingData({
        percentile: rankingDetails?.percentile || 50,
        rank: rankingDetails?.rank,
        totalPlayers: rankingDetails?.totalPlayers || 0,
        achievements: achievementsResponse.achievements || [],
        performanceMetrics: performanceResponse.metrics,
        competitiveAnalysis: competitiveResponse.analysis,
        communityComparison: comparisonResponse.comparison || {
          message: 'PERFORMANCE RECORDED',
          icon: '📊',
          color: 'color-white',
          category: 'unknown'
        }
      });

    } catch (error) {
      console.error('Failed to load ranking data:', error);
      setError('Failed to load ranking information');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  if (loading) {
    return (
      <FadeTransition isVisible={true} delay={0} duration={300}>
        <div className="arcade-container" style={{
          backgroundColor: 'var(--color-black)',
          padding: 'var(--spacing-lg)',
          border: '2px solid var(--color-white)',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div className="text-arcade text-medium color-yellow" style={{ marginBottom: 'var(--spacing-md)' }}>
            ANALYZING PERFORMANCE...
          </div>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid var(--color-yellow)',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      </FadeTransition>
    );
  }

  if (error) {
    return (
      <FadeTransition isVisible={true} delay={0} duration={300}>
        <div className="arcade-container" style={{
          backgroundColor: 'var(--color-black)',
          padding: 'var(--spacing-lg)',
          border: '2px solid var(--color-red)',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div className="text-arcade text-medium color-red" style={{ marginBottom: 'var(--spacing-sm)' }}>
            ANALYSIS FAILED
          </div>
          <div className="text-arcade text-small color-white">
            {error}
          </div>
        </div>
      </FadeTransition>
    );
  }

  if (!rankingData) return null;

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 99) return 'color-gold';
    if (percentile >= 95) return 'color-green';
    if (percentile >= 75) return 'color-yellow';
    return 'color-white';
  };

  const getConsistencyRating = (score: number) => {
    if (score >= 90) return { text: 'EXCELLENT', color: 'color-gold' };
    if (score >= 75) return { text: 'GOOD', color: 'color-green' };
    if (score >= 60) return { text: 'FAIR', color: 'color-yellow' };
    return { text: 'INCONSISTENT', color: 'color-white' };
  };

  return (
    <FadeTransition isVisible={true} delay={0} duration={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%', maxWidth: '600px' }}>
        
        {/* Community Comparison */}
        <div className="arcade-container" style={{
          backgroundColor: 'var(--color-black)',
          padding: 'var(--spacing-lg)',
          border: '2px solid var(--color-white)',
          textAlign: 'center'
        }}>
          <div className="text-arcade text-large color-yellow" style={{ marginBottom: 'var(--spacing-md)' }}>
            COMMUNITY RANKING
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)'
          }}>
            <span style={{ fontSize: 'clamp(24px, 5vw, 32px)' }}>
              {rankingData.communityComparison.icon}
            </span>
            <div className={`text-arcade text-medium ${rankingData.communityComparison.color}`}>
              {rankingData.communityComparison.message}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-arcade text-small color-white">PERCENTILE:</span>
              <span className={`text-arcade text-small ${getPercentileColor(rankingData.percentile)}`}>
                {rankingData.percentile}%
              </span>
            </div>
            
            {rankingData.rank && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-arcade text-small color-white">RANK:</span>
                <span className={`text-arcade text-small ${
                  rankingData.rank <= 10 ? 'color-gold' : 
                  rankingData.rank <= 100 ? 'color-yellow' : 'color-white'
                }`}>
                  #{rankingData.rank}
                </span>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-arcade text-small color-white">TOTAL PLAYERS:</span>
              <span className="text-arcade text-small color-white">{rankingData.totalPlayers}</span>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {rankingData.achievements.length > 0 && (
          <div className="arcade-container" style={{
            backgroundColor: 'var(--color-black)',
            padding: 'var(--spacing-lg)',
            border: '2px solid var(--color-gold)',
            textAlign: 'center'
          }}>
            <div className="text-arcade text-large color-gold" style={{ marginBottom: 'var(--spacing-md)' }}>
              🏆 ACHIEVEMENTS
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {rankingData.achievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  style={{
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid var(--color-gold)',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)'
                  }}
                >
                  <span style={{ fontSize: 'clamp(20px, 4vw, 24px)' }}>
                    {achievement.icon}
                  </span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div className={`text-arcade text-small ${achievement.color}`}>
                      {achievement.name}
                    </div>
                    <div className="text-arcade text-small color-white" style={{ opacity: 0.8 }}>
                      {achievement.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {rankingData.performanceMetrics && (
          <div className="arcade-container" style={{
            backgroundColor: 'var(--color-black)',
            padding: 'var(--spacing-lg)',
            border: '2px solid var(--color-white)'
          }}>
            <div className="text-arcade text-large color-yellow" style={{ 
              textAlign: 'center', 
              marginBottom: 'var(--spacing-md)' 
            }}>
              📊 PERFORMANCE ANALYSIS
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-arcade text-small color-white">BEST TIME:</span>
                <span className="text-arcade text-small color-green">
                  {rankingData.performanceMetrics.bestTime}MS
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-arcade text-small color-white">AVERAGE:</span>
                <span className="text-arcade text-small color-white">
                  {rankingData.performanceMetrics.averageTime}MS
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-arcade text-small color-white">CONSISTENCY:</span>
                <span className={`text-arcade text-small ${getConsistencyRating(rankingData.performanceMetrics.consistencyScore).color}`}>
                  {getConsistencyRating(rankingData.performanceMetrics.consistencyScore).text}
                </span>
              </div>
              
              {rankingData.performanceMetrics.improvementTrend !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-arcade text-small color-white">IMPROVEMENT:</span>
                  <span className={`text-arcade text-small ${
                    rankingData.performanceMetrics.improvementTrend > 0 ? 'color-green' : 'color-red'
                  }`}>
                    {rankingData.performanceMetrics.improvementTrend > 0 ? '+' : ''}
                    {rankingData.performanceMetrics.improvementTrend}%
                  </span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-arcade text-small color-white">TOTAL GAMES:</span>
                <span className="text-arcade text-small color-white">
                  {rankingData.performanceMetrics.totalGames}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Competitive Analysis */}
        {rankingData.competitiveAnalysis && (
          <div className="arcade-container" style={{
            backgroundColor: 'var(--color-black)',
            padding: 'var(--spacing-lg)',
            border: '2px solid var(--color-white)'
          }}>
            <div className="text-arcade text-large color-yellow" style={{ 
              textAlign: 'center', 
              marginBottom: 'var(--spacing-md)' 
            }}>
              ⚔️ COMPETITIVE ANALYSIS
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {rankingData.competitiveAnalysis.timeToNextRank > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-arcade text-small color-white">TO NEXT RANK:</span>
                  <span className="text-arcade text-small color-yellow">
                    -{rankingData.competitiveAnalysis.timeToNextRank}MS
                  </span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-arcade text-small color-white">VS SIMILAR RANKS:</span>
                <span className={`text-arcade text-small ${
                  rankingData.competitiveAnalysis.performanceVsRange === 'above' ? 'color-green' : 'color-red'
                }`}>
                  {rankingData.competitiveAnalysis.performanceVsRange.toUpperCase()}
                </span>
              </div>
              
              {rankingData.competitiveAnalysis.ranksToTopTen > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-arcade text-small color-white">TO TOP 10:</span>
                  <span className="text-arcade text-small color-white">
                    {rankingData.competitiveAnalysis.ranksToTopTen} RANKS
                  </span>
                </div>
              )}
              
              {rankingData.competitiveAnalysis.ranksToTopPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-arcade text-small color-white">TO TOP 1%:</span>
                  <span className="text-arcade text-small color-white">
                    {rankingData.competitiveAnalysis.ranksToTopPercent} RANKS
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </FadeTransition>
  );
};