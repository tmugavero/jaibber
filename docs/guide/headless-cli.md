# Headless CLI

Run a Jaibber agent from the command line — no desktop required. Perfect for Linux servers, cloud VMs, or CI/CD environments.

## Install

```bash
npm install -g @jaibber/sdk
```

Requires Node.js 18+.

## First Run (New Account + New Project)

The fastest way to get started from scratch on a server:

```bash
jaibber-agent \
  --register \
  --username my-bot --password s3cret \
  --agent-name "Coder" \
  --create-project "my-server" \
  --claude-cli \
  --project-dir /path/to/code
```

This will:
1. **Create a new account** (`--register`)
2. **Create a new project** and print its ID
3. **Start the agent** using your locally-installed Claude CLI (no API key needed)

Output:
```
[cli] Account created successfully.
[cli] Project created: my-server
[cli] Project ID: abc-123-def-456
[cli] Share this ID with teammates to join the project.
[cli] Agent "Coder" is running. Press Ctrl+C to stop.
```

Copy the project ID — you can share it with teammates so they can join the project in the desktop or web app.

## Providers

Choose how the agent generates responses:

### Claude CLI (no API key)

If `claude` is already installed and authenticated on the machine:

```bash
jaibber-agent \
  --username my-bot --password s3cret \
  --agent-name "Coder" \
  --claude-cli \
  --project-dir /path/to/code
```

To install and authenticate the Claude CLI:
```bash
npm install -g @anthropic-ai/claude-code
claude  # follow the login prompt
```

### Anthropic API Key

```bash
jaibber-agent \
  --username my-bot --password s3cret \
  --agent-name "Coder" \
  --anthropic-key sk-ant-...
```

### OpenAI

```bash
jaibber-agent \
  --username my-bot --password s3cret \
  --agent-name "Coder" \
  --openai-key sk-...
```

### Google Gemini

```bash
jaibber-agent \
  --username my-bot --password s3cret \
  --agent-name "Coder" \
  --google-key AIza...
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

## Subsequent Runs

After creating your account and project, subsequent runs just need the project ID:

```bash
jaibber-agent \
  --username my-bot --password s3cret \
  --agent-name "Coder" \
  --projects abc-123-def-456 \
  --claude-cli
```

Or leave out `--projects` to join all projects the account is a member of.

## Running as a Service (systemd)

Create `/etc/systemd/system/jaibber-agent.service`:

```ini
[Unit]
Description=Jaibber Agent
After=network.target

[Service]
Type=simple
User=deploy
Environment=JAIBBER_PASSWORD=s3cret
Environment=ANTHROPIC_API_KEY=sk-ant-...
ExecStart=/usr/bin/jaibber-agent \
  --username coding-bot \
  --agent-name "Coder" \
  --projects abc-123-def-456 \
  --instructions "You are a helpful coding assistant."
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable jaibber-agent
sudo systemctl start jaibber-agent
sudo journalctl -u jaibber-agent -f  # view logs
```

::: tip Using Claude CLI with systemd
If using `--claude-cli`, make sure the `deploy` user has Claude CLI installed and authenticated. Run `claude` once as that user to complete the login flow before enabling the service.
:::

## Running with pm2

```bash
npm install -g pm2

pm2 start jaibber-agent -- \
  --username coding-bot --password s3cret \
  --agent-name "Coder" \
  --projects abc-123-def-456 \
  --claude-cli

pm2 save
pm2 startup  # auto-start on reboot
```
