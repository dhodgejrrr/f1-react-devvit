// import { DataService } from './DataService.js'; // Commented out to avoid unused import

/**
 * Error Reporting and User Feedback Service
 * Provides comprehensive error reporting, user feedback, and recovery guidance
 */
export class ErrorReportingService {
  private static readonly MAX_ERROR_REPORTS = 50;
  private static readonly ERROR_STORAGE_KEY = 'f1_error_reports';
  private static readonly FEEDBACK_STORAGE_KEY = 'f1_user_feedback';
  private static readonly RETRY_DELAYS = [1000, 2000, 5000, 10000]; // Progressive delays

  /**
   * Report an error with context and user feedback
   */
  static async reportError(error: GameError): Promise<ErrorReportResult> {
    try {
      // Store error locally first
      ErrorReportingService.storeErrorLocally(error);

      // Create user-friendly error message
      const userFriendlyError = ErrorReportingService.createUserFriendlyError(error);

      // Try to send to server (non-blocking)
      ErrorReportingService.sendErrorToServer(error).catch(serverError => {
        console.warn('Failed to send error to server:', serverError);
      });

      return {
        success: true,
        errorId: error.id,
        userMessage: userFriendlyError,
        recoveryActions: ErrorReportingService.getRecoveryActions(error),
        canRetry: ErrorReportingService.canRetryOperation(error)
      };
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      
      return {
        success: false,
        errorId: error.id,
        userMessage: {
          title: 'Error Reporting Failed',
          message: 'Unable to report the error, but the game will continue to work.',
          severity: 'warning',
          action: 'continue'
        },
        recoveryActions: [
          {
            type: 'refresh',
            label: 'Refresh Page',
            description: 'Reload the page to reset the game state'
          }
        ],
        canRetry: false
      };
    }
  }

  /**
   * Create user-friendly error message
   */
  static createUserFriendlyError(error: GameError): UserFriendlyMessage {
    switch (error.type) {
      case 'NETWORK_ERROR':
        return {
          title: 'Connection Problem',
          message: 'Unable to connect to the server. Please check your internet connection.',
          severity: 'error',
          action: 'retry',
          details: 'Your game progress is saved locally and will sync when connection is restored.'
        };

      case 'VALIDATION_ERROR':
        return {
          title: 'Invalid Data',
          message: 'The submitted data is invalid. Please check your input and try again.',
          severity: 'warning',
          action: 'retry',
          details: error.context?.validationErrors?.join(', ') || 'Unknown validation error'
        };

      case 'STORAGE_ERROR':
        return {
          title: 'Save Failed',
          message: 'Unable to save your progress. The game will continue to work.',
          severity: 'warning',
          action: 'continue',
          details: 'Your scores may not be saved to the leaderboard, but you can still play.'
        };

      case 'RATE_LIMIT_ERROR':
        return {
          title: 'Too Many Attempts',
          message: 'Please wait a moment before trying again.',
          severity: 'info',
          action: 'wait',
          details: `Please wait ${Math.ceil((error.context?.resetTime || 60000) / 1000)} seconds before retrying.`
        };

      case 'TIMING_ERROR':
        return {
          title: 'Timing Issue',
          message: 'There was a problem with the game timing. Please try again.',
          severity: 'warning',
          action: 'retry',
          details: 'This may be caused by browser performance issues or background processes.'
        };

      case 'AUDIO_ERROR':
        return {
          title: 'Audio Problem',
          message: 'Audio features are not working properly. The game will continue without sound.',
          severity: 'info',
          action: 'continue',
          details: 'You can enable audio in the settings menu or refresh the page to try again.'
        };

      case 'BROWSER_COMPATIBILITY':
        return {
          title: 'Browser Not Supported',
          message: 'Some features may not work properly in your browser.',
          severity: 'warning',
          action: 'continue',
          details: 'For the best experience, please use a modern browser like Chrome, Firefox, or Safari.'
        };

      case 'QUOTA_EXCEEDED':
        return {
          title: 'Storage Full',
          message: 'The game storage is full. Some features may not work.',
          severity: 'error',
          action: 'continue',
          details: 'Please clear your browser data or contact support if this persists.'
        };

      default:
        return {
          title: 'Unexpected Error',
          message: 'Something went wrong. Please try refreshing the page.',
          severity: 'error',
          action: 'refresh',
          details: error.message || 'An unknown error occurred'
        };
    }
  }

