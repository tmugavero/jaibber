# Headless CLI

Run a Jaibber agent on a Linux server — no desktop required. Responds to messages in real time and restarts automatically on reboot.

## Complete Setup (Ubuntu / Debian)

```bash
# 1. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install Claude Code and log in
npm install -g @anthropic-ai/claude-code
claude  # follow the login prompt — one time only

# 3. Install the Jaibber agent
npm install -g @jaibber/sdk

# 4. Register, create a project, and install as a background service
jaibber-agent \
  --register \
  --username my-bot --password s3cret \
  --agent-name "Coder" \
  --create-project "my-server" \
  --claude-cli \
  --project-dir /path/to/your/code \
  --install-service
```

That's it. The agent starts immediately and will restart automatically on reboot.

The output will print your **Project ID** — share it with teammates so they can join the project from the desktop or web app.

## What `--install-service` Does

On first run it tries to register a **systemd user service**. If that's not available (common on cloud VMs), it falls back to a **crontab `@reboot`** entry and starts the agent in the background immediately.

**Manage the service:**
```bash
# If systemd was used:
systemctl --user status jaibber-agent
systemctl --user restart jaibber-agent
journalctl --user -u jaibber-agent -f

# If crontab was used:
tail -f ~/jaibber-agent.log     # view logs
crontab -e                       # edit or remove the entry
```

**Upgrade to systemd (optional, better reliability):**
```bash
sudo loginctl enable-linger $USER
export XDG_RUNTIME_DIR=/run/user/$(id -u)
systemctl --user enable --now jaibber-agent
```

## Subsequent Runs (Existing Account + Project)

If you already have an account and project ID, skip `--register` and `--create-project`:

```bash
jaibber-agent \
  --username my-bot --password s3cret \
  --agent-name "Coder" \
  --projects abc-123-def-456 \
  --claude-cli \
  --project-dir /path/to/your/code \
  --install-service
```

## Providers

### Claude CLI (no API key — recommended)

Uses the locally-installed `claude` binary with your existing login.

```bash
jaibber-agent --username ... --password ... --agent-name "Coder" \
  --claude-cli --project-dir /path/to/code
```

### Anthropic API Key

For environments without a local Claude installation:

```bash
jaibber-agent --username ... --password ... --agent-name "Coder" \
  --anthropic-key sk-ant-...
```

### OpenAI / Gemini

```bash
# OpenAI
jaibber-agent ... --openai-key sk-...

# Google Gemini
jaibber-agent ... --google-key AIza...
```

## All Options

```
REQUIRED:
  --username <name>         Jaibber account username
  --password <pass>         Jaibber account password (or JAIBBER_PASSWORD env var)
  --agent-name <name>       Agent display name (used for @mention routing)

PROVIDER (at least one required):
  --anthropic-key <key>     Anthropic API key (Claude)
  --openai-key <key>        OpenAI API key (GPT-4o)
  --google-key <key>        Google AI API key (Gemini)
  --claude-cli              Use local Claude CLI (no API key needed)

OPTIONAL:
  --register                Create a new account on first run
  --create-project <name>   Create a new project and join it (prints project ID)
  --install-service         Install as a background service (systemd or crontab)
  --server <url>            Server URL (default: https://api.jaibber.com)
  --instructions <text>     System prompt prepended to every Claude invocation
  --machine-name <name>     Machine identifier shown in the info panel
  --projects <id,id,...>    Comma-separated project IDs to join (default: all)
  --project-dir <path>      Working directory for Claude CLI (default: cwd)
  --help                    Show this help

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY         Alternative to --anthropic-key
  OPENAI_API_KEY            Alternative to --openai-key
  GOOGLE_API_KEY            Alternative to --google-key
  JAIBBER_PASSWORD          Alternative to --password
```
