/**
 * Frontend logging utility for RagCheck
 * Focuses on user-friendly messages and important system events
 */

export enum LogLevel {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS', 
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export interface LogContext {
  component?: string;
  action?: string;
  duration?: number;
  data?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString().substring(11, 23);
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `{${context.action}}` : '';
    const duration = context?.duration ? `(${context.duration}ms)` : '';
    
    return `${timestamp} ${level} ${component}${action} ${message} ${duration}`.trim();
  }

  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.SUCCESS:
        return console.log;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARNING:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment && level === LogLevel.INFO) {
      return; // Skip INFO logs in production
    }

    const formattedMessage = this.formatMessage(level, message, context);
    const consoleMethod = this.getConsoleMethod(level);
    
    consoleMethod(formattedMessage);
    
    // Include additional data if provided
    if (context?.data && this.isDevelopment) {
      console.log('📊 Additional context:', context.data);
    }
  }

  // User-friendly success messages
  success(message: string, context?: LogContext) {
    this.log(LogLevel.SUCCESS, `✅ ${message}`, context);
  }

  // General information (development only)
  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, `ℹ️ ${message}`, context);
  }

  // Important warnings for users
  warning(message: string, context?: LogContext) {
    this.log(LogLevel.WARNING, `⚠️ ${message}`, context);
  }

  // Error messages with user context
  error(message: string, context?: LogContext) {
    this.log(LogLevel.ERROR, `❌ ${message}`, context);
  }

  // API request logging
  apiRequest(method: string, url: string, context?: LogContext) {
    this.info(`${method.toUpperCase()} request to ${url}`, {
      ...context,
      component: context?.component || 'API',
      action: 'REQUEST'
    });
  }

  // API response logging  
  apiResponse(method: string, url: string, status: number, duration: number, context?: LogContext) {
    const message = `${method.toUpperCase()} ${url} → ${status}`;
    
    if (status >= 200 && status < 300) {
      this.success(`API call successful: ${url}`, {
        ...context,
        component: context?.component || 'API',
        action: 'RESPONSE',
        duration
      });
    } else if (status >= 400) {
      this.error(`API call failed: ${message}`, {
        ...context,
        component: context?.component || 'API', 
        action: 'RESPONSE',
        duration
      });
    }
  }

  // API error logging
  apiError(method: string, url: string, error: any, context?: LogContext) {
    const userMessage = this.getUserFriendlyErrorMessage(error);
    this.error(`API error: ${userMessage}`, {
      ...context,
      component: context?.component || 'API',
      action: 'ERROR',
      data: this.isDevelopment ? { method, url, error } : undefined
    });
  }

  // WebSocket event logging
  websocketEvent(event: string, message?: string, context?: LogContext) {
    const fullMessage = message ? `${event}: ${message}` : event;
    
    if (event === 'connected' || event === 'message') {
      this.info(`WebSocket ${fullMessage}`, {
        ...context,
        component: context?.component || 'WebSocket',
        action: event.toUpperCase()
      });
    } else if (event === 'error' || event === 'closed') {
      this.warning(`WebSocket ${fullMessage}`, {
        ...context,
        component: context?.component || 'WebSocket',
        action: event.toUpperCase()
      });
    }
  }

  // User navigation logging
  navigation(from: string, to: string, context?: LogContext) {
    this.info(`User navigation: ${from} → ${to}`, {
      ...context,
      component: context?.component || 'Navigation',
      action: 'NAVIGATE'
    });
  }

  // Progress logging for long operations
  progress(operation: string, percentage: number, context?: LogContext) {
    if (percentage % 25 === 0 || percentage === 100) { // Log at 25%, 50%, 75%, 100%
      const message = `${operation}: ${percentage}% complete`;
      if (percentage === 100) {
        this.success(`${operation} completed successfully`, context);
      } else {
        this.info(message, {
          ...context,
          component: context?.component || 'Progress',
          action: 'UPDATE'
        });
      }
    }
  }

  private getUserFriendlyErrorMessage(error: any): string {
    // Network errors
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
      return 'Unable to connect to the analysis service. Please check your connection.';
    }
    
    // Timeout errors
    if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
      return 'Request timed out. The service may be busy, please try again.';
    }
    
    // HTTP errors
    if (error?.response?.status) {
      const status = error.response.status;
      if (status === 404) {
        return 'The requested resource was not found.';
      } else if (status === 500) {
        return 'Internal server error. Please try again later.';
      } else if (status >= 400 && status < 500) {
        return 'Invalid request. Please check your input and try again.';
      }
    }
    
    // Generic error
    return error?.message || 'An unexpected error occurred. Please try again.';
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods for easier imports
export const logSuccess = logger.success.bind(logger);
export const logInfo = logger.info.bind(logger);  
export const logWarning = logger.warning.bind(logger);
export const logError = logger.error.bind(logger);
export const logApiRequest = logger.apiRequest.bind(logger);
export const logApiResponse = logger.apiResponse.bind(logger);
export const logApiError = logger.apiError.bind(logger);
export const logWebSocketEvent = logger.websocketEvent.bind(logger);
export const logNavigation = logger.navigation.bind(logger);
export const logProgress = logger.progress.bind(logger);