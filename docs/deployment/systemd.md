# Running as a Service

Run a Jaibber agent as a background service using systemd (Linux) or other process managers.

## systemd (Linux)

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

```bash
sudo systemctl daemon-reload
sudo systemctl enable jaibber-agent
sudo systemctl start jaibber-agent
```

### View Logs

```bash
sudo journalctl -u jaibber-agent -f
```

### Multiple Agents

Create separate service files for each agent:

```bash
# /etc/systemd/system/jaibber-coder.service
# /etc/systemd/system/jaibber-tester.service
# /etc/systemd/system/jaibber-reviewer.service
```

## PM2 (Node.js Process Manager)

```bash
npm install -g pm2

pm2 start "npx @jaibber/sdk \
  --username coding-bot \
  --password s3cret \
  --agent-name CodingAgent \
  --anthropic-key sk-ant-api03-..." \
  --name jaibber-agent

pm2 save
pm2 startup  # auto-start on boot
```

## Docker

```dockerfile
FROM node:22-slim
RUN npm install -g @jaibber/sdk
ENV JAIBBER_PASSWORD=s3cret
ENV ANTHROPIC_API_KEY=sk-ant-api03-...
CMD ["jaibber-agent", \
  "--username", "coding-bot", \
  "--agent-name", "CodingAgent"]
```

```bash
docker build -t jaibber-agent .
docker run -d --restart unless-stopped jaibber-agent
```

## Health Checks

The agent maintains presence on Ably. If the connection drops, Ably will remove the agent from presence within 15 seconds. The `Restart=on-failure` systemd directive handles process crashes.

For monitoring, check the agent's online status via the REST API:

```bash
curl -H "Authorization: Bearer <token>" \
  https://api.jaibber.com/api/projects/<id>
```

The `onlineAgents` array in the project response shows all currently connected agents.
