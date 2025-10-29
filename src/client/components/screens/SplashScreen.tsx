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
      console.log('Start button clicked - attempting state transition');
      console.log('Current dispatch function:', dispatch);
      console.log('GameState.READY value:', GameState.READY);
      setLoading(true);
      
      // Add more debugging
      console.log('About to dispatch TRANSITION_STATE action');
      dispatch({ type: 'TRANSITION_STATE', payload: GameState.READY });
      console.log('Dispatch completed successfully');
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to start game:', error);
      console.error('Error details:', error);
      setLoading(false);
    }
  };

  const handleLeaderboard = () => {
    dispatch({ type: 'TRANSITION_STATE', payload: GameState.LEADERBOARD });
  };

  console.log('SplashScreen - about to render JSX');

  return (
    <div className="layout-stack content-container" style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      position: 'relative',
      justifyContent: 'center'
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
      <div className="layout-stack" style={{ textAlign: 'center' }}>
        <h1 className="text-responsive-hero" style={{
          color: '#ffff00',
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          fontWeight: 'bold'
        }}>F1 START</h1>
        <h2 className="text-responsive-hero" style={{
          color: '#ffffff',
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          fontWeight: 'bold'
        }}>CHALLENGE</h2>
      </div>

      {/* Subtitle */}
      <div className="layout-stack" style={{ textAlign: 'center' }}>
        <p className="text-responsive-large" style={{
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0
        }}>TEST YOUR REACTION TIME</p>
        <p className="text-responsive-medium" style={{
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0
        }}>AGAINST THE F1 STARTING LIGHTS</p>
      </div>

      {/* Visual Elements - F1 Lights Preview */}
      <div className="f1-lights-responsive">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="f1-light-responsive"
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="layout-stack content-narrow">
        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="responsive-button"
          style={{
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: 'clamp(16px, 4vw, 24px)',
            opacity: loading ? 0.7 : 1,
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            width: '100%',
            maxWidth: '400px'
          }}
        >
          {loading ? 'INITIALIZING...' : 'PRESS START'}
        </button>

        {/* Navigation Buttons */}
        <div className="layout-inline">
          <button
            onClick={handleLeaderboard}
            className="responsive-button"
            style={{
              backgroundColor: '#000000',
              color: '#ffff00',
              fontSize: 'clamp(12px, 3vw, 16px)',
              border: '2px solid #ffff00',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              minWidth: '150px'
            }}
          >
            LEADERBOARD
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="content-narrow" style={{ textAlign: 'center' }}>
        <p className="text-responsive-small" style={{
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 8px 0'
        }}>
          WAIT FOR ALL FIVE LIGHTS TO GO OUT
        </p>
        <p className="text-responsive-small" style={{
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
