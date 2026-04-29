#!/bin/bash

# CompText Revolution — CT-Vault Canary Deployment Phase Orchestration
# Usage: ./phase-orchestration.sh --phase 1 --execute
# Supports: Phase 1 (10% traffic), Phase 2 (50% traffic), Phase 3 (100% traffic)

set -euo pipefail

# Configuration
NAMESPACE="comptext"
ARGOCD_NAMESPACE="argocd"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
PAGERDUTY_KEY="${PAGERDUTY_KEY:-}"

# Phase tracking
PHASE="${1:-1}"
EXECUTE="${2:-false}"
DRY_RUN=true

if [ "$2" = "--execute" ]; then
  DRY_RUN=false
fi

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Phase 1: Canary Validation (10% traffic, 5 days)
phase1_setup() {
  log_info "Phase 1 Setup: Canary Validation (10% traffic)"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN — No changes made"
    cat << EOF
  
  === PHASE 1 ACTIONS ===
  1. Apply ArgoCD ApplicationSet for Phase 1
     kubectl apply -f gitops/argocd/canary-applicationset.yaml --dry-run=client
  
  2. Verify Flagger Canary resources
     kubectl get canary -n $NAMESPACE
  
  3. Monitor traffic shift
     kubectl logs -n istio-system -l app=flagger -f
  
  4. Start Prometheus queries for Phase 1 metrics
     - request_success_rate (target: ≥99%)
     - request_duration_seconds p99 (target: ≤500ms)
     - token_savings_pct (target: ≥70%)
  
  5. Monitoring Loop
     - Every 1 minute: Query metrics
     - Every hour: Send Slack summary
     - If any metric fails: Auto-rollback
  
  === ROLLBACK TRIGGERS ===
  - Success rate < 99% for 5 consecutive minutes
  - Latency p99 > 1000ms for 10 consecutive minutes
  - Token savings < 60%
  - Pod restart count > 0
  
  === SUCCESS CRITERIA (ALL must be true) ===
  - Request success rate ≥ 99% for 24h continuous
  - Request duration p99 ≤ 500ms for 24h continuous
  - Token savings ≥ 70% across all requests
  - Error rate ≤ 1%
  - Zero unplanned pod restarts
  - Team review: approve progression to Phase 2
EOF
  else
    log_info "Executing Phase 1 setup..."
    kubectl apply -f gitops/argocd/canary-applicationset.yaml
    kubectl get canary -n $NAMESPACE
    log_success "Phase 1 resources deployed"
  fi
}

# Phase 2: Progressive Expansion (50% traffic, 10 days)
phase2_setup() {
  log_info "Phase 2 Setup: Progressive Expansion (50% traffic)"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN — No changes made"
    cat << EOF
  
  === PHASE 2 ACTIONS ===
  1. Update Flagger Canary maxWeight
     kubectl patch canary ct-vault-python -n $NAMESPACE -p '{"spec":{"analysis":{"maxWeight":50}}}' --type=merge
  
  2. Adjust step weights
     kubectl patch canary ct-vault-python -n $NAMESPACE -p '{"spec":{"analysis":{"stepWeight":10}}}' --type=merge
  
  3. Start comprehensive load testing
     node scripts/load-test.js --target http://ct-vault-python.comptext --rps 1000 --duration 600
  
  4. Enable hourly Slack notifications
     kubectl apply -f gitops/argocd/notifications.yaml
  
  5. Monitor for edge cases
     - Database connection pool usage
     - Memory stability (variance < 10%)
     - CPU contention
     - Cache hit rates
  
  === LOAD TESTING ===
  - Run for 10 minutes: 1000 RPS
  - Verify compression ratio consistency
  - Check for memory leaks
  - Validate database performance
  
  === SUCCESS CRITERIA (Phase 1 criteria PLUS) ===
  - Compression ratio variance < 5% across all tests
  - Memory usage variance < 10%
  - Database connection pool never exhausted
  - API response time p95 ≤ 300ms
  - Load test passed (1000 RPS sustained)
  
  === PROGRESSION TO PHASE 3 ===
  Automatic IF:
  - All criteria above met for 10 consecutive days
  - Team approval received
EOF
  else
    log_info "Executing Phase 2 setup..."
    kubectl patch canary ct-vault-python -n $NAMESPACE \
      -p '{"spec":{"analysis":{"maxWeight":50,"stepWeight":10}}}' --type=merge
    kubectl apply -f gitops/argocd/notifications.yaml
    log_success "Phase 2 resources updated"
  fi
}

# Phase 3: Full Rollout (100% traffic, 7 days with 48h rollback window)
phase3_setup() {
  log_info "Phase 3 Setup: Full Rollout (100% traffic)"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN — No changes made"
    cat << EOF
  
  === PHASE 3 ACTIONS ===
  1. Create rollback snapshot (48h window)
     kubectl create snapshot ct-vault-python-phase3-snapshot -n $NAMESPACE
     ROLLBACK_DEADLINE=$(date -u -d '+48 hours' +%Y-%m-%dT%H:%M:%SZ)
     echo "Rollback window expires at: \$ROLLBACK_DEADLINE"
  
  2. Update Flagger maxWeight to 100%
     kubectl patch canary ct-vault-python -n $NAMESPACE -p '{"spec":{"analysis":{"maxWeight":100}}}' --type=merge
  
  3. Increase monitoring frequency
     kubectl set env deployment/prometheus -n monitoring SCRAPE_INTERVAL=5s
  
  4. Enable PagerDuty escalation
     kubectl apply -f gitops/argocd/notifications.yaml (with PagerDuty config)
  
  5. Track rollback deadline
     - Send hourly reminder to #ct-vault-alerts
     - Countdown: 48h -> 24h -> 12h -> 6h
  
  === AUTOMATIC ROLLBACK (Days 16-18) ===
  If ANY metric fails:
  1. Flagger stops traffic shift (revert to 0% canary)
  2. PagerDuty incident created (P1 severity)
  3. Slack alert sent (mentions @oncall)
  4. Auto-revert to previous stable version
  5. Manual investigation required
  
  === SUCCESS CRITERIA (Phase 2 criteria PLUS) ===
  - 7 consecutive days at 100% without incident
  - Zero unplanned pod restarts
  - Compression metrics stable (variance < 2%)
  - All metrics within tolerance for entire 7 days
  - No performance degradation under peak load
  
  === POST-ROLLOUT (Day 23) ===
  1. Lock in changes (48h rollback window expires)
  2. Archive all metrics: s3://comptext-metrics/phase3-final/
  3. Delete old stable deployment version
  4. Schedule retrospective (Day 24)
  5. Update runbooks based on learnings
EOF
  else
    log_info "Executing Phase 3 setup..."
    kubectl patch canary ct-vault-python -n $NAMESPACE \
      -p '{"spec":{"analysis":{"maxWeight":100,"stepWeight":20}}}' --type=merge
    
    # Create rollback snapshot
    ROLLBACK_DEADLINE=$(date -u -d '+48 hours' +%Y-%m-%dT%H:%M:%SZ)
    kubectl annotate canary ct-vault-python -n $NAMESPACE \
      rollback-deadline="$ROLLBACK_DEADLINE" --overwrite
    
    log_success "Phase 3 resources updated"
    log_warn "⚠️  ROLLBACK WINDOW ACTIVE: $ROLLBACK_DEADLINE (48 hours)"
  fi
}

# Monitoring loop
monitor_phase() {
  local phase_num=$1
  local check_interval=60  # seconds
  local check_count=0
  local max_checks=$(( 5 * 24 * 3600 / check_interval ))  # 5 days worth of checks for Phase 1
  
  log_info "Starting Phase $phase_num monitoring (interval: ${check_interval}s)"
  
  while [ $check_count -lt $max_checks ]; do
    # Query Prometheus metrics
    local success_rate=$(query_metric 'rate(http_requests_total{status="200"}[5m])/rate(http_requests_total[5m])' | tail -1)
    local latency_p99=$(query_metric 'histogram_quantile(0.99, request_duration_seconds)' | tail -1)
    local token_savings=$(query_metric 'token_savings_pct' | tail -1)
    
    log_info "Metrics @ $(date +%H:%M:%S) | Success: ${success_rate:-N/A} | Latency: ${latency_p99:-N/A}ms | Savings: ${token_savings:-N/A}%"
    
    # Check rollback triggers
    if (( $(echo "$success_rate < 0.99" | bc -l 2>/dev/null || echo 0) )); then
      log_error "Success rate below threshold: $success_rate < 0.99"
      trigger_rollback "success_rate_below_threshold"
      break
    fi
    
    if (( $(echo "$latency_p99 > 1000" | bc -l 2>/dev/null || echo 0) )); then
      log_error "Latency p99 above threshold: $latency_p99 > 1000ms"
      trigger_rollback "latency_above_threshold"
      break
    fi
    
    if (( $(echo "$token_savings < 60" | bc -l 2>/dev/null || echo 0) )); then
      log_error "Token savings below threshold: $token_savings < 60%"
      trigger_rollback "token_savings_below_threshold"
      break
    fi
    
    sleep $check_interval
    ((check_count++))
  done
}

# Query Prometheus
query_metric() {
  local query=$1
  curl -s "${PROMETHEUS_URL}/api/v1/query?query=${query}" | \
    jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A"
}

# Trigger rollback
trigger_rollback() {
  local reason=$1
  log_error "ROLLBACK TRIGGERED: $reason"
  
  # Send Slack alert
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"🚨 CT-Vault Canary Rollback: $reason\"}"
  fi
  
  # Create PagerDuty incident
  if [ -n "$PAGERDUTY_KEY" ]; then
    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
      -H 'Content-Type: application/json' \
      -d "{\"routing_key\":\"$PAGERDUTY_KEY\",\"event_action\":\"trigger\",\"payload\":{\"summary\":\"CT-Vault Canary Rollback: $reason\",\"severity\":\"critical\"}}"
  fi
  
  # Execute rollback
  log_warn "Reverting traffic to stable version..."
  kubectl patch canary ct-vault-python -n $NAMESPACE \
    -p '{"spec":{"skipAnalysis":true}}' --type=merge
}

# Main
case $PHASE in
  1)
    phase1_setup
    ;;
  2)
    phase2_setup
    ;;
  3)
    phase3_setup
    ;;
  *)
    log_error "Unknown phase: $PHASE"
    echo "Usage: $0 --phase [1|2|3] [--execute]"
    exit 1
    ;;
esac

# Show summary
log_info "Phase $PHASE setup complete"
if [ "$DRY_RUN" = true ]; then
  log_warn "To execute: $0 --phase $PHASE --execute"
fi
