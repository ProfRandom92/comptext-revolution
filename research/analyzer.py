"""
CompText Revolution - Results Analysis & Reporting
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime

class ExperimentAnalyzer:
    """Analyze experiment results and generate insights"""

    def __init__(self, results_dir: Path = None):
        self.results_dir = results_dir or Path("research/results")

    def load_latest_results(self, experiment_name: str) -> Dict:
        """Load the latest results for an experiment"""
        result_files = sorted(
            self.results_dir.glob(f"{experiment_name}_*.json"),
            reverse=True
        )

        if not result_files:
            return None

        with open(result_files[0]) as f:
            return json.load(f)

    def compare_variants(self, results: Dict) -> Tuple[Dict, List[str]]:
        """Compare variants and identify best performer(s)"""
        variants = results.get("variants", [])

        if not variants:
            return {}, []

        # Calculate scores for each variant
        scores = {}
        for variant in variants:
            variant_name = variant["variant_name"]
            metrics = {m["name"]: m["value"] for m in variant["metrics"]}

            # Weighted scoring (higher is better for most metrics)
            # except latency and cost where lower is better
            score = 0
            weight_sum = 0

            for metric_name, metric_value in metrics.items():
                if "latency" in metric_name.lower() or "cost" in metric_name.lower():
                    # Lower is better
                    score += (100 - metric_value) * 0.5
                    weight_sum += 0.5
                elif "ratio" in metric_name.lower():
                    # Lower is better for ratio
                    score += (1 / metric_value) * 50
                    weight_sum += 1
                else:
                    # Higher is better
                    score += metric_value
                    weight_sum += 1

            scores[variant_name] = score / weight_sum if weight_sum > 0 else 0

        # Sort by score
        sorted_variants = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        best_variants = [v[0] for v in sorted_variants[:3]]

        return scores, best_variants

    def generate_report(self, experiment_name: str) -> str:
        """Generate a detailed analysis report"""
        results = self.load_latest_results(experiment_name)

        if not results:
            return f"No results found for {experiment_name}"

        report = []
        report.append("╔" + "═" * 70 + "╗")
        report.append("║ " + f"Experiment Report: {experiment_name}".ljust(68) + " ║")
        report.append("╚" + "═" * 70 + "╝")
        report.append("")

        # Summary
        report.append("SUMMARY")
        report.append("─" * 70)
        report.append(f"Experiment: {results.get('experiment')}")
        report.append(f"Timestamp: {results.get('timestamp')}")
        report.append(f"Total Variants: {len(results.get('variants', []))}")
        report.append("")

        # Variant Comparison
        report.append("VARIANT COMPARISON")
        report.append("─" * 70)

        variants = results.get("variants", [])
        for i, variant in enumerate(variants, 1):
            report.append(f"\n#{i} {variant['variant_name']}")
            report.append(f"Status: {'✓ PASS' if variant['success'] else '✗ FAIL'}")

            for metric in variant.get("metrics", []):
                report.append(
                    f"  {metric['name']}: {metric['value']} {metric.get('unit', '')}"
                )

        # Analysis
        report.append("\n" + "─" * 70)
        report.append("ANALYSIS")
        report.append("─" * 70)

        scores, best_variants = self.compare_variants(results)

        report.append("\nVariant Rankings:")
        for i, (variant_name, score) in enumerate(sorted(scores.items(), key=lambda x: x[1], reverse=True), 1):
            report.append(f"  {i}. {variant_name}: {score:.2f}")

        if best_variants:
            report.append(f"\nRecommended Variants: {', '.join(best_variants)}")

        # Insights
        report.append("\nKey Insights:")
        max_metric_values = self._get_max_metric_values(variants)
        for metric_name, values in max_metric_values.items():
            best_variant, best_value = max(
                values.items(),
                key=lambda x: x[1] if "ratio" not in metric_name and "cost" not in metric_name and "latency" not in metric_name else 1/x[1]
            )
            direction = "↑" if "ratio" not in metric_name and "cost" not in metric_name and "latency" not in metric_name else "↓"
            report.append(f"  • {metric_name} {direction}: {best_variant} ({best_value})")

        # Recommendations
        report.append("\nRECOMMENDATIONS")
        report.append("─" * 70)
        report.append(f"1. Deploy variant: {best_variants[0] if best_variants else 'TBD'}")
        report.append("2. Monitor key metrics in production")
        report.append("3. Schedule next optimization round in 2 weeks")

        return "\n".join(report)

    def _get_max_metric_values(self, variants: List[Dict]) -> Dict[str, Dict[str, float]]:
        """Extract metric values across variants"""
        metrics = {}

        for variant in variants:
            for metric in variant.get("metrics", []):
                metric_name = metric["name"]
                if metric_name not in metrics:
                    metrics[metric_name] = {}

                metrics[metric_name][variant["variant_name"]] = metric["value"]

        return metrics

    def generate_comparison_table(self, results: Dict) -> str:
        """Generate a comparison table"""
        variants = results.get("variants", [])

        if not variants:
            return "No variants to compare"

        # Collect all metrics
        all_metrics = set()
        for variant in variants:
            for metric in variant.get("metrics", []):
                all_metrics.add(metric["name"])

        # Build table
        lines = []
        header = ["Variant"] + sorted(all_metrics)
        lines.append(" | ".join(header))
        lines.append("─" * (sum(len(h) + 3 for h in header)))

        for variant in variants:
            row = [variant["variant_name"]]
            metric_dict = {m["name"]: f"{m['value']} {m.get('unit', '')}" for m in variant.get("metrics", [])}

            for metric in sorted(all_metrics):
                row.append(metric_dict.get(metric, "—"))

            lines.append(" | ".join(row))

        return "\n".join(lines)


def main():
    """Run analysis on all experiments"""
    analyzer = ExperimentAnalyzer()

    experiments = [
        "compression-variants",
        "level-tuning",
        "storage-allocation",
    ]

    for exp in experiments:
        print(analyzer.generate_report(exp))
        print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    main()
