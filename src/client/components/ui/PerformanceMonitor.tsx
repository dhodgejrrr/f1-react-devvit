/**
 * Performance Monitor Component
 * 
 * Displays real-time performance metrics and optimization controls
 */

import { useState } from 'react';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { Button } from './Button';

interface PerformanceMonitorProps {
  isVisible?: boolean;
  showControls?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PerformanceMonitor = ({ 
  isVisible = false, 
  showControls = false,
  position = 'top-left' 
}: PerformanceMonitorProps) => {
  const {
    performanceState,
    optimizations,
    performanceGrade,
    recommendations,
    setPerformanceOptimization,
    autoOptimizePerformance,
    forceGarbageCollection,
  } = usePerformanceMonitor();

  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'var(--color-green)';
    if (fps >= 30) return 'var(--color-yellow)';
    return 'var(--color-red)';
  };

  const getMemoryColor = (memory: number) => {
    if (memory <= 30) return 'var(--color-green)';
    if (memory <= 50) return 'var(--color-yellow)';
    return 'var(--color-red)';
  };

  const getLatencyColor = (latency: number) => {
    if (latency <= 16) return 'var(--color-green)';
    if (latency <= 32) return 'var(--color-yellow)';
    return 'var(--color-red)';
  };

  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 font-mono text-xs`}
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid var(--color-white)',
        borderRadius: '4px',
        padding: '8px',
        minWidth: '200px',
      }}
    >
      {/* Compact Display */}
      <div 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to expand performance details"
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-white">PERF</span>
          <span 
            className="font-bold"
            style={{ 
              color: performanceGrade === 'A' ? 'var(--color-green)' :
                     performanceGrade === 'B' ? 'var(--color-yellow)' :
                     'var(--color-red)'
            }}
          >
            {performanceGrade}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div style={{ color: getFPSColor(performanceState.fps) }}>
              {performanceState.fps}
            </div>
            <div className="text-gray-400">FPS</div>
          </div>
          
          <div>
            <div style={{ color: getMemoryColor(performanceState.memoryUsage) }}>
              {performanceState.memoryUsage}
            </div>
            <div className="text-gray-400">MB</div>
          </div>
          
          <div>
            <div style={{ color: getLatencyColor(performanceState.inputLatency) }}>
              {performanceState.inputLatency.toFixed(1)}
            </div>
            <div className="text-gray-400">MS</div>
          </div>
        </div>
      </div>

      {/* Expanded Display */}
      {isExpanded && (
        <div className="mt-4 border-t border-gray-600 pt-4">
          {/* Detailed Metrics */}
          <div className="mb-4">
            <h4 className="text-white mb-2">DETAILED METRICS</h4>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Frame Rate:</span>
                <span style={{ color: getFPSColor(performanceState.fps) }}>
                  {performanceState.fps} fps
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Frame Time:</span>
                <span className="text-white">
                  {performanceState.frameTime.toFixed(2)}ms
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Memory:</span>
                <span style={{ color: getMemoryColor(performanceState.memoryUsage) }}>
                  {performanceState.memoryUsage}MB
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Input Lag:</span>
                <span style={{ color: getLatencyColor(performanceState.inputLatency) }}>
                  {performanceState.inputLatency.toFixed(1)}ms
                </span>
              </div>
            </div>
          </div>

          {/* Performance Status */}
          {performanceState.isPerformanceDegraded && (
            <div className="mb-4 p-2 bg-red-900 border border-red-600 rounded">
              <div className="text-red-300 font-bold">⚠ PERFORMANCE DEGRADED</div>
              <div className="text-red-200 text-xs mt-1">
                Automatic optimizations enabled
              </div>
            </div>
          )}

          {/* Budget Violations */}
          {performanceState.budgetViolations.length > 0 && (
            <div className="mb-4">
              <h5 className="text-yellow-400 mb-1">BUDGET VIOLATIONS:</h5>
              <div className="text-xs text-yellow-300">
                {performanceState.budgetViolations.map((violation, index) => (
                  <div key={index}>• {violation}</div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-4">
              <h5 className="text-blue-400 mb-1">RECOMMENDATIONS:</h5>
              <div className="text-xs text-blue-300">
                {recommendations.map((rec, index) => (
                  <div key={index}>• {rec}</div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          {showControls && (
            <div className="space-y-2">
              <h5 className="text-white mb-2">OPTIMIZATIONS</h5>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-400">GPU Acceleration:</span>
                <input
                  type="checkbox"
                  checked={optimizations.enableGPUAcceleration}
                  onChange={(e) => setPerformanceOptimization('enableGPUAcceleration', e.target.checked)}
                  className="ml-2"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-400">Reduce Animations:</span>
                <input
                  type="checkbox"
                  checked={optimizations.reduceAnimations}
                  onChange={(e) => setPerformanceOptimization('reduceAnimations', e.target.checked)}
                  className="ml-2"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-400">Simplify Effects:</span>
                <input
                  type="checkbox"
                  checked={optimizations.simplifyEffects}
                  onChange={(e) => setPerformanceOptimization('simplifyEffects', e.target.checked)}
                  className="ml-2"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-gray-400">Battery Saving:</span>
                <input
                  type="checkbox"
                  checked={optimizations.enableBatterySaving}
                  onChange={(e) => setPerformanceOptimization('enableBatterySaving', e.target.checked)}
                  className="ml-2"
                />
              </label>
              
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={autoOptimizePerformance}
                  size="small"
                  variant="secondary"
                  className="text-xs"
                >
                  AUTO OPTIMIZE
                </Button>
                
                <Button
                  onClick={forceGarbageCollection}
                  size="small"
                  variant="secondary"
                  className="text-xs"
                >
                  CLEAR MEMORY
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Simple FPS Counter Component
 */
export const FPSCounter = ({ isVisible = false }: { isVisible?: boolean }) => {
  const { performanceState } = usePerformanceMonitor();

  if (!isVisible) return null;

  return (
    <div className="fps-indicator">
      {performanceState.fps} FPS
    </div>
  );
};

/**
 * Memory Usage Indicator Component
 */
export const MemoryIndicator = ({ isVisible = false }: { isVisible?: boolean }) => {
  const { performanceState } = usePerformanceMonitor();

  if (!isVisible) return null;

  return (
    <div className="memory-indicator">
      {performanceState.memoryUsage}MB
    </div>
  );
};