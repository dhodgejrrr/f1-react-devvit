import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface ScreenFlashProps {
  type: 'red' | 'green' | 'gold' | null;
  onComplete?: () => void;
}

export const ScreenFlash: React.FC<ScreenFlashProps> = ({ type, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (type) {
      setIsVisible(true);
      
      const duration = type === 'red' ? 300 : type === 'green' ? 200 : 400;
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [type, onComplete]);

  if (!isVisible || !type) return null;

  return (
    <div 
      className={clsx('screen-flash', `screen-flash-${type}`)}
      aria-hidden="true"
    />
  );
};

interface ResultDisplayProps {
  time: number;
  rating: 'perfect' | 'excellent' | 'good' | 'fair' | 'slow' | 'false_start';
  isPersonalBest?: boolean;
  driverComparison?: {
    message: string;
    icon: string;
    color: string;
  };
  communityPercentile?: number;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  time,
  rating,
  isPersonalBest = false,
  driverComparison,
  communityPercentile
}) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const ratingConfig = {
    perfect: { color: 'gold', text: 'PERFECT!', flashType: 'gold' as const },
    excellent: { color: 'green', text: 'EXCELLENT!', flashType: 'green' as const },
    good: { color: 'green', text: 'GOOD!', flashType: 'green' as const },
    fair: { color: 'white', text: 'FAIR', flashType: null },
    slow: { color: 'white', text: 'SLOW', flashType: null },
    false_start: { color: 'red', text: 'FALSE START!', flashType: 'red' as const }
  };

  const config = ratingConfig[rating];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Hero Time Display */}
      <div className={clsx(
        'text-center',
        'transition-all',
        'duration-500',
        isAnimating && 'transform scale-110 opacity-0'
      )}>
        {rating !== 'false_start' ? (
          <div className={clsx('text-hero', `color-${config.color}`)}>
            {time.toFixed(3)}MS
          </div>
        ) : (
          <div className="text-hero color-red">
            FALSE START!
          </div>
        )}
      </div>

      {/* Rating Display */}
      <div className={clsx(
        'text-large',
        `color-${config.color}`,
        'text-center',
        'transition-all',
        'duration-300',
        'delay-200',
        isAnimating && 'transform translate-y-4 opacity-0'
      )}>
        {config.text}
      </div>

      {/* Personal Best Indicator */}
      {isPersonalBest && rating !== 'false_start' && (
        <div className={clsx(
          'flex items-center gap-2',
          'text-medium color-gold',
          'border-2 border-gold',
          'px-4 py-2',
          'transition-all',
          'duration-300',
          'delay-400',
          isAnimating && 'transform scale-95 opacity-0'
        )}>
          <span>⭐</span>
          <span>PERSONAL BEST!</span>
          <span>⭐</span>
        </div>
      )}

      {/* Driver Comparison */}
      {driverComparison && rating !== 'false_start' && (
        <div className={clsx(
          'text-center',
          'transition-all',
          'duration-300',
          'delay-600',
          isAnimating && 'transform translate-y-4 opacity-0'
        )}>
          <div className={clsx('text-medium', `color-${driverComparison.color}`)}>
            {driverComparison.icon} {driverComparison.message}
          </div>
        </div>
      )}

      {/* Community Percentile */}
      {communityPercentile !== undefined && rating !== 'false_start' && (
        <div className={clsx(
          'text-center',
          'transition-all',
          'duration-300',
          'delay-800',
          isAnimating && 'transform translate-y-4 opacity-0'
        )}>
          <div className="text-small color-white">
            BETTER THAN {communityPercentile}% OF PLAYERS
          </div>
        </div>
      )}
    </div>
  );
};

interface LightGlowProps {
  isActive: boolean;
  color?: 'red' | 'green' | 'yellow';
  size?: 'small' | 'medium' | 'large';
  intensity?: 'low' | 'medium' | 'high';
}

export const LightGlow: React.FC<LightGlowProps> = ({
  isActive,
  color = 'red',
  size = 'medium',
  intensity = 'medium'
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const colorClasses = {
    red: 'bg-red',
    green: 'bg-green',
    yellow: 'bg-yellow'
  };

  const glowIntensity = {
    low: '10px',
    medium: '20px',
    high: '30px'
  };

  return (
    <div 
      className={clsx(
        'rounded-full',
        'border-2 border-white',
        'transition-none',
        sizeClasses[size],
        isActive ? colorClasses[color] : 'bg-gray-800'
      )}
      style={{
        boxShadow: isActive 
          ? `0 0 ${glowIntensity[intensity]} var(--color-${color}), inset 0 0 10px rgba(255, 255, 255, 0.3)`
          : 'none'
      }}
    />
  );
};

interface PulseAnimationProps {
  isActive: boolean;
  color?: 'white' | 'yellow' | 'red' | 'green' | 'gold';
  children: React.ReactNode;
}

export const PulseAnimation: React.FC<PulseAnimationProps> = ({
  isActive,
  color = 'yellow',
  children
}) => {
  return (
    <div className={clsx(
      'transition-all duration-300',
      isActive && [
        'animate-pulse',
        `color-${color}`,
        'transform scale-105'
      ]
    )}>
      {children}
    </div>
  );
};

interface CountdownProps {
  count: number;
  onComplete: () => void;
  size?: 'medium' | 'large' | 'hero';
}

export const Countdown: React.FC<CountdownProps> = ({
  count,
  onComplete,
  size = 'hero'
}) => {
  const [currentCount, setCurrentCount] = useState(count);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (currentCount > 0) {
      const timer = setTimeout(() => {
        setCurrentCount(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      onComplete();
    }
  }, [currentCount, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="flex items-center justify-center h-full">
      <div className={clsx(
        'text-arcade',
        `text-${size}`,
        'color-yellow',
        'animate-pulse',
        'text-center'
      )}>
        {currentCount > 0 ? currentCount : 'GO!'}
      </div>
    </div>
  );
};

interface AchievementBadgeProps {
  achievement: {
    title: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
  isVisible: boolean;
  onClose: () => void;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  isVisible,
  onClose
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const rarityColors = {
    common: 'white',
    rare: 'green',
    epic: 'yellow',
    legendary: 'gold'
  };

  if (!isVisible) return null;

  return (
    <div className={clsx(
      'fixed top-4 right-4 z-50',
      'border-2',
      `border-${rarityColors[achievement.rarity]}`,
      'bg-black',
      'p-4',
      'max-w-xs',
      'transition-all duration-300',
      isAnimating ? 'transform translate-x-0 opacity-100' : 'transform translate-x-full opacity-0'
    )}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">
          {achievement.icon}
        </div>
        <div>
          <div className={clsx('text-arcade text-small', `color-${rarityColors[achievement.rarity]}`)}>
            {achievement.title}
          </div>
          <div className="text-arcade text-small color-white opacity-75">
            {achievement.description}
          </div>
        </div>
      </div>
    </div>
  );
};