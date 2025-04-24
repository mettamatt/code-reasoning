# Code-Reasoning MCP Server Configuration

This document provides detailed information about all configuration options available for the Code-Reasoning MCP Server. It covers command-line options, environment variables, configuration file formats, and customization options for various components.

## Table of Contents

- [Command-Line Options](#command-line-options)
- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
  - [Claude Desktop Integration](#claude-desktop-integration)
  - [VS Code Integration](#vs-code-integration)
- [Component Configuration](#component-configuration)
  - [Logger Configuration](#logger-configuration)
  - [Visualization Dashboard Configuration](#visualization-dashboard-configuration)
  - [Testing Configuration](#testing-configuration)
- [Advanced Configuration](#advanced-configuration)
  - [Custom CSS for Dashboard](#custom-css-for-dashboard)
  - [Custom Scripts for Dashboard](#custom-scripts-for-dashboard)
  - [Performance Tuning](#performance-tuning)

## Command-Line Options

The Code-Reasoning MCP Server supports the following command-line options:

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--debug` | Enable debug logging with more verbose output | `false` | `code-reasoning --debug` |
| `--visualize` | Start the visualization dashboard | `false` | `code-reasoning --visualize` |
| `--port=PORT` | Set the port for the visualization dashboard | `3000` | `code-reasoning --visualize --port=8080` |
| `--help`, `-h` | Show help information | - | `code-reasoning --help` |

### Usage Examples

Basic usage:
```bash
code-reasoning
```

Debug mode:
```bash
code-reasoning --debug
```

Visualization dashboard:
```bash
code-reasoning --visualize
```

Custom port for dashboard:
```bash
code-reasoning --visualize --port=8080
```

Debug mode with visualization dashboard:
```bash
code-reasoning --debug --visualize
```

Help information:
```bash
code-reasoning --help
```

## Environment Variables

The Code-Reasoning MCP Server supports the following environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CODE_REASONING_DEBUG` | Enable debug logging | `false` | `CODE_REASONING_DEBUG=true code-reasoning` |
| `CODE_REASONING_VISUALIZE` | Enable visualization dashboard | `false` | `CODE_REASONING_VISUALIZE=true code-reasoning` |
| `CODE_REASONING_PORT` | Set port for visualization dashboard | `3000` | `CODE_REASONING_PORT=8080 code-reasoning` |
| `CODE_REASONING_LOG_DIR` | Set custom log directory | `~/.code-reasoning/logs` | `CODE_REASONING_LOG_DIR=/var/log/code-reasoning code-reasoning` |
| `CODE_REASONING_MAX_LOG_FILES` | Maximum number of log files to keep | `10` | `CODE_REASONING_MAX_LOG_FILES=20 code-reasoning` |

### Priority Order

Configuration is applied in the following priority order (highest to lowest):

1. Command-line options
2. Environment variables
3. Default values

For example, if both `--debug` and `CODE_REASONING_DEBUG=false` are set, the command-line option takes precedence, and debug mode will be enabled.

## Configuration Files

### Claude Desktop Integration

Claude Desktop uses a configuration file to manage MCP server settings. This file is located at:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

#### Configuration Format

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": ["--debug", "--visualize", "--port=8080"]
    }
  }
}
```

#### Available Options

| Option | Description | Type | Required |
|--------|-------------|------|----------|
| `command` | The command to run the MCP server | String | Yes |
| `args` | Command-line arguments to pass to the server | Array of strings | No |

### VS Code Integration

VS Code integration can be configured in two ways:

1. User Settings (applies to all workspaces):
   - Open VS Code settings: `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type `Preferences: Open Settings (JSON)`
   - Add MCP configuration

2. Workspace Settings (applies to current workspace only):
   - Create a `.vscode/mcp.json` file in your workspace

#### Configuration Format (User Settings)

```json
{
  "mcp": {
    "servers": {
      "sequential-thinking": {
        "command": "code-reasoning",
        "args": ["--debug", "--visualize"]
      }
    }
  }
}
```

#### Configuration Format (Workspace Settings)

```json
{
  "servers": {
    "sequential-thinking": {
      "command": "code-reasoning",
      "args": ["--debug", "--visualize"]
    }
  }
}
```

#### Available Options

| Option | Description | Type | Required |
|--------|-------------|------|----------|
| `command` | The command to run the MCP server | String | Yes |
| `args` | Command-line arguments to pass to the server | Array of strings | No |

## Component Configuration

### Logger Configuration

The Logger component can be configured using environment variables or by modifying the `src/logger.ts` file.

#### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CODE_REASONING_LOG_DIR` | Custom log directory | `~/.code-reasoning/logs` | `CODE_REASONING_LOG_DIR=/var/log/code-reasoning` |
| `CODE_REASONING_MAX_LOG_FILES` | Maximum log files to keep | `10` | `CODE_REASONING_MAX_LOG_FILES=20` |

#### Modifying Logger Behavior

To modify the Logger's behavior, you can edit the `src/logger.ts` file:

```typescript
// Example: Change default log level and log rotation settings
export class Logger {
  private logStream: fs.WriteStream | null = null;
  private logLevel: LogLevel;
  
  // Change default log level from INFO to DEBUG
  constructor(level: LogLevel = LogLevel.DEBUG, logToFile: boolean = true) {
    this.logLevel = level;
    
    if (logToFile) {
      this.setupLogFile();
    }
  }
  
  private rotateLogFiles(logDir: string) {
    try {
      // Change maximum log files from 10 to 20
      const MAX_LOG_FILES = 20;
      // ...rest of the method remains the same
    } catch (err) {
      console.error(`Error during log rotation: ${err}`);
    }
  }
  
  // ...rest of the class remains the same
}
```

### Visualization Dashboard Configuration

The Visualization Dashboard can be configured using command-line options or by modifying the `src/visualizer.ts` file.

#### Command-Line Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--visualize` | Enable visualization dashboard | `false` | `code-reasoning --visualize` |
| `--port=PORT` | Set dashboard port | `3000` | `code-reasoning --visualize --port=8080` |

#### Customizing Dashboard Files

The dashboard HTML, CSS, and JavaScript files are generated automatically if they don't exist. You can customize them by modifying the files in the `public` directory:

- `public/dashboard.html`: Main dashboard HTML
- `public/styles.css`: Dashboard CSS
- `public/script.js`: Dashboard JavaScript

### Testing Configuration

The testing framework can be configured using command-line options when running tests.

#### Test Command-Line Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--verbose`, `-v` | Show detailed output for each test | `false` | `npm run test -- --verbose` |
| `--save-results`, `-s` | Save test results to JSON file | `false` | `npm run test -- --save-results` |
| `--visualize` | Start server with visualization | `false` | `npm run test -- --visualize` |
| `--debug` | Start server in debug mode | `false` | `npm run test -- --debug` |
| `--timeout=MILLISECONDS` | Set test timeout | `30000` | `npm run test -- --timeout=60000` |

#### Specific Test Scenarios

| Scenario | Description | Example |
|----------|-------------|---------|
| `all` | Run all test scenarios | `npm run test` |
| `basic` | Run basic thought flow tests | `npm run test:basic` |
| `branch` | Run thought branching tests | `npm run test:branch` |
| `revision` | Run thought revision tests | `npm run test:revision` |
| `error` | Run error handling tests | `npm run test:error` |
| `perf` | Run performance tests | `npm run test:perf` |

#### Combined Examples

Run basic tests with verbose output:
```bash
npm run test:basic -- --verbose
```

Run performance tests with a longer timeout:
```bash
npm run test:perf -- --timeout=60000
```

Run all tests with visualization and save results:
```bash
npm run test -- --visualize --save-results
```

## Advanced Configuration

### Custom CSS for Dashboard

You can customize the appearance of the visualization dashboard by editing the `public/styles.css` file. Here's an example of custom styles:

```css
/* Example custom styles for the dashboard */

/* Change the main background color */
body {
  background-color: #f0f5ff;
}

/* Customize the header */
header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  border-radius: 8px;
}

/* Style the thought cards */
.thought-card {
  border-left: 5px solid #3498db;
  background-color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  transition: transform 0.2s;
}

/* Add hover effect to thought cards */
.thought-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

/* Style branch indicators */
.branch-indicator {
  background-color: #27ae60;
  color: white;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.8rem;
}

/* Style revision indicators */
.revision-indicator {
  background-color: #e74c3c;
  color: white;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.8rem;
}
```

### Custom Scripts for Dashboard

You can enhance the visualization dashboard functionality by editing the `public/script.js` file. Here's an example of adding custom features:

```javascript
// Example custom functionality for the dashboard

// Add keyboard shortcuts
document.addEventListener('keydown', (event) => {
  if (event.key === 'n') {
    // Navigate to next thought
    showNextThought();
  } else if (event.key === 'p') {
    // Navigate to previous thought
    showPreviousThought();
  } else if (event.key === 'f') {
    // Toggle fullscreen mode
    toggleFullscreen();
  }
});

// Add fullscreen toggle functionality
function toggleFullscreen() {
  const dashboard = document.getElementById('dashboard');
  
  if (!document.fullscreenElement) {
    dashboard.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

// Add thought navigation functions
let currentThoughtIndex = 0;

function showNextThought() {
  if (currentThoughtIndex < thoughtsData.length - 1) {
    currentThoughtIndex++;
    selectThought(thoughtsData[currentThoughtIndex].thought_number);
  }
}

function showPreviousThought() {
  if (currentThoughtIndex > 0) {
    currentThoughtIndex--;
    selectThought(thoughtsData[currentThoughtIndex].thought_number);
  }
}

// Add export functionality
document.getElementById('export-btn').addEventListener('click', () => {
  const data = {
    thoughts: thoughtsData,
    branches: branchesData,
    stats: statsData,
    timestamp: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `thought-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
```

### Performance Tuning

For improved performance in high-load scenarios, you can modify the following settings:

#### WebSocket Behavior

Edit `src/visualizer.ts` to customize WebSocket behavior:

```typescript
// Example modifications for WebSocket performance tuning

private setupWebSocket() {
  // Increase heartbeat interval (default is often 30 seconds)
  this.wss = new WebSocket.Server({ 
    server: this.server,
    // Add WebSocket server options
    clientTracking: true,
    perMessageDeflate: true,
    maxPayload: 5 * 1024 * 1024, // 5MB max message size
    pingInterval: 60000, // 1 minute ping interval
    pingTimeout: 30000 // 30 second ping timeout
  });
  
  // Add ping/pong for keeping connections alive
  const interval = setInterval(() => {
    this.wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        return ws.terminate();
      }
      
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 60000);
  
  this.wss.on('connection', (ws) => {
    (ws as any).isAlive = true;
    
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });
    
    // Rest of connection handler...
  });
  
  this.wss.on('close', () => {
    clearInterval(interval);
  });
}
```

#### Throttling Updates

For high-throughput scenarios, you can add throttling to reduce the frequency of updates:

```typescript
// Example throttling for high-throughput scenarios

// Add this property to ThoughtVisualizer class
private lastBroadcastTime: number = 0;
private updateQueue: ThoughtData[] = [];
private broadcastThrottleMs: number = 100; // Minimum ms between broadcasts

public updateThought(thought: ThoughtData): void {
  // Add to history and branches as before
  this.thoughtHistory.push(thought);
  
  if (thought.branch_from_thought && thought.branch_id) {
    if (!this.branches[thought.branch_id]) {
      this.branches[thought.branch_id] = [];
    }
    this.branches[thought.branch_id].push(thought);
  }
  
  // Add to update queue instead of broadcasting immediately
  this.updateQueue.push(thought);
  
  // Check if we should broadcast now or wait
  const now = Date.now();
  if (now - this.lastBroadcastTime >= this.broadcastThrottleMs) {
    this.broadcastUpdates();
  } else if (this.updateQueue.length === 1) {
    // Schedule broadcast
    setTimeout(() => this.broadcastUpdates(), 
      this.broadcastThrottleMs - (now - this.lastBroadcastTime));
  }
}

private broadcastUpdates(): void {
  if (this.updateQueue.length === 0) return;
  
  // Broadcast all accumulated updates
  this.broadcast({
    type: 'update',
    data: {
      thoughts: this.thoughtHistory,
      branches: this.branches,
      recentUpdates: [...this.updateQueue],
      stats: this.getStats()
    }
  });
  
  // Reset queue and update timestamp
  this.updateQueue = [];
  this.lastBroadcastTime = Date.now();
}
```