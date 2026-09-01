# ADR 0002: Unified Cloudflare Worker deployment

Status: Accepted

## Context

The approved plan originally split the React/Vite site into a Cloudflare Pages
project and the public registry into a separate Worker backed by D1. Before
Phase 6 provisioning, Cloudflare's current platform documentation was reviewed
to confirm the smallest supported deployment boundary.

Cloudflare now documents React/Vite full-stack applications as a Worker with
Static Assets and an API Worker. Worker code and static assets deploy together
as one versioned unit, SPA fallback is supported, and selective
`assets.run_worker_first` routing can send `/api/*` to Worker code. D1 is
available through a Worker binding. Wrangler environments create separately
named Workers, and bindings are non-inheritable, so preview and production can
bind distinct D1 databases without splitting the application topology.

## Decision

Phase 6 will use one unified Cloudflare Worker application containing:

- the React/Vite static build;
- the read-focused `/api/*` registry routes;
- a D1 binding;
- SPA fallback after static-asset and `/api/*` routing; and
- generated `*.workers.dev` hostnames only.

The same application will have named preview and production environments. Each
environment is a distinct deployed Worker instance: `prooflens-preview` and
`prooflens-production`. They bind, respectively, to
`prooflens-registry-preview` and `prooflens-registry-production` through the
same `DB` binding name with explicit non-inherited configuration. Static assets
remain assets-first except for the explicit `/api/*` Worker-first route. No
Pages project will be provisioned.

All existing Phase 6 functional and security boundaries remain unchanged:
public reads only, offline operator mutations, prepared statements, tracked
migrations, generated binding types, structured logs, current compatibility
settings, bounded inputs, explicit cache policy, no R2, no authentication or
administration surface, no custom domain, and no production C2PA trust root.

## Consequences

The architecture removes a separately configured Pages project, cross-origin
site/API coordination, and independent frontend/backend releases. A deployment
promotes static assets and API code together and uses the Worker versions and
rollback model. Preview and production data remain isolated in separate D1
resources and cannot rely on inherited bindings.

This decision is based on Cloudflare's current React/Vite, Workers Static
Assets, Pages-to-Workers migration, Wrangler environments, and D1 environment
documentation as reviewed on 2026-08-29. It changes only the Phase 6 deployment
topology; completed provenance, trust, binding, package, and acceptance
architecture is unchanged.

## Primary documentation reviewed

- [React + Vite](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [D1 environments](https://developers.cloudflare.com/d1/configuration/environments/)
- [Workers routes and domains](https://developers.cloudflare.com/workers/configuration/routing/)
