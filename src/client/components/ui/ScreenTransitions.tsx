import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface ScreenTransitionProps {
  isVisible: boolean;
  direction?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'instant';
  duration?: number;
  children: React.ReactNode;
}

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  isVisible,
  direction = 'fade',
  duration = 300,
  children
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTimeout(() => setShouldRender(false), duration);
    }
  }, [isVisible, duration]);

  if (!shouldRender) return null;

  const getTransitionClasses = () => {
    const baseClasses = ['transition-all', 'ease-out'];
    
    if (direction === 'instant') {
      return ['transition-none'];
    }

    baseClasses.push(`duration-${duration}`);

    const directionClasses = {
      fade: {
        enter: 'opacity-100',
        exit: 'opacity-0'
      },
      'slide-up': {
        enter: 'opacity-100 transform translate-y-0',
        exit: 'opacity-0 transform translate-y-4'
      },
      'slide-down': {
        enter: 'opacity-100 transform translate-y-0',
        exit: 'opacity-0 transform -translate-y-4'
      },
      'slide-left': {
        enter: 'opacity-100 transform translate-x-0',
        exit: 'opacity-0 transform translate-x-4'
      },
      'slide-right': {
        enter: 'opacity-100 transform translate-x-0',
        exit: 'opacity-0 transform -translate-x-4'
      }
    };

    const classes = directionClasses[direction];
    return [
      ...baseClasses,
      ...(isAnimating ? classes.enter.split(' ') : classes.exit.split(' '))
    ];
  };

  return (
    <div className={clsx(getTransitionClasses())}>
      {children}
    </div>
  );
};

interface PageTransitionProps {
  currentPage: string;
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  currentPage,
  children
}) => {
  const [displayedPage, setDisplayedPage] = useState(currentPage);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (currentPage !== displayedPage) {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setDisplayedPage(currentPage);
        setIsTransitioning(false);
      }, 150); // Half of transition duration for crossfade effect
    }
  }, [currentPage, displayedPage]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className={clsx(
        'absolute inset-0',
        'transition-opacity duration-300 ease-out',
        isTransitioning ? 'opacity-0' : 'opacity-100'
      )}>
        {children}
      </div>
    </div>
  );
};

interface SlideTransitionProps {
  isVisible: boolean;
  from?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  isVisible,
  from = 'bottom',
  children
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  const transformClasses = {
    top: isVisible ? 'translate-y-0' : '-translate-y-full',
    bottom: isVisible ? 'translate-y-0' : 'translate-y-full',
    left: isVisible ? 'translate-x-0' : '-translate-x-full',
    right: isVisible ? 'translate-x-0' : 'translate-x-full'
  };

  return (
    <div className={clsx(
      'transition-transform duration-300 ease-out',
      transformClasses[from]
    )}>
      {children}
    </div>
  );
};

interface FadeTransitionProps {
  isVisible: boolean;
  delay?: number;
  duration?: number;
  children: React.ReactNode;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  isVisible,
  delay = 0,
  duration = 300,
  children
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsAnimating(true), delay);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay, duration]);

  if (!shouldRender) return null;

  return (
    <div 
      className={clsx(
        'transition-opacity ease-out',
        `duration-${duration}`,
        isAnimating ? 'opacity-100' : 'opacity-0'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

interface StaggeredAnimationProps {
  items: React.ReactNode[];
  isVisible: boolean;
  staggerDelay?: number;
  animationType?: 'fade' | 'slide-up' | 'scale';
}

export const StaggeredAnimation: React.FC<StaggeredAnimationProps> = ({
  items,
  isVisible,
  staggerDelay = 100,
  animationType = 'fade'
}) => {
  const getAnimationClasses = () => {
    const baseClasses = ['transition-all', 'duration-300', 'ease-out'];
    
    if (animationType === 'fade') {
      return [
        ...baseClasses,
        isVisible ? 'opacity-100' : 'opacity-0'
      ];
    }
    
    if (animationType === 'slide-up') {
      return [
        ...baseClasses,
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-4'
      ];
    }
    
    if (animationType === 'scale') {
      return [
        ...baseClasses,
        isVisible 
          ? 'opacity-100 transform scale-100' 
          : 'opacity-0 transform scale-95'
      ];
    }
    
    return baseClasses;
  };

  return (
    <>
      {items.map((item, index) => (
        <div
          key={index}
          className={clsx(getAnimationClasses())}
          style={{ 
            transitionDelay: isVisible ? `${index * staggerDelay}ms` : '0ms' 
          }}
        >
          {item}
        </div>
      ))}
    </>
  );
};