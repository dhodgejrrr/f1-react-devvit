/**
 * Performance Monitoring Service
 * 
 * Monitors application performance metrics including:
 * - Bundle size and loading performance
 * - Frame rate and rendering performance
 * - Memory usage and garbage collection
 * - Network requests and caching
 */

interface PerformanceMetrics {
  // Loading Performance
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  
  // Runtime Performance
  frameRate: number;
  averageFrameTime: number;
  frameDrops: number;
  
  // Memory Usage
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  
  // Bundle Performance
  bundleSize: number;
  chunkLoadTimes: Record<string, number>;
  
  // Network Performance
  networkRequests: number;
  cacheHitRate: number;
}

interface PerformanceBudget {
  maxBundleSize: number; // 500KB
  maxLoadTime: number; // 2000ms
  minFrameRate: number; // 58fps
  maxMemoryUsage: number; // 50MB
  maxInputLatency: number; // 16ms
}

export class PerformanceMonitorService {
  private metrics: Partial<PerformanceMetrics> = {};
  private budget: PerformanceBudget;
  private frameRateMonitor: FrameRateMonitor;
  private memoryMonitor: MemoryMonitor;
  private isMonitoring = false;

  constructor() {
    this.budget = {
      maxBundleSize: 500 * 1024, // 500KB
      maxLoadTime: 2000, // 2 seconds
      minFrameRate: 58, // Allow 2fps tolerance from 60fps
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxInputLatency: 16, // 16ms
    };

    this.frameRateMonitor = new FrameRateMonitor();
    this.memoryMonitor = new MemoryMonitor();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.collectLoadingMetrics();
    this.frameRateMonitor.start();
    this.memoryMonitor.start();
    
    // Monitor performance continuously
    this.schedulePerformanceCheck();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.frameRateMonitor.stop();
    this.memoryMonitor.stop();
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      // Loading metrics
      loadTime: this.metrics.loadTime || 0,
      domContentLoaded: this.metrics.domContentLoaded || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      
      // Runtime metrics
      frameRate: this.frameRateMonitor.getCurrentFPS(),
      averageFrameTime: this.frameRateMonitor.getAverageFrameTime(),
      frameDrops: this.frameRateMonitor.getFrameDrops(),
      
      // Memory metrics
      usedJSHeapSize: this.memoryMonitor.getUsedMemory(),
      totalJSHeapSize: this.memoryMonitor.getTotalMemory(),
      jsHeapSizeLimit: this.memoryMonitor.getMemoryLimit(),
      
      // Bundle metrics
      bundleSize: this.metrics.bundleSize || 0,
      chunkLoadTimes: this.metrics.chunkLoadTimes || {},
      
      // Network metrics
      networkRequests: this.metrics.networkRequests || 0,
      cacheHitRate: this.metrics.cacheHitRate || 0,
    };
  }

  /**
   * Check if performance meets budget requirements
   */
  checkBudget(): { passed: boolean; violations: string[] } {
    const metrics = this.getMetrics();
    const violations: string[] = [];

    if (metrics.loadTime > this.budget.maxLoadTime) {
      violations.push(`Load time ${metrics.loadTime}ms exceeds budget ${this.budget.maxLoadTime}ms`);
    }

    if (metrics.frameRate < this.budget.minFrameRate) {
      violations.push(`Frame rate ${metrics.frameRate}fps below budget ${this.budget.minFrameRate}fps`);
    }

    if (metrics.usedJSHeapSize > this.budget.maxMemoryUsage) {
      violations.push(`Memory usage ${Math.round(metrics.usedJSHeapSize / 1024 / 1024)}MB exceeds budget ${Math.round(this.budget.maxMemoryUsage / 1024 / 1024)}MB`);
    }

    if (metrics.bundleSize > this.budget.maxBundleSize) {
      violations.push(`Bundle size ${Math.round(metrics.bundleSize / 1024)}KB exceeds budget ${Math.round(this.budget.maxBundleSize / 1024)}KB`);
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Measure input latency
   */
  measureInputLatency(inputTime: number): number {
    const responseTime = performance.now() - inputTime;
    
    if (responseTime > this.budget.maxInputLatency) {
      console.warn(`Input latency ${responseTime.toFixed(2)}ms exceeds budget ${this.budget.maxInputLatency}ms`);
    }
    
    return responseTime;
  }

  /**
   * Collect loading performance metrics
   */
  private collectLoadingMetrics(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
      this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
    }

    // Paint timing
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        this.metrics.firstContentfulPaint = entry.startTime;
      }
    });

    // LCP (if supported)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.startTime;
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }
    }

    // Estimate bundle size from resource timing
    this.estimateBundleSize();
  }

  /**
   * Estimate bundle size from loaded resources
   */
  private estimateBundleSize(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    let totalSize = 0;
    const chunkLoadTimes: Record<string, number> = {};

    resources.forEach(resource => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        // Estimate size from transfer size or encoded body size
        const size = resource.transferSize || resource.encodedBodySize || 0;
        totalSize += size;
        
        // Track chunk load times
        const fileName = resource.name.split('/').pop() || 'unknown';
        chunkLoadTimes[fileName] = resource.responseEnd - resource.requestStart;
      }
    });

    this.metrics.bundleSize = totalSize;
    this.metrics.chunkLoadTimes = chunkLoadTimes;
  }

  /**
   * Schedule periodic performance checks
   */
  private schedulePerformanceCheck(): void {
    if (!this.isMonitoring) return;

    setTimeout(() => {
      const budgetCheck = this.checkBudget();
      if (!budgetCheck.passed) {
        console.warn('Performance budget violations:', budgetCheck.violations);
      }
      
      this.schedulePerformanceCheck();
    }, 5000); // Check every 5 seconds
  }
}

/**
 * Frame Rate Monitor
 */
class FrameRateMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private frameDrops = 0;
  private frameTimes: number[] = [];
  private animationId: number | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameDrops = 0;
    this.frameTimes = [];
    
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getCurrentFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    
    const recentFrames = this.frameTimes.slice(-60); // Last 60 frames
    const averageFrameTime = recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length;
    return Math.round(1000 / averageFrameTime);
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  getFrameDrops(): number {
    return this.frameDrops;
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;
    
    this.frameTimes.push(frameTime);
    
    // Keep only recent frame times (last 5 seconds at 60fps = 300 frames)
    if (this.frameTimes.length > 300) {
      this.frameTimes.shift();
    }
    
    // Detect frame drops (frame time > 20ms indicates dropped frames)
    if (frameTime > 20) {
      this.frameDrops++;
    }
    
    this.lastTime = currentTime;
    this.frameCount++;
    
    this.animationId = requestAnimationFrame(this.tick);
  };
}

/**
 * Memory Monitor
 */
class MemoryMonitor {
  private memoryInfo: any = null;
  private intervalId: number | null = null;

  start(): void {
    if (this.intervalId) return;
    
    // Update memory info every second
    this.intervalId = window.setInterval(() => {
      this.updateMemoryInfo();
    }, 1000);
    
    this.updateMemoryInfo();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getUsedMemory(): number {
    return this.memoryInfo?.usedJSHeapSize || 0;
  }

  getTotalMemory(): number {
    return this.memoryInfo?.totalJSHeapSize || 0;
  }

  getMemoryLimit(): number {
    return this.memoryInfo?.jsHeapSizeLimit || 0;
  }

  private updateMemoryInfo(): void {
    // Use Chrome's memory API if available
    if ('memory' in performance) {
      this.memoryInfo = (performance as any).memory;
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitorService();