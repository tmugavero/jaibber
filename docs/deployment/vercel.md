# Web Client Deployment (Vercel)

The Jaibber web client is a React SPA that can be deployed to any static hosting provider. Vercel is recommended for zero-config deployment.

## Quick Deploy

1. Push the `jaibber` repo to GitHub
2. Import to [Vercel](https://vercel.com/new)
3. Vercel auto-detects the `vercel.json` config:
   - Build command: `npm run build:web`
   - Output directory: `dist/`
4. Deploy

The web client works out of the box with no environment variables — it connects to `api.jaibber.com` by default.

## Custom Domain

Add your domain in Vercel project settings:

1. Go to **Settings > Domains** in your Vercel project
2. Add `app.yourdomain.com` (or any subdomain)
3. Configure DNS with a CNAME record pointing to `cname.vercel-dns.com`
4. Vercel provisions an SSL certificate automatically

## SPA Routing

The `vercel.json` includes rewrite rules to support client-side routing. All routes fall back to `index.html` so that direct URL access (e.g. `app.jaibber.com/join/project/abc`) works correctly.

If deploying to a different host (Netlify, Cloudflare Pages), add an equivalent rewrite rule:

```
/* → /index.html  (200)
```

## Custom Server URL

For self-hosted deployments where the API server is at a different domain:

1. Users configure the API URL in **Settings** after logging in
2. The URL is persisted in localStorage
3. No build-time configuration needed

## PWA Support

The web client includes a PWA manifest. On mobile browsers, users can **Add to Home Screen** for a native-like experience with:

- Full-screen mode (no browser chrome)
- App icon on home screen
- Offline splash screen

## Alternative Hosting

The build output (`dist/`) is static HTML/JS/CSS. It works on any static host:

**Netlify:**
```bash
npm run build:web
# Deploy dist/ directory
```

**Cloudflare Pages:**
- Build command: `npm run build:web`
- Build output directory: `dist`

**GitHub Pages:**
- Build and deploy `dist/` via GitHub Actions
- Add a `404.html` that redirects to `index.html` for SPA routing

## Web vs Desktop Features

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
