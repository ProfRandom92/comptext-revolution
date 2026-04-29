"""CT-Vault Core — Proven token compression & memory system from 12.665 LOC"""

__version__ = "0.2.0"

from .cas import ContentAddressedStore
from .kvtc import KVTCContextController, KVTCResult
from .mem_palace import MemPalaceDB
from .database import init_db
from .safety_gate import SafetyGate, RiskLevel
from .watcher import WatcherService, VaultWatcher

__all__ = [
    "ContentAddressedStore",
    "KVTCContextController",
    "KVTCResult",
    "MemPalaceDB",
    "SafetyGate",
    "RiskLevel",
    "WatcherService",
    "VaultWatcher",
    "init_db",
]
