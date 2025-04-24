// logging-transport.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from './logger.js';

export class LoggingStdioServerTransport extends StdioServerTransport {
  private logger: Logger;
  
  constructor(logger: Logger) {
    super();
    this.logger = logger;
    
    // Override _ondata and _onerror by wrapping the original methods
    const originalOnData = this._ondata;
    this._ondata = (chunk: Buffer) => {
      this.logger.debug('Received data chunk', { size: chunk.length });
      originalOnData.call(this, chunk);
    };
    
    const originalOnError = this._onerror;
    this._onerror = (error: Error) => {
      this.logger.error('Transport error', { error: error.message });
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
    // Create a deep copy
    const sanitized = JSON.parse(JSON.stringify(message));
    
    // For requests with large content
    if (sanitized.method === 'tools/call' && 
        sanitized.params?.arguments?.thought &&
        sanitized.params.arguments.thought.length > 200) {
      sanitized.params.arguments.thought = 
        sanitized.params.arguments.thought.substring(0, 200) + '... [truncated]';
    }
    
    // For responses with large content
    if (sanitized.result?.content) {
      const content = sanitized.result.content;
      for (let i = 0; i < content.length; i++) {
        if (content[i].type === 'text' && content[i].text.length > 200) {
          content[i].text = content[i].text.substring(0, 200) + '... [truncated]';
        }
      }
    }
    
    return sanitized;
  }
}