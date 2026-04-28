"""Async SQLite database for chunks and FTS5 (from CT-Vault)"""

import aiosqlite
from pathlib import Path
from typing import Optional, List

DB_PATH = Path.home() / ".comptext" / "vault.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    source_uri TEXT NOT NULL,
    chunk_idx INTEGER,
    text TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    cas_sha TEXT,
    tags TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    id UNINDEXED,
    text,
    content=chunks,
    content_rowid=rowid,
    tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
    INSERT INTO chunks_fts(rowid, id, text)
    VALUES(new.rowid, new.id, new.text);
END;
"""

async def init_db():
    """Initialize database with schema."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()

async def index_chunk(chunk_id: str, source_uri: str, text: str,
                      tokens: int = 0, cas_sha: str = "", tags: str = "") -> str:
    """Add chunk to database."""
    await init_db()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO chunks(id,source_uri,text,tokens,cas_sha,tags) VALUES(?,?,?,?,?,?)",
            (chunk_id, source_uri, text, tokens, cas_sha, tags)
        )
        await db.commit()
    return chunk_id

async def search_chunks(query: str, top_k: int = 5) -> List[dict]:
    """BM25 search across chunks."""
    await init_db()
    async with aiosqlite.connect(DB_PATH) as db:
        sql = """
            SELECT c.id, c.source_uri, c.text,
                   snippet(chunks_fts, 4, '>>', '<<', '...', 10) as snippet,
                   bm25(chunks_fts) as score
            FROM chunks_fts
            JOIN chunks c ON chunks_fts.id = c.id
            WHERE chunks_fts MATCH ?
            ORDER BY score LIMIT ?
        """
        async with db.execute(sql, (query, top_k)) as cur:
            rows = await cur.fetchall()

    return [
        {
            "id": r[0],
            "source": r[1],
            "text": r[2],
            "snippet": r[3],
            "score": r[4],
        }
        for r in rows
    ]

async def get_chunks_by_source(source_uri: str) -> List[dict]:
    """Get all chunks from a source."""
    await init_db()
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT id,text,tokens FROM chunks WHERE source_uri=? ORDER BY chunk_idx",
            (source_uri,)
        ) as cur:
            rows = await cur.fetchall()
    return [{"id": r[0], "text": r[1], "tokens": r[2]} for r in rows]
