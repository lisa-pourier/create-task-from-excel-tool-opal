import * as util from 'util';

import {ValueHash} from '../store';

/**
 * Supported log levels, in order of least important to most.
 */
export enum LogLevel {
  Debug = 1,
  Info = 2,
  Warn = 3,
  Error = 4,
  /**
   * NEVER should only be used for testing purposes to silence all logs
   */
  NEVER = 5
}

/**
 * Visibility of the log output
 */
export enum LogVisibility {
  /**
   * Zaius: for SDK internal use only
   */
  Zaius = 'zaius',
  /**
   * Developer: Make the log visible to app developers
   */
  Developer = 'developer'
}

/**
 * @hidden
 * Format of logs output to stdout
 */
interface LogMessage {
  time: string;
  level: string;
  message: string;
  stacktrace: string;
  audience: LogVisibility.Zaius | LogVisibility.Developer;
  context: LogContext;
}

/**
 * @hidden
 * Context added to each log automatically by the SDK
 * This is set automatically when the app code is called by the engine.
 * Different fields will be set depending on how the app code is being executed
 * (e.g. function, job, data sync, etc.)
 */
export interface LogContext extends ValueHash {
  app_id: string;
  app_version: string;
  entry_point: string;
  tracker_id?: string;
}

export interface LoggerOptions {
  maxLineLength: number;
  defaultVisibility: LogVisibility;
}

export const LOG_LEVELS = {
  [LogLevel.Debug]: 'debug',
  [LogLevel.Info]: 'info',
  [LogLevel.Warn]: 'warn',
  [LogLevel.Error]: 'error',
  [LogLevel.NEVER]: 'NEVER'
};

export const LOG_LEVELS_BY_STRING: {[key: string]: LogLevel} = {
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warn: LogLevel.Warn,
  error: LogLevel.Error,
  NEVER: LogLevel.NEVER
};

const visibilityValues = new Set([LogVisibility.Zaius, LogVisibility.Developer]);

const INSPECT_OPTIONS = {
  depth: 5,
  color: false
};

let context: LogContext;

/**
 * @hidden
 * Set automatically when an app starts up
 * @param logContext configuration for runtime
 */
export function setLogContext(logContext: LogContext) {
  context = logContext;
}

/**
 * @hidden
 * Amend the current log context with additional information
 */
export function amendLogContext(extra_fields: {[field: string]: string | number | boolean}) {
  context && (context = {...context, ...extra_fields});
}

function getLogContext(): LogContext {
  return global.ocpContextStorage?.getStore()?.ocpRuntime?.logContext || context;
}

let level: LogLevel;

/**
 * @hidden
 * Set the current LogLevel
 * @param logLevel to set
 */
export function setLogLevel(logLevel: LogLevel) {
  level = logLevel;
}

function getLogLevel(): LogLevel {
  return global.ocpContextStorage?.getStore()?.ocpRuntime?.logLevel || level;
}

/**
 * OCP Logger interface
 */
export interface ILogger {
  /**
   * Write something to the logs at the Debug level
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other values are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  debug(...args: any[]): void;

  /**
   * Write something to the logs at the Debug level
   * @param visibility log visibility level (to override the default visibility)
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other values are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  debug(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Info level
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  info(...args: any[]): void;

  /**
   * Write something to the logs at the Info level
   * @param visibility log visibility level (to override the default visibility)
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other values are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  info(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Warning level
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other values are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  warn(...args: any[]): void;

  /**
   * Write something to the logs at the Warning level
   * @param visibility log visibility level (to override the default visibility)
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other values are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  warn(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Error level
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other values are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  error(...args: any[]): void;

  /**
   * Write something to the logs at the Error level
   * @param visibility log visibility level (to override the default visibility)
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other values are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  error(visibility: LogVisibility, ...args: any[]): void;
}

export const DEFAULT_LOG_LEVEL = LOG_LEVELS_BY_STRING[process.env.LOG_LEVEL || 'debug'] || LogLevel.Debug;
const DEFAULT_VISIBILITY = LogVisibility.Developer;
const MAX_LINE_LENGTH = parseInt(process.env.LOG_MAX_MESSAGE_LENGTH || '4096', 10);

/**
 * @hidden
 * Internal Logger implementation. Use the instance provided by the App SDK exports instead.
 */
export class Logger implements ILogger {
  private maxLineLength: number;
  private defaultVisibility: LogVisibility;

