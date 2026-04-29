"""Matplotlib visualisations for the benchmark report."""

import os
import numpy as np
import matplotlib
matplotlib.use("Agg")   # headless
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

COLORS = {
    "technical_docs":  "#4C72B0",
    "casual_prose":    "#DD8452",
    "code_comments":   "#55A868",
    "config_files":    "#C44E52",
}
LEVEL_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]


def _save(fig, path):
    fig.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Plot → {path}")


# ── Plot 1: Token ratio per level × corpus type (box plot) ────────────────────

def plot_token_ratio_boxplot(measurements, out_path: str, tokenizer="cl100k_base"):
    from collections import defaultdict

    corpus_types = ["technical_docs", "casual_prose", "code_comments", "config_files"]
    levels = [1, 2, 3, 4, 5]

    fig, axes = plt.subplots(1, 4, figsize=(18, 5), sharey=True)
    fig.suptitle(
        f"Token Ratio (compressed/original) by Level — {tokenizer}",
        fontsize=13, fontweight="bold",
    )

    for ax, ctype in zip(axes, corpus_types):
        data = []
        for level in levels:
            vals = [m.token_ratio for m in measurements
                    if m.corpus_type == ctype and m.level == level
                    and m.tokenizer == tokenizer]
            data.append(vals)

        bp = ax.boxplot(data, patch_artist=True, notch=False,
                        medianprops={"color": "black", "linewidth": 1.5})
        for patch, color in zip(bp["boxes"], LEVEL_COLORS):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)

        ax.axhline(1.0, color="red", linestyle="--", linewidth=1.2, label="ratio=1 (no savings)")
        ax.set_title(ctype.replace("_", " ").title(), fontsize=10)
        ax.set_xticks(range(1, 6))
        ax.set_xticklabels([f"L{i}" for i in levels])
        ax.set_xlabel("KVTC Level")
        if ax == axes[0]:
            ax.set_ylabel("Token Ratio (lower = better)")
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.2f}"))

    axes[-1].legend(loc="upper right", fontsize=8)
    _save(fig, out_path)


# ── Plot 2: Information Survival Rate per level × corpus type ─────────────────

def plot_isr(measurements, out_path: str, tokenizer="cl100k_base"):
    corpus_types = ["technical_docs", "casual_prose", "code_comments", "config_files"]
    levels = [1, 2, 3, 4, 5]
    x = np.arange(len(levels))
    width = 0.2

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.set_title("Information Survival Rate (ISR) by Level & Corpus Type",
                 fontsize=13, fontweight="bold")

    for i, ctype in enumerate(corpus_types):
        isrs = []
        for level in levels:
            vals = [m.isr for m in measurements
                    if m.corpus_type == ctype and m.level == level
                    and m.tokenizer == tokenizer]
            isrs.append(np.mean(vals) * 100 if vals else 0)
        offset = (i - 1.5) * width
        bars = ax.bar(x + offset, isrs, width, label=ctype.replace("_", " ").title(),
                      color=COLORS[ctype], alpha=0.85)

    ax.axhline(100, color="green", linestyle=":", linewidth=1, alpha=0.5)
    ax.axhline(70, color="red", linestyle="--", linewidth=1.2, label="70% threshold (danger zone)")
    ax.set_xticks(x)
    ax.set_xticklabels([f"Level {l}" for l in levels])
    ax.set_ylabel("ISR (%)")
    ax.set_ylim(0, 110)
    ax.legend(fontsize=9)
    _save(fig, out_path)


# ── Plot 3: Token savings % vs ISR (scatter, per level) ──────────────────────

def plot_savings_vs_isr(summary_rows, out_path: str, tokenizer="cl100k_base"):
    corpus_types = ["technical_docs", "casual_prose", "code_comments", "config_files"]
    levels = [1, 2, 3, 4, 5]

    fig, ax = plt.subplots(figsize=(9, 6))
    ax.set_title("Token Savings vs. Information Survival Rate\n(ideal: top-right)",
                 fontsize=12, fontweight="bold")

    for row in summary_rows:
        ctype = row["corpus_type"]
        level = row["level"]
        savings = row["token_saved_pct_mean"]
        isr = row["isr_mean"]
        color = COLORS.get(ctype, "grey")
        ax.scatter(savings, isr, c=color, s=90, alpha=0.8, zorder=3)
        ax.annotate(f"L{level}", (savings, isr),
                    textcoords="offset points", xytext=(4, 3), fontsize=7)

    # Dummy scatter for legend
    for ctype, color in COLORS.items():
        ax.scatter([], [], c=color, label=ctype.replace("_", " ").title(), s=60)

    ax.axhline(70, color="red", linestyle="--", linewidth=1, alpha=0.7, label="ISR 70%")
    ax.axvline(0, color="grey", linestyle=":", linewidth=1)
    ax.set_xlabel("Mean Token Savings (%)")
    ax.set_ylabel("Information Survival Rate (%)")
    ax.set_ylim(-5, 115)
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)
    _save(fig, out_path)


# ── Plot 4: Cost-quality tradeoff (bar chart) ─────────────────────────────────

def plot_cost_tradeoff(tradeoff_rows, out_path: str):
    levels = [r["level"] for r in tradeoff_rows]
    net_savings = [r["net_daily_savings_usd"] for r in tradeoff_rows]
    cost_saved  = [r["daily_cost_saved_usd"] for r in tradeoff_rows]
    corr_cost   = [-r["daily_correction_cost_usd"] for r in tradeoff_rows]

    x = np.arange(len(levels))
    width = 0.3

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.set_title("Daily Cost Impact (10k requests/day, GPT-4o pricing)",
                 fontsize=12, fontweight="bold")

    ax.bar(x - width/2, cost_saved, width, label="Token cost saved ($)", color="#2ca02c", alpha=0.8)
    ax.bar(x + width/2, corr_cost,  width, label="Correction cost ($, negative)", color="#d62728", alpha=0.8)

    for i, (lvl, ns) in enumerate(zip(levels, net_savings)):
        color = "green" if ns > 0 else "red"
        ax.text(x[i], max(cost_saved[i], 0) + 0.002,
                f"net: ${ns:.3f}", ha="center", fontsize=8, color=color, fontweight="bold")

    ax.axhline(0, color="black", linewidth=0.8)
    ax.set_xticks(x)
    ax.set_xticklabels([f"Level {l}" for l in levels])
    ax.set_ylabel("USD / day")
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3, axis="y")
    _save(fig, out_path)


# ── Plot 5: Inflation rate heatmap ────────────────────────────────────────────

def plot_inflation_heatmap(summary_rows, out_path: str):
    corpus_types = ["technical_docs", "casual_prose", "code_comments", "config_files"]
    levels = [1, 2, 3, 4, 5]

    grid = np.zeros((len(corpus_types), len(levels)))
    lookup = {(r["corpus_type"], r["level"]): r["pct_inflation"] for r in summary_rows}
    for i, ctype in enumerate(corpus_types):
        for j, level in enumerate(levels):
            grid[i, j] = lookup.get((ctype, level), 0)

    fig, ax = plt.subplots(figsize=(8, 4))
    im = ax.imshow(grid, cmap="RdYlGn_r", vmin=0, vmax=50, aspect="auto")
    plt.colorbar(im, ax=ax, label="% samples with token inflation (ratio ≥ 1.0)")

    ax.set_xticks(range(len(levels)))
    ax.set_xticklabels([f"L{l}" for l in levels])
    ax.set_yticks(range(len(corpus_types)))
    ax.set_yticklabels([c.replace("_", " ").title() for c in corpus_types])
    ax.set_title("Token Inflation Heatmap (% samples where compression BACKFIRES)",
                 fontsize=11, fontweight="bold")

    for i in range(len(corpus_types)):
        for j in range(len(levels)):
            val = grid[i, j]
            ax.text(j, i, f"{val:.0f}%", ha="center", va="center",
                    fontsize=10, color="black" if val < 30 else "white",
                    fontweight="bold")
    _save(fig, out_path)
