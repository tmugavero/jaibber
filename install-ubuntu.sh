#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Jaibber — Ubuntu install script
# Sets up all prerequisites and runs the app in dev mode.
# Tested on Ubuntu 22.04+ and Debian 12+.
# Usage: bash install-ubuntu.sh   (do NOT run with sudo)
# ──────────────────────────────────────────────────────────────────────────────
set -e

# Guard: never run this script as root — npm install as root causes permission
# errors on node_modules/.vite that prevent Vite from starting.
if [ "$EUID" -eq 0 ]; then
  echo "Error: do not run this script as root / with sudo."
  echo "Run as your normal user: bash install-ubuntu.sh"
  exit 1
fi

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo -e "\n${CYAN}⚡ Jaibber — Ubuntu Setup${NC}"
echo "────────────────────────────────────────"

# ── 1. System packages ────────────────────────────────────────────────────────
step "Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  git
ok "System packages installed"

# ── 2. Node.js via nvm ────────────────────────────────────────────────────────
step "Setting up Node.js..."
if command -v node &>/dev/null; then
  ok "Node.js already installed: $(node --version)"
else
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # Load nvm in this shell session
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
  nvm install --lts
  ok "Node.js installed: $(node --version)"
fi

# Make sure nvm is loaded if already installed
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# ── 3. Rust ───────────────────────────────────────────────────────────────────
step "Setting up Rust..."
if command -v rustc &>/dev/null; then
  ok "Rust already installed: $(rustc --version)"
else
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
  ok "Rust installed"
fi
# Load cargo in this shell session
source "$HOME/.cargo/env"

# ── 4. Claude Code ────────────────────────────────────────────────────────────
step "Setting up Claude Code..."
if command -v claude &>/dev/null; then
  ok "Claude Code already installed: $(claude --version 2>/dev/null || echo 'installed')"
else
  npm install -g @anthropic-ai/claude-code
  ok "Claude Code installed"
fi

# ── 5. Project dependencies ───────────────────────────────────────────────────
step "Installing npm dependencies..."
# Fix ownership BEFORE npm install — if node_modules exists but is owned by root
# (from a previous sudo run), npm install will fail with EACCES immediately.
if [ -d "node_modules" ]; then
  sudo chown -R "$USER":"$USER" node_modules
fi
npm install
ok "npm packages installed"

# ── 6. Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}────────────────────────────────────────${NC}"
echo -e "${GREEN}✓ All prerequisites installed!${NC}"
echo ""
echo "You have two options:"
echo ""
echo -e "  ${CYAN}Option A: Desktop app (with GUI)${NC}"
echo -e "    npm run tauri dev"
echo "    First run compiles Rust — takes ~3-5 min."
echo "    Log in, add your API key in Settings, and register a project."
echo ""
echo -e "  ${CYAN}Option B: Headless agent (no GUI)${NC}"
echo -e "    npx @jaibber/sdk \\"
echo -e "      --username my-bot --password s3cret \\"
echo -e "      --agent-name \"CodingAgent\" \\"
echo -e "      --anthropic-key sk-ant-api03-..."
echo "    No desktop required — runs as a background process."
echo ""
echo "See AGENT_SETUP.md for full setup instructions."
echo ""
