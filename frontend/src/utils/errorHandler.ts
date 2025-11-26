// Global error handler for tracking all errors across the application

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
  [key: string]: any;
}

class ErrorHandler {
  private errorLog: Array<{ error: Error; context: ErrorContext; timestamp: Date }> = [];
  private maxLogSize = 100;

  constructor() {
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.group('🚨 UNHANDLED PROMISE REJECTION');
      console.error('Error:', event.reason);
      console.error('Promise:', event.promise);
      console.error('Stack:', event.reason?.stack);
      console.error('Context:', {
        'URL': window.location.href,
        'User Agent': navigator.userAgent,
        'Timestamp': new Date().toISOString()
      });
      console.groupEnd();
      
      this.logError(event.reason, {
        type: 'unhandled_promise_rejection',
        url: window.location.href
      });
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      console.group('🚨 GLOBAL ERROR');
      console.error('Message:', event.message);
      console.error('Source:', event.filename);
      console.error('Line:', event.lineno);
      console.error('Column:', event.colno);
      console.error('Error:', event.error);
      console.error('Stack:', event.error?.stack);
      console.error('Context:', {
        'URL': window.location.href,
        'User Agent': navigator.userAgent,
        'Timestamp': new Date().toISOString()
      });
      console.groupEnd();
      
      this.logError(event.error || new Error(event.message), {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href
      });
    });
  }

  logError(error: Error | any, context: ErrorContext = {}): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    const logEntry = {
      error: errorObj,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      timestamp: new Date()
    };

    this.errorLog.push(logEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console with full context
    console.group('📝 ERROR LOGGED');
    console.error('Error:', errorObj);
    console.error('Context:', logEntry.context);
    console.error('Stack:', errorObj.stack);
    console.groupEnd();
  }

  getErrorLog(): Array<{ error: Error; context: ErrorContext; timestamp: Date }> {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
    console.log('🧹 Error log cleared');
  }

  // Track API errors specifically
  trackApiError(url: string, method: string, error: any, requestData?: any): void {
    this.logError(error, {
      type: 'api_error',
      url,
      method,
      requestData,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
  }

  // Track database sync issues
  trackSyncIssue(source: string, target: string, issue: string, data?: any): void {
    const error = new Error(`Sync issue: ${source} -> ${target}: ${issue}`);
    this.logError(error, {
      type: 'sync_issue',
      source,
      target,
      issue,
      data
    });
  }

  // Track performance issues
  trackPerformanceIssue(operation: string, duration: number, threshold: number = 5000): void {
    if (duration > threshold) {
      const error = new Error(`Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
      this.logError(error, {
        type: 'performance_issue',
        operation,
        duration,
        threshold
      });
    }
  }
}

export const errorHandler = new ErrorHandler();

// Export for use in components
export default errorHandler;

