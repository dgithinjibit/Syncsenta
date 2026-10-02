#!/usr/bin/env python3
"""Differential parity harness: ``keyword_baseline.py`` vs ``emotional-intelligence.ts``.

The Python port is only useful as a fail-open path if it behaves identically to
the TypeScript rule shipping in the studio. Instead of trusting a hand-written
case list, this script compiles the real ``analyzeEmotionalState`` with ``tsc``,
runs a few thousand generated learner turns through both implementations under
node, and exits non-zero on the first disagreement.

Usage::

    python scripts/check_keyword_baseline_parity.py [case_count]

Requires node + npx on PATH (the studio toolchain). Nothing is written to the
repo; the compiled JS goes to a temp directory.
"""

from __future__ import annotations

import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent / "src"))

TS_SOURCE = REPO_ROOT / "studio" / "src" / "lib" / "emotional-intelligence.ts"

# Fragments chosen to hit every keyword list, the override order, and the two
# structural rules (repeated questions, short messages), plus whitespace and
# casing edge cases where JS and Python tokenizers are known to differ.
FRAGMENTS = [
    # frustration
    "i don't understand", "i don't get it", "this is hard", "too difficult",
    "i can't", "i give up", "this doesn't make sense", "confused",
    "why is this so hard", "i'm stuck", "help", "i'm lost",
    # confusion
    "what does", "how do", "why", "what is", "explain", "i'm not sure",
    "maybe", "i think", "is it", "could it be",
    # confidence
    "i know", "i understand", "i got it", "i see", "that makes sense",
    "i can do this", "i think i know", "let me try",
    # excitement
    "wow", "cool", "awesome", "amazing", "i love", "this is fun",
    "interesting", "great", "yay", "!", "nice",
    # neutral / local / structural edge cases
    "the fraction", "half of", "nine", "bus fare", "nafanyaje", "sasa",
    "M-PESA", "  ", "\t", "", "a", "  b   c  ", "???", "HELP", "Why?",
    "I'M STUCK!", "sawa",
]


def _random_message(rng: random.Random) -> str:
    parts = [rng.choice(FRAGMENTS) for _ in range(rng.randint(0, 4))]
    text = rng.choice([" ", ", ", "", " - "]).join(parts)
    roll = rng.random()
    if roll < 0.25:
        return text.upper()
    if roll < 0.4:
        return text.title()
    return text


def _random_history(rng: random.Random) -> list:
    base = rng.choice(FRAGMENTS)
    turns = []
    for _ in range(rng.choice([0, 1, 2, 3, 4, 6])):
        role = rng.choice(["user", "model"])
        if role == "user" and rng.random() < 0.5:
            content = base + rng.choice(["", " again", " please", " sawa"])
        else:
            content = _random_message(rng)
        turns.append({"role": role, "content": content})
    return turns


def build_cases(count: int, seed: int = 7) -> list:
    rng = random.Random(seed)
    return [
        {"message": _random_message(rng), "history": _random_history(rng)}
        for _ in range(count)
    ]


def compile_typescript(workdir: Path) -> Path:
    target = workdir / "emotional-intelligence.js"
    if target.exists():
        return target
    if not TS_SOURCE.exists():
        sys.exit(f"cannot find {TS_SOURCE} — run this from inside the SyncSenta repo")
    result = subprocess.run(
        [
            "npx", "--yes", "tsc", str(TS_SOURCE),
            "--outDir", str(workdir),
            "--module", "commonjs",
            "--target", "es2019",
            "--skipLibCheck",
        ],
        cwd=str(REPO_ROOT / "studio"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if not target.exists():
        sys.exit(
            "tsc did not produce JS:\n" + result.stdout.decode(errors="replace")[-3000:]
        )
    return target


def run_typescript(cases: list, module: Path) -> list:
    script = f"""
const mod = require({json.dumps(str(module))});
const fs = require('fs');
const cases = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = cases.map(c => ({{
  ...mod.analyzeEmotionalState(c.message, c.history.length ? c.history : undefined),
}}));
fs.writeFileSync(1, JSON.stringify(out));
"""
    proc = subprocess.run(
        ["node", "-e", script],
        input=json.dumps(cases).encode(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if proc.returncode != 0:
        sys.exit("node failed:\n" + proc.stderr.decode(errors="replace")[-3000:])
    return json.loads(proc.stdout.decode())


def main() -> int:
    from syncsenta_agents.decisions.keyword_baseline import analyze_emotional_state

    count = int(sys.argv[1]) if len(sys.argv) > 1 else 4000
    workdir = Path(tempfile.mkdtemp(prefix="keyword-parity-"))
    try:
        module = compile_typescript(workdir)
        cases = build_cases(count)
        ts_results = run_typescript(cases, module)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)

    mismatches = []
    distribution: dict = {}
    for case, theirs in zip(cases, ts_results):
        mine = analyze_emotional_state(case["message"], case["history"] or None).to_camel_case()
        distribution[theirs["sentiment"]] = distribution.get(theirs["sentiment"], 0) + 1
        if mine != theirs:
            mismatches.append({"input": case, "python": mine, "typescript": theirs})

    print(f"cases: {len(cases)}  mismatches: {len(mismatches)}")
    print(f"typescript sentiment distribution: {json.dumps(distribution, sort_keys=True)}")
    frustrated = sum(1 for t in ts_results if t["sentiment"] == "frustrated")
    print(f"frustration_signal=true rate: {frustrated / len(ts_results):.1%}")

    for mismatch in mismatches[:10]:
        print(json.dumps(mismatch, ensure_ascii=False))

    return 1 if mismatches else 0


if __name__ == "__main__":
    raise SystemExit(main())
