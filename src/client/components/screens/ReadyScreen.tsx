import { useState } from 'react';
import { useGameContext } from '../../hooks/useGameContext.js';
import { GameState } from '../../../shared/types/game.js';

export const ReadyScreen = () => {
  console.log('ReadyScreen: Component is rendering');
  const { dispatch } = useGameContext();
  const [loading, setLoading] = useState(false);
  
  console.log('ReadyScreen: dispatch available:', !!dispatch);

  const handleStartGame = async () => {
    try {
      console.log('Starting game sequence');
      setLoading(true);
      // Transition to lights sequence state
      dispatch({ type: 'TRANSITION_STATE', payload: GameState.LIGHTS_SEQUENCE });
      setLoading(false);
    } catch (error) {
      console.error('Failed to start game:', error);
      setLoading(false);
    }
  };

  const handleBackToMenu = () => {
    dispatch({ type: 'TRANSITION_STATE', payload: GameState.SPLASH });
  };

  return (
    <div className="responsive-container layout-stack safe-area-container" style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontFamily: '"Press Start 2P", monospace',
      justifyContent: 'center'
    }}>
      {/* Debug indicator */}
      <div style={{
        position: 'absolute',
        top: '50px',
        left: '10px',
        color: '#00ff00',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        READY SCREEN RENDERED
      </div>

      {/* Status */}
      <div className="layout-stack content-narrow" style={{ textAlign: 'center' }}>
        <h1 className="text-responsive-hero" style={{
          color: '#ffff00',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          fontWeight: 'bold'
        }}>READY TO START</h1>
        <div className="text-responsive-large" style={{
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>PREPARE FOR THE F1 STARTING SEQUENCE</div>
      </div>

      {/* Instructions */}
      <div className="content-wide" style={{ textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#333333',
          padding: 'clamp(16px, 4vw, 24px)',
          border: '2px solid #ffff00',
          borderRadius: '0'
        }}>
          <h3 className="text-responsive-large" style={{
            color: '#ffff00',
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 'clamp(8px, 2vw, 16px)'
          }}>INSTRUCTIONS:</h3>
          <div className="layout-stack gap-responsive-sm">
            <p className="text-responsive-medium" style={{
              color: '#ffffff',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0
            }}>1. FIVE RED LIGHTS WILL ILLUMINATE ONE BY ONE</p>
            <p className="text-responsive-medium" style={{
              color: '#ffffff',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0
            }}>2. WAIT FOR ALL LIGHTS TO GO OUT SIMULTANEOUSLY</p>
            <p className="text-responsive-medium" style={{
              color: '#ffffff',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0
            }}>3. CLICK ANYWHERE OR PRESS SPACEBAR TO REACT</p>
            <p className="text-responsive-medium" style={{
              color: '#ffffff',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0
            }}>4. REACTING TOO EARLY = FALSE START!</p>
          </div>
        </div>
      </div>

      {/* Light Preview */}
      <div className="f1-lights-responsive">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="f1-light-responsive"
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="content-narrow layout-stack">
        <button
          onClick={handleStartGame}
          disabled={loading}
          className="responsive-button"
          style={{
            backgroundColor: '#00ff00',
            color: '#000000',
            fontSize: 'clamp(16px, 4vw, 24px)',
            opacity: loading ? 0.7 : 1,
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            width: '100%',
            maxWidth: '400px'
          }}
        >
          {loading ? 'STARTING...' : 'START SEQUENCE'}
        </button>

        <button
          onClick={handleBackToMenu}
          className="responsive-button"
          style={{
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: 'clamp(12px, 3vw, 16px)',
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            width: '100%',
            maxWidth: '300px'
          }}
        >
          BACK TO MENU
        </button>
      </div>

      {/* Tips */}
      <div className="content-narrow" style={{ textAlign: 'center' }}>
        <p className="text-responsive-small" style={{
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 8px 0'
        }}>
          TIP: PROFESSIONAL F1 DRIVERS AVERAGE 200-300MS REACTION TIME
        </p>
        <p className="text-responsive-small" style={{
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0
        }}>
          CAN YOU BEAT THEM?
        </p>
      </div>
    </div>
  );
};
