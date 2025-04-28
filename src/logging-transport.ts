// logging-transport.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from './logger.js';

export class LoggingStdioServerTransport extends StdioServerTransport {
  private logger: Logger;
  private readonly MAX_LOG_LENGTH = 200; // Consistent max length for truncation

  constructor(logger: Logger) {
    super();
    this.logger = logger;

    // Override _ondata and _onerror by wrapping the original methods
    const originalOnData = this._ondata;
    this._ondata = (chunk: Buffer) => {
      this.logger.debug('Received data chunk', {
        size: chunk.length,
        contentPreview: chunk.toString('utf-8', 0, 50) + '...',
      });
      try {
        originalOnData.call(this, chunk);
      } catch (error) {
        this.logger.error('Error processing received data chunk', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Decide if we need to call the original error handler or re-throw
        this._onerror(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const originalOnError = this._onerror;
    this._onerror = (error: Error) => {
      this.logger.error('Transport stream error', { error: error.message, stack: error.stack });
      originalOnError.call(this, error);
    };
  }

  async start(): Promise<void> {
    this.logger.info('Starting stdio transport');
    return super.start();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.logger.debug('Outgoing message', this.sanitizeMessage(message));
    return super.send(message);
  }

  async close(): Promise<void> {
    this.logger.info('Closing stdio transport');
    return super.close();
  }

  // Sanitize message for logging (truncate large content)
  private sanitizeMessage(message: JSONRPCMessage): Record<string, unknown> {
    // Create a deep copy to avoid modifying the original message
    const sanitized = JSON.parse(JSON.stringify(message));

    // Sanitize request parameters
    if ('method' in sanitized && sanitized.method === 'tools/call') {
      const request = sanitized as JSONRPCRequest; // Type assertion

      // Add proper type guards before accessing 'thought'
      if (
        request.params?.arguments &&
        typeof request.params.arguments === 'object' &&
        request.params.arguments !== null &&
        'thought' in request.params.arguments &&
        typeof request.params.arguments.thought === 'string'
      ) {
        if (request.params.arguments.thought.length > this.MAX_LOG_LENGTH) {
          request.params.arguments.thought =
            request.params.arguments.thought.substring(0, this.MAX_LOG_LENGTH) + '... [truncated]';
        }
      }
      // Potentially sanitize other large arguments if needed
    }

    // Sanitize response results
    if ('result' in sanitized && sanitized.result?.content) {
      const response = sanitized as JSONRPCResponse; // Type assertion
      if (Array.isArray(response.result.content)) {
        for (const item of response.result.content) {
          if (
            item.type === 'text' &&
            typeof item.text === 'string' &&
            item.text.length > this.MAX_LOG_LENGTH
          ) {
            item.text = item.text.substring(0, this.MAX_LOG_LENGTH) + '... [truncated]';
          }
        }
      }
    }

    // Sanitize error details if necessary
    if ('error' in sanitized && sanitized.error?.data) {
      // Example: Truncate large error data fields if they exist
      // if (sanitized.error.data.someLargeField && sanitized.error.data.someLargeField.length > this.MAX_LOG_LENGTH) { ... }
    }

    return sanitized;
  }
}
