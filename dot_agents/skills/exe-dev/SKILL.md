---
disable-model-invocation: true
name: exe-dev
description: Manage and deploy projects on exe.dev VMs. Use this whenever the user mentions exe.dev, exe.xyz hosts, `ssh exe.dev`, deploying Docker/GHCR apps to exe.dev, replacing or updating VMs, configuring exe.dev proxy/public access/custom domains, or setting up GitHub Actions/secrets/API tokens for exe.dev deployments.
---

# exe.dev

Use exe.dev as a lightweight VM hosting target controlled through SSH commands. The user's existing projects use two deployment styles:

1. **Immutable VM replacement** for simple stateless web apps: build/push an amd64 Docker image, remove an old VM if it exists, create a new VM from the image.
2. **In-place Docker Compose update** for stateful apps: build/push an image, SSH to the existing `*.exe.xyz` VM, write/update a compose file under `/data`, then `docker compose pull && up -d`.

Prefer these patterns over inventing a new deployment approach unless the project already has a different documented workflow.

## Command model

Run exe.dev control-plane commands through SSH:

```bash
ssh exe.dev ls
ssh exe.dev ls --json
ssh exe.dev new --name=my-vm --image=ghcr.io/owner/app:tag
ssh exe.dev rm my-vm
ssh exe.dev stat my-vm --range=24h
ssh exe.dev share show my-vm
ssh exe.dev share port my-vm 8080
ssh exe.dev share set-public my-vm
ssh exe.dev share set-private my-vm
ssh exe.dev resize my-vm --memory=8GB --cpu=4 --disk=50GB
ssh exe.dev restart my-vm
ssh exe.dev cp my-vm my-vm-staging --copy-tags=false
ssh exe.dev rename old-name new-name
ssh exe.dev tag my-vm prod web
ssh exe.dev comment my-vm "staging copy"
```

SSH into a VM directly by host/name:

```bash
ssh my-vm.exe.xyz
ssh my-vm.exe.xyz 'docker ps'
```

VM names are usually written without `.exe.xyz` for control-plane commands and with `.exe.xyz` for direct SSH/HTTP hostnames.

## Before changing a deployment

1. Inspect the repo for existing deployment files before making changes:
   - `deploy.sh`, `scripts/*deploy*`, `.github/workflows/*`, `Dockerfile`, `docker-compose*.yml`, `AGENTS.md`, `README.md`.
2. Preserve the repo's current pattern when possible.
3. Build Linux amd64 images for exe.dev unless there is a clear reason not to:
   ```bash
   docker buildx build --platform linux/amd64 --push ...
   ```
4. Keep secrets out of files and logs. Use `gh auth token`, `GHCR_TOKEN`, GitHub Actions secrets, or exe.dev API tokens. Do not commit registry tokens, `.env.production`, SSH private keys, or generated bearer tokens.
5. Use `/data` for persistent VM data, compose files, SQLite DBs, and production env files.
6. For development servers on exe.dev VMs, bind to `0.0.0.0`, not localhost, and add the VM host to framework allow-lists when needed.

## Pattern A: replace a VM from a GHCR image

Use this for stateless apps such as a Vite/static site served by nginx.

```bash
#!/usr/bin/env bash
set -euo pipefail

VM_NAME="${VM_NAME:-my-app}"
IMAGE_REPO="${IMAGE_REPO:-ghcr.io/OWNER/REPO}"
REGISTRY_USER="${REGISTRY_USER:-OWNER}"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
command -v gh >/dev/null || { echo "gh is required" >&2; exit 1; }
command -v ssh >/dev/null || { echo "ssh is required" >&2; exit 1; }

GH_TOKEN="$(gh auth token)"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}-$(date +%Y%m%d%H%M%S)"
IMAGE="$IMAGE_REPO:$TAG"
LATEST_IMAGE="$IMAGE_REPO:latest"

printf '%s' "$GH_TOKEN" | docker login ghcr.io -u "$REGISTRY_USER" --password-stdin >/dev/null

docker buildx build \
  --platform linux/amd64 \
  -t "$IMAGE" \
  -t "$LATEST_IMAGE" \
  --push \
  .

if ssh exe.dev ls | rg -q "(^|[[:space:]])${VM_NAME}\.exe\.xyz"; then
  ssh exe.dev rm "$VM_NAME"
fi

ssh exe.dev new \
  --name="$VM_NAME" \
  --image="$IMAGE" \
  --registry-auth "${REGISTRY_USER}:${GH_TOKEN}" \
  --tag webapp

echo "Created exe.dev VM: https://${VM_NAME}.exe.xyz/"
```

