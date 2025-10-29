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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '32px',
      padding: '32px',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontFamily: '"Press Start 2P", monospace'
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
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          color: '#ffff00',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          fontWeight: 'bold'
        }}>READY TO START</h1>
        <div style={{
          fontSize: 'clamp(16px, 4vw, 24px)',
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>PREPARE FOR THE F1 STARTING SEQUENCE</div>
      </div>

      {/* Instructions */}
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <div style={{
          backgroundColor: '#333333',
          padding: '24px',
          border: '2px solid #ffff00',
          borderRadius: '0'
        }}>
          <h3 style={{
            fontSize: 'clamp(16px, 3vw, 20px)',
            color: '#ffff00',
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '16px'
          }}>INSTRUCTIONS:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{
              fontSize: 'clamp(12px, 2.5vw, 16px)',
              color: '#ffffff',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0
            }}>1. FIVE RED LIGHTS WILL ILLUMINATE ONE BY ONE</p>
            <p style={{
              fontSize: 'clamp(12px, 2.5vw, 16px)',
              color: '#ffffff',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0
            }}>2. WAIT FOR ALL LIGHTS TO GO OUT SIMULTANEOUSLY</p>
            <p style={{
              fontSize: 'clamp(12px, 2.5vw, 16px)',
              color: '#ffffff',
              fontFamily: '"Press Start 2P", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0
            }}>3. CLICK ANYWHERE OR PRESS SPACEBAR TO REACT</p>
            <p style={{
              fontSize: 'clamp(12px, 2.5vw, 16px)',
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
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#333333',
              border: '2px solid #ffffff'
            }}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <button
          onClick={handleStartGame}
          disabled={loading}
          style={{
            padding: '24px 32px',
            backgroundColor: '#00ff00',
            color: '#000000',
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
          {loading ? 'STARTING...' : 'START SEQUENCE'}
        </button>

        <button
          onClick={handleBackToMenu}
          style={{
            padding: '16px 24px',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: 'clamp(12px, 3vw, 16px)',
            border: '2px solid #ffffff',
            borderRadius: '0',
            cursor: 'pointer',
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
        >
          BACK TO MENU
        </button>
      </div>

      {/* Tips */}
      <div style={{ textAlign: 'center', maxWidth: '500px' }}>
        <p style={{
          fontSize: 'clamp(8px, 2vw, 12px)',
          color: '#ffffff',
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 8px 0'
        }}>
          TIP: PROFESSIONAL F1 DRIVERS AVERAGE 200-300MS REACTION TIME
        </p>
        <p style={{
          fontSize: 'clamp(8px, 2vw, 12px)',
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
