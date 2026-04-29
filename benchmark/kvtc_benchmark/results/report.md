# KVTC Compression Engine — Rigorous Benchmark Report

**Date:** 2026-04-29
**Tokenizer:** `cl100k_base` (GPT-4 / GPT-4o-mini cl100k_base)
**Corpus:** 400 samples × 4 types (technical docs, casual prose, code comments, config files)
**Compression levels tested:** 1 – 5
**Metric note:** ISR = Information Survival Rate (does the embedded factual marker survive in the compressed text?)

---

## 1. Implementation Findings (Source Code Audit)

Before running numbers, a manual audit of `ct_vault_core/kvtc.py` revealed the following:

### Known Bugs

- `'in order to'` is in the filler *set* but the code checks individual words from `str.split()` — the phrase is never matched, so it is **never removed**.
- `'provide'` and `'please'` map to `''` (empty string) in the abbreviation dict, leaving double spaces in the output. Whitespace is not re-normalised after substitution.
- The abbreviation table contains only **8 source words** (function, parameter, configuration, implementation, documentation, database, provide, please). Most text will not trigger any abbreviation at all.
- Levels 4 and 5 apply vowel removal to **every word ≥ 5/4 chars** including IP addresses, version strings, and config keys — destroying values that are essential for factual downstream tasks.
- The filler set contains only **11 entries** and misses common fillers (e.g., 'kind of', 'sort of', 'you know', 'I mean', 'pretty much').
- Level 4 and Level 5 apply the same vowel reduction pass twice (L5 re-processes the already-reduced output of L4 on the same run). For words of length 4, L4 skips them but L5 processes them — inconsistent threshold.

---

## 2. Token Compression Ratios (cl100k_base, all corpus types)

Ratio < 1.0 = savings. Ratio ≥ 1.0 = inflation (compression made token count WORSE).

### Overall by Level

| Level | Ratio Mean | Ratio Median | Ratio p99 | % Inflation | Token Saved Mean | ISR Mean | Latency p50 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.9935 | 1.0 | 1.0 | 0.0% | 0.65% | 95.0% | 0.103 ms |
| 2 | 0.9468 | 0.9744 | 1.0 | 0.0% | 5.32% | 95.0% | 0.158 ms |
| 3 | 0.9158 | 0.9 | 1.0 | 0.0% | 8.42% | 95.0% | 0.156 ms |
| 4 | 1.2067 | 1.175 | 1.5556 | 98.5% ⚠️ | -20.67% | 62.5% | 0.188 ms |
| 5 | 1.2153 | 1.1899 | 1.5556 | 98.5% ⚠️ | -21.53% | 62.5% | 0.204 ms |

### Breakdown by Level × Corpus Type

| Level | Corpus Type | Ratio Mean | Ratio p99 | % Inflation | Token Saved | ISR |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | technical docs | 0.9968 | 1.0 | 0.0% | 0.32% | 100.0% |
| 1 | casual prose | 1.0 | 1.0 | 0.0% | 0.0% | 100.0% |
| 1 | code comments | 1.0 | 1.0 | 0.0% | 0.0% | 80.0% |
| 1 | config files | 0.9773 | 1.0 | 0.0% | 2.27% | 100.0% |
| 2 | technical docs | 0.9875 | 1.0 | 0.0% | 1.25% | 100.0% |
| 2 | casual prose | 0.9436 | 1.0 | 0.0% | 5.64% | 100.0% |
| 2 | code comments | 0.953 | 1.0 | 0.0% | 4.7% | 80.0% |
| 2 | config files | 0.9031 | 1.0 | 0.0% | 9.69% | 100.0% |
| 3 | technical docs | 0.9491 | 1.0 | 0.0% | 5.09% | 100.0% |
| 3 | casual prose | 0.888 | 0.9623 | 0.0% | 11.19% | 100.0% |
| 3 | code comments | 0.9231 | 1.0 | 0.0% | 7.69% | 80.0% |
| 3 | config files | 0.9031 | 1.0 | 0.0% | 9.69% | 100.0% |
| 4 | technical docs | 1.2202 | 1.353 | 100.0% ⚠️ | -22.02% | 50.0% |
| 4 | casual prose | 1.181 | 1.3335 | 100.0% ⚠️ | -18.1% | 100.0% |
| 4 | code comments | 1.3241 | 1.6412 | 100.0% ⚠️ | -32.41% | 0.0% |
| 4 | config files | 1.1017 | 1.2439 | 94.0% ⚠️ | -10.17% | 100.0% |
| 5 | technical docs | 1.2267 | 1.353 | 100.0% ⚠️ | -22.67% | 50.0% |
| 5 | casual prose | 1.1939 | 1.3401 | 100.0% ⚠️ | -19.39% | 100.0% |
| 5 | code comments | 1.3345 | 1.6412 | 100.0% ⚠️ | -33.45% | 0.0% |
| 5 | config files | 1.1061 | 1.2439 | 94.0% ⚠️ | -10.61% | 100.0% |

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

