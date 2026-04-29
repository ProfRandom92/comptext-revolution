## CompText Revolution - Essential Commands

**Build & Development**:
```bash
pnpm build          # Build all packages (TypeScript → dist/)
pnpm dev            # Watch mode for all packages
pnpm clean          # Clean all dist/ and build artifacts
pnpm install        # Install all dependencies
```

**Testing & Quality**:
```bash
pnpm test           # Run vitest across all packages
pnpm lint           # Run ESLint across all packages
pnpm format         # Run Prettier formatting
```

**Benchmarking**:
```bash
pnpm benchmark      # Run compression effectiveness benchmarks
pnpm benchmark:perf # Run performance & scalability tests
```

**Research/Monitoring**:
```bash
node research/autoresearch-runner.js     # Start 5-hour autonomous optimization
node research/advanced-monitoring-server.js # Start monitoring dashboards
node research/launch-autoresearch.js     # Launch with live monitoring
```

**Utilities (Windows Git Bash)**:
```bash
ls -la              # List files
cd packages/core    # Navigate
grep -r "pattern"   # Search files
find . -name "*.ts" # Find files
```

**Version & Info**:
```bash
node --version      # Check Node version (need 18+)
pnpm --version      # Check PNPM version (need 8+)
```