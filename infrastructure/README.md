# Infrastructure Notes

This folder contains a mix of current deployment assets and longer-range infrastructure references.

## What is current

- [`docker/`](docker/) contains the container deployment assets used by the GitHub Actions deploy workflow.
- [`pm2/`](pm2/) contains the single-server `nginx + pm2` runbook used for lightweight host deployments.
- [`../nginx/`](../nginx/) contains the reverse proxy config used by the single-server path.

## What is reference-only

Any AWS, Terraform, Kubernetes, or ECS material in this repo should be treated as planning/reference unless that environment is actively being built out. It is not the source of truth for the current live rollout path.

## Deployment rule

Pick one deployment model per environment:

1. `pm2 + nginx` on a single server
2. container deployment via GHCR + Docker Compose

Do not mix them casually. Most deployment confusion in this repo has come from half-following both sets of instructions at once.

## Source-of-truth runbooks

- Single server: [pm2/DEPLOYMENT.md](pm2/DEPLOYMENT.md)
- Container deploys: [docker/DEPLOYMENT.md](docker/DEPLOYMENT.md)
