import { describe, it, expect, vi } from 'vitest';
import { StructuredLogger } from '@ux3/logger/logger';
import { LogEntry } from '@ux3/logger/types';

describe('StructuredLogger', () => {
  it('emits entries to subscribers and console', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const logger = new StructuredLogger('ctx');
    const entries: LogEntry[] = [];
    logger.subscribe((e) => entries.push(e));

    logger.log('key1', { foo: 'bar' });
    logger.warn('key2');

    expect(entries.length).toBe(2);
    expect(entries[0].key).toBe('key1');
    expect(entries[0].level).toBe('log');
    expect(entries[0].context).toBe('ctx');
    expect(entries[1].level).toBe('warn');

    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('unsubscribe works', () => {
    const logger = new StructuredLogger();
    const fn = vi.fn();
    logger.subscribe(fn);
    logger.unsubscribe && logger.unsubscribe(fn);
    logger.log('key');
    expect(fn).not.toHaveBeenCalled();
  });
});
