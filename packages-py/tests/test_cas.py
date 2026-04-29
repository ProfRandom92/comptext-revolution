"""Tests for Content-Addressed Store"""

import pytest
import asyncio
from pathlib import Path
from ct_vault_core.cas import ContentAddressedStore

@pytest.fixture
async def store():
    temp_dir = Path("/tmp/test_cas")
    temp_dir.mkdir(exist_ok=True)
    return ContentAddressedStore(temp_dir)

@pytest.mark.asyncio
async def test_store_and_retrieve(store):
    """Test basic store and retrieve."""
    data = b"test content"
    sha = await store.store(data)
    assert len(sha) == 64  # SHA-256 hex length

    retrieved = await store.retrieve(sha)
    assert retrieved == data

@pytest.mark.asyncio
async def test_deduplication(store):
    """Test content deduplication."""
    data = b"same content"
    sha1 = await store.store(data)
    sha2 = await store.store(data)
    assert sha1 == sha2

@pytest.mark.asyncio
async def test_exists(store):
    """Test existence check."""
    data = b"test"
    sha = await store.store(data)
    exists = await store.exists(sha)
    assert exists is True

    fake_sha = "0" * 64
    exists = await store.exists(fake_sha)
    assert exists is False

@pytest.mark.asyncio
async def test_stats(store):
    """Test storage statistics."""
    await store.store(b"test1")
    await store.store(b"test2")
    stats = await store.get_stats()
    assert stats["file_count"] >= 2
    assert stats["total_size_bytes"] > 0

@pytest.mark.asyncio
async def test_store_string(store):
    """Test storing strings."""
    text = "string content"
    sha = await store.store(text)
    retrieved = await store.retrieve(sha)
    assert retrieved.decode() == text
