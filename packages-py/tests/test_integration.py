"""Integration Tests for CT-Vault"""

import pytest
import asyncio
from pathlib import Path
from ct_vault_core import (
    KVTCContextController,
    ContentAddressedStore,
    MemPalaceDB,
)
from ct_vault_core.database import init_db, index_chunk, search_chunks
from ct_vault_core.safety_gate import SafetyGate

@pytest.mark.asyncio
async def test_end_to_end_workflow():
    """Test complete compression → storage → search workflow."""
    kvtc = KVTCContextController()
    cas = ContentAddressedStore(Path("/tmp/test_cas_int"))
    palace = MemPalaceDB(Path("/tmp/test_palace_int.json"))
    safety = SafetyGate()

    # 1. Compress
    original_text = "This is a comprehensive documentation document."
    result = kvtc.compress(original_text, level=3)
    assert result.savings_pct > 0

    # 2. Validate safety
    risk, violations = safety.check_output(result.compressed)
    assert risk.value == "safe"

    # 3. Store in CAS
    sha = await cas.store(result.compressed.encode())
    assert len(sha) == 64

    # 4. Store memory in palace
    await palace.remember(
        "documents",
        "compressed",
        "savings",
        f"Achieved {result.savings_pct}% savings"
    )

    # 5. Recall from palace
    results = await palace.recall("savings")
    assert len(results) > 0

@pytest.mark.asyncio
async def test_compression_search_integration():
    """Test compression + indexing + search."""
    kvtc = KVTCContextController()
    await init_db()

    # Compress and index multiple documents
    docs = [
        "Machine learning algorithms are powerful.",
        "Deep learning uses neural networks.",
        "Python is great for ML development.",
    ]

    for i, doc in enumerate(docs):
        result = kvtc.compress(doc, level=2)
        await index_chunk(f"doc:{i}", "source.txt", result.compressed)

    # Search
    results = await search_chunks("learning", top_k=5)
    assert len(results) > 0

@pytest.mark.asyncio
async def test_multi_level_compression():
    """Test different compression levels."""
    kvtc = KVTCContextController()
    text = "The quick brown fox jumps over the lazy dog in the forest."

    results = []
    for level in range(1, 6):
        result = kvtc.compress(text, level=level)
        results.append(result.savings_pct)
        # Higher levels should generally compress more
        if level > 1:
            assert result.tokens_out <= results[0] * 1.1  # Within 10% of original

    # Verify increasing compression
    assert results[-1] >= results[0]  # Last level >= first level compression

@pytest.mark.asyncio
async def test_error_handling():
    """Test graceful error handling."""
    cas = ContentAddressedStore(Path("/tmp/test_cas_err"))

    # Retrieve non-existent content
    result = await cas.retrieve("0" * 64)
    assert result is None

    # Check non-existent hash
    exists = await cas.exists("0" * 64)
    assert exists is False
