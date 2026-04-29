"""Tests for KVTC Context Controller"""

import pytest
from ct_vault_core.kvtc import KVTCContextController

@pytest.fixture
def controller():
    return KVTCContextController()

def test_compress_level1(controller):
    """Test level 1 normalization."""
    text = "This  is   a\n\ntest.\n\n\nDocument."
    result = controller.compress(text, level=1)
    assert result.tokens_in > 0
    assert result.savings_pct >= 0

def test_compress_level2(controller):
    """Test level 2 with filler words."""
    text = "This is basically basically a test document actually."
    result = controller.compress(text, level=2)
    assert "basically" not in result.compressed
    assert result.savings_pct > 0

def test_compress_level3(controller):
    """Test level 3 with articles removal."""
    text = "The quick brown fox jumps over the lazy dog."
    result = controller.compress(text, level=3)
    assert "the" not in result.compressed.lower()
    assert "a" not in result.compressed.lower()

def test_compress_level5(controller):
    """Test level 5 skeleton compression."""
    text = "This is a comprehensive documentation system."
    result = controller.compress(text, level=5)
    assert len(result.compressed) < len(result.original)
    assert result.savings_pct > 30

def test_analyze_context(controller):
    """Test context analysis."""
    text = "x" * 5000
    analysis = controller.analyze_context(text)
    assert analysis["sandwich_applicable"] is True
    assert analysis["middle_length"] > 0

def test_compression_ratio(controller):
    """Test compression ratio calculation."""
    text = "a" * 100
    result = controller.compress(text, level=2)
    assert 0 <= result.ratio <= 1.0
