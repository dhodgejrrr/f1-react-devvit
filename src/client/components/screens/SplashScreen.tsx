import { useState } from 'react';
import { useGameContext } from '../../hooks/useGameContext.js';
import { GameState } from '../../../shared/types/game.js';

export const SplashScreen = () => {
  console.log('SplashScreen rendering - component called');
  const { dispatch } = useGameContext();
  const [loading, setLoading] = useState(false);

  console.log('SplashScreen - dispatch available:', !!dispatch);

  const handleStart = async () => {
    try {
      console.log('Start button clicked');
      setLoading(true);
      dispatch({ type: 'TRANSITION_STATE', payload: GameState.READY });
      setLoading(false);
    } catch (error) {
      console.error('Failed to start game:', error);
      setLoading(false);
    }
  };

  const handleLeaderboard = () => {
    dispatch({ type: 'TRANSITION_STATE', payload: GameState.LEADERBOARD });
  };

  console.log('SplashScreen - about to render JSX');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '32px',
      padding: '24px',
      backgroundColor: '#000000',
      color: '#ffffff',
      position: 'relative'
    }}>
      {/* Debug indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: '#00ff00',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        SPLASH SCREEN RENDERED
      </div>

      {/* Main Title */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 48px)',
          color: '#ffff00',
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          fontWeight: 'bold'
        }}>F1 START</h1>
        <h2 style={{
          fontSize: 'clamp(24px, 5vw, 48px)',
          color: '#ffffff',
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          fontWeight: 'bold'
        }}>CHALLENGE</h2>
      </div>

      {/* Subtitle */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{
          fontSize: 'clamp(16px, 3vw, 24px)',
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0
        }}>TEST YOUR REACTION TIME</p>
        <p style={{
          fontSize: 'clamp(12px, 2.5vw, 16px)',
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0
        }}>AGAINST THE F1 STARTING LIGHTS</p>
      </div>

      {/* Visual Elements - F1 Lights Preview */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#333333',
              border: '2px solid #ffffff'
            }}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            padding: '24px 32px',
            backgroundColor: '#ff0000',
            color: '#ffffff',
            fontSize: 'clamp(16px, 4vw, 24px)',
            border: '2px solid #ffffff',
            borderRadius: '0',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
        >
          {loading ? 'INITIALIZING...' : 'PRESS START'}
        </button>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={handleLeaderboard}
            style={{
              padding: '16px 24px',
              backgroundColor: '#000000',
              color: '#ffff00',
              fontSize: 'clamp(12px, 3vw, 16px)',
              border: '2px solid #ffff00',
              borderRadius: '0',
              cursor: 'pointer',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            LEADERBOARD
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{
          fontSize: 'clamp(8px, 2vw, 12px)',
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 8px 0'
        }}>
          WAIT FOR ALL FIVE LIGHTS TO GO OUT
        </p>
        <p style={{
          fontSize: 'clamp(8px, 2vw, 12px)',
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0
        }}>
          THEN REACT AS FAST AS YOU CAN
        </p>
      </div>
    </div>
  );
};
