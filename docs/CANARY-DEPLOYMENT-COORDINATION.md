# CompText Revolution — CT-Vault Canary Deployment Coordination

**Status**: Ready for Phase 1 Execution  
**Last Updated**: 2026-04-29  
**Owner**: DevOps / Platform Team  

---

## 🎯 Executive Summary

This document provides the complete coordination plan for the three-phase Canary Deployment of CT-Vault services (Python backend + MCP server) to production. The deployment is automated via:

- **Flagger**: Canary resource definitions & traffic shifting logic
- **ArgoCD**: GitOps ApplicationSet orchestration for phase progression
- **Prometheus**: Real-time metrics validation & alert rules
- **Bash automation**: Manual phase triggers & rollback procedures

**Total Timeline**: 22 days (5 + 10 + 7)  
**Rollback Window**: 48 hours during Phase 3  

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  GitHub (main branch)                       │
│              k8s/ + gitops/ manifests                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                    Push triggers
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   ArgoCD Server                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ApplicationSet (Phase 1/2/3)                          │  │
│  │ → Syncs Flagger Canary CRDs                          │  │
│  │ → Applies Prometheus configs                         │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
              K8s API (reconciliation)
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Flagger    │  │  Prometheus  │  │  Deployments │
│  (Istio SMI) │  │   Operator   │  │ (Python+MCP) │
└──────────────┘  └──────────────┘  └──────────────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
        Metrics feedback & traffic decisions
                         │
                    Phase progression
```

---

## 🔄 Three-Phase Deployment Timeline

### **Phase 1: Canary Validation (Days 1-5) — 10% Traffic**

**Goal**: Low-risk validation of new code with real production traffic  
**Blast Radius**: 10% of users see new version  
**Daily Validation**: Automated health checks + manual review

**Activities**:
1. **Day 1**: Deploy phase via ArgoCD, shift 10% traffic to canary
2. **Days 2-5**: Monitor metrics continuously (1-min intervals)
3. **Daily Report**: Email/Slack with metrics summary + alerts
4. **Decision Point**: All metrics ✓ → proceed to Phase 2

**Success Criteria** (ALL must pass):
- Request success rate ≥ 99%
- Request duration (p99) ≤ 500ms
- Token savings ≥ 70%
- Error rate ≤ 1%
- Pod restart count = 0

**Rollback Trigger**:
- Success rate < 99% for 5 consecutive minutes
- Latency p99 > 1000ms for 10 consecutive minutes
- Token savings < 60%
- Critical errors detected in logs

**Kubernetes Resources**:
```
Flagger Canary: ct-vault-python, ct-vault-mcp
  metrics:
  - request-success-rate (min: 99)
  - request-duration (max: 500ms)
  - token-savings (min: 70)
  interval: 1-2 minutes
  maxWeight: 10
```

---

### **Phase 2: Progressive Expansion (Days 6-15) — 50% Traffic**

**Goal**: Gradual rollout to majority of users  
**Blast Radius**: 50% of users experience new code  
**Testing Intensity**: Full regression suite + performance benchmarks

**Activities**:
1. **Days 6-10**: Shift 30% → 40% → 50% traffic (10% daily)
2. **Continuous**: Run load testing (scripts/load-test.js)
3. **Days 11-15**: Steady state at 50%, monitor for edge cases
4. **Day 15**: Decision Point: All criteria ✓ → proceed to Phase 3

**Success Criteria** (same as Phase 1 PLUS):
- Compression ratio consistency (variance < 5%)
- Memory usage stable (< 10% variance)
- No database connection pool exhaustion
- API response time p95 ≤ 300ms

**Monitoring Escalation**:
- Alerting to Slack #ct-vault-alerts every hour
- PagerDuty escalation if critical threshold breached
- Daily metrics dashboard review (Prometheus Grafana)

**Load Testing**:
```bash
# Run from scripts/load-test.js
node scripts/load-test.js --target http://ct-vault-python.comptext \
  --rps 1000 --duration 300 --phase 2
```

---

### **Phase 3: Full Rollout (Days 16-22) — 100% Traffic**

**Goal**: Complete production rollout  
**Blast Radius**: All users, full production load  
**Rollback Window**: 48 hours (auto-revert if criteria fail)

**Activities**:
1. **Days 16-18**: Shift 60% → 80% → 100% traffic (20% daily)
2. **Days 19-22**: Steady state 100%, monitor rollback window
3. **End of Day 22**: Lock in changes (48h window closes)

**Success Criteria** (Phase 2 criteria PLUS):
- Run for 7 consecutive days without manual intervention
- Zero unplanned pod restarts
- Compression metrics stable over 7 days
- No performance degradation under peak load

**Automatic Rollback Scenario**:
If metrics fail at any point during Days 16-18, flagger automatically:
1. Stops traffic shift
2. Reverts to 0% canary (100% stable)
3. Triggers PagerDuty incident
4. Sends Slack alert for manual investigation

**Post-Rollout**:
- Day 22 end: Archive all metrics to S3
- Retrospective meeting: review learnings
- Update runbooks based on observations

---

## 📊 Metrics & Validation

### Prometheus Scrape Targets

```yaml
# k8s/prometheus-config.yaml
scrape_configs:
- job_name: ct-vault-python
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - comptext
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    regex: ct-vault-python
    action: keep

