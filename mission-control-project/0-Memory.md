You are about to receive a full memory system upgrade. This will install and configure every layer of the elite memory stack - without touching or deleting anything you already have. Read all instructions carefully, then execute them in order.

---

OVERVIEW - What you are installing

Layer 1: Daily Notes - auto-written session logs (you likely already have this)
Layer 2: MEMORY.md - curated long-term memory with smart structure (upgrading yours)
Layer 3: projects.md - compact project registry for fast startup context loading
Layer 4: Vector DB - PostgreSQL + pgvector semantic memory with AI-powered search
Layer 5: Smart HEARTBEAT.md loading - 4K tokens instead of 20K per heartbeat
Layer 6: Twice-weekly auto-curation cron - MEMORY.md rewrites itself automatically

---

STEP 1 - Read what you already have

Read the following files in full:
- ~/.openclaw/workspace/HEARTBEAT.md
- ~/.openclaw/workspace/MEMORY.md
- ~/.openclaw/workspace/AGENTS.md (if it exists)

Note what is already there. You will upgrade, not replace.

---

STEP 2 - Create or upgrade projects.md

Read all files in ~/.openclaw/workspace/memory/ to understand what projects, clients, and tools are already documented.

Then create or overwrite ~/.openclaw/workspace/memory/projects.md with a clean project registry. Include:
- Every active project with its live URL (if applicable)
- Current status (live / in progress / blocked)
- Tech stack (brief)
- Key notes or blockers
- File locations on disk

Format it as a markdown table or clean sections. Keep it under 80 lines total. This file loads at every heartbeat so lean is good.

If you cannot find enough info to populate it, ask the user: "What are your 3 to 5 most active projects right now? Give me the name, what it does, and the URL if it is live."

---

STEP 3 - Upgrade HEARTBEAT.md

Read the current HEARTBEAT.md. Add the following block at the very TOP of the file (above everything else). Do not remove anything that is already there:

## SMART MEMORY LOADING (do this first, every heartbeat)
Before anything else, load context efficiently:
1. Read memory/projects.md - compact project registry (~1K tokens)
2. Read MEMORY.md - curated long-term memory (~3K tokens)
3. Only load daily notes (memory/YYYY-MM-DD.md) when asked about specific past work
4. Only run vector search when a specific question about past work comes up

This gives full context at ~10% of the token cost. Daily notes are archives, not runtime docs.

---

STEP 4 - Upgrade MEMORY.md

Read the current MEMORY.md. Add a new section called "## Memory System" (if it does not already exist) with the following content:

## Memory System
- Daily notes: memory/YYYY-MM-DD.md - raw session logs, written automatically, load on-demand
- MEMORY.md: curated long-term brain - load every heartbeat (~3K tokens)
- projects.md: compact project registry - load every heartbeat (~1K tokens)
- Vector DB: PostgreSQL + pgvector, semantic search via AI embeddings
- Smart loading: only projects.md + MEMORY.md at startup. Daily notes + vector search = on-demand only. Saves ~80% token cost vs loading everything.

Also update the Last updated date at the top of MEMORY.md to today's date.

---

STEP 5 - Install Vector Memory (PostgreSQL + pgvector)

5a - Check if PostgreSQL is installed
Run: which psql
If not found, install it:
- macOS: brew install postgresql@17 && brew services start postgresql@17 && echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
- Linux: sudo apt install postgresql postgresql-contrib

5b - Install vector-memory skill scripts

Run: mkdir -p ~/.openclaw/workspace/skills/vector-memory/scripts/

Then write each of the following 4 files to disk exactly as shown:

FILE 1: ~/.openclaw/workspace/skills/vector-memory/scripts/memory_flush.py
---
#!/usr/bin/env python3
"""Flush daily memory files into vector database."""
import argparse, glob, hashlib, json, os, re, sys, urllib.request
import psycopg2

