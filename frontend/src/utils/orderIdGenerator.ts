/**
 * Unified Order ID Generation Utility (Frontend)
 * This function generates consistent Order IDs for frontend display
 * Uses the same logic as the backend to ensure consistency
 * Format: ORD + timestamp + 3-digit random number
 */

/**
 * Generates a unique Order ID
 * @returns {string} Order ID in format: ORD + timestamp + 3-digit random number
 */
export function generateOrderId(): string {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${timestamp}${randomNum}`;
}

/**
 * Generates a preview Order ID for frontend display
 * Uses the same logic as the actual Order ID generation
 * @returns {string} Order ID in format: ORD + timestamp + 3-digit random number
 */
export function generatePreviewOrderId(): string {
  return generateOrderId();
}
