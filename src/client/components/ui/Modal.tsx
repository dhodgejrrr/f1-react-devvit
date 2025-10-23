import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { Button } from './Button.js';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'medium'
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-lg',
    fullscreen: 'w-full h-full max-w-none'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-75"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div className={clsx(
        'relative',
        'arcade-container',
        'border-2',
        'border-white',
        'w-full',
        sizeClasses[size],
        size !== 'fullscreen' && 'max-h-[90vh]',
        'overflow-y-auto'
      )}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b-2 border-white">
            {title && (
              <h2 id="modal-title" className="text-arcade text-large color-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="secondary"
                size="small"
                onClick={onClose}
                aria-label="Close modal"
              >
                ✕
              </Button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="HOW TO PLAY" size="medium">
      <div className="space-y-4">
        <div className="text-arcade text-medium color-white">
          <p className="mb-4">REACT TO THE F1 STARTING LIGHTS!</p>
          
          <div className="space-y-3 text-small">
            <div>
              <span className="color-yellow">1.</span> WATCH THE 5 RED LIGHTS
            </div>
            <div>
              <span className="color-yellow">2.</span> LIGHTS TURN ON ONE BY ONE
            </div>
            <div>
              <span className="color-yellow">3.</span> WHEN ALL LIGHTS GO OUT - REACT!
            </div>
            <div>
              <span className="color-yellow">4.</span> CLICK OR PRESS SPACEBAR
            </div>
          </div>
          
          <div className="mt-6 p-3 border border-red">
            <div className="color-red text-small">
              WARNING: DON'T REACT TOO EARLY!
            </div>
            <div className="color-white text-small mt-1">
              FALSE START = PENALTY
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-6">
          <Button variant="primary" onClick={onClose} fullWidth>
            GOT IT!
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title = "ERROR",
  message,
  actionLabel = "TRY AGAIN",
  onAction
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <div className="space-y-4">
        <div className="text-center mb-4">
          <div className="text-6xl mb-2">❌</div>
          <div className="text-arcade text-medium color-red">
            {message}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} fullWidth>
            CLOSE
          </Button>
          {onAction && (
            <Button variant="primary" onClick={onAction} fullWidth>
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "CONFIRM",
  message,
  confirmLabel = "CONFIRM",
  cancelLabel = "CANCEL",
  variant = 'info'
}) => {
  const variantConfig = {
    danger: { icon: '⚠️', color: 'red', buttonVariant: 'danger' as const },
    warning: { icon: '⚠️', color: 'yellow', buttonVariant: 'secondary' as const },
    info: { icon: 'ℹ️', color: 'white', buttonVariant: 'primary' as const },
  };

  const config = variantConfig[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <div className="space-y-4">
        <div className="text-center mb-4">
          <div className="text-6xl mb-2">{config.icon}</div>
          <div className={clsx('text-arcade text-medium', `color-${config.color}`)}>
            {message}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} fullWidth>
            {cancelLabel}
          </Button>
          <Button variant={config.buttonVariant} onClick={onConfirm} fullWidth>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    audioEnabled: boolean;
    difficulty: string;
    accessibility: boolean;
  };
  onSettingsChange: (settings: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  const handleToggle = (key: string) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key as keyof typeof settings]
    });
  };

  const handleDifficultyChange = (difficulty: string) => {
    onSettingsChange({
      ...settings,
      difficulty
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SETTINGS" size="medium">
      <div className="space-y-6">
        {/* Audio Settings */}
        <div className="space-y-2">
          <div className="text-arcade text-medium color-white">AUDIO</div>
          <Button
            variant={settings.audioEnabled ? 'success' : 'secondary'}
            onClick={() => handleToggle('audioEnabled')}
            fullWidth
          >
            {settings.audioEnabled ? '🔊 ENABLED' : '🔇 DISABLED'}
          </Button>
        </div>

        {/* Difficulty Settings */}
        <div className="space-y-2">
          <div className="text-arcade text-medium color-white">DIFFICULTY</div>
          <div className="grid grid-cols-2 gap-2">
            {['EASY', 'NORMAL', 'HARD', 'PRO'].map((diff) => (
              <Button
                key={diff}
                variant={settings.difficulty === diff.toLowerCase() ? 'primary' : 'outline'}
                onClick={() => handleDifficultyChange(diff.toLowerCase())}
                size="small"
              >
                {diff}
              </Button>
            ))}
          </div>
        </div>

        {/* Accessibility Settings */}
        <div className="space-y-2">
          <div className="text-arcade text-medium color-white">ACCESSIBILITY</div>
          <Button
            variant={settings.accessibility ? 'success' : 'secondary'}
            onClick={() => handleToggle('accessibility')}
            fullWidth
          >
            {settings.accessibility ? '♿ ENHANCED' : '♿ STANDARD'}
          </Button>
        </div>

        <div className="flex justify-center mt-6">
          <Button variant="primary" onClick={onClose} fullWidth>
            SAVE SETTINGS
          </Button>
        </div>
      </div>
    </Modal>
  );
};