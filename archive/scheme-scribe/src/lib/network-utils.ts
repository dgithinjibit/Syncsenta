/**
 * Network Utilities for Scheme Scribe
 * 
 * Utilities for handling network requests with retry logic and error recovery
 */

interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  backoff?: boolean
  timeout?: number
}

/**
 * Fetch with automatic retry on network errors
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoff = true,
    timeout = 30000,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Don't retry on 4xx errors
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // Retry on 5xx errors
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`)
      }

      return response
    } catch (error: any) {
      lastError = error

      const isNetworkError =
        error.name === 'TypeError' ||
        error.message.includes('network') ||
        error.message.includes('fetch')

      const isTimeout = error.name === 'AbortError'
      const shouldRetry = (isNetworkError || isTimeout) && attempt < maxRetries

      if (!shouldRetry) {
        throw error
      }

      const delay = backoff ? retryDelay * Math.pow(2, attempt) : retryDelay
      console.warn(`Retrying request (${attempt + 1}/${maxRetries})...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

// Made with Bob
