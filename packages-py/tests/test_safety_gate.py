"""Tests for Safety Gate"""

import pytest
from ct_vault_core.safety_gate import SafetyGate, RiskLevel

@pytest.fixture
def gate():
    return SafetyGate()

def test_safe_content(gate):
    """Test detection of safe content."""
    text = "This is a normal, safe document."
    risk, violations = gate.check_output(text)
    assert risk == RiskLevel.SAFE
    assert len(violations) == 0

def test_sql_injection_detection(gate):
    """Test SQL injection detection."""
    text = "SELECT * FROM users WHERE password='pass'"
    risk, violations = gate.check_output(text)
    assert risk == RiskLevel.BLOCK
    assert len(violations) > 0

def test_xss_detection(gate):
    """Test XSS detection."""
    text = "<script>alert('xss')</script>"
    risk, violations = gate.check_output(text)
    assert risk == RiskLevel.BLOCK

def test_credential_leak_detection(gate):
    """Test credential detection."""
    text = "api_key = 'sk_live_abc123def456'"
    risk, violations = gate.check_output(text)
    assert risk == RiskLevel.BLOCK

def test_large_output(gate):
    """Test large output warning."""
    text = "x" * 150000
    risk, violations = gate.check_output(text)
    assert risk == RiskLevel.WARN

def test_sanitize_html(gate):
    """Test HTML sanitization."""
    text = "<div>Content</div>"
    sanitized = gate.sanitize(text, level="strict")
    assert "<div>" not in sanitized

def test_validate_json(gate):
    """Test JSON validation."""
    valid_data = {"key": "value"}
    is_valid, msg = gate.validate_json(valid_data)
    assert is_valid is True

def test_invalid_json(gate):
    """Test invalid JSON detection."""
    invalid_data = {123: "value"}  # Non-string key
    is_valid, msg = gate.validate_json(invalid_data)
    assert is_valid is False
