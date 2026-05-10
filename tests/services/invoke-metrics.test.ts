import { describe, it, expect, vi } from 'vitest';
import { InvokeMetrics } from '../../src/services/invoke-metrics.js';

describe('InvokeMetrics', () => {
  it('records successful calls', () => {
    const metrics = new InvokeMetrics();
    metrics.record('api', 'getUsers', 100, true);
    metrics.record('api', 'getUsers', 200, true);

    const snap = metrics.stats('api', 'getUsers');
    expect(snap.entries['api.getUsers'].count).toBe(2);
    expect(snap.entries['api.getUsers'].errors).toBe(0);
    expect(snap.entries['api.getUsers'].errorRate).toBe(0);
    expect(snap.entries['api.getUsers'].avgTime).toBe(150);
    expect(snap.totalCalls).toBe(2);
    expect(snap.totalErrors).toBe(0);
  });

  it('records failed calls', () => {
    const metrics = new InvokeMetrics();
    metrics.record('api', 'getUsers', 100, false);
    metrics.record('api', 'getUsers', 100, true);
    metrics.record('api', 'getUsers', 100, false);

    const snap = metrics.stats('api', 'getUsers');
    expect(snap.entries['api.getUsers'].count).toBe(3);
    expect(snap.entries['api.getUsers'].errors).toBe(2);
    expect(snap.entries['api.getUsers'].errorRate).toBeCloseTo(0.667, 2);
  });

  it('recordInvoke convenience method', () => {
    const metrics = new InvokeMetrics();
    metrics.recordInvoke('api', 'getUsers', 50);
    metrics.recordInvoke('api', 'getUsers', 50, new Error('fail'));

    const snap = metrics.stats('api', 'getUsers');
    expect(snap.entries['api.getUsers'].count).toBe(2);
    expect(snap.entries['api.getUsers'].errors).toBe(1);
  });

  it('filters stats by service prefix', () => {
    const metrics = new InvokeMetrics();
    metrics.record('api', 'getUsers', 10, true);
    metrics.record('api', 'getPosts', 20, true);
    metrics.record('chat', 'send', 30, true);

    const snap = metrics.stats('api');
    expect(snap.totalCalls).toBe(2);
    expect(Object.keys(snap.entries)).toHaveLength(2);
  });

  it('returns all stats without filter', () => {
    const metrics = new InvokeMetrics();
    metrics.record('api', 'getUsers', 10, true);
    metrics.record('chat', 'send', 20, false);

    const snap = metrics.stats();
    expect(snap.totalCalls).toBe(2);
    expect(snap.totalErrors).toBe(1);
  });

  it('registers and triggers flush handlers', () => {
    const metrics = new InvokeMetrics();
    const handler = vi.fn();

    metrics.onFlush(handler);
    metrics.record('api', 'get', 10, true);
    metrics.flush();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ totalCalls: 1 }));
  });

  it('unregisters flush handler', () => {
    const metrics = new InvokeMetrics();
    const handler = vi.fn();
    const unsub = metrics.onFlush(handler);
    unsub();

    metrics.record('api', 'get', 10, true);
    metrics.flush();
    expect(handler).not.toHaveBeenCalled();
  });

  it('clears all stats', () => {
    const metrics = new InvokeMetrics();
    metrics.record('api', 'get', 10, true);
    metrics.clear();

    const snap = metrics.stats();
    expect(snap.totalCalls).toBe(0);
  });

  it('clears stats for specific service', () => {
    const metrics = new InvokeMetrics();
    metrics.record('api', 'get', 10, true);
    metrics.record('chat', 'send', 20, true);
    metrics.clearFor('api');

    const snap = metrics.stats();
    expect(snap.totalCalls).toBe(1);
    expect(Object.keys(snap.entries)).toEqual(['chat.send']);
  });

  it('clears stats for specific service and method', () => {
    const metrics = new InvokeMetrics();
    metrics.record('api', 'getUsers', 10, true);
    metrics.record('api', 'getPosts', 20, true);
    metrics.clearFor('api', 'getUsers');

    const snap = metrics.stats('api');
    expect(snap.totalCalls).toBe(1);
    expect(Object.keys(snap.entries)).toEqual(['api.getPosts']);
  });

  it('overallErrorRate across all services', () => {
    const metrics = new InvokeMetrics();
    metrics.record('api', 'get', 10, true);
    metrics.record('api', 'get', 10, true);
    metrics.record('api', 'get', 10, false);
    metrics.record('chat', 'send', 10, false);

    const snap = metrics.stats();
    expect(snap.overallErrorRate).toBe(0.5);
  });
});
