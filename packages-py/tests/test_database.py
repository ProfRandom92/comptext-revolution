"""Tests for Database Module"""

import pytest
import asyncio
from pathlib import Path
from ct_vault_core.database import (
    init_db, index_chunk, search_chunks, get_chunks_by_source
)

@pytest.fixture
async def db():
    """Setup test database."""
    # Use in-memory sqlite for tests
    await init_db()
    yield
    # Cleanup happens in next test

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
async def test_search_chunks():
    """Test chunk searching."""
    await init_db()
    await index_chunk("doc:1", "doc.txt", "Python is great for data science")
    await index_chunk("doc:2", "doc.txt", "JavaScript runs in the browser")

    results = await search_chunks("Python", top_k=5)
    assert len(results) > 0
    assert "Python" in results[0]["text"] or results[0]["score"] > 0

@pytest.mark.asyncio
async def test_get_chunks_by_source():
    """Test getting chunks by source."""
    await init_db()
    await index_chunk("doc1:0", "source.txt", "First chunk")
    await index_chunk("doc1:1", "source.txt", "Second chunk")

    chunks = await get_chunks_by_source("source.txt")
    assert len(chunks) >= 2

@pytest.mark.asyncio
async def test_fts_ranking():
    """Test FTS5 BM25 ranking."""
    await init_db()
    await index_chunk("a:0", "a.txt", "apple orange banana")
    await index_chunk("b:0", "b.txt", "apple apple apple")

    results = await search_chunks("apple", top_k=5)
    # Higher BM25 score for more frequency
    if len(results) > 1:
        assert results[0]["score"] >= results[1]["score"]
