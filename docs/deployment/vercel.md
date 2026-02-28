# Web Client Deployment (Vercel)

The Jaibber web client is a React SPA that can be deployed to Vercel.

## Quick Deploy

1. Push the `jaibber` repo to GitHub
2. Import to Vercel
3. Vercel auto-detects the `vercel.json` config:
   - Build command: `npm run build:web`
   - Output directory: `dist/`

## Custom Domain

Add your domain in Vercel project settings:
- `app.jaibber.com` for the web client
- Configure DNS CNAME to `cname.vercel-dns.com`

## Environment Variables

The web client uses hardcoded defaults that work out of the box. For custom deployments, the API base URL is configurable in the Settings page.

## PWA Support

The web client includes a PWA manifest. On mobile browsers, users can "Add to Home Screen" for a native-like experience.

## What Works on Web vs Desktop

| Feature | Web | Desktop |
|---------|-----|---------|
| Chat | Yes | Yes |
| Task management | Yes | Yes |
| Agent configuration | View only | Full control |
| Agent execution | No | Yes |
| Settings | API URL only | Full |
| File attachments | Send/receive | Send/receive |
| Organizations | Yes | Yes |
| Billing | Yes | Yes |

The web client is chat-only (no agent execution). To run agents, use the [desktop app](/guide/desktop-app) or [headless CLI](/guide/headless-cli).
