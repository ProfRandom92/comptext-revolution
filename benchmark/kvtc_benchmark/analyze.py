"""
Statistical analysis of benchmark measurements.

Produces:
  - Per-level × per-corpus summary tables (mean / median / p99 / inflation %)
  - Wilcoxon signed-rank tests: ISR at each level vs. level-1 baseline
  - Cost-quality tradeoff analysis (GPT-4o and GPT-4o-mini pricing)
  - Flagged anomalies (token inflation, total ISR collapse)
"""

import json
from collections import defaultdict
from typing import List, Dict, Any

import numpy as np
from scipy.stats import wilcoxon

from .measure import Measurement


# ── GPT API pricing (USD per 1 million tokens, as of early 2025) ───────────────
PRICING = {
    "gpt-4o": {"input": 5.00, "output": 15.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
}


def _filter(ms: List[Measurement], corpus_type=None, level=None, tokenizer="cl100k_base"):
    return [
        m for m in ms
        if (corpus_type is None or m.corpus_type == corpus_type)
        and (level is None or m.level == level)
        and m.tokenizer == tokenizer
    ]


# ── Summary tables ─────────────────────────────────────────────────────────────

def summary_table(ms: List[Measurement], tokenizer: str = "cl100k_base") -> List[Dict]:
    """Mean / median / p99 token ratio and ISR, grouped by level × corpus_type."""
    corpus_types = sorted({m.corpus_type for m in ms})
    levels = sorted({m.level for m in ms})
    rows = []

    for ctype in corpus_types:
        for level in levels:
            subset = _filter(ms, corpus_type=ctype, level=level, tokenizer=tokenizer)
            if not subset:
                continue
            ratios = np.array([m.token_ratio for m in subset])
            isrs   = np.array([m.isr for m in subset])
            rows.append({
                "corpus_type": ctype,
                "level": level,
                "n": len(subset),
                "token_ratio_mean": round(float(np.mean(ratios)), 4),
                "token_ratio_median": round(float(np.median(ratios)), 4),
                "token_ratio_p99": round(float(np.percentile(ratios, 99)), 4),
                "pct_inflation": round(float(np.mean(ratios > 1.0)) * 100, 1),
                "token_saved_pct_mean": round(float(np.mean(1 - ratios) * 100), 2),
                "isr_mean": round(float(np.mean(isrs)) * 100, 1),  # as %
                "chars_ratio_mean": round(
                    float(np.mean([m.chars_ratio for m in subset])), 4),
            })
    return rows


def overall_by_level(ms: List[Measurement], tokenizer: str = "cl100k_base") -> List[Dict]:
    """Aggregate across all corpus types, per level."""
    levels = sorted({m.level for m in ms})
    rows = []
    for level in levels:
        subset = _filter(ms, level=level, tokenizer=tokenizer)
        ratios = np.array([m.token_ratio for m in subset])
        isrs   = np.array([m.isr for m in subset])
        rows.append({
            "level": level,
            "n": len(subset),
            "token_ratio_mean": round(float(np.mean(ratios)), 4),
            "token_ratio_median": round(float(np.median(ratios)), 4),
            "token_ratio_p99": round(float(np.percentile(ratios, 99)), 4),
            "pct_inflation": round(float(np.mean(ratios > 1.0)) * 100, 1),
            "token_saved_pct_mean": round(float(np.mean(1 - ratios) * 100), 2),
            "isr_mean": round(float(np.mean(isrs)) * 100, 1),
            "latency_ms_median": round(
                float(np.median([m.latency_ms for m in subset])), 3),
        })
    return rows


# ── Wilcoxon signed-rank tests ────────────────────────────────────────────────

def wilcoxon_tests(ms: List[Measurement], tokenizer: str = "cl100k_base") -> List[Dict]:
    """
    For each level 2-5, test whether ISR is significantly different from level 1
    across all corpus types (paired by sample_id).
    H0: no difference in ISR between level k and level 1.
    """
    # Build per-sample ISR maps: {sample_id: {level: isr}}
    isr_map: Dict[str, Dict[int, int]] = defaultdict(dict)
    for m in ms:
        if m.tokenizer != tokenizer:
            continue
        isr_map[m.sample_id][m.level] = m.isr

    sample_ids = sorted(isr_map.keys())
    results = []

    baseline = np.array([isr_map[sid][1] for sid in sample_ids])

    for level in [2, 3, 4, 5]:
        test_vals = np.array([isr_map[sid][level] for sid in sample_ids])
        diffs = test_vals - baseline

        if np.all(diffs == 0):
            stat, p = None, 1.0
        else:
            stat, p = wilcoxon(test_vals, baseline, alternative="less",
                               zero_method="wilcox")
            stat = float(stat)

        mean_drop = float(np.mean(diffs)) * 100
        results.append({
            "level": level,
            "baseline_isr_pct": round(float(np.mean(baseline)) * 100, 1),
            "test_isr_pct": round(float(np.mean(test_vals)) * 100, 1),
            "mean_isr_drop_pct": round(mean_drop, 1),
            "wilcoxon_stat": round(stat, 1) if stat is not None else "n/a",
            "p_value": round(p, 6),
            "significant_alpha05": p < 0.05,
        })

    return results


# ── Cost-quality tradeoff ─────────────────────────────────────────────────────

def cost_quality_tradeoff(
    ms: List[Measurement],
    model: str = "gpt-4o",
    tokenizer: str = "cl100k_base",
    requests_per_day: int = 10_000,
) -> List[Dict]:
    """
    For each level, compute:
      - daily token savings  (tokens_saved × requests_per_day)
      - daily cost savings   ($ saved on input tokens)
      - ISR drop             (how much fact-retrieval accuracy falls vs L1)
      - net verdict          (savings - estimated cost of errors)

    Error cost model:
      Each ISR failure = one "correction request" = 1 LLM call × avg_tokens_original.
      Corrections are billed at full input price.
    """
    # baseline = level 1
    l1 = _filter(ms, level=1, tokenizer=tokenizer)
    avg_tokens_orig = float(np.mean([m.tokens_original for m in l1]))
    l1_isr = float(np.mean([m.isr for m in l1]))

    price_per_token = PRICING[model]["input"] / 1_000_000

    rows = []
    for level in [1, 2, 3, 4, 5]:
        subset = _filter(ms, level=level, tokenizer=tokenizer)
        avg_tokens_comp = float(np.mean([m.tokens_compressed for m in subset]))
        level_isr = float(np.mean([m.isr for m in subset]))

        tokens_saved_per_req = avg_tokens_orig - avg_tokens_comp
        daily_tokens_saved = tokens_saved_per_req * requests_per_day
        daily_cost_saved = daily_tokens_saved * price_per_token

        isr_drop = l1_isr - level_isr          # fraction: 0.0 .. 1.0
        daily_failures = isr_drop * requests_per_day
        # Each failure assumed to cost one full re-query at original token count
        daily_correction_cost = daily_failures * avg_tokens_orig * price_per_token

        net_daily_savings = daily_cost_saved - daily_correction_cost

        rows.append({
            "level": level,
            "avg_tokens_original": round(avg_tokens_orig, 1),
            "avg_tokens_compressed": round(avg_tokens_comp, 1),
            "tokens_saved_per_req": round(tokens_saved_per_req, 1),
            "pct_token_saved": round(tokens_saved_per_req / avg_tokens_orig * 100, 2),
            "daily_cost_saved_usd": round(daily_cost_saved, 4),
            "isr_pct": round(level_isr * 100, 1),
            "isr_drop_pct": round(isr_drop * 100, 1),
            "daily_failures": round(daily_failures, 0),
            "daily_correction_cost_usd": round(daily_correction_cost, 4),
            "net_daily_savings_usd": round(net_daily_savings, 4),
            "verdict": (
                "NET POSITIVE" if net_daily_savings > 0 and level_isr >= 0.90
                else "CAUTION" if net_daily_savings > 0
                else "NET NEGATIVE"
            ),
        })
    return rows


# ── Bug / anomaly detection ───────────────────────────────────────────────────

def detect_anomalies(ms: List[Measurement], tokenizer: str = "cl100k_base") -> List[str]:
    findings = []

    for level in [1, 2, 3, 4, 5]:
        subset = _filter(ms, level=level, tokenizer=tokenizer)
        n_inflated = sum(1 for m in subset if m.token_ratio > 1.0)
        worst = max(subset, key=lambda m: m.token_ratio)
        if n_inflated > 0:
            findings.append(
                f"L{level}: {n_inflated}/{len(subset)} samples show TOKEN INFLATION "
                f"(ratio ≥ 1.0). Worst: {worst.sample_id} "
                f"({worst.corpus_type}) ratio={worst.token_ratio:.3f}"
            )

    # Check if any level INCREASES average token count vs level 1
    l1_mean = np.mean([m.token_ratio for m in _filter(ms, level=1, tokenizer=tokenizer)])
    for level in [2, 3, 4, 5]:
        lk_mean = np.mean([m.token_ratio for m in _filter(ms, level=level, tokenizer=tokenizer)])
        if lk_mean > l1_mean + 0.05:
            findings.append(
                f"CRITICAL: L{level} mean token ratio ({lk_mean:.4f}) is HIGHER "
                f"than L1 ({l1_mean:.4f}). Compression is making things WORSE."
            )

    # Check marker destruction by corpus type
    for ctype in ["technical_docs", "casual_prose", "code_comments", "config_files"]:
        for level in [4, 5]:
            subset = _filter(ms, corpus_type=ctype, level=level, tokenizer=tokenizer)
            isr = np.mean([m.isr for m in subset]) * 100
            if isr < 70:
                findings.append(
                    f"L{level}/{ctype}: ISR={isr:.1f}% — "
                    f"majority of factual markers DESTROYED. NOT safe for factual tasks."
                )

    return findings


def _to_native(obj):
    if isinstance(obj, dict):
        return {k: _to_native(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_native(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj


def save_json(data: Any, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(_to_native(data), f, indent=2)
    print(f"Saved -> {path}")