Notes:

- `--registry-auth USER:TOKEN` lets exe.dev pull private GHCR images.
- The HTTP proxy picks the port from `EXPOSE`; it prefers 80, then the smallest exposed TCP port >=1024.
- New VMs are private by default. Only run `share set-public` if the app should be publicly accessible.

## Pattern B: update an existing VM with Docker Compose

Use this for apps with persistent data, production env files, SQLite databases, or multiple runtime concerns. This mirrors the user's stateful app pattern.

```bash
#!/usr/bin/env bash
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/OWNER/APP}"
HOST="${EXE_HOST:-my-app.exe.xyz}"
CONTAINER_NAME="${CONTAINER_NAME:-my-app}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  printf '%s\n' "$GHCR_TOKEN" | docker login ghcr.io -u OWNER --password-stdin
fi

docker buildx build \
  --platform linux/amd64 \
  -t "$IMAGE:$TAG" \
  -t "$IMAGE:latest" \
  --push \
  .

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  printf '%s\n' "$GHCR_TOKEN" | ssh "$HOST" \
    'sudo docker login ghcr.io -u OWNER --password-stdin'
fi

ssh "$HOST" bash <<EOF
set -euo pipefail
cat <<'COMPOSE' | sudo tee /data/$CONTAINER_NAME.compose.yaml >/dev/null
services:
  app:
    image: $IMAGE:latest
    container_name: $CONTAINER_NAME
    restart: always
    ports:
      - "8080:8080"
    volumes:
      - /data:/data
    env_file:
      - /data/.env.production
COMPOSE

sudo docker compose -f /data/$CONTAINER_NAME.compose.yaml pull
sudo docker compose -f /data/$CONTAINER_NAME.compose.yaml up -d --remove-orphans
EOF
```

Notes:

- Prefer `/data/.env.production` on the VM for production config.
- Keep SQLite or app data under `/data` so it survives container replacement.
- If the app listens on 8080, either `EXPOSE 8080` in the Dockerfile or run `ssh exe.dev share port <vm> 8080`.

## GitHub Actions and secrets

For CI deployments, store the exe.dev VM name and SSH key/API token as GitHub secrets:

```bash
gh secret set EXEDEV_VM --repo OWNER/REPO --body my-vm
gh secret set EXEDEV_SSH_KEY --repo OWNER/REPO --body-file ~/.ssh/my_exedev_ci
```

Generate and register a deploy SSH key like this:

```bash
ssh-keygen -t ed25519 -C "my-app-ci" -f ~/.ssh/my_app_exedev_ci
cat ~/.ssh/my_app_exedev_ci.pub | ssh exe.dev ssh-key add
```

Generate a control-plane API token when CI needs exe.dev commands such as `ls`, `new`, `resize`, or `restart`:

```bash
ssh exe.dev ssh-key generate-api-key \
  --label=my-app-github-actions \
  --cmds=ls,new,resize,restart,whoami \
  --exp=90d
```

Generate a VM-scoped HTTPS token when a service needs authenticated HTTP access through the exe.dev proxy:

```bash
ssh exe.dev ssh-key generate-api-key --vm=my-vm --label=deploy
```

Use VM tokens with `X-Exedev-Authorization: Bearer <token>` rather than the generic `Authorization` header when possible.

The HTTPS API is the SSH API in a POST body. Use it only when SSH is awkward (CI systems, webhooks, external automation):

```bash
curl -X POST https://exe.dev/exec \
  -H "Authorization: Bearer $EXEDEV_API_TOKEN" \
  -d 'ls'
```

API responses are JSON; `/exec` has no stdin/pty, a 64KB body limit, and a 30s timeout. Scope tokens narrowly with `--cmds` and expirations.

## Proxy, sharing, and domains

- exe.dev serves VMs at `https://<vm>.exe.xyz/` with TLS termination.
- Private is the default. Use `ssh exe.dev share set-public <vm>` only for public sites.
- To target a specific app port:
  ```bash
  ssh exe.dev share port <vm> 8080
  ```
