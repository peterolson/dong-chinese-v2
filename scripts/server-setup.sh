#!/usr/bin/env bash
#
# One-time server provisioning for Dong Chinese.
# Safe to re-run (idempotent). Run as root on Ubuntu 24.04.
#
# Usage: bash scripts/server-setup.sh

set -euo pipefail

echo "=== Dong Chinese server setup ==="

# ---------- Node.js 22 LTS via NodeSource ----------
if ! command -v node &>/dev/null || ! node -v | grep -q '^v22'; then
  echo "Installing Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  echo "Node.js 22 already installed: $(node -v)"
fi

# ---------- Caddy ----------
if ! command -v caddy &>/dev/null; then
  echo "Installing Caddy..."
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
else
  echo "Caddy already installed: $(caddy version)"
fi

# ---------- App user ----------
if ! id dong &>/dev/null; then
  echo "Creating 'dong' system user..."
  useradd --system --shell /usr/sbin/nologin --home-dir /opt/dong-chinese dong
else
  echo "User 'dong' already exists."
fi

# ---------- Directory structure ----------
echo "Ensuring directory structure..."
mkdir -p /opt/dong-chinese/{releases,shared}
chown -R dong:dong /opt/dong-chinese

# Initialize active-port if missing
if [ ! -f /opt/dong-chinese/shared/active-port ]; then
  echo "3000" > /opt/dong-chinese/shared/active-port
  chown dong:dong /opt/dong-chinese/shared/active-port
fi

# ---------- Deploy systemd service ----------
echo "Installing systemd template unit..."
cat > /etc/systemd/system/dong-chinese@.service <<'EOF'
[Unit]
Description=Dong Chinese SvelteKit app (port %i)
After=network.target

[Service]
Type=simple
User=dong
Group=dong
WorkingDirectory=/opt/dong-chinese/current
ExecStart=/usr/local/bin/node build/index.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=30

# Environment
Environment=PORT=%i
EnvironmentFile=/opt/dong-chinese/shared/.env

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadOnlyPaths=/opt/dong-chinese/current
ReadWritePaths=/opt/dong-chinese/shared

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

# ---------- Deploy Caddyfile ----------
echo "Installing Caddyfile..."
cat > /etc/caddy/Caddyfile <<'EOF'
:80 {
	encode zstd gzip

	handle /_app/immutable/* {
		header Cache-Control "public, max-age=31536000, immutable"
		reverse_proxy localhost:{$DONG_PORT:3000}
	}

	handle {
		reverse_proxy localhost:{$DONG_PORT:3000}
	}
}
EOF
systemctl restart caddy

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Create /opt/dong-chinese/shared/.env with production secrets:"
echo "     DATABASE_URL, ORIGIN, BETTER_AUTH_SECRET, PROTOCOL_HEADER, HOST_HEADER, ADDRESS_HEADER"
echo "  2. Add DEPLOY_SSH_KEY and DEPLOY_HOST secrets to GitHub"
echo "  3. Trigger the deploy workflow from GitHub Actions"
