import { describe, it, expect } from 'vitest';
import { ServiceError, ServiceErrorCode } from '../../src/services/types.js';

describe('ServiceError', () => {
  it('creates a basic error', () => {
    const err = new ServiceError('test error', ServiceErrorCode.NETWORK);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.name).toBe('ServiceError');
    expect(err.message).toBe('test error');
    expect(err.code).toBe(ServiceErrorCode.NETWORK);
    expect(err.retryable).toBe(false);
    expect(err.status).toBeUndefined();
  });

  it('creates a retryable error with status', () => {
    const err = new ServiceError('timeout', ServiceErrorCode.TIMEOUT, {
      status: 504,
      retryable: true,
    });
    expect(err.code).toBe(ServiceErrorCode.TIMEOUT);
    expect(err.status).toBe(504);
    expect(err.retryable).toBe(true);
  });

  it('attaches cause', () => {
    const cause = new Error('underlying');
    const err = new ServiceError('wrapped', ServiceErrorCode.UNKNOWN, { cause });
    expect(err.cause).toBe(cause);
  });

  it('fromError wraps generic Error', () => {
    const orig = new Error('boom');
    const err = ServiceError.fromError(orig, ServiceErrorCode.NETWORK);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.code).toBe(ServiceErrorCode.NETWORK);
    expect(err.cause).toBe(orig);
  });

  it('fromError passes through ServiceError', () => {
    const orig = new ServiceError('already', ServiceErrorCode.TIMEOUT, { retryable: true });
    const err = ServiceError.fromError(orig);
    expect(err).toBe(orig);
  });

  it('has all error codes', () => {
    expect(Object.values(ServiceErrorCode).length).toBeGreaterThanOrEqual(10);
    expect(ServiceErrorCode.NETWORK).toBe('SVC_NETWORK');
    expect(ServiceErrorCode.TIMEOUT).toBe('SVC_TIMEOUT');
    expect(ServiceErrorCode.UNAUTHORIZED).toBe('SVC_UNAUTHORIZED');
    expect(ServiceErrorCode.FORBIDDEN).toBe('SVC_FORBIDDEN');
    expect(ServiceErrorCode.NOT_FOUND).toBe('SVC_NOT_FOUND');
    expect(ServiceErrorCode.RATE_LIMITED).toBe('SVC_RATE_LIMITED');
    expect(ServiceErrorCode.CIRCUIT_OPEN).toBe('SVC_CIRCUIT_OPEN');
    expect(ServiceErrorCode.VALIDATION).toBe('SVC_VALIDATION');
    expect(ServiceErrorCode.PARSE).toBe('SVC_PARSE');
    expect(ServiceErrorCode.ABORTED).toBe('SVC_ABORTED');
    expect(ServiceErrorCode.UNKNOWN).toBe('SVC_UNKNOWN');
  });

  it('defaults retryable to false', () => {
    const err = new ServiceError('no retry', ServiceErrorCode.FORBIDDEN);
    expect(err.retryable).toBe(false);
  });

  it('preserves stack trace', () => {
    const err = new ServiceError('stack test', ServiceErrorCode.UNKNOWN);
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('ServiceError');
  });
});
