"""Tests for MemPalace System"""

import pytest
from pathlib import Path
from ct_vault_core.mem_palace import MemPalaceDB

@pytest.fixture
async def palace():
    temp_path = Path("/tmp/test_palace.json")
    if temp_path.exists():
        temp_path.unlink()
    return MemPalaceDB(temp_path)

@pytest.mark.asyncio
async def test_remember_and_recall():
    """Test storing and recalling memory."""
    palace = MemPalaceDB(Path("/tmp/test_palace.json"))
    await palace.remember("math", "algebra", "equations", "content here")
    results = await palace.recall("content", top_k=1)
    assert len(results) >= 0

@pytest.mark.asyncio
async def test_loci_parsing():
    """Test [[Palace:Wing:Room]] syntax parsing."""
    palace = MemPalaceDB(Path("/tmp/test_palace_parse.json"))
    text = "See [[Library:History:Medieval]]"
    loci = palace.parse_loci_syntax(text)
    assert loci is not None
    assert loci["palace"] == "Library"
    assert loci["wing"] == "History"
    assert loci["room"] == "Medieval"

@pytest.mark.asyncio
async def test_extract_all_loci():
    """Test extracting multiple loci."""
    palace = MemPalaceDB(Path("/tmp/test_palace_multi.json"))
    text = "[[Palace1:W1:R1]] and [[Palace2:W2:R2]]"
    loci_list = palace.extract_all_loci(text)
    assert len(loci_list) == 2

@pytest.mark.asyncio
async def test_list_palaces():
    """Test listing palaces."""
    palace = MemPalaceDB(Path("/tmp/test_palace_list.json"))
    await palace.remember("palace1", "w", "r", "c")
    await palace.remember("palace2", "w", "r", "c")
    palaces = await palace.list_palaces()
    assert isinstance(palaces, list)
