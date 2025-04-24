// logger.ts
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

export enum LogLevel {
  ERROR = 0,
  INFO = 1,
  DEBUG = 2
}

export class Logger {
  private logStream: fs.WriteStream | null = null;
  private logLevel: LogLevel;
  
  constructor(level: LogLevel = LogLevel.INFO, logToFile: boolean = true) {
    this.logLevel = level;
    
    if (logToFile) {
      this.setupLogFile();
    }
  }
  
  private setupLogFile() {
    const logDir = path.join(os.homedir(), '.code-reasoning', 'logs');
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
      fs.symlinkSync(logPath, latestPath);
    } catch (err) {
      console.error(`Failed to create symlink to latest log: ${err}`);
    }
    
    this.info('Logger initialized', { timestamp, level: LogLevel[this.logLevel] });
  }
  
  private rotateLogFiles(logDir: string) {
    try {
      const MAX_LOG_FILES = 10;
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith('mcp-server-') && file.endsWith('.log'))
        .map(file => path.join(logDir, file))
        .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
      
      // Delete oldest logs if we have too many
      if (files.length >= MAX_LOG_FILES) {
        files.slice(MAX_LOG_FILES - 1).forEach(file => {
          try {
            fs.unlinkSync(file);
          } catch (err) {
            console.error(`Failed to delete old log file ${file}: ${err}`);
          }
        });
      }
    } catch (err) {
      console.error(`Error during log rotation: ${err}`);
    }
  }
  
  debug(message: string, data?: any) {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.log('DEBUG', message, data, chalk.cyan);
    }
  }
  
  info(message: string, data?: any) {
    if (this.logLevel >= LogLevel.INFO) {
      this.log('INFO', message, data, chalk.blue);
    }
  }
  
  error(message: string, data?: any) {
    this.log('ERROR', message, data, chalk.red);
  }
  
  private log(level: string, message: string, data?: any, colorFn: Function = (s: string) => s) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
    
    // Log to console
    console.error(colorFn(logEntry));
    
    // Log to file
    if (this.logStream) {
      this.logStream.write(logEntry + '\n');
    }
  }
  
  close() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}