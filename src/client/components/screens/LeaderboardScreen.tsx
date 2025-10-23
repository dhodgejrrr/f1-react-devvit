import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameContext } from '../../hooks/useGameContext.js';
import { useUserSession } from '../../hooks/useUserSession.js';
import { GameState, LeaderboardScope, TimeFilter } from '../../../shared/types/game.js';
import { DataService } from '../../services/DataService.js';
import type { LeaderboardEntry } from '../../../shared/types/leaderboard.js';
import type { LeaderboardResponse } from '../../../shared/types/api.js';

interface LeaderboardState {
  entries: LeaderboardEntry[];
  userRank?: number | undefined;
  stats: {
    totalEntries: number;
    averageTime: number;
    bestTime: number;
    worstTime: number;
    medianTime: number;
  };
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

interface FilterState {
  scope: LeaderboardScope;
  period: TimeFilter;
}

export const LeaderboardScreen = () => {
  const { dispatch } = useGameContext();
  const { trackActivity, userSession } = useUserSession();

  // State management
  const [leaderboard, setLeaderboard] = useState<LeaderboardState>({
    entries: [],
    stats: {
      totalEntries: 0,
      averageTime: 0,
      bestTime: 0,
      worstTime: 0,
      medianTime: 0
    },
    loading: true,
    error: null,
    hasMore: true,
    currentPage: 1
  });

  const [filters, setFilters] = useState<FilterState>({
    scope: userSession?.preferences.preferredScope || 'global',
    period: 'alltime'
  });

  const [loadingMore, setLoadingMore] = useState(false);
  const [userRankingDetails, setUserRankingDetails] = useState<any>(null);
  const [loadingRankingDetails, setLoadingRankingDetails] = useState(false);
  
  // Refs for infinite scrolling
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load leaderboard data
  const loadLeaderboard = useCallback(async (
    scope: LeaderboardScope, 
    period: TimeFilter, 
    reset: boolean = true
  ) => {
    try {
      if (reset) {
        setLeaderboard(prev => ({ ...prev, loading: true, error: null }));
      } else {
        setLoadingMore(true);
      }

      const limit = 50; // Load 50 entries at a time
      
      const response: LeaderboardResponse = await DataService.getLeaderboard(
        scope, 
        period, 
        limit
      );

      setLeaderboard(prev => ({
        ...prev,
        entries: reset ? response.entries : [...prev.entries, ...response.entries],
        userRank: response.userRank,
        stats: response.stats,
        loading: false,
        error: null,
        hasMore: response.entries.length === limit,
        currentPage: reset ? 1 : prev.currentPage + 1
      }));

      // Load detailed user ranking if user is logged in and has a rank
      if (userSession?.userId && response.userRank && reset) {
        loadUserRankingDetails(scope, period);
      }

      // Track leaderboard view activity
      trackActivity('leaderboard_view', {
        timestamp: Date.now(),
        scope,
        period,
        entriesLoaded: response.entries.length
      });

    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      setLeaderboard(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load leaderboard',
        hasMore: false
      }));
    } finally {
      setLoadingMore(false);
    }
  }, [leaderboard.entries.length, trackActivity, userSession?.userId]);

  // Load detailed user ranking information
  const loadUserRankingDetails = useCallback(async (
    scope: LeaderboardScope,
    period: TimeFilter
  ) => {
    if (!userSession?.userId) return;

    try {
      setLoadingRankingDetails(true);
      const response = await DataService.getUserRanking(scope, period);
      setUserRankingDetails(response.details);
    } catch (error) {
      console.error('Failed to load user ranking details:', error);
      setUserRankingDetails(null);
    } finally {
      setLoadingRankingDetails(false);
    }
  }, [userSession?.userId]);

  // Load more entries (pagination)
  const loadMoreEntries = useCallback(async () => {
    if (!loadingMore && leaderboard.hasMore && !leaderboard.loading) {
      await loadLeaderboard(filters.scope, filters.period, false);
    }
  }, [loadingMore, leaderboard.hasMore, leaderboard.loading, loadLeaderboard, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback(async (newScope?: LeaderboardScope, newPeriod?: TimeFilter) => {
    const updatedFilters = {
      scope: newScope || filters.scope,
      period: newPeriod || filters.period
    };
    
    setFilters(updatedFilters);
    await loadLeaderboard(updatedFilters.scope, updatedFilters.period, true);
  }, [filters, loadLeaderboard]);

  // Initial load
  useEffect(() => {
    loadLeaderboard(filters.scope, filters.period, true);
  }, []); // Only run once on mount

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting && leaderboard.hasMore && !loadingMore && !leaderboard.loading) {
          loadMoreEntries();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [leaderboard.hasMore, loadingMore, leaderboard.loading, loadMoreEntries]);

  // Navigation handlers
  const handleBackToMenu = () => {
    dispatch({ type: 'TRANSITION_STATE', payload: GameState.SPLASH });
  };

  const handlePlayGame = () => {
    dispatch({ type: 'TRANSITION_STATE', payload: GameState.READY });
  };

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        handleBackToMenu();
        break;
      case 'Enter':
      case ' ':
        if (event.target === document.body) {
          event.preventDefault();
          handlePlayGame();
        }
        break;
      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleRetry();
        }
        break;
    }
  }, [handleBackToMenu, handlePlayGame]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Retry handler for errors
  const handleRetry = () => {
    loadLeaderboard(filters.scope, filters.period, true);
  };

  // Get rating display info
  const getRatingInfo = (reactionTime: number) => {
    if (reactionTime < 200) return { text: 'PERFECT', color: 'color-gold' };
    if (reactionTime < 300) return { text: 'EXCELLENT', color: 'color-green' };
    if (reactionTime < 400) return { text: 'GOOD', color: 'color-yellow' };
    return { text: 'FAIR', color: 'color-white' };
  };

  // Check if user is highlighted in leaderboard
  const isUserEntry = (entry: LeaderboardEntry) => {
    return userSession?.userId && entry.userId === userSession.userId;
  };

  return (
    <div className="arcade-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'flex-start', 
      minHeight: '100vh', 
      gap: 'var(--spacing-lg)', 
      padding: 'var(--spacing-lg)',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-md)' }}>
          <button
            onClick={() => dispatch({ type: 'TRANSITION_STATE', payload: GameState.SPLASH })}
            className="text-arcade arcade-focus instant-change touch-target"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              backgroundColor: 'var(--color-black)',
              color: 'var(--color-white)',
              fontSize: 'clamp(10px, 2vw, 14px)',
              border: '2px solid var(--color-white)',
              borderRadius: '0',
              cursor: 'pointer'
            }}
          >
            ← BACK
          </button>
          <h1 className="text-arcade text-hero color-yellow">LEADERBOARD</h1>
          <button
            onClick={handleRetry}
            disabled={leaderboard.loading}
            aria-label="Refresh leaderboard"
            className="text-arcade arcade-focus instant-change touch-target"
            style={{
              padding: 'var(--spacing-xs)',
              backgroundColor: 'var(--color-black)',
              color: 'var(--color-white)',
              fontSize: 'clamp(8px, 1.5vw, 12px)',
              border: '1px solid var(--color-white)',
              borderRadius: '0',
              cursor: leaderboard.loading ? 'not-allowed' : 'pointer',
              opacity: leaderboard.loading ? 0.6 : 1,
              minWidth: '40px',
              height: '32px'
            }}
          >
            🔄
          </button>
        </div>
        <div className="text-arcade text-large color-white">
          {filters.scope === 'global' ? 'GLOBAL' : filters.scope.toUpperCase()} - {filters.period.toUpperCase()}
        </div>
        {leaderboard.stats.totalEntries > 0 && (
          <div className="text-arcade text-small color-white">
            {leaderboard.stats.totalEntries} PLAYERS • AVG: {Math.round(leaderboard.stats.averageTime)}MS
          </div>
        )}
      </div>

      {/* Filter Buttons */}
      <div 
        role="group" 
        aria-label="Leaderboard filters"
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 'var(--spacing-sm)', 
          justifyContent: 'center',
          maxWidth: '100%'
        }}
      >
        {/* Time Period Filters */}
        <div role="group" aria-label="Time period filters" style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          {(['alltime', 'weekly', 'daily'] as TimeFilter[]).map((period) => (
            <button 
              key={period}
              onClick={() => handleFilterChange(undefined, period)}
              disabled={leaderboard.loading}
              aria-pressed={filters.period === period}
              aria-label={`Filter by ${period} scores`}
              className="text-arcade arcade-focus instant-change touch-target"
              style={{
                padding: 'clamp(6px, 1.5vw, var(--spacing-sm)) clamp(8px, 2vw, var(--spacing-md))',
                backgroundColor: filters.period === period ? 'var(--color-yellow)' : 'var(--color-black)',
                color: filters.period === period ? 'var(--color-black)' : 'var(--color-white)',
                fontSize: 'clamp(8px, 2vw, 14px)',
                border: '2px solid var(--color-white)',
                borderRadius: '0',
                cursor: leaderboard.loading ? 'not-allowed' : 'pointer',
                opacity: leaderboard.loading ? 0.6 : 1,
                minWidth: '60px'
              }}
            >
              {period.toUpperCase()}
            </button>
          ))}
        </div>
        
        {/* Scope Filters */}
        <div role="group" aria-label="Scope filters" style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          {(['global', 'r/subreddit'] as LeaderboardScope[]).map((scope) => (
            <button 
              key={scope}
              onClick={() => handleFilterChange(scope, undefined)}
              disabled={leaderboard.loading}
              aria-pressed={filters.scope === scope}
              aria-label={`Filter by ${scope === 'global' ? 'global' : 'subreddit'} scores`}
              className="text-arcade arcade-focus instant-change touch-target"
              style={{
                padding: 'clamp(6px, 1.5vw, var(--spacing-sm)) clamp(8px, 2vw, var(--spacing-md))',
                backgroundColor: filters.scope === scope ? 'var(--color-green)' : 'var(--color-black)',
                color: filters.scope === scope ? 'var(--color-black)' : 'var(--color-white)',
                fontSize: 'clamp(8px, 2vw, 14px)',
                border: '2px solid var(--color-white)',
                borderRadius: '0',
                cursor: leaderboard.loading ? 'not-allowed' : 'pointer',
                opacity: leaderboard.loading ? 0.6 : 1,
                minWidth: '80px'
              }}
            >
              {scope === 'global' ? 'GLOBAL' : 'SUBREDDIT'}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {leaderboard.error && (
        <div className="arcade-container" style={{
          backgroundColor: 'var(--color-black)',
          padding: 'var(--spacing-lg)',
          border: '2px solid var(--color-red)',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div className="text-arcade text-medium color-red" style={{ marginBottom: 'var(--spacing-md)' }}>
            ERROR LOADING LEADERBOARD
          </div>
          <div className="text-arcade text-small color-white" style={{ marginBottom: 'var(--spacing-md)' }}>
            {leaderboard.error}
          </div>
          <button
            onClick={handleRetry}
            className="text-arcade arcade-focus instant-change touch-target"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              backgroundColor: 'var(--color-yellow)',
              color: 'var(--color-black)',
              fontSize: 'clamp(12px, 2.5vw, 16px)',
              border: '2px solid var(--color-white)',
              borderRadius: '0',
              cursor: 'pointer'
            }}
          >
            RETRY
          </button>
        </div>
      )}

      {/* Loading State */}
      {leaderboard.loading && !leaderboard.error && (
        <div className="arcade-container" style={{
          backgroundColor: 'var(--color-black)',
          padding: 'var(--spacing-xl)',
          border: '2px solid var(--color-white)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div className="text-arcade text-medium color-yellow" style={{ marginBottom: 'var(--spacing-md)' }}>
            LOADING LEADERBOARD...
          </div>
          <div className="text-arcade text-small color-white">
            FETCHING TOP TIMES
          </div>
        </div>
      )}

      {/* Empty State */}
      {!leaderboard.loading && !leaderboard.error && leaderboard.entries.length === 0 && (
        <div className="arcade-container" style={{
          backgroundColor: 'var(--color-black)',
          padding: 'var(--spacing-xl)',
          border: '2px solid var(--color-white)',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div className="text-arcade text-medium color-yellow" style={{ marginBottom: 'var(--spacing-md)' }}>
            NO SCORES YET
          </div>
          <div className="text-arcade text-small color-white" style={{ marginBottom: 'var(--spacing-md)' }}>
            BE THE FIRST TO SET A TIME IN THIS CATEGORY
          </div>
          <button
            onClick={handlePlayGame}
            className="text-arcade arcade-focus instant-change touch-target"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              backgroundColor: 'var(--color-green)',
              color: 'var(--color-black)',
              fontSize: 'clamp(12px, 2.5vw, 16px)',
              border: '2px solid var(--color-white)',
              borderRadius: '0',
              cursor: 'pointer'
            }}
          >
            PLAY NOW
          </button>
        </div>
      )}

      {/* Leaderboard Table */}
      {!leaderboard.loading && !leaderboard.error && leaderboard.entries.length > 0 && (
        <div 
          className="arcade-container" 
          role="region"
          aria-label="Leaderboard table"
          style={{
            width: '100%',
            maxWidth: '800px',
            backgroundColor: 'var(--color-black)',
            border: '2px solid var(--color-white)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            backgroundColor: 'var(--color-black)',
            padding: 'var(--spacing-md)',
            borderBottom: '2px solid var(--color-white)'
          }}>
            <h3 
              className="text-arcade text-medium color-yellow" 
              style={{ textAlign: 'center' }}
              id="leaderboard-title"
            >
              TOP PERFORMERS
            </h3>
            {leaderboard.userRank && (
              <div 
                className="text-arcade text-small color-white" 
                style={{ textAlign: 'center', marginTop: 'var(--spacing-xs)' }}
                aria-live="polite"
              >
                YOUR RANK: #{leaderboard.userRank}
              </div>
            )}
          </div>

          <div style={{ 
            overflowX: 'auto', 
            maxHeight: '60vh', 
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
          }}>
            <table 
              role="table"
              aria-labelledby="leaderboard-title"
              aria-describedby="leaderboard-description"
              style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                minWidth: '320px' // Ensure minimum width for mobile
              }}
            >
              <caption 
                id="leaderboard-description" 
                style={{ 
                  position: 'absolute', 
                  left: '-10000px', 
                  width: '1px', 
                  height: '1px', 
                  overflow: 'hidden' 
                }}
              >
                Leaderboard showing top reaction times for {filters.scope} scope in {filters.period} period. 
                {leaderboard.entries.length} entries displayed.
              </caption>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-black)', zIndex: 1 }}>
                <tr>
                  <th className="text-arcade text-small color-yellow" style={{ 
                    padding: 'clamp(4px, 1vw, var(--spacing-sm))', 
                    textAlign: 'left', 
                    borderBottom: '1px solid var(--color-white)',
                    backgroundColor: 'var(--color-black)',
                    width: '15%',
                    minWidth: '50px'
                  }}>
                    RANK
                  </th>
                  <th className="text-arcade text-small color-yellow" style={{ 
                    padding: 'clamp(4px, 1vw, var(--spacing-sm))', 
                    textAlign: 'left', 
                    borderBottom: '1px solid var(--color-white)',
                    backgroundColor: 'var(--color-black)',
                    width: '40%',
                    minWidth: '100px'
                  }}>
                    PLAYER
                  </th>
                  <th className="text-arcade text-small color-yellow" style={{ 
                    padding: 'clamp(4px, 1vw, var(--spacing-sm))', 
                    textAlign: 'center', 
                    borderBottom: '1px solid var(--color-white)',
                    backgroundColor: 'var(--color-black)',
                    width: '25%',
                    minWidth: '70px'
                  }}>
                    TIME
                  </th>
                  <th className="text-arcade text-small color-yellow" style={{ 
                    padding: 'clamp(4px, 1vw, var(--spacing-sm))', 
                    textAlign: 'center', 
                    borderBottom: '1px solid var(--color-white)',
                    backgroundColor: 'var(--color-black)',
                    width: '20%',
                    minWidth: '80px'
                  }}>
                    RATING
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((entry, index) => {
                  const rating = getRatingInfo(entry.reactionTime);
                  const isUser = isUserEntry(entry);
                  const rank = index + 1;
                  
                  return (
                    <tr
                      key={`${entry.userId}-${entry.timestamp}`}
                      role="row"
                      aria-label={`Rank ${rank}: ${entry.username}, ${entry.reactionTime} milliseconds, ${rating.text} rating${isUser ? ', your entry' : ''}`}
                      style={{
                        borderBottom: '1px solid var(--color-white)',
                        backgroundColor: isUser 
                          ? 'rgba(255, 255, 0, 0.2)' 
                          : rank <= 3 
                            ? 'rgba(255, 255, 0, 0.05)' 
                            : 'var(--color-black)'
                      }}
                    >
                      <td style={{ 
                        padding: 'clamp(4px, 1vw, var(--spacing-sm))',
                        verticalAlign: 'middle'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 'clamp(2px, 0.5vw, var(--spacing-xs))',
                          flexWrap: 'nowrap'
                        }}>
                          <span className={`text-arcade ${
                            rank === 1 ? 'color-gold' : 
                            rank === 2 ? 'color-white' : 
                            rank === 3 ? 'color-yellow' : 
                            isUser ? 'color-yellow' : 'color-white'
                          }`} style={{ 
                            fontSize: 'clamp(8px, 2vw, 12px)',
                            whiteSpace: 'nowrap'
                          }}>
                            #{rank}
                          </span>
                          {rank === 1 && <span style={{ fontSize: 'clamp(10px, 2.5vw, 14px)' }}>🏆</span>}
                          {rank === 2 && <span style={{ fontSize: 'clamp(10px, 2.5vw, 14px)' }}>🥈</span>}
                          {rank === 3 && <span style={{ fontSize: 'clamp(10px, 2.5vw, 14px)' }}>🥉</span>}
                          {isUser && rank > 3 && <span style={{ fontSize: 'clamp(10px, 2.5vw, 14px)' }}>👤</span>}
                        </div>
                      </td>
                      <td style={{ 
                        padding: 'clamp(4px, 1vw, var(--spacing-sm))',
                        verticalAlign: 'middle'
                      }}>
                        <span className={`text-arcade ${isUser ? 'color-yellow' : 'color-white'}`} style={{ 
                          fontSize: 'clamp(8px, 2vw, 12px)',
                          wordBreak: 'break-word',
                          lineHeight: '1.2'
                        }}>
                          {entry.username.length > 12 ? `${entry.username.substring(0, 12)}...` : entry.username}
                          {isUser && (
                            <div style={{ fontSize: 'clamp(6px, 1.5vw, 10px)', opacity: 0.8 }}>
                              (YOU)
                            </div>
                          )}
                        </span>
                      </td>
                      <td style={{ 
                        padding: 'clamp(4px, 1vw, var(--spacing-sm))', 
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        <span className={`text-arcade ${isUser ? 'color-yellow' : 'color-white'}`} style={{ 
                          fontSize: 'clamp(8px, 2vw, 12px)',
                          fontWeight: 'bold'
                        }}>
                          {entry.reactionTime}MS
                        </span>
                      </td>
                      <td style={{ 
                        padding: 'clamp(4px, 1vw, var(--spacing-sm))', 
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        <span className={`text-arcade ${rating.color}`} style={{ 
                          fontSize: 'clamp(6px, 1.5vw, 10px)',
                          lineHeight: '1.2'
                        }}>
                          {rating.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load More Section with Intersection Observer */}
          {leaderboard.hasMore && (
            <div 
              ref={loadMoreRef}
              style={{ 
                padding: 'var(--spacing-md)', 
                textAlign: 'center', 
                borderTop: '1px solid var(--color-white)' 
              }}
            >
              {loadingMore ? (
                <div 
                  className="text-arcade text-small color-yellow"
                  aria-live="polite"
                  role="status"
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 'var(--spacing-sm)' 
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid var(--color-yellow)',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    LOADING MORE ENTRIES...
                  </div>
                </div>
              ) : (
                <button
                  onClick={loadMoreEntries}
                  aria-label="Load more leaderboard entries"
                  className="text-arcade arcade-focus instant-change touch-target"
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    backgroundColor: 'var(--color-yellow)',
                    color: 'var(--color-black)',
                    fontSize: 'clamp(10px, 2vw, 14px)',
                    border: '2px solid var(--color-white)',
                    borderRadius: '0',
                    cursor: 'pointer'
                  }}
                >
                  LOAD MORE
                </button>
              )}
            </div>
          )}
          
          {/* End of Results Indicator */}
          {!leaderboard.hasMore && leaderboard.entries.length > 0 && (
            <div style={{ 
              padding: 'var(--spacing-md)', 
              textAlign: 'center', 
              borderTop: '1px solid var(--color-white)' 
            }}>
              <div className="text-arcade text-small color-white">
                END OF LEADERBOARD
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Stats */}
      {userSession && (
        <div className="arcade-container" style={{
          backgroundColor: 'var(--color-black)',
          padding: 'var(--spacing-lg)',
          border: '2px solid var(--color-white)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h3 className="text-arcade text-medium color-yellow" style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
            YOUR PERFORMANCE
          </h3>
          
          {/* Basic Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-arcade text-small color-white">BEST TIME:</span>
              <span className="text-arcade text-small color-white">
                {userSession.personalBest ? `${userSession.personalBest}MS` : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-arcade text-small color-white">RANK:</span>
              <span className={`text-arcade text-small ${
                leaderboard.userRank && leaderboard.userRank <= 10 ? 'color-gold' : 
                leaderboard.userRank && leaderboard.userRank <= 100 ? 'color-yellow' : 'color-white'
              }`}>
                {leaderboard.userRank ? `#${leaderboard.userRank}` : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-arcade text-small color-white">GAMES PLAYED:</span>
              <span className="text-arcade text-small color-white">
                {userSession.sessionStats.gamesPlayed}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-arcade text-small color-white">AVERAGE:</span>
              <span className="text-arcade text-small color-white">
                {userSession.sessionStats.averageTime > 0 ? `${Math.round(userSession.sessionStats.averageTime)}MS` : '--'}
              </span>
            </div>
          </div>

          {/* Detailed Ranking Information */}
          {userRankingDetails && !loadingRankingDetails && (
            <>
              <div style={{ 
                borderTop: '1px solid var(--color-white)', 
                paddingTop: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-md)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-arcade text-small color-white">PERCENTILE:</span>
                    <span className={`text-arcade text-small ${
                      userRankingDetails.percentile >= 95 ? 'color-gold' : 
                      userRankingDetails.percentile >= 75 ? 'color-green' : 
                      userRankingDetails.percentile >= 50 ? 'color-yellow' : 'color-white'
                    }`}>
                      {userRankingDetails.percentile}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-arcade text-small color-white">TOTAL PLAYERS:</span>
                    <span className="text-arcade text-small color-white">
                      {userRankingDetails.totalPlayers}
                    </span>
                  </div>
                  {userRankingDetails.improvementRate !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-arcade text-small color-white">IMPROVEMENT:</span>
                      <span className={`text-arcade text-small ${
                        userRankingDetails.improvementRate > 0 ? 'color-green' : 'color-red'
                      }`}>
                        {userRankingDetails.improvementRate > 0 ? '+' : ''}{userRankingDetails.improvementRate}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Achievement Badges */}
              {(userRankingDetails.isTopTen || userRankingDetails.isTopPercent) && (
                <div style={{ 
                  backgroundColor: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid var(--color-gold)',
                  padding: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-md)',
                  textAlign: 'center'
                }}>
                  {userRankingDetails.isTopPercent && (
                    <div className="text-arcade text-small color-gold">
                      👑 TOP 1% ELITE PLAYER
                    </div>
                  )}
                  {userRankingDetails.isTopTen && !userRankingDetails.isTopPercent && (
                    <div className="text-arcade text-small color-gold">
                      🏆 TOP 10 PLAYER
                    </div>
                  )}
                </div>
              )}

              {/* Nearby Competitors */}
              {userRankingDetails.nearbyCompetitors && userRankingDetails.nearbyCompetitors.length > 0 && (
                <div style={{ 
                  borderTop: '1px solid var(--color-white)', 
                  paddingTop: 'var(--spacing-md)'
                }}>
                  <div className="text-arcade text-small color-yellow" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    NEARBY COMPETITORS:
                  </div>
                  {userRankingDetails.nearbyCompetitors.slice(0, 3).map((competitor: any) => (
                    <div key={competitor.rank} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      <span className="text-arcade text-small color-white">
                        #{competitor.rank} {competitor.username}
                      </span>
                      <span className={`text-arcade text-small ${
                        competitor.timeDifference < 0 ? 'color-green' : 'color-red'
                      }`}>
                        {competitor.timeDifference > 0 ? '+' : ''}{competitor.timeDifference}MS
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Loading Ranking Details */}
          {loadingRankingDetails && (
            <div style={{ 
              borderTop: '1px solid var(--color-white)', 
              paddingTop: 'var(--spacing-md)',
              textAlign: 'center'
            }}>
              <div className="text-arcade text-small color-white">
                LOADING DETAILED STATS...
              </div>
            </div>
          )}

          {/* No Games Played Message */}
          {userSession.sessionStats.gamesPlayed === 0 && (
            <div className="text-arcade text-small color-white" style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
              PLAY A GAME TO SEE YOUR STATS
            </div>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="arcade-container" style={{
        backgroundColor: 'var(--color-black)',
        padding: 'var(--spacing-md)',
        border: '1px solid var(--color-white)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div className="text-arcade text-small color-white" style={{ marginBottom: 'var(--spacing-sm)' }}>
          KEYBOARD SHORTCUTS:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          <div className="text-arcade text-small color-white">
            ESC - MAIN MENU
          </div>
          <div className="text-arcade text-small color-white">
            ENTER/SPACE - PLAY GAME
          </div>
          <div className="text-arcade text-small color-white">
            CTRL+R - REFRESH
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', alignItems: 'center' }}>
        <button
          onClick={handlePlayGame}
          className="text-arcade arcade-focus instant-change touch-target"
          style={{
            padding: 'var(--spacing-md) var(--spacing-xl)',
            backgroundColor: 'var(--color-green)',
            color: 'var(--color-black)',
            fontSize: 'clamp(16px, 3vw, 20px)',
            border: '2px solid var(--color-white)',
            borderRadius: '0',
            cursor: 'pointer'
          }}
        >
          PLAY GAME
        </button>

        <button
          onClick={handleBackToMenu}
          className="text-arcade arcade-focus instant-change touch-target"
          style={{
            padding: 'var(--spacing-md) var(--spacing-xl)',
            backgroundColor: 'var(--color-black)',
            color: 'var(--color-white)',
            fontSize: 'clamp(16px, 3vw, 20px)',
            border: '2px solid var(--color-white)',
            borderRadius: '0',
            cursor: 'pointer'
          }}
        >
          MAIN MENU
        </button>
      </div>
    </div>
  );
};
