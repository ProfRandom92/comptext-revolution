# CompText Revolution - Secondary Storage Configuration

## Overview

The CompText Revolution system supports multiple independent storage devices for optimal performance and data organization:

- **Sessions Database** (`/data/sessions`) - SQLite with WAL mode
- **Search Index** (`/data/index`) - BM25 full-text search data
- **Cache Layer** (`/data/cache`) - Temporary processing cache
- **Log Files** (`/data/logs`) - Operational and debug logs

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         CompText Revolution Platform                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Docker Container (comptext-mcp)                │   │
│  │                                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │ Sessions DB  │  │ Index Data   │            │   │
│  │  │ /data/...    │  │ /data/...    │            │   │
│  │  └──────────────┘  └──────────────┘            │   │
│  │         │                   │                   │   │
│  └─────────┼───────────────────┼───────────────────┘   │
│            │                   │                       │
│        Volume Mount         Volume Mount              │
│            ↓                   ↓                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Secondary Storage Device (D:/ or /mnt/drive2/)       │
│  ├── sessions/     (SQLite DB)                        │
│  ├── index/        (Full-text search)                 │
│  ├── cache/        (Temp processing)                  │
│  └── logs/         (Operational logs)                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Setup Instructions

### 1. Linux/macOS

#### Automatic Setup
```bash
chmod +x scripts/setup-secondary-storage.sh
./scripts/setup-secondary-storage.sh
```

This script will:
- Detect available storage devices
- Create directory structure
- Test write permissions
- Generate `.env.secondary` configuration
- Create backup of existing data

#### Manual Setup

**Step 1: Identify secondary device**
```bash
# Linux
lsblk
# macOS
diskutil list
```

**Step 2: Mount device (if not already mounted)**
```bash
# Example: Mount /dev/sdb1 to /mnt/drive2
sudo mkdir -p /mnt/drive2
sudo mount /dev/sdb1 /mnt/drive2
```

**Step 3: Create directories**
```bash
sudo mkdir -p /mnt/drive2/comptext/{sessions,index,cache,logs}
sudo chown $USER:$USER /mnt/drive2/comptext -R
chmod 755 /mnt/drive2/comptext -R
```

**Step 4: Configure environment**
```bash
cat > .env << EOF
COMPTEXT_SESSIONS_MOUNT=/mnt/drive2/comptext/sessions
COMPTEXT_INDEX_MOUNT=/mnt/drive2/comptext/index
COMPTEXT_CACHE_MOUNT=/mnt/drive2/comptext/cache
COMPTEXT_LOGS_MOUNT=/mnt/drive2/comptext/logs
NODE_ENV=production
COMPTEXT_STORAGE_DEVICE=secondary
EOF
```

**Step 5: Start Docker**
```bash
docker-compose --env-file .env up -d
```

---

### 2. Windows

#### PowerShell Setup
```powershell
# Step 1: Check available drives
Get-Volume

# Step 2: Create directories (example: using D: drive)
New-Item -ItemType Directory -Force -Path "D:\comptext\sessions"
New-Item -ItemType Directory -Force -Path "D:\comptext\index"
New-Item -ItemType Directory -Force -Path "D:\comptext\cache"
New-Item -ItemType Directory -Force -Path "D:\comptext\logs"

# Step 3: Create .env file
@"
COMPTEXT_SESSIONS_MOUNT=D:/comptext/sessions
COMPTEXT_INDEX_MOUNT=D:/comptext/index
COMPTEXT_CACHE_MOUNT=D:/comptext/cache
COMPTEXT_LOGS_MOUNT=D:/comptext/logs
NODE_ENV=production
COMPTEXT_STORAGE_DEVICE=secondary
"@ | Set-Content .env

# Step 4: Start Docker
docker-compose --env-file .env up -d
```

---

## Verification

### Check Docker Volumes
```bash
docker volume ls | grep comptext
docker volume inspect comptext-sessions
```

### Verify Container Mounts
```bash
docker exec comptext-revolution df -h /data
```

Output should show:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sdX        200G  2.0G 198G   2% /data/sessions
```

### Test Data Operations
```bash
# Run TypeScript test suite
pnpm --filter session-memory test:storage

# Or run Node script directly
node -r tsx/cjs scripts/test-secondary-storage.ts
```

Expected output:
```
✓ PASS Directory: sessions
✓ PASS Directory: index
✓ PASS Directory: cache
✓ PASS Directory: logs
✓ PASS Database Operations
✓ PASS Disk Space