DB = "dbname=openclaw_memory"
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
EMBED_MODEL = "gemini-embedding-001"
WORKSPACE = os.path.expanduser("~/.openclaw/workspace")
MEMORY_DIR = os.path.join(WORKSPACE, "memory")
FLUSH_TRACKER = os.path.join(MEMORY_DIR, "vector-flush-tracker.json")

def get_embedding(text):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:embedContent?key={GEMINI_KEY}"
    payload = json.dumps({"model": f"models/{EMBED_MODEL}", "content": {"parts": [{"text": text}]}, "outputDimensionality": 768}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["embedding"]["values"]

def load_tracker():
    if os.path.exists(FLUSH_TRACKER):
        with open(FLUSH_TRACKER) as f: return json.load(f)
    return {"flushed_files": {}}

def save_tracker(t):
    with open(FLUSH_TRACKER, "w") as f: json.dump(t, f, indent=2)

def chunk_markdown(text, source_file):
    chunks, current_section, current_text = [], "", []
    for line in text.split("\n"):
        if re.match(r'^#{1,3}\s', line):
            if current_text:
                content = "\n".join(current_text).strip()
                if len(content) > 20:
                    chunks.append({"text": content, "label": current_section.strip("# ").strip(), "source_file": source_file})
            current_section, current_text = line, [line]
        else:
            current_text.append(line)
    if current_text:
        content = "\n".join(current_text).strip()
        if len(content) > 20:
            chunks.append({"text": content, "label": current_section.strip("# ").strip(), "source_file": source_file})
    return chunks

def file_hash(fp):
    with open(fp) as f: return hashlib.md5(f.read().encode()).hexdigest()

def flush(dry_run=False, force=False):
    tracker = load_tracker()
    conn = psycopg2.connect(DB) if not dry_run else None
    files = sorted(glob.glob(os.path.join(MEMORY_DIR, "*.md")))
    memory_md = os.path.join(WORKSPACE, "MEMORY.md")
    if os.path.exists(memory_md): files.append(memory_md)
    total_stored = 0
    for filepath in files:
        fname = os.path.basename(filepath)
        fhash = file_hash(filepath)
        if not force and fname in tracker["flushed_files"] and tracker["flushed_files"][fname] == fhash:
            continue
        with open(filepath) as f: content = f.read()
        chunks = chunk_markdown(content, fname)
        if dry_run:
            print(f"[DRY RUN] {fname}: {len(chunks)} chunks")
            continue
        cur = conn.cursor()
        cur.execute("DELETE FROM memories WHERE metadata->>'source_file' = %s", (fname,))
        for chunk in chunks:
            embedding = get_embedding(chunk["text"])
            vec_str = "[" + ",".join(str(v) for v in embedding) + "]"
            cur.execute("INSERT INTO memories (text, label, category, source, embedding, metadata) VALUES (%s,%s,%s,%s,%s::vector,%s)",
                (chunk["text"], chunk["label"], "daily-note", "flush", vec_str, json.dumps({"source_file": fname})))
            total_stored += 1
        conn.commit(); cur.close()
        tracker["flushed_files"][fname] = fhash
        print(f"[FLUSHED] {fname}: {len(chunks)} chunks stored")
    if conn: conn.close()
    save_tracker(tracker)
    print(json.dumps({"total_stored": total_stored, "files_processed": len(files)}))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--force", action="store_true")
    args = p.parse_args()
    flush(args.dry_run, args.force)
---

FILE 2: ~/.openclaw/workspace/skills/vector-memory/scripts/memory_search.py
---
#!/usr/bin/env python3
"""Search memories by semantic similarity."""
import argparse, json, os, urllib.request
import psycopg2

DB = "dbname=openclaw_memory"
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
EMBED_MODEL = "gemini-embedding-001"

def get_embedding(text):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:embedContent?key={GEMINI_KEY}"
    payload = json.dumps({"model": f"models/{EMBED_MODEL}", "content": {"parts": [{"text": text}]}, "outputDimensionality": 768}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["embedding"]["values"]

def search(query, limit=5, category=None, min_score=0.0):
    embedding = get_embedding(query)
    vec_str = "[" + ",".join(str(v) for v in embedding) + "]"
    sql = "SELECT id, text, label, category, source, created_at, 1-(embedding<=>%s::vector) as similarity FROM memories"
    params = [vec_str, vec_str, limit]
    if category:
        sql += " WHERE category=%s"
        params = [vec_str, vec_str, category, limit]
    sql += " ORDER BY embedding<=>%s::vector LIMIT %s"
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    cur.execute(sql, params)
    results = [{"id": r[0], "text": r[1], "label": r[2], "category": r[3], "source": r[4], "created_at": r[5].isoformat(), "similarity": round(float(r[6]),4)} for r in cur.fetchall() if float(r[6]) >= min_score]
    cur.close(); conn.close()
    print(json.dumps({"query": query, "count": len(results), "results": results}, indent=2))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("query")
    p.add_argument("--limit", "-n", type=int, default=5)
    p.add_argument("--category", "-c", default=None)
    p.add_argument("--min-score", type=float, default=0.3)
    args = p.parse_args()
    search(args.query, args.limit, args.category, args.min_score)
---

FILE 3: ~/.openclaw/workspace/skills/vector-memory/scripts/memory_store.py
---
#!/usr/bin/env python3
"""Store a memory with vector embedding."""
import argparse, json, os, urllib.request
import psycopg2

DB = "dbname=openclaw_memory"
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
EMBED_MODEL = "gemini-embedding-001"

def get_embedding(text):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:embedContent?key={GEMINI_KEY}"
    payload = json.dumps({"model": f"models/{EMBED_MODEL}", "content": {"parts": [{"text": text}]}, "outputDimensionality": 768}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["embedding"]["values"]

def store(text, label=None, category=None, source="conversation", metadata=None):
    embedding = get_embedding(text)
    vec_str = "[" + ",".join(str(v) for v in embedding) + "]"
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    cur.execute("INSERT INTO memories (text,label,category,source,embedding,metadata) VALUES (%s,%s,%s,%s,%s::vector,%s) RETURNING id,created_at",
        (text, label, category, source, vec_str, json.dumps(metadata or {})))
    row = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    print(json.dumps({"id": row[0], "created_at": row[1].isoformat(), "label": label, "category": category, "text": text[:100]}))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("text")
    p.add_argument("--label", "-l", default=None)
    p.add_argument("--category", "-c", default=None)
    p.add_argument("--source", "-s", default="conversation")
    p.add_argument("--meta", "-m", default=None)
    args = p.parse_args()
    store(args.text, args.label, args.category, args.source, json.loads(args.meta) if args.meta else None)
---

FILE 4: ~/.openclaw/workspace/skills/vector-memory/scripts/memory_forget.py
---
#!/usr/bin/env python3
"""Delete memories by id, category, or age."""
import argparse, json
import psycopg2
from datetime import datetime, timedelta

DB = "dbname=openclaw_memory"

def forget(id=None, category=None, older_than_days=None):
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    if id: cur.execute("DELETE FROM memories WHERE id=%s RETURNING id,text", (id,))
    elif category: cur.execute("DELETE FROM memories WHERE category=%s RETURNING id,text", (category,))
    elif older_than_days:
        cutoff = datetime.now() - timedelta(days=older_than_days)
        cur.execute("DELETE FROM memories WHERE created_at<%s RETURNING id,text", (cutoff,))
    else:
        print("Error: provide --id, --category, or --older-than"); return
    deleted = cur.fetchall()
    conn.commit(); cur.close(); conn.close()
    print(json.dumps({"deleted": len(deleted), "ids": [r[0] for r in deleted]}))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--id", type=int, default=None)
    p.add_argument("--category", default=None)
    p.add_argument("--older-than", type=int, default=None)
    args = p.parse_args()
    forget(args.id, args.category, args.older_than)
---

After writing all 4 files, verify they exist:
Run: ls ~/.openclaw/workspace/skills/vector-memory/scripts/

5c - Install Python dependency
Run: pip3 install psycopg2-binary
(This is the Python driver that connects to PostgreSQL. Required for all 4 scripts.)

5d - Set up the database
Run: psql postgres -c "CREATE DATABASE openclaw_memory;" 2>/dev/null || echo "DB may already exist"
Run: psql openclaw_memory -c "CREATE EXTENSION IF NOT EXISTS vector;"
Run: psql openclaw_memory -c "CREATE TABLE IF NOT EXISTS memories (id SERIAL PRIMARY KEY, text TEXT NOT NULL, label TEXT, category TEXT, source TEXT, embedding vector(768), metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW());"
Run: psql openclaw_memory -c "CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops);"

5e - Check for Gemini API key
The vector memory system uses Google Gemini for embeddings (free tier, no credit card needed).
Run: echo $GEMINI_API_KEY
If empty, ask the user: "Do you have a Google Gemini API key? Get one free at aistudio.google.com. Paste it here and I will configure it."
Once you have the key, add it to your shell profile:
- macOS/Linux: echo 'export GEMINI_API_KEY="your-key-here"' >> ~/.zshrc && source ~/.zshrc

5f - Run the initial memory flush
Run: python3 ~/.openclaw/workspace/skills/vector-memory/scripts/memory_flush.py
Report back how many memories were stored.

---

STEP 6 - Add twice-weekly auto-curation cron

Use the OpenClaw cron tool to create a job with these settings:
- Name: "Twice-Weekly MEMORY.md Auto-Curation"
- Schedule: cron expression "0 5 * * 3,0" (Wednesday and Sunday at 5am local time)
- Session target: isolated
- Model: anthropic/claude-sonnet-4-20250514 (or your default model)
- Delivery: announce to your chat when complete

The cron agent message:

Your job is to auto-curate MEMORY.md.

STEP 1: Find the 7 most recent daily note files. Run: ls ~/.openclaw/workspace/memory/*.md | sort | tail -10 then read each one.
STEP 2: Read current MEMORY.md in full.
STEP 3: Identify what is stale (old stats, outdated project info), what is new (decisions, clients, launches), and what should be removed.
STEP 4: Rewrite MEMORY.md with accurate, current information. Keep the same sections. Update numbers. Add new sections for major new things. Remove outdated info. Update the Last Updated date. Max 400 lines.
STEP 5: Run: python3 ~/.openclaw/workspace/skills/vector-memory/scripts/memory_flush.py
STEP 6: Update projects.md with any status changes you found.
Announce a brief summary when done.

---

STEP 7 - Add vector memory flush to HEARTBEAT.md

Add this to your HEARTBEAT.md near the bottom:

## Vector Memory Flush (every heartbeat)
Run: python3 ~/.openclaw/workspace/skills/vector-memory/scripts/memory_flush.py
If total_stored = 0, that is fine - means nothing new to embed.

---

STEP 8 - Verify everything works

Run these 4 checks and report results:
1. python3 ~/.openclaw/workspace/skills/vector-memory/scripts/memory_search.py "recent projects"
2. cat ~/.openclaw/workspace/memory/projects.md
3. head -20 ~/.openclaw/workspace/HEARTBEAT.md
4. List cron jobs to confirm the auto-curation cron was created

---

STEP 9 - Summary report

When all steps are complete, give me a summary:
- Layers installed (checkmark each one)
- Number of memories in vector DB
- Projects in projects.md
- Cron scheduled for (next run date)
- Any steps that failed or need manual attention

---

You now have the most advanced OpenClaw memory system available. Your agent will load context in 4K tokens instead of 20K+ (80% savings), search memory semantically, auto-update its long-term memory twice a week, and never forget what you have built, decided, or discussed.

Let's go.