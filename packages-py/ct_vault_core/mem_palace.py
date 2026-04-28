"""MemPalace System — Hierarchical [[Palace:Wing:Room:Drawer]] (from CT-Vault)"""

import re
from typing import Dict, Optional, List
from pathlib import Path
import json

LOCI_PATTERN = re.compile(r'\[\[([^:]+):([^:]+):([^:]+):?([^\]]*)\]\]')

class MemPalaceDB:
    """Hierarchical memory system with [[Palace:Wing:Room:Drawer]] syntax."""

    def __init__(self, db_path: Path = None):
        if db_path is None:
            db_path = Path.home() / ".comptext" / "palace.json"
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.data = self._load() if self.db_path.exists() else {}

    def _load(self) -> Dict:
        try:
            return json.loads(self.db_path.read_text())
        except:
            return {}

    def _save(self):
        self.db_path.write_text(json.dumps(self.data, indent=2))

    @staticmethod
    def parse_loci_syntax(text: str) -> Optional[Dict[str, str]]:
        """Parse [[Palace:Wing:Room:Drawer]] from text."""
        match = LOCI_PATTERN.search(text)
        if not match:
            return None
        return {
            'palace': match.group(1).strip(),
            'wing': match.group(2).strip(),
            'room': match.group(3).strip(),
            'drawer': match.group(4).strip() if match.group(4) else None,
        }

    @staticmethod
    def extract_all_loci(text: str) -> List[Dict[str, str]]:
        """Extract all loci from text."""
        loci_list = []
        for match in LOCI_PATTERN.finditer(text):
            loci_list.append({
                'palace': match.group(1).strip(),
                'wing': match.group(2).strip(),
                'room': match.group(3).strip(),
                'drawer': match.group(4).strip() if match.group(4) else None,
            })
        return loci_list

    async def remember(self, palace: str, wing: str, room: str,
                       content: str, drawer: str = None, tags: str = "") -> str:
        """Store memory in palace hierarchy."""
        key = f"{palace}:{wing}:{room}"
        if drawer:
            key += f":{drawer}"

        if palace not in self.data:
            self.data[palace] = {}
        if wing not in self.data[palace]:
            self.data[palace][wing] = {}
        if room not in self.data[palace][wing]:
            self.data[palace][wing][room] = {}

        self.data[palace][wing][room][drawer or "default"] = {
            "content": content,
            "tags": tags.split(",") if tags else [],
        }
        self._save()
        return key

    async def recall(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search palace for matching content."""
        results = []
        query_lower = query.lower()

        for palace, wings in self.data.items():
            for wing, rooms in wings.items():
                for room, drawers in rooms.items():
                    for drawer, item in drawers.items():
                        content = item.get("content", "")
                        if query_lower in content.lower():
                            results.append({
                                "palace": palace,
                                "wing": wing,
                                "room": room,
                                "drawer": drawer,
                                "snippet": content[:200],
                                "score": 1.0 if query_lower == content.lower() else 0.5,
                            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    async def list_palaces(self) -> List[str]:
        """List all palaces."""
        return list(self.data.keys())

    async def get_palace(self, palace: str) -> Dict:
        """Get entire palace structure."""
        return self.data.get(palace, {})