- job_name: ct-vault-mcp
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - comptext
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    regex: ct-vault-mcp
    action: keep
```

### Alert Rules

**Phase 1 Alerts**:
```yaml
- alert: CanarySuccessRateBelowThreshold
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 5m
  action: ROLLBACK

- alert: CanaryLatencyHigh
  expr: histogram_quantile(0.99, request_duration_seconds) > 0.5
  for: 10m
  action: INVESTIGATE

- alert: CanaryTokenSavingsBelowTarget
  expr: token_savings_pct < 70
  for: 15m
  action: INVESTIGATE
```

---

## 🚀 Execution Procedure

### Prerequisites

```bash
# 1. Ensure ArgoCD is installed
kubectl apply -n argocd -f gitops/argocd/

# 2. Create namespace and secrets
kubectl create namespace comptext
kubectl apply -f k8s/namespace.yaml

# 3. Install Flagger and metrics provider
kubectl apply -k github.com/fluxcd/flagger/kustomize/istio

# 4. Configure Prometheus
kubectl apply -f k8s/prometheus-config.yaml
```

### Phase 1: Kickoff (Day 1)

```bash
# 1. Deploy ArgoCD ApplicationSet (Phase 1)
kubectl apply -f gitops/argocd/canary-applicationset.yaml

# 2. Verify Flagger Canary resources
kubectl get canary -n comptext

# 3. Watch traffic shift
kubectl logs -n istio-system -l app=flagger -f

# 4. Start metric collection dashboard
# Open: http://prometheus.local/graph
# Query: token_savings_pct, request_success_rate, request_duration_seconds
```

### Continuous Monitoring (Days 2-5)

```bash
# Run automated health check loop
bash scripts/canary-rollout.sh --phase 1 --monitor-interval 60
```

This script:
- Queries Prometheus every 60 seconds
- Checks if all Phase 1 success criteria are met
- Logs results to `metrics/phase1-daily-report.json`
- Sends Slack notification if alert triggered
- Auto-triggers rollback if thresholds breached

### Phase Progression (Day 6, Day 16)

```bash
# When Phase 1 complete, apply Phase 2
kubectl apply -f gitops/argocd/canary-applicationset.yaml --dry-run

# Review: git diff
git diff k8s/

# Apply Phase 2 changes
git add .
git commit -m "deploy: canary phase 2 - expand to 50% traffic"
git push origin main

# ArgoCD auto-syncs within 3 minutes
# Monitor: kubectl get canary -n comptext -w
```

---

## 🔙 Rollback Procedures

### Manual Rollback (Any Phase)

```bash
# Option 1: Via ArgoCD (revert to stable revision)
argocd app rollback comptext-canary --revision 0

# Option 2: Via Flagger (immediate traffic shift to stable)
kubectl patch canary ct-vault-python -n comptext -p \
  '{"spec":{"skipAnalysis":true}}' --type merge

# Option 3: Via kubectl (delete canary, restore old deployment)
kubectl delete canary ct-vault-python ct-vault-mcp -n comptext
kubectl apply -f k8s/deployment-stable.yaml
```

### Automatic Rollback (Phase 3)

Flagger automatically triggers rollback if:
- Success rate < 99% for 5 consecutive minutes
- Latency p99 > 1000ms for 10 consecutive minutes
- Custom webhook fails

```yaml
# k8s/canary-orchestration.yaml
analysis:
  maxWeight: 100
  stepWeight: 20
  threshold: 3  # Rollback after 3 failed metric checks
  webhooks:
  - name: rollback-alert
    url: http://alertmanager:9093/api/v1/alerts
    timeout: 30s
```

---

## 📈 Metrics Dashboard

### Grafana Dashboard Configuration

```json
{
  "title": "CT-Vault Canary Deployment",
  "panels": [
    {
      "title": "Request Success Rate",
      "targets": [
        {
          "expr": "rate(http_requests_total{status='200'}[5m]) / rate(http_requests_total[5m])"
        }
      ],
      "thresholds": [{"value": 0.99, "color": "red"}]
    },
    {
      "title": "Request Duration (p99)",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, request_duration_seconds)"
        }
      ],
      "thresholds": [{"value": 0.5, "color": "red"}]
    },
    {
      "title": "Token Savings %",
      "targets": [
        {
          "expr": "token_savings_pct"
        }
      ],
      "thresholds": [{"value": 70, "color": "red"}]
    }
  ]
}
```

---

## 📋 Checklists

### Pre-Phase 1 (Day 0)

- [ ] All Docker images built & pushed to registry
- [ ] Kubernetes cluster scaled to handle 50% traffic surge
- [ ] Prometheus retention set to 30 days
- [ ] Slack #ct-vault-alerts channel created
- [ ] PagerDuty escalation policy configured
- [ ] Database backups verified (point-in-time recovery available)
- [ ] Load test scripts validated against staging
- [ ] Rollback procedure tested (dry-run successful)
- [ ] Team on-call schedule confirmed
- [ ] Communication plan sent to stakeholders

### Phase 1 Success Criteria Met

- [ ] Success rate ≥ 99% for 24+ consecutive hours
- [ ] Token savings ≥ 70% across all components
- [ ] Latency p99 ≤ 500ms
- [ ] Error rate ≤ 1%
- [ ] Zero unplanned pod restarts
- [ ] Team review: metrics look good
- [ ] Approval from TL/manager for Phase 2

### Phase 2 Success Criteria Met

- [ ] Phase 1 criteria maintained for full 10 days
- [ ] Load testing passed (1000 RPS sustained)
- [ ] Memory & CPU stable under 50% load
- [ ] Database connection pool never exhausted
- [ ] No unexpected errors in logs
- [ ] Performance metrics within ±5% of stable version
- [ ] Team review: ready for full rollout

### Phase 3 Success Criteria Met

- [ ] Phase 2 criteria maintained for full 7 days
- [ ] 100% production load sustained without incident
- [ ] Rollback window ended (48h elapsed)
- [ ] Metrics stable and consistent
- [ ] User-reported issues: zero critical, < 5 minor
- [ ] Final metrics archived
- [ ] Retrospective completed

---

## 📞 On-Call Runbook

### Alert: Canary Success Rate < 99%

```
1. Acknowledge alert in PagerDuty
2. Check Prometheus: rate(http_requests_total{status="5.."}[5m])
3. Review recent log entries:
   kubectl logs -n comptext -l app=ct-vault-python -f
4. Determine root cause:
   - Code regression? → Rollback via: kubectl rollout undo
   - Database issue? → Check connection pool: SELECT count(*) FROM pg_stat_activity
   - Infrastructure? → Check node status: kubectl get nodes
5. If critical: Execute manual rollback (see Rollback Procedures)
6. Notify team in #ct-vault-alerts
7. Post-incident: Document in incident-YYYYMMDD.md
```

### Alert: Latency p99 > 500ms

```
1. Check Prometheus query:
   histogram_quantile(0.99, rate(request_duration_seconds_bucket[5m]))
2. Identify slow endpoint:
   topk(5, histogram_quantile(0.99, rate(request_duration_seconds_bucket{endpoint=~".+"}[5m])))
3. Check for:
   - Database slow queries: EXPLAIN ANALYZE on slow query
   - Missing indexes: Check memory palace database
   - Resource contention: kubectl top nodes, kubectl top pods
4. If transient: Monitor for 10 minutes, check if resolves
5. If persistent: Trigger investigation + potential rollback
```

---

## 🔧 GitOps File Structure

```
gitops/
├── argocd/
│   ├── canary-applicationset.yaml    # Phase 1/2/3 ApplicationSets
│   ├── project.yaml                   # RBAC + repo permissions
│   └── notifications.yaml             # Slack/PagerDuty integration
├── flux/
│   └── canary-kustomization.yaml      # (optional Flux alternative)
└── README.md

k8s/
├── canary-orchestration.yaml          # Flagger Canary CRDs
├── prometheus-config.yaml             # Metrics scraping & alerts
├── deployment-python.yaml
├── deployment-mcp.yaml
├── namespace.yaml
└── ... (other resources)

scripts/
├── canary-rollout.sh                  # Phase automation + monitoring
└── load-test.js                       # Load testing script

docs/
└── CANARY-DEPLOYMENT-COORDINATION.md  # This file
```

---

## ✅ Sign-Off

- **DevOps Lead**: _______________  Date: _______
- **Platform Lead**: _______________  Date: _______
- **Engineering Manager**: _______________  Date: _______

---

**Last Review**: 2026-04-29  
**Next Review**: Post-Phase 3 Retrospective
