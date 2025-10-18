const fs = require('fs');
const path = require('path');

// Enhanced Live log monitoring script
class LogMonitor {
  constructor() {
    this.logFile = path.join(__dirname, 'logs', `app-${new Date().toISOString().split('T')[0]}.log`);
    this.errorFile = path.join(__dirname, 'logs', `error-${new Date().toISOString().split('T')[0]}.log`);
    this.isMonitoring = false;
    this.lastSize = 0;
    this.errorLastSize = 0;
    this.stats = {
      totalLogs: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      debug: 0
    };
  }

  startMonitoring() {
    console.log('🔍 Starting ENHANCED live log monitoring...');
    console.log(`📁 Main log file: ${this.logFile}`);
    console.log(`📁 Error log file: ${this.errorFile}`);
    console.log('📊 Watching for new log entries...');
    console.log('🎯 Enhanced tracking: CORS, Validation, Errors, Requests\n');
    
    this.isMonitoring = true;
    this.lastSize = this.getFileSize();
    this.errorLastSize = this.getErrorFileSize();
    
    // Show stats every 30 seconds
    this.statsInterval = setInterval(() => {
      this.showStats();
    }, 30000);
    
    // Check for new entries every 500ms
    this.interval = setInterval(() => {
      this.checkForNewLogs();
      this.checkForNewErrors();
    }, 500);
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    this.isMonitoring = false;
    console.log('\n🛑 Log monitoring stopped.');
    this.showStats();
  }

  getFileSize() {
    try {
      const stats = fs.statSync(this.logFile);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  getErrorFileSize() {
    try {
      const stats = fs.statSync(this.errorFile);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  showStats() {
    console.log('\n📊 LOG STATISTICS:');
    console.log(`   Total Logs: ${this.stats.totalLogs}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Warnings: ${this.stats.warnings}`);
    console.log(`   Info: ${this.stats.info}`);
    console.log(`   Debug: ${this.stats.debug}`);
    console.log('─────────────────────────────────\n');
  }

  checkForNewLogs() {
    try {
      const currentSize = this.getFileSize();
      
      if (currentSize > this.lastSize) {
        // Read new content
        const stream = fs.createReadStream(this.logFile, {
          start: this.lastSize,
          end: currentSize
        });
        
        let newContent = '';
        stream.on('data', (chunk) => {
          newContent += chunk.toString();
        });
        
        stream.on('end', () => {
          if (newContent.trim()) {
            this.displayNewLogs(newContent);
          }
          this.lastSize = currentSize;
        });
      }
    } catch (error) {
      // File might not exist yet, ignore
    }
  }

  displayNewLogs(content) {
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const timestamp = new Date().toLocaleTimeString();
      this.stats.totalLogs++;
      
      // Enhanced color coding and categorization
      if (line.includes('[ERROR]') || line.includes('❌') || line.includes('💥')) {
        this.stats.errors++;
        console.log(`🔴 ${timestamp} | ${line}`);
      } else if (line.includes('[WARN]') || line.includes('⚠️')) {
        this.stats.warnings++;
        console.log(`🟡 ${timestamp} | ${line}`);
      } else if (line.includes('🚀') || line.includes('✅') || line.includes('🌐') || line.includes('📊')) {
        this.stats.info++;
        console.log(`🔵 ${timestamp} | ${line}`);
      } else if (line.includes('[INFO]')) {
        this.stats.info++;
        console.log(`🔵 ${timestamp} | ${line}`);
      } else if (line.includes('[DEBUG]')) {
        this.stats.debug++;
        console.log(`⚪ ${timestamp} | ${line}`);
      } else {
        console.log(`📝 ${timestamp} | ${line}`);
      }
    });
  }

  checkForNewErrors() {
    try {
      const currentSize = this.getErrorFileSize();
      
      if (currentSize > this.errorLastSize) {
        const stream = fs.createReadStream(this.errorFile, {
          start: this.errorLastSize,
          end: currentSize
        });
        
        let newContent = '';
        stream.on('data', (chunk) => {
          newContent += chunk.toString();
        });
        
        stream.on('end', () => {
          if (newContent.trim()) {
            console.log('\n🚨 NEW ERROR DETECTED:');
            console.log(newContent);
            console.log('─────────────────────────────────\n');
          }
          this.errorLastSize = currentSize;
        });
      }
    } catch (error) {
      // Error file might not exist yet, ignore
    }
  }
}

// Create and start monitoring
const monitor = new LogMonitor();

// Handle graceful shutdown
process.on('SIGINT', () => {
  monitor.stopMonitoring();
  process.exit(0);
});

// Start monitoring
monitor.startMonitoring();

console.log('Press Ctrl+C to stop monitoring');
