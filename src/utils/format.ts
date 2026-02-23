/**
 * Format Utilities
 * Type-safe data formatting (currency, percent, date, number)
 */

export class Formatter {
  /**
   * Format currency
   */
  static currency(value: number, currency: string = 'USD', locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Format percentage
   */
  static percent(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Format number with commas
   */
  static number(value: number, decimals: number = 0): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Format date
   */
  static date(value: Date | string, format: string = 'short'): string {
    const date = typeof value === 'string' ? new Date(value) : value;

    if (format === 'short') {
      return date.toLocaleDateString();
    } else if (format === 'long') {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else if (format === 'time') {
      return date.toLocaleTimeString();
    } else if (format === 'datetime') {
      return date.toLocaleString();
    } else if (format === 'iso') {
      return date.toISOString();
    }

    return date.toString();
  }

  /**
   * Format relative time ("2 hours ago")
   */
  static relativeTime(value: Date | string | number): string {
    const date = typeof value === 'string' ? new Date(value) : typeof value === 'number' ? new Date(value) : value;
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;

    return `${Math.floor(days / 365)}y ago`;
  }

  /**
   * Format file size
   */
  static fileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = (bytes / Math.pow(1024, exponent)).toFixed(2);

    return `${value} ${units[exponent]}`;
  }

  /**
   * Format phone number
   */
  static phone(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    return value;
  }

  /**
   * Format percent change (with +/- indicator)
   */
  static percentChange(value: number, decimals: number = 2): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(decimals)}%`;
  }

}

export default Formatter;
