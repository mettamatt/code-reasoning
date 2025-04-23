#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Fixed chalk import for ESM
import chalk from "chalk";
class SequentialThinkingServer {
    thoughtHistory = [];
    branches = {};
    validateThoughtData(input) {
        const data = input;
        if (!data.thought || typeof data.thought !== "string") {
            throw new Error("Invalid thought: must be a string");
        }
        if (!data.thought_number || typeof data.thought_number !== "number") {
            throw new Error("Invalid thought_number: must be a number");
        }
        if (!data.total_thoughts || typeof data.total_thoughts !== "number") {
            throw new Error("Invalid total_thoughts: must be a number");
        }
        if (typeof data.next_thought_needed !== "boolean") {
            throw new Error("Invalid next_thought_needed: must be a boolean");
        }
        return {
            thought: data.thought,
            thought_number: data.thought_number,
            total_thoughts: data.total_thoughts,
            next_thought_needed: data.next_thought_needed,
            is_revision: data.is_revision,
            revises_thought: data.revises_thought,
            branch_from_thought: data.branch_from_thought,
            branch_id: data.branch_id,
            needs_more_thoughts: data.needs_more_thoughts,
        };
    }
    formatThought(thoughtData) {
        const { thought_number, total_thoughts, thought, is_revision, revises_thought, branch_from_thought, branch_id, } = thoughtData;
        let prefix = "";
        let context = "";
        if (is_revision) {
            prefix = chalk.yellow("🔄 Revision");
            context = ` (revising thought ${revises_thought})`;
        }
        else if (branch_from_thought) {
            prefix = chalk.green("🌿 Branch");
            context = ` (from thought ${branch_from_thought}, ID: ${branch_id})`;
        }
        else {
            prefix = chalk.blue("💭 Thought");
        }
        const header = `${prefix} ${thought_number}/${total_thoughts}${context}`;
        const border = "─".repeat(Math.max(header.length, thought.length) + 4);
        return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
    }
    processThought(input) {
        try {
            const validatedInput = this.validateThoughtData(input);
            // Enforce the "abort with a summary if thought_number > 20" rule
            if (validatedInput.thought_number > 20) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "Max thought_number exceeded",
                                summary: "Aborting chain of thought after 20 steps",
                                status: "aborted",
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            // If actual thought_number exceeds total_thoughts, raise total_thoughts
            if (validatedInput.thought_number > validatedInput.total_thoughts) {
                validatedInput.total_thoughts = validatedInput.thought_number;
            }
            this.thoughtHistory.push(validatedInput);
            // If it's a branch, store it separately
            if (validatedInput.branch_from_thought &&
                validatedInput.branch_id) {
                if (!this.branches[validatedInput.branch_id]) {
                    this.branches[validatedInput.branch_id] = [];
                }
                this.branches[validatedInput.branch_id].push(validatedInput);
            }
            const formattedThought = this.formatThought(validatedInput);
            console.error(formattedThought);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            thought_number: validatedInput.thought_number,
                            total_thoughts: validatedInput.total_thoughts,
                            next_thought_needed: validatedInput.next_thought_needed,
                            branches: Object.keys(this.branches),
                            thought_history_length: this.thoughtHistory.length,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: error instanceof Error ? error.message : String(error),
                            status: "failed",
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
}
const SEQUENTIAL_THINKING_TOOL = {
    name: "sequentialthinking",
    description: `
🧠 **Sequential Thinking Tool**

Purpose → break complex problems into **self-auditing, exploratory** thought steps that can *branch*, *revise*, or *back-track* until a **single, well-supported answer** emerges.

---

## WHEN TO CALL
• Multi-step planning, design, debugging, or open-ended analysis  
• Whenever *further private reasoning* or *hypothesis testing* is required **before** replying to the user

---

## ENCOURAGED PRACTICES
🔍 **Question aggressively** – ask "What am I missing?" after each step  
🔄 **Revise freely** – mark \`is_revision=true\` even late in the chain  
🌿 **Branch often** – explore plausible alternatives in parallel; you can merge or discard branches later  
↩️ **Back-track** – if a path looks wrong, start a new branch from an earlier thought  
❓ **Admit uncertainty** – explicitly note unknowns and schedule extra thoughts to resolve them

---

## MUST DO
✅ Put **every** private reasoning step in \`thought\`  
✅ Keep \`thought_number\` correct; update \`total_thoughts\` when scope changes  
✅ Use \`is_revision\` & \`branch_from_thought\`/\`branch_id\` precisely  
✅ Set \`next_thought_needed=false\` *only* when **all** open questions are resolved  
✅ Abort and summarise if \`thought_number > 20\`  

---

## DO NOT
⛔️ Reveal the content of \`thought\` to the end-user  
⛔️ Continue thinking once \`next_thought_needed=false\`  
⛔️ Assume thoughts must proceed strictly linearly – *branching is first-class*

---

### PARAMETER CHEAT-SHEET
• \`thought\` (string) – current reasoning step  
• \`next_thought_needed\` (boolean) – request further thinking?  
• \`thought_number\` (int ≥ 1) – 1-based counter  
• \`total_thoughts\` (int ≥ 1) – mutable estimate  
• \`is_revision\`, \`revises_thought\` (int) – mark corrections  
• \`branch_from_thought\`, \`branch_id\` – manage alternative paths  
• \`needs_more_thoughts\` (boolean) – optional hint that more thoughts may follow  

_All JSON keys **must** use \`lower_snake_case\`._

---

### EXAMPLE ✔️
\`\`\`json
{
  "thought": "List solution candidates and pick the most promising",
  "thought_number": 1,
  "total_thoughts": 4,
  "next_thought_needed": true
}
\`\`\`

### EXAMPLE ✔️ (branching late)
\`\`\`json
{
  "thought": "Alternative approach: treat it as a graph-search problem",
  "thought_number": 6,
  "total_thoughts": 8,
  "branch_from_thought": 3,
  "branch_id": "B1",
  "next_thought_needed": true
}
\`\`\`
`,
    inputSchema: {
        type: "object",
        properties: {
            thought: {
                type: "string",
                description: "Your current reasoning step",
            },
            next_thought_needed: {
                type: "boolean",
                description: "Whether another thought step is needed",
            },
            thought_number: {
                type: "integer",
                description: "Current thought number (1-based)",
                minimum: 1,
            },
            total_thoughts: {
                type: "integer",
                description: "Estimated total thoughts needed (can be adjusted)",
                minimum: 1,
            },
            is_revision: {
                type: "boolean",
                description: "Whether this is a revision of a previous thought",
            },
            revises_thought: {
                type: "integer",
                description: "Which thought is being revised",
                minimum: 1,
            },
            branch_from_thought: {
                type: "integer",
                description: "Branching point thought number",
                minimum: 1,
            },
            branch_id: {
                type: "string",
                description: "Identifier for the current branch",
            },
            needs_more_thoughts: {
                type: "boolean",
                description: "Optional hint that more thoughts may follow",
            },
        },
        required: ["thought", "next_thought_needed", "thought_number", "total_thoughts"],
    },
};
const server = new Server({
    name: "code-reasoning-server",
    version: "0.3.0",
}, {
    capabilities: {
        tools: {},
    },
});
const thinkingServer = new SequentialThinkingServer();
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [SEQUENTIAL_THINKING_TOOL],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "sequentialthinking") {
        return thinkingServer.processThought(request.params.arguments);
    }
    return {
        content: [
            {
                type: "text",
                text: `Unknown tool: ${request.params.name}`,
            },
        ],
        isError: true,
    };
});
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Code Reasoning MCP Server running on stdio");
}
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
