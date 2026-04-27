import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../../src/utils/logger';

describe('logger', () => {
  let debugSpy, infoSpy, warnSpy, errorSpy;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('DEBUG level — all methods fire', () => {
    const log = createLogger('development');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('INFO level — debug suppressed', () => {
    const log = createLogger('production');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('WARN level — debug and info suppressed', () => {
    const log = createLogger('warn');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('ERROR level — only error fires', () => {
    const log = createLogger('error');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('Prefix present — output contains [HMC-VIZ]', () => {
    const log = createLogger('development');
    log.info('test');
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('[HMC-VIZ]'));
  });

  it('Level tag present — output contains [WARN]', () => {
    const log = createLogger('development');
    log.warn('test');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
  });

  it('Data formatted — output contains key: value pairs', () => {
    const log = createLogger('development');
    log.info('msg', { steps: 10 });
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('steps: 10'));
  });
});
