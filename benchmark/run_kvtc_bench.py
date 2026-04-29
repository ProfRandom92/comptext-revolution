#!/usr/bin/env python3
"""
KVTC Rigorous Benchmark — entry point.

Usage:
    python benchmark/run_kvtc_bench.py

Outputs (all in benchmark/kvtc_benchmark/results/):
    raw_measurements.csv   — every sample × level × tokenizer measurement
    summary.json           — aggregated stats, Wilcoxon results, cost tradeoff
    report.md              — human-readable report with tables and plots
    plots/                 — PNG charts
"""

import os
import sys
import json
import time

# Force UTF-8 on Windows consoles
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Allow running from repo root or from benchmark/
_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.dirname(_HERE)
sys.path.insert(0, os.path.join(_REPO, "packages-py"))
sys.path.insert(0, _HERE)

RESULTS_DIR = os.path.join(_HERE, "kvtc_benchmark", "results")
PLOTS_DIR   = os.path.join(RESULTS_DIR, "plots")
os.makedirs(PLOTS_DIR, exist_ok=True)

from kvtc_benchmark.corpus  import build_corpus
from kvtc_benchmark.measure import run_measurements, save_csv, load_csv
from kvtc_benchmark.analyze import (
    summary_table, overall_by_level,
    wilcoxon_tests, cost_quality_tradeoff,
    detect_anomalies, save_json,
)
from kvtc_benchmark.plots  import (
    plot_token_ratio_boxplot,
    plot_isr,
    plot_savings_vs_isr,
    plot_cost_tradeoff,
    plot_inflation_heatmap,
)
from kvtc_benchmark.report import generate


# ── Known bugs found in source audit ──────────────────────────────────────────
KNOWN_BUGS = [
    "`'in order to'` is in the filler *set* but the code checks individual words from "
    "`str.split()` — the phrase is never matched, so it is **never removed**.",

    "`'provide'` and `'please'` map to `''` (empty string) in the abbreviation dict, "
    "leaving double spaces in the output. Whitespace is not re-normalised after substitution.",

    "The abbreviation table contains only **8 source words** "
    "(function, parameter, configuration, implementation, documentation, "
    "database, provide, please). Most text will not trigger any abbreviation at all.",

    "Levels 4 and 5 apply vowel removal to **every word ≥ 5/4 chars** including "
    "IP addresses, version strings, and config keys — destroying values that are "
    "essential for factual downstream tasks.",

    "The filler set contains only **11 entries** and misses common fillers "
    "(e.g., 'kind of', 'sort of', 'you know', 'I mean', 'pretty much').",

    "Level 4 and Level 5 apply the same vowel reduction pass twice "
    "(L5 re-processes the already-reduced output of L4 on the same run). "
    "For words of length 4, L4 skips them but L5 processes them — inconsistent threshold.",
]


def main():
    raw_csv = os.path.join(RESULTS_DIR, "raw_measurements.csv")

    print("=" * 60)
    print("KVTC RIGOROUS BENCHMARK")
    print("=" * 60)

    # ── Step 1: Build corpus ───────────────────────────────────────────────────
    print("\n[1/5] Building 400-sample corpus...")
    corpus = build_corpus()
    print(f"  {len(corpus)} samples built.")
    by_type = {}
    for s in corpus:
        by_type.setdefault(s.corpus_type, 0)
        by_type[s.corpus_type] += 1
    for k, v in sorted(by_type.items()):
        print(f"  {k}: {v}")

    # ── Step 2: Run measurements ───────────────────────────────────────────────
    print("\n[2/5] Running measurements (400 samples × 5 levels × 2 tokenizers = 4000)...")
    t0 = time.perf_counter()
    measurements = run_measurements(corpus)
    elapsed = time.perf_counter() - t0
    print(f"  Done in {elapsed:.1f}s — {len(measurements)} measurements.")
    save_csv(measurements, raw_csv)

    # ── Step 3: Analyse ────────────────────────────────────────────────────────
    print("\n[3/5] Analysing results...")
    overall   = overall_by_level(measurements)
    detail    = summary_table(measurements)
    wilc      = wilcoxon_tests(measurements)
    tradeoff  = cost_quality_tradeoff(measurements)
    anomalies = detect_anomalies(measurements)

    summary = {
        "overall_by_level": overall,
        "detail_by_level_and_corpus": detail,
        "wilcoxon_tests": wilc,
        "cost_quality_tradeoff": tradeoff,
        "anomalies": anomalies,
        "known_bugs": KNOWN_BUGS,
    }
    save_json(summary, os.path.join(RESULTS_DIR, "summary.json"))

    # Print key findings immediately
    print("\n  -- KEY FINDINGS --")
    for row in overall:
        inf = f"  [INFLATION] {row['pct_inflation']}%" if row['pct_inflation'] > 0 else ""
        print(f"  L{row['level']}: mean ratio={row['token_ratio_mean']:.4f}  "
              f"ISR={row['isr_mean']}%  saved={row['token_saved_pct_mean']}%{inf}")

    print("\n  -- WILCOXON (ISR drop vs L1) --")
    for r in wilc:
        sig = "SIGNIFICANT" if r["significant_alpha05"] else "not significant"
        print(f"  L{r['level']}: ISR {r['baseline_isr_pct']}% -> {r['test_isr_pct']}%  "
              f"(drop {r['mean_isr_drop_pct']}%)  p={r['p_value']:.4f}  {sig}")

    print("\n  -- ANOMALIES --")
    if anomalies:
        for a in anomalies:
            print(f"  [!] {a}")
    else:
        print("  None detected.")

    # ── Step 4: Plots ──────────────────────────────────────────────────────────
    print("\n[4/5] Generating plots...")

    p1 = os.path.join(PLOTS_DIR, "token_ratio_boxplot.png")
    p2 = os.path.join(PLOTS_DIR, "isr_by_level_corpus.png")
    p3 = os.path.join(PLOTS_DIR, "savings_vs_isr.png")
    p4 = os.path.join(PLOTS_DIR, "cost_tradeoff.png")
    p5 = os.path.join(PLOTS_DIR, "inflation_heatmap.png")

    plot_token_ratio_boxplot(measurements, p1)
    plot_isr(measurements, p2)
    plot_savings_vs_isr(detail, p3)
    plot_cost_tradeoff(tradeoff, p4)
    plot_inflation_heatmap(detail, p5)

    # ── Step 5: Report ─────────────────────────────────────────────────────────
    print("\n[5/5] Writing report...")

    def rel(path):
        return os.path.relpath(path, RESULTS_DIR)

    plots_map = {
        "Token ratio distribution (box plot)": rel(p1),
        "Information Survival Rate by level and corpus type": rel(p2),
        "Token savings vs. ISR (quality-efficiency frontier)": rel(p3),
        "Daily cost impact (10k requests, GPT-4o pricing)": rel(p4),
        "Token inflation heatmap": rel(p5),
    }
    md = generate(
        overall=overall,
        detail=detail,
        wilcoxon=wilc,
        tradeoff=tradeoff,
        anomalies=anomalies,
        bugs=KNOWN_BUGS,
        plots=plots_map,
        n_samples=len(corpus),
    )
    report_path = os.path.join(RESULTS_DIR, "report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"  Report -> {report_path}")

    print("\n" + "=" * 60)
    print("BENCHMARK COMPLETE")
    print(f"  CSV:    {raw_csv}")
    print(f"  JSON:   {os.path.join(RESULTS_DIR, 'summary.json')}")
    print(f"  Report: {report_path}")
    print(f"  Plots:  {PLOTS_DIR}/")
    print("=" * 60)


if __name__ == "__main__":
    main()