  public constructor(options: Partial<LoggerOptions> = {}) {
    this.maxLineLength = Math.min(options.maxLineLength || MAX_LINE_LENGTH, MAX_LINE_LENGTH);
    this.defaultVisibility = options.defaultVisibility || DEFAULT_VISIBILITY;
  }

  private getLogLevel(): LogLevel {
    return getLogLevel() || DEFAULT_LOG_LEVEL;
  }

  public debug(...args: any[]) {
    if (this.getLogLevel() <= LogLevel.Debug) {
      if (typeof args[0] === 'string' && visibilityValues.has(args[0] as LogVisibility)) {
        this.log(LogLevel.Debug, args[0] as LogVisibility, ...args.slice(1));
      } else {
        this.log(LogLevel.Debug, this.defaultVisibility, ...args);
      }
    }
  }

  public info(...args: any[]) {
    if (this.getLogLevel() <= LogLevel.Info) {
      if (typeof args[0] === 'string' && visibilityValues.has(args[0] as LogVisibility)) {
        this.log(LogLevel.Info, args[0] as LogVisibility, ...args.slice(1));
      } else {
        this.log(LogLevel.Info, this.defaultVisibility, ...args);
      }
    }
  }

  public warn(...args: any[]) {
    if (this.getLogLevel() <= LogLevel.Warn) {
      if (typeof args[0] === 'string' && visibilityValues.has(args[0] as LogVisibility)) {
        this.log(LogLevel.Warn, args[0] as LogVisibility, ...args.slice(1));
      } else {
        this.log(LogLevel.Warn, this.defaultVisibility, ...args);
      }
    }
  }

  public error(...args: any[]) {
    if (this.getLogLevel() <= LogLevel.Error) {
      if (typeof args[0] === 'string' && visibilityValues.has(args[0] as LogVisibility)) {
        this.log(LogLevel.Error, args[0] as LogVisibility, ...args.slice(1));
      } else {
        this.log(LogLevel.Error, this.defaultVisibility, ...args);
      }
    }
  }

  private log(logLevel: LogLevel, visibility: LogVisibility, ...args: any[]) {
    const time = new Date().toISOString();

    let stacktrace: string | undefined;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'object') {
        if (arg instanceof Error) {
          if (!stacktrace) {
            stacktrace = arg.stack;
            args[i] = `${arg.name}: ${arg.message}`;
            continue;
          }
        }
        args[i] = util.inspect(arg, INSPECT_OPTIONS);
      }
    }

    (logLevel === LogLevel.Error ? process.stderr : process.stdout).write(
      JSON.stringify({
        time,
        level: LOG_LEVELS[logLevel],
        message: this.truncateMessage(args.join(' ')),
        stacktrace,
        audience: visibility,
        context: getLogContext()
      } as LogMessage) + '\n'
    );
  }

  private truncateMessage(message: string): string {
    if (message.length <= this.maxLineLength) {
      return message;
    }
    return message.slice(0, this.maxLineLength - 3) + '...';
  }
}

/**
 * Logger instance to be used by OCP apps.
 * Minimum log level can be configured by using `ocp app set-log-level` command, e.g.:
 *  `ocp app set-log-level my_app@1.0.0 error`
 *  `ocp app set-log-level my_app@1.0.0 info`
 * To get the current log level of an app, use the command `ocp app get-log-level` command, e.g.:
 *  `ocp app get-log-level my_app@1.0.0 --trackerId=1234`
 * Accepted levels include debug, info, warn, error
 */
export const logger: ILogger = new Logger();
