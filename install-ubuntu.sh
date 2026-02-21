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
npm install
# Fix ownership in case anything in node_modules ended up owned by root
# (can happen if npm was previously run with sudo — prevents Vite EACCES errors)
sudo chown -R "$USER":"$USER" node_modules 2>/dev/null || true
ok "npm packages installed"

# ── 6. Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}────────────────────────────────────────${NC}"
echo -e "${GREEN}✓ All prerequisites installed!${NC}"
echo ""
echo "To start Jaibber:"
echo ""
echo -e "  ${CYAN}npm run tauri dev${NC}"
echo ""
echo "First run compiles Rust — takes ~3-5 min. Subsequent starts are fast."
echo ""
echo "In the setup wizard:"
echo "  • Handle: a unique name for this machine (e.g. ubuntu-agent)"
echo "  • Mode: Agent (to run Claude commands) or Hub (to send them)"
echo "  • Project dir: the codebase Claude should work in"
echo "  • Ably API key: same key used on your other machines"
echo ""
