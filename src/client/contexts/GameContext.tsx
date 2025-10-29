import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import {
  GameState,
  GameConfiguration,
  GameResult,
  LightState,
  UserSession,
  ChallengeSession,
} from '../../shared/types/game.js';

// Game Context State Interface
export interface GameContextState {
  // Core Game State
  currentState: GameState;
  gameConfig: GameConfiguration;
  userSession: UserSession | null;

  // Game Runtime State
  lights: LightState[];
  isInputEnabled: boolean;
  currentResult: GameResult | null;

  // Timing State
  sequenceStartTime: number | null;
  lightsOutTime: number | null;
  reactionTime: number | null;

  // Challenge State
  challengeId: string | null;
  ghostTiming: number | null;
  challengeSession: ChallengeSession | null;

  // UI State
  loading: boolean;
  error: string | null;
}

// Game Actions
export type GameAction =
  | { type: 'INITIALIZE_GAME'; payload: { userSession: UserSession; config: GameConfiguration } }
  | { type: 'TRANSITION_STATE'; payload: GameState }
  | { type: 'START_LIGHT_SEQUENCE'; payload: { startTime: number } }
  | { type: 'ACTIVATE_LIGHT'; payload: { index: number; timestamp: number } }
  | { type: 'LIGHTS_OUT'; payload: { timestamp: number } }
  | { type: 'RECORD_REACTION'; payload: { timestamp: number; reactionTime: number } }
  | { type: 'SET_RESULT'; payload: GameResult }
  | { type: 'RESET_GAME' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_CONFIG'; payload: Partial<GameConfiguration> }
  | { type: 'SET_CHALLENGE'; payload: { challengeId: string; ghostTiming: number } }
  | { type: 'SET_CHALLENGE_SESSION'; payload: ChallengeSession }
  | { type: 'CLEAR_CHALLENGE' }
  | { type: 'ENABLE_INPUT' }
  | { type: 'DISABLE_INPUT' };

// Default game configuration
const DEFAULT_CONFIG: GameConfiguration = {
  lightInterval: 900,
  minRandomDelay: 500,
  maxRandomDelay: 2500,
  difficultyMode: 'normal',
};

// Initial state
const initialState: GameContextState = {
  currentState: GameState.SPLASH,
  gameConfig: DEFAULT_CONFIG,
  userSession: null,
  lights: Array.from({ length: 5 }, (_, index) => ({
    index,
    isActive: false,
    activatedAt: 0,
  })),
  isInputEnabled: false,
  currentResult: null,
  sequenceStartTime: null,
  lightsOutTime: null,
  reactionTime: null,
  challengeId: null,
  ghostTiming: null,
  challengeSession: null,
  loading: false,
  error: null,
};

// Game Reducer
function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  console.log('GameReducer: Processing action:', action.type, 'with payload:', action.payload);
  console.log('GameReducer: Current state before action:', state.currentState);
  
  switch (action.type) {
    case 'INITIALIZE_GAME':
      return {
        ...state,
        userSession: action.payload.userSession,
        gameConfig: action.payload.config,
        currentState: GameState.READY,
        loading: false,
        error: null,
      };

    case 'TRANSITION_STATE':
      console.log('GameReducer: TRANSITION_STATE - changing from', state.currentState, 'to', action.payload);
      const newState = {
        ...state,
        currentState: action.payload,
      };
      console.log('GameReducer: New state after transition:', newState.currentState);
      return newState;

    case 'START_LIGHT_SEQUENCE':
      return {
        ...state,
        currentState: GameState.LIGHTS_SEQUENCE,
        sequenceStartTime: action.payload.startTime,
        lights: state.lights.map((light) => ({ ...light, isActive: false, activatedAt: 0 })),
        isInputEnabled: false,
        currentResult: null,
        reactionTime: null,
        lightsOutTime: null,
      };

    case 'ACTIVATE_LIGHT':
      return {
        ...state,
        lights: state.lights.map((light) =>
          light.index === action.payload.index
            ? { ...light, isActive: true, activatedAt: action.payload.timestamp }
            : light
        ),
      };

    case 'LIGHTS_OUT':
      return {
        ...state,
        currentState: GameState.WAITING_FOR_INPUT,
        lights: state.lights.map((light) => ({ ...light, isActive: false })),
        lightsOutTime: action.payload.timestamp,
        isInputEnabled: true,
      };

    case 'RECORD_REACTION':
      return {
        ...state,
        reactionTime: action.payload.reactionTime,
        isInputEnabled: false,
      };

    case 'SET_RESULT':
      return {
        ...state,
        currentState: GameState.SHOWING_RESULTS,
        currentResult: action.payload,
        isInputEnabled: false,
      };

    case 'RESET_GAME':
      return {
        ...state,
        currentState: GameState.READY,
        lights: Array.from({ length: 5 }, (_, index) => ({
          index,
          isActive: false,
          activatedAt: 0,
        })),
        isInputEnabled: false,
        currentResult: null,
        sequenceStartTime: null,
        lightsOutTime: null,
        reactionTime: null,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case 'UPDATE_CONFIG':
      return {
        ...state,
        gameConfig: { ...state.gameConfig, ...action.payload },
      };

    case 'SET_CHALLENGE':
      return {
        ...state,
        challengeId: action.payload.challengeId,
        ghostTiming: action.payload.ghostTiming,
      };

    case 'SET_CHALLENGE_SESSION':
      return {
        ...state,
        challengeSession: action.payload,
        challengeId: action.payload.challenge.id,
        ghostTiming: action.payload.ghostTiming,
      };

    case 'CLEAR_CHALLENGE':
      return {
        ...state,
        challengeId: null,
        ghostTiming: null,
        challengeSession: null,
      };

    case 'ENABLE_INPUT':
      return {
        ...state,
        isInputEnabled: true,
      };

    case 'DISABLE_INPUT':
      return {
        ...state,
        isInputEnabled: false,
      };

    default:
      return state;
  }
}

// Context
export const GameContext = createContext<{
  state: GameContextState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

// Storage keys
const STORAGE_KEYS = {
  GAME_STATE: 'f1-challenge-game-state',
  USER_SESSION: 'f1-challenge-user-session',
  GAME_CONFIG: 'f1-challenge-game-config',
} as const;

// Local storage utilities
const storage = {
  save: (key: string, data: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  load: function <T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },
};

// Provider Component
interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  console.log('GameProvider: Starting initialization');
  
  // Simple initialization without localStorage for now
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialState,
    currentState: GameState.SPLASH
  });
  
  console.log('GameProvider - initialized with state:', state);
  console.log('GameProvider - dispatch function:', !!dispatch);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}
