# Code-Reasoning MCP Server Debugging Implementation Plan

## Project Overview

This document outlines the plan to enhance the debugging capabilities of the code-reasoning Model Context Protocol (MCP) server. The goal is to create a comprehensive monitoring solution that allows us to observe and understand the interactions between Claude Desktop and the Sequential Thinking server for programming tasks.

## MCP Architecture Understanding

Based on our analysis of the MCP SDK, we understand that:

1. **MCP Client-Server Architecture**:
   - **Host** (Claude Desktop) initiates connections
   - **Client** (inside Claude Desktop) maintains connections with servers
   - **Server** (our code-reasoning fork) provides tools to clients

2. **Key Components**:
   - `Server` class: Manages protocol messaging and request handling
   - `StdioServerTransport`: Handles communication via stdin/stdout
   - Tool handlers: Process requests for specific tools (sequentialthinking)

3. **Protocol Flow**:
   - Client connects to server via stdio transport
   - Client sends initialize request with capabilities
   - Server responds with its capabilities
   - Client sends initialized notification
   - Client requests tool list
   - Server responds with available tools
   - Client invokes the sequentialthinking tool
   - Server processes thoughts and returns results

## Implementation Phases

### Phase 1: Enhanced Logging System ✅
Create a robust logging system that captures all communications between Claude Desktop and the server.

- [x] 1.1 Implement Logger class with file-based logging
- [x] 1.2 Add log rotation and levels (debug, info, error)
- [x] 1.3 Create LoggingStdioServerTransport to monitor messages
- [x] 1.4 Add protocol event logging (initialization, errors, closing)
- [x] 1.5 Add request handler instrumentation

### Phase 2: Thought Process Visualization ⬜
Create a real-time visualization dashboard for monitoring thought processes.

- [ ] 2.1 Implement ThoughtVisualizer class with WebSocket support
- [ ] 2.2 Create dashboard UI with thought history and branching display
- [ ] 2.3 Add real-time updates for thought processing
- [ ] 2.4 Implement statistics and metrics for thought patterns
- [ ] 2.5 Add visual graph representation of thought branches

### Phase 3: Testing Framework ⬜
Create a testing client that simulates Claude Desktop for verification.

- [ ] 3.1 Implement test client using MCP Client class
- [ ] 3.2 Create test scenarios for different thought patterns
- [ ] 3.3 Add tests for error conditions and edge cases
- [ ] 3.4 Implement automated test script
- [ ] 3.5 Add performance benchmarking

### Phase 4: Integration and Documentation ⬜
Integrate all components and provide comprehensive documentation.

- [ ] 4.1 Update main server with all debugging enhancements
- [ ] 4.2 Update build and launch scripts
- [ ] 4.3 Update README.md with debugging instructions
- [ ] 4.4 Create usage examples
- [ ] 4.5 Document configuration options

## Technical Specifications

### Logger Implementation

```typescript
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
```

### Logging Transport Implementation

```typescript
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
  private sanitizeMessage(message: JSONRPCMessage): any {
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
```

### Visualization Implementation

```typescript
// visualizer.ts
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// TypeScript interface for thought data
export interface ThoughtData {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean;
  next_thought_needed: boolean;
}

export class ThoughtVisualizer {
  private app: express.Express;
  private server: http.Server;
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};

  constructor(private port: number = 3000) {
    // Set up Express server
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    // Create dashboard HTML if needed
    this.setupStaticFiles();
    
    // Configure routes and WebSocket
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupStaticFiles() {
    // Create public directory if needed
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Create dashboard.html if needed
    const dashboardPath = path.join(publicDir, 'dashboard.html');
    if (!fs.existsSync(dashboardPath)) {
      // Write default dashboard HTML (implementation details omitted for brevity)
    }
  }

  private setupRoutes() {
    // Dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
    });
    
    // API for thought data
    this.app.get('/api/thoughts', (req, res) => {
      res.json({
        thoughts: this.thoughtHistory,
        branches: this.branches,
        stats: this.getStats()
      });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      
      // Send current state
      ws.send(JSON.stringify({
        type: 'init',
        data: {
          thoughts: this.thoughtHistory,
          branches: this.branches,
          stats: this.getStats()
        }
      }));
      
      // Remove from clients on disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  public start() {
    this.server.listen(this.port, () => {
      console.error(`Thought visualizer running at http://localhost:${this.port}`);
    });
  }

  public updateThought(thought: ThoughtData) {
    // Add to history
    this.thoughtHistory.push(thought);
    
    // Track branches
    if (thought.branch_from_thought && thought.branch_id) {
      if (!this.branches[thought.branch_id]) {
        this.branches[thought.branch_id] = [];
      }
      this.branches[thought.branch_id].push(thought);
    }
    
    // Broadcast to all WebSocket clients
    this.broadcast({
      type: 'update',
      data: {
        thought,
        thoughts: this.thoughtHistory,
        branches: this.branches,
        stats: this.getStats()
      }
    });
  }

  private getStats() {
    return {
      totalThoughts: this.thoughtHistory.length,
      branchCount: Object.keys(this.branches).length,
      revisionCount: this.thoughtHistory.filter(t => t.is_revision).length,
      completedChains: this.thoughtHistory.filter(t => t.next_thought_needed === false).length
    };
  }

  private broadcast(data: any) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}
