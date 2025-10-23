import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface ScreenReaderAnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

export const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({
  message,
  priority = 'polite',
  clearAfter = 3000
}) => {
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      
      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          setCurrentMessage('');
        }, clearAfter);
        
        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
};

interface FocusTrapProps {
  isActive: boolean;
  children: React.ReactNode;
  onEscape?: () => void;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  isActive,
  children,
  onEscape
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    firstFocusableRef.current = focusableElements[0] as HTMLElement;
    lastFocusableRef.current = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    firstFocusableRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusableRef.current) {
            event.preventDefault();
            lastFocusableRef.current?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusableRef.current) {
            event.preventDefault();
            firstFocusableRef.current?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
};

interface KeyboardNavigationProps {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  onEnter,
  onSpace,
  onEscape,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  children,
  disabled = false
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
        if (onEnter) {
          event.preventDefault();
          onEnter();
        }
        break;
      case ' ':
        if (onSpace) {
          event.preventDefault();
          onSpace();
        }
        break;
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          event.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          event.preventDefault();
          onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          event.preventDefault();
          onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          event.preventDefault();
          onArrowRight();
        }
        break;
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};

interface AccessibilitySettingsProps {
  settings: {
    highContrast: boolean;
    reducedMotion: boolean;
    audioOnly: boolean;
    largeText: boolean;
  };
  onSettingsChange: (settings: any) => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  settings,
  onSettingsChange
}) => {
  const handleToggle = (setting: keyof typeof settings) => {
    onSettingsChange({
      ...settings,
      [setting]: !settings[setting]
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-arcade text-large color-white">
        ACCESSIBILITY OPTIONS
      </h3>
      
      <div className="space-y-3">
        <AccessibilityToggle
          label="HIGH CONTRAST MODE"
          description="Increases contrast for better visibility"
          checked={settings.highContrast}
          onChange={() => handleToggle('highContrast')}
        />
        
        <AccessibilityToggle
          label="REDUCED MOTION"
          description="Reduces animations and transitions"
          checked={settings.reducedMotion}
          onChange={() => handleToggle('reducedMotion')}
        />
        
        <AccessibilityToggle
          label="AUDIO-ONLY MODE"
          description="Provides audio cues for visual elements"
          checked={settings.audioOnly}
          onChange={() => handleToggle('audioOnly')}
        />
        
        <AccessibilityToggle
          label="LARGE TEXT"
          description="Increases text size for better readability"
          checked={settings.largeText}
          onChange={() => handleToggle('largeText')}
        />
      </div>
    </div>
  );
};

interface AccessibilityToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

const AccessibilityToggle: React.FC<AccessibilityToggleProps> = ({
  label,
  description,
  checked,
  onChange
}) => {
  return (
    <div className="flex items-start gap-3">
      <button
        className={clsx(
          'w-6 h-6',
          'border-2',
          'arcade-focus',
          'flex items-center justify-center',
          'transition-none',
          checked ? 'bg-yellow border-yellow' : 'bg-black border-white'
        )}
        onClick={onChange}
        aria-checked={checked}
        role="checkbox"
        aria-describedby={`${label.toLowerCase().replace(/\s+/g, '-')}-desc`}
      >
        {checked && (
          <span className="color-black text-small">✓</span>
        )}
      </button>
      
      <div className="flex-1">
        <div className="text-arcade text-medium color-white">
          {label}
        </div>
        <div 
          id={`${label.toLowerCase().replace(/\s+/g, '-')}-desc`}
          className="text-arcade text-small color-white opacity-75"
        >
          {description}
        </div>
      </div>
    </div>
  );
};

interface AudioOnlyGameProps {
  gameState: 'ready' | 'lights' | 'waiting' | 'go' | 'result';
  currentLight?: number;
  totalLights?: number;
  reactionTime?: number;
  onReaction: () => void;
}

export const AudioOnlyGame: React.FC<AudioOnlyGameProps> = ({
  gameState,
  currentLight = 0,
  totalLights = 5,
  reactionTime,
  onReaction
}) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    switch (gameState) {
      case 'ready':
        setAnnouncement('Game ready. Press spacebar when all lights go out.');
        break;
      case 'lights':
        setAnnouncement(`Light ${currentLight} of ${totalLights} activated.`);
        break;
      case 'waiting':
        setAnnouncement('All lights on. Wait for the signal...');
        break;
      case 'go':
        setAnnouncement('GO! Press spacebar now!');
        break;
      case 'result':
        if (reactionTime !== undefined) {
          setAnnouncement(`Your reaction time: ${reactionTime} milliseconds.`);
        }
        break;
    }
  }, [gameState, currentLight, totalLights, reactionTime]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-arcade text-large color-white text-center">
        AUDIO-ONLY MODE
      </div>
      
      <div className="text-arcade text-medium color-yellow text-center max-w-md">
        {announcement}
      </div>
      
      <KeyboardNavigation onSpace={onReaction}>
        <button
          className="text-arcade text-medium color-white border-2 border-white px-6 py-3 arcade-focus"
          onClick={onReaction}
        >
          REACT (SPACEBAR)
        </button>
      </KeyboardNavigation>
      
      <ScreenReaderAnnouncer message={announcement} priority="assertive" />
    </div>
  );
};

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      className={clsx(
        'sr-only',
        'focus:not-sr-only',
        'focus:absolute',
        'focus:top-4',
        'focus:left-4',
        'focus:z-50',
        'text-arcade',
        'color-yellow',
        'bg-black',
        'border-2',
        'border-yellow',
        'px-4',
        'py-2'
      )}
    >
      {children}
    </a>
  );
};