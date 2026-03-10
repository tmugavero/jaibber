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
import { JaibberClient } from "./client.js";

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

PROVIDER (at least one required — first match wins):
  --anthropic-key <key>     Anthropic API key (Claude)
  --openai-key <key>        OpenAI API key (GPT-4o)
  --google-key <key>        Google AI API key (Gemini)
  --claude-cli              Use local Claude CLI (no API key needed)

OPTIONAL:
  --register                Create a new account (instead of logging into an existing one)
  --create-project <name>   Create a new project and join it (prints project ID on start)
  --server <url>            Server URL (default: https://api.jaibber.com)
  --instructions <text>     System prompt for the agent
  --machine-name <name>     Machine identifier shown in presence
  --projects <id,id,...>    Comma-separated project IDs to join (default: all)
  --project-dir <path>      Working directory for Claude CLI (default: cwd)
  --help                    Show this help message

EXAMPLES:
  # With Anthropic API key
  npx @jaibber/sdk \\
    --username coding-bot --password s3cret \\
    --agent-name "CodingAgent" \\
    --anthropic-key sk-ant-api03-...

  # With OpenAI
  npx @jaibber/sdk \\
    --username coding-bot --password s3cret \\
    --agent-name "CodingAgent" \\
    --openai-key sk-...

  # With local Claude CLI (no API key)
  npx @jaibber/sdk \\
    --username coding-bot --password s3cret \\
    --agent-name "CodingAgent" \\
    --claude-cli --project-dir /path/to/project

  # Create a new project on first run
  npx @jaibber/sdk \\
    --username coding-bot --password s3cret \\
    --agent-name "CodingAgent" \\
    --create-project "my-ubuntu-server" \\
    --claude-cli

  # Register new account + Gemini
  npx @jaibber/sdk \\
    --register \\
    --username tester --password p4ss \\
    --agent-name "TestBot" \\
    --google-key AIza...

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY         Alternative to --anthropic-key
  OPENAI_API_KEY            Alternative to --openai-key
  GOOGLE_API_KEY            Alternative to --google-key
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
const openaiKey =
  args["openai-key"] || process.env.OPENAI_API_KEY;
const googleKey =
  args["google-key"] || process.env.GOOGLE_API_KEY;
const useClaudeCli = args["claude-cli"] === "true";
const projectDir = args["project-dir"];
const instructions = args["instructions"];
const machineName = args["machine-name"];
const shouldRegister = args["register"] === "true";
const createProjectName = args["create-project"];
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

// ── Register account if requested ───────────────────────────────────

if (shouldRegister) {
  console.log(`[cli] Registering new account "${username}"...`);
  const client = new JaibberClient(serverUrl);
  try {
    await client.register(username, password);
    console.log(`[cli] Account created successfully.`);
  } catch (err) {
    console.error(
      `[cli] Registration failed: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }
}

// ── Create project if requested ──────────────────────────────────────

let resolvedProjectIds = projectIds;

if (createProjectName) {
  console.log(`[cli] Creating project "${createProjectName}"...`);
  const client = new JaibberClient(serverUrl);
  try {
    await client.login(username, password);
    const project = await client.createProject(createProjectName);
    console.log(`[cli] Project created: ${project.name}`);
    console.log(`[cli] Project ID: ${project.id}`);
    console.log(`[cli] Share this ID with teammates to join the project.`);
    resolvedProjectIds = [project.id];
  } catch (err) {
    console.error(
      `[cli] Failed to create project: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }
}

// ── Start agent ─────────────────────────────────────────────────────

const agent = new JaibberAgent({
  serverUrl,
  credentials: { username, password },
  agentName,
  agentInstructions: instructions,
  machineName,
  projectIds: resolvedProjectIds,
});

// Auto-detect provider (first wins: anthropic > openai > google > claude-cli)
if (anthropicKey) {
  agent.useProvider("anthropic", { apiKey: anthropicKey });
  console.log(`[cli] Using Anthropic provider (Claude)`);
} else if (openaiKey) {
  agent.useProvider("openai", { apiKey: openaiKey });
  console.log(`[cli] Using OpenAI provider (GPT-4o)`);
} else if (googleKey) {
  agent.useProvider("google", { apiKey: googleKey });
  console.log(`[cli] Using Google provider (Gemini)`);
} else if (useClaudeCli) {
  agent.useProvider("claude-cli", { projectDir });
  console.log(`[cli] Using Claude CLI provider (local auth)`);
} else {
  console.log(
    "[cli] No provider configured. Pass --anthropic-key, --openai-key, --google-key, or --claude-cli.",
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
