
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { GameProvider } from './contexts/GameContext.js';

// SIMPLIFIED TEST: Test GameContext without GameRouter
export const App = () => {
  console.log('App rendering - SIMPLIFIED TEST');
  
  return (
    <ErrorBoundary>
      <GameProvider>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#000000',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
          padding: '20px'
        }}>
          <h1 style={{ color: '#ffff00', fontSize: '48px', marginBottom: '20px' }}>
            GAMECONTEXT TEST
          </h1>
          <p style={{ color: '#ffffff', fontSize: '24px', marginBottom: '20px' }}>
            If you see this, GameProvider works
          </p>
          <TestComponent />
        </div>
      </GameProvider>
    </ErrorBoundary>
  );
};

// Test component to check useGameContext
const TestComponent = () => {
  try {
    const { useGameContext } = require('./hooks/useGameContext.js');
    const { state } = useGameContext();
    
    return (
      <div style={{ color: '#00ff00', fontSize: '18px', textAlign: 'center' }}>
        <p>✓ useGameContext works!</p>
        <p>Current State: {state.currentState}</p>
        <p>Loading: {state.loading ? 'true' : 'false'}</p>
        <p>Error: {state.error || 'none'}</p>
      </div>
    );
  } catch (error) {
    return (
      <div style={{ color: '#ff0000', fontSize: '18px', textAlign: 'center' }}>
        <p>✗ useGameContext failed!</p>
        <p>Error: {error instanceof Error ? error.message : String(error)}</p>
      </div>
    );
  }
};


