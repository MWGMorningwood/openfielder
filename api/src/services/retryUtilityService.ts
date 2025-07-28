/**
 * Shared retry utility service for Azure Maps operations
 * Provides exponential backoff with jitter for reliable API calls
 */
export class RetryUtilityService {
  /**
   * Execute an operation with retry logic using exponential backoff with jitter
   * @param operation The operation to retry
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @param baseDelay Base delay in milliseconds (default: 1000ms)
   * @param jitterRange Maximum jitter in milliseconds (default: 1000ms)
   * @returns Promise resolving to operation result
   */
  public static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    jitterRange: number = 1000  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting operation (attempt ${attempt + 1}/${maxRetries + 1})`);
        const result = await operation();
        
        if (attempt > 0) {
          console.log(`✅ Operation succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          console.error(`❌ Operation failed after ${attempt + 1} attempts:`, lastError);
          break;
        }
        
        if (!this.isRetryableError(lastError)) {
          console.error(`❌ Non-retryable error encountered:`, lastError);
          throw lastError;
        }
        
        // Calculate backoff delay with exponential backoff and jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * jitterRange;
        const totalDelay = exponentialDelay + jitter;
        
        console.warn(`⚠️  Attempt ${attempt + 1} failed, retrying in ${Math.round(totalDelay)}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }    }

    throw lastError || new Error('Operation failed after all retry attempts');
  }

  /**
   * Determine if an error is retryable
   * @param error Error to check
   * @returns True if error should be retried
   */
  private static isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      // Network connectivity issues
      'ECONNRESET',
      'ECONNREFUSED', 
      'ENOTFOUND',
      'ETIMEDOUT',
      'timeout',
      'network',
      
      // HTTP status codes that are typically retryable
      '429', // Rate limited
      '500', // Internal server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
      
      // Azure-specific retryable errors
      'ServiceUnavailable',
      'InternalServerError',
      'RequestTimeout',
      'TooManyRequests',
      
      // Token-related issues that might resolve
      'TokenRefreshError',
      'token_refresh',
      'authentication_pending'
    ];

    const errorMessage = error.message.toLowerCase();
    const isRetryable = retryablePatterns.some(pattern => 
      errorMessage.includes(pattern.toLowerCase())
    );

    console.log(`🔍 Error analysis: "${error.message}" -> ${isRetryable ? 'RETRYABLE' : 'NON-RETRYABLE'}`);
    return isRetryable;
  }

  /**
   * Create a timeout wrapper for operations
   * @param operation Operation to wrap
   * @param timeoutMs Timeout in milliseconds
   * @returns Promise that rejects on timeout
   */
  public static withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}
