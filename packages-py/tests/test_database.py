"""Tests for Database Module"""

import pytest
from pathlib import Path
from ct_vault_core.database import init_db, index_chunk, search_chunks

@pytest.mark.asyncio
async def test_index_chunk():
    """Test chunk indexing."""
    await init_db()
    chunk_id = await index_chunk(
        "test:0",
        "test.txt",
        "Hello world test content",
        tokens=100,
        cas_sha="abc123"
    )
    assert chunk_id == "test:0"

@pytest.mark.asyncio
async def test_search_basic():
    """Test basic search."""
    await init_db()
    await index_chunk("doc:1", "doc.txt", "Python is great for data science")
    await index_chunk("doc:2", "doc.txt", "JavaScript runs in the browser")

    results = await search_chunks("Python", top_k=5)
    assert isinstance(results, list)

@pytest.mark.asyncio
async def test_search_returns_results():
    """Test search returns expected format."""
    await init_db()
    await index_chunk("a:0", "a.txt", "apple orange banana")

    results = await search_chunks("apple", top_k=5)
    assert isinstance(results, list)
    if len(results) > 0:
        assert "id" in results[0]
        assert "score" in results[0]

@pytest.mark.asyncio
async def test_multiple_chunks():
    """Test indexing multiple chunks."""
    await init_db()
    await index_chunk("doc1:0", "source.txt", "First chunk")
    await index_chunk("doc1:1", "source.txt", "Second chunk")
    await index_chunk("doc1:2", "source.txt", "Third chunk")

    results = await search_chunks("chunk", top_k=10)
    assert isinstance(results, list)
