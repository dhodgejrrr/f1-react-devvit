import { useEffect, useRef, useCallback } from 'react';
import { useGameContext } from './useGameContext.js';
import { useGameActions } from './useGameActions.js';
import { useUserSession } from './useUserSession.js';
import { GameManager } from '../services/GameManager.js';
import type { GameConfiguration, UserSession } from '../types/index.js';

/**
 * Hook that integrates GameManager with React Context
 * Provides a bridge between the imperative GameManager API and React state management
 */
export function useGameManager() {
  const { state } = useGameContext();
  const actions = useGameActions();
  const { trackActivity, updateSessionStats, updatePersonalBest } = useUserSession();
  const gameManagerRef = useRef<GameManager | null>(null);

  // Initialize GameManager
  useEffect(() => {
    if (!gameManagerRef.current) {
      gameManagerRef.current = new GameManager(state.gameConfig);

      // Set up event handlers
      gameManagerRef.current.onStateChange((newState) => {
        actions.transitionToState(newState);
      });

      gameManagerRef.current.onLightActivate((index) => {
        actions.activateLight(index);
      });

      gameManagerRef.current.onLightsOut(() => {
        actions.lightsOut();
      });

      gameManagerRef.current.onResult((result) => {
        actions.setResult(result);
        
        // Update session statistics
        updateSessionStats(
          result.reactionTime,
          result.rating === 'false_start',
          result.rating === 'perfect'
        );
        
        // Update personal best if applicable
        if (result.isPersonalBest && result.reactionTime > 0) {
          updatePersonalBest(result.reactionTime);
        }
      });

      gameManagerRef.current.onError((error) => {
        actions.setError(error);
      });

      // Set up activity tracking
      gameManagerRef.current.setActivityTracker(trackActivity);
    }
  }, [actions, trackActivity, updateSessionStats, updatePersonalBest]);

  // Update GameManager configuration when context config changes
  useEffect(() => {
    if (gameManagerRef.current) {
      gameManagerRef.current.updateConfig(state.gameConfig);
    }
  }, [state.gameConfig]);

  // Update GameManager challenge state when context challenge changes
  useEffect(() => {
    if (gameManagerRef.current) {
      if (state.challengeId && state.ghostTiming !== null) {
        gameManagerRef.current.setChallenge(state.challengeId, state.ghostTiming);
      } else {
        gameManagerRef.current.clearChallenge();
      }
    }
  }, [state.challengeId, state.ghostTiming]);

  // Game control methods
  const initializeGame = useCallback(
    async (userSession?: UserSession, config?: Partial<GameConfiguration>) => {
      if (!gameManagerRef.current) return;

      try {
        actions.setLoading(true);

        // Update configuration if provided
        if (config) {
          actions.updateConfig(config);
        }

        // Initialize user session if provided
        if (userSession) {
          actions.initializeGame(userSession, { ...state.gameConfig, ...config });
        }

        // Initialize the game manager
        await gameManagerRef.current.initializeGame();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize game';
        actions.setError(errorMessage);
      } finally {
        actions.setLoading(false);
      }
    },
    [actions, state.gameConfig]
  );

  const startGame = useCallback(async () => {
    if (!gameManagerRef.current) return;

    try {
      actions.setLoading(true);
      actions.setError(null);

      await gameManagerRef.current.startGameSequence();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start game';
      actions.setError(errorMessage);
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  const resetGame = useCallback(() => {
    if (!gameManagerRef.current) return;

    gameManagerRef.current.resetGame();
    actions.resetGame();
  }, [actions]);

  // Input is now handled entirely by the GameManager's InputHandler
  // No need for duplicate event listeners here

  // Configuration helpers
  const updateDifficulty = useCallback(
    (difficulty: GameConfiguration['difficultyMode']) => {
      const difficultyConfigs = {
        easy: { lightInterval: 1200, minRandomDelay: 1000, maxRandomDelay: 3000 },
        normal: { lightInterval: 900, minRandomDelay: 500, maxRandomDelay: 2500 },
        hard: { lightInterval: 600, minRandomDelay: 300, maxRandomDelay: 1500 },
        pro: { lightInterval: 400, minRandomDelay: 200, maxRandomDelay: 1000 },
      };

      const config = { difficultyMode: difficulty, ...difficultyConfigs[difficulty] };
      actions.updateConfig(config);
    },
    [actions]
  );

  // Challenge helpers
  const createChallenge = useCallback(async () => {
    if (!state.currentResult || state.currentResult.rating === 'false_start') {
      throw new Error('Cannot create challenge from false start');
    }

    // Generate a unique challenge ID
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, this would save to the server
    // For now, just set up the challenge state
    actions.setChallenge(challengeId, state.currentResult.reactionTime);

    return challengeId;
  }, [state.currentResult, actions]);

  const acceptChallenge = useCallback(
    (challengeId: string, ghostTiming: number) => {
      actions.setChallenge(challengeId, ghostTiming);
    },
    [actions]
  );

  // Input state helpers
  const getInputStatus = useCallback(() => {
    return gameManagerRef.current?.getInputStatus() || {
      enabled: false,
      inCooldown: false,
      lastInputTime: 0,
      debounceTime: 50,
      cooldownDuration: 600,
    };
  }, []);

  const isInCooldown = useCallback(() => {
    return gameManagerRef.current?.isInCooldown() || false;
  }, []);

  return {
    // State
    gameState: state.currentState,
    lights: state.lights,
    isInputEnabled: state.isInputEnabled,
    currentResult: state.currentResult,
    loading: state.loading,
    error: state.error,
    gameConfig: state.gameConfig,
    userSession: state.userSession,
    challengeId: state.challengeId,
    ghostTiming: state.ghostTiming,

    // Actions
    initializeGame,
    startGame,
    resetGame,
    updateDifficulty,
    createChallenge,
    acceptChallenge,

    // Input state
    getInputStatus,
    isInCooldown,

    // Direct access to GameManager for advanced use cases
    gameManager: gameManagerRef.current,
  };
}
