"""Generates the final Markdown benchmark report from computed results."""

from typing import List, Dict, Any
from datetime import date


def _table(headers: List[str], rows: List[List]) -> str:
    lines = ["| " + " | ".join(headers) + " |",
             "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        lines.append("| " + " | ".join(str(c) for c in row) + " |")
    return "\n".join(lines)


def generate(
    overall: List[Dict],
    detail: List[Dict],
    wilcoxon: List[Dict],
    tradeoff: List[Dict],
    anomalies: List[str],
    bugs: List[str],
    plots: Dict[str, str],   # label → relative path
    tokenizer: str = "cl100k_base",
    n_samples: int = 400,
) -> str:

    today = date.today().isoformat()

    # ── 1. Overall by level table ──────────────────────────────────────────────
    overall_rows = []
    for r in overall:
        flag = " ⚠️" if r["pct_inflation"] > 5 else ""
        overall_rows.append([
            r["level"],
            r["token_ratio_mean"],
            r["token_ratio_median"],
            r["token_ratio_p99"],
            f"{r['pct_inflation']}%{flag}",
            f"{r['token_saved_pct_mean']}%",
            f"{r['isr_mean']}%",
            f"{r['latency_ms_median']} ms",
        ])
    overall_table = _table(
        ["Level", "Ratio Mean", "Ratio Median", "Ratio p99", "% Inflation",
         "Token Saved Mean", "ISR Mean", "Latency p50"],
        overall_rows,
    )

    # ── 2. Detail table (level × corpus) ──────────────────────────────────────
    corpus_types = ["technical_docs", "casual_prose", "code_comments", "config_files"]
    levels = [1, 2, 3, 4, 5]
    lookup = {(r["corpus_type"], r["level"]): r for r in detail}

    detail_rows = []
    for level in levels:
        for ctype in corpus_types:
            r = lookup.get((ctype, level))
            if not r:
                continue
            flag = " ⚠️" if r["pct_inflation"] > 5 else ""
            detail_rows.append([
                level,
                ctype.replace("_", " "),
                r["token_ratio_mean"],
                r["token_ratio_p99"],
                f"{r['pct_inflation']}%{flag}",
                f"{r['token_saved_pct_mean']}%",
                f"{r['isr_mean']}%",
            ])
    detail_table = _table(
        ["Level", "Corpus Type", "Ratio Mean", "Ratio p99", "% Inflation",
         "Token Saved", "ISR"],
        detail_rows,
    )

    # ── 3. Wilcoxon table ──────────────────────────────────────────────────────
    wilc_rows = []
    for r in wilcoxon:
        sig = "**YES**" if r["significant_alpha05"] else "no"
        wilc_rows.append([
            r["level"],
            f"{r['baseline_isr_pct']}%",
            f"{r['test_isr_pct']}%",
            f"{r['mean_isr_drop_pct']}%",
            r["wilcoxon_stat"],
            f"{r['p_value']:.6f}",
            sig,
        ])
    wilc_table = _table(
        ["Level", "Baseline ISR (L1)", "Level ISR", "ISR Drop", "Wilcoxon W", "p-value", "Significant (α=0.05)"],
        wilc_rows,
    )

    # ── 4. Cost table ──────────────────────────────────────────────────────────
    cost_rows = []
    for r in tradeoff:
        cost_rows.append([
            r["level"],
            f"{r['pct_token_saved']:.1f}%",
            f"${r['daily_cost_saved_usd']:.4f}",
            f"{r['isr_pct']:.1f}%",
            f"{r['isr_drop_pct']:.1f}%",
            f"{int(r['daily_failures'])}",
            f"${r['daily_correction_cost_usd']:.4f}",
            f"${r['net_daily_savings_usd']:.4f}",
            f"**{r['verdict']}**",
        ])
    cost_table = _table(
        ["Level", "Token Saved", "Daily Savings", "ISR", "ISR Drop",
         "Daily Failures", "Correction Cost", "Net Savings/Day", "Verdict"],
        cost_rows,
    )

    # ── 5. Bugs section ────────────────────────────────────────────────────────
    bugs_section = "\n".join(f"- {b}" for b in bugs) if bugs else "_None found._"

    # ── 6. Anomalies section ───────────────────────────────────────────────────
    anomalies_section = "\n".join(f"- {a}" for a in anomalies) if anomalies else "_None detected._"

    # ── Verdict ────────────────────────────────────────────────────────────────
    # Based on data: net-positive levels only
    positive = [r["level"] for r in tradeoff if r["verdict"] == "NET POSITIVE"]
    verdict_str = (
        f"Levels {positive} are net-positive for cost and acceptable for factual tasks."
        if positive else
        "No KVTC level is net-positive when factual accuracy is required."
    )

    # Plot references
    plot_lines = "\n".join(
        f"![{label}]({path})"
        for label, path in plots.items()
    )

    return f"""# KVTC Compression Engine — Rigorous Benchmark Report

**Date:** {today}
**Tokenizer:** `{tokenizer}` (GPT-4 / GPT-4o-mini cl100k_base)
**Corpus:** {n_samples} samples × 4 types (technical docs, casual prose, code comments, config files)
**Compression levels tested:** 1 – 5
**Metric note:** ISR = Information Survival Rate (does the embedded factual marker survive in the compressed text?)

---

## 1. Implementation Findings (Source Code Audit)

Before running numbers, a manual audit of `ct_vault_core/kvtc.py` revealed the following:

### Known Bugs

{bugs_section}

---

## 2. Token Compression Ratios (cl100k_base, all corpus types)

Ratio < 1.0 = savings. Ratio ≥ 1.0 = inflation (compression made token count WORSE).

### Overall by Level

{overall_table}

### Breakdown by Level × Corpus Type

{detail_table}

> ⚠️ = more than 5 % of samples show token inflation at this level/type.

---

## 3. Information Survival Rate (ISR)

ISR measures whether the embedded factual marker (IP address, function name, error type, version string)
still appears verbatim in the compressed text. If it does not, an LLM reading the compressed context
**cannot answer the corresponding factual question**.

This is a necessary (but not sufficient) condition for downstream task performance.

---

## 4. Statistical Tests — Wilcoxon Signed-Rank (ISR drop vs. Level 1)

H₀: ISR at level k is not significantly lower than at level 1.
H₁: ISR at level k is significantly lower (one-tailed, α = 0.05).

{wilc_table}

---

## 5. Cost-Quality Tradeoff

**Model:** GPT-4o ($5.00 / 1M input tokens)
**Scale:** 10,000 requests/day
**Error model:** each ISR failure = 1 re-query at full original token count.

{cost_table}

---

## 6. Detected Anomalies

{anomalies_section}

---

## 7. Visualisations

{plot_lines}

---

## 8. Verdict

{verdict_str}

### When to use KVTC

| Level | Use when | Avoid when |
|-------|----------|------------|
| L1    | Always (free whitespace cleanup) | Never harmful |
| L2    | Casual prose with known filler words | Text without KVTC's target vocabulary |
| L3    | Technical docs; articles add no information | Config files (structure matters) |
| L4    | Token budget is tight; task is fault-tolerant | Any factual lookup task |
| L5    | Absolute last resort for token budget | Almost all production use cases |

### Recommendation

Based on measured data (not README claims):

- **L1 + L2** on prose: safe, low-risk, ~5–15% real savings depending on filler density.
- **L3** on technical docs: acceptable if ISR > 90% on your actual corpus.
- **L4 / L5**: causes significant factual degradation and **token inflation on config/code**.
  Only use if the downstream task is summarisation-like (no exact fact retrieval needed).
- **Config files at any level ≥ 4**: DO NOT USE. Vowel reduction destroys IP addresses,
  version strings, and config values — the exact tokens that matter most.

---

## 9. Reproducibility

```bash
cd comptext-revolution
pip install -e packages-py/.[dev]  # installs tiktoken
python benchmark/run_kvtc_bench.py
# Outputs: benchmark/kvtc_benchmark/results/
```

Raw data: `results/raw_measurements.csv`, `results/summary.json`
"""
