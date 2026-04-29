# CT-Vault Canary Deployment — Readiness Checklist

**Last Updated**: 2026-04-29  
**Status**: 🟡 Ready for Phase 1 (Prerequisites in progress)  
**Owner**: DevOps Team  

---

## 🎯 Pre-Deployment Validation (Do NOT proceed until ALL checks pass)

### Infrastructure Prerequisites

- [ ] **Kubernetes Cluster**
  - [ ] Version: ≥ 1.24
  - [ ] Nodes: ≥ 5 (3 control, 2 worker minimum)
  - [ ] Resources: ≥ 16 CPUs, ≥ 64GB RAM available
  - [ ] Verify: `kubectl cluster-info` + `kubectl get nodes`

- [ ] **Istio Service Mesh**
  - [ ] Installed: `kubectl get ns istio-system`
  - [ ] Flagger installed: `kubectl get crd canaries.flagger.app`
  - [ ] Metrics provider (Prometheus): `kubectl get pod -n monitoring`
  - [ ] Verify: `kubectl get virtualservice -A`

- [ ] **Prometheus + Alertmanager**
  - [ ] Running: `kubectl get pod -n monitoring -l app=prometheus`
  - [ ] Retention: ≥ 30 days (`--storage.tsdb.retention.size=50GB`)
  - [ ] Alertmanager: `kubectl get pod -n monitoring -l app=alertmanager`
  - [ ] Verify scrape configs: `kubectl exec -n monitoring prometheus-0 -- cat /etc/prometheus/prometheus.yml | grep ct-vault`

- [ ] **ArgoCD**
  - [ ] Installed: `kubectl get ns argocd`
  - [ ] Server running: `kubectl get pod -n argocd -l app.kubernetes.io/name=argocd-server`
  - [ ] ApplicationSet CRD: `kubectl get crd applicationsets.argoproj.io`
  - [ ] Project 'comptext-canary' created: `kubectl get appproject -n argocd`
  - [ ] Git repository configured with deploy key

- [ ] **Storage**
  - [ ] Persistent volumes: `kubectl get pv`
  - [ ] Storage classes: `kubectl get storageclass`
  - [ ] Metrics database: 100GB available (`df -h /var/lib/prometheus`)
  - [ ] Backup system: S3/MinIO accessible

### Application Prerequisites

- [ ] **Docker Images**
  - [ ] ct-vault-python:latest built and in registry
  - [ ] ct-vault-mcp:latest built and in registry
  - [ ] Image scan for vulnerabilities passed
  - [ ] Verify: `docker pull <registry>/ct-vault-python:latest`

- [ ] **Deployments**
  - [ ] ct-vault-python deployment exists: `kubectl get deploy -n comptext ct-vault-python`
  - [ ] ct-vault-mcp deployment exists: `kubectl get deploy -n comptext ct-vault-mcp`
  - [ ] Stable version running (baseline): `kubectl get pod -n comptext`
  - [ ] Health checks configured: `livenessProbe` + `readinessProbe`

- [ ] **Database & Storage**
  - [ ] SQLite database initialized: `/data/comptext.db`
  - [ ] FTS5 indexes present: `SELECT * FROM sqlite_master WHERE type='table' AND name LIKE '%fts%'`
  - [ ] Backup point-in-time recovery tested
  - [ ] Verify: `kubectl exec -n comptext ct-vault-python-0 -- sqlite3 /data/comptext.db ".tables"`

- [ ] **Configuration**
  - [ ] ConfigMap created: `kubectl get cm -n comptext`
  - [ ] Secrets mounted: `kubectl get secret -n comptext`
  - [ ] Environment variables set correctly
  - [ ] PYTHONUNBUFFERED=1 for logging

### Network & Observability

- [ ] **Networking**
  - [ ] Service mesh ingress: `kubectl get virtualservice -n comptext`
  - [ ] Network policies: `kubectl get networkpolicy -n comptext`
  - [ ] DNS resolution: `nslookup ct-vault-python.comptext.svc.cluster.local`
  - [ ] Verify: `kubectl port-forward -n comptext ct-vault-python-0 8000:8000`

- [ ] **Logging & Tracing**
  - [ ] Fluentd/Filebeat deployed: `kubectl get pod -n kube-system -l app=fluentd`
  - [ ] Log aggregation (ELK/Loki): Accessible
  - [ ] Jaeger tracing: `kubectl get pod -n monitoring -l app=jaeger`
  - [ ] Verify: `kubectl logs -n comptext ct-vault-python-0 --tail=10`

- [ ] **Alerting**
  - [ ] Slack integration configured: `kubectl get secret -n argocd slack-token`
  - [ ] PagerDuty integration: `kubectl get secret -n monitoring pagerduty-token`
  - [ ] Test alert: `curl -X POST $SLACK_WEBHOOK -d '{"text":"Test"}'`
  - [ ] Incident response team on-call

### Validation Tests

- [ ] **Smoke Tests** (baseline stability)
  ```bash
  # Health check
  curl -f http://ct-vault-python:8000/health || exit 1
  
  # Compress endpoint
  curl -X POST http://ct-vault-python:8000/compress \
    -H "Content-Type: application/json" \
    -d '{"text":"test","level":2}'
  
  # Index endpoint
  curl -X POST http://ct-vault-python:8000/index \
    -H "Content-Type: application/json" \
    -d '{"id":"test:0","text":"test content"}'
  
  # Search endpoint
  curl http://ct-vault-python:8000/search?q=test&top_k=5
  ```

- [ ] **Performance Baseline**
  ```bash
  # Measure current latency (p50, p95, p99)
  ab -n 1000 -c 10 http://ct-vault-python:8000/health
  
  # Measure compression ratio
  for level in {1..5}; do
    curl -X POST http://ct-vault-python:8000/compress \
      -d "{\"text\":\"<large_test_text>\",\"level\":$level}" | jq .ratio
  done
  ```

- [ ] **Database Consistency**
  ```bash
  # Check table integrity
  kubectl exec -n comptext ct-vault-python-0 -- \
    sqlite3 /data/comptext.db "PRAGMA integrity_check"
  
  # Verify FTS5 index
  kubectl exec -n comptext ct-vault-python-0 -- \
    sqlite3 /data/comptext.db "SELECT COUNT(*) FROM chunks_fts"
  ```

- [ ] **Load Testing (Staging)**
  ```bash
  # Run 5-minute load test at 500 RPS
  node scripts/load-test.js --target http://ct-vault-python:8000 \
    --rps 500 --duration 300 --profile "staging"
  
  # Verify:
  # - No 5xx errors
  # - p99 latency < 500ms
  # - Token savings ≥ 70%
  ```

---

## 🔄 Phase 1 Go/No-Go Decision (Day 0)

### Requirements for Phase 1 Approval

All of the above prerequisites MUST be 100% complete.

**Sign-off Required From**:
- [ ] **DevOps Lead**: Infrastructure and deployment automation verified
- [ ] **Platform Lead**: ArgoCD, Prometheus, and monitoring configured
- [ ] **Engineering Manager**: Team trained, on-call rotation active
- [ ] **Security**: Image scan and network policies approved

**Go Decision**: ___________________  Date: _______

---

## ✅ Phase 1 Completion Criteria (Days 1-5)

### Daily Validation (automated via scripts/phase-orchestration.sh)

- [ ] **Day 1**
  - [ ] Phase 1 ApplicationSet deployed
  - [ ] Traffic shifted to 10% canary
  - [ ] Metrics dashboard accessible (Prometheus/Grafana)
  - [ ] Slack alerts configured and tested
  - [ ] Baseline metrics recorded

- [ ] **Days 2-5**
  - [ ] Daily metric report generated (metrics/phase1-daily-report.json)
  - [ ] Success rate continuously ≥ 99%
  - [ ] Latency p99 continuously ≤ 500ms
  - [ ] Token savings continuously ≥ 70%
  - [ ] Error rate continuously ≤ 1%
  - [ ] Zero unplanned pod restarts
  - [ ] Team review morning standup (every day)

### Phase 1 Success Criteria (HARD GATES)

**ALL of the following must be true**:
- ✓ Request success rate ≥ 99% for ≥ 24h continuous
- ✓ Request duration p99 ≤ 500ms for ≥ 24h continuous
- ✓ Token savings ≥ 70% across all request types
- ✓ Error rate ≤ 1% for entire phase
- ✓ Pod restart count = 0 (no unexpected restarts)
- ✓ Database performance stable (query time < 100ms p99)
- ✓ Memory usage stable (variance < 10%)
- ✓ No security issues detected
- ✓ Team approval: "Phase 1 SUCCESS"

**Rollback Criteria (IMMEDIATE)**:
- ✗ Success rate < 99% for ≥ 5 consecutive minutes
- ✗ Latency p99 > 1000ms for ≥ 10 consecutive minutes
- ✗ Token savings < 60% (unexpected regression)
- ✗ Pod enters CrashLoop or OOMKilled
- ✗ Database connection pool exhaustion
- ✗ Security breach or credential leak detected
- ✗ Critical error in logs (Severity: ERROR or CRITICAL)

**Progression to Phase 2**: ___________________  Date: _______

---

## ✅ Phase 2 Completion Criteria (Days 6-15)

### Continuous Monitoring

