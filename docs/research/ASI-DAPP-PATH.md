# Can SyncSenta become a dapp on ASI? An engineering feasibility study

**Status:** Research document. Nothing in this file is implemented, deployed, or committed as a plan of record.
**Date checked:** 2026-09-29 (all web facts below were fetched on this date unless marked otherwise).
**Scope:** ASI = the Artificial Superintelligence Alliance (Fetch.ai + SingularityNET; Ocean Protocol's status changed — see below). This is a feasibility study against the deployed reality: Next.js 14 on Vercel (`sentastudio.vercel.app`), Supabase Postgres with RLS, a FastAPI agent service on Render, a Rust Omega service, Hyperon/MeTTa rules, on a 3.7 GB RAM dev laptop, with a hard no-payments/no-crypto constraint and minor learners as the primary users.

## Bottom line up front (5 lines)

1. Most of SyncSenta should stay off-chain; the database stays Supabase and a learner's transcript must never be written to any chain.
2. The one thin slice where a chain genuinely buys something a signed Supabase row cannot: a public, tamper-evident timestamp of a per-term Merkle root of learning evidence, so the platform itself cannot silently rewrite a cohort's history.
3. Even that slice has a non-chain substitute (RFC 3161 timestamps, public transparency log); the chain version is worth doing primarily because ASI:Chain's devnet is free, thematically aligned with our own blockchain-literacy curriculum, and gives our policy engine (MeTTa) a documented compilation path onto an AI chain worth a research result.
4. Agent-to-agent commerce and Ocean-style dataset publication are rejected: the first violates our no-payments constraint and is not production-grade even on ASI's side; the second is moot — Ocean left the alliance in October 2025 — and would put minors' learning data into a permanent, tradeable form.
5. Smallest demoable proof: a Python script anchoring one semester's evidence-hash root to the ASI:Chain devnet via its public faucet and explorer, plus a `/api/verify` endpoint on the existing Vercel deployment. No wallet custody by any child, no local node, no token purchase.

## What ASI is, as of 2026-09-29

### The alliance's membership moved under the marketing

The fusion of Fetch.ai, SingularityNET and Ocean Protocol into "ASI" was announced in 2024 with a token merge (FET/AGIX/OCEAN to ASI). As of 2025-10-09 Ocean Protocol formally withdrew, "effective immediately" (The Block, via TradingView), and by 2026 it operates independently with the OCEAN/ASI migration bridge suspended; its compute-to-data network "launched in beta in March 2026" on Base, and its data exchange shows "only thirty-two listed assets and fourteen active purchase orders" (Coinbureau review, fetched 2026-09-29). **Anything described as "Ocean-style dataset publication" is therefore no longer an ASI capability at all.** Sources: [1][2].

### Layer 1: ASI:Chain is in DevNet, and it is not EVM

Primary docs (docs.asichain.io, fetched 2026-09-29) state "DevNet is Live" for experimental use, and the reference client repo (github.com/asi-alliance/asi-chain, fetched 2026-09-29) describes a Scala node derived from RChain: CBC Casper consensus with proof-of-stake, smart contracts written in **Rholang**, and no EVM or Cosmos toolchain. The devnet ships with a browser wallet (`wallet.dev.asichain.io`), explorer (`explorer.dev.asichain.io`) and faucet (`faucet.dev.asichain.io`), Docker validator/observer images, a public API, and a Rust client (`github.com/singnet/rust-client`). The faucet repo exists at `github.com/asi-alliance/asi-chain-faucet` (search result, not fetched). Test assets "explicitly hold no monetary worth."

A third-party explainer (blockeden.xyz, 2026-04-11 — secondary source, treat dates as reported not verified) places the DevNet beta at November 2025, a public testnet in 2026, and mainnet "targeted late 2026 or early 2027", with the ASI token as native gas on mainnet, and a MeTTa kernel that "compiles largely into Rholang" running on a multi-threaded MORK virtual machine. I could not confirm the mainnet date, the chain-id, the fee numbers, or the MeTTa-to-Rholang maturity claim from primary sources. **I am inferring** the practical-cost figure "a first deploy costs one faucet claim and one test transaction" from the devnet's documented free-faucet model, not from a quoted fee schedule.

### The agent layer that actually runs today

The live agent ledger is the Cosmos-SDK-based network documented at network.fetch.ai (fetched 2026-09-29): Almanac agent registry (agents broadcast endpoint+signature, registrations must be periodically refreshed), ANAME name service, IBC transfers, and wallets including mobile, browser and Ledger. Docs are branded "ASI" over the Fetch.ai network; a formal sunset/rename declaration was not visible. The uAgents framework (uagents.fetch.ai, fetched 2026-09-29) is a Python library that runs against this ledger (plus, in its on-chain examples, BNB Chain testnet and Solana devnet via web3/solders), with cloud hosting on Agentverse (agentverse.ai — direct fetch blocked, 403/303; status from the developer hub listing).

The alliance developer hub (superintelligence.io/dev-hub, fetched 2026-09-29) is the honest map: uAgents onboarding and Agentverse intro are published docs; ASI:Chain is labelled DevNet; SingularityNET's marketplace is labelled "Beta Marketplace" (beta.singularitynet.io) with SDKs for Python, Web, Node.js and Java (dev.singularitynet.io, fetched 2026-09-29 — publishing flows via a "Publisher Portal" and CLI; the nav mentions ERC20 and a Cardano AGIX-ASI bridge, which I could not substantiate further). It explicitly notes the consolidated developer repository is "pending" — the toolchain is still fragmented across partner sites.

### Two things that are usable now vs announced

Usable now on a laptop: uAgents + Almanac + faucet access to the devnet (Python, a few hundred MB of deps, no local node needed — you talk to the public devnet API endpoints). Announced or gated: mainnet gas economics, staking design, ASI:Create builder platform (reported closed alpha from February 2026 by blockeden; a superintelligence.io post exists but I could not fetch it), and the MeTTa-to-Rholang toolchain. One directional oddity worth recording: on 2026-05-20 Fetch.ai launched "Agent Launch on BNB Chain, a platform that gives AI agents the ability to issue their own token" (Chainwire via TradingView, fetched 2026-09-29). Agent economics is being built on BNB Chain while ASI:Chain itself has no mainnet. That is relevant context for any claim that a SyncSenta agent would be "on ASI".

## The question the brief demands: what does a chain buy that a signed row does not?

A signed Supabase row plus `/api/verify` proves SyncSenta attested X *at read time*. It does not prove SyncSenta could not have edited the table and re-signed everything last week — the signing key and the database sit under the same single operator (a solo builder, which makes this trust model worse, not better). It also does not let a county office or a receiving secondary school check a transcript without trusting our endpoint being up and honest.

An anchor transaction proves one narrow thing: **a specific hash existed before a public, third-party-governed event that the operator cannot rewind.** Concretely, a parent disputing a term's evidence, a teacher exporting a portfolio for a school-to-school transfer, or a researcher auditing whether streak/achievement logic was retro-quiet-patched between terms can verify the term's Merkle root against an immutable timestamp they did not have to trust us for. That is the entire, honest value. Everything else — confidentiality, access control, correction, erasure — is strictly worse on-chain, as shown below.

## Recommended architecture (option A, with its wings cut)

**Verifiable learner evidence with hash anchoring: evidence stays in Supabase; only per-term aggregate hashes leave the building.**

The boundary, drawn explicitly:

| Layer | Off-chain (Supabase/Vercel/Render) | On-chain (ASI:Chain devnet today; one public chain if ever) | One-line justification |
|---|---|---|---|
| Learner identity | `profiles`, `learner_consents`, link codes | none | A child's identity record must be correctable and erasable; chain is neither. |
| Raw evidence | `learning_evidence`, `chat_messages`, `xapi_statements`, `daily_activity` | none | Contains minors' data; RLS and ODPC duties require access control, which a public chain cannot provide. |
| Term evidence set (canonical serialization) | computed and stored as `evidence_anchors.root_hash` | none (published only on demand as a printable proof) | The serialization is derivative of protected data; keep it behind the auth boundary. |
| Merkle root per class-term | `evidence_anchors` row + Ed25519 attestation signature | yes — the root hash, in a batch anchor transaction | This is the single value only the chain adds: an operator-cannot-rewind timestamp. |
| Verification artifacts | `/api/verify/[anchorId]` returns proofs + public key + explorer link | explorer URL for the anchor transaction | Two independent verification paths so the claim survives our endpoint being distrusted or down. |

**On-chain side, in one line each:** the root hash is non-personal (it is a digest over a term's evidence for a class, not attributable to a named child without the off-chain tree); it is published at batch cadence (once per term per class, roughly 6 transactions per school-year per class — cost is trivial and, on devnet, free); it is append-only in the sense we want (the audit claim is "the term's evidence was exactly this", so superseding roots are new anchors, never edits).

**Off-chain side, in one line each:** all learner-facing reads, RLS, consent gates, streak logic and the Omega memory layer stay exactly where they are, because no part of the product's pedagogical loop benefits from latency, finality, or public sharding; erasure and correction (ODPC duties, and our own learner-consent design) are only implementable off-chain; and the platform's trust surface (the public verification endpoint) is already a solved web problem.

**Honest caveat:** this thin slice could equally be anchored to a national notary, an RFC 3161 timestamp authority, or any transparency log. The chain earns its place here for three contingent reasons, and I state them as reasons, not necessities: (1) it is the same story our Grade 6-12 blockchain curriculum tells — we eat our own dog food, verifiably; (2) the MeTTa lineage of ASI:Chain matches `metta-logic/` and `rust-hyperon-bridge/`, so an auditor-facing "run the policy rules over the evidence tree and reproduce the root" demo has a plausible path that would not exist on an arbitrary chain; (3) for publication venues in AI/education, an explorer URL is a concrete artifact reviewers can check without trusting infrastructure we operate. If any of those three ever stops being true, the design degrades to option B below without touching learner code.

### The rejected options

**(B) Paid agent-to-agent commerce — SyncSenta's tutor as a metered on-chain agent.** Rejected. It collides head-on with the no-payments/cash-handling constraint (the platform's users are children; a per-call-priced tutor turns a child into a payer or a party to payment). Independently, ASI's own tooling does not support it seriously yet: the uAgents Agent Payment Protocol documentation describes itself as "a testing baseline rather than a live financial product", instructing builders to "adapt handlers to perform real transfers, persistence, retries, and idempotency" before deployment, and lists USDC-style routes — i.e. money movement, out of scope for us by policy. Agent token issuance currently lives on BNB Chain, not ASI:Chain mainnet, which does not exist. A no-payments variant (a free demo agent discoverable on Agentverse/Almanac) is technically possible and appears in Phase 3 below, but it is a marketing surface, not commerce.

**(C) Ocean-style publication of de-identified learning datasets.** Rejected twice over. First, Ocean left the alliance, so calling this "building on ASI" would be false in a paper. Second, even Ocean's own model requires a buyer, and we have no lawful basis to sell learner-derived datasets: under Kenyan law (next section) commercial use of a child's data requires provable, guardian-granted, best-interests-consented authorization, and "de-identification" of a longitudinal behavioural record (competency progress keyed by `competency_code`, streaks, misconceptions, interventions) over a small cohort of one Kenyan school is close to impossible to defend as anonymous. A permanent public ledger is the worst possible substrate for a future re-identification finding. If open learning data is ever pursued, it should be a manual, audited, permissive-license export of genuinely aggregate statistics off-chain.

**(D) Full learner records on chain "for trust", or per-learner DIDs/wallets.** Rejected. Permanence plus public verifiability plus a child's transcript is the exact opposite of what the ODPC expects; correction and erasure rights become unsatisfiable. Per-learner DIDs imply per-learner key custody — see the wallet section; both school-held and child-held variants fail.

## Minors, privacy, Kenyan law

The Data Protection Act 2019 and recent ODPC enforcement (as summarized by CIPIT's analysis of ODPC rulings, fetched 2026-09-29) impose on us: consent for a child's personal data must be given by a parent or guardian, must be explicit, verifiable and documented, and must "protect and advance the rights and best interests of the child" (Act s.33 context in that analysis); commercial use of minors' personal data is barred without that provable authorization (s.37 context), and the controller bears the full evidentiary burden. The ODPC also published a dedicated Guidance Note for Processing Children's Data (URL at odpc.go.ke, dated November 2025 in the file path). **I could not machine-read that PDF through the fetch layer; its detailed requirements (age thresholds, DPIA triggers for EdTech, pseudonymization standards) are an open question below, not a citation.** Consequences for this study:

1. A hash is only personal-data-free if it cannot be recombined with our own database by a reader to identify a child and their term results. A per-class Merkle root satisfies this; a per-learner commitment published next to a school name would not. Anchor at class-term granularity or above.
2. On-chain data is permanent. If the ODPC ever orders erasure of a cohort's records, we must be able to say honestly what remains: a digest with no published preimages is the defensible line; the digest must never have been published alongside per-learner leaves. Our design must keep that invariant in code, and `docs/research` should record it as a policy the Phase 1 validator enforces.
3. `learner_consents` already exists in the live baseline (`supabase/migrations_live/20260928000000_live_baseline.sql`). The anchoring job must treat it as a gate: no anchor over evidence from a learner without a current, valid consent row, and the anchor builder should emit the consent audit alongside its run log.
4. Our own curriculum policy already forbids asking learners for passwords, seed phrases, or wallet interaction (`docs/curriculum/AI_BLOCKCHAIN_CURRICULUM_ROADMAP.md`, "All activities use fictional or synthetic data... Blockchain is taught as a system for records and coordination"). Any architecture where a child holds a key or signs a transaction would contradict the product's stated safety rule. It stays contradicted.

## Wallets and key management in a school setting

What is unacceptable, stated plainly: a child custodying a key (no minor can meaningfully consent to self-custody of anything, recovery from a lost seed is not a lesson-plan deliverable, and a funded wallet on a child's name invites exactly the predation the ODPC rulings punished); a shared school hot wallet holding value (single point of compromise, and the moment it holds a token balance, we are handling crypto-assets for institutions — outside our constraint); custodial wallets "for" children operated by us (we become a de facto custodian of minors' assets with none of the compliance surface, and there is no Kenyan VASP regime settled enough to hide inside — open question).

What is acceptable for the recommended slice: **one operational signing key for the platform, held as a server-side secret (Vercel environment variable or Render secret), used for Ed25519 attestation signatures off-chain; and for the chain leg, a devnet account created from a randomly generated keyphrase stored in the same secret store.** No human — student, teacher, parent, or head — ever sees, signs with, or is responsible for a key. The school-facing story is: the school receives the platform's public verification key (published at a fixed URL, rotated with a signed notice) and an explorer link; that is all a school needs. If mainnet ever matters, the honest upgrade is a multisig or a threshold-signature account held by, say, the vendor and one independent education-sector party, with the key policy written before, not after, any balance exists.

## What it would cost in real work

All file paths relative to the repo root. The existing live tables this touches: `learning_evidence`, `xapi_statements`, `telemetry_events`, `chat_messages`, `daily_activity`, `learner_consents`, `profiles`, `school_classes`, `teacher_student_assignments` — all present in `supabase/migrations_live/20260928000000_live_baseline.sql` and the omega memory layer file.

### Phase 0 — the verifiable-verification layer, zero chain (the part that must exist regardless)

1. New migration `supabase/migrations_live/<ts>_evidence_anchors.sql`: table `evidence_anchors` (id, school_id, class_id, term_label, root_hash bytea, canonicalization_version, attestation_signature, public_key_jwk, anchor_tx_ref nullable, anchored_at), RLS: school actors and linked parents read rows for their scope; anchor writes only via the service role, with an insert-policy that makes `root_hash` and `term_label` immutable for non-service roles.
2. `studio/src/lib/attest/evidence-tree.ts` — deterministic canonical serializer over a class-term's evidence set (sort by `learning_evidence.id`, hash leaves, fold Merkle root) + `evidence-tree.test.ts` with a golden-file fixture so re-runs reproduce recorded roots. Unit-testable with no network, fits the laptop.
3. `studio/src/lib/attest/sign.ts` — Ed25519 sign/verify using Node's `crypto`; private key from `ASI_ATTEST_KEY` (or a neutrally named `ATTEST_KEY`) env var; refuse to run if missing rather than silently skipping.
4. `studio/src/app/api/verify/[anchorId]/route.ts` — public, rate-limited, returns root, canonicalization version, signature, public key, per-learner inclusion proof for a *requesting party who already knows the learner id* (proof verification never enumerates children), and, post-Phase 1, the explorer URL. Add a JWS-style verify mode so a school can self-check offline with a CLI copy of the verifier.
5. Wire the anchor job as a scheduled call (`vercel.json` cron or a Render cron hitting an internal-only route `studio/src/app/api/internal/anchor/route.ts` guarded by an internal secret) that computes roots per active class-term, inserts rows, and — in Phase 0 only — stops at `anchor_tx_ref = null`.
6. UI: a small "Verification" card on the parent report and teacher portfolio surfaces (existing components, e.g. `studio/src/components/teacher/...` and parent report views; exact touchpoints to be chosen at implementation) showing the anchor and a copyable verify link.

Effort estimate: the bulk of the value, roughly 3-5 focused days. This phase also fixes the standing honesty problem that `/api/verify`-style claims in the product would otherwise be self-referential.

### Phase 1 — the devnet thin slice (smallest demoable chain proof)

1. `scripts/asi_anchor/anchor_devnet.py` (new directory `scripts/asi_anchor/`): fetch one unpublished `evidence_anchors` row (service-role, read-only pattern like existing scripts under `scripts/`), derive the devnet account from the stored keyphrase, claim from `faucet.dev.asichain.io`, post the root as a devnet transaction via the public API endpoint documented on docs.asichain.io, and write `anchor_tx_ref` back. Guardrails: dry-run by default; explicit `--live-devnet` flag; refuses rows whose class contains a learner without a current `learner_consents` row; logs tx hash and explorer URL.
2. `scripts/asi_anchor/anchor_devnet.test.py` — mock the HTTP layer so CI never touches the devnet.
3. The explorer URL then flows through the Phase 0 verify endpoint — the parent sees "this class term was anchored; check the timestamp yourself, here is a link to an explorer we do not run."

Effort: 1-2 days plus a day for the devnet's own surprises. Requirements: Python only (the repo's `ai-agents` toolchain already lives there; no new local node, no Docker, no toolchain download beyond pip), well inside 3.7 GB RAM. Test tokens are explicitly worthless, so no payments, no crypto purchase, no accounting event. The demo for a conference reviewer: run it once, screenshot the explorer, publish the verification link.

### Phase 2 — research-facing extension, only if Phase 1 is stable

1. "Reproduce the root" auditor kit: a `scripts/asi_anchor/verify_export/` CLI that, given a school-sanctioned CSV export of a class-term's evidence, recomputes the canonical root offline — closing the loop for a county office that trusts nothing online. Depends on the canonicalization contract from Phase 0; `studio/src/lib/attest/` is shared TS with a small Python mirror under `scripts/`, and a cross-language golden vector in the repo pins them together.
2. MeTTa policy-visible anchoring (speculative, flagged as such): a demo that runs the `omega_claw_rules.metta` scope/hint/advance decisions over an evidence export and folds a `policy_version_hash` into the anchor preimage — making "which pedagogy produced this term's labels" auditable too. Only pursue after verifying the MeTTa-on-ASI:Chain toolchain actually exists in usable form (see open questions); otherwise keep it as an off-chain auditor kit result.

### Phase 3 — optional, no-payments presence on the agent network

Discoverability only: an Almanac-registered "SyncSenta demo agent" (uAgents, hosted via Agentverse or Render) answering public curriculum questions with no learner data, no payments, and a hard blocklist mirroring the existing deterministic release validator's prohibited-operations checks. Treat as curriculum/marketing work, scheduled after the anchor line, never before.

Explicitly out of all phases: anything touching `studio/src/app/api/payments/` or gamification `point_transactions` as a value-bearing token, any mainnet account holding balance, any child-facing wallet.

## Reconciliation with the existing blockchain-literacy curriculum

`docs/curriculum/AI_BLOCKCHAIN_CURRICULUM_ROADMAP.md` teaches blockchain "as a system for records and coordination, not as an invitation to trade cryptocurrency", with synthetic-data-only activities and a validator that rejects wallets, seed phrases and real transactions in generated material. This study's recommendation is that policy turned into infrastructure: learners never touch a chain; they produce evidence; the platform anchors a class-level digest; and the Grade 10-12 capstone lane can study our own anchors (and our own rejected options, including this document) as its primary source. The curriculum says paper-block simulations only for learners — this design keeps the real chain interactions at exactly one server-side operator, which is also what a "records and coordination" lesson claims happens.

## Open questions I could not verify from primary sources

1. ASI:Chain mainnet date, final fee/staking model, and chain-id — only secondary reporting (blockeden, Nov 2025/2026 dates) exists; the devnet docs give no mainnet commitment. Anything in a paper must be hedged accordingly.
2. Whether the old Cosmos-based agent ledger (Almanac/ANAME/IBC at network.fetch.ai) is the permanent home for agents, or is planned to fold into ASI:Chain — the docs present it as live; the alliance's chain strategy (Cosmos-based ledger, Rholang L1 in devnet, BNB Chain agent-token launch) is visibly in motion; I am inferring instability, which is itself an argument for anchoring to devnet and keeping the chain leg swappable.
3. The exact text and age threshold of the ODPC Guidance Note for Processing Children's Data (fetch layer could not parse the PDF) — read it before Phase 0 ships, not after.
4. Whether publishing a Merkle root over class-term evidence qualifies as non-personal data under the ODPC pseudonymization standard — my reading of CIPIT's summary says yes at class granularity, but the guidance note text governs, and this study should be revisited if it does not.
5. `docs.asichain.io` describes the public API but I could not verify a rate limit or the exact transaction payload schema a script may post (devnet faucet terms, account funding rules) — Phase 1 day-one work includes a probe against the live devnet endpoints.
6. Whether the MeTTa-to-Rholang compilation path exists in any public, usable form (only the secondary blockeden explainer asserts "compiles largely into Rholang"; the November 2025 announcements are fetch-blocked). Until a working toolchain is cited, Phase 2 item 2 is off the table.
7. Agentverse listing requirements, review process, and whether "verification" for agents imposes anything a Kenyan individual developer can satisfy — agentverse.ai fetch was 403/303.
8. SingularityNET Beta Marketplace listing fees or review gates, and the status of the Cardano AGIX-ASI bridge its nav implies — unverified beyond portal navigation labels.
9. Whether `ASI:Create` closed alpha admits an education project, and what it produces (contracts, deployments, both) — not verifiable beyond a secondary claim of "closed alpha, February 2026".
10. Kenyan regulatory posture on institutional holdings of crypto-assets if a school ever asked to run its own anchor node — no settled VASP regime found; flagged rather than researched here.

## Sources

Fetched on 2026-09-29 unless noted. URLs I actually retrieved, with what each was used for:

1. https://docs.asichain.io/ — ASI:Chain devnet status, wallet/explorer/faucet endpoints, rnode bootstrap and public API, Rholang/rust-client toolchain.
2. https://github.com/asi-alliance/asi-chain — reference node repo: Scala/RChain-derived, CBC Casper PoS, devnet beta status, no chain-id or roadmap dates given.
3. https://superintelligence.io/dev-hub/ — alliance developer hub: uAgents/Agentverse onboarding links, ASI:Chain devnet banner, Beta Marketplace labelling, "documentation fragmented" statement.
4. https://network.fetch.ai/docs/introduction/almanac/register-in-almanac — live Cosmos-branded agent ledger: Almanac, ANAME, IBC, wallet/Ledger support, registration refresh rule.
5. https://uagents.fetch.ai/ — uAgents framework capabilities: LocalWallet, send-tokens, Agent Payment Protocol, Name Service, Almanac, Agentverse hosting.
6. https://innovationlab.fetch.ai/resources/docs/examples/on-chain-examples/on-chain-agents — on-chain examples: Fetch/Cosmos ledger, BNB Chain testnet, Solana devnet; "native agent chats remain off-chain unless saved to contracts"; all labs testnet/devnet only.
7. https://blockeden.xyz/blog/2026-04-11/asi-alliance-asi-chain-devnet-decentralized-ai-layer1/ (secondary source) — devnet blockDAG architecture, MeTTa-to-Rholang claim, MORK VM, timeline dates, ASI:Create closed alpha, staking unspecified.
8. https://www.tradingview.com/news/the_block:6c44d4c10094b:0-ocean-protocol-withdraws-from-ai-token-alliance-with-fetch-ai-and-singularitynet/ — Ocean's exit, 2025-10-09, "effective immediately".
9. https://coinbureau.com/review/ocean-protocol (secondary source) — Ocean post-ASI state: bridge suspended, Base deployment, compute-to-data beta March 2026, exchange activity figures.
10. https://itbrief.co.uk/story/singularitynet-launches-open-source-ai-platforms-to-decentralise-development (secondary source) — Hyperon AGI Framework Alpha and ASI:Chain devnet launch, November 2025, MeTTa smart-contract compilation claim.
11. https://dev.singularitynet.io/ — marketplace publishing portal/CLI structure, Python/JS/Java SDKs, ERC20 and Cardano AGIX-ASI mentions.
12. https://uagents.fetch.ai/docs/guides/agent-payment-protocol — payment protocol status: "testing baseline rather than a live financial product", USDC/skyfire/fet_direct references.
13. https://www.tradingview.com/news/chainwire:5b17a90ed094b:0-fetch-ai-launches-platform-that-gives-ai-agents-their-own-economy/ — Agent Launch on BNB Chain, 2026-05-20.
14. https://cipit.strathmore.edu/insights-from-recent-odpc-rulings-evaluating-commercial-use-of-minors-personal-data-and-image-rights/ — ODPC ruling analysis: guardian-consent requirement, s.33/s.37 references, evidentiary burden, 18-year threshold.
15. https://www.odpc.go.ke/wp-content/uploads/2025/11/ODPC-%E2%80%93-Guidance-Note-for-Processing-Childrens-Data.pdf — existence and URL only; the fetch layer could not parse the PDF (open question 3).
16. https://fetch.ai/blog/fet-token-supply-increased-to-support-forthcoming-asi-token-merge — referenced by search only; the underlying FET-to-ASI supply change was not independently verified here.

Repo sources: `docs/curriculum/AI_BLOCKCHAIN_CURRICULUM_ROADMAP.md`; `supabase/migrations_live/20260928000000_live_baseline.sql` and `20260928000100_omega_memory_layer.sql` (tables the anchor design reads); `backend/syncsenta-backend/data/omega_claw_rules.metta` (candidate for Phase 2 policy-hash work); `studio/src/app/api/` route inventory.

## Notes on inference

Where this document says "I am inferring", the claim is reasoning from documented adjacent facts, not a citation: devnet transaction cost being effectively free (from faucet docs, not a fee table); the instability of ASI's chain strategy (from three different chains appearing in 2025-2026 announcements); "most of it stays off-chain" being adequate for our latency and RLS needs (from Supabase's own RLS/Postgres model as already deployed, not from an ASI performance guarantee); and the privacy conclusion that class-level roots are non-personal while learner-level commitments are not (from the CIPIT summary's framing, pending the ODPC guidance text itself).
