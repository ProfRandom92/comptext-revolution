"""KVTC Context Controller — Top/Middle/Bottom Sandwich (from CT-Vault)"""

import re
from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class KVTCResult:
    original: str
    compressed: str
    tokens_in: int
    tokens_out: int
    ratio: float
    savings_pct: float

class KVTCContextController:
    """KVTC Sandwich: compress middle layer, preserve sink (top) and window (bottom)."""

    def __init__(self, sink_size: int = 800, window_size: int = 1500):
        self.sink_size = sink_size
        self.window_size = window_size

    def analyze_context(self, text: str) -> Dict[str, Any]:
        """Analyze context layers for sandwich strategy."""
        total = len(text)
        return {
            'total_length': total,
            'sink_length': min(self.sink_size, total),
            'window_length': min(self.window_size, total),
            'middle_length': max(0, total - self.sink_size - self.window_size),
            'sandwich_applicable': total > (self.sink_size + self.window_size),
        }

    def compress(self, text: str, level: int = 2) -> KVTCResult:
        """KVTC compress with level 1-5."""
        try:
            import tiktoken
            enc = tiktoken.get_encoding("cl100k_base")
            tokens_in = len(enc.encode(text))
        except:
            tokens_in = len(text) // 4

        # Level 1: Normalize whitespace
        compressed = '\n'.join(
            line.strip() for line in text.splitlines() if line.strip()
        )
        compressed = re.sub(r' {2,}', ' ', compressed).strip()

        if level >= 2:
            # Remove filler words
            filler = {'basically','essentially','actually','literally','obviously',
                     'very','really','quite','just','simply','in order to'}
            words = [w for w in compressed.split() if w.lower() not in filler]
            compressed = ' '.join(words)

            # Apply abbreviations
            abbrevs = {
                'function':'fn','parameter':'param','configuration':'cfg',
                'implementation':'impl','documentation':'docs','database':'db',
                'analyze':'anlz','provide':'','please':'',
            }
            for k, v in abbrevs.items():
                compressed = re.sub(rf'\b{k}\b', v, compressed, flags=re.IGNORECASE)

        if level >= 3:
            # Remove articles
            articles = {'a','an','the'}
            words = [w for w in compressed.split() if w.lower() not in articles]
            compressed = ' '.join(words)

        if level >= 4:
            # Vowel reduction (keep first/last + consonants)
            vowels = {'a','e','i','o','u','y'}
            words = compressed.split()
            reduced = []
            for word in words:
                if len(word) >= 5:
                    out = word[0]
                    for c in word[1:-1]:
                        if c.lower() not in vowels:
                            out += c
                    out += word[-1]
                    reduced.append(out)
                else:
                    reduced.append(word)
            compressed = ' '.join(reduced)

        if level >= 5:
            # Skeleton (first + consonants + last)
            vowels = {'a','e','i','o','u','y'}
            words = compressed.split()
            skeleton = []
            for word in words:
                if len(word) >= 4:
                    sk = word[0]
                    for c in word[1:-1]:
                        if c.lower() not in vowels:
                            sk += c
                    sk += word[-1]
                    skeleton.append(sk)
                else:
                    skeleton.append(word)
            compressed = ' '.join(skeleton)

        try:
            import tiktoken
            enc = tiktoken.get_encoding("cl100k_base")
            tokens_out = len(enc.encode(compressed))
        except:
            tokens_out = len(compressed) // 4

        ratio = tokens_out / tokens_in if tokens_in else 1.0
        return KVTCResult(
            original=text,
            compressed=compressed,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            ratio=ratio,
            savings_pct=round((1 - ratio) * 100, 1)
        )