- [ ] **Days 6-10**: Traffic gradually shifts 30% → 40% → 50%
  - [ ] Daily automated load test (scripts/load-test.js)
  - [ ] Compression ratio variance < 5%
  - [ ] Memory usage variance < 10%
  - [ ] Hourly Slack summary sent

- [ ] **Days 11-15**: Steady state at 50% traffic
  - [ ] Final validation period
  - [ ] Edge cases tested (concurrent requests, large payloads, etc.)
  - [ ] Performance benchmarks vs. baseline documented

### Phase 2 Success Criteria (HARD GATES)

**ALL Phase 1 criteria PLUS**:
- ✓ Load test passed (1000 RPS sustained for 10 minutes)
- ✓ Compression ratio consistency: variance < 5%
- ✓ Memory stability: no leaks detected over 10 days
- ✓ Database connection pool never exhausted
- ✓ API response time p95 ≤ 300ms
- ✓ Cache hit rate stable (> 80% if applicable)
- ✓ Zero critical errors in logs
- ✓ Performance variance < 5% vs. baseline
- ✓ Team approval: "Phase 2 SUCCESS"

**Progression to Phase 3**: ___________________  Date: _______

---

## ✅ Phase 3 Completion Criteria (Days 16-22)

### 48-Hour Rollback Window

- [ ] **Days 16-18**: Traffic shifts 60% → 80% → 100%
  - [ ] Rollback snapshot created
  - [ ] Rollback deadline tracked (48h from completion)
  - [ ] Hourly metric checks (every 5 minutes during shift)
  - [ ] PagerDuty escalation enabled

- [ ] **Days 19-22**: Steady state at 100% traffic
  - [ ] Continuous monitoring
  - [ ] Zero unplanned incidents
  - [ ] Metrics stable for 7 consecutive days
  - [ ] Rollback window tracking countdown

- [ ] **Day 23**: Post-Rollout
  - [ ] 48h rollback window expires
  - [ ] Metrics archived to S3
  - [ ] Old stable deployment deleted
  - [ ] Final metrics report generated

### Phase 3 Success Criteria (HARD GATES)

**ALL Phase 2 criteria PLUS**:
- ✓ 7 consecutive days at 100% without incident
- ✓ Zero unplanned pod restarts (entire phase)
- ✓ Compression metrics variance < 2%
- ✓ All metrics within tolerance bounds
- ✓ No performance degradation under peak load
- ✓ User feedback: zero critical, < 5 minor issues
- ✓ Team approval: "Phase 3 SUCCESS"

**Automatic Rollback** (if triggered):
- ✓ Flagger immediately stops traffic shift
- ✓ Reverts to 0% canary (100% stable)
- ✓ PagerDuty incident created (P1)
- ✓ Slack alert sent (mentions @oncall)
- ✓ Requires manual investigation

**Promotion to Stable**: ___________________  Date: _______

---

## 📊 Metrics Archive & Retrospective

### Post-Phase 3 (Day 24)

- [ ] Metrics archived: `s3://comptext-metrics/phase3-final/`
- [ ] Final metrics report: `docs/FINAL-METRICS-REPORT.md`
- [ ] Incidents documented: `docs/INCIDENTS-PHASE3.md`
- [ ] Retrospective meeting scheduled
- [ ] Runbook updates completed
- [ ] Lessons learned documented: `docs/RETROSPECTIVE.md`

---

## 🔧 Troubleshooting Guide

### Common Issues During Canary

| Issue | Symptom | Solution |
|-------|---------|----------|
| **High latency** | p99 > 500ms | Check CPU/memory, scale pods, check DB queries |
| **Low success rate** | < 99% 5xx errors | Check application logs, review recent code changes |
| **Token savings drop** | < 70% savings | Verify compression level setting, check input patterns |
| **Pod restart loop** | CrashLoop/OOMKilled | Increase resource limits, check for memory leaks |
| **DB connection pool exhaustion** | Connection timeout | Increase pool size, check for connection leaks |
| **Flagger not shifting traffic** | Canary stuck at 0% | Check Istio VirtualService, verify Flagger webhook |
| **Metrics missing** | No data in Prometheus | Verify scrape config, check service discovery labels |
| **Slack/PagerDuty not alerting** | Silent failures | Verify webhook URL, check secret configuration |

---

## 📝 Final Sign-Off

**Deployment Approval** (All must sign):

```
DevOps Lead:        _________________    Date: _______
Platform Lead:      _________________    Date: _______
Engineering Mgr:    _________________    Date: _______
Security Lead:      _________________    Date: _______
Product Manager:    _________________    Date: _______
```

**Deployment Status**: Ready for Phase 1 ✅  
**Estimated Timeline**: 22 days (5 + 10 + 7)  
**Rollback Window**: 48 hours (Phase 3 only)

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-29  
**Maintained By**: DevOps Team
