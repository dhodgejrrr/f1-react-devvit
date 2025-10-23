import type { DeviceCapabilities } from '../types/interfaces.js';

/**
 * Device Capability Detection Service
 * Supports Task 8.1: Build device capability detection for timing precision
 * 
 * Detects and reports device capabilities that affect timing precision
 * for server-side plausibility validation
 */
export class DeviceCapabilityService {
  
  private static cachedCapabilities: DeviceCapabilities | null = null;
  private static detectionPromise: Promise<DeviceCapabilities> | null = null;
  
  /**
   * Detect comprehensive device capabilities
   * Task 8.1: Build device capability detection for timing precision
   */
  static async detectCapabilities(): Promise<DeviceCapabilities> {
    // Return cached result if available
    if (this.cachedCapabilities) {
      return this.cachedCapabilities;
    }
    
    // Return existing promise if detection is in progress
    if (this.detectionPromise) {
      return this.detectionPromise;
    }
    
    // Start new detection
    this.detectionPromise = this.performDetection();
    this.cachedCapabilities = await this.detectionPromise;
    
    return this.cachedCapabilities;
  }
  
  /**
   * Perform comprehensive capability detection
   */
  private static async performDetection(): Promise<DeviceCapabilities> {
    const capabilities: DeviceCapabilities = {
      highResolutionTime: this.detectHighResolutionTime(),
      performanceAPI: this.detectPerformanceAPI(),
      isMobile: this.detectMobileDevice(),
      timingPrecision: await this.measureTimingPrecision(),
      userAgent: this.getUserAgent(),
      screenRefreshRate: await this.detectScreenRefreshRate()
    };
    
    return capabilities;
  }
  
  /**
   * Detect high-resolution time support
   */
  private static detectHighResolutionTime(): boolean {
    try {
      // Check if performance.now() is available and provides high resolution
      if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
        return false;
      }
      
      // Test precision by measuring multiple calls
      const start = performance.now();
      const measurements: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        measurements.push(performance.now());
      }
      
      // Check if we get sub-millisecond precision
      const hasSubMillisecond = measurements.some(time => 
        (time % 1) !== 0 // Has decimal places
      );
      
