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
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      
      try {
        await this.processJob(job);
        this.stats.processed++;
      } catch (error) {
        logger.error('❌ Job processing failed', {
          jobId: job.id,
          error: error.message,
          attempts: job.metadata.attempts
        });

        // Retry with exponential backoff
        if (job.metadata.attempts < this.maxRetries) {
          job.metadata.attempts++;
          job.metadata.lastError = error.message;
          this.stats.retries++;
          
          const delay = this.retryDelay * Math.pow(2, job.metadata.attempts - 1);
          setTimeout(() => {
            this.queue.push(job);
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
      }
    }

    this.processing = false;
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

