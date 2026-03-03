# Deployment Guide

This guide covers building and deploying UX3 applications to production environments.

## Overview

UX3 applications compile to **static bundles**—no server-side runtime required. This means:

- ✅ Builds to optimized JavaScript/CSS bundles
- ✅ Can be deployed to any static hosting platform
- ✅ Supports server-side rendering (SSR) with custom configuration
- ✅ Environment variables passed at build-time or runtime
- ✅ Small bundle size with dependency analysis

## Section 1: Production Build

### Build Command

```bash
npm run build
```

This command:
1. Compiles YAML configurations to TypeScript types
2. Validates schemas, reachability, and i18n keys
3. Bundles with Vite (minification, code splitting)
4. Outputs to `dist/` directory
5. Generates bundle analysis in `test-results/`

### Build Output

```
dist/
  index.html           # Entry HTML
  assets/
    bundle.js          # Minified application
    bundle.js.map      # Source maps for debugging
    styles.css         # Combined styles
    chunk-*.js         # Code-split chunks
```

### Key Files

- **index.html** — Entry point (served for all routes)
- **bundle.js** — Main application (hydrated on page load)
- **Source maps** — Stack traces map back to original TypeScript

## Section 2: Environment Configuration

### Build-Time Variables

Pass environment variables during build:

```bash
# Set variables in environment
export API_URL=https://api.example.com
export LOG_LEVEL=warn

npm run build
```

**In application code** (src/config.ts or similar):
```typescript
export const config = {
  api: {
    baseUrl: process.env.API_URL || 'http://localhost:3000',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};
```

### Runtime Variables (Via HTML)

For values that change without rebuild, inject into HTML:

**In html/index.html**:
```html
<script>
  window.UX3_CONFIG = {
    apiUrl: window.location.hostname === 'localhost' ? 'http://localhost:4000' : 'https://api.example.com',
    environment: 'production',
  };
</script>
<div id="app"></div>
<script src="/assets/bundle.js" type="module"></script>
```

**In application code**:
```typescript
const config = window.UX3_CONFIG || {
  apiUrl: 'https://api.example.com',
  environment: 'production',
};
```

### Environment Files

Create `.env.production` (not versioned):

```bash
# .env.production
VITE_API_URL=https://api.production.example.com
VITE_LOG_LEVEL=warn
VITE_ENABLE_ANALYTICS=true
```

Then reference in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Section 3: Hosting Platforms

### Static Hosting (Recommended)

Suitable for all UX3 apps. Platform examples:

#### AWS S3 + CloudFront
```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://my-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id ABCD123 --paths "/*"
```

#### Netlify
```bash
# Connect repo, set build command and output directory
# Build command: npm run build
# Publish directory: dist

git push  # Netlify automatically builds and deploys
```

**netlify.toml**:
```toml
[build]
command = "npm run build"
publish = "dist"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

#### Vercel
```bash
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### GitHub Pages
```bash
# Create a .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Server-Side Rendering (SSR)

For SEO or dynamic HTML generation:

```typescript
// src/ssr.ts
import { renderToString } from '@ux3/ssr';
import { app } from './app';

export async function renderPage(url: string) {
  const html = await renderToString(app, { url });
  return html;
}
```

Then in your Node server:
```typescript
import express from 'express';
import { renderPage } from './src/ssr';

const server = express();

server.get('*', async (req, res) => {
  const html = await renderPage(req.url);
  res.send(html);
});

server.listen(3000);
```

## Section 4: Pre-Deployment Checks

### Build Size Check

Verify bundle stays within limits:

```bash
npm run size-check
```

This runs before build and fails if bundle exceeds thresholds.

### Type Check

Ensure no TypeScript errors:

```bash
npm run type-check
```

### Linting

Check code quality:

```bash
npm run lint
```

### Tests

Run full test suite:

```bash
npm run test
```

### Full Pre-Deployment

```bash
npm run lint && npm run type-check && npm run test && npm run build
```

## Section 5: Performance Optimization

### Code Splitting

Automatic with Vite. Import code lazily:

```typescript
// routes/index.ts
const adminView = () => import('./views/admin.view');
const userView = () => import('./views/user.view');

export const routes = {
  '/admin': { view: adminView, guard: isAdmin },
  '/user': { view: userView },
};
```

### Bundle Analysis

View what's in your bundle:

```bash
npm run dev
# Then visit http://localhost:5173/__bundleanalyzer
```

Or analyze the production bundle:

```bash
npx vite-plugin-visualizer dist/stats.html
```

## Section 6: Monitoring & Observability

### Error Tracking

Send errors to tracking service:

```typescript
// src/monitoring.ts
import Sentry from '@sentry/browser';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_ENVIRONMENT,
  tracesSampleRate: 0.1,
});

