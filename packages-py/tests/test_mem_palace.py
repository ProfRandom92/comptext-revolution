"""Tests for MemPalace System"""

import pytest
import asyncio
from pathlib import Path
from ct_vault_core.mem_palace import MemPalaceDB

@pytest.fixture
async def palace():
    temp_path = Path("/tmp/test_palace.json")
    if temp_path.exists():
        temp_path.unlink()
    return MemPalaceDB(temp_path)

@pytest.mark.asyncio
async def test_remember_and_recall(palace):
    """Test storing and recalling memory."""
    await palace.remember("math", "algebra", "equations", "content here")
    results = await palace.recall("content", top_k=1)
    assert len(results) > 0
    assert results[0]["palace"] == "math"

@pytest.mark.asyncio
async def test_loci_parsing(palace):
    """Test [[Palace:Wing:Room]] syntax parsing."""
    text = "See [[Library:History:Medieval]]"
    loci = palace.parse_loci_syntax(text)
    assert loci["palace"] == "Library"
    assert loci["wing"] == "History"
    assert loci["room"] == "Medieval"

@pytest.mark.asyncio
async def test_extract_all_loci(palace):
    """Test extracting multiple loci."""
    text = "[[Palace1:W1:R1]] and [[Palace2:W2:R2]]"
    loci_list = palace.extract_all_loci(text)
    assert len(loci_list) == 2

@pytest.mark.asyncio
async def test_list_palaces(palace):
    """Test listing palaces."""
    await palace.remember("palace1", "w", "r", "c")
    await palace.remember("palace2", "w", "r", "c")
    palaces = await palace.list_palaces()
    assert "palace1" in palaces
    assert "palace2" in palaces

@pytest.mark.asyncio
async def test_recall_with_tags(palace):
    """Test tagging memories."""
    await palace.remember("p", "w", "r", "content", tags="important,math")
    results = await palace.recall("content")
    assert len(results) > 0
