/**
 * Performance Monitoring Utilities
 * 
 * Tracks and reports performance metrics for dashboard hydration and API calls.
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean;

  constructor() {
    // Only enable in development or when explicitly requested
    this.enabled = process.env.NODE_ENV === 'development' || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('perf.monitor') === '1');
  }

  /**
   * Start tracking a performance metric
   */
  start(name: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * Stop tracking and record duration
   */
  end(name: string): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[PerfMonitor] Metric '${name}' not found`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.log(metric);
    return metric.duration;
  }

  /**
   * Log metric to console with color coding
   */
  private log(metric: PerformanceMetric): void {
    if (!metric.duration) return;

    const duration = metric.duration.toFixed(2);
    const color = this.getColorForDuration(metric.duration);
    const symbol = this.getSymbolForDuration(metric.duration);

    console.log(
      `%c${symbol} ${metric.name}: ${duration}ms`,
      `color: ${color}; font-weight: bold`,
      metric.metadata || ''
    );
  }

  private getColorForDuration(duration: number): string {
    if (duration < 100) return '#10b981'; // green
    if (duration < 500) return '#f59e0b'; // amber
    if (duration < 1000) return '#f97316'; // orange
    return '#ef4444'; // red
  }

  private getSymbolForDuration(duration: number): string {
    if (duration < 100) return '⚡';
    if (duration < 500) return '✓';
    if (duration < 1000) return '⚠';
    return '🐌';
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    count: number;
    totalTime: number;
    avgTime: number;
    p50: number;
    p95: number;
  } {
    const durations = Array.from(this.metrics.values())
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return { count: 0, totalTime: 0, avgTime: 0, p50: 0, p95: 0 };
    }

    const totalTime = durations.reduce((sum, d) => sum + d, 0);
    const avgTime = totalTime / durations.length;
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      count: durations.length,
      totalTime,
      avgTime,
      p50: durations[p50Index],
      p95: durations[p95Index],
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('perf.monitor', enabled ? '1' : '0');
    }
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Hook for measuring component render performance
 */
export function usePerformanceTracking(componentName: string) {
  if (typeof window === 'undefined') return;

  perfMonitor.start(`${componentName}.mount`);

  return () => {
    perfMonitor.end(`${componentName}.mount`);
  };
}

/**
 * Measure async function performance
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  perfMonitor.start(name, metadata);
  try {
    const result = await fn();
    return result;
  } finally {
    perfMonitor.end(name);
  }
}

/**
 * Measure sync function performance
 */
export function measure<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  perfMonitor.start(name, metadata);
  try {
    return fn();
  } finally {
    perfMonitor.end(name);
  }
}

/**
 * Web Vitals tracking (optional)
 */
export function reportWebVitals(metric: { name: string; value: number }) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WebVitals] ${metric.name}:`, metric.value);
  }

  // Send to analytics service in production
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      non_interaction: true,
    });
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
