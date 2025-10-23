/**
 * Performance Monitoring Hook
 * 
 * Provides real-time performance monitoring and optimization
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { performanceMonitor } from '../services/PerformanceMonitorService';

interface PerformanceState {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  inputLatency: number;
  isPerformanceDegraded: boolean;
  budgetViolations: string[];
}

interface PerformanceOptimizations {
  enableGPUAcceleration: boolean;
  reduceAnimations: boolean;
  simplifyEffects: boolean;
  enableBatterySaving: boolean;
}

export const usePerformanceMonitor = () => {
  const [performanceState, setPerformanceState] = useState<PerformanceState>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    inputLatency: 0,
    isPerformanceDegraded: false,
    budgetViolations: [],
  });

  const [optimizations, setOptimizations] = useState<PerformanceOptimizations>({
    enableGPUAcceleration: true,
    reduceAnimations: false,
    simplifyEffects: false,
    enableBatterySaving: false,
  });

  const performanceCheckInterval = useRef<number | null>(null);
  const frameRateHistory = useRef<number[]>([]);
  const lastInputTime = useRef<number>(0);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    performanceMonitor.startMonitoring();

    // Update performance state every second
    performanceCheckInterval.current = window.setInterval(() => {
      const metrics = performanceMonitor.getMetrics();
      const budgetCheck = performanceMonitor.checkBudget();

      // Track frame rate history for trend analysis
      frameRateHistory.current.push(metrics.frameRate);
      if (frameRateHistory.current.length > 30) {
        frameRateHistory.current.shift();
      }

      // Detect performance degradation
      const averageFPS = frameRateHistory.current.reduce((a, b) => a + b, 0) / frameRateHistory.current.length;
      const isPerformanceDegraded = averageFPS < 45 || metrics.frameDrops > 10;

      setPerformanceState({
        fps: Math.round(metrics.frameRate),
        frameTime: Math.round(metrics.averageFrameTime * 100) / 100,
        memoryUsage: Math.round(metrics.usedJSHeapSize / 1024 / 1024),
        inputLatency: 0, // Updated separately
        isPerformanceDegraded,
        budgetViolations: budgetCheck.violations,
      });

      // Auto-optimize if performance is degraded
      if (isPerformanceDegraded && !optimizations.reduceAnimations) {
        autoOptimizePerformance();
      }
    }, 1000);
  }, [optimizations.reduceAnimations]);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    performanceMonitor.stopMonitoring();
    if (performanceCheckInterval.current) {
      clearInterval(performanceCheckInterval.current);
      performanceCheckInterval.current = null;
    }
  }, []);

  /**
   * Measure input latency
   */
  const measureInputLatency = useCallback((inputTime: number) => {
    const latency = performanceMonitor.measureInputLatency(inputTime);
    setPerformanceState(prev => ({
      ...prev,
      inputLatency: Math.round(latency * 100) / 100,
    }));
    return latency;
  }, []);

  /**
   * Auto-optimize performance based on current metrics
   */
  const autoOptimizePerformance = useCallback(() => {
    const metrics = performanceMonitor.getMetrics();
    
    const newOptimizations: PerformanceOptimizations = {
      enableGPUAcceleration: true,
      reduceAnimations: metrics.frameRate < 45,
      simplifyEffects: metrics.frameRate < 30,
      enableBatterySaving: metrics.frameRate < 20,
    };

    setOptimizations(newOptimizations);
    applyPerformanceOptimizations(newOptimizations);
  }, []);

  /**
   * Apply performance optimizations to the DOM
   */
  const applyPerformanceOptimizations = useCallback((opts: PerformanceOptimizations) => {
    const root = document.documentElement;

    // Apply CSS classes based on optimizations
    root.classList.toggle('performance-degraded', opts.reduceAnimations);
    root.classList.toggle('battery-saving', opts.enableBatterySaving);
    root.classList.toggle('mobile-optimized', opts.simplifyEffects);

    // Disable GPU acceleration if needed (for older devices)
    if (!opts.enableGPUAcceleration) {
      root.classList.add('no-gpu-acceleration');
    } else {
      root.classList.remove('no-gpu-acceleration');
    }
  }, []);

  /**
   * Manual performance optimization controls
   */
  const setPerformanceOptimization = useCallback((key: keyof PerformanceOptimizations, value: boolean) => {
    const newOptimizations = { ...optimizations, [key]: value };
    setOptimizations(newOptimizations);
    applyPerformanceOptimizations(newOptimizations);
  }, [optimizations, applyPerformanceOptimizations]);

  /**
   * Get performance grade (A-F)
   */
  const getPerformanceGrade = useCallback(() => {
    const { fps, memoryUsage, inputLatency } = performanceState;
    
    let score = 100;
    
    // FPS scoring (40% weight)
    if (fps >= 58) score -= 0;
    else if (fps >= 45) score -= 10;
    else if (fps >= 30) score -= 25;
    else score -= 40;
    
    // Memory scoring (30% weight)
    if (memoryUsage <= 30) score -= 0;
    else if (memoryUsage <= 50) score -= 10;
    else if (memoryUsage <= 80) score -= 20;
    else score -= 30;
    
    // Input latency scoring (30% weight)
    if (inputLatency <= 16) score -= 0;
    else if (inputLatency <= 32) score -= 10;
    else if (inputLatency <= 50) score -= 20;
    else score -= 30;
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }, [performanceState]);

  /**
   * Get performance recommendations
   */
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    const { fps, memoryUsage, inputLatency } = performanceState;

    if (fps < 45) {
      recommendations.push('Reduce animation complexity');
      recommendations.push('Enable performance mode');
    }

    if (memoryUsage > 50) {
      recommendations.push('Clear browser cache');
      recommendations.push('Close other browser tabs');
    }

    if (inputLatency > 32) {
      recommendations.push('Disable browser extensions');
      recommendations.push('Use a wired connection');
    }

    if (performanceState.budgetViolations.length > 0) {
      recommendations.push('Performance budget exceeded');
    }

    return recommendations;
  }, [performanceState]);

  /**
   * Force garbage collection (if available)
   */
  const forceGarbageCollection = useCallback(() => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }, []);

  // Start monitoring on mount
  useEffect(() => {
    startMonitoring();
    return stopMonitoring;
  }, [startMonitoring, stopMonitoring]);

  // Apply initial optimizations
  useEffect(() => {
    applyPerformanceOptimizations(optimizations);
  }, []);

  // Detect device capabilities and adjust defaults
  useEffect(() => {
    const detectDeviceCapabilities = () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const hasWebGL = !!gl;
      
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
      
      if (isMobile || isLowEnd || !hasWebGL) {
        setOptimizations(prev => ({
          ...prev,
          reduceAnimations: true,
          simplifyEffects: true,
        }));
      }
    };

    detectDeviceCapabilities();
  }, []);

  return {
    // State
    performanceState,
    optimizations,
    
    // Actions
    measureInputLatency,
    autoOptimizePerformance,
    setPerformanceOptimization,
    forceGarbageCollection,
    
    // Computed
    performanceGrade: getPerformanceGrade(),
    recommendations: getPerformanceRecommendations(),
    
    // Monitoring
    startMonitoring,
    stopMonitoring,
  };
};