/**
 * Mobile Optimization Hook
 * 
 * Provides mobile-specific optimizations and capabilities
 */

import { useEffect, useState, useCallback } from 'react';
import { mobileOptimization } from '../services/MobileOptimizationService';

interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasTouch: boolean;
  screenSize: 'small' | 'medium' | 'large';
  orientation: 'portrait' | 'landscape';
  connectionType: string;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
  touchTargetSize: number;
}

interface MobileGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe';
  startTime: number;
  endTime: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  duration: number;
  distance: number;
}

export const useMobileOptimization = () => {
  const [mobileState, setMobileState] = useState<MobileState>(() => {
    const capabilities = mobileOptimization.getCapabilities();
    return {
      ...capabilities,
      touchTargetSize: mobileOptimization.getRecommendedTouchTargetSize(),
    };
  });

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');

  /**
   * Handle mobile gestures
   */
  const handleMobileGesture = useCallback((callback: (gesture: MobileGesture) => void) => {
    const handleGesture = (event: CustomEvent) => {
      callback(event.detail.gesture);
    };

    document.addEventListener('mobileGesture', handleGesture as EventListener);
    
    return () => {
      document.removeEventListener('mobileGesture', handleGesture as EventListener);
    };
  }, []);

  /**
   * Handle long press events
   */
  const handleLongPress = useCallback((callback: (event: TouchEvent) => void) => {
    const handleLongPressEvent = (event: CustomEvent) => {
      callback(event.detail.originalEvent);
    };

    document.addEventListener('mobileLongPress', handleLongPressEvent as EventListener);
    
    return () => {
      document.removeEventListener('mobileLongPress', handleLongPressEvent as EventListener);
    };
  }, []);

  /**
   * Handle orientation changes
   */
  const handleOrientationChange = useCallback((callback: (orientation: 'portrait' | 'landscape') => void) => {
    const handleOrientationChangeEvent = (event: CustomEvent) => {
      callback(event.detail.orientation);
      setMobileState(prev => ({
        ...prev,
        orientation: event.detail.orientation,
      }));
    };

    window.addEventListener('mobileOrientationChange', handleOrientationChangeEvent as EventListener);
    
    return () => {
      window.removeEventListener('mobileOrientationChange', handleOrientationChangeEvent as EventListener);
    };
  }, []);

  /**
   * Trigger haptic feedback
   */
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    mobileOptimization.triggerHapticFeedback(type);
  }, []);

  /**
   * Check if device should use reduced performance
   */
  const shouldUseReducedPerformance = useCallback(() => {
    return mobileOptimization.shouldUseReducedPerformance();
  }, []);

  /**
   * Enable battery saving mode
   */
  const enableBatterySaving = useCallback(() => {
    mobileOptimization.enableBatterySavingMode();
  }, []);

  /**
   * Disable battery saving mode
   */
  const disableBatterySaving = useCallback(() => {
    mobileOptimization.disableBatterySavingMode();
  }, []);

  /**
   * Update mobile optimizations
   */
  const updateOptimizations = useCallback((updates: {
    reducedAnimations?: boolean;
    simplifiedEffects?: boolean;
    touchOptimized?: boolean;
    batteryOptimized?: boolean;
    networkOptimized?: boolean;
  }) => {
    mobileOptimization.updateOptimizations(updates);
  }, []);

  /**
   * Get optimal touch target size for current device
   */
  const getTouchTargetSize = useCallback(() => {
    return mobileOptimization.getRecommendedTouchTargetSize();
  }, []);

  /**
   * Check if element meets touch target requirements
   */
  const validateTouchTarget = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const minSize = getTouchTargetSize();
    
    return {
      isValid: rect.width >= minSize && rect.height >= minSize,
      currentSize: { width: rect.width, height: rect.height },
      requiredSize: minSize,
      recommendations: rect.width < minSize || rect.height < minSize 
        ? [`Increase size to at least ${minSize}px x ${minSize}px`]
        : [],
    };
  }, [getTouchTargetSize]);

  /**
   * Optimize element for touch interaction
   */
  const optimizeForTouch = useCallback((element: HTMLElement) => {
    const validation = validateTouchTarget(element);
    
    if (!validation.isValid) {
      element.style.minWidth = `${validation.requiredSize}px`;
      element.style.minHeight = `${validation.requiredSize}px`;
      element.classList.add('touch-target');
    }
    
    // Add touch optimization classes
    element.classList.add('touch-optimized');
    
    // Prevent default touch behaviors that interfere with interaction
    element.style.touchAction = 'manipulation';
    element.style.webkitTapHighlightColor = 'transparent';
    element.style.webkitTouchCallout = 'none';
    element.style.webkitUserSelect = 'none';
    element.style.userSelect = 'none';
  }, [validateTouchTarget]);

  /**
   * Add visual feedback for touch interactions
   */
  const addTouchFeedback = useCallback((element: HTMLElement, type: 'ripple' | 'scale' | 'glow' = 'ripple') => {
    const handleTouchStart = (event: TouchEvent) => {
      if (type === 'ripple') {
        const rect = element.getBoundingClientRect();
        const touch = event.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const ripple = document.createElement('div');
        ripple.className = 'mobile-gesture-feedback';
        ripple.style.left = `${x - 10}px`;
        ripple.style.top = `${y - 10}px`;
        
        element.appendChild(ripple);
        
        setTimeout(() => {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
          }
        }, 300);
      } else if (type === 'scale') {
        element.style.transform = 'scale(0.95)';
        element.style.transition = 'transform 100ms ease-out';
      }
    };

    const handleTouchEnd = () => {
      if (type === 'scale') {
        element.style.transform = 'scale(1)';
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  /**
   * Handle mobile input optimization
   */
  const optimizeMobileInput = useCallback((inputElement: HTMLInputElement | HTMLTextAreaElement) => {
    // Prevent zoom on iOS
    inputElement.style.fontSize = '16px';
    
    // Optimize for mobile keyboards
    if (mobileState.isIOS) {
      inputElement.setAttribute('autocapitalize', 'none');
      inputElement.setAttribute('autocorrect', 'off');
    }
    
    // Handle virtual keyboard
    const handleFocus = () => {
      setIsKeyboardOpen(true);
      document.documentElement.classList.add('mobile-keyboard-open');
    };
    
    const handleBlur = () => {
      setIsKeyboardOpen(false);
      document.documentElement.classList.remove('mobile-keyboard-open');
    };
    
    inputElement.addEventListener('focus', handleFocus);
    inputElement.addEventListener('blur', handleBlur);
    
    return () => {
      inputElement.removeEventListener('focus', handleFocus);
      inputElement.removeEventListener('blur', handleBlur);
    };
  }, [mobileState.isIOS]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor battery status (if supported)
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryInfo = () => {
          setMobileState(prev => ({
            ...prev,
            batteryLevel: battery.level,
            isLowPowerMode: battery.level < 0.2,
          }));
          
          // Auto-enable battery saving at low battery
          if (battery.level < 0.2) {
            enableBatterySaving();
          }
        };
        
        updateBatteryInfo();
        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
      });
    }
  }, [enableBatterySaving]);

  // Auto-optimize based on device capabilities
  useEffect(() => {
    if (shouldUseReducedPerformance()) {
      updateOptimizations({
        reducedAnimations: true,
        simplifiedEffects: true,
        batteryOptimized: true,
      });
    }
  }, [shouldUseReducedPerformance, updateOptimizations]);

  return {
    // State
    mobileState,
    isKeyboardOpen,
    networkStatus,
    
    // Capabilities
    isMobile: mobileState.isMobile,
    isTablet: mobileState.isTablet,
    isIOS: mobileState.isIOS,
    isAndroid: mobileState.isAndroid,
    hasTouch: mobileState.hasTouch,
    
    // Event Handlers
    handleMobileGesture,
    handleLongPress,
    handleOrientationChange,
    
    // Actions
    triggerHapticFeedback,
    enableBatterySaving,
    disableBatterySaving,
    updateOptimizations,
    
    // Optimization Utilities
    getTouchTargetSize,
    validateTouchTarget,
    optimizeForTouch,
    addTouchFeedback,
    optimizeMobileInput,
    shouldUseReducedPerformance,
  };
};