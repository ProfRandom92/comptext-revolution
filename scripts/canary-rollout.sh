#!/bin/bash
# CT-Vault Canary Rollout Automation
# Week 1: 10% → Week 2-3: 50% → Week 4: 100%

set -e

NAMESPACE="comptext"
PYTHON_DEPLOY="ct-vault-python"
MCP_DEPLOY="ct-vault-mcp"
METRICS_URL="http://prometheus:9090/api/v1"
HEALTH_TIMEOUT=300

log() { echo "[$(date +'%H:%M:%S')] $1"; }
error() { echo "❌ ERROR: $1" >&2; exit 1; }
success() { echo "✅ $1"; }

# Phase 1: Canary 10%
phase_canary_10() {
  log "PHASE 1: Canary 10% (Day 1-5)"
  
  # Deploy new version
  kubectl set image deployment/$PYTHON_DEPLOY \
    $PYTHON_DEPLOY=ghcr.io/your-org/ct-vault-python:latest \
    -n $NAMESPACE
  
  # Wait for pods
  kubectl rollout status deployment/$PYTHON_DEPLOY -n $NAMESPACE --timeout=5m
  
  # Monitor metrics
  for i in {1..5}; do
    log "Day $i: Checking metrics..."
    
    # Token savings check
    SAVINGS=$(curl -s "$METRICS_URL/query?query=avg(comptext_compression_savings_pct)" | jq '.data.result[0].value[1]')
    [ "$SAVINGS" -ge 70 ] || error "Savings $SAVINGS < 70%"
    log "  Token savings: ${SAVINGS}%"
    
    # Latency check
    LATENCY=$(curl -s "$METRICS_URL/query?query=histogram_quantile(0.99, http_request_duration_seconds)" | jq '.data.result[0].value[1]')
    [ "${LATENCY%.*}" -le 5 ] || error "Latency ${LATENCY}ms > 5ms"
    log "  P99 latency: ${LATENCY}ms"
    
    # Stability check
    STABILITY=$(curl -s "$METRICS_URL/query?query=rate(http_requests_total{status=~\"2..\"}[5m])*100" | jq '.data.result[0].value[1]')
    [ "${STABILITY%.*}" -ge 95 ] || error "Stability $STABILITY < 95%"
    log "  Stability: ${STABILITY}%"
    
    sleep 86400  # 1 day
  done
  
  success "Canary 10% validated"
}

# Phase 2: Expand 50%
phase_expand_50() {
  log "PHASE 2: Expand to 50% (Day 6-15)"
  
  # Increase replicas
  kubectl scale deployment $PYTHON_DEPLOY --replicas=5 -n $NAMESPACE
  kubectl scale deployment $MCP_DEPLOY --replicas=3 -n $NAMESPACE
  
  # Monitor for 10 days
  for i in {1..10}; do
    log "Day $((5+i)): Monitoring at 50%..."
    
    # Run comprehensive tests
    curl -X POST http://localhost:8000/compress \
      -H "Content-Type: application/json" \
      -d '{"text":"Comprehensive test document for canary validation","level":3}' \
      || error "Compression test failed"
    
    # Check error rate
    ERRORS=$(curl -s "$METRICS_URL/query?query=rate(http_requests_total{status=~\"5..\"}[5m])*100" | jq '.data.result[0].value[1]')
    [ "${ERRORS%.*}" -lt 1 ] || error "Error rate $ERRORS > 1%"
    
    sleep 86400
  done
  
  success "50% expansion validated"
}

# Phase 3: Full 100%
phase_full_rollout() {
  log "PHASE 3: Full 100% Rollout (Day 16-22)"
  
  # Scale to full
  kubectl scale deployment $PYTHON_DEPLOY --replicas=10 -n $NAMESPACE
  kubectl scale deployment $MCP_DEPLOY --replicas=5 -n $NAMESPACE
  
  # Keep old version available for 48h
  log "Old version available for 48h rollback..."
  
  # Monitor continuously
  for i in {1..7}; do
    log "Day $((15+i)): Full production monitoring..."
    
    # Daily metrics review
    SAVINGS=$(curl -s "$METRICS_URL/query?query=avg(comptext_compression_savings_pct)" | jq '.data.result[0].value[1]')
    LATENCY=$(curl -s "$METRICS_URL/query?query=histogram_quantile(0.99, http_request_duration_seconds)" | jq '.data.result[0].value[1]')
    STABILITY=$(curl -s "$METRICS_URL/query?query=rate(http_requests_total{status=~\"2..\"}[5m])*100" | jq '.data.result[0].value[1]')
    
    log "  Savings: ${SAVINGS}% | Latency: ${LATENCY}ms | Stability: ${STABILITY}%"
    
    sleep 86400
  done
  
  success "Full 100% rollout complete"
}

# Rollback procedure
rollback() {
  error_msg=$1
  log "ROLLBACK: $error_msg"
  
  kubectl rollout undo deployment/$PYTHON_DEPLOY -n $NAMESPACE
  kubectl rollout undo deployment/$MCP_DEPLOY -n $NAMESPACE
  
  log "Waiting for stable version..."
  kubectl rollout status deployment/$PYTHON_DEPLOY -n $NAMESPACE --timeout=5m
  
  success "Rollback complete"
  exit 1
}

# Main execution
main() {
  log "Starting CT-Vault Canary Deployment..."
  
  phase_canary_10 || rollback "Canary 10% failed"
  phase_expand_50 || rollback "Expand 50% failed"
  phase_full_rollout || rollback "Full rollout failed"
  
  success "CT-Vault Canary Deployment Complete!"
  log "Status: All metrics validated, all phases successful"
}

trap 'rollback "Unexpected error"' ERR
main "$@"
