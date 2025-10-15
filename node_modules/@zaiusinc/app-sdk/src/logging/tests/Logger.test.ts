import {AsyncLocalStorage} from 'async_hooks';
import 'jest';

import {OCPContext} from '../../types';
import {
  amendLogContext,
  LogContext,
  Logger,
  logger,
  LogLevel,
  LogVisibility,
  setLogContext,
  setLogLevel
} from '../Logger';

describe('Logger', () => {
  function runWithAsyncLocalStore(
    code: () => void,
    logLevel: LogLevel = LogLevel.Info,
    logContext: LogContext | null = null
  ) {
    const ocpContextStorage = new AsyncLocalStorage<OCPContext>();
    global.ocpContextStorage = ocpContextStorage;

    const context = {
      ocpRuntime: {
        logLevel,
        logContext
      }
    } as OCPContext;

    ocpContextStorage.run(context, code);
  }

  beforeAll(() => {
    jest.spyOn(process.stdout, 'write');
    jest.spyOn(process.stderr, 'write');
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor - async local store', () => {
    it('defaults to developer visibility', () => {
      const logFn = jest.spyOn(logger as any, 'log');
      runWithAsyncLocalStore(async () => {
        logger.info('info');
        expect(logFn).toHaveBeenCalledWith(LogLevel.Info, LogVisibility.Developer, 'info');
      });
      logFn.mockRestore();
    });

    it('sets the default visibility', () => {
      runWithAsyncLocalStore(async () => {
        new Logger({defaultVisibility: LogVisibility.Zaius}).info('info');
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
      });
    });

    it('uses the provided log context', () => {
      runWithAsyncLocalStore(
        async () => {
          logger.info('info');
          expect(process.stdout.write).toHaveBeenCalledWith(
            expect.jsonContaining({
              context: {
                app_id: 'sample',
                app_version: '1.0.0',
                tracker_id: 'vdl',
                install_id: 1234,
                entry_point: 'job:foo',
                job_id: '123-456'
              }
            })
          );
        },
        LogLevel.Info,
        {
          app_id: 'sample',
          app_version: '1.0.0',
          tracker_id: 'vdl',
          install_id: 1234,
          entry_point: 'job:foo',
          job_id: '123-456'
        }
      );
    });
  });

  describe('debug - async local store', () => {
    it('logs to stdout', () => {
      runWithAsyncLocalStore(async () => {
        new Logger().debug('debug');
        expect(process.stdout.write).toHaveBeenCalledTimes(1);
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({message: 'debug'}));
      }, LogLevel.Debug);
    });

    it('does nothing if log level > debug', () => {
      runWithAsyncLocalStore(async () => {
        new Logger().debug('debug');
      }, LogLevel.Warn);
      runWithAsyncLocalStore(async () => {
        new Logger().debug('debug');
      }, LogLevel.Info);
      runWithAsyncLocalStore(async () => {
        new Logger().debug('debug');
      }, LogLevel.Error);
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to debug on the log', () => {
      runWithAsyncLocalStore(async () => {
        logger.debug('level check');
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'debug'}));
      }, LogLevel.Debug);
    });

    it('respects visibility', () => {
      runWithAsyncLocalStore(async () => {
        logger.debug(LogVisibility.Zaius, 'check check');
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
      }, LogLevel.Debug);
    });
  });

  describe('info - async local store', () => {
    it('logs to stdout when the log level is <= info', () => {
      runWithAsyncLocalStore(async () => {
        new Logger().info('debug');
      });
      runWithAsyncLocalStore(async () => {
        new Logger().info('info');
      }, LogLevel.Info);
      expect(process.stdout.write).toHaveBeenCalledTimes(2);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
    });

    it('does nothing if log level > info', () => {
      runWithAsyncLocalStore(async () => {
        new Logger().info('info');
      }, LogLevel.Warn);
      runWithAsyncLocalStore(async () => {
        new Logger().info('info');
      }, LogLevel.Error);
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to info on the log', () => {
      runWithAsyncLocalStore(async () => {
        logger.info('level check');
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'info'}));
      });
    });

    it('respects visibility', () => {
      runWithAsyncLocalStore(async () => {
        logger.info(LogVisibility.Zaius, 'check check');
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
      });
    });
  });

  describe('warn - async local store', () => {
    it('logs to stdout when the log level is <= warn', () => {
      runWithAsyncLocalStore(async () => {
        new Logger().warn('debug');
      }, LogLevel.Debug);
      runWithAsyncLocalStore(async () => {
        new Logger().warn('info');
      }, LogLevel.Info);
      runWithAsyncLocalStore(async () => {
        new Logger().warn('warn');
      }, LogLevel.Warn);
      expect(process.stdout.write).toHaveBeenCalledTimes(3);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(3, expect.jsonContaining({message: 'warn'}));
    });

    it('does nothing if log level > warn', () => {
      runWithAsyncLocalStore(async () => {
        new Logger().warn('warn');
        expect(process.stdout.write).not.toHaveBeenCalled();
      }, LogLevel.Error);
    });

    it('sets the log level to warn on the log', () => {
      runWithAsyncLocalStore(async () => {
        logger.warn('level check');
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'warn'}));
      });
    });

    it('respects visibility', () => {
      runWithAsyncLocalStore(async () => {
        logger.warn(LogVisibility.Zaius, 'check check');
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
      });
    });
  });

  describe('error - async local store', () => {
    it('logs to stderr', () => {
      runWithAsyncLocalStore(async () => {
        new Logger().error('debug');
      }, LogLevel.Debug);
      runWithAsyncLocalStore(async () => {
        new Logger().error('info');
      }, LogLevel.Info);
      runWithAsyncLocalStore(async () => {
        new Logger().error('warn');
      }, LogLevel.Warn);
      runWithAsyncLocalStore(async () => {
        new Logger().error('error');
      }, LogLevel.Error);
      runWithAsyncLocalStore(async () => {
        new Logger().error('never'); // suppresses log
      }, LogLevel.NEVER);
      expect(process.stderr.write).toHaveBeenCalledTimes(4);
      expect(process.stderr.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(3, expect.jsonContaining({message: 'warn'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(4, expect.jsonContaining({message: 'error'}));
    });

    it('logs even if log level is error', () => {
      runWithAsyncLocalStore(async () => {
        new Logger().error('error');
        expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({message: 'error'}));
      }, LogLevel.Error);
    });

    it('sets the log level to info on the log', () => {
      runWithAsyncLocalStore(async () => {
        logger.error('level check');
        expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'error'}));
      });
    });

    it('respects visibility', () => {
      runWithAsyncLocalStore(async () => {
        logger.error(LogVisibility.Zaius, 'check check');
        expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
      });
    });
  });

  describe('log - async local store', () => {
    it('formats objects', () => {
      runWithAsyncLocalStore(async () => {
        logger.info({foo: [1, {bar: 'bar'}]});
        expect(process.stdout.write).toHaveBeenCalledWith(
          expect.jsonContaining({message: "{ foo: [ 1, { bar: 'bar' } ] }"})
        );
      });
    });

    it('extracts the stacktrace from the first error', () => {
      runWithAsyncLocalStore(async () => {
        logger.error(new Error('i have a stacktrace'));
        expect(process.stderr.write).toHaveBeenCalledWith(expect.stringMatching(/"stacktrace":".+"/));

        logger.error('Error:', new Error('i have a stacktrace'));
        expect(process.stderr.write).toHaveBeenCalledWith(expect.stringMatching(/"stacktrace":".+"/));

        logger.error('no stacktrace');
        expect(process.stderr.write).toHaveBeenCalledWith(expect.not.stringMatching(/"stacktrace":".+"/));
      });
    });

    it('concatenates different values logged in one call', () => {
      runWithAsyncLocalStore(async () => {
        logger.error('!!!', new Error('something went wrong'), 5, 'times');
        expect(process.stderr.write).toHaveBeenCalledWith(
          expect.jsonContaining({message: '!!! Error: something went wrong 5 times'})
        );
      });
    });

    it('fills in all the expected details', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      runWithAsyncLocalStore(
        async () => {
          logger.info('This is a test');
          expect(process.stdout.write).toHaveBeenCalledWith(
            expect.jsonRepresenting({
              time: '2019-09-04T19:49:22.275Z',
              level: 'info',
              message: 'This is a test',
              audience: 'developer',
              context: {
                app_id: 'sample1',
                app_version: '1.1.0',
                tracker_id: 'abc123',
                install_id: 123,
                entry_point: 'function:foo',
                request_id: '12345-678-90'
              }
            })
          );
        },
        LogLevel.Info,
        {
          app_id: 'sample1',
          app_version: '1.1.0',
          tracker_id: 'abc123',
          install_id: 123,
          entry_point: 'function:foo',
          request_id: '12345-678-90'
        }
      );
    });

    it.each([
      ['a'.repeat(15), 'a'.repeat(15)],
      ['a'.repeat(16), 'a'.repeat(16)],
      ['a'.repeat(17), 'a'.repeat(13) + '...'],
      ['a'.repeat(18), 'a'.repeat(13) + '...']
    ])('truncates long messages', (input, expected) => {
      runWithAsyncLocalStore(async () => {
        new Logger({maxLineLength: 16}).info(input);
        expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({message: expected}));
      });
    });
  });

  describe('override default log level - async local store', () => {
    it('logs to stdout only logs with level >= overriden log level ', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      runWithAsyncLocalStore(async () => {
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error');
        expect(process.stdout.write).toHaveBeenCalledTimes(1);
        expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'warn'}));
        expect(process.stderr.write).toHaveBeenCalledTimes(1);
        expect(process.stderr.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'error'}));
      }, LogLevel.Warn);
    });

    it('does nothing if the overridden log level < overridden log level', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      runWithAsyncLocalStore(async () => {
        logger.debug('debug');
        logger.info('info');
        expect(process.stdout.write).not.toHaveBeenCalled();
      }, LogLevel.Warn);
    });
  });

  describe('constructor - module scope', () => {
    it('defaults to developer visibility', () => {
      const logFn = jest.spyOn(logger as any, 'log');
      logger.info('info');
      expect(logFn).toHaveBeenCalledWith(LogLevel.Info, LogVisibility.Developer, 'info');
      logFn.mockRestore();
    });

    it('sets the default visibility', () => {
      setLogLevel(LogLevel.Info);
      new Logger({defaultVisibility: LogVisibility.Zaius}).info('info');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });

    it('uses the provided log context', () => {
      setLogContext({
        app_id: 'sample',
        app_version: '1.0.0',
        tracker_id: 'vdl',
        install_id: 1234,
        entry_point: 'job:foo',
        job_id: '123-456'
      });
      amendLogContext({extra_field: 'extra_value'});
      logger.info('info');
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.jsonContaining({
          context: {
            app_id: 'sample',
            app_version: '1.0.0',
            tracker_id: 'vdl',
            install_id: 1234,
            entry_point: 'job:foo',
            job_id: '123-456',
            extra_field: 'extra_value'
          }
        })
      );
    });
  });

  describe('debug - module scope', () => {
    it('logs to stdout', () => {
      setLogLevel(LogLevel.Debug);
      new Logger({}).debug('debug');
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({message: 'debug'}));
    });

    it('does nothing if log level > debug', () => {
      setLogLevel(LogLevel.Warn);
      new Logger().debug('debug');
      setLogLevel(LogLevel.Info);
      new Logger().debug('debug');
      setLogLevel(LogLevel.Error);
      new Logger().debug('debug');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to debug on the log', () => {
      setLogLevel(LogLevel.Debug);
      logger.debug('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'debug'}));
    });

    it('respects visibility', () => {
      setLogLevel(LogLevel.Debug);
      logger.debug(LogVisibility.Zaius, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });
  });

  describe('info - module scope', () => {
    beforeEach(() => {
      setLogLevel(LogLevel.Info);
    });

    it('logs to stdout when the log level is <= info', () => {
      setLogLevel(LogLevel.Debug);
      new Logger({}).info('debug');
      setLogLevel(LogLevel.Info);
      new Logger({}).info('info');
      expect(process.stdout.write).toHaveBeenCalledTimes(2);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
    });

    it('does nothing if log level > info', () => {
      setLogLevel(LogLevel.Warn);
      new Logger({}).info('info');
      setLogLevel(LogLevel.Error);
      new Logger({}).info('info');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to info on the log', () => {
      logger.info('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'info'}));
    });

    it('respects visibility', () => {
      logger.info(LogVisibility.Zaius, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });
  });

  describe('warn - module scope', () => {
    beforeEach(() => {
      setLogLevel(LogLevel.Warn);
    });

    it('logs to stdout when the log level is <= warn', () => {
      setLogLevel(LogLevel.Debug);
      new Logger({}).warn('debug');
      setLogLevel(LogLevel.Info);
      new Logger({}).warn('info');
      setLogLevel(LogLevel.Warn);
      new Logger({}).warn('warn');
      expect(process.stdout.write).toHaveBeenCalledTimes(3);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(3, expect.jsonContaining({message: 'warn'}));
    });

    it('does nothing if log level > warn', () => {
      setLogLevel(LogLevel.Error);
      new Logger({}).warn('warn');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to warn on the log', () => {
      logger.warn('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'warn'}));
    });

    it('respects visibility', () => {
      logger.warn(LogVisibility.Zaius, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });
  });

  describe('error - module scope', () => {
    beforeEach(() => {
      setLogLevel(LogLevel.Error);
    });

    it('logs to stderr', () => {
      setLogLevel(LogLevel.Debug);
      new Logger({}).error('debug');
      setLogLevel(LogLevel.Info);
      new Logger({}).error('info');
      setLogLevel(LogLevel.Warn);
      new Logger({}).error('warn');
      setLogLevel(LogLevel.Error);
      new Logger({}).error('error');
      setLogLevel(LogLevel.NEVER);
      new Logger({}).error('never'); // suppresses log
      expect(process.stderr.write).toHaveBeenCalledTimes(4);
      expect(process.stderr.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(3, expect.jsonContaining({message: 'warn'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(4, expect.jsonContaining({message: 'error'}));
    });

    it('logs even if log level is error', () => {
      new Logger({}).error('error');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({message: 'error'}));
    });

    it('sets the log level to info on the log', () => {
      logger.error('level check');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'error'}));
    });

    it('respects visibility', () => {
      logger.error(LogVisibility.Zaius, 'check check');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });
  });

  describe('log - module scope', () => {
    beforeEach(() => {
      setLogLevel(LogLevel.Info);
    });

    it('formats objects', () => {
      logger.info({foo: [1, {bar: 'bar'}]});
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.jsonContaining({message: "{ foo: [ 1, { bar: 'bar' } ] }"})
      );
    });

    it('extracts the stacktrace from the first error', () => {
      logger.error(new Error('i have a stacktrace'));
      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringMatching(/"stacktrace":".+"/));

      logger.error('Error:', new Error('i have a stacktrace'));
      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringMatching(/"stacktrace":".+"/));

      logger.error('no stacktrace');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.not.stringMatching(/"stacktrace":".+"/));
    });

    it('concatenates different values logged in one call', () => {
      logger.error('!!!', new Error('something went wrong'), 5, 'times');
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.jsonContaining({message: '!!! Error: something went wrong 5 times'})
      );
    });

    it('fills in all the expected details', () => {
      setLogContext({
        app_id: 'sample1',
        app_version: '1.1.0',
        tracker_id: 'abc123',
        install_id: 123,
        entry_point: 'function:foo',
        request_id: '12345-678-90'
      });
      amendLogContext({extra_field: 'extra_value'});
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      logger.info('This is a test');
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.jsonRepresenting({
          time: '2019-09-04T19:49:22.275Z',
          level: 'info',
          message: 'This is a test',
          audience: 'developer',
          context: {
            app_id: 'sample1',
            app_version: '1.1.0',
            tracker_id: 'abc123',
            install_id: 123,
            entry_point: 'function:foo',
            request_id: '12345-678-90',
            extra_field: 'extra_value'
          }
        })
      );
    });

    it.each([
      ['a'.repeat(15), 'a'.repeat(15)],
      ['a'.repeat(16), 'a'.repeat(16)],
      ['a'.repeat(17), 'a'.repeat(13) + '...'],
      ['a'.repeat(18), 'a'.repeat(13) + '...']
    ])('truncates long messages', (input, expected) => {
      new Logger({maxLineLength: 16}).info(input);
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({message: expected}));
    });
  });

  describe('override default log level - module scope', () => {
    it('logs to stdout only logs with level >= overriden log level ', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      setLogLevel(LogLevel.Warn);
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'warn'}));
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
      expect(process.stderr.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'error'}));
    });

    it('does nothing if the overridden log level < overridden log level', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      setLogLevel(LogLevel.Warn);
      logger.debug('debug');
      logger.info('info');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });
  });
});