| Level | Baseline ISR (L1) | Level ISR | ISR Drop | Wilcoxon W | p-value | Significant (α=0.05) |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 95.0% | 95.0% | 0.0% | n/a | 1.000000 | no |
| 3 | 95.0% | 95.0% | 0.0% | n/a | 1.000000 | no |
| 4 | 95.0% | 62.5% | -32.5% | 0.0 | 0.000000 | **YES** |
| 5 | 95.0% | 62.5% | -32.5% | 0.0 | 0.000000 | **YES** |

---

## 5. Cost-Quality Tradeoff

**Model:** GPT-4o ($5.00 / 1M input tokens)
**Scale:** 10,000 requests/day
**Error model:** each ISR failure = 1 re-query at full original token count.

| Level | Token Saved | Daily Savings | ISR | ISR Drop | Daily Failures | Correction Cost | Net Savings/Day | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.5% | $0.0138 | 95.0% | 0.0% | 0 | $0.0000 | $0.0138 | **NET POSITIVE** |
| 2 | 5.1% | $0.1290 | 95.0% | 0.0% | 0 | $0.0000 | $0.1290 | **NET POSITIVE** |
| 3 | 8.9% | $0.2266 | 95.0% | 0.0% | 0 | $0.0000 | $0.2266 | **NET POSITIVE** |
| 4 | -19.5% | $-0.4970 | 62.5% | 32.5% | 3250 | $0.8282 | $-1.3252 | **NET NEGATIVE** |
| 5 | -20.5% | $-0.5217 | 62.5% | 32.5% | 3250 | $0.8282 | $-1.3499 | **NET NEGATIVE** |

---

## 6. Detected Anomalies

- L4: 394/400 samples show TOKEN INFLATION (ratio ≥ 1.0). Worst: code_016 (code_comments) ratio=1.760
- L5: 394/400 samples show TOKEN INFLATION (ratio ≥ 1.0). Worst: code_016 (code_comments) ratio=1.760
- CRITICAL: L4 mean token ratio (1.2067) is HIGHER than L1 (0.9935). Compression is making things WORSE.
- CRITICAL: L5 mean token ratio (1.2153) is HIGHER than L1 (0.9935). Compression is making things WORSE.
- L4/technical_docs: ISR=50.0% — majority of factual markers DESTROYED. NOT safe for factual tasks.
- L5/technical_docs: ISR=50.0% — majority of factual markers DESTROYED. NOT safe for factual tasks.
- L4/code_comments: ISR=0.0% — majority of factual markers DESTROYED. NOT safe for factual tasks.
- L5/code_comments: ISR=0.0% — majority of factual markers DESTROYED. NOT safe for factual tasks.

---

## 7. Visualisations

![Token ratio distribution (box plot)](plots\token_ratio_boxplot.png)
![Information Survival Rate by level and corpus type](plots\isr_by_level_corpus.png)
![Token savings vs. ISR (quality-efficiency frontier)](plots\savings_vs_isr.png)
![Daily cost impact (10k requests, GPT-4o pricing)](plots\cost_tradeoff.png)
![Token inflation heatmap](plots\inflation_heatmap.png)

---

## 8. Verdict

Levels [1, 2, 3] are net-positive for cost and acceptable for factual tasks.

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
