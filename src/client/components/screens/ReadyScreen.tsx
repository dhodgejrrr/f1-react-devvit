import { useState } from 'react';
import { useGameContext } from '../../hooks/useGameContext.js';
import { GameState } from '../../../shared/types/game.js';

export const ReadyScreen = () => {
  const { dispatch } = useGameContext();
  const [loading, setLoading] = useState(false);

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
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      {/* Status */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold text-yellow-400">READY TO START</h1>
        <div className="text-xl md:text-2xl text-white">PREPARE FOR THE F1 STARTING SEQUENCE</div>
      </div>

      {/* Instructions */}
      <div className="text-center space-y-4 max-w-2xl">
        <div className="bg-gray-900 p-6 rounded border border-yellow-400">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">INSTRUCTIONS:</h3>
          <div className="space-y-2 text-lg text-white">
            <p>1. FIVE RED LIGHTS WILL ILLUMINATE ONE BY ONE</p>
            <p>2. WAIT FOR ALL LIGHTS TO GO OUT SIMULTANEOUSLY</p>
            <p>3. CLICK ANYWHERE OR PRESS SPACEBAR TO REACT</p>
            <p>4. REACTING TOO EARLY = FALSE START!</p>
          </div>
        </div>
      </div>

      {/* Light Preview */}
      <div className="flex gap-4 my-6">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white bg-gray-800"
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={handleStartGame}
          disabled={loading}
          className="px-8 py-4 bg-green-600 text-white text-xl md:text-2xl font-bold 
                     hover:bg-green-700 active:bg-green-800 transition-colors
                     border-2 border-green-400 hover:border-green-300
                     transform hover:scale-105 active:scale-95 transition-transform
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'STARTING...' : 'START SEQUENCE'}
        </button>

        <button
          onClick={handleBackToMenu}
          className="px-8 py-4 bg-gray-600 text-white text-xl md:text-2xl font-bold 
                     hover:bg-gray-700 active:bg-gray-800 transition-colors
                     border-2 border-gray-400 hover:border-gray-300
                     transform hover:scale-105 active:scale-95 transition-transform"
        >
          BACK TO MENU
        </button>
      </div>

      {/* Tips */}
      <div className="text-center text-sm md:text-base text-gray-400 max-w-lg">
        <p>TIP: PROFESSIONAL F1 DRIVERS AVERAGE 200-300MS REACTION TIME</p>
        <p>CAN YOU BEAT THEM?</p>
      </div>
    </div>
  );
};
