import { useState, useEffect, useCallback } from 'react';
import { audioAnnouncer } from '../services/AudioAnnouncer.js';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  audioOnly: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilityState extends AccessibilitySettings {
  announcements: string[];
  focusedElement: string | null;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  audioOnly: false,
  largeText: false,
  keyboardNavigation: false,
};

const STORAGE_KEY = 'f1-accessibility-settings';

export const useAccessibility = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }

    // Detect system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    if (prefersReducedMotion || prefersHighContrast) {
      setSettings(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion,
        highContrast: prefersHighContrast,
      }));
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }, [settings]);

  // Apply CSS classes based on settings
  useEffect(() => {
    const body = document.body;
    const classes = {
      'high-contrast': settings.highContrast,
      'reduced-motion': settings.reducedMotion,
      'audio-only-mode': settings.audioOnly,
      'large-text': settings.largeText,
      'keyboard-user': settings.keyboardNavigation,
    };

    Object.entries(classes).forEach(([className, shouldAdd]) => {
      if (shouldAdd) {
        body.classList.add(className);
      } else {
        body.classList.remove(className);
      }
    });

    return () => {
      Object.keys(classes).forEach(className => {
        body.classList.remove(className);
      });
    };
  }, [settings]);

  // Keyboard navigation detection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setSettings(prev => ({ ...prev, keyboardNavigation: true }));
      }
    };

    const handleMouseDown = () => {
      setSettings(prev => ({ ...prev, keyboardNavigation: false }));
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Sync audio-only mode with audio announcer
      if ('audioOnly' in newSettings) {
        audioAnnouncer.setEnabled(updated.audioOnly);
      }
      
      return updated;
    });
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message]);
    
    // Clear announcement after a delay
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(msg => msg !== message));
    }, 3000);

    // For immediate announcements, also use aria-live
    if (priority === 'assertive') {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'assertive');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.textContent = message;
      document.body.appendChild(announcer);

      setTimeout(() => {
        document.body.removeChild(announcer);
      }, 1000);
    }
  }, []);

  const announceGameState = useCallback((state: string, details?: any) => {
    const messages = {
      ready: 'Game ready. Press spacebar or click to react when lights go out.',
      'lights-starting': 'F1 lights sequence starting. Wait for all lights to go out.',
      'light-on': `Light ${details?.lightNumber || 1} of 5 activated.`,
      'all-lights-on': 'All lights on. Get ready to react!',
      'lights-out': 'Lights out! React now!',
      'false-start': 'False start! You reacted too early. Try again.',
      'reaction-recorded': `Reaction time: ${details?.time || 0} milliseconds. ${details?.rating || ''}`,
      'personal-best': 'New personal best achieved!',
      'leaderboard-updated': 'Score submitted to leaderboard.',
      'challenge-created': 'Challenge created and ready to share.',
      'challenge-accepted': 'Challenge accepted. Same conditions as your opponent.',
    };

    const message = messages[state as keyof typeof messages];
    if (message) {
      announce(message, state === 'lights-out' || state === 'false-start' ? 'assertive' : 'polite');
    }
  }, [announce]);

  const setFocus = useCallback((elementId: string) => {
    setFocusedElement(elementId);
    
    // Attempt to focus the element
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.focus();
      }
    }, 100);
  }, []);

  const getAriaLabel = useCallback((context: string, data?: any) => {
    const labels = {
      'f1-light': `F1 starting light ${data?.index || 1}. ${data?.active ? 'Active' : 'Inactive'}`,
      'reaction-button': 'React to lights. Press when all lights go out.',
      'play-again': 'Play another round',
      'submit-score': 'Submit your score to the leaderboard',
      'create-challenge': 'Create a challenge for other players',
      'leaderboard-entry': `Rank ${data?.rank || 0}: ${data?.username || 'Unknown'} with ${data?.time || 0} milliseconds`,
      'game-status': `Game status: ${data?.status || 'Unknown'}`,
    };

    return labels[context as keyof typeof labels] || context;
  }, []);

  const isMotionReduced = useCallback(() => {
    return settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [settings.reducedMotion]);

  const isHighContrast = useCallback(() => {
    return settings.highContrast || window.matchMedia('(prefers-contrast: high)').matches;
  }, [settings.highContrast]);

  return {
    settings,
    updateSettings,
    announce,
    announceGameState,
    announcements,
    focusedElement,
    setFocus,
    getAriaLabel,
    isMotionReduced,
    isHighContrast,
    state: {
      ...settings,
      announcements,
      focusedElement,
    } as AccessibilityState,
  };
};