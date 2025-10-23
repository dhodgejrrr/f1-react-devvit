import { useGameContext } from '../../hooks/useGameContext.js';
import { GameState } from '../../types/index.js';

interface ErrorScreenProps {
  error: string;
}

export const ErrorScreen = ({ error }: ErrorScreenProps) => {
  const { dispatch } = useGameContext();

  const handleRetry = () => {
    // Clear error and try to initialize game
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'TRANSITION_STATE', payload: GameState.SPLASH });
  };

  const handleReload = () => {
    window.location.reload();
  };

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
      color: '#ffffff'
    }}>
      {/* Error Icon */}
      <div style={{ fontSize: 'clamp(48px, 10vw, 80px)', color: '#ff0000' }}>⚠️</div>

      {/* Error Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ 
          fontSize: 'clamp(24px, 5vw, 48px)', 
          color: '#ff0000', 
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0
        }}>ERROR</h1>
        <div style={{ 
          fontSize: 'clamp(16px, 3vw, 24px)', 
          color: '#ffffff', 
          fontFamily: '"Press Start 2P", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>SOMETHING WENT WRONG</div>
      </div>

      {/* Error Details */}
      <div className="arcade-container" style={{
        backgroundColor: 'var(--color-black)',
        padding: 'var(--spacing-lg)',
        border: '2px solid var(--color-red)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h3 className="text-arcade text-medium color-red" style={{ marginBottom: 'var(--spacing-md)' }}>
          ERROR DETAILS:
        </h3>
        <div className="text-arcade text-small color-white" style={{ wordBreak: 'break-word' }}>
          {error}
        </div>
      </div>

      {/* Troubleshooting Tips */}
      <div className="arcade-container" style={{
        backgroundColor: 'var(--color-black)',
        padding: 'var(--spacing-lg)',
        border: '2px solid var(--color-yellow)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h3 className="text-arcade text-medium color-yellow" style={{ marginBottom: 'var(--spacing-md)' }}>
          TROUBLESHOOTING:
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          <p className="text-arcade text-small color-white">• CHECK YOUR INTERNET CONNECTION</p>
          <p className="text-arcade text-small color-white">• REFRESH THE PAGE AND TRY AGAIN</p>
          <p className="text-arcade text-small color-white">• MAKE SURE YOUR BROWSER SUPPORTS MODERN WEB FEATURES</p>
          <p className="text-arcade text-small color-white">• DISABLE BROWSER EXTENSIONS THAT MIGHT INTERFERE</p>
          <p className="text-arcade text-small color-white">• TRY USING A DIFFERENT BROWSER</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', alignItems: 'center' }}>
        <button
          onClick={handleRetry}
          className="text-arcade arcade-focus instant-change touch-target"
          style={{
            padding: 'var(--spacing-md) var(--spacing-xl)',
            backgroundColor: 'var(--color-green)',
            color: 'var(--color-black)',
            fontSize: 'clamp(16px, 3vw, 20px)',
            border: '2px solid var(--color-white)',
            borderRadius: '0',
            cursor: 'pointer'
          }}
        >
          TRY AGAIN
        </button>

        <button
          onClick={handleReload}
          className="text-arcade arcade-focus instant-change touch-target"
          style={{
            padding: 'var(--spacing-md) var(--spacing-xl)',
            backgroundColor: 'var(--color-yellow)',
            color: 'var(--color-black)',
            fontSize: 'clamp(16px, 3vw, 20px)',
            border: '2px solid var(--color-white)',
            borderRadius: '0',
            cursor: 'pointer'
          }}
        >
          RELOAD PAGE
        </button>
      </div>

      {/* Support Information */}
      <div className="text-arcade text-small color-white" style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ marginBottom: 'var(--spacing-xs)' }}>IF THE PROBLEM PERSISTS, PLEASE REPORT IT TO THE DEVELOPERS</p>
        <p>INCLUDE THE ERROR MESSAGE ABOVE FOR FASTER RESOLUTION</p>
      </div>
    </div>
  );
};
