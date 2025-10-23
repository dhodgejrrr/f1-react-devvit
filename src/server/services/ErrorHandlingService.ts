import { KVStorageService, LocalStorageFallback } from './KVStorageService.js';

/**
 * Error Handling Service for graceful degradation and retry mechanisms
 * Implements exponential backoff, circuit breaker pattern, and offline fallbacks
 */
export class ErrorHandlingService {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second
  private static readonly MAX_DELAY = 10000; // 10 seconds
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

  private static circuitBreakerState: Map<string, CircuitBreakerState> = new Map();

  /**
   * Execute operation with retry logic and circuit breaker
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: RetryOptions = {}
  ): Promise<OperationResult<T>> {
    const {
      maxRetries = ErrorHandlingService.MAX_RETRIES,
      baseDelay = ErrorHandlingService.BASE_DELAY,
      maxDelay = ErrorHandlingService.MAX_DELAY,
      fallbackFn,
      useCircuitBreaker = true
    } = options;

    // Check circuit breaker
    if (useCircuitBreaker && ErrorHandlingService.isCircuitOpen(operationName)) {
      console.warn(`Circuit breaker is open for operation: ${operationName}`);
      
      if (fallbackFn) {
        try {
          const fallbackResult = await fallbackFn();
          return {
            success: true,
            data: fallbackResult,
            source: 'fallback',
            attempts: 0
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: new OperationError('FALLBACK_FAILED', 'Fallback operation failed', fallbackError instanceof Error ? fallbackError : undefined),
            attempts: 0
          };
        }
      }

      return {
        success: false,
        error: new OperationError('CIRCUIT_BREAKER_OPEN', 'Circuit breaker is open'),
        attempts: 0
      };
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        if (useCircuitBreaker) {
          ErrorHandlingService.recordSuccess(operationName);
        }
        
        return {
          success: true,
          data: result,
          source: 'primary',
          attempts: attempt + 1
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.error(`Operation ${operationName} failed on attempt ${attempt + 1}:`, lastError);
        
        // Record failure for circuit breaker
        if (useCircuitBreaker) {
          ErrorHandlingService.recordFailure(operationName);
        }

        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelay
        );
        
        await ErrorHandlingService.delay(delay);
      }
    }

    // All retries failed, try fallback
    if (fallbackFn) {
      try {
        console.log(`Attempting fallback for operation: ${operationName}`);
        const fallbackResult = await fallbackFn();
        return {
          success: true,
          data: fallbackResult,
          source: 'fallback',
          attempts: maxRetries + 1
        };
      } catch (fallbackError) {
        console.error(`Fallback failed for operation ${operationName}:`, fallbackError);
      }
    }

    return {
      success: false,
      error: new OperationError('MAX_RETRIES_EXCEEDED', `Operation failed after ${maxRetries + 1} attempts`, lastError || undefined),
      attempts: maxRetries + 1
    };
  }

  /**
   * Handle KV storage operations with fallback to localStorage
   */
  static async handleKVOperation<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    fallbackData?: T
  ): Promise<OperationResult<T>> {
    return ErrorHandlingService.executeWithRetry(
      operation,
      'kv_storage',
      {
        fallbackFn: async () => {
          console.log(`Using localStorage fallback for key: ${fallbackKey}`);
          
          // Try to get from localStorage first
          const localData = LocalStorageFallback.get<T>(fallbackKey);
          if (localData !== null) {
            return localData;
          }
          
          // If no local data and fallback data provided, use it
          if (fallbackData !== undefined) {
            LocalStorageFallback.set(fallbackKey, fallbackData);
            return fallbackData;
          }
          
          throw new Error('No fallback data available');
        }
      }
    );
  }

  /**
   * Handle network operations with offline detection
   */
  static async handleNetworkOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<OperationResult<T>> {
    // Check if we're offline (browser environment)
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      return {
        success: false,
        error: new OperationError('OFFLINE', 'Device is offline'),
        attempts: 0
      };
    }

    return ErrorHandlingService.executeWithRetry(
      operation,
      operationName,
      {
        maxRetries: 2, // Fewer retries for network operations
        baseDelay: 2000 // Longer delay for network issues
      }
    );
  }

  /**
   * Create user-friendly error messages
   */
  static createUserFriendlyError(error: OperationError): UserFriendlyError {
    const baseMessage = 'Something went wrong. ';
    
    switch (error.code) {
      case 'NETWORK_UNAVAILABLE':
        return {
          title: 'Connection Problem',
          message: baseMessage + 'Please check your internet connection and try again.',
          action: 'retry',
          recoverable: true
        };
        
      case 'KV_STORAGE_ERROR':
        return {
          title: 'Save Failed',
          message: baseMessage + 'Your progress might not be saved. The game will continue to work.',
          action: 'continue',
          recoverable: true
        };
        
      case 'VALIDATION_FAILED':
        return {
          title: 'Invalid Data',
          message: 'The submitted data is invalid. Please try again.',
          action: 'retry',
          recoverable: true
        };
        
      case 'RATE_LIMITED':
        return {
          title: 'Too Many Attempts',
          message: 'Please wait a moment before trying again.',
          action: 'wait',
          recoverable: true
        };
        
      case 'CIRCUIT_BREAKER_OPEN':
        return {
          title: 'Service Temporarily Unavailable',
          message: baseMessage + 'Please try again in a few moments.',
          action: 'wait',
          recoverable: true
        };
        
      case 'OFFLINE':
        return {
          title: 'Offline Mode',
          message: 'You appear to be offline. Some features may not work.',
          action: 'continue',
          recoverable: true
        };
        
      default:
        return {
          title: 'Unexpected Error',
          message: baseMessage + 'Please refresh the page and try again.',
          action: 'refresh',
          recoverable: false
        };
    }
  }

  /**
   * Log errors for monitoring and debugging
   */
  static logError(error: OperationError, context: ErrorContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        stack: error.stack
      },
      context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof globalThis !== 'undefined' && 'location' in globalThis ? (globalThis as any).location.href : 'server'
    };

    console.error('Error logged:', logEntry);
    
    // In a production environment, this would send to a logging service
    // For now, we'll store in localStorage for debugging (client-side only)
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        const localStorage = (globalThis as any).localStorage;
        const logs = JSON.parse(localStorage.getItem('f1_error_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 50 logs
        if (logs.length > 50) {
          logs.splice(0, logs.length - 50);
        }
        
        localStorage.setItem('f1_error_logs', JSON.stringify(logs));
      }
    } catch (logError) {
      console.error('Failed to log error to localStorage:', logError);
    }
  }

  /**
   * Circuit breaker implementation
   */
  private static isCircuitOpen(operationName: string): boolean {
    const state = ErrorHandlingService.circuitBreakerState.get(operationName);
    if (!state) {
      return false;
    }

    if (state.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - state.lastFailureTime > ErrorHandlingService.CIRCUIT_BREAKER_TIMEOUT) {
        state.state = 'half-open';
        state.failureCount = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private static recordSuccess(operationName: string): void {
    const state = ErrorHandlingService.circuitBreakerState.get(operationName);
    if (state) {
      state.state = 'closed';
      state.failureCount = 0;
    }
  }

  private static recordFailure(operationName: string): void {
    let state = ErrorHandlingService.circuitBreakerState.get(operationName);
    if (!state) {
      state = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0
      };
      ErrorHandlingService.circuitBreakerState.set(operationName, state);
    }

    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.failureCount >= ErrorHandlingService.CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'open';
      console.warn(`Circuit breaker opened for operation: ${operationName}`);
    }
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for system components
   */
  static async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheck[] = [];

    // KV Storage health check
    try {
      await KVStorageService.set('health_check', { timestamp: Date.now() }, 60);
      await KVStorageService.get('health_check');
      checks.push({ component: 'kv_storage', status: 'healthy', responseTime: 0 });
    } catch (error) {
      checks.push({ 
        component: 'kv_storage', 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : String(error),
        responseTime: 0
      });
    }

    // Local Storage health check
    try {
      LocalStorageFallback.set('health_check', { timestamp: Date.now() });
      LocalStorageFallback.get('health_check');
      checks.push({ component: 'local_storage', status: 'healthy', responseTime: 0 });
    } catch (error) {
      checks.push({ 
        component: 'local_storage', 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : String(error),
        responseTime: 0
      });
    }

    const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks
    };
  }
}

/**
 * Custom error class for operations
 */
export class OperationError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'OperationError';
  }
}

/**
 * Supporting interfaces
 */
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  fallbackFn?: () => Promise<any>;
  useCircuitBreaker?: boolean;
}

interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: OperationError;
  source?: 'primary' | 'fallback';
  attempts: number;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
}

interface UserFriendlyError {
  title: string;
  message: string;
  action: 'retry' | 'wait' | 'continue' | 'refresh';
  recoverable: boolean;
}

interface ErrorContext {
  operation: string;
  userId?: string;
  data?: any;
  timestamp: string;
}

interface HealthCheck {
  component: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
}