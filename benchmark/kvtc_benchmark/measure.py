"""
Core measurement module.

For every sample × level × tokenizer:
  - run KVTC
  - count tokens with tiktoken (cl100k_base = GPT-4, o200k_base = GPT-4o)
  - record char counts, token counts, ratio, and information survival

Information Survival Rate (ISR):
  Binary: does the exact marker string still appear in the compressed text?
  This is the no-LLM downstream proxy.  If the specific fact (IP, func name,
  error type) is gone, the LLM cannot answer the QA pair correctly.
"""

import sys
import os
import time
import csv
from dataclasses import dataclass, fields
from typing import List, Dict, Tuple

import tiktoken

# Locate packages-py relative to this file
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_PY_PKG = os.path.join(_REPO_ROOT, "packages-py")
if _PY_PKG not in sys.path:
    sys.path.insert(0, _PY_PKG)

from ct_vault_core.kvtc import KVTCContextController  # noqa: E402


# Tokenizer instances (module-level, loaded once)
_ENC: Dict[str, tiktoken.Encoding] = {}


def _get_enc(name: str) -> tiktoken.Encoding:
    if name not in _ENC:
        _ENC[name] = tiktoken.get_encoding(name)
    return _ENC[name]


def count_tokens(text: str, tokenizer: str) -> int:
    return len(_get_enc(tokenizer).encode(text))


TOKENIZERS = ["cl100k_base", "o200k_base"]
LEVELS = [1, 2, 3, 4, 5]


@dataclass
class Measurement:
    sample_id: str
    corpus_type: str
    level: int
    tokenizer: str
    chars_original: int
    chars_compressed: int
    chars_ratio: float          # compressed / original
    chars_saved_pct: float
    tokens_original: int
    tokens_compressed: int
    token_ratio: float          # compressed / original  (<1 = savings, >1 = INFLATION)
    token_saved_pct: float
    isr: int                    # 1 if marker survives in compressed text, else 0
    latency_ms: float           # KVTC compress() wall-clock time


def _measure_one(
    sample,
    kvtc: KVTCContextController,
    level: int,
    tokenizer: str,
) -> Measurement:
    t0 = time.perf_counter()
    result = kvtc.compress(sample.text, level=level)
    latency_ms = (time.perf_counter() - t0) * 1000

    compressed = result.compressed

    chars_orig = len(sample.text)
    chars_comp = len(compressed)
    chars_ratio = chars_comp / chars_orig if chars_orig else 1.0

    tok_orig = count_tokens(sample.text, tokenizer)
    tok_comp = count_tokens(compressed, tokenizer)
    tok_ratio = tok_comp / tok_orig if tok_orig else 1.0

    isr = 1 if sample.marker in compressed else 0

    return Measurement(
        sample_id=sample.id,
        corpus_type=sample.corpus_type,
        level=level,
        tokenizer=tokenizer,
        chars_original=chars_orig,
        chars_compressed=chars_comp,
        chars_ratio=round(chars_ratio, 4),
        chars_saved_pct=round((1 - chars_ratio) * 100, 2),
        tokens_original=tok_orig,
        tokens_compressed=tok_comp,
        token_ratio=round(tok_ratio, 4),
        token_saved_pct=round((1 - tok_ratio) * 100, 2),
        isr=isr,
        latency_ms=round(latency_ms, 3),
    )


def run_measurements(corpus) -> List[Measurement]:
    kvtc = KVTCContextController()
    results: List[Measurement] = []
    total = len(corpus) * len(LEVELS) * len(TOKENIZERS)
    done = 0

    for sample in corpus:
        for level in LEVELS:
            for tok in TOKENIZERS:
                results.append(_measure_one(sample, kvtc, level, tok))
                done += 1
                if done % 200 == 0:
                    print(f"  {done}/{total} measurements done...")

    return results


CSV_FIELDS = [f.name for f in fields(Measurement)]


def save_csv(measurements: List[Measurement], path: str) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        for m in measurements:
            w.writerow({k: getattr(m, k) for k in CSV_FIELDS})
    print(f"Saved {len(measurements)} rows -> {path}")


def load_csv(path: str) -> List[Measurement]:
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(Measurement(
                sample_id=row["sample_id"],
                corpus_type=row["corpus_type"],
                level=int(row["level"]),
                tokenizer=row["tokenizer"],
                chars_original=int(row["chars_original"]),
                chars_compressed=int(row["chars_compressed"]),
                chars_ratio=float(row["chars_ratio"]),
                chars_saved_pct=float(row["chars_saved_pct"]),
                tokens_original=int(row["tokens_original"]),
                tokens_compressed=int(row["tokens_compressed"]),
                token_ratio=float(row["token_ratio"]),
                token_saved_pct=float(row["token_saved_pct"]),
                isr=int(row["isr"]),
                latency_ms=float(row["latency_ms"]),
            ))
    return rows
