# Developing z02-test-viz <!-- omit in toc -->

## Table of contents <!-- omit in toc -->

- [Getting started](#getting-started)
- [Architecture](#architecture)
- [API endpoints](#api-endpoints)
- [Adding new endpoints](#adding-new-endpoints)
- [Editing markdown files](#editing-markdown-files)
- [Directory structure](#directory-structure)
- [Running tests](#running-tests)
- [Publishing](#publishing)

## Getting started

1. Install the project with `yarn install`
2. Start the app with `yarn dev` 🚀

The startup script will automatically create `.env.server` from `.env.example` if it doesn't exist.
Edit `.env.server` to add your TDP credentials.

The development server runs on http://localhost:3000 by default (configurable via `PORT` in `.env.server`).

## Architecture

This data app uses a monorepo structure with two main packages:

- **`packages/client/`** - React frontend application built with Vite
- **`packages/server/`** - Express backend server with ViteExpress

### TetraScience React UI

This template includes [@tetrascience-npm/tetrascience-react-ui](https://www.npmjs.com/package/@tetrascience-npm/tetrascience-react-ui), a shared library providing:

- **React UI Components** - Common components for building TetraScience data apps
- **Helper SDK Functions** - Utilities for interacting with TDP APIs (coming soon)

See the [package documentation](https://www.npmjs.com/package/@tetrascience-npm/tetrascience-react-ui) for available components and usage examples.

### How it works

- In **development mode**, ViteExpress serves the React app with hot module replacement (HMR) and proxies API requests to Express
- In **production mode**, ViteExpress serves the pre-built static files from the client package
- The Express server handles all `/api/*` routes and provides a unified entry point


### Healthcheck (Production Only)

In production mode, the Express server automatically:
- Reports health status to TDP on startup
- Sends periodic heartbeats to TDP
- Gracefully shuts down on SIGTERM/SIGINT

## API Endpoints

The Express server provides sample endpoints to help you get started:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint (for load balancers) |
| GET | `/api/hello` | Simple hello world example |
| GET | `/api/user` | Example showing auth context usage |
| POST | `/api/data` | Example POST endpoint |

## Adding New Endpoints

To add new API endpoints, edit `packages/server/src/app.ts` in the `registerRoutes()` method:

```typescript
// Example: Add a new GET endpoint
this.app.get('/api/my-endpoint', (req: Request, res: Response) => {
  res.json({ message: 'My custom endpoint' });
});

// Example: Add a new POST endpoint with auth
this.app.post('/api/my-data', (req: Request, res: Response) => {
  const auth = (req as RequestWithAuth).tdpAuth;
  if (!auth?.token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  const { data } = req.body;
  // Process data...
  res.json({ success: true, data });
});
```

## Editing markdown files

The tables of contents are generated and automatically updated by the VSCode extension "Markdown All in One".
If using vscode, please install the extension.

## Directory Structure

This project uses a Yarn workspace structure with multiple packages organized under the `packages/` directory:

```
/
├── package.json                    # Root workspace configuration
├── yarn.lock                       # Shared dependency lockfile
├── .env.example                    # Example environment variables
├── node_modules/                   # Shared dependencies for all packages
├── Dockerfile                      # Multi-stage Docker build
├── .dockerignore                   # Docker build context exclusions
├── conf/                           # Supervisor configuration files
│   ├── supervisord.conf            # Production supervisor config
│   └── supervisord-local.conf      # Local development supervisor config
├── images/                         # Static assets
│   └── icon.png
├── manifest.json                   # Application manifest
└── packages/                       # Workspace packages
    ├── client/                     # React frontend application
    │   ├── package.json            # React app dependencies and scripts
    │   ├── src/                    # React source code
    │   ├── tests/                  # React app unit tests
    │   ├── index.html              # HTML template
    │   ├── vite.config.ts          # Vite build configuration
    │   ├── vitest.config.ts        # Vitest test configuration
    │   └── tsconfig.*.json         # TypeScript configurations
    └── server/                     # Express backend server
        ├── package.json            # Server dependencies and scripts
        ├── src/                    # Server source code
        │   ├── index.ts            # Entry point
        │   ├── app.ts              # Express app & routes
        │   ├── config.ts           # Configuration
        │   └── services/           # Server services (healthcheck, etc.)
        └── tsconfig.json           # TypeScript configuration
```

### Key Structure Benefits

- **Yarn Workspaces**: All packages share dependencies through the root `node_modules`
- **Monorepo Organization**: Client and server packages are organized together
- **ViteExpress Integration**: Single server handles both API and frontend serving
- **Integrated Healthcheck**: Health monitoring is built into the Express server (production only)
- **Environment Flexibility**: Supports both local development and production deployments

## Running tests

```bash
# Run unit tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run browser tests
yarn test:browser
```

## Publishing

```bash
# 1. Build your data app for publishing
yarn docker:build-for-publish

# 2. Publish to TDP
ts-cli publish --type data-app --namespace private-takeda-gxp-dev --slug z02-test-viz --version v0.0.9
```

The `build-for-publish` command builds a Docker image and exports it as `image.tar`, which is required for data app publishing.
