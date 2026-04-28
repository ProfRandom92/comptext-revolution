#!/bin/bash
# CompText Revolution - Secondary Storage Setup & Migration Script
# Configures and tests separate data storage device

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CompText Revolution - Secondary Storage Setup               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"

# Detect OS
OS_TYPE=$(uname -s)
if [[ "$OS_TYPE" == "Darwin" ]]; then
  DISK_CMD="diskutil list"
elif [[ "$OS_TYPE" == "Linux" ]]; then
  DISK_CMD="lsblk"
else
  echo -e "${RED}Unsupported OS: $OS_TYPE${NC}"
  exit 1
fi

# 1. Display available drives
echo -e "\n${YELLOW}Available Storage Devices:${NC}"
$DISK_CMD
read -p "Enter secondary drive mount path (e.g., /mnt/drive2): " SECONDARY_MOUNT

# 2. Create directories on secondary device
echo -e "\n${YELLOW}Creating directories on secondary device...${NC}"
sudo mkdir -p "$SECONDARY_MOUNT/comptext/{sessions,index,cache,logs}"
sudo chown "$USER:$USER" "$SECONDARY_MOUNT/comptext" -R
chmod 755 "$SECONDARY_MOUNT/comptext" -R

echo -e "${GREEN}✓ Created directories:${NC}"
ls -la "$SECONDARY_MOUNT/comptext"

# 3. Create .env file for secondary storage
echo -e "\n${YELLOW}Creating .env configuration...${NC}"
cat > .env.secondary << EOF
# CompText Revolution - Secondary Storage Configuration
COMPTEXT_SESSIONS_MOUNT=$SECONDARY_MOUNT/comptext/sessions
COMPTEXT_INDEX_MOUNT=$SECONDARY_MOUNT/comptext/index
COMPTEXT_CACHE_MOUNT=$SECONDARY_MOUNT/comptext/cache
COMPTEXT_LOGS_MOUNT=$SECONDARY_MOUNT/comptext/logs

NODE_ENV=production
COMPTEXT_STORAGE_DEVICE=secondary
COMPTEXT_DB_PATH=/data/sessions/comptext.db
COMPTEXT_INDEX_PATH=/data/index
COMPTEXT_CACHE_PATH=/data/cache
COMPTEXT_LOGS_PATH=/data/logs
EOF

echo -e "${GREEN}✓ Created .env.secondary${NC}"

# 4. Backup existing data if present
echo -e "\n${YELLOW}Checking for existing data to migrate...${NC}"
if [ -d "$HOME/.comptext" ]; then
  BACKUP_DIR="${SECONDARY_MOUNT}/comptext/backup-$(date +%s)"
  mkdir -p "$BACKUP_DIR"
  cp -r "$HOME/.comptext/"* "$BACKUP_DIR/" 2>/dev/null || true
  echo -e "${GREEN}✓ Backed up existing data to: $BACKUP_DIR${NC}"
fi

# 5. Test directory permissions and write access
echo -e "\n${YELLOW}Testing secondary device...${NC}"
TEST_FILE="$SECONDARY_MOUNT/comptext/test-$(date +%s).txt"
echo "CompText test write - $(date)" > "$TEST_FILE"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Write test passed${NC}"
  rm "$TEST_FILE"
else
  echo -e "${RED}✗ Write test failed - check permissions${NC}"
  exit 1
fi

# 6. Check available space
SPACE=$(df "$SECONDARY_MOUNT" | awk 'NR==2 {print $4}')
echo -e "${GREEN}✓ Available space: $(numfmt --to=iec $SPACE 2>/dev/null || echo $SPACE) KB${NC}"

# 7. Display migration instructions
echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Next Steps                                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}1. Use the secondary storage configuration:${NC}"
echo -e "   ${GREEN}cp .env.secondary .env${NC}"

echo -e "\n${YELLOW}2. Start Docker with secondary storage:${NC}"
echo -e "   ${GREEN}docker-compose --env-file .env up -d${NC}"

echo -e "\n${YELLOW}3. Verify storage mount:${NC}"
echo -e "   ${GREEN}docker exec comptext-revolution ls -la /data/sessions${NC}"

echo -e "\n${YELLOW}4. Check storage device stats:${NC}"
echo -e "   ${GREEN}docker exec comptext-revolution df -h /data/${NC}"

echo -e "\n${YELLOW}5. Monitor data growth:${NC}"
echo -e "   ${GREEN}watch -n 5 'du -sh $SECONDARY_MOUNT/comptext/*'${NC}"

echo -e "\n${YELLOW}Configuration saved to: .env.secondary${NC}"
echo -e "${YELLOW}Secondary storage path: $SECONDARY_MOUNT/comptext${NC}"

# 7. Create monitoring script
cat > scripts/monitor-secondary-storage.sh << 'MONITOR_EOF'
#!/bin/bash
# Monitor secondary storage usage

watch -n 5 '
  echo "=== CompText Secondary Storage Usage ==="
  echo ""
  echo "Device Mount Points:"
  df -h | grep -E "sessions|index|cache|logs"
  echo ""
  echo "Directory Sizes:"
  du -sh /data/sessions /data/index /data/cache /data/logs 2>/dev/null || echo "No data yet"
  echo ""
  echo "Database Stats (if available):"
  sqlite3 /data/sessions/comptext.db ".tables" 2>/dev/null || echo "Database not initialized"
'
MONITOR_EOF

chmod +x scripts/monitor-secondary-storage.sh
echo -e "${GREEN}✓ Created monitoring script: scripts/monitor-secondary-storage.sh${NC}"

echo -e "\n${GREEN}Setup complete! Secondary storage configured at: $SECONDARY_MOUNT${NC}"