```

### Test Client Implementation

```typescript
// test-client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import chalk from "chalk";

async function runTests() {
  console.log(chalk.blue('Starting Code Reasoning MCP client test'));
  
  // Create client
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  console.log(chalk.yellow('Connecting to server...'));
  
  // Connect to server using stdio
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js", "--debug", "--visualize"]
  });

  try {
    await client.connect(transport);
    console.log(chalk.green('✓ Connected to server'));

    // List available tools
    console.log(chalk.yellow('Listing available tools...'));
    const toolsResponse = await client.request(
      { method: "tools/list", params: {} },
      ListToolsRequestSchema
    );
    
    console.log(chalk.green('✓ Available tools:'));
    console.log(JSON.stringify(toolsResponse.tools, null, 2));

    // Define test scenarios
    const testScenarios = [
      {
        name: "Basic thought flow",
        thoughts: [
          // Basic thought sequence
        ]
      },
      {
        name: "Thought flow with branching",
        thoughts: [
          // Branching thought sequence
        ]
      },
      {
        name: "Thought flow with revision",
        thoughts: [
          // Revision thought sequence
        ]
      }
    ];

    // Run test scenarios
    for (const scenario of testScenarios) {
      console.log(chalk.blue(`\n=== Running test scenario: ${scenario.name} ===`));
      
      for (const thoughtData of scenario.thoughts) {
        console.log(chalk.yellow(`Sending thought #${thoughtData.thought_number}`));
        
        const response = await client.request(
          {
            method: "tools/call",
            params: {
              name: "sequentialthinking",
              arguments: thoughtData
            }
          },
          CallToolRequestSchema
        );
        
        console.log(chalk.green('✓ Response received:'));
        console.log(JSON.stringify(response, null, 2));
      }
    }

    // Test error cases
    console.log(chalk.blue('\n=== Testing error handling ==='));
    
    // Test missing required field
    // Test exceeding max thought number
    // Other error tests...

    console.log(chalk.green('\n✓ All tests completed'));
  } catch (error) {
    console.error(chalk.red('✗ Test failed with error:'), error);
  } finally {
    // Disconnect
    console.log(chalk.yellow('Disconnecting from server...'));
    await client.close();
    console.log(chalk.green('✓ Disconnected from server'));
  }
}

// Run the tests
runTests().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
```

### Updated Package.json Configuration

```json
{
  "name": "code-reasoning",
  "version": "0.2.0",
  "description": "Enhanced MCP server for sequential thinking focused on programming tasks with improved debugging",
  "license": "MIT",
  "type": "module",
  "bin": {
    "code-reasoning": "dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc && chmod +x dist/*.js",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "debug": "node dist/index.js --debug",
    "visualize": "node dist/index.js --debug --visualize",
    "test": "node dist/test-client.js",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "0.5.0",
    "chalk": "^5.3.0",
    "express": "^4.18.2",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22",
    "@types/ws": "^8.5.10",
    "typescript": "^5.3.3"
  }
}
```

## Testing Strategy

1. **Unit Testing**:
   - Test logger functionality
   - Test transport message handling
   - Test thought processing logic

2. **Integration Testing**:
   - Test end-to-end communication flow
   - Test thought branching and revision scenarios
   - Test error handling and recovery

3. **Performance Testing**:
   - Measure thought processing time
   - Test handling of large thought chains
   - Evaluate visualizer performance with many thoughts

4. **Manual Testing**:
   - Verify dashboard UI functionality
   - Test real-time updates
   - Check log file generation and rotation

## Progress Updates

This section will be updated as we complete each phase of implementation.

### Progress Summary
- Phase 1 (Logging): ✅ Completed (April 24, 2025)
- Phase 2 (Visualization): Not started
- Phase 3 (Testing): Not started
- Phase 4 (Integration): Partially completed (README.md updated)

### Completed Tasks
- Initial plan development
- Implemented Logger class with file-based logging and log rotation
- Created LoggingStdioServerTransport to monitor messages
- Added protocol event logging and request handler instrumentation
- Updated README.md with debugging instructions
- Updated package.json with new dependencies and scripts
- Created new src/ directory structure
- Fixed TypeScript errors in the implementation

### Current Focus
- Planning for Phase 2: Thought Process Visualization

### Next Steps
- Implement ThoughtVisualizer class with WebSocket support
- Create dashboard UI for thought history and branching display
- Add real-time updates for thought processing