# CompText AutoResearch Dashboard

Minimalistisches Dashboard zur Verwaltung und Überwachung von Optimierungsexperimenten in Echtzeit.

## 🚀 Schnellstart

```bash
# Terminal 1: Dashboard Server starten
node research/dashboard-server.js

# Terminal 2: Browser öffnen
http://localhost:3333
```

## 📊 Dashboard-Oberfläche

### 1. **Active Experiments Panel**
Zeigt laufende Experimente mit:
- **Progress**: Fortschrittsbalken und Prozentangabe
- **Elapsed Time**: Verstrichene Zeit in Echtzeit
- **Current Savings**: Token-Reduktion in %

**Beispiel:**
```
compression-variants
├─ Level 4 Testing...
├─ Progress: 65%
├─ Elapsed: 1:45
└─ Savings: 54.19%
```

### 2. **Current Metrics Panel**
Aggregierte Metriken:
- **Avg Savings**: Durchschnittliche Token-Reduktion
- **Throughput**: Operations pro Sekunde
- **Stability**: System-Stabilität in %

### 3. **Live Logs**
Chronologische Logs aller Events:
- `✓` Erfolgreiche Experimente (grün)
- `ℹ` Informationen (blau)
- `⚠` Warnungen (orange)
- `✗` Fehler (rot)

### 4. **Configuration Panel**

#### Experiment Selection
```
Wähle ein Experiment:
• Compression Variants (progressive Levels)
• DSL Integration (Namespace-basiert)
• Hybrid Approach (DSL + Levels kombiniert)
• Dictionary Expansion (Zusätzliche Abkürzungen)
• Run All (Sequenziell alle Experimente)
```

#### Duration (Minuten)
Wie lange das Experiment laufen soll:
- Min: 5 Minuten
- Max: 8 Stunden (480 Min)
- Default: 60 Minuten

#### Max Variants
Wie viele Varianten getestet werden (1-20):
- 5 ist standard
- Mehr = genauere Ergebnisse, längere Dauer

#### Compression Level
Welcher Algorithmus-Level:
- **Level 3 (Aggressive)**: 40.97% - für Balance
- **Level 4 (Vowel Reduction)**: 54.19% - für Performance
- **Level 5 (Extreme)**: 55.07% - maximale Reduktion
- **Hybrid (DSL + Levels)**: 70-85% - kombiniert

#### Monitoring Metrics
Checkboxen für zu überwachende Metriken:
- Token Savings (immer aktiv)
- Latency (p99)
- Stability (Uptime)
- Security Score

#### Auto-Rollback Threshold
Automatischer Rollback bei Fehlerrate > Schwelle:
- **Conservative (0.1%)**: Sehr sicher
- **Balanced (0.5%)**: Empfohlen
- **Aggressive (1.0%)**: Risiko-Tolerant

#### Target Token Savings
Gewünschte Einsparung in %:
- Default: 60%
- Kann 5er-Schritte von 10-95% gewählt werden

### 5. **Control Buttons**

```
┌─────────────┬─────────────┐
│ ▶ Start     │ ⏸ Pause     │
├─────────────┼─────────────┤
│ ⏹ Stop      │ ↙ Export    │
└─────────────┴─────────────┘
```

- **Start**: Starten Sie konfigurierte Experimente
- **Pause**: Pause/Resume (speichert den Zustand)
- **Stop**: Stoppt aktuelles Experiment
- **Export Config**: Speichert Config als JSON

### 6. **Results Table**
Abgeschlossene Experimente der letzten 24h:

| Experiment | Tokens Saved | Latency | Stability | Duration | Status |
|-----------|--------------|---------|-----------|----------|---------|
| compression-level-5 | 55.07% | 1.92ms | 98.1% | 8h 32m | ✓ Complete |

## 🎯 Typische Workflows

### Workflow 1: Schneller Compression-Test
```
1. Select "Compression Variants"
2. Set Duration: 15 minutes
3. Set Level: "Level 5 (Extreme)"
4. Set Target: 55%
5. Click "Start Experiments"
→ Testet alle 5 Levels in 15 Minuten
```

### Workflow 2: DSL-Integration validieren
```
1. Select "DSL Integration"
2. Set Duration: 30 minutes
3. Set Level: "Hybrid (DSL + Levels)"
4. Set Target: 85%
5. Set Rollback: "Conservative"
6. Click "Start Experiments"
→ Validiert DSL-Namespaces mit Sicherheit
```

### Workflow 3: Overnight Discovery Run
```
1. Select "Run All"
2. Set Duration: 480 minutes (8 hours)
3. Set Max Variants: 10
4. Set Level: "Level 5"
5. Set Target: 60%
6. Click "Start Experiments"
→ Lässt alle Experimente über Nacht laufen
```

### Workflow 4: Experiment-Queue
```
1. Configure Experiment 1 (Compression)
2. Click "Queue" (statt Start)
3. Configure Experiment 2 (DSL)
4. Click "Queue"
5. Configure Experiment 3 (Hybrid)
6. Click "Queue"
→ Führt nacheinander aus
```

## 📡 API-Endpunkte

Das Dashboard kommuniziert mit diesen HTTP-Endpunkten:

### GET /api/status
```bash
curl http://localhost:3333/api/status
```

**Response:**
```json
{
  "running": {
    "id": "compression",
    "name": "Compression Variants",
    "progress": 65,
    "elapsed": 105000
  },
  "queue": ["dsl", "hybrid"],
  "history": [
    {
      "name": "compression-level-5",
      "status": "completed",
      "savings": "55.07",
      "duration": "8532.1s"
    }
  ],
  "config": { ... }
}
```

### POST /api/start
```bash
curl -X POST http://localhost:3333/api/start \
  -H "Content-Type: application/json" \
  -d '{"experimentId": "compression"}'
```

### POST /api/pause
```bash
curl -X POST http://localhost:3333/api/pause
```

### POST /api/stop
```bash
curl -X POST http://localhost:3333/api/stop
```

### POST /api/queue
```bash
curl -X POST http://localhost:3333/api/queue \
  -H "Content-Type: application/json" \
  -d '{"experimentId": "dsl"}'
```

### POST /api/config
```bash
curl -X POST http://localhost:3333/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "autoRollback": true,
    "rollbackThreshold": 0.005,
    "timeout": 3600000
  }'
```

## 📈 Metriken verstehen

### Token Savings
**Was:** Prozentuale Reduktion der Eingabe-Token  
**Ziel:** >55% ist gut, >70% ist hervorragend  
**Formel:** (Original - Compressed) / Original * 100

```
Original: 1000 Tokens
Compressed: 450 Tokens
Savings: (1000-450)/1000 * 100 = 55%
```

### Latency (p99)
**Was:** 99. Perzentil der Verarbeitungszeit  
**Ziel:** <5ms für Levels 1-3, <3ms für Levels 4-5  
**Warnung:** >10ms kann auf Performance-Probleme hindeuten

### Stability
**Was:** System-Uptime während Experiment  
**Ziel:** >97% ist akzeptabel, >98% ist gut  
**Bedeutung:** Keine Crashes/Fehler während Test

## ⚙️ Erweiterte Konfiguration

### Environment Variables

```bash
# Port auf dem Dashboard läuft
export DASHBOARD_PORT=3333

# Experiment Timeout (ms)
export EXPERIMENT_TIMEOUT=3600000

# Auto-save Ergebnisse
export AUTO_SAVE_RESULTS=true

# Rollback bei Fehler
export AUTO_ROLLBACK=true
```

### Configuration File
Optionell: `research/dashboard-config.json`

```json
{
  "port": 3333,
  "timeout": 3600000,
  "autoRollback": true,
  "rollbackThreshold": 0.005,
  "defaultLevel": 5,
  "defaultDuration": 300000,
  "experiments": [
    {
      "id": "compression",
      "name": "Compression Variants",
      "variants": ["level1", "level2", "level3", "level4", "level5"],
      "target": 55
    }
  ]
}
```

## 🔍 Troubleshooting

### Dashboard lädt nicht
```bash
# 1. Port-Konflikt checken
lsof -i :3333

# 2. Server neu starten
node research/dashboard-server.js

# 3. Browser Cache clearen
Ctrl+Shift+Delete → Cached images/files
```

### Experimente starten nicht
```bash
# 1. Experiment Manager im Hintergrund checken
ps aux | grep experiment-manager

# 2. Logs ansehen
cat research/results/manager.log

# 3. Manuell starten
node research/experiment-manager.js
```

### Metrics zeigen 0% an
```bash
# 1. Überprüfe, ob Experimente laufen
curl http://localhost:3333/api/status | jq .running

# 2. Warte bis erstes Experiment fertig ist
# Der Fortschritt wird nach ~10 Sekunden aktualisiert
```

## 📊 Integration mit CompText Revolution

Das Dashboard integriert sich automatisch mit:

- **packages/core/src/levels.ts** - Compression Levels
- **packages/core/src/dictionary.ts** - Abbreviations
- **research/run-experiments.js** - Experiment Runner
- **research/autonomous-optimizer.js** - Auto-Discovery

## 🎓 Beispiele

### Beispiel 1: Täglicher Monitoring-Check
```
Zeit: 9 AM
Aufgabe: Überprüfe ob aktuelle Kompression stabil ist

1. Öffne Dashboard
2. Wähle "Compression Variants"
3. Set Duration: 5 minutes
4. Set Level: "Level 5"
5. Start
6. Warte auf Completion
7. Überprüfe Avg Savings ≥ 55%
```

### Beispiel 2: Neue Algorithmen testen
```
Zeit: Montag
Aufgabe: Teste neue Level 6+ Implementierung

1. Integriere neuen Code in packages/core
2. Öffne Dashboard
3. Wähle "Run All"
4. Set Duration: 120 minutes
5. Set Level: "Level 5" (oder new level)
6. Set Target: 60%
7. Queue alle Experimente
8. Lasse über Nacht laufen
9. Überprüfe Results am Morgen
```

### Beispiel 3: DSL-Performance validieren
```
Zeit: Nach DSL Integration
Aufgabe: Validiere dass DSL 85%+ Reduktion erreicht

1. Öffne Dashboard
2. Wähle "DSL Integration"
3. Set Duration: 30 minutes
4. Set Level: "Hybrid"
5. Set Target: 85%
6. Set Rollback: "Conservative"
7. Start
8. Überwache Logs für Warnungen
9. Nach Completion: Check Avg Savings
10. Falls <85%: Auto-rollback
```

## 📝 Tipps & Tricks

1. **Nachts laufen lassen**: Set Duration zu 480 min (8h), starten vor dem Schlafengehen
2. **Schnelle Tests**: 5-10 Min Duration für Quick-Checks
3. **Conservative beginnen**: Level 3-4, dann zu Level 5 upgraden
4. **Logs exportieren**: Right-click on log → Copy für Debugging
5. **Config speichern**: Export Config für später und Variationen

## 📞 Support

**Bug im Dashboard?**
```bash
# Logs checken
tail -f research/results/manager.log
```

**Experimente funktionieren nicht?**
```bash
# Manuell starten mit Debug
DEBUG=* node research/experiment-manager.js
```

---

**Version**: 1.0.0  
**Last Updated**: April 28, 2026  
**Status**: ✓ Production Ready
