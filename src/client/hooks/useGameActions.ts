import { useGameContext } from './useGameContext.js';
import { GameState, GameConfiguration, GameResult, UserSession } from '../types/index.js';

// Default game configuration
const DEFAULT_CONFIG: GameConfiguration = {
  lightInterval: 900,
  minRandomDelay: 500,
  maxRandomDelay: 2500,
  difficultyMode: 'normal',
};

// Convenience hooks for specific actions
export function useGameActions() {
  const { dispatch } = useGameContext();

  return {
    initializeGame: (userSession: UserSession, config?: Partial<GameConfiguration>) => {
      dispatch({
        type: 'INITIALIZE_GAME',
        payload: {
          userSession,
          config: { ...DEFAULT_CONFIG, ...config },
        },
      });
    },

    transitionToState: (newState: GameState) => {
      dispatch({ type: 'TRANSITION_STATE', payload: newState });
    },

    startLightSequence: () => {
      const startTime = performance.now();
      dispatch({ type: 'START_LIGHT_SEQUENCE', payload: { startTime } });
    },

    activateLight: (index: number) => {
      const timestamp = performance.now();
      dispatch({ type: 'ACTIVATE_LIGHT', payload: { index, timestamp } });
    },

    lightsOut: () => {
      const timestamp = performance.now();
      dispatch({ type: 'LIGHTS_OUT', payload: { timestamp } });
    },

    recordReaction: (reactionTime: number) => {
      const timestamp = performance.now();
      dispatch({ type: 'RECORD_REACTION', payload: { timestamp, reactionTime } });
    },

    setResult: (result: GameResult) => {
      dispatch({ type: 'SET_RESULT', payload: result });
    },

    resetGame: () => {
      dispatch({ type: 'RESET_GAME' });
    },

    setLoading: (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },

    setError: (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },

    updateConfig: (config: Partial<GameConfiguration>) => {
      dispatch({ type: 'UPDATE_CONFIG', payload: config });
    },

    setChallenge: (challengeId: string, ghostTiming: number) => {
      dispatch({ type: 'SET_CHALLENGE', payload: { challengeId, ghostTiming } });
    },

    clearChallenge: () => {
      dispatch({ type: 'CLEAR_CHALLENGE' });
    },

    enableInput: () => {
      dispatch({ type: 'ENABLE_INPUT' });
    },

    disableInput: () => {
      dispatch({ type: 'DISABLE_INPUT' });
    },
  };
}
