import { useState } from 'react';
import { useGameContext } from '../hooks/useGameContext.js';
import { GameState } from '../../shared/types/game.js';

// Core screens loaded immediately
import { SplashScreen } from './screens/SplashScreen.js';
import { LoadingScreen } from './screens/LoadingScreen.js';
import { ErrorScreen } from './screens/ErrorScreen.js';
import { ReadyScreen } from './screens/ReadyScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
import { LeaderboardScreen } from './screens/LeaderboardScreen.js';
import { AccessibilityPanel } from './ui/AccessibilityPanel.js';

export const GameRouter = () => {
  const { state } = useGameContext();
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);


  // Render the appropriate screen based on current state
  const renderCurrentScreen = () => {
    console.log('GameRouter renderCurrentScreen - state:', {
      currentState: state.currentState,
      loading: state.loading,
      error: state.error,
      fullState: state
    });
    
    console.log('GameState.SPLASH value:', GameState.SPLASH);
    console.log('state.currentState === GameState.SPLASH:', state.currentState === GameState.SPLASH);

    // Show loading screen if loading
    if (state.loading) {
      console.log('Rendering LoadingScreen');
      return <LoadingScreen />;
    }

    // Show error screen if there's an error
    if (state.error) {
      console.log('Rendering ErrorScreen with error:', state.error);
      return <ErrorScreen error={state.error} />;
    }

    // Render screen based on game state
    switch (state.currentState) {
      case GameState.SPLASH:
        console.log('Rendering SplashScreen');
        return <SplashScreen />;

      case GameState.READY:
        console.log('Rendering ReadyScreen');
        return <ReadyScreen />;

      case GameState.LIGHTS_SEQUENCE:
      case GameState.WAITING_FOR_INPUT:
        console.log('Rendering GameScreen');
        return <GameScreen />;

      case GameState.SHOWING_RESULTS:
        console.log('Rendering ResultsScreen');
        return <ResultsScreen />;

      case GameState.LEADERBOARD:
        console.log('Rendering LeaderboardScreen');
        return <LeaderboardScreen />;

      default:
        console.log('Unknown game state, falling back to SplashScreen:', state.currentState);
        return <SplashScreen />;
    }
  };

  return (
    <div style={{ 
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
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          backgroundColor: '#000000',
          border: '2px solid #ffffff',
          color: '#ffffff',
          padding: '8px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        ♿
      </button>

      {/* Main Content */}
      <main role="main" aria-live="polite">
        {renderCurrentScreen()}
      </main>

      {/* Accessibility Panel */}
      <AccessibilityPanel
        isOpen={showAccessibilityPanel}
        onClose={() => setShowAccessibilityPanel(false)}
      />

      {/* Global Screen Reader Announcements */}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-live="polite" aria-atomic="true">
        {state.error && `Error: ${state.error}`}
        {state.loading && 'Loading...'}
      </div>
    </div>
  );
};
