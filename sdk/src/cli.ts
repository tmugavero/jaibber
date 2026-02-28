/**
 * Jaibber Agent CLI — run a headless agent from the command line.
 *
 * Usage:
 *   npx @jaibber/sdk \
 *     --username my-bot --password secret \
 *     --agent-name "CodingAgent" \
 *     --anthropic-key sk-ant-...
 */

import { JaibberAgent } from "./agent.js";

// ── Arg parsing (zero-dep) ──────────────────────────────────────────

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

// ── Help ────────────────────────────────────────────────────────────

if (args["help"] || args["h"] || process.argv.length <= 2) {
  console.log(`
Jaibber Agent CLI — run a headless AI agent

USAGE:
  npx @jaibber/sdk [options]

REQUIRED:
  --username <name>         Jaibber account username
  --password <pass>         Jaibber account password
  --agent-name <name>       Agent display name (used for @mention routing)

OPTIONAL:
  --server <url>            Server URL (default: https://api.jaibber.com)
  --anthropic-key <key>     Anthropic API key — enables built-in Claude provider
  --instructions <text>     System prompt for the agent
  --machine-name <name>     Machine identifier shown in presence
  --projects <id,id,...>    Comma-separated project IDs to join (default: all)
  --help                    Show this help message

EXAMPLES:
  # Basic agent with Claude provider
  npx @jaibber/sdk \\
    --username coding-bot --password s3cret \\
    --agent-name "CodingAgent" \\
    --anthropic-key sk-ant-api03-...

  # Agent for specific projects with custom instructions
  npx @jaibber/sdk \\
    --username tester --password p4ss \\
    --agent-name "TestBot" \\
    --anthropic-key sk-ant-api03-... \\
    --instructions "You are a QA engineer. Review code for bugs." \\
    --projects "uuid-1,uuid-2"

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY         Alternative to --anthropic-key
  JAIBBER_PASSWORD          Alternative to --password
`);
  process.exit(0);
}

// ── Validate required args ──────────────────────────────────────────

const username = args["username"];
const password = args["password"] || process.env.JAIBBER_PASSWORD;
const agentName = args["agent-name"];
const serverUrl =
  args["server"] || "https://api.jaibber.com";
const anthropicKey =
  args["anthropic-key"] || process.env.ANTHROPIC_API_KEY;
const instructions = args["instructions"];
const machineName = args["machine-name"];
const projectIds = args["projects"]
  ? args["projects"].split(",").map((s) => s.trim())
  : undefined;

if (!username) {
  console.error("Error: --username is required");
  process.exit(1);
}
if (!password) {
  console.error(
    "Error: --password is required (or set JAIBBER_PASSWORD env var)",
  );
  process.exit(1);
}
if (!agentName) {
  console.error("Error: --agent-name is required");
  process.exit(1);
}

// ── Start agent ─────────────────────────────────────────────────────

const agent = new JaibberAgent({
  serverUrl,
  credentials: { username, password },
  agentName,
  agentInstructions: instructions,
  machineName,
  projectIds,
});

if (anthropicKey) {
  agent.useProvider("anthropic", { apiKey: anthropicKey });
  console.log(`[cli] Using Anthropic provider`);
} else {
  console.log(
    "[cli] No --anthropic-key provided. Register a message handler in code, or pass --anthropic-key.",
  );
  console.log(
    "[cli] Agent will connect but won't respond to messages without a provider.",
  );
}

// Graceful shutdown
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n[cli] Shutting down...");
  await agent.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Connect
try {
  await agent.connect();
  console.log(`[cli] Agent "${agentName}" is running. Press Ctrl+C to stop.`);
} catch (err) {
  console.error(
    `[cli] Failed to start: ${err instanceof Error ? err.message : err}`,
  );
  process.exit(1);
}