Summary: 6/6 tests passed
```

---

## Performance Optimization

### Recommended Configuration by Drive Type

#### SSD (Primary)
```env
COMPTEXT_SESSIONS_MOUNT=/ssd1/comptext/sessions
COMPTEXT_INDEX_MOUNT=/ssd1/comptext/index
COMPTEXT_CACHE_MOUNT=/ssd1/comptext/cache
COMPTEXT_LOGS_MOUNT=/ssd2/comptext/logs
```
- Sessions: High IOPS for SQLite WAL writes
- Index: Frequent reads for BM25 search
- Cache: Ephemeral, benefits from speed
- Logs: Can use slower secondary SSD

#### HDD (Archive/Backup)
```env
COMPTEXT_SESSIONS_MOUNT=/ssd/comptext/sessions
COMPTEXT_INDEX_MOUNT=/ssd/comptext/index
COMPTEXT_CACHE_MOUNT=/ssd/comptext/cache
COMPTEXT_LOGS_MOUNT=/hdd/comptext/logs
```
- Sessions/Index/Cache: Keep on fast SSD
- Logs: Archive to slower HDD

#### NAS/Network Storage
```env
COMPTEXT_SESSIONS_MOUNT=/mnt/nas/comptext/sessions
COMPTEXT_INDEX_MOUNT=/mnt/nas/comptext/index
COMPTEXT_CACHE_MOUNT=/mnt/nas/comptext/cache
COMPTEXT_LOGS_MOUNT=/mnt/nas/comptext/logs
```
- Ensure consistent network connectivity
- Monitor latency (target: <10ms)

---

## Monitoring Storage

### Real-time Monitoring
```bash
# Run included monitoring script
./scripts/monitor-secondary-storage.sh

# Or manual monitoring
watch -n 5 'du -sh /mnt/drive2/comptext/*'
```

### Container Logs
```bash
docker logs comptext-revolution --follow

# Filter by storage operations
docker logs comptext-revolution --follow | grep -i "storage\|database\|checkpoint"
```

### Database Statistics
```bash
# Connect to SQLite and check stats
docker exec comptext-revolution sqlite3 /data/sessions/comptext.db

# Inside sqlite3:
.tables
SELECT COUNT(*) FROM sessions;
SELECT COUNT(*) FROM session_events;
.quit
```

---

## Troubleshooting

### Issue: Permission Denied
```bash
# Fix: Ensure user ownership
sudo chown -R $USER:$USER /mnt/drive2/comptext
sudo chmod -R 755 /mnt/drive2/comptext
```

### Issue: Disk Space Full
```bash
# Check which directory is consuming space
du -sh /mnt/drive2/comptext/*

# Clear cache if needed
rm -rf /data/cache/*
docker exec comptext-revolution rm -rf /data/cache/*
```

### Issue: Database Lock
```bash
# Check SQLite status
docker exec comptext-revolution sqlite3 /data/sessions/comptext.db ".tables"

# If locked, restart container
docker restart comptext-revolution

# Verify WAL checkpoint
docker exec comptext-revolution sqlite3 /data/sessions/comptext.db "PRAGMA journal_mode; PRAGMA busy_timeout=3000;"
```

### Issue: Slow Performance
```bash
# Test I/O performance
time dd if=/dev/zero of=/mnt/drive2/test-io bs=1M count=100

# Expected: 100MB in <5 seconds (20MB/s)
# If slower, check drive health or network latency
```

---

## Data Migration

### From Default Location to Secondary Device

```bash
# Step 1: Stop Docker
docker-compose down

# Step 2: Create backup
cp -r ~/.comptext ./backup-$(date +%s)

# Step 3: Copy to secondary device
cp -r ~/.comptext/* /mnt/drive2/comptext/sessions/

# Step 4: Update .env
echo 'COMPTEXT_SESSIONS_MOUNT=/mnt/drive2/comptext/sessions' >> .env

# Step 5: Restart with new configuration
docker-compose --env-file .env up -d

# Step 6: Verify migration
docker exec comptext-revolution ls -la /data/sessions
```

---

## Docker Compose Environment Variables

The `docker-compose.yml` uses these variables to mount storage:

| Variable | Default | Purpose |
|----------|---------|---------|
| `COMPTEXT_SESSIONS_MOUNT` | `/var/lib/comptext/sessions` | SQLite database location |
| `COMPTEXT_INDEX_MOUNT` | `/var/lib/comptext/index` | Full-text search index |
| `COMPTEXT_CACHE_MOUNT` | `/var/lib/comptext/cache` | Temporary cache storage |
| `COMPTEXT_LOGS_MOUNT` | `/var/lib/comptext/logs` | Application logs |
| `COMPTEXT_STORAGE_DEVICE` | `secondary` | Storage mode flag |

All variables can be overridden via `.env` file or command-line:
```bash
docker-compose -e COMPTEXT_SESSIONS_MOUNT=/custom/path up -d
```

---

## Performance Expectations

### SQLite on SSD
- Write latency: 5-10ms (WAL mode)
- Read latency: 2-5ms
- Throughput: 50,000+ ops/min

### Full-Text Index
- Index building: 1000 docs/sec
- Search latency: <50ms (p99)
- Memory footprint: <100MB per 10K documents

### Caching Layer
- Cache hit ratio: 70-85%
- Eviction time: <1ms
- Cache size: 100-500MB (configurable)

---

## Production Checklist

- [ ] Secondary device mounted and accessible
- [ ] Directories created with correct permissions
- [ ] `.env` file configured with mount paths
- [ ] Docker compose tested with new paths
- [ ] Data verification completed
- [ ] Monitoring script configured
- [ ] Backup strategy in place
- [ ] Performance baseline established
- [ ] Documentation updated for ops team

---

## Support

For issues with storage configuration:
1. Check `docker logs comptext-revolution` for errors
2. Verify mount permissions: `docker exec comptext-revolution mount | grep data`
3. Run test suite: `pnpm --filter session-memory test:storage`
4. Check disk health: `df -h` (Linux) or `Get-Volume` (Windows)

---

**Version**: 0.1.0  
**Last Updated**: 2026-04-28
