// Aggressive logging utility for tracking errors across frontend, backend, and database

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  requestId?: string;
  timestamp?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[level];

    const logData = {
      [emoji]: message,
      '📅 Timestamp': timestamp,
      '📍 Level': level.toUpperCase(),
      ...(context || {})
    };

    // Add stack trace for errors
    if (level === 'error') {
      logData['📍 Stack Trace'] = new Error().stack?.split('\n').slice(2, 10).join('\n');
    }

    // Use console groups for better organization
    console.group(`${emoji} [${level.toUpperCase()}] ${message}`);
    console.log('📊 Context:', logData);
    if (context?.data) {
      console.log('📦 Data:', context.data);
    }
    if (context?.error) {
      console.error('🚨 Error:', context.error);
      console.error('📍 Error Stack:', context.error.stack);
    }
    console.groupEnd();
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.formatMessage('debug', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.formatMessage('error', message, context);
  }

  // Specialized logging methods
  apiRequest(method: string, url: string, data?: any, context?: LogContext): void {
    this.info(`API Request: ${method} ${url}`, {
      ...context,
      '📤 Method': method,
      '🌐 URL': url,
      '📦 Request Data': data
    });
  }

  apiResponse(url: string, status: number, data?: any, duration?: number, context?: LogContext): void {
    this.info(`API Response: ${url}`, {
      ...context,
      '📥 Status': status,
      '⏱️ Duration': duration ? `${duration}ms` : 'N/A',
      '📦 Response Data': data
    });
  }

  apiError(url: string, error: any, context?: LogContext): void {
    this.error(`API Error: ${url}`, {
      ...context,
      error,
      '🌐 URL': url,
      '📊 Status': error.response?.status,
      '💬 Message': error.message,
      '🔢 Code': error.code
    });
  }

  databaseOperation(operation: string, collection: string, data?: any, context?: LogContext): void {
    this.info(`Database Operation: ${operation}`, {
      ...context,
      '🗄️ Collection': collection,
      '📦 Data': data
    });
  }

  databaseError(operation: string, collection: string, error: any, context?: LogContext): void {
    this.error(`Database Error: ${operation} on ${collection}`, {
      ...context,
      error,
      '🗄️ Collection': collection,
      '📊 Operation': operation
    });
  }

  syncIssue(source: string, target: string, issue: string, context?: LogContext): void {
    this.error(`Sync Issue: ${source} -> ${target}`, {
      ...context,
      '📤 Source': source,
      '📥 Target': target,
      '🚨 Issue': issue
    });
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 5000 ? 'warn' : 'info';
    this[level](`Performance: ${operation} took ${duration}ms`, {
      ...context,
      '⏱️ Duration': `${duration}ms`,
      '📊 Operation': operation
    });
  }
}

export const logger = new Logger();

