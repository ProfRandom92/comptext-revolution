"""Integration Tests for CT-Vault"""

import pytest
import asyncio
from pathlib import Path
from ct_vault_core import (
    KVTCContextController,
    ContentAddressedStore,
    MemPalaceDB,
)
from ct_vault_core.safety_gate import SafetyGate

@pytest.mark.asyncio
async def test_compression_workflow():
    """Test compression → storage workflow."""
    kvtc = KVTCContextController()
    cas = ContentAddressedStore(Path("/tmp/test_cas_int"))

    # Compress
    text = "This is a comprehensive documentation document."
    result = kvtc.compress(text, level=3)
    assert result.savings_pct > 0

    # Store in CAS
    sha = await cas.store(result.compressed.encode())
    assert len(sha) == 64

@pytest.mark.asyncio
async def test_memory_palace_workflow():
    """Test memory palace storage and recall."""
    palace = MemPalaceDB(Path("/tmp/test_palace_int.json"))

    # Store
    await palace.remember(
        "documents",
        "compressed",
        "savings",
        "Achieved 35% savings with compression"
    )

    # Recall
    results = await palace.recall("savings")
    assert isinstance(results, list)

@pytest.mark.asyncio
async def test_compression_levels():
    """Test different compression levels."""
    kvtc = KVTCContextController()
    # Use filler-rich prose that responds well to each level
    text = (
        "Please provide a detailed documentation of the function implementation "
        "and configuration parameters. It is important to note that the database "
        "connections should basically always be initialized before usage."
    )
    prev_chars = None
    for level in range(1, 6):
        result = kvtc.compress(text, level=level)
        assert result.tokens_out > 0
        # Higher levels must produce fewer or equal characters than previous level
        if prev_chars is not None:
            assert len(result.compressed) <= prev_chars
        prev_chars = len(result.compressed)
    # Level 5 must reduce character count by at least 20%
    final = kvtc.compress(text, level=5)
    assert len(final.compressed) < len(text) * 0.8

@pytest.mark.asyncio
async def test_safety_validation():
    """Test safety validation."""
    safety = SafetyGate()

    safe_text = "This is normal content."
    risk, violations = safety.check_output(safe_text)
    assert risk.value in ["safe", "warn"]

@pytest.mark.asyncio
async def test_cas_error_handling():
    """Test CAS error handling."""
    cas = ContentAddressedStore(Path("/tmp/test_cas_err"))

    # Non-existent content
    result = await cas.retrieve("0" * 64)
    assert result is None

    # Non-existent hash check
    exists = await cas.exists("0" * 64)
    assert exists is False
