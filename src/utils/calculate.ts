/**
 * Calculate Utilities
 * Generic math operations
 */

export class Calculator {
  /**
   * Calculate percentage change
   */
  static percentChange(start: number, end: number): number {
    if (start === 0) return 0;
    return (end - start) / Math.abs(start);
  }

  /**
   * Calculate standard deviation
   */
  static stdDev(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate moving average
   */
  static movingAverage(values: number[], period: number): number[] {
    if (values.length < period) return values;

    const result: number[] = [];

    for (let i = period - 1; i < values.length; i++) {
      const slice = values.slice(i - period + 1, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / period;
      result.push(avg);
    }

    return result;
  }

  /**
   * Calculate mean
   */
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate median
   */
  static median(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Round number to decimals
   */
  static round(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Clamp number between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation
   */
  static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }
}

export default Calculator;
