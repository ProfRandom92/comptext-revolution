# CT-Vault Deployment Quick Start

## Local Development (docker-compose)

```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f ct-vault-python
docker-compose -f docker-compose.production.yml logs -f ct-vault-mcp

# Stop all services
docker-compose -f docker-compose.production.yml down

# Access services
curl http://localhost:8000/health      # Python API
curl http://localhost:3000             # MCP Server
curl http://localhost:9090             # Prometheus
curl http://localhost:3001             # Grafana (admin/admin)
```

## Production Deployment (Kubernetes)

### Prerequisites
```bash
# 1. Have kubectl configured with cluster access
kubectl config current-context

# 2. Build and push Docker images
docker build -f Dockerfile.python -t ghcr.io/your-org/ct-vault-python:latest .
docker build -f Dockerfile.mcp -t ghcr.io/your-org/ct-vault-mcp:latest .

docker push ghcr.io/your-org/ct-vault-python:latest
docker push ghcr.io/your-org/ct-vault-mcp:latest

# 3. Install ingress controller (if not present)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# 4. Install cert-manager (for TLS)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Deploy to Kubernetes

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create storage (PVC)
kubectl apply -f k8s/storage.yaml

# 3. Deploy services
kubectl apply -f k8s/deployment-python.yaml
kubectl apply -f k8s/deployment-mcp.yaml

# 4. Setup autoscaling
kubectl apply -f k8s/autoscaling.yaml

# 5. Configure ingress
kubectl apply -f k8s/ingress.yaml

# 6. Verify deployment
kubectl get pods -n comptext
kubectl get services -n comptext
kubectl get hpa -n comptext
```

### Monitoring the Deployment

```bash
# Watch pod status
kubectl get pods -n comptext -w

# Check pod logs
kubectl logs -n comptext deployment/ct-vault-python -f
kubectl logs -n comptext deployment/ct-vault-mcp -f

# Check resource usage
kubectl top pods -n comptext
kubectl top nodes

# Describe deployment
kubectl describe deployment ct-vault-python -n comptext
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment ct-vault-python -n comptext --replicas=5

# Check HPA status
kubectl get hpa -n comptext -w

# View HPA details
kubectl describe hpa ct-vault-python-hpa -n comptext
```

### Port Forwarding (for testing)

```bash
# Python backend
kubectl port-forward -n comptext svc/ct-vault-python 8000:8000

# MCP server
kubectl port-forward -n comptext svc/ct-vault-mcp 3000:3000

# Prometheus
kubectl port-forward -n comptext svc/prometheus 9090:9090

# Grafana
kubectl port-forward -n comptext svc/grafana 3001:3000
```

## Canary Rollout (10% → 50% → 100%)

### Week 1: 10% Canary

```bash
# Deploy canary version with Istio/Flagger
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: ct-vault-python-canary
  namespace: comptext
spec:
  selector:
    app: ct-vault-python
    version: canary
  ports:
  - port: 8000
    targetPort: 8000
EOF

# Monitor metrics
kubectl get vs -n comptext  # VirtualServices

# If metrics good: increase to 50%
```

### Week 2-3: 50% Progressive

```bash
# Update traffic split via Istio/Flagger
# increase weight from 10 to 50

# Continue monitoring for 10 days
# Collect user feedback
# Run compatibility tests
```

### Week 4: 100% Rollout

```bash
# Update all traffic to new version
# Keep old version for 48 hours rollback
# Switch DNS to new cluster if using multi-region
```

## Health Checks

```bash
# Python API health
curl -f http://localhost:8000/health || echo "UNHEALTHY"

# MCP server health (TCP)
timeout 2 bash -c 'cat < /dev/null > /dev/tcp/localhost/3000' && echo "HEALTHY" || echo "UNHEALTHY"

# End-to-end test
curl -X POST http://localhost:8000/compress \
  -H "Content-Type: application/json" \
  -d '{"text":"Test content for compression","level":3}'
```

## Troubleshooting

### Python pod not ready
```bash
# Check logs
kubectl logs -n comptext deployment/ct-vault-python --tail=50

# Check readiness probe
kubectl describe pod <pod-name> -n comptext | grep Readiness

# Check resources
kubectl describe node <node-name>
```

### MCP server cannot reach Python
```bash
# Check Python service is running
kubectl get svc -n comptext ct-vault-python

# Test connectivity from MCP pod
kubectl exec -it -n comptext <mcp-pod> -- \
  curl http://ct-vault-python:8000/health
```

### Storage issues
```bash
# Check PVC status
kubectl get pvc -n comptext

# Check PV status
kubectl get pv

# Check disk usage
kubectl exec -it -n comptext <python-pod> -- df -h /home/vault/.comptext
```

## Performance Testing

```bash
# Load test (1000 requests, level 3 compression)
PYTHONPATH=packages-py python3 << 'EOF'
import asyncio
import aiohttp
import time

async def load_test():
    async with aiohttp.ClientSession() as session:
        start = time.time()
        tasks = []
        for i in range(1000):
            text = f"This is test document number {i} for compression testing."
            task = session.post(
                'http://localhost:8000/compress',
                json={'text': text, 'level': 3}
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        duration = time.time() - start
        
        success = sum(1 for r in results if not isinstance(r, Exception))
        print(f"Completed {success}/1000 in {duration:.2f}s ({success/duration:.1f} req/s)")

asyncio.run(load_test())
EOF
```

## Metrics and Monitoring

### Key Metrics to Monitor

1. **Compression Performance**
   - `comptext_tokens_saved_total` — Total tokens compressed
   - `comptext_compression_ratio_avg` — Average compression ratio
   - `comptext_latency_p99_ms` — 99th percentile latency

2. **System Health**
   - Pod restart count
   - Pod CPU/memory usage
   - Network I/O
   - Disk usage

3. **API Performance**
   - Request rate (req/s)
   - Error rate (%)
   - Latency percentiles (p50, p95, p99)

### Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'ct-vault-python'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - comptext
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: ct-vault-python
      - source_labels: [__address__]
        action: replace
        regex: ([^:]+)(?::\d+)?
        replacement: ${1}:8000
        target_label: __address__
```

## Rollback Procedure

### If issues detected (stability <90%, latency >10ms)

```bash
# 1. Immediate: Switch traffic back to stable version
kubectl rollout undo deployment/ct-vault-python -n comptext

# 2. Verify stable version health
kubectl rollout status deployment/ct-vault-python -n comptext

# 3. Investigate issue
kubectl logs -n comptext deployment/ct-vault-python --previous

# 4. Fix and redeploy
# (Update image tag and apply)
kubectl set image deployment/ct-vault-python \
  ct-vault-python=ghcr.io/your-org/ct-vault-python:v1.1.0 \
  -n comptext
```

## Cost Estimation

- **Python Backend**: 3 replicas × 0.5 CPU × $0.0475/hour ≈ $68/month
- **MCP Server**: 2 replicas × 0.5 CPU × $0.0475/hour ≈ $46/month
- **Storage**: 50Gi × $0.10/Gi/month ≈ $5/month
- **Load Balancer**: $18/month (AWS ALB)
- **Total**: ~$137/month

## Support & Debugging

```bash
# Get cluster info
kubectl cluster-info

# Get node info
kubectl get nodes -o wide

# Describe comptext resources
kubectl describe all -n comptext

# Export logs for analysis
kubectl logs -n comptext deployment/ct-vault-python > python.logs
kubectl logs -n comptext deployment/ct-vault-mcp > mcp.logs
```

---

**Deployment Status**: ✅ Ready  
**Estimated Time**: 15-30 minutes  
**Rollback Time**: < 5 minutes
