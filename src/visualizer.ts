// visualizer.ts
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { Logger } from './logger.js';

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
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};
  private logger: Logger;

  constructor(private port: number = 3000, logger: Logger) {
    this.logger = logger;
    
    // Set up Express server
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    // Create dashboard HTML if needed
    this.setupStaticFiles();
    
    // Configure routes and WebSocket
    this.setupRoutes();
    this.setupWebSocket();
    
    this.logger.info('ThoughtVisualizer initialized', { port });
  }

  private setupStaticFiles() {
    // Create public directory if needed
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      this.logger.info('Created public directory', { path: publicDir });
    }
    
    // Create dashboard.html if needed
    const dashboardPath = path.join(publicDir, 'dashboard.html');
    if (!fs.existsSync(dashboardPath)) {
      this.logger.info('Creating dashboard.html file');
      this.createDashboardHtml(dashboardPath);
    }
    
    // Create styles.css if needed
    const stylesPath = path.join(publicDir, 'styles.css');
    if (!fs.existsSync(stylesPath)) {
      this.logger.info('Creating styles.css file');
      this.createStylesCss(stylesPath);
    }
    
    // Create script.js if needed
    const scriptPath = path.join(publicDir, 'script.js');
    if (!fs.existsSync(scriptPath)) {
      this.logger.info('Creating script.js file');
      this.createScriptJs(scriptPath);
    }
  }

  private createDashboardHtml(filePath: string) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sequential Thinking Dashboard</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Code Reasoning MCP Server - Sequential Thinking Dashboard</h1>
        <div class="stats-container">
            <div class="stat">
                <div class="stat-value" id="total-thoughts">0</div>
                <div class="stat-label">Total Thoughts</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="branch-count">0</div>
                <div class="stat-label">Branches</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="revision-count">0</div>
                <div class="stat-label">Revisions</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="completed-chains">0</div>
                <div class="stat-label">Completed Chains</div>
            </div>
        </div>
    </header>

    <main>
        <div class="container">
            <div class="panel">
                <h2>Thought History</h2>
                <div class="thought-list" id="thought-list"></div>
            </div>
            <div class="panel">
                <h2>Thought Graph</h2>
                <div class="graph-container" id="thought-graph"></div>
            </div>
        </div>
        <div class="container">
            <div class="panel full-width">
                <h2>Thought Details</h2>
                <div class="thought-detail" id="thought-detail">
                    <div class="placeholder">Select a thought to view details</div>
                </div>
            </div>
        </div>
    </main>

    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="script.js"></script>
</body>
</html>`;
    
    fs.writeFileSync(filePath, html);
  }

  private createStylesCss(filePath: string) {
    const css = `/* Base styles */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f5f5;
}

header {
    background-color: #2c3e50;
    color: white;
    padding: 1rem;
    text-align: center;
}

h1 {
    margin-bottom: 1rem;
}

.stats-container {
    display: flex;
    justify-content: space-around;
    background-color: #34495e;
    border-radius: 5px;
    padding: 1rem;
    margin-top: 1rem;
}

.stat {
    text-align: center;
}

.stat-value {
    font-size: 2rem;
    font-weight: bold;
}

.stat-label {
    font-size: 0.9rem;
    opacity: 0.8;
}

main {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
}

