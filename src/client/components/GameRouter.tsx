import { useState } from 'react';
import { useGameContext } from '../hooks/useGameContext.js';
import { GameState } from '../../shared/types/game.js';
import { SplashScreen } from './screens/SplashScreen.js';
import { ReadyScreen } from './screens/ReadyScreen.js';
import { LeaderboardScreen } from './screens/LeaderboardScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
import { ResponsiveTest } from './ui/ResponsiveTest.js';
import { F1LightsTest } from './ui/F1LightsTest.js';

export const GameRouter = () => {
  console.log('GameRouter: Component starting to render');
  
  try {
    const { state } = useGameContext();
    console.log('GameRouter: useGameContext successful, state:', state);
    
    const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
    console.log('GameRouter: useState successful');
    
    console.log('GameRouter: About to render JSX');

  console.log('GameRouter: Current game state:', state);

  // Removed renderCurrentScreen function - using inline rendering instead

    return (
      <div className="responsive-container safe-area-container" style={{ 
        minHeight: '100vh',
        backgroundColor: '#000000',
        color: '#ffffff',
        fontFamily: '"Press Start 2P", monospace',
        overflow: 'hidden'
      }}>
        
        {/* Accessibility Button - Fixed Position */}
        <button
          onClick={() => {
            setShowAccessibilityPanel(true);
            console.log('Accessibility settings opened');
          }}
          aria-label="Open accessibility settings"
          title="Accessibility Settings"
          className="responsive-button"
          style={{
            position: 'fixed',
            top: 'max(env(safe-area-inset-top), 16px)',
            right: 'max(env(safe-area-inset-right), 16px)',
            zIndex: 1000,
            backgroundColor: '#000000',
            border: '2px solid #ffffff',
            color: '#ffffff',
            minWidth: '44px',
            minHeight: '44px',
            fontSize: 'clamp(14px, 3vw, 18px)'
          }}
        >
          ♿
        </button>

        {/* Main Content */}
        <main role="main" className="content-container">
          {/* Simple screen rendering based on state */}
          {state.currentState === GameState.SPLASH && <SplashScreen />}
          {state.currentState === GameState.READY && <ReadyScreen />}
          {state.currentState === GameState.LEADERBOARD && <LeaderboardScreen />}
          {(state.currentState === GameState.LIGHTS_SEQUENCE || state.currentState === GameState.WAITING_FOR_INPUT) && <GameScreen />}
          {state.currentState === GameState.SHOWING_RESULTS && <ResultsScreen />}
          
          {/* Fallback for unknown states */}
          {!['SPLASH', 'READY', 'LEADERBOARD', 'LIGHTS_SEQUENCE', 'WAITING_FOR_INPUT', 'SHOWING_RESULTS'].includes(state.currentState) && (
            <div style={{ 
              minHeight: '100vh', 
              backgroundColor: '#ff0000', 
              color: 'white', 
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div>Unknown state: {state.currentState}</div>
            </div>
          )}
        </main>

        {/* Global Screen Reader Announcements */}
        <div style={{ position: 'absolute', left: '-9999px' }} aria-live="polite" aria-atomic="true">
          {state.error && `Error: ${state.error}`}
          {state.loading && 'Loading...'}
        </div>

        {/* Responsive Design Test Components (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <ResponsiveTest />
            <F1LightsTest />
          </>
        )}
      </div>
    );
  } catch (error) {
    console.error('GameRouter: Error during render:', error);
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#ff0000',
        color: '#ffffff',
        padding: '20px',
        fontSize: '16px'
      }}>
        <div>GAME ROUTER ERROR: {error?.message || 'Unknown error'}</div>
        <div>Stack: {error?.stack}</div>
      </div>
    );
  }
};
