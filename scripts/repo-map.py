#!/usr/bin/env python3
"""Render the repository's real shape as one offline HTML file.

Why this exists instead of `gitdiagram`: gitdiagram shells out to Graphviz'
`dot` binary, which is not installed here and cannot be installed without a
sudo password. This script needs only the standard library plus `git`, and it
draws the same thing — a branch topology over time — as inline SVG, so the
output opens in any browser with no network and no renderer dependency.

Usage:
    python3 scripts/repo-map.py [-o docs/architecture/repo-map.html]

Sections:
  1. History graph — every remote branch, its fork point, its tip, and its
     disposition (live / landed as a squash merge / orphan / abandoned).
  2. Module mind map — where code actually lives and which spine runs through
     it.
  3. Branch triage table — the same facts as rows, for copy-paste.
"""

from __future__ import annotations

import argparse
import html
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import date, datetime
from json import loads
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def git(*args: str) -> str:
    result = subprocess.run(
        ("git", "-C", str(REPO), *args),
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def merge_base(a: str, b: str) -> str:
    """`git merge-base` exits 1 for unrelated histories, which is a real answer."""
    result = subprocess.run(
        ("git", "-C", str(REPO), "merge-base", a, b),
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


@dataclass
class Branch:
    name: str
    tip: str
    tip_date: date
    ahead: int
    behind: int
    fork_date: date | None
    orphan: bool
    # Filled in after construction once PR state is known.
    merged_pr: str | None = None
    note: str = ""
    tree_identical: bool = False
    pr_state_known: bool = True

    @property
    def disposition(self) -> str:
        if self.name == "main":
            return "spine"
        if self.orphan:
            return "orphan"
        if self.ahead == 0:
            return "current"
        # A branch whose commits are all absent from main but whose content
        # landed as a squash merge is residue: it can never merge cleanly.
        if self.merged_pr:
            return "landed"
        if not self.pr_state_known:
            # GitHub did not answer; "still needs shipping" would be a guess.
            return "unknown"
        if self.behind > 60:
            return "abandoned"
        return "live"

    @property
    def span(self) -> tuple[date, date]:
        start = self.fork_date or self.tip_date
        return (start, max(start, self.tip_date))


def remote_branches() -> list[Branch]:
    raw = git("ls-remote", "--heads", "origin")
    names = [line.split("refs/heads/", 1)[1] for line in raw.splitlines() if line]
    branches: list[Branch] = []

    for name in names:
        ref = f"origin/{name}"
        tip = git("rev-parse", "--short", ref)
        tip_date = parse_date(git("log", "-1", "--format=%ad", "--date=short", ref))
        base = merge_base("origin/main", ref)
        orphan = base == ""
        branches.append(
            Branch(
                name=name,
                tip=tip,
                tip_date=tip_date,
                ahead=0 if orphan else int(git("rev-list", "--count", f"origin/main..{ref}")),
                behind=0 if orphan else int(git("rev-list", "--count", f"{ref}..origin/main")),
                fork_date=None if orphan else parse_date(git("log", "-1", "--format=%ad", "--date=short", base)),
                orphan=orphan,
            )
        )

    return branches


def parse_date(value: str) -> date:
    return datetime.strptime(value.strip()[:10], "%Y-%m-%d").date()


def mark_tree_identity(branches: list[Branch]) -> None:
    """Flag branches whose tree is byte-for-byte main's tree.

    `git cherry` cannot answer "is this landed?" here: the trunk is squash-merged,
    so patch-ids never match even when the content is identical. Comparing tree
    objects is exact and cheap — an identical tree proves there is nothing to
    salvage, whatever the commit graph says.
    """
    main_tree = git("rev-parse", "origin/main^{tree}")
    for branch in branches:
        if branch.orphan or branch.name == "main":
            continue
        branch.tree_identical = git("rev-parse", f"origin/{branch.name}^{{tree}}") == main_tree


def link_prs(branches: list[Branch]) -> None:
    """Attach each branch to its PR, using GitHub's own record.

    Squash merges erase branch identity from git, but the PR still stores its
    `headRefName`, so `gh pr list` answers this authoritatively — no title
    matching. When GitHub does not answer, every branch keeps an explicit
    `unknown` verdict rather than silently defaulting to "still needs shipping".
    """
    prs = gh_prs()
    if prs is None:
        for branch in branches:
            branch.pr_state_known = False
        return

    for branch in branches:
        if branch.name == "main":
            # An old PR was opened from the trunk itself; that is not evidence
            # about main's state.
            continue
        entry = prs.get(branch.name)
        if not entry:
            continue
        state, number, title = entry
        if state == "OPEN":
            branch.note = f"open PR #{number}: {title}"
        else:
            branch.merged_pr = f"#{number}"
            branch.note = f"landed as PR #{number}: {title}"


def gh_prs() -> dict[str, tuple[str, str, str]] | None:
    """headRefName -> (state, number, title), newest PR first; None if GitHub was unreachable.

    Returning `None` rather than `{}` matters: an empty dict and a failed call
    produce different verdicts downstream, and quietly reading a network failure
    as "this branch has no PR" would label finished work as live.
    """
    try:
        result = subprocess.run(
            (
                "gh", "pr", "list", "--repo", repo_slug(),
                "--state", "all", "--limit", "200",
                "--json", "headRefName,number,title,state",
            ),
            capture_output=True,
            text=True,
            timeout=90,
        )
        if result.returncode != 0:
            print(f"warning: gh pr list failed ({result.stderr.strip()[:160]}); PR state unknown", file=sys.stderr)
            return None
        rows = loads(result.stdout)
    except Exception as error:  # network, timeout, missing gh
        print(f"warning: PR lookup unavailable ({type(error).__name__}); PR state unknown", file=sys.stderr)
        return None

    found: dict[str, tuple[str, str, str]] = {}
    for row in rows:  # already newest-first
        found.setdefault(row["headRefName"], (row["state"], str(row["number"]), row["title"]))
    return found


def repo_slug() -> str:
    url = git("remote", "get-url", "origin")
    return url.split("github.com/", 1)[1].removesuffix(".git")


# ---------------------------------------------------------------------------
# SVG drawing
# ---------------------------------------------------------------------------

COLORS = {
    "spine": "#0f172a",
    "live": "#16a34a",
    "current": "#16a34a",
    "landed": "#94a3b8",
    "abandoned": "#f59e0b",
    "unknown": "#7c3aed",
    "orphan": "#dc2626",
}


def history_svg(branches: list[Branch], width: int = 1180) -> str:
    span_branches = [b for b in branches if b.disposition != "orphan"]
    start = min(b.span[0] for b in span_branches)
    end = max(b.span[1] for b in span_branches)
    days = max((end - start).days, 1)

    left, right = 320, 40
    top, lane_h = 58, 26
    plot_w = width - left - right
    lanes = sorted(span_branches, key=lambda b: (b.span[0], b.name))
    height = top + len(lanes) * lane_h + 60

    def x(d: date) -> float:
        return left + plot_w * ((d - start).days / days)

    parts: list[str] = [
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="branch topology over time" '
        f'xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif">',
        f'<rect width="{width}" height="{height}" fill="#ffffff"/>',
    ]

    # Month gridlines.
    cursor = date(start.year, start.month, 1)
    while cursor <= end:
        gx = x(cursor)
        parts.append(f'<line x1="{gx:.1f}" y1="{top-24}" x2="{gx:.1f}" y2="{height-46}" stroke="#e2e8f0"/>')
        parts.append(f'<text x="{gx:.1f}" y="{height-28}" font-size="11" fill="#64748b" text-anchor="middle">{cursor.strftime("%b %Y")}</text>')
        cursor = (date(cursor.year + (cursor.month == 12), (cursor.month % 12) + 1, 1))

    # main spine.
    spine_y = top + lane_h / 2
    parts.append(
        f'<line x1="{x(start):.1f}" y1="{spine_y:.1f}" x2="{x(end):.1f}" y2="{spine_y:.1f}" '
        f'stroke="{COLORS["spine"]}" stroke-width="3"/>'
    )

    for index, branch in enumerate(lanes):
        y = top + index * lane_h + lane_h / 2
        b_start, b_end = branch.span
        colour = COLORS.get(branch.disposition, "#94a3b8")

        if branch.name != "main":
            parts.append(
                f'<path d="M {x(b_start):.1f} {y:.1f} L {x(b_end):.1f} {y:.1f}" stroke="{colour}" '
                f'stroke-width="4" stroke-linecap="round" opacity="0.9"/>'
            )
            # Fork connector back to the spine.
            spine_index = lanes.index(next(b for b in lanes if b.name == "main"))
            spine_y_i = top + spine_index * lane_h + lane_h / 2
            parts.append(
                f'<path d="M {x(b_start):.1f} {spine_y_i:.1f} C {x(b_start):.1f} {(spine_y_i+y)/2:.1f}, '
                f'{x(b_start):.1f} {(spine_y_i+y)/2:.1f}, {x(b_start):.1f} {y:.1f}" stroke="{colour}" '
                f'stroke-width="1.5" fill="none" stroke-dasharray="3 3" opacity="0.8"/>'
            )

        parts.append(f'<circle cx="{x(b_end):.1f}" cy="{y:.1f}" r="4.5" fill="{colour}"/>')
        label = f'{branch.name}  ·  {branch.disposition}  ·  +{branch.ahead}/-{branch.behind}'
        parts.append(
            f'<text x="{left-12}" y="{y+4:.1f}" font-size="12.5" fill="#0f172a" text-anchor="end">'
            f'{html.escape(label)}</text>'
        )

    orphans = [b for b in branches if b.disposition == "orphan"]
    if orphans:
        oy = height - 52
        parts.append(
            f'<text x="{left}" y="{oy}" font-size="12" fill="#dc2626">unrelated history (no merge base with '
            f'main — drawn off the timeline): '
            f'{html.escape(", ".join(f"{b.name} @ {b.tip}" for b in orphans))}</text>'
        )

    parts.append("</svg>")
    return "\n".join(parts)


def mind_map_svg() -> str:
    """The repo as it is, and the spine a request travels through."""
    boxes = [
        # (id, label, lines, x, y, w, tone)
        ("studio", "studio/ — Next.js 14 App Router\nVercel: sentastudio.vercel.app", [], 40, 40, 320, "blue"),
        ("auth", "src/lib/auth/\nroute-policy · role-home", [], 40, 150, 160, "slate"),
        ("mw", "src/middleware.ts\ncookie-aware gate", [], 230, 150, 130, "slate"),
        ("pub", "app/(public)/\nlanding · auth/signin · consent · report", [], 40, 240, 320, "slate"),
        ("main", "app/(main)/dashboard/**\nlegacy shell — now redirects", [], 40, 320, 320, "amber"),
        ("roles", "app/{student,teacher,parent,head}/\nreal workspaces, useAuth()", [], 40, 400, 320, "green"),
        ("api", "app/api/**\nchat · trust · consent · data-requests", [], 400, 40, 240, "blue"),
        ("chain", "src/lib/llm/provider-chain.ts\nordered providers, one timeout budget", [], 400, 130, 240, "slate"),
        ("omega", "src/lib/omega-agent/metta-core.ts\ndeterministic tutoring policy", [], 400, 215, 240, "green"),
        ("supa", "Supabase\nauth · profiles.role · RLS", [], 400, 305, 240, "violet"),
        ("agents", "ai-agents/ — FastAPI + LangGraph\nRender", [], 700, 40, 260, "blue"),
        ("laya", "syncsenta_agents/decisions/\nkeyword baseline + gated Laya PoC", [], 700, 130, 260, "amber"),
        ("rust", "rust-core/  (policy source of truth)\nbackend/ Rust Axum — not deployed", [], 700, 215, 260, "slate"),
        ("docs", "docs/ · .kiro/specs/\nWORK_PROMPT · submission scope · branch audit", [], 700, 305, 260, "slate"),
    ]
    edges = [
        ("mw", "auth"), ("auth", "roles"), ("main", "roles"), ("api", "chain"), ("api", "omega"),
        ("api", "supa"), ("supa", "roles"), ("agents", "laya"), ("omega", "rust"), ("pub", "api"),
    ]
    tones = {
        "blue": ("#dbeafe", "#1d4ed8"),
        "slate": ("#e2e8f0", "#334155"),
        "green": ("#dcfce7", "#15803d"),
        "amber": ("#fef3c7", "#b45309"),
        "violet": ("#ede9fe", "#6d28d9"),
    }
    pos: dict[str, tuple[float, float, float, float]] = {}
    for bid, label, _lines, x0, y0, w, _tone in boxes:
        pos[bid] = (x0, y0, w, 58)

    height = 400 + 58 + 90
    parts = [
        f'<svg viewBox="0 0 1000 {height}" xmlns="http://www.w3.org/2000/svg" '
        f'font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif">',
        f'<rect width="1000" height="{height}" fill="#ffffff"/>',
    ]
    for a, b in edges:
        (ax, ay, aw, ah), (bx, by, bw, bh) = pos[a], pos[b]
        parts.append(
            f'<line x1="{ax+aw/2:.0f}" y1="{ay+ah:.0f}" x2="{bx+bw/2:.0f}" y2="{by:.0f}" '
            f'stroke="#cbd5e1" stroke-width="1.5"/>'
        )
    for bid, label, _lines, x0, y0, w, tone in boxes:
        fill, stroke = tones[tone]
        parts.append(
            f'<rect x="{x0}" y="{y0}" width="{w}" height="58" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="1.4"/>'
        )
        first, second = label.split("\n", 1)
        parts.append(f'<text x="{x0+12}" y="{y0+23}" font-size="13" font-weight="600" fill="#0f172a">{html.escape(first)}</text>')
        parts.append(f'<text x="{x0+12}" y="{y0+42}" font-size="11.5" fill="#334155">{html.escape(second)}</text>')

    spine_y = height - 62
    parts.append(
        f'<text x="40" y="{spine_y}" font-size="12.5" font-weight="600" fill="#0f172a">the spine every bug in this '
        f'branch sat on:</text>'
    )
    parts.append(
        f'<text x="40" y="{spine_y+22}" font-size="12.5" fill="#334155">Supabase session → profiles.role → '
        f'getRoleHome() → route gate (middleware + isProtectedWorkspace) → workspace UI → /api/chat → Omega policy → '
        f'provider chain.</text>'
    )
    parts.append(
        f'<text x="40" y="{spine_y+42}" font-size="12.5" fill="#b45309">Anything on that line that reads identity '
        f'from a cookie instead of the session is the same defect wearing a different hat.</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)


def triage_table(branches: list[Branch]) -> str:
    rows = []
    order = {"spine": 0, "live": 1, "current": 1, "unknown": 2, "abandoned": 3, "landed": 4, "orphan": 5}
    for branch in sorted(branches, key=lambda b: (order.get(b.disposition, 9), -b.ahead)):
        if branch.tree_identical:
            action = f"tree is byte-identical to main — delete, nothing can be salvaged"
        else:
            action = {
                "spine": "keep — trunk",
                "live": "ship it, then delete the branch",
                "current": "already merged",
                "unknown": "PR state unknown (GitHub did not answer) — re-run before deciding",
                "abandoned": "decide: reopen as a spike, or delete",
                "landed": f"content landed as {branch.merged_pr or 'a squash merge'} — delete the branch",
                "orphan": "sanitized snapshot with unrelated history — never mergeable",
            }[branch.disposition]
        tree_cell = "—" if branch.name == "main" else ("identical" if branch.tree_identical else "differs")
        # A branch with no shared history has no meaningful ahead/behind; counting
        # its commits against main would read as "1 commit away" instead of
        # "unrelated".
        ahead_cell = "n/a" if branch.orphan else f"+{branch.ahead}"
        behind_cell = "n/a" if branch.orphan else f"-{branch.behind}"
        rows.append(
            "<tr>"
            f"<td><code>{html.escape(branch.name)}</code></td>"
            f"<td>{html.escape(branch.disposition)}</td>"
            f"<td class=num>{ahead_cell}</td>"
            f"<td class=num>{behind_cell}</td>"
            f"<td>{tree_cell}</td>"
            f"<td>{branch.fork_date or '—'}</td>"
            f"<td>{branch.tip_date}</td>"
            f"<td>{html.escape(branch.note or action)}</td>"
            "</tr>"
        )
    return (
        "<table><thead><tr><th>branch</th><th>disposition</th><th>ahead</th><th>behind</th>"
        "<th>tree vs main</th><th>forked</th><th>tip</th><th>what to do</th></tr></thead><tbody>"
        + "".join(rows) + "</tbody></table>"
    )


PAGE = """<!doctype html>
<html lang=en>
<meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>SyncSenta — repo map</title>
<style>
 body{{margin:0;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}}
 main{{max-width:1220px;margin:0 auto;padding:28px 20px 64px}}
 h1{{font-size:22px;margin:0 0 6px}} h2{{font-size:16px;margin:34px 0 10px}}
 p{{font-size:13.5px;line-height:1.55;color:#334155;max-width:100ch}}
 .card{{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px;overflow:auto}}
 table{{border-collapse:collapse;width:100%;font-size:12.5px}}
 th,td{{text-align:left;padding:7px 9px;border-bottom:1px solid #eef2f7;vertical-align:top}}
 th{{background:#f1f5f9;font-weight:600}} td.num{{text-align:right;font-variant-numeric:tabular-nums}}
 code{{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}}
 .legend{{font-size:12.5px;color:#475569;margin-top:8px}}
 .dot{{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 4px 0 14px}}
</style>
<main>
<h1>SyncSenta — where the repository actually is</h1>
<p>Generated by <code>scripts/repo-map.py</code> from live git data, so it is a snapshot of
<code>origin</code> at run time, not a hand-drawn claim. {commit_count} commits on main since
{first_date}. The trunk is squash-merged, so git cannot tell whether a branch landed — each row
below gets that from GitHub's own PR record plus a tree comparison.</p>

<h2>1 · History graph</h2>
<div class=card>{history}</div>
<p class=legend><span class=dot style="background:#0f172a"></span>trunk
<span class=dot style="background:#16a34a"></span>live work
<span class=dot style="background:#f59e0b"></span>drifted / abandoned
<span class=dot style="background:#94a3b8"></span>content already landed, branch is residue
<span class=dot style="background:#7c3aed"></span>PR state unknown (GitHub unreachable)
<span class=dot style="background:#dc2626"></span>unrelated history</p>

<h2>2 · Module map and the spine</h2>
<div class=card>{mindmap}</div>

<h2>3 · Branch triage</h2>
<div class=card>{table}</div>

<h2>4 · Where the map says the work goes next</h2>
<p>{next_steps}</p>
</main>
"""

NEXT = (
    "The trunk is squash-merged, which is exactly what makes this graph misleading at a glance: a branch "
    "can show +12 commits and still be fully landed, because squashing throws away the parent link that "
    "would prove it. Reading it correctly needs GitHub's own record (which head ref each PR came from) and "
    "a tree comparison, not the arrow count. Doing that: ten of the twelve non-main branches are residue "
    "whose PR is already merged, one is a dead experiment 101 commits behind, one is a sanitized snapshot "
    "with no shared history with main at all, and one is real work in flight (the legacy-auth cleanup, "
    "PR #16). Notably the grade-6 curriculum branch is NOT pending: PR #13's commit list matches the branch "
    "commit for commit and its tip is the branch tip, so the long-standing plan item to 'land the grade-6 "
    "branch' is already finished and should be replaced by deleting the branch. Two more facts hold the map "
    "together: the Rust backend under backend/ is not deployed, so the deployed system is studio + ai-agents "
    "+ Supabase; and every bug in this branch's family came from one wrong assumption — that a user's "
    "identity lives in a cookie — which is why the module map draws it as a single spine rather than four "
    "unrelated defects."
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("-o", "--out", default="docs/architecture/repo-map.html")
    args = parser.parse_args()

    branches = remote_branches()
    link_prs(branches)
    mark_tree_identity(branches)

    commit_count = int(git("rev-list", "--count", "origin/main"))
    first_date = parse_date(git("log", "origin/main", "--reverse", "--format=%ad", "--date=short")[:10])

    out = REPO / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        PAGE.format(
            history=history_svg(branches),
            mindmap=mind_map_svg(),
            table=triage_table(branches),
            commit_count=commit_count,
            first_date=first_date,
            next_steps=html.escape(NEXT),
        ),
        encoding="utf-8",
    )
    print(f"wrote {out.relative_to(REPO)}")
    for branch in sorted(branches, key=lambda b: b.name):
        print(f"{branch.name:52s} {branch.disposition:10s} +{branch.ahead:>3} -{branch.behind:>3} fork={branch.fork_date or 'n/a'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