      return hasSubMillisecond;
      
    } catch (error) {
      console.warn('High-resolution time detection failed:', error);
      return false;
    }
  }
  
  /**
   * Detect Performance API availability
   */
  private static detectPerformanceAPI(): boolean {
    try {
      return typeof performance !== 'undefined' &&
             typeof performance.now === 'function' &&
             typeof performance.mark === 'function' &&
             typeof performance.measure === 'function';
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Detect mobile device
   */
  private static detectMobileDevice(): boolean {
    try {
      // Check user agent
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      const hasMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
      
      // Check touch support
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Check screen size (mobile-like dimensions)
      const hasSmallScreen = window.screen.width <= 768 || window.screen.height <= 768;
      
      // Check device pixel ratio (often higher on mobile)
      const hasHighDPR = window.devicePixelRatio > 1.5;
      
      // Combine indicators
      return hasMobileUA || (hasTouch && hasSmallScreen) || (hasTouch && hasHighDPR);
      
    } catch (error) {
      console.warn('Mobile device detection failed:', error);
      return false;
    }
  }
  
  /**
   * Measure actual timing precision of the device
   */
  private static async measureTimingPrecision(): Promise<number> {
    try {
      const measurements: number[] = [];
      const iterations = 100;
      
      // Measure timing precision over multiple iterations
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        // Small delay to measure precision
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const end = performance.now();
        const duration = end - start;
        
        measurements.push(duration);
      }
      
      // Calculate precision based on measurement variance
      const sorted = measurements.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const variance = measurements.reduce((sum, val) => sum + Math.pow(val - median, 2), 0) / measurements.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Estimate precision as the standard deviation
      // Lower values indicate higher precision
      return Math.max(0.1, standardDeviation);
      
    } catch (error) {
      console.warn('Timing precision measurement failed:', error);
      return 5.0; // Conservative fallback
    }
  }
  
  /**
   * Get user agent string
   */
  private static getUserAgent(): string {
    try {
      return navigator.userAgent;
    } catch (error) {
      return 'Unknown';
    }
  }
  
  /**
   * Detect screen refresh rate
   */
  private static async detectScreenRefreshRate(): Promise<number> {
    try {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        let startTime = performance.now();
        let lastTime = startTime;
        
        const measureFrames = () => {
          const currentTime = performance.now();
          frameCount++;
          
          // Measure for 1 second
          if (currentTime - startTime >= 1000) {
            const fps = frameCount;
            resolve(fps);
            return;
          }
          
          lastTime = currentTime;
          requestAnimationFrame(measureFrames);
        };
        
        requestAnimationFrame(measureFrames);
        
        // Fallback timeout
        setTimeout(() => {
          if (frameCount === 0) {
            resolve(60); // Default assumption
          }
        }, 1100);
      });
      
    } catch (error) {
      console.warn('Screen refresh rate detection failed:', error);
      return 60; // Default assumption
    }
  }
  
  /**
   * Test timing accuracy with known delays
   */
  static async testTimingAccuracy(): Promise<TimingAccuracyTest> {
    try {
      const testDelays = [10, 50, 100, 200, 500]; // milliseconds
      const results: TimingTestResult[] = [];
      
      for (const expectedDelay of testDelays) {
        const measurements: number[] = [];
        
        // Test each delay multiple times
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          
          await new Promise(resolve => setTimeout(resolve, expectedDelay));
          
          const end = performance.now();
          const actualDelay = end - start;
          measurements.push(actualDelay);
        }
        
        const averageDelay = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
        const accuracy = Math.abs(averageDelay - expectedDelay);
        
        results.push({
          expectedDelay,
          averageDelay,
          accuracy,
          measurements
        });
      }
      
      // Calculate overall accuracy
      const overallAccuracy = results.reduce((sum, result) => sum + result.accuracy, 0) / results.length;
      
      return {
        overallAccuracy,
        results,
        isAccurate: overallAccuracy < 5, // Within 5ms is considered accurate
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Timing accuracy test failed:', error);
      return {
        overallAccuracy: 100,
        results: [],
        isAccurate: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get capabilities summary for debugging
   */
  static async getCapabilitiesSummary(): Promise<string> {
    const capabilities = await this.detectCapabilities();
    const accuracy = await this.testTimingAccuracy();
    
    return `Device Capabilities:
- High Resolution Time: ${capabilities.highResolutionTime ? 'Yes' : 'No'}
- Performance API: ${capabilities.performanceAPI ? 'Yes' : 'No'}
- Mobile Device: ${capabilities.isMobile ? 'Yes' : 'No'}
- Timing Precision: ${capabilities.timingPrecision?.toFixed(2)}ms
- Screen Refresh Rate: ${capabilities.screenRefreshRate}fps
- Timing Accuracy: ${accuracy.overallAccuracy.toFixed(2)}ms (${accuracy.isAccurate ? 'Good' : 'Poor'})
- User Agent: ${capabilities.userAgent}`;
  }
  
  /**
   * Clear cached capabilities (for testing)
   */
  static clearCache(): void {
    this.cachedCapabilities = null;
    this.detectionPromise = null;
  }
  
  /**
   * Check if device is suitable for high-precision timing
   */
  static async isSuitableForPrecisionTiming(): Promise<boolean> {
    const capabilities = await this.detectCapabilities();
    const accuracy = await this.testTimingAccuracy();
    
    return capabilities.highResolutionTime &&
           capabilities.performanceAPI &&
           (capabilities.timingPrecision || 0) < 2.0 &&
           accuracy.isAccurate;
  }
}

// Supporting interfaces
export interface TimingAccuracyTest {
  overallAccuracy: number;
  results: TimingTestResult[];
  isAccurate: boolean;
  timestamp: number;
  error?: string;
}

export interface TimingTestResult {
  expectedDelay: number;
  averageDelay: number;
  accuracy: number;
  measurements: number[];
}