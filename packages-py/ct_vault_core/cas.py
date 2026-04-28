"""Content-Addressed Store (CAS) - SHA-256 deduplication (from CT-Vault)"""

import hashlib
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class ContentAddressedStore:
    """SHA-256 based storage with 100% deduplication."""

    def __init__(self, storage_dir: Path = None):
        if storage_dir is None:
            storage_dir = Path.home() / ".comptext" / "cas"
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def compute_hash(self, data: bytes) -> str:
        """Compute SHA-256 hash."""
        return hashlib.sha256(data).hexdigest()

    async def store(self, data: bytes, metadata: dict = None) -> str:
        """Store data in CAS, return SHA-256 hash."""
        if isinstance(data, str):
            data = data.encode()
        hash_hex = self.compute_hash(data)
        file_path = self.storage_dir / hash_hex[:2] / hash_hex[2:]
        if not file_path.exists():
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(data)
            logger.debug(f"Stored: {hash_hex} ({len(data)} bytes)")
        return hash_hex

    async def retrieve(self, hash_hex: str) -> Optional[bytes]:
        """Retrieve content by hash."""
        if len(hash_hex) != 64:
            return None
        file_path = self.storage_dir / hash_hex[:2] / hash_hex[2:]
        return file_path.read_bytes() if file_path.exists() else None

    async def exists(self, hash_hex: str) -> bool:
        """Check if content exists."""
        file_path = self.storage_dir / hash_hex[:2] / hash_hex[2:]
        return file_path.exists()

    async def get_stats(self) -> dict:
        """Get storage statistics."""
        total_size = 0
        file_count = 0
        for file_path in self.storage_dir.rglob("*"):
            if file_path.is_file():
                total_size += file_path.stat().st_size
                file_count += 1
        return {
            "total_size_bytes": total_size,
            "file_count": file_count,
            "storage_dir": str(self.storage_dir),
        }
