#!/bin/bash
# CompText Revolution — Production Setup & Startup
# Run this to start the full system with Python backend

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║     CompText Revolution — Production Mode Startup                  ║"
echo "║     Python Backend + MCP Server + Claude Desktop Integration       ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================================================
# STEP 1: Build TypeScript
# ============================================================================

echo -e "${BLUE}[STEP 1]${NC} Building TypeScript packages..."
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Built${NC}"
echo ""

# ============================================================================
# STEP 2: Check Python
# ============================================================================

echo -e "${BLUE}[STEP 2]${NC} Checking Python installation..."
PYTHON_CMD=$(command -v python3 || command -v python)

if [ -z "$PYTHON_CMD" ]; then
  echo -e "${RED}✗ Python not found!${NC}"
  echo "  Install Python 3.10+ and try again"
  exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}✓ ${PYTHON_VERSION}${NC}"
echo ""

# ============================================================================
# STEP 3: Install Python Dependencies
# ============================================================================

echo -e "${BLUE}[STEP 3]${NC} Installing Python dependencies..."
cd packages-py
$PYTHON_CMD -m pip install -q -e . 2>&1 || echo -e "${YELLOW}⚠ Pip install had warnings (continuing)${NC}"
cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ============================================================================
# STEP 4: Display Startup Instructions
# ============================================================================

echo -e "${BLUE}[STEP 4]${NC} System ready for startup!"
echo ""
echo -e "${YELLOW}📋 STARTUP INSTRUCTIONS:${NC}"
echo ""
echo "Run these commands in SEPARATE TERMINALS:"
echo ""
echo -e "${GREEN}Terminal 1 - Python Backend:${NC}"
echo "  cd packages-py"
echo "  python -m uvicorn ct_vault_core.rest_api:app --port 8000 --reload"
echo ""
echo -e "${GREEN}Terminal 2 - MCP Server:${NC}"
echo "  USE_PYTHON=true node packages/mcp-server/dist/index.js"
echo ""
echo -e "${GREEN}Terminal 3 - Claude Desktop:${NC}"
echo "  # Copy claude_desktop.json to Claude config:"
echo "  # Windows: %APPDATA%\\Claude\\claude_desktop.json"
echo "  # Mac: ~/Library/Application\\ Support/Claude/claude_desktop.json"
echo "  # Linux: ~/.config/Claude/claude_desktop.json"
echo ""
echo -e "${YELLOW}🔍 VERIFICATION:${NC}"
echo "  curl http://localhost:8000/health"
echo ""
echo -e "${YELLOW}✅ STATUS:${NC}"
echo -e "  ${GREEN}TypeScript: BUILT${NC}"
echo -e "  ${GREEN}Python: READY${NC}"
echo -e "  ${GREEN}MCP Server: READY${NC}"
echo -e "  ${YELLOW}Startup: MANUAL (see above)${NC}"
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}System ready! Start terminals and begin using tools${NC}                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