- For a subdomain, create a DNS CNAME:
  ```text
  app.example.com CNAME vmname.exe.xyz
  ```
- For an apex domain, use provider-specific ALIAS/ANAME/CNAME-flattening if available. Cloudflare must be DNS-only (grey cloud) unless using a Worker/Snippet that preserves the exe.dev target.
- Wildcard domains are not supported for automatic TLS; add explicit names.
- Private/shared sites inject authenticated user headers: `X-ExeDev-UserID` and `X-ExeDev-Email`. Public sites only include them after the user logs in via `/__exe.dev/login?redirect=/path`.
- For Vite dev servers, configure `server.host='0.0.0.0'` and `server.allowedHosts=['my-vm.exe.xyz']`. For Next.js >=15.2, add `allowedDevOrigins: ['my-vm.exe.xyz', 'my-vm.exe.xyz:8000']` and run with `-H 0.0.0.0`.

## Files and private registries

Copy ad-hoc files with `scp` or tar-over-ssh:

```bash
scp file.txt vm.exe.xyz:~/
scp -r dir vm.exe.xyz:~/
tar cf - file dir | ssh vm.exe.xyz 'tar xf - -C ~/target'
```

For private GHCR/Docker Hub images, prefer `--registry-auth USER:TOKEN`. GHCR pull tokens usually need a classic PAT with `read:packages`. For heavier private-image workflows, exe.dev can also host a Docker registry on a VM and create other VMs from `registry-vm.exe.xyz/image:tag`.

## Integrations

Use integrations when a VM needs access to a third-party service or another VM without storing extractable secrets on disk.

```bash
ssh exe.dev integrations list
ssh exe.dev integrations setup github --verify
ssh exe.dev integrations add github --name repo --repository owner/repo --attach vm:my-vm
ssh exe.dev integrations add http-proxy --name api --target https://api.example.com --bearer "$API_TOKEN" --attach tag:prod
ssh exe.dev integrations attach api vm:my-vm
ssh exe.dev integrations detach api vm:my-vm
```

From inside the VM, integrations are reached at `http://<name>.int.exe.xyz/`. GitHub integrations support cloning private repos from integration hostnames and `gh` with `GH_HOST=<name>.int.exe.xyz`. HTTP proxy integrations inject headers/bearer tokens. Use `--peer` for VM-to-VM proxying; exe.dev injects a VM-scoped token and sets `X-Exedev-Source-Vm`.

The default `reflection` integration exposes VM metadata at `reflection.int.exe.xyz`; tags are useful because integrations can attach to `tag:prod` and automatically follow tagged VMs.

## Email

A VM can receive mail at `*@vm.exe.xyz`:

```bash
ssh exe.dev share receive-email vm on
ssh exe.dev share receive-email vm off
```

Delivered mail lands in `~/Maildir/new/`; process it and move messages out promptly. Receiving is limited to `*.exe.xyz`, max 1MB messages, and will be disabled if `~/Maildir/new/` grows beyond 1000 files.

VMs can send plain-text email to allowed recipients through the metadata gateway:

```bash
curl -X POST http://169.254.169.254/gateway/email/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"user@example.com","subject":"Build Complete","body":"Done"}'
```

Recipients are limited to the owner, team members, or users who have logged into the private/shared VM.

## Troubleshooting checklist

```bash
ssh exe.dev ls -l
ssh exe.dev stat <vm> --range=24h
ssh exe.dev share show <vm>
ssh <vm>.exe.xyz 'docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"'
ssh <vm>.exe.xyz 'sudo docker logs --tail=200 <container>'
ssh <vm>.exe.xyz 'sudo docker compose -f /data/<app>.compose.yaml ps'
ssh <vm>.exe.xyz 'sudo docker compose -f /data/<app>.compose.yaml logs --tail=200'
```

Common fixes:

- Image pull fails: confirm GHCR login/token and `--registry-auth` or remote `docker login`.
- Site unreachable: check container port, Dockerfile `EXPOSE`, and `ssh exe.dev share port`.
- Auth prompt appears for a public site: run `ssh exe.dev share set-public <vm>` intentionally.
- Data missing after deploy: make sure state is written under `/data` and mounted into the container.
