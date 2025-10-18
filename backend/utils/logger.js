const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be set via environment variable)
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || 'DEBUG';

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    this.errorFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[CURRENT_LOG_LEVEL];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    const formattedData = data ? ` | Data: ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] [${level}] [PID:${pid}] ${message}${formattedData}`;
  }

  writeToFile(filename, message) {
    try {
      fs.appendFileSync(filename, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, data);
    
    // Console output with colors
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m', // White
      RESET: '\x1b[0m'   // Reset
    };

    console.log(`${colors[level]}${formattedMessage}${colors.RESET}`);
    
    // Write to log files
    this.writeToFile(this.logFile, formattedMessage);
    
    if (level === 'ERROR') {
      this.writeToFile(this.errorFile, formattedMessage);
    }
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  // Request logging
  logRequest(req, res, next) {
    const start = Date.now();
    const { method, url, headers, body, query, params } = req;
    const userAgent = headers['user-agent'] || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';

    this.info('Incoming Request', {
      method,
      url,
      ip,
      userAgent,
      query,
      params,
      body: method === 'POST' || method === 'PUT' ? body : undefined
    });

    // Log response when it finishes
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      
      this.info('Request Completed', {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        ip
      });
    });

    next();
  }

  // Database operation logging
  logDatabase(operation, collection, data = null, error = null) {
    if (error) {
      this.error(`Database ${operation} Error`, {
        collection,
        error: error.message,
        stack: error.stack,
        data
      });
    } else {
      this.debug(`Database ${operation}`, {
        collection,
        data
      });
    }
  }

  // Authentication logging
  logAuth(action, user = null, success = true, error = null) {
    const logData = {
      action,
      success,
      user: user ? {
        id: user._id || user.id,
        email: user.email,
        company: user.company_name
      } : null,
      timestamp: new Date().toISOString()
    };

    if (error) {
      logData.error = error.message;
      this.error(`Auth ${action} Failed`, logData);
    } else {
      this.info(`Auth ${action} ${success ? 'Success' : 'Failed'}`, logData);
    }
  }

  // Business logic logging
  logBusiness(operation, data = null, result = null, error = null) {
    if (error) {
      this.error(`Business Logic Error: ${operation}`, {
        operation,
        error: error.message,
        stack: error.stack,
        data
      });
    } else {
      this.info(`Business Logic: ${operation}`, {
        operation,
        data,
        result
      });
    }
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