// Log FSM errors
app.hooks.on(AppLifecyclePhase.ERROR, async (context) => {
  Sentry.captureException(context.error, {
    contexts: {
      fsm: {
        name: context.fsm?.name,
        state: context.fsm?.state,
      },
    },
  });
});
```

### Performance Monitoring

Track Core Web Vitals:

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendMetric(metric) {
  // Send to analytics backend
  console.log(metric);
}

getCLS(sendMetric);
getFID(sendMetric);
getFCP(sendMetric);
getLCP(sendMetric);
getTTFB(sendMetric);
```

### Logging

Use structured logging:

```typescript
import { logger } from '@ux3/logger';

logger.info('User login successful', {
  userId: '123',
  timestamp: new Date().toISOString(),
});

// Configure in production
logger.setLevel(process.env.VITE_LOG_LEVEL || 'warn');
```

## Section 7: Security Best Practices

### Content Security Policy

Set in your server or hosting platform:

```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: https:; 
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none'
```

### CORS Configuration

Restrict API calls to your domain:

```typescript
// In backend API server
app.use(cors({
  origin: ['https://app.example.com', 'https://staging.example.com'],
  credentials: true,
}));
```

### HTTPS Only

Always serve over HTTPS in production:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### API Keys

Never embed secrets in code. Use environment variables:

```typescript
// ✅ Correct
const apiKey = import.meta.env.VITE_API_KEY;

// ❌ Wrong
const apiKey = 'sk_live_1234567';  // Exposed in source!
```

## Section 8: Deployment Checklist

Before deploying to production:

- [ ] **Build succeeds** — `npm run build` completes without errors
- [ ] **Tests pass** — `npm run test` shows green
- [ ] **TypeScript OK** — `npm run type-check` has no errors
- [ ] **Linting OK** — `npm run lint` passes
- [ ] **Bundle size OK** — `npm run size-check` passes
- [ ] **Environment vars set** — `.env.production` configured correctly
- [ ] **Secrets not exposed** — No API keys in code
- [ ] **CSP header set** — Content Security Policy configured
- [ ] **HTTPS enabled** — SSL certificate installed
- [ ] **CORS configured** — Backend allows requests from your domain
- [ ] **Error tracking** — Sentry/Rollbar/etc. configured
- [ ] **Monitoring setup** — Web Vitals and custom metrics tracked
- [ ] **Backup/rollback plan** — Know how to revert if needed
- [ ] **Documentation updated** — Team knows deployment process
- [ ] **Staging tested** — Features verified in staging environment first

## Section 9: Rollback Strategy

### Git-Based Rollback

If you deploy with Git:

```bash
# View deployment history
git log --oneline

# Rollback to previous version
git revert <bad-commit-hash>
git push

# Rebuild and redeploy
npm run build
npm run deploy
```

### Branch-Based Deployment

Keep stable versions on branches:

```bash
git branch production
git branch staging
git branch main  # development

# Deploy staging to staging environment
git push origin staging

# After testing, merge to production
git checkout production
git merge staging
git push origin production
```

### Docker-Based Rollback

Using Docker images:

```bash
# Tag production image
docker build -t myapp:1.0.0 .
docker push myregistry/myapp:1.0.0

# Deploy version 1.0.0
kubectl set image deployment/myapp myapp=myregistry/myapp:1.0.0

# Rollback to previous version
kubectl rollout undo deployment/myapp
```

## Section 10: Typical Deployment Flow

```bash
# 1. Verify on local machine
npm ci               # Clean install
npm run lint        # Check code quality
npm run type-check  # Check types
npm run test        # Run tests

# 2. Build production bundle
npm run build

# 3. Test production build locally
npm run preview     # Serve dist/ locally

# 4. Deploy
./scripts/deploy.sh # Your deployment script

# 5. Verify in production
# - Check homepage loads
# - Check API calls work
# - Check error tracking
# - Check performance metrics

# 6. Monitor for issues
# - Watch error logs
# - Monitor performance
# - Check user feedback
```

## Related

- [Build and Dev guide](./build-and-dev.md) — Development workflow
- [Security guide](../security.md) — Security best practices
- [Performance guide](./performance.md) — Optimization strategies (coming soon)
