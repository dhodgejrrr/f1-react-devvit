import React, { useEffect, useState } from 'react';

export type FeedbackType = 'false_start' | 'perfect' | 'excellent' | 'good' | 'fair' | 'slow';

interface VisualFeedbackProps {
  type: FeedbackType | null;
  onComplete?: () => void;
  duration?: number;
  showCooldown?: boolean;
}

/**
 * Visual Feedback Component
 * 
 * Provides authentic Pole Position 1982 screen flash effects for different result types:
 * - Red flash for false starts (300ms)
 * - Green flash for good reactions (200ms) 
 * - Gold flash for perfect reactions (400ms)
 * - Instant state changes with no fade transitions
 */
export const VisualFeedback: React.FC<VisualFeedbackProps> = ({
  type,
  onComplete,
  duration,
  showCooldown = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (type) {
      setIsVisible(true);
      
      // Get authentic flash duration based on type
      const flashDuration = duration || getFlashDuration(type);
      
      // For false starts, show cooldown countdown
      if (type === 'false_start' && showCooldown) {
        setCooldownRemaining(600); // 600ms cooldown
        
        const cooldownInterval = setInterval(() => {
          setCooldownRemaining((prev) => {
            if (prev <= 50) {
              clearInterval(cooldownInterval);
              return 0;
            }
            return prev - 50;
          });
        }, 50);

        const timer = setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
          clearInterval(cooldownInterval);
        }, Math.max(flashDuration, 600));

        return () => {
          clearTimeout(timer);
          clearInterval(cooldownInterval);
        };
      } else {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, flashDuration);

        return () => clearTimeout(timer);
      }
    }
  }, [type, duration, onComplete, showCooldown]);

  if (!type || !isVisible) {
    return null;
  }

  const getFlashDuration = (feedbackType: FeedbackType): number => {
    switch (feedbackType) {
      case 'false_start': return 300;
      case 'perfect': return 400;
      case 'excellent': 
      case 'good': return 200;
      default: return 150;
    }
  };

  const getFlashType = (feedbackType: FeedbackType): 'red' | 'green' | 'gold' | null => {
    switch (feedbackType) {
      case 'false_start': return 'red';
      case 'perfect': return 'gold';
      case 'excellent':
      case 'good': return 'green';
      default: return null;
    }
  };

  const flashType = getFlashType(type);

  return (
    <>
      {/* Screen Flash Effect */}
      {flashType && (
        <div 
          className={`screen-flash screen-flash-${flashType}`}
          aria-hidden="true"
        />
      )}

      {/* Message Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center">
          <div className={`text-arcade text-hero instant-change ${getMessageColor(type)}`}>
            {getFlashMessage(type)}
          </div>
          {type === 'false_start' && showCooldown && cooldownRemaining > 0 && (
            <div className="text-arcade text-large color-white" style={{ marginTop: 'var(--spacing-md)' }}>
              COOLDOWN: {Math.ceil(cooldownRemaining / 100) / 10}S
            </div>
          )}
        </div>
      </div>
    </>
  );
};

function getFlashMessage(type: FeedbackType): string {
  switch (type) {
    case 'false_start': return 'FALSE START!';
    case 'perfect': return 'PERFECT!';
    case 'excellent': return 'EXCELLENT!';
    case 'good': return 'GOOD!';
    case 'fair': return 'FAIR';
    case 'slow': return 'SLOW';
    default: return '';
  }
}

function getMessageColor(type: FeedbackType): string {
  switch (type) {
    case 'false_start': return 'color-red';
    case 'perfect': return 'color-gold';
    case 'excellent':
    case 'good': return 'color-green';
    case 'fair': return 'color-yellow';
    case 'slow': return 'color-white';
    default: return 'color-white';
  }
}

/**
 * Input State Manager Hook
 * 
 * Manages input state with proper cooldown periods and debouncing
 */
export const useInputStateManager = () => {
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const [lastInputTime, setLastInputTime] = useState(0);

  const enableInput = React.useCallback(() => {
    if (!isInCooldown) {
      setIsInputEnabled(true);
    }
  }, [isInCooldown]);

  const disableInput = React.useCallback(() => {
    setIsInputEnabled(false);
  }, []);

  const startCooldown = React.useCallback((duration: number = 600) => {
    setIsInputEnabled(false);
    setIsInCooldown(true);

    setTimeout(() => {
      setIsInCooldown(false);
    }, duration);
  }, []);

  const recordInput = React.useCallback(() => {
    const now = performance.now();
    setLastInputTime(now);
    return now;
  }, []);

  const shouldDebounce = React.useCallback((debounceTime: number = 50) => {
    const now = performance.now();
    return now - lastInputTime < debounceTime;
  }, [lastInputTime]);

  return {
    isInputEnabled,
    isInCooldown,
    enableInput,
    disableInput,
    startCooldown,
    recordInput,
    shouldDebounce,
  };
};