import { useEffect, useState } from 'react';
import { useGameContext } from '../../hooks/useGameContext.js';
import { GameState } from '../../../shared/types/game.js';

export const GameScreen = () => {
  const { state, dispatch } = useGameContext();
  const [lights, setLights] = useState([false, false, false, false, false]);
  const [gamePhase, setGamePhase] = useState<'starting' | 'sequence' | 'waiting' | 'finished'>('starting');
  const [lightsOutTime, setLightsOutTime] = useState<number>(0);
  const [timeouts, setTimeouts] = useState<NodeJS.Timeout[]>([]);

  // Reset component state when game state changes
  useEffect(() => {
    if (state.currentState === GameState.LIGHTS_SEQUENCE) {
      // Clear any existing timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
      setTimeouts([]);
      
      // Reset local state
      setLights([false, false, false, false, false]);
      setGamePhase('starting');
      setLightsOutTime(0);
      
      // Start the sequence
      startSequence();
    }
  }, [state.currentState]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [timeouts]);

  // Handle keyboard input (spacebar)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && (gamePhase === 'sequence' || gamePhase === 'waiting')) {
        event.preventDefault();
        handleReaction();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gamePhase, lightsOutTime, timeouts]);

  // Start the light sequence
  const startSequence = () => {
    console.log('Starting F1 light sequence');
    setGamePhase('sequence');
    setLights([false, false, false, false, false]);

    // Create array to track timeouts for cleanup
    const newTimeouts: NodeJS.Timeout[] = [];

    // Activate lights one by one (900ms intervals)
    newTimeouts.push(setTimeout(() => setLights([true, false, false, false, false]), 0));
    newTimeouts.push(setTimeout(() => setLights([true, true, false, false, false]), 900));
    newTimeouts.push(setTimeout(() => setLights([true, true, true, false, false]), 1800));
    newTimeouts.push(setTimeout(() => setLights([true, true, true, true, false]), 2700));
    newTimeouts.push(setTimeout(() => setLights([true, true, true, true, true]), 3600));

    // Random delay then lights out (500-2500ms after all lights on)
    const randomDelay = Math.random() * 2000 + 500;
    newTimeouts.push(setTimeout(() => {
      setLights([false, false, false, false, false]);
      setLightsOutTime(performance.now());
      setGamePhase('waiting');
      dispatch({ type: 'TRANSITION_STATE', payload: GameState.WAITING_FOR_INPUT });
    }, 3600 + randomDelay));

    // Store timeouts for cleanup
    setTimeouts(newTimeouts);
  };

  // Handle user reaction
  const handleReaction = () => {
    if (gamePhase === 'sequence') {
      // False start - clear all timeouts to prevent further state changes
      timeouts.forEach(timeout => clearTimeout(timeout));
      setTimeouts([]);
      
      setGamePhase('finished');
      dispatch({ type: 'SET_RESULT', payload: {
        reactionTime: -1,
        rating: 'false_start',
        driverComparison: { userTime: -1, fasterThan: [], slowerThan: [], message: 'FALSE START!', icon: '⚠️', color: '#ff0000' },
        communityPercentile: 0,
        isPersonalBest: false
      }});
      dispatch({ type: 'TRANSITION_STATE', payload: GameState.SHOWING_RESULTS });
    } else if (gamePhase === 'waiting') {
      // Valid reaction
      setGamePhase('finished');
      const reactionTime = performance.now() - lightsOutTime;
      const getRating = (time: number) => {
        if (time < 200) return 'perfect';
        if (time < 300) return 'excellent';
        if (time < 400) return 'good';
        if (time < 500) return 'fair';
        return 'slow';
      };

      dispatch({ type: 'SET_RESULT', payload: {
        reactionTime,
        rating: getRating(reactionTime),
        driverComparison: { userTime: reactionTime, fasterThan: [], slowerThan: [], message: 'Great reaction!', icon: '🏎️', color: '#00ff00' },
        communityPercentile: Math.floor(Math.random() * 100),
        isPersonalBest: false
      }});
      dispatch({ type: 'TRANSITION_STATE', payload: GameState.SHOWING_RESULTS });
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        gap: '32px', 
        padding: '24px',
        cursor: gamePhase === 'waiting' ? 'pointer' : 'default'
      }}
      onClick={handleReaction}
    >
      <h1 style={{ 
        fontSize: 'clamp(24px, 5vw, 48px)', 
        color: gamePhase === 'waiting' ? '#00ff00' : '#ffffff',
        textAlign: 'center',
        fontFamily: '"Press Start 2P", monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        margin: 0
      }}>
        {gamePhase === 'starting' && 'GET READY...'}
        {gamePhase === 'sequence' && 'WAIT FOR IT...'}
        {gamePhase === 'waiting' && 'GO! GO! GO!'}
      </h1>

      {/* F1 Starting Lights */}
      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        padding: '32px',
        backgroundColor: '#1a1a1a',
        border: '2px solid #ffffff'
      }}>
        {lights.map((isOn, index) => (
          <div
            key={index}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: isOn ? '#ff0000' : '#333333',
              border: '2px solid #ffffff',
              boxShadow: isOn ? '0 0 20px #ff0000' : 'none',
              transition: 'all 0.1s ease'
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        {gamePhase === 'sequence' && (
          <p style={{ 
            color: '#ff0000', 
            fontSize: '18px',
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            DON'T REACT YET! WAIT FOR ALL LIGHTS TO GO OUT
          </p>
        )}
        {gamePhase === 'waiting' && (
          <p style={{ 
            color: '#00ff00', 
            fontSize: '18px',
            fontFamily: '"Press Start 2P", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            CLICK NOW OR PRESS SPACEBAR!
          </p>
        )}
      </div>
    </div>
  );
};