  /**
   * Get recovery actions for an error
   */
  static getRecoveryActions(error: GameError): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.type) {
      case 'NETWORK_ERROR':
        actions.push(
          {
            type: 'retry',
            label: 'Try Again',
            description: 'Retry the operation'
          },
          {
            type: 'offline',
            label: 'Continue Offline',
            description: 'Play without online features'
          },
          {
            type: 'refresh',
            label: 'Refresh Page',
            description: 'Reload the page to reset connection'
          }
        );
        break;

      case 'VALIDATION_ERROR':
        actions.push(
          {
            type: 'retry',
            label: 'Try Again',
            description: 'Correct the input and retry'
          },
          {
            type: 'reset',
            label: 'Reset Form',
            description: 'Clear the form and start over'
          }
        );
        break;

      case 'STORAGE_ERROR':
        actions.push(
          {
            type: 'continue',
            label: 'Continue Playing',
            description: 'Play without saving scores'
          },
          {
            type: 'clear_data',
            label: 'Clear Local Data',
            description: 'Clear stored data and try again'
          },
          {
            type: 'refresh',
            label: 'Refresh Page',
            description: 'Reload the page'
          }
        );
        break;

      case 'RATE_LIMIT_ERROR':
        actions.push(
          {
            type: 'wait',
            label: 'Wait and Retry',
            description: `Wait ${Math.ceil((error.context?.resetTime || 60000) / 1000)} seconds`
          },
          {
            type: 'continue',
            label: 'Continue Playing',
            description: 'Play without submitting scores'
          }
        );
        break;

      case 'TIMING_ERROR':
        actions.push(
          {
            type: 'retry',
            label: 'Try Again',
            description: 'Start a new game'
          },
          {
            type: 'refresh',
            label: 'Refresh Page',
            description: 'Reload to reset timing system'
          }
        );
        break;

      case 'AUDIO_ERROR':
        actions.push(
          {
            type: 'continue',
            label: 'Continue Without Audio',
            description: 'Play the game silently'
          },
          {
            type: 'refresh',
            label: 'Refresh Page',
            description: 'Reload to retry audio initialization'
          },
          {
            type: 'settings',
            label: 'Check Audio Settings',
            description: 'Adjust audio preferences'
          }
        );
        break;

      default:
        actions.push(
          {
            type: 'refresh',
            label: 'Refresh Page',
            description: 'Reload the page to reset the game'
          },
          {
            type: 'continue',
            label: 'Continue Anyway',
            description: 'Try to continue despite the error'
          }
        );
    }

    return actions;
  }

  /**
   * Check if an operation can be retried
   */
  static canRetryOperation(error: GameError): boolean {
    const retryableTypes = [
      'NETWORK_ERROR',
      'STORAGE_ERROR',
      'TIMING_ERROR',
      'VALIDATION_ERROR'
    ];
    
    return retryableTypes.includes(error.type) && (error.retryCount || 0) < 3;
  }

  /**
   * Execute operation with automatic retry and user feedback
   */
  static async executeWithUserFeedback<T>(
    operation: () => Promise<T>,
    operationName: string,
    onProgress?: (status: OperationStatus) => void
  ): Promise<OperationResult<T>> {
    let lastError: GameError | null = null;
    
    for (let attempt = 0; attempt < ErrorReportingService.RETRY_DELAYS.length; attempt++) {
      try {
        onProgress?.({
          type: 'progress',
          message: attempt === 0 ? `Starting ${operationName}...` : `Retrying ${operationName} (attempt ${attempt + 1})...`,
          progress: 0
        });

        const result = await operation();
        
        onProgress?.({
          type: 'success',
          message: `${operationName} completed successfully`,
          progress: 100
        });

        return {
          success: true,
          data: result,
          attempts: attempt + 1
        };

      } catch (error) {
        lastError = ErrorReportingService.createGameError(error, operationName, attempt);
        
        onProgress?.({
          type: 'error',
          message: `${operationName} failed: ${lastError.message}`,
          progress: 0,
          error: lastError
        });

        // Don't retry on final attempt
        if (attempt === ErrorReportingService.RETRY_DELAYS.length - 1) {
          break;
        }

        // Wait before retry
        const delay = ErrorReportingService.RETRY_DELAYS[attempt];
        if (delay) {
          onProgress?.({
            type: 'waiting',
            message: `Waiting ${delay / 1000} seconds before retry...`,
            progress: 0
          });

          await ErrorReportingService.delay(delay);
        }
      }
    }

    // All retries failed
    if (lastError) {
      await ErrorReportingService.reportError(lastError);
    }

    return {
      success: false,
      error: lastError || ErrorReportingService.createGameError(new Error('Unknown error'), operationName, 0),
      attempts: ErrorReportingService.RETRY_DELAYS.length
    };
  }

  /**
   * Collect user feedback about errors
   */
  static async collectUserFeedback(errorId: string, feedback: UserFeedback): Promise<boolean> {
    try {
      // Store feedback locally
      const storedFeedback = ErrorReportingService.getStoredFeedback();
      storedFeedback.push({
        ...feedback,
        errorId,
        timestamp: Date.now()
      });

      // Keep only recent feedback
      const recentFeedback = storedFeedback
        .filter(f => Date.now() - f.timestamp < 7 * 24 * 60 * 60 * 1000) // 7 days
        .slice(-20); // Keep last 20

      localStorage.setItem(ErrorReportingService.FEEDBACK_STORAGE_KEY, JSON.stringify(recentFeedback));

      // Try to send to server (non-blocking)
      ErrorReportingService.sendFeedbackToServer(errorId, feedback).catch(error => {
        console.warn('Failed to send feedback to server:', error);
      });

      return true;
    } catch (error) {
      console.error('Failed to collect user feedback:', error);
      return false;
    }
  }

  /**
   * Get error statistics for debugging
   */
  static getErrorStatistics(): ErrorStatistics {
    try {
      const errors = ErrorReportingService.getStoredErrors();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;

      const recentErrors = errors.filter(e => now - e.timestamp < oneHour);
      const dailyErrors = errors.filter(e => now - e.timestamp < oneDay);

      const errorsByType = errors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalErrors: errors.length,
        recentErrors: recentErrors.length,
        dailyErrors: dailyErrors.length,
        errorsByType,
        mostCommonError: Object.entries(errorsByType)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
      };
    } catch (error) {
      console.error('Failed to get error statistics:', error);
      return {
        totalErrors: 0,
        recentErrors: 0,
        dailyErrors: 0,
        errorsByType: {},
        mostCommonError: 'none'
      };
    }
  }

  /**
   * Clear error history (for privacy)
   */
  static clearErrorHistory(): boolean {
    try {
      localStorage.removeItem(ErrorReportingService.ERROR_STORAGE_KEY);
      localStorage.removeItem(ErrorReportingService.FEEDBACK_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear error history:', error);
      return false;
    }
  }

  /**
   * Store error locally for debugging
   */
  private static storeErrorLocally(error: GameError): void {
    try {
      const errors = ErrorReportingService.getStoredErrors();
      errors.push(error);

      // Keep only recent errors
      const recentErrors = errors
        .filter(e => Date.now() - e.timestamp < 7 * 24 * 60 * 60 * 1000) // 7 days
        .slice(-ErrorReportingService.MAX_ERROR_REPORTS);

      localStorage.setItem(ErrorReportingService.ERROR_STORAGE_KEY, JSON.stringify(recentErrors));
    } catch (storageError) {
      console.error('Failed to store error locally:', storageError);
    }
  }

  /**
   * Get stored errors from localStorage
   */
  private static getStoredErrors(): GameError[] {
    try {
      const stored = localStorage.getItem(ErrorReportingService.ERROR_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored errors:', error);
      return [];
    }
  }

  /**
   * Get stored feedback from localStorage
   */
  private static getStoredFeedback(): (UserFeedback & { errorId: string; timestamp: number })[] {
    try {
      const stored = localStorage.getItem(ErrorReportingService.FEEDBACK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored feedback:', error);
      return [];
    }
  }

  /**
   * Send error to server (non-blocking)
   */
  private static async sendErrorToServer(error: GameError): Promise<void> {
    try {
      // In a real implementation, this would send to an error tracking service
      console.log('Error reported to server:', error);
      
      // For now, we'll just log it
      // await DataService.reportError(error);
    } catch (serverError) {
      console.warn('Failed to send error to server:', serverError);
    }
  }

  /**
   * Send feedback to server (non-blocking)
   */
  private static async sendFeedbackToServer(errorId: string, feedback: UserFeedback): Promise<void> {
    try {
      // In a real implementation, this would send to a feedback service
      console.log('Feedback sent to server:', { errorId, feedback });
      
      // For now, we'll just log it
      // await DataService.submitFeedback(errorId, feedback);
    } catch (serverError) {
      console.warn('Failed to send feedback to server:', serverError);
    }
  }

  /**
   * Create a standardized GameError from any error
   */
  private static createGameError(error: any, operation: string, retryCount: number): GameError {
    const errorType = ErrorReportingService.classifyError(error);
    
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: errorType,
      message: error instanceof Error ? error.message : String(error),
      operation,
      timestamp: Date.now(),
      retryCount,
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        stack: error instanceof Error ? (error.stack || 'No stack trace') : 'No stack trace'
      }
    };
  }

  /**
   * Classify error type based on error characteristics
   */
  private static classifyError(error: any): GameErrorType {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('connection')) {
        return 'NETWORK_ERROR';
      }
      
      if (message.includes('validation') || message.includes('invalid')) {
        return 'VALIDATION_ERROR';
      }
      
      if (message.includes('storage') || message.includes('quota')) {
        return 'STORAGE_ERROR';
      }
      
      if (message.includes('rate limit') || message.includes('too many')) {
        return 'RATE_LIMIT_ERROR';
      }
      
      if (message.includes('timing') || message.includes('performance')) {
        return 'TIMING_ERROR';
      }
      
      if (message.includes('audio') || message.includes('sound')) {
        return 'AUDIO_ERROR';
      }
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Supporting interfaces
 */
interface GameError {
  id: string;
  type: GameErrorType;
  message: string;
  operation: string;
  timestamp: number;
  retryCount: number;
  context?: {
    userAgent?: string;
    url?: string;
    stack?: string;
    validationErrors?: string[];
    resetTime?: number;
    [key: string]: any;
  };
}

type GameErrorType = 
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'TIMING_ERROR'
  | 'AUDIO_ERROR'
  | 'BROWSER_COMPATIBILITY'
  | 'QUOTA_EXCEEDED'
  | 'UNKNOWN_ERROR';

interface UserFriendlyMessage {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  action: 'retry' | 'wait' | 'continue' | 'refresh';
  details?: string;
}

interface RecoveryAction {
  type: 'retry' | 'wait' | 'continue' | 'refresh' | 'offline' | 'reset' | 'clear_data' | 'settings';
  label: string;
  description: string;
}

interface ErrorReportResult {
  success: boolean;
  errorId: string;
  userMessage: UserFriendlyMessage;
  recoveryActions: RecoveryAction[];
  canRetry: boolean;
}

interface OperationStatus {
  type: 'progress' | 'success' | 'error' | 'waiting';
  message: string;
  progress: number;
  error?: GameError;
}

interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: GameError;
  attempts: number;
}

interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5; // 1 = very poor, 5 = excellent
  comment?: string;
  wasHelpful: boolean;
  actionTaken?: string;
}

interface ErrorStatistics {
  totalErrors: number;
  recentErrors: number;
  dailyErrors: number;
  errorsByType: Record<string, number>;
  mostCommonError: string;
}