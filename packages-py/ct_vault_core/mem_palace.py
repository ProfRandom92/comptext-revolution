"""MemPalace System — Hierarchical [[Palace:Wing:Room:Drawer]] (from CT-Vault)"""

import re
from typing import Dict, Optional, List
from pathlib import Path
import json

LOCI_PATTERN = re.compile(r'\[\[([^:\]]+):([^:\]]+):([^:\]]+):?([^\]]*)\]\]')

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

    async def recall(self, query: str, top_k: int = 5, palace_filter: str = None) -> List[Dict]:
        """Search palace with keyword scoring (BM25-like)."""
        results = []
        query_words = set(query.lower().split())

        palaces = {palace_filter: self.data[palace_filter]} if palace_filter and palace_filter in self.data else self.data

        for palace, wings in palaces.items():
            for wing, rooms in wings.items():
                for room, drawers in rooms.items():
                    for drawer, item in drawers.items():
                        content = item.get("content", "")
                        tags = " ".join(item.get("tags", []))
                        haystack = (content + " " + tags + " " + palace + " " + wing + " " + room).lower()
                        haystack_words = set(haystack.split())

                        # Score: fraction of query words found in haystack
                        matched = query_words & haystack_words
                        if not matched:
                            # fallback: substring check
                            if any(w in haystack for w in query_words if len(w) > 3):
                                matched = {w for w in query_words if w in haystack}
                        if not matched:
                            continue

                        score = len(matched) / len(query_words)
                        results.append({
                            "palace": palace,
                            "wing": wing,
                            "room": room,
                            "drawer": drawer,
                            "snippet": content[:200],
                            "score": round(score, 3),
                            "matched_terms": list(matched),
                        })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    async def delete(self, palace: str, wing: str, room: str, drawer: str = None) -> bool:
        """Delete a memory item. Returns True if found and deleted."""
        try:
            room_data = self.data[palace][wing][room]
        except KeyError:
            return False
        if drawer:
            if drawer not in room_data:
                return False
            del room_data[drawer]
            if not room_data:
                del self.data[palace][wing][room]
        else:
            del self.data[palace][wing][room]
        # Prune empty containers
        if not self.data[palace][wing]:
            del self.data[palace][wing]
        if not self.data[palace]:
            del self.data[palace]
        self._save()
        return True

    async def list_palaces(self) -> List[str]:
        """List all palaces."""
        return list(self.data.keys())

    async def get_palace(self, palace: str) -> Dict:
        """Get entire palace structure."""
        return self.data.get(palace, {})

    async def list_all(self, palace_filter: str = None) -> List[Dict]:
        """List all memory locations with metadata."""
        items = []
        palaces = {palace_filter: self.data[palace_filter]} if palace_filter and palace_filter in self.data else self.data
        for p, wings in palaces.items():
            for w, rooms in wings.items():
                for r, drawers in rooms.items():
                    for d, item in drawers.items():
                        items.append({
                            "palace": p, "wing": w, "room": r, "drawer": d,
                            "snippet": item.get("content", "")[:100],
                            "tags": item.get("tags", []),
                        })
        return items
