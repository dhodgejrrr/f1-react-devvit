import React from 'react';
import { clsx } from 'clsx';

interface HUDDisplayProps {
  className?: string;
  children: React.ReactNode;
}

export const HUDDisplay: React.FC<HUDDisplayProps> = ({ className, children }) => {
  return (
    <div className={clsx('arcade-container', 'p-4', 'border-2', 'border-white', className)}>
      {children}
    </div>
  );
};

interface HUDItemProps {
  label: string;
  value: string | number;
  color?: 'white' | 'yellow' | 'red' | 'green' | 'gold';
  size?: 'small' | 'medium' | 'large';
}

export const HUDItem: React.FC<HUDItemProps> = ({
  label,
  value,
  color = 'white',
  size = 'medium'
}) => {
  const colorClass = `color-${color}`;
  const sizeClass = `text-${size}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={clsx('text-arcade', 'text-small', 'color-white')}>
        {label}
      </div>
      <div className={clsx('text-arcade', sizeClass, colorClass)}>
        {value}
      </div>
    </div>
  );
};

interface ScoreDisplayProps {
  score: number;
  label?: string;
  color?: 'white' | 'yellow' | 'red' | 'green' | 'gold';
  size?: 'small' | 'medium' | 'large' | 'hero';
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  label = 'SCORE',
  color = 'yellow',
  size = 'large'
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-arcade text-small color-white">
        {label}
      </div>
      <div className={clsx('text-arcade', `text-${size}`, `color-${color}`)}>
        {score.toLocaleString()}
      </div>
    </div>
  );
};

interface TimeDisplayProps {
  time: number; // milliseconds
  label?: string;
  showUnit?: boolean;
  color?: 'white' | 'yellow' | 'red' | 'green' | 'gold';
  size?: 'small' | 'medium' | 'large' | 'hero';
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  time,
  label = 'TIME',
  showUnit = true,
  color = 'yellow',
  size = 'hero'
}) => {
  const formattedTime = `${time}${showUnit ? 'MS' : ''}`;

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="text-arcade text-small color-white">
          {label}
        </div>
      )}
      <div className={clsx('text-arcade', `text-${size}`, `color-${color}`)}>
        {formattedTime}
      </div>
    </div>
  );
};

interface StatusIndicatorProps {
  status: 'ready' | 'waiting' | 'go' | 'false-start' | 'perfect' | 'good' | 'fair' | 'excellent' | 'slow';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'medium',
  animated = false
}) => {
  const statusConfig = {
    ready: { text: 'READY', color: 'white', icon: '🏁' },
    waiting: { text: 'WAIT...', color: 'yellow', icon: '⏳' },
    go: { text: 'GO!', color: 'green', icon: '🚀' },
    'false-start': { text: 'FALSE START!', color: 'red', icon: '❌' },
    perfect: { text: 'PERFECT!', color: 'gold', icon: '⭐' },
    excellent: { text: 'EXCELLENT!', color: 'green', icon: '✨' },
    good: { text: 'GOOD!', color: 'green', icon: '👍' },
    fair: { text: 'FAIR', color: 'white', icon: '👌' },
    slow: { text: 'SLOW', color: 'red', icon: '🐌' },
  };

  const config = statusConfig[status];

  return (
    <div className={clsx(
      'text-arcade', 
      `text-${size}`, 
      `color-${config.color}`, 
      'text-center',
      'flex',
      'items-center',
      'justify-center',
      'gap-2',
      animated && 'animate-pulse'
    )}>
      <span className="text-2xl">{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
};

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  color?: 'white' | 'yellow' | 'red' | 'green' | 'gold';
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  color = 'yellow',
  size = 'medium',
  showPercentage = true
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    small: 'h-2',
    medium: 'h-4',
    large: 'h-6'
  };

  return (
    <div className="w-full">
      {label && (
        <div className="text-arcade text-small color-white mb-2 flex justify-between">
          <span>{label}</span>
          {showPercentage && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={clsx('w-full border-2 border-white bg-black', sizeClasses[size])}>
        <div 
          className={clsx('h-full transition-none', `bg-${color}`)}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};

interface CounterProps {
  value: number;
  label?: string;
  increment?: () => void;
  decrement?: () => void;
  min?: number;
  max?: number;
  color?: 'white' | 'yellow' | 'red' | 'green' | 'gold';
  size?: 'small' | 'medium' | 'large';
}

export const Counter: React.FC<CounterProps> = ({
  value,
  label,
  increment,
  decrement,
  min,
  max,
  color = 'yellow',
  size = 'medium'
}) => {
  const canIncrement = max === undefined || value < max;
  const canDecrement = min === undefined || value > min;

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="text-arcade text-small color-white">
          {label}
        </div>
      )}
      <div className="flex items-center gap-3">
        {decrement && (
          <button
            className={clsx(
              'arcade-focus text-arcade border-2 px-2 py-1 min-w-[32px] min-h-[32px]',
              canDecrement 
                ? 'border-white color-white hover:bg-white hover:color-black cursor-pointer'
                : 'border-gray-500 color-gray-500 cursor-not-allowed opacity-50'
            )}
            onClick={decrement}
            disabled={!canDecrement}
            aria-label={`Decrease ${label || 'value'}`}
          >
            -
          </button>
        )}
        <div className={clsx('text-arcade', `text-${size}`, `color-${color}`, 'min-w-[60px] text-center')}>
          {value}
        </div>
        {increment && (
          <button
            className={clsx(
              'arcade-focus text-arcade border-2 px-2 py-1 min-w-[32px] min-h-[32px]',
              canIncrement 
                ? 'border-white color-white hover:bg-white hover:color-black cursor-pointer'
                : 'border-gray-500 color-gray-500 cursor-not-allowed opacity-50'
            )}
            onClick={increment}
            disabled={!canIncrement}
            aria-label={`Increase ${label || 'value'}`}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};