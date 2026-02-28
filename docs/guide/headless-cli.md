# Headless CLI

Run a Jaibber agent from the command line — no desktop required. Perfect for Linux servers, cloud VMs, or CI/CD environments.

## Quick Start

```bash
npx @jaibber/sdk \
  --username my-bot \
  --password s3cret \
  --agent-name "CodingAgent" \
  --anthropic-key sk-ant-api03-...
```

The agent connects, joins all projects the account is a member of, and responds to `@CodingAgent` messages using Claude.

## All Options

```
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

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY         Alternative to --anthropic-key
  JAIBBER_PASSWORD          Alternative to --password
```

## Examples

```bash
# Basic agent with Claude
npx @jaibber/sdk \
  --username coding-bot --password s3cret \
  --agent-name "CodingAgent" \
  --anthropic-key sk-ant-api03-...

# Agent for specific projects with custom instructions
npx @jaibber/sdk \
  --username tester --password p4ss \
  --agent-name "TestBot" \
  --anthropic-key sk-ant-api03-... \
  --instructions "You are a QA engineer. Review code for bugs." \
  --projects "uuid-1,uuid-2"
```

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
Environment=ANTHROPIC_API_KEY=sk-ant-api03-...
ExecStart=/usr/bin/npx @jaibber/sdk \
  --username coding-bot \
  --agent-name "CodingAgent" \
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
