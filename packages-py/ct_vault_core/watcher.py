"""File System Watcher — Auto-indexing with Watchdog (from CT-Vault)"""

import asyncio
from pathlib import Path
from watchdog.events import FileSystemEventHandler, FileModifiedEvent
from watchdog.observers import Observer
from typing import Callable, Optional
import logging

logger = logging.getLogger(__name__)

class VaultWatcher(FileSystemEventHandler):
    """Monitor directory and auto-index new/modified files."""

    def __init__(self, on_file_changed: Callable = None, extensions: list = None):
        super().__init__()
        self.on_file_changed = on_file_changed
        self.extensions = extensions or ['.txt', '.md', '.json', '.py']
        self.processing = set()

    def on_modified(self, event: FileModifiedEvent):
        """Handle file modification."""
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix in self.extensions and path not in self.processing:
            self.processing.add(path)
            try:
                if self.on_file_changed:
                    asyncio.run(self.on_file_changed(path))
            finally:
                self.processing.discard(path)

    def on_created(self, event):
        """Handle file creation."""
        if not event.is_directory:
            self.on_modified(event)

class WatcherService:
    """High-level watcher service."""

    def __init__(self, watch_dir: Path = None):
        self.watch_dir = watch_dir or Path.home() / ".comptext" / "watch"
        self.observer = None
        self.watcher = None

    async def start(self, on_file_changed: Callable = None):
        """Start watching directory."""
        self.watch_dir.mkdir(parents=True, exist_ok=True)
        self.watcher = VaultWatcher(on_file_changed)
        self.observer = Observer()
        self.observer.schedule(self.watcher, str(self.watch_dir), recursive=True)
        self.observer.start()
        logger.info(f"Watching {self.watch_dir}")

    async def stop(self):
        """Stop watching."""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("Watcher stopped")

    async def scan_existing(self, callback: Callable = None):
        """Scan existing files."""
        for file_path in self.watch_dir.rglob("*"):
            if file_path.is_file() and file_path.suffix in self.watcher.extensions:
                if callback:
                    await callback(file_path)
