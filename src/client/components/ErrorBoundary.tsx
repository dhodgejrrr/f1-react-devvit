import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorReportingService } from '../services/ErrorReportingService.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId?: string;
  userMessage?: any;
  recoveryActions?: any[];
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error asynchronously
    this.reportError(error, errorInfo);
  }

  async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      // Create game error for reporting
      const gameError = {
        id: `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'UNKNOWN_ERROR' as const,
        message: error.message,
        operation: 'component_render',
        timestamp: Date.now(),
        retryCount: 0,
        context: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          stack: error.stack || 'No stack trace available',
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      };

      // Report error and get user-friendly message
      const reportResult = await ErrorReportingService.reportError(gameError);
      
      this.setState({
        errorId: reportResult.errorId,
        userMessage: reportResult.userMessage,
        recoveryActions: reportResult.recoveryActions
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleRecoveryAction = (actionType: string) => {
    switch (actionType) {
      case 'refresh':
        window.location.reload();
        break;
      case 'retry':
        this.handleReset();
        break;
      case 'continue':
        this.handleReset();
        break;
      case 'clear_data':
        localStorage.clear();
        window.location.reload();
        break;
      default:
        console.warn('Unknown recovery action:', actionType);
    }
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  override render() {
    if (this.state.hasError) {
      const { userMessage, recoveryActions, error, showDetails, errorId } = this.state;

      return (
        <div className="min-h-screen bg-black text-white font-mono uppercase flex flex-col items-center justify-center p-8">
          <div className="max-w-2xl text-center space-y-6">
            <h1 className="text-4xl font-bold text-red-500">
              {userMessage?.title || 'SYSTEM ERROR'}
            </h1>

            <div className="text-xl text-white normal-case">
              {userMessage?.message || 'Something went wrong with the F1 Start Challenge'}
            </div>

            {userMessage?.details && (
              <div className="bg-gray-900 p-4 rounded border border-yellow-500 text-left">
                <div className="text-yellow-400 font-bold mb-2">ADDITIONAL INFO:</div>
                <div className="text-sm text-gray-300 normal-case">
                  {userMessage.details}
                </div>
              </div>
            )}

            <div className="bg-gray-900 p-4 rounded border border-red-500 text-left">
              <div className="text-red-400 font-bold mb-2">ERROR DETAILS:</div>
              <div className="text-sm text-gray-300 font-mono normal-case">
                {error?.message || 'Unknown error occurred'}
              </div>
              {errorId && (
                <div className="text-xs text-gray-400 mt-2">
                  Error ID: {errorId}
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              {recoveryActions?.map((action, index) => (
                <button
                  key={index}
                  onClick={() => this.handleRecoveryAction(action.type)}
                  className="px-6 py-3 bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                  title={action.description}
                >
                  {action.label}
                </button>
              )) || (
                <>
                  <button
                    onClick={this.handleReset}
                    className="px-6 py-3 bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                  >
                    RESTART GAME
                  </button>

                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gray-600 text-white font-bold hover:bg-gray-700 transition-colors"
                  >
                    RELOAD PAGE
                  </button>
                </>
              )}
            </div>

            <div className="space-y-2">
              <button 
                onClick={this.toggleDetails}
                className="text-sm text-gray-400 hover:text-white transition-colors normal-case"
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </button>
              
              {showDetails && (
                <div className="bg-gray-900 p-4 rounded border border-gray-600 text-left text-xs normal-case">
                  <div className="text-gray-400 font-bold mb-2">TECHNICAL INFORMATION:</div>
                  <div className="space-y-1 text-gray-300">
                    <div><strong>Time:</strong> {new Date().toLocaleString()}</div>
                    <div><strong>User Agent:</strong> {navigator.userAgent}</div>
                    <div><strong>URL:</strong> {window.location.href}</div>
                    
                    {error?.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-gray-400 hover:text-white">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-400 normal-case">
              This error has been automatically reported. If the problem persists, 
              please try the recovery options above or contact support.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
