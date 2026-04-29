"""pytest configuration — isolate database from production"""
import pytest
import tempfile
from pathlib import Path
import ct_vault_core.database as db_module


@pytest.fixture(autouse=True)
def isolated_db(tmp_path):
    """Point database module at a fresh temp DB for every test."""
    original = db_module.DB_PATH
    db_module.DB_PATH = tmp_path / "test_vault.db"
    yield
    db_module.DB_PATH = original
