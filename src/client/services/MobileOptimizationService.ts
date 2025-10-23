/**
 * Mobile Optimization Service
 * 
 * Handles mobile-specific optimizations including:
 * - Touch event handling and gesture recognition
 * - Mobile UI scaling and touch target sizing
 * - Mobile browser compatibility
 * - Performance optimizations for mobile devices
 */

interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe';
  startTime: number;
  endTime: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  duration: number;
  distance: number;
}

interface MobileCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasTouch: boolean;
  screenSize: 'small' | 'medium' | 'large';
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  connectionType: string;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
}

interface MobileOptimizations {
  reducedAnimations: boolean;
  simplifiedEffects: boolean;
  touchOptimized: boolean;
  batteryOptimized: boolean;
  networkOptimized: boolean;
}

export class MobileOptimizationService {
  private capabilities: MobileCapabilities;
  private optimizations: MobileOptimizations;
  private touchStartTime = 0;
  private touchStartPosition = { x: 0, y: 0 };
  private longPressTimer: number | null = null;
  private doubleTapTimer: number | null = null;
  private lastTapTime = 0;

  constructor() {
    this.capabilities = this.detectMobileCapabilities();
    this.optimizations = this.getDefaultOptimizations();
    this.initializeMobileOptimizations();
  }

  /**
   * Detect mobile device capabilities
   */
  private detectMobileCapabilities(): MobileCapabilities {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*Tablet)|Tablet/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    const screenWidth = window.screen.width;
    const screenSize = screenWidth < 480 ? 'small' : screenWidth < 768 ? 'medium' : 'large';
    
    const pixelRatio = window.devicePixelRatio || 1;
    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    // Network connection type (if supported)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const connectionType = connection?.effectiveType || 'unknown';

