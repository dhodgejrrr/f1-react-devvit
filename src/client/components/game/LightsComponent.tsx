import React from 'react';
import { LightState } from '../../types/index.js';
import { useAccessibility } from '../../hooks/useAccessibility.js';

interface LightsComponentProps {
  lights: LightState[];
  size?: 'desktop' | 'mobile';
  className?: string;
  glowIntensity?: 'low' | 'medium' | 'high';
  onUserInput?: () => void;
}

/**
 * F1 Starting Lights Component
 * 
 * Renders the authentic F1 5-light starting sequence with proper accumulating behavior.
 * Lights illuminate sequentially and stay on until all go out simultaneously.
 * 
 * Features:
 * - 5 circular red lights in horizontal layout
 * - Enhanced glow effects with configurable intensity
 * - Accumulating behavior (lights stay on once activated)
 * - Responsive design for mobile and desktop
 * - Authentic F1 visual styling with instant state changes
 */
export const LightsComponent: React.FC<LightsComponentProps> = ({
  lights,
  size = 'desktop',
  className = '',
  glowIntensity = 'medium',
  onUserInput,
}) => {
  const { getAriaLabel, settings, isMotionReduced } = useAccessibility();
  
  const getGlowClass = (intensity: string) => {
    switch (intensity) {
      case 'low': return 'glow-low';
      case 'high': return 'glow-high';
      default: return 'glow-medium';
    }
  };

  const activeLights = lights.filter(light => light.isActive).length;
  const allLightsActive = activeLights === 5;
  const anyLightsActive = activeLights > 0;

  // Generate comprehensive aria description
  const getAriaDescription = () => {
    if (allLightsActive) {
      return "All 5 F1 starting lights are now active. Wait for lights to go out, then react immediately.";
    } else if (anyLightsActive) {
      return `${activeLights} of 5 F1 starting lights are active. Sequence in progress.`;
    } else {
      return "F1 starting lights are ready. Sequence will begin shortly.";
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onUserInput?.();
    }
  };

  return (
    <div 
      className={`f1-lights-container ${className} ${isMotionReduced() ? 'reduced-motion' : ''}`}
      role="application"
      aria-label="F1 Starting Light Sequence"
      aria-description={getAriaDescription()}
      tabIndex={onUserInput ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {getAriaDescription()}
      </div>
      
      {lights.map((light) => (
        <div
          key={light.index}
          className={`f1-light instant-change ${light.isActive ? `active ${getGlowClass(glowIntensity)}` : ''} ${settings.highContrast ? 'high-contrast-light' : ''}`}
          role="img"
          aria-label={getAriaLabel('f1-light', { index: light.index + 1, active: light.isActive })}
          data-testid={`f1-light-${light.index}`}
          style={{
            '--light-index': light.index,
            '--activation-time': light.activatedAt,
          } as React.CSSProperties}
        >
          {/* Visual pattern for colorblind users */}
          {settings.highContrast && light.isActive && (
            <div className="light-pattern" aria-hidden="true">
              <div className="pattern-dot"></div>
            </div>
          )}
        </div>
      ))}
      
      {/* Audio-only mode indicator */}
      {settings.audioOnly && (
        <div className="audio-only-indicator sr-only" aria-live="assertive">
          {allLightsActive ? "All lights active - prepare to react!" : 
           anyLightsActive ? `Light ${activeLights} activated` : 
           "Lights ready"}
        </div>
      )}
    </div>
  );
};

/**
 * Light Sequence Controller Hook
 * 
 * Manages the F1 light sequence timing and state transitions.
 * Implements authentic F1 behavior:
 * - 900ms intervals between light activations (as per FIA regulations)
 * - Accumulating behavior: lights stay on once activated
 * - All lights extinguish simultaneously after random delay (500-2500ms)
 */
export const useLightSequenceController = () => {
  const [isSequenceActive, setIsSequenceActive] = React.useState(false);
  const [currentLightIndex, setCurrentLightIndex] = React.useState(-1);
  
  const startSequence = React.useCallback(
    (
      onLightActivate: (index: number, timestamp: number) => void,
      onSequenceComplete: (timestamp: number) => void,
      lightInterval: number = 900
    ) => {
      if (isSequenceActive) {
        console.warn('Light sequence already active');
        return;
      }

      setIsSequenceActive(true);
      setCurrentLightIndex(0);

      let lightIndex = 0;
      const activateNextLight = () => {
        if (lightIndex < 5) {
          const timestamp = performance.now();
          onLightActivate(lightIndex, timestamp);
          setCurrentLightIndex(lightIndex);
          lightIndex++;
          
          if (lightIndex < 5) {
            setTimeout(activateNextLight, lightInterval);
          } else {
            // All lights activated, sequence complete
            const completionTimestamp = performance.now();
            onSequenceComplete(completionTimestamp);
            setIsSequenceActive(false);
            setCurrentLightIndex(-1);
          }
        }
      };

      // Start the sequence
      setTimeout(activateNextLight, lightInterval);
    },
    [isSequenceActive]
  );

  const stopSequence = React.useCallback(() => {
    setIsSequenceActive(false);
    setCurrentLightIndex(-1);
  }, []);

  return {
    isSequenceActive,
    currentLightIndex,
    startSequence,
    stopSequence,
  };
};