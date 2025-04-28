// logger.ts
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

export enum LogLevel {
  ERROR = 0,
  WARN = 1, // Added WARN level for operational warnings
  INFO = 2,
  DEBUG = 3,
}

// Map string log levels to enum values
const LogLevelMap: { [key: string]: LogLevel } = {
  ERROR: LogLevel.ERROR,
  WARN: LogLevel.WARN,
  INFO: LogLevel.INFO,
  DEBUG: LogLevel.DEBUG,
};

export function parseLogLevel(levelStr: string | undefined, defaultLevel: LogLevel): LogLevel {
  if (!levelStr) return defaultLevel;
  const upperLevelStr = levelStr.toUpperCase();
  return LogLevelMap[upperLevelStr] ?? defaultLevel;
}

export class Logger {
  private logStream: fs.WriteStream | null = null;
  private logLevel: LogLevel;
  private colorOutput: boolean;

  constructor(
    level: LogLevel = LogLevel.INFO,
    logToFile: boolean = true,
    colorOutput: boolean = true
  ) {
    this.logLevel = level;
    this.colorOutput = colorOutput;

    // Apply color setting globally for chalk
    chalk.level = this.colorOutput ? chalk.level : 0;

    if (logToFile) {
      this.setupLogFile();
    }
  }

  private setupLogFile() {
    // Determine project root directory based on module location
    const projectRoot = this.getProjectRoot();
    const logDir = path.join(projectRoot, 'logs');

    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Rotate old logs
      this.rotateLogFiles(logDir);

      // Create new log with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join(logDir, `mcp-server-${timestamp}.log`);
      this.logStream = fs.createWriteStream(logPath, { flags: 'a' });

      // Create latest.log symlink
      const latestPath = path.join(logDir, 'latest.log');
      try {
        if (fs.existsSync(latestPath)) {
          fs.unlinkSync(latestPath);
        }
        // Use relative path for symlink for portability
        fs.symlinkSync(path.basename(logPath), latestPath, 'file');
      } catch (err) {
        console.error(`Failed to create symlink to latest log: ${err}`);
      }

      this.info('Logger initialized', {
        timestamp,
        level: LogLevel[this.logLevel],
        logDir,
        colorOutput: this.colorOutput,
      });
    } catch (err) {
      console.error(`Failed to setup log directory: ${err}`);
      // Fallback to temp directory if project directory is not writable
      this.setupFallbackLogDirectory();
    }
  }

  private getProjectRoot(): string {
    try {
      // First try to find package.json to determine project root
      const moduleDir = path.dirname(new URL(import.meta.url).pathname);
      let currentDir = moduleDir;

      // Walk up the directory tree looking for package.json
      while (currentDir !== path.parse(currentDir).root) {
        if (fs.existsSync(path.join(currentDir, 'package.json'))) {
          return currentDir;
        }
        currentDir = path.dirname(currentDir);
      }

      // Fallback to current working directory if package.json not found
      return process.cwd();
    } catch (err) {
      console.error(`Error determining project root: ${err}`);
      return process.cwd();
    }
  }

  private setupFallbackLogDirectory() {
    // Use system temp directory as fallback
    const tempDir = path.join(os.tmpdir(), 'code-reasoning-logs');
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Rotate old logs
      this.rotateLogFiles(tempDir);

      // Create new log with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join(tempDir, `mcp-server-${timestamp}.log`);
      this.logStream = fs.createWriteStream(logPath, { flags: 'a' });

      // Create latest.log symlink
      const latestPath = path.join(tempDir, 'latest.log');
      try {
        if (fs.existsSync(latestPath)) {
          fs.unlinkSync(latestPath);
        }
        // Use relative path for symlink for portability
        fs.symlinkSync(path.basename(logPath), latestPath, 'file');
      } catch (err) {
        console.error(`Failed to create symlink to latest log: ${err}`);
      }

      this.warn('Logger initialized with fallback directory', {
        // Use WARN for fallback
        timestamp,
        level: LogLevel[this.logLevel],
        fallbackDir: tempDir,
        colorOutput: this.colorOutput,
      });
    } catch (err) {
      console.error(`Failed to setup fallback log directory: ${err}`);
      // If even the fallback fails, operate without file logging
      this.error('Operating without file logging due to setup errors', {
        level: LogLevel[this.logLevel],
      });
    }
  }

  private rotateLogFiles(logDir: string) {
    try {
      const MAX_LOG_FILES = 10;
      const files = fs
        .readdirSync(logDir)
        .filter(file => file.startsWith('mcp-server-') && file.endsWith('.log'))
        .map(file => ({
          name: path.join(logDir, file),
          time: fs.statSync(path.join(logDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time); // Sort descending by modification time

      // Delete oldest logs if we have too many
      if (files.length >= MAX_LOG_FILES) {
        files.slice(MAX_LOG_FILES - 1).forEach(file => {
          try {
            fs.unlinkSync(file.name);
            this.debug(`Deleted old log file: ${path.basename(file.name)}`);
          } catch (err) {
            console.error(`Failed to delete old log file ${file.name}: ${err}`);
          }
        });
      }
    } catch (err) {
      console.error(`Error during log rotation: ${err}`);
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.log('DEBUG', message, data, chalk.cyan);
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    if (this.logLevel >= LogLevel.INFO) {
      this.log('INFO', message, data, chalk.blue);
    }
  }

  warn(message: string, data?: Record<string, unknown>) {
    if (this.logLevel >= LogLevel.WARN) {
      this.log('WARN', message, data, chalk.yellow);
    }
  }

  error(message: string, data?: Record<string, unknown>) {
    // Errors are always logged regardless of level
    this.log('ERROR', message, data, chalk.red);
  }

  private log(
    level: string,
    message: string,
    data?: Record<string, unknown>,
    colorFn: (s: string) => string = (s: string) => s
  ) {
    const timestamp = new Date().toISOString();
    // Ensure data is serializable, handle potential circular references safely
    let dataString = '';
    if (data) {
      try {
        dataString = '\n' + JSON.stringify(data, null, 2);
      } catch (e) {
        dataString = '\n<Data serialization error>';
        console.error(`Failed to serialize log data for message: ${message}`, e);
      }
    }

    const logEntry = `[${timestamp}] ${level}: ${message}${dataString}`;

    // Log to console (stderr is conventional for logs)
    // Apply color only if colorOutput is enabled
    console.error(this.colorOutput ? colorFn(logEntry) : logEntry);

    // Log to file (without color codes)
    if (this.logStream) {
      this.logStream.write(logEntry + '\n');
    }
  }

  close() {
    if (this.logStream) {
      this.logStream.end(() => {
        this.logStream = null;
      });
    }
  }
}