.container {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.panel {
    background-color: white;
    border-radius: 5px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    flex: 1;
}

.full-width {
    flex-basis: 100%;
}

h2 {
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
}

/* Thought list styles */
.thought-list {
    max-height: 400px;
    overflow-y: auto;
}

.thought-item {
    padding: 0.75rem;
    border-left: 3px solid #3498db;
    margin-bottom: 0.5rem;
    background-color: #f9f9f9;
    cursor: pointer;
    border-radius: 3px;
    transition: background-color 0.2s;
}

.thought-item:hover {
    background-color: #ecf0f1;
}

.thought-item.selected {
    background-color: #e8f4fd;
    border-left-color: #2980b9;
}

.thought-item.revision {
    border-left-color: #f39c12;
}

.thought-item.branch {
    border-left-color: #2ecc71;
}

.thought-item-header {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    margin-bottom: 0.25rem;
}

.thought-item-content {
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Graph styles */
.graph-container {
    height: 400px;
    border: 1px solid #eee;
    border-radius: 3px;
    background-color: #fafafa;
}

/* Thought detail styles */
.thought-detail {
    padding: 1rem;
    border: 1px solid #eee;
    border-radius: 3px;
}

.thought-detail .placeholder {
    color: #999;
    font-style: italic;
    text-align: center;
}

.thought-detail-header {
    margin-bottom: 1rem;
}

.thought-detail-header h3 {
    margin-bottom: 0.5rem;
}

.thought-detail-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: #666;
}

.thought-detail-content {
    background-color: #f9f9f9;
    padding: 1rem;
    border-radius: 3px;
    white-space: pre-wrap;
}

/* Node styling for the graph */
.node circle {
    fill: #3498db;
    stroke: #2980b9;
    stroke-width: 1.5px;
}

.node.revision circle {
    fill: #f39c12;
    stroke: #e67e22;
}

.node.branch circle {
    fill: #2ecc71;
    stroke: #27ae60;
}

.node text {
    font-size: 12px;
}

.link {
    fill: none;
    stroke: #ccc;
    stroke-width: 1.5px;
}

/* WebSocket status indicator */
.websocket-status {
    position: fixed;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem;
    border-radius: 5px;
    color: white;
    font-size: 0.8rem;
}

.websocket-connected {
    background-color: #2ecc71;
}

.websocket-disconnected {
    background-color: #e74c3c;
}`;
    
    fs.writeFileSync(filePath, css);
  }

  private createScriptJs(filePath: string) {
    const js = `// Dashboard state
let thoughtHistory = [];
let branches = {};
let selectedThoughtId = null;
let graphData = null;

// Elements
const thoughtListElement = document.getElementById('thought-list');
const thoughtGraphElement = document.getElementById('thought-graph');
const thoughtDetailElement = document.getElementById('thought-detail');
const totalThoughtsElement = document.getElementById('total-thoughts');
const branchCountElement = document.getElementById('branch-count');
const revisionCountElement = document.getElementById('revision-count');
const completedChainsElement = document.getElementById('completed-chains');

// Add WebSocket connection status indicator
const body = document.body;
const wsStatusElement = document.createElement('div');
wsStatusElement.className = 'websocket-status websocket-disconnected';
wsStatusElement.textContent = 'Disconnected';
body.appendChild(wsStatusElement);

// Set up WebSocket connection
let ws = null;
setupWebSocket();

function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = \`\${protocol}//\${window.location.host}\`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = function() {
        console.log('WebSocket connected');
        wsStatusElement.className = 'websocket-status websocket-connected';
        wsStatusElement.textContent = 'Connected';
    };
    
    ws.onclose = function() {
        console.log('WebSocket disconnected');
        wsStatusElement.className = 'websocket-status websocket-disconnected';
        wsStatusElement.textContent = 'Disconnected';
        
        // Try to reconnect after 3 seconds
        setTimeout(setupWebSocket, 3000);
    };
    
    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
}

function handleWebSocketMessage(data) {
    if (data.type === 'init' || data.type === 'update') {
        // Update state
        thoughtHistory = data.data.thoughts;
        branches = data.data.branches;
        
        // Update UI
        updateThoughtList();
        updateThoughtGraph();
        updateStats(data.data.stats);
        
        // If this is a single thought update, highlight it
        if (data.data.thought) {
            const thoughtNumber = data.data.thought.thought_number;
            selectedThoughtId = thoughtNumber;
            updateThoughtDetail(data.data.thought);
        }
    }
}

function updateThoughtList() {
    // Clear current list
    thoughtListElement.innerHTML = '';
    
    // Add thoughts to the list
    thoughtHistory.forEach(thought => {
        const thoughtItem = document.createElement('div');
        thoughtItem.className = 'thought-item';
        
        // Add special classes for revision or branch
        if (thought.is_revision) {
            thoughtItem.classList.add('revision');
        } else if (thought.branch_from_thought) {
            thoughtItem.classList.add('branch');
        }
        
        // Mark selected thought
        if (selectedThoughtId === thought.thought_number) {
            thoughtItem.classList.add('selected');
        }
        
        // Create header (thought number and metadata)
        const header = document.createElement('div');
        header.className = 'thought-item-header';
        
        let labelText = \`Thought #\${thought.thought_number}\`;
        if (thought.is_revision) {
            labelText += \` (Revision of #\${thought.revises_thought})\`;
        } else if (thought.branch_from_thought) {
            labelText += \` (Branch from #\${thought.branch_from_thought}, ID: \${thought.branch_id})\`;
        }
        
        header.textContent = labelText;
        
        // Create content preview
        const content = document.createElement('div');
        content.className = 'thought-item-content';
        content.textContent = thought.thought;
        
        // Add to item
        thoughtItem.appendChild(header);
        thoughtItem.appendChild(content);
        
        // Add click handler
        thoughtItem.addEventListener('click', () => {
            selectedThoughtId = thought.thought_number;
            updateThoughtList(); // Refresh selection
            updateThoughtDetail(thought);
        });
        
        // Add to list
        thoughtListElement.appendChild(thoughtItem);
    });
    
    // Scroll to the bottom to show latest thoughts
    thoughtListElement.scrollTop = thoughtListElement.scrollHeight;
}

function updateThoughtDetail(thought) {
    if (!thought) {
        thoughtDetailElement.innerHTML = '<div class="placeholder">Select a thought to view details</div>';
        return;
    }
    
    // Create detail view
    thoughtDetailElement.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.className = 'thought-detail-header';
    
    const title = document.createElement('h3');
    let titleText = \`Thought #\${thought.thought_number} of \${thought.total_thoughts}\`;
    if (thought.is_revision) {
        titleText += \` (Revision of #\${thought.revises_thought})\`;
    } else if (thought.branch_from_thought) {
        titleText += \` (Branch from #\${thought.branch_from_thought}, ID: \${thought.branch_id})\`;
    }
    title.textContent = titleText;
    
    // Metadata
    const meta = document.createElement('div');
    meta.className = 'thought-detail-meta';
    
    const nextThought = document.createElement('div');
    nextThought.textContent = \`Next thought needed: \${thought.next_thought_needed ? 'Yes' : 'No'}\`;
    
    meta.appendChild(nextThought);
    
    if (thought.needs_more_thoughts !== undefined) {
        const needsMore = document.createElement('div');
        needsMore.textContent = \`Needs more thoughts: \${thought.needs_more_thoughts ? 'Yes' : 'No'}\`;
        meta.appendChild(needsMore);
    }
    
    header.appendChild(title);
    header.appendChild(meta);
    
    // Content
    const content = document.createElement('div');
    content.className = 'thought-detail-content';
    content.textContent = thought.thought;
    
    // Add to detail view
    thoughtDetailElement.appendChild(header);
    thoughtDetailElement.appendChild(content);
}

function updateStats(stats) {
    totalThoughtsElement.textContent = stats.totalThoughts;
    branchCountElement.textContent = stats.branchCount;
    revisionCountElement.textContent = stats.revisionCount;
    completedChainsElement.textContent = stats.completedChains;
}

function updateThoughtGraph() {
    if (!thoughtHistory.length) return;
    
    // Clear the graph container
    thoughtGraphElement.innerHTML = '';
    
    // Prepare graph data
    const nodes = [];
    const links = [];
    
    // Add all thoughts as nodes
    thoughtHistory.forEach(thought => {
        nodes.push({
            id: thought.thought_number,
            thought: thought
        });
        
        // Add links
        if (thought.is_revision && thought.revises_thought) {
            links.push({
                source: thought.revises_thought,
                target: thought.thought_number,
                type: 'revision'
            });
        } else if (thought.branch_from_thought) {
            links.push({
                source: thought.branch_from_thought,
                target: thought.thought_number,
                type: 'branch'
            });
        } else if (thought.thought_number > 1) {
            // Regular sequential link
            links.push({
                source: thought.thought_number - 1,
                target: thought.thought_number,
                type: 'sequential'
            });
        }
    });
    
    // Create D3 force graph
    const width = thoughtGraphElement.clientWidth;
    const height = thoughtGraphElement.clientHeight;
    
    const svg = d3.select('#thought-graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Add arrow markers for links
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('xoverflow', 'visible')
        .append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', '#999')
        .style('stroke', 'none');
    
    // Create link lines
    const link = svg.selectAll('.link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)')
        .style('stroke', d => {
            if (d.type === 'revision') return '#f39c12';
            if (d.type === 'branch') return '#2ecc71';
            return '#999';
        });
    
    // Create node groups
    const node = svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', d => {
            let cls = 'node';
            if (d.thought.is_revision) cls += ' revision';
            else if (d.thought.branch_from_thought) cls += ' branch';
            return cls;
        })
        .on('click', function(event, d) {
            selectedThoughtId = d.id;
            updateThoughtList();
            updateThoughtDetail(d.thought);
        });
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 10)
        .style('fill', d => {
            if (d.thought.is_revision) return '#f39c12';
            if (d.thought.branch_from_thought) return '#2ecc71';
            return '#3498db';
        });
    
    // Add labels to nodes
    node.append('text')
        .attr('dy', -15)
        .attr('text-anchor', 'middle')
        .text(d => d.id);
    
    // Set up simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .on('tick', ticked);
    
    // Update positions on each tick
    function ticked() {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('transform', d => \`translate(\${d.x},\${d.y})\`);
    }
}

// Initial API request for data
fetch('/api/thoughts')
    .then(response => response.json())
    .then(data => {
        thoughtHistory = data.thoughts;
        branches = data.branches;
        updateThoughtList();
        updateThoughtGraph();
        updateStats(data.stats);
    })
    .catch(error => {
        console.error('Error fetching thought data:', error);
    });`;
    
    fs.writeFileSync(filePath, js);
  }

  private setupRoutes() {
    // Serve static files from public directory
    this.app.use(express.static(path.join(process.cwd(), 'public')));
    
    // Dashboard
    this.app.get('/', (req, res) => {
      this.logger.debug('Serving dashboard page');
      res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
    });
    
    // API for thought data
    this.app.get('/api/thoughts', (req, res) => {
      this.logger.debug('Serving API request for thoughts data');
      res.json({
        thoughts: this.thoughtHistory,
        branches: this.branches,
        stats: this.getStats()
      });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      this.logger.info('WebSocket client connected');
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
        this.logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });
    });
  }

  public start(): void {
    this.server.listen(this.port, () => {
      this.logger.info(`Thought visualizer dashboard running at http://localhost:${this.port}`);
      console.error(chalk.green(`🔍 Thought visualizer dashboard running at http://localhost:${this.port}`));
    });
  }

  public updateThought(thought: ThoughtData): void {
    this.logger.debug('Updating thought in visualizer', { 
      thought_number: thought.thought_number,
      is_revision: thought.is_revision, 
      branch_from_thought: thought.branch_from_thought 
    });
    
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

  private broadcast(data: Record<string, unknown>) {
    const message = JSON.stringify(data);
    let clientCount = 0;
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        clientCount++;
      }
    });
    
    this.logger.debug('Broadcast thought update', { 
      clientCount,
      dataType: data.type
    });
  }
}