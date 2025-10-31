// Location: backend/utils/webhookQueue.js
// Simple in-memory queue for webhook processing with retry mechanism
const logger = require('./logger');

class WebhookQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.maxQueueSize = 10000;
    this.stats = {
      processed: 0,
      failed: 0,
      retries: 0
    };
  }

  /**
   * Add webhook to queue
   */
  async enqueue(webhookType, payload, metadata = {}) {
    if (this.queue.length >= this.maxQueueSize) {
      logger.error('⚠️ Webhook queue is full', {
        queueSize: this.queue.length,
        maxSize: this.maxQueueSize
      });
      throw new Error('Webhook queue is full');
    }

    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: webhookType,
      payload,
      metadata: {
        ...metadata,
        attempts: 0,
        createdAt: new Date(),
        queuedAt: new Date()
      }
    };

    this.queue.push(job);
    logger.debug('📥 Webhook queued', {
      jobId: job.id,
      type: webhookType,
      queueSize: this.queue.length
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return job.id;
  }

  /**
   * Process queue with retry mechanism
   * FIXED: Process jobs asynchronously to prevent event loop blocking
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    // Process jobs one at a time with delays to prevent blocking
    const processNext = async () => {
      try {
        if (this.queue.length === 0) {
          this.processing = false;
          return;
        }

        const job = this.queue.shift();
        
        try {
          // Add timeout to prevent hanging jobs
          const jobTimeout = 30000; // 30 seconds max per job
          const jobPromise = this.processJob(job);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Job processing timeout')), jobTimeout);
          });
          
          await Promise.race([jobPromise, timeoutPromise]);
          this.stats.processed++;
          
          // Yield control back to event loop before processing next job
          setImmediate(() => processNext());
        } catch (error) {
          logger.error('❌ Job processing failed', {
            jobId: job.id,
            error: error.message,
            attempts: job.metadata.attempts,
            stack: error.stack
          });

          // Retry with exponential backoff
          if (job.metadata.attempts < this.maxRetries) {
            job.metadata.attempts++;
            job.metadata.lastError = error.message;
            this.stats.retries++;
            
            const delay = this.retryDelay * Math.pow(2, job.metadata.attempts - 1);
            
            setTimeout(() => {
              // Safety check: don't add to queue if it's too large
              if (this.queue.length < this.maxQueueSize) {
                this.queue.push(job);
                // Trigger processing if queue is not being processed
                if (!this.processing) {
                  this.processQueue();
                }
              } else {
                logger.error('⚠️ Queue full, dropping retry job', {
                  jobId: job.id,
                  queueSize: this.queue.length
                });
                this.stats.failed++;
              }
            }, delay);

            logger.info('🔄 Job queued for retry', {
              jobId: job.id,
              attempt: job.metadata.attempts,
              delay: `${delay}ms`
            });
          } else {
            this.stats.failed++;
            logger.error('💀 Job failed after max retries', {
              jobId: job.id,
              attempts: job.metadata.attempts,
              error: error.message
            });
          }
          
          // Continue processing next job even if current one failed
          setImmediate(() => processNext());
        }
      } catch (error) {
        // Critical error in processNext itself - prevent infinite loop
        logger.error('❌ Critical error in queue processor', {
          error: error.message,
          stack: error.stack,
          queueLength: this.queue.length
        });
        this.processing = false;
        
        // Try to restart processing after a delay if queue still has items
        if (this.queue.length > 0) {
          setTimeout(() => {
            if (!this.processing && this.queue.length > 0) {
              logger.info('🔄 Restarting queue processing after error');
              this.processQueue();
            }
          }, 5000);
        }
      }
    };

    // Start processing
    setImmediate(() => processNext());
  }

  /**
   * Process individual job
   */
  async processJob(job) {
    const startTime = Date.now();
    const webhookService = require('../services/webhookService');

    logger.info('🔄 Processing webhook job', {
      jobId: job.id,
      type: job.type,
      attempts: job.metadata.attempts
    });

    let result;
    switch (job.type) {
      case 'scan-status':
        result = await webhookService.processScanPushWebhook(job.payload);
        break;
      case 'epod':
        result = await webhookService.processEPODWebhook(job.payload);
        break;
      case 'sorter-image':
        result = await webhookService.processSorterImageWebhook(job.payload);
        break;
      case 'qc-image':
        result = await webhookService.processQCImageWebhook(job.payload);
        break;
      default:
        throw new Error(`Unknown webhook type: ${job.type}`);
    }

    const duration = Date.now() - startTime;
    logger.info('✅ Job processed successfully', {
      jobId: job.id,
      type: job.type,
      duration: `${duration}ms`
    });

    return result;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      stats: { ...this.stats }
    };
  }

  /**
   * Clear queue (for testing)
   */
  clear() {
    this.queue = [];
    this.processing = false;
  }
}

module.exports = new WebhookQueue();