    // Battery API (if supported)
    let batteryLevel: number | undefined;
    let isLowPowerMode: boolean | undefined;
    
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryLevel = battery.level;
        isLowPowerMode = battery.level < 0.2;
      });
    }

    return {
      isMobile,
      isTablet,
      isIOS,
      isAndroid,
      hasTouch,
      screenSize,
      pixelRatio,
      orientation,
      connectionType,
      batteryLevel,
      isLowPowerMode,
    };
  }

  /**
   * Get default optimizations based on device capabilities
   */
  private getDefaultOptimizations(): MobileOptimizations {
    const { isMobile, screenSize, connectionType, isLowPowerMode } = this.capabilities;
    
    return {
      reducedAnimations: isMobile && screenSize === 'small',
      simplifiedEffects: isMobile || connectionType === 'slow-2g' || connectionType === '2g',
      touchOptimized: isMobile,
      batteryOptimized: isLowPowerMode || false,
      networkOptimized: connectionType === 'slow-2g' || connectionType === '2g',
    };
  }

  /**
   * Initialize mobile optimizations
   */
  private initializeMobileOptimizations(): void {
    this.applyMobileCSS();
    this.setupTouchEventHandlers();
    this.setupOrientationHandling();
    this.setupViewportOptimizations();
    this.setupIOSSpecificOptimizations();
    this.setupAndroidSpecificOptimizations();
  }

  /**
   * Apply mobile-specific CSS classes
   */
  private applyMobileCSS(): void {
    const root = document.documentElement;
    
    if (this.capabilities.isMobile) {
      root.classList.add('mobile-device');
    }
    
    if (this.capabilities.isTablet) {
      root.classList.add('tablet-device');
    }
    
    if (this.capabilities.isIOS) {
      root.classList.add('ios-device');
    }
    
    if (this.capabilities.isAndroid) {
      root.classList.add('android-device');
    }
    
    if (this.capabilities.hasTouch) {
      root.classList.add('touch-device');
    }
    
    root.classList.add(`screen-${this.capabilities.screenSize}`);
    root.classList.add(`orientation-${this.capabilities.orientation}`);
    
    if (this.optimizations.reducedAnimations) {
      root.classList.add('mobile-reduced-animations');
    }
    
    if (this.optimizations.simplifiedEffects) {
      root.classList.add('mobile-simplified-effects');
    }
    
    if (this.optimizations.touchOptimized) {
      root.classList.add('touch-optimized');
    }
  }

  /**
   * Setup touch event handlers with gesture recognition
   */
  private setupTouchEventHandlers(): void {
    if (!this.capabilities.hasTouch) return;

    // Prevent default touch behaviors that interfere with the game
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    
    // Prevent zoom on double tap
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    // Prevent default for game area to avoid scrolling/zooming
    if (this.isGameArea(event.target as Element)) {
      event.preventDefault();
    }

    const touch = event.touches[0];
    this.touchStartTime = performance.now();
    this.touchStartPosition = { x: touch.clientX, y: touch.clientY };

    // Setup long press detection
    this.longPressTimer = window.setTimeout(() => {
      this.handleLongPress(event);
    }, 500);
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (this.isGameArea(event.target as Element)) {
      event.preventDefault();
    }

    const touch = event.changedTouches[0];
    const endTime = performance.now();
    const endPosition = { x: touch.clientX, y: touch.clientY };
    
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const gesture = this.recognizeGesture(endTime, endPosition);
    this.handleGesture(gesture, event);
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    if (this.isGameArea(event.target as Element)) {
      event.preventDefault();
    }

    // Cancel long press if finger moves too much
    if (this.longPressTimer) {
      const touch = event.touches[0];
      const distance = this.calculateDistance(
        this.touchStartPosition,
        { x: touch.clientX, y: touch.clientY }
      );
      
      if (distance > 10) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }
  }

  /**
   * Recognize gesture type
   */
  private recognizeGesture(endTime: number, endPosition: { x: number; y: number }): TouchGesture {
    const duration = endTime - this.touchStartTime;
    const distance = this.calculateDistance(this.touchStartPosition, endPosition);
    
    // Double tap detection
    const timeSinceLastTap = endTime - this.lastTapTime;
    if (timeSinceLastTap < 300 && distance < 20) {
      this.lastTapTime = 0; // Reset to prevent triple tap
      return {
        type: 'double-tap',
        startTime: this.touchStartTime,
        endTime,
        startPosition: this.touchStartPosition,
        endPosition,
        duration,
        distance,
      };
    }
    
    this.lastTapTime = endTime;
    
    // Swipe detection
    if (distance > 50 && duration < 300) {
      return {
        type: 'swipe',
        startTime: this.touchStartTime,
        endTime,
        startPosition: this.touchStartPosition,
        endPosition,
        duration,
        distance,
      };
    }
    
    // Regular tap
    return {
      type: 'tap',
      startTime: this.touchStartTime,
      endTime,
      startPosition: this.touchStartPosition,
      endPosition,
      duration,
      distance,
    };
  }

  /**
   * Handle recognized gestures
   */
  private handleGesture(gesture: TouchGesture, event: TouchEvent): void {
    // Dispatch custom events for gesture recognition
    const customEvent = new CustomEvent('mobileGesture', {
      detail: { gesture, originalEvent: event },
    });
    
    event.target?.dispatchEvent(customEvent);
  }

  /**
   * Handle long press
   */
  private handleLongPress(event: TouchEvent): void {
    const customEvent = new CustomEvent('mobileLongPress', {
      detail: { originalEvent: event },
    });
    
    event.target?.dispatchEvent(customEvent);
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if element is in game area
   */
  private isGameArea(element: Element): boolean {
    return element.closest('.f1-lights-container') !== null ||
           element.closest('[role="application"]') !== null ||
           element.classList.contains('game-area');
  }

  /**
   * Setup orientation change handling
   */
  private setupOrientationHandling(): void {
    const handleOrientationChange = () => {
      setTimeout(() => {
        const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
        
        if (newOrientation !== this.capabilities.orientation) {
          this.capabilities.orientation = newOrientation;
          document.documentElement.classList.remove('orientation-portrait', 'orientation-landscape');
          document.documentElement.classList.add(`orientation-${newOrientation}`);
          
          // Dispatch orientation change event
          window.dispatchEvent(new CustomEvent('mobileOrientationChange', {
            detail: { orientation: newOrientation },
          }));
        }
      }, 100); // Delay to ensure dimensions are updated
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
  }

  /**
   * Setup viewport optimizations
   */
  private setupViewportOptimizations(): void {
    // Ensure proper viewport meta tag
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    
    // Set optimal viewport for mobile gaming
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    // Add safe area CSS variables for devices with notches
    if (this.capabilities.isIOS) {
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --safe-area-inset-top: env(safe-area-inset-top);
          --safe-area-inset-right: env(safe-area-inset-right);
          --safe-area-inset-bottom: env(safe-area-inset-bottom);
          --safe-area-inset-left: env(safe-area-inset-left);
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Setup iOS-specific optimizations
   */
  private setupIOSSpecificOptimizations(): void {
    if (!this.capabilities.isIOS) return;

    // Prevent elastic scrolling
    document.body.style.overscrollBehavior = 'none';
    
    // Prevent zoom on input focus
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        if (viewportMeta) {
          viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
      });
      
      input.addEventListener('blur', () => {
        if (viewportMeta) {
          viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
      });
    });

    // Handle iOS status bar
    if ('standalone' in navigator && (navigator as any).standalone) {
      document.documentElement.classList.add('ios-standalone');
    }
  }

  /**
   * Setup Android-specific optimizations
   */
  private setupAndroidSpecificOptimizations(): void {
    if (!this.capabilities.isAndroid) return;

    // Handle Android keyboard
    const originalHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const heightDifference = originalHeight - currentHeight;
      
      if (heightDifference > 150) {
        document.documentElement.classList.add('android-keyboard-open');
      } else {
        document.documentElement.classList.remove('android-keyboard-open');
      }
    });
  }

  /**
   * Get mobile capabilities
   */
  getCapabilities(): MobileCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get current optimizations
   */
  getOptimizations(): MobileOptimizations {
    return { ...this.optimizations };
  }

  /**
   * Update optimization settings
   */
  updateOptimizations(updates: Partial<MobileOptimizations>): void {
    this.optimizations = { ...this.optimizations, ...updates };
    this.applyMobileCSS();
  }

  /**
   * Check if device should use reduced performance mode
   */
  shouldUseReducedPerformance(): boolean {
    return this.capabilities.screenSize === 'small' ||
           this.capabilities.connectionType === 'slow-2g' ||
           this.capabilities.connectionType === '2g' ||
           this.capabilities.isLowPowerMode ||
           false;
  }

  /**
   * Get recommended touch target size
   */
  getRecommendedTouchTargetSize(): number {
    // iOS HIG recommends 44pt, Android recommends 48dp
    // Convert to pixels based on device
    const baseSize = this.capabilities.isIOS ? 44 : 48;
    return Math.max(baseSize, 44); // Minimum 44px for accessibility
  }

  /**
   * Enable haptic feedback (if supported)
   */
  triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      
      navigator.vibrate(patterns[type]);
    }
  }

  /**
   * Optimize for battery saving
   */
  enableBatterySavingMode(): void {
    this.optimizations.batteryOptimized = true;
    this.optimizations.reducedAnimations = true;
    this.optimizations.simplifiedEffects = true;
    
    document.documentElement.classList.add('battery-saving-mode');
    this.applyMobileCSS();
  }

  /**
   * Disable battery saving mode
   */
  disableBatterySavingMode(): void {
    this.optimizations.batteryOptimized = false;
    
    document.documentElement.classList.remove('battery-saving-mode');
    this.applyMobileCSS();
  }
}

// Export singleton instance
export const mobileOptimization = new MobileOptimizationService();