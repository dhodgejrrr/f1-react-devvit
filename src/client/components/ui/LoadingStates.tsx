import React from 'react';
import { clsx } from 'clsx';
import { Button } from './Button.js';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'white' | 'yellow' | 'red' | 'green';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'yellow'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    white: 'border-white',
    yellow: 'border-yellow',
    red: 'border-red',
    green: 'border-green'
  };

  return (
    <div className={clsx(
      'animate-spin',
      'border-2',
      'border-t-transparent',
      sizeClasses[size],
      colorClasses[color]
    )} />
  );
};

interface LoadingScreenProps {
  message?: string;
  showSpinner?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'LOADING...',
  showSpinner = true
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      {showSpinner && <LoadingSpinner size="large" />}
      <div className="text-arcade text-large color-white text-center">
        {message}
      </div>
    </div>
  );
};

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  loadingText = 'LOADING...',
  disabled,
  onClick,
  variant = 'primary',
  size = 'medium',
  fullWidth = false
}) => {
  const baseClasses = [
    'arcade-focus',
    'text-arcade',
    'border-2',
    'cursor-pointer',
    'select-none',
    'transition-none',
    'active:transform',
    'active:translate-y-0.5',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'flex',
    'items-center',
    'justify-center',
    'gap-2'
  ];

  const variantClasses = {
    primary: [
      'bg-black',
      'color-white',
      'border-white',
      'hover:bg-white',
      'hover:color-black',
    ],
    secondary: [
      'bg-black',
      'color-yellow',
      'border-yellow',
      'hover:bg-yellow',
      'hover:color-black',
    ],
    danger: [
      'bg-black',
      'color-red',
      'border-red',
      'hover:bg-red',
      'hover:color-white',
    ],
    success: [
      'bg-black',
      'color-green',
      'border-green',
      'hover:bg-green',
      'hover:color-black',
    ],
  };

  const sizeClasses = {
    small: ['text-small', 'px-3', 'py-2', 'min-h-[32px]'],
    medium: ['text-medium', 'px-4', 'py-3', 'min-h-[44px]'],
    large: ['text-large', 'px-6', 'py-4', 'min-h-[56px]'],
  };

  const widthClasses = fullWidth ? ['w-full'] : [];

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        widthClasses
      )}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading && <LoadingSpinner size="small" color="white" />}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'error' | 'success' | 'warning';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  variant = 'default'
}) => {
  const variantConfig = {
    default: { icon: '📊', color: 'white' },
    error: { icon: '❌', color: 'red' },
    success: { icon: '✅', color: 'green' },
    warning: { icon: '⚠️', color: 'yellow' },
  };

  const config = variantConfig[variant];
  const displayIcon = icon || config.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="text-6xl mb-2">
        {displayIcon}
      </div>
      
      <div className={clsx('text-arcade text-large', `color-${config.color}`)}>
        {title}
      </div>
      
      {message && (
        <div className="text-arcade text-medium color-white opacity-75 max-w-md">
          {message}
        </div>
      )}
      
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className
}) => {
  return (
    <div
      className={clsx(
        'bg-gray-700 animate-pulse',
        className
      )}
      style={{ width, height }}
      role="status"
      aria-label="Loading content"
    />
  );
};

interface LoadingDotsProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'white' | 'yellow' | 'red' | 'green';
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'medium',
  color = 'yellow'
}) => {
  const sizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  const colorClasses = {
    white: 'bg-white',
    yellow: 'bg-yellow',
    red: 'bg-red',
    green: 'bg-green'
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={clsx(
            'rounded-full animate-bounce',
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
};

interface ProgressiveLoadingProps {
  steps: string[];
  currentStep: number;
  error?: string;
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  steps,
  currentStep,
  error
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <LoadingSpinner size="large" />
      
      <div className="w-full max-w-md space-y-3">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isError = error && isCurrent;
          
          return (
            <div
              key={index}
              className={clsx(
                'flex items-center gap-3 p-2 border-2',
                isCompleted && 'border-green color-green',
                isCurrent && !isError && 'border-yellow color-yellow',
                isError && 'border-red color-red',
                !isCompleted && !isCurrent && 'border-gray-600 color-gray-400'
              )}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {isCompleted && '✓'}
                {isCurrent && !isError && <LoadingDots size="small" />}
                {isError && '✗'}
                {!isCompleted && !isCurrent && (index + 1)}
              </div>
              <div className="text-arcade text-small">
                {step}
              </div>
            </div>
          );
        })}
      </div>
      
      {error && (
        <div className="text-arcade text-medium color-red text-center max-w-md">
          {error}
        </div>
      )}
    </div>
  );
};