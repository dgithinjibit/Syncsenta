"""Bulk-download a Bible from API.Bible into data/gikuyu_bible/.

Defaults to the Gikuyu Bible (Biblica Open Kikuyu 2013). Pass --bible-id to
fetch any other Bible (e.g. BSB English for parallel-corpus training).

Strategy: one request per chapter (not per verse). The /chapters/{id} endpoint
returns plain text with [N] verse markers, which we split locally. That brings
total requests for a full 66-book Bible to ~1,250 — well within API.Bible's
free tier of 5,000 requests/day per key.

Usage:
    BIBLE_API_KEY=<key> python scripts/fetch_gikuyu_bible.py
    BIBLE_API_KEY=<key> python scripts/fetch_gikuyu_bible.py \
        --bible-id bba9f40183526463-01 --label english
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE = "https://api.scripture.api.bible/v1"
DEFAULT_BIBLE_ID = "be8dc4ba39edf911-01"  # Biblica Open Kikuyu 2013
DEFAULT_LABEL = "gikuyu"
OUT_ROOT = Path(__file__).resolve().parent.parent / "data" / "gikuyu_bible"

THROTTLE_SECONDS = 0.2
MAX_RETRIES = 5

VERSE_MARKER = re.compile(r"\[(\d+)\]")


def get(path: str, params: dict | None = None, *, key: str) -> dict:
    url = f"{BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"
    req = Request(url, headers={"api-key": key, "accept": "application/json"})
    backoff = 1.0
    last_err: Exception | None = None
    for _ in range(MAX_RETRIES):
        try:
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            last_err = e
            if e.code == 429 or 500 <= e.code < 600:
                time.sleep(backoff)
                backoff *= 2
                continue
            raise
        except URLError as e:
            last_err = e
            time.sleep(backoff)
            backoff *= 2
    raise RuntimeError(f"giving up on {url}: {last_err}")


def split_chapter_into_verses(content: str) -> list[tuple[int, str]]:
    """Parse '[1] text [2] more text' into [(1, 'text'), (2, 'more text'), ...]."""
    parts = VERSE_MARKER.split(content)
    # parts = ['', '1', 'text ', '2', 'more text', ...]
    out: list[tuple[int, str]] = []
    for i in range(1, len(parts) - 1, 2):
        try:
            n = int(parts[i])
        except ValueError:
            continue
        text = re.sub(r"\s+", " ", parts[i + 1]).strip()
        if text:
            out.append((n, text))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bible-id", default=DEFAULT_BIBLE_ID)
    ap.add_argument("--label", default=DEFAULT_LABEL,
                    help="output filename prefix, e.g. 'gikuyu' -> verses_gikuyu.jsonl")
    args = ap.parse_args()

    key = os.environ.get("BIBLE_API_KEY")
    if not key:
        print("error: set BIBLE_API_KEY env var", file=sys.stderr)
        return 2

    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    verses_path = OUT_ROOT / f"verses_{args.label}.jsonl"
    progress_path = OUT_ROOT / f".chapters_done_{args.label}"

    done: set[str] = set()
    if progress_path.exists():
        done = {ln.strip() for ln in progress_path.read_text().splitlines() if ln.strip()}

    print(f"[{args.label}] bible_id={args.bible_id}")
    books = get(f"/bibles/{args.bible_id}/books", key=key)["data"]
    print(f"[{args.label}] {len(books)} books, {len(done)} chapters already done")

    book_names = {b["id"]: b["name"] for b in books}
    total_new = 0

    with verses_path.open("a", encoding="utf-8") as out, progress_path.open("a", encoding="utf-8") as prog:
        for book in books:
            book_id = book["id"]
            chapters = get(f"/bibles/{args.bible_id}/books/{book_id}/chapters", key=key)["data"]
            for ch in chapters:
                ch_id = ch["id"]
                if ch_id in done:
                    continue
                if not ch.get("number", "").isdigit():
                    done.add(ch_id)
                    prog.write(ch_id + "\n")
                    prog.flush()
                    continue

                detail = get(
                    f"/bibles/{args.bible_id}/chapters/{ch_id}",
                    params={
                        "content-type": "text",
                        "include-verse-numbers": "true",
                        "include-notes": "false",
                        "include-titles": "false",
                        "include-chapter-numbers": "false",
                    },
                    key=key,
                )["data"]

                verses = split_chapter_into_verses(detail.get("content", ""))
                chapter_num = int(ch["number"])
                for vnum, vtext in verses:
                    out.write(json.dumps({
                        "bible_id": args.bible_id,
                        "label": args.label,
                        "book": book_id,
                        "book_name": book_names.get(book_id, book_id),
                        "chapter": chapter_num,
                        "verse": vnum,
                        "reference": f"{book_names.get(book_id, book_id)} {chapter_num}:{vnum}",
                        "text": vtext,
                    }, ensure_ascii=False) + "\n")
                out.flush()

                done.add(ch_id)
                prog.write(ch_id + "\n")
                prog.flush()
                total_new += len(verses)
                print(f"[{args.label}] {ch_id}: +{len(verses)} verses")
                time.sleep(THROTTLE_SECONDS)

    print(f"[{args.label}] done. +{total_new} new verses → {verses_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
