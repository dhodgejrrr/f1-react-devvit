
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { GameProvider } from './contexts/GameContext.js';
import { GameRouter } from './components/GameRouter.js';

import { ErrorBoundary } from './components/ErrorBoundary.js';
import { GameProvider } from './contexts/GameContext.js';
import { GameRouter } from './components/GameRouter.js';

export const App = () => {
  console.log('App: Rendering F1 Challenge game');
  return (
    <ErrorBoundary>
      <GameProvider>
        <GameRouter />
      </GameProvider>
    </ErrorBoundary>
  );
};


