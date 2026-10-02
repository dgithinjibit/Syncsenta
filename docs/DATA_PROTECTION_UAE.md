# Data protection for a UAE learner — age, guardian consent, residency

**What this is.** A review of what SyncSenta actually does with a child's data, measured against the UAE
instruments that apply to an education platform serving pupils there, plus the smallest set of changes that
would make the answer defensible to a school's legal officer. Written 2026-10-02, in the hour before the BASIX
video, so it deliberately does not touch code.

**What this is not.** Not legal advice, and not a filing. I am an agent reading a summary of the law on official
and law-firm pages, not the Arabic primary text; every rule below carries the tier it deserves, and §8 lists
what a person with a UAE qualification has to confirm before this document can be quoted to a customer.

Tiers, as `docs/BASIX-NORTH-STAR.md` defines them: **A** = proven by a command run in this repository today;
**B** = recorded but not verified against primary text; **C** = appears in our own docs and is false or stale.

---

## 1. The instruments this answers to

| Instrument | What it requires of a platform like this | Tier |
|---|---|---|
| Federal Decree-Law No. 45 of 2021 (PDPL), with its Executive Regulations | A child's personal data may not be collected or used where the child is **under 13** unless clear consent is obtained from the parent or guardian; consent must be easy to withdraw; the usual data-subject rights (access, correction, deletion, portability) and breach notification to the regulator apply to the processing as a whole | B — read from the UAE government portal's own summary, not the gazette |
| Federal Decree-Law No. 26 of 2025 on Child Digital Safety, in force **1 January 2026** | Digital platforms must put **effective age verification** in place; for child users, processing needs **explicit, documented, verifiable parental consent**, **default high-privacy settings**, and notification of the competent agencies about criminal content involving children; sanctions include partial or full blocking of the service, with the penalty schedule left to a later Administrative Penalties Regulation | B |
| Cabinet Resolution No. 106 of 2026 | Children **under 15** may not create, use or operate personal accounts on social-media platforms — relevant to SyncSenta only insofar as a class leaderboard, a peer feed or a learner-to-learner message is treated as a social account | B |
| Separate regimes | ADGM and DIFC run their own data-protection regulations; Dubai has the Dubai Data Law and the In-Country Technical Framework for cloud services used by government entities; health and education data handled *for* a government body can carry in-country hosting expectations that a private school does not | B — do not quote without confirming which body the payer is |
| Age of majority | Press coverage says the civil age of majority moved to **18** in 2026; the primary text was behind a 403 when checked | B, weak — confirm before relying |

The one number that changes the product is **13**. The one that changes the *architecture* is 26/2025's demand
for age verification and documented, verifiable parental consent.

## 2. What SyncSenta does with a learner's data today

All of this is Tier A, read from the files on 2026-10-02.

**The tables exist, and they are the right shape.** `supabase/migrations_live/20260928000000_live_baseline.sql`
(the 2026-09-28 capture of what production actually holds) creates `profiles` with `date_of_birth date` nullable,
`grade`, `region`, `timezone` defaulting to `'Africa/Nairobi'`, `language_preference`, `children_ids uuid[]`;
`parent_student_links (parent_profile_id, student_profile_id, status, linked_at, revoked_at)`;
`student_link_codes`; and `learner_consents (subject_id, granted_by, purpose, policy_version, status, scope,
granted_at, revoked_at, expires_at)`. A guardian-link mechanism and a versioned, revocable, expiring consent
record are already in the schema. This is the good news, and it means the fix is wiring, not migration.

**Nothing reads age as a gate.** `studio/src/app/api/chat/route.ts:224` selects `date_of_birth` from `profiles`,
`:376` turns it into an `ageBand` via `ageBandFromDateOfBirth()` (`:132`: bands `5 and under`, `6–8`, `9–11`,
`12–14`, `15–17`, `18+`), and `studio/src/lib/chat/socratic-prompts.ts:209` and `:284` interpolate
`Age band: ${learnerContext.ageBand || "not provided"}` into the tutor's **system prompt**. With a NULL
`date_of_birth` the band is `undefined`, the prompt says "not provided", and the request goes out anyway. When
no profile row is found at all the handler synthesises one with `date_of_birth: null` (`:231`) and continues.
So today: **an unknown age is a pass, not a block.** A 12-year-old and a 16-year-old get the same treatment
from the code, and an account with no date of birth gets the most permissive treatment of all.

**Consent is accepted by an endpoint that does not store it.** `studio/src/app/api/parental-consent/route.ts`
validates the caller's session and role, parses a consent record, then calls `persistTrustRecord(…)`, which
returns `persisted: false` — the Firestore branch was deleted precisely because it would have started writing
children's consent records into a retired database with no reviewed policy. The public page at `/parental-consent`
renders, the POST answers `202`, and no durable consent row is written, even though `learner_consents` is
sitting in production with a `policy_version` and a `revoked_at` column built for exactly this.

**Learner context leaves the building.** The tutor's chain (`studio/src/lib/llm/provider-chain.ts`) sends the
system prompt — carrying the learner's `full_name`, `grade`, `language_preference`, `timezone` and derived age
band — to a third-party model provider (groq today, gemini as the configured backup). The provider list, their
processing locations and any transfer safeguard are **not** published in the repository, and the privacy page
says so itself: `studio/src/app/(public)/privacy/page.tsx` states that "a production release must publish the
final provider list, processing purposes, locations, retention periods, and contractual safeguards before live
minor data is enabled". That sentence is the most honest line in the product and it is currently the only
control.

**One handler runs with the elevated key.** `studio/src/app/api/chat/route.ts:218` takes
`getSupabaseServerClient()` — the service-role client — into `supabaseAdmin` and uses it for writes at `:608`,
`:719`, `:752`, `:782`, `:786` (`api_usage`, quota RPC, and the persistence path handed to helpers). Those writes
bypass RLS by design. For a system holding children's data, every service-role write is a place where a policy
bug becomes silent rather than a rejected query, and the trust surface has already been moved off that pattern
(`lib/backend/trust-backend.ts` now resolves the caller from the session through the RLS-enforcing client).

**The submitted feature is not in scope for any of this.** The scheme reconciler reads two `.metta` packs and one
hand-written JSON draft (`docs/basix-sample-audit/`), makes no network request, no model call, and holds no
learner record. A UAE reviewer can run `node developer_tools/scripts/reconcile.mts` and see a decision derived
from rules with no child data in the loop. Whatever else is true about the platform, the thing being submitted
today is the compliant part of it.

## 3. The gaps, ranked, each with the smallest fix

1. **No age gate.** Requirement: PDPL under-13 consent; 26/2025 age verification. Fix: in `/api/chat` and any
   learner-context read, treat `date_of_birth IS NULL` as a distinct state — `age_unknown` — and refuse the
   third-party path for it, offering the rule-only tutor instead. Roughly 40 lines plus one test that asserts a
   NULL DOB cannot reach `completeWithFallback()`.
2. **Consent that is not written.** Fix: point `/api/parental-consent` at `learner_consents` under RLS, keyed by
   `policy_version`, and make `persisted: false` a *500*, not a 202. The table already exists; this is one route
   and one test.
3. **No link between a guardian and a learner at consent time.** Fix: require an active `parent_student_links`
   row (or a `student_link_codes` redemption, which is how a school-mediated link happens) before a consent
   record is accepted for an under-18 profile. No new table.
4. **The provider chain is undisclosed.** Fix: a published processing table — provider, model, purpose, region,
   retention, and the transfer basis — rendered from one source the code can read, so the page cannot drift from
   the config. Until then, no UAE school data.
5. **High-privacy defaults are not defaults.** 26/2025 asks for child users to start private. The class
   leaderboard is the exposure to fix first: a ranked list of named pupils is exactly the disclosure a parent
   should have to opt *into*. Fix: pseudonymous leaderboard (initials or avatar token) by default, opt-in for
   names.
6. **Age of the account holder is never verified, only claimed.** Self-declared DOB is not "effective age
   verification". The defensible mechanism here is institutional: the school attests the roster, and the
   attestation is recorded (`who`, `when`, `which roster version`) — cheaper and less invasive than an ID upload,
   and ID uploads would breach minimisation for a 13-year-old.
7. **Retention is undefined.** `chat_messages`, `learning_evidence`, `telemetry_events`, `xapi_statements`,
   `camera_frames`-adjacent paths and `api_usage` have no stated period in the repository. Fix: a retention table
   per category, enforced by one scheduled delete, documented on the same page as §4's provider table.
8. **Arabic.** The privacy and consent pages are English-only (`/privacy` read today; no locale routing found in
   `studio/src/app`). A notice a guardian cannot read is not consent. The `language_preference` column exists and
   already carries the Kiswahili direction; an Arabic value there needs the two pages to follow it.

## 4. The age model, decided rather than described

- Store `date_of_birth` (already a column), never store a computed age — age is derived at read time, so a
  birthday cannot make a stored value lie.
- Derive the band server-side and send **only the band** downstream. Today's code already does this, and it is
  the one thing to keep: the LLM never sees a DOB, only `12–14`.
- Three gates, not one: **< 13** — guardian consent plus a verified guardian link before any third-party
  processing; **13–15** — learner consent recorded, guardian notified, no social-style features;
  **16–17** — learner consent, still private by default, still no named leaderboard without opt-in.
- Unknown age is treated as the *most* protected class, not the least. That single inversion is the cheapest
  correctness win on this list.
- A withdrawal must work in one interaction and must actually stop processing — `learner_consents.revoked_at`
  exists, so this is a read path, not a new column.

## 5. Residency, stated honestly

There is no blanket federal rule that a private edtech platform must host inside the UAE, and I am not going to
invent one. What is real: government-sector data has stricter handling expectations, Dubai's cloud framework
applies to services working with Dubai government data, and ADGM/DIFC entities answer to their own regimes. The
practical consequence for SyncSenta is that a UAE **school** as payer changes the hosting conversation, and a UAE
**parent** as user does not. So the product needs one deployment-profile concept — storage region, model
providers, and whether the offline/rule-only path is the default — chosen per contracting body, and the submitted
reconciler is already an example of the safest profile: rules in text, decision in TypeScript, no call at all.
This is also the argument for the parked Laya work: an on-device or in-country first-pass router is a compliance
posture, not only a latency one.

## 6. What a UAE school would be told today

Two sentences that are true right now: the platform stores learner profiles and consent structures in a Postgres
project with row-level security enabled, and the submitted decision engine holds no learner data and calls no
model. Two sentences that must not be said until §3 is done: that guardian consent is recorded, and that a
child's data stays within a named set of locations.

## 7. Plan, in spoons, with time

| Spoon | Work | Estimate |
|---|---|---|
| 9 | `age_unknown` gate in the tutor path, test-first: NULL DOB cannot reach a provider | ~45 min, one file plus one test |
| 10 | `/api/parental-consent` → `learner_consents` under RLS; `persisted: false` becomes an error; withdrawal honoured on the read path | ~90 min |
| 11 | Publish the processing table (providers, purposes, regions, retention) as data the code reads, and make the leaderboard pseudonymous by default | ~2 h |
| 12 | Arabic for `/privacy` and `/parental-consent`, driven by `language_preference` | needs a translator, not an agent |

None of these belong in the BASIX submission, and none of them should be attempted before the video is recorded.

## 8. To confirm with primary text before quoting this to anyone

The exact PDPL article numbers for the under-13 rule and for breach notification timings; whether 26/2025 uses
"child" as under-18 throughout with the under-13 data rule nested inside it; the Executive Regulations' wording on
withdrawal; whether a class leaderboard or learner-to-learner message counts as a "social media platform" under
Cabinet Resolution 106/2026; the current status of the Administrative Penalties Regulation; the age-of-majority
change; and whether a school acting as the payer makes SyncSenta a *processing agent* requiring registration with
the UAE data-protection authority.

## 9. Corrections made while writing this

Earlier in this session I told the owner SyncSenta "has no date-of-birth or age field at all". That is wrong and
now corrected here: `profiles.date_of_birth` and `students.date_of_birth` exist in the live schema and are read by
`/api/chat`. The accurate complaint is not that the field is missing, it is that **nothing gates on it** — a NULL
is treated as permission rather than as unknown. Recording the wrong sentence, then the right one, is cheaper
than carrying it into a customer conversation.

## Sources

- [Children's digital safety — The Official Platform of the UAE](https://u.ae/en/information-and-services/social-affairs/Priority-groups/children/Childrens-digital-safety) (the under-13 PDPL rule, the under-15 account rule, age-verification duty)
- [Federal Decree by Law Regarding Child Digital Safety](https://uaelegislation.gov.ae/en/legislations/3912) (primary text; returned 403 to an agent, open it in a browser)
- [UAE Federal Decree-Law No. 26 of 2025 on Child Digital Safety — liability for digital platforms and ISPs](https://bsalaw.com/insight/uae-federal-decree-law-no-26-of-2025-on-child-digital-safety-liability-for-digital-platforms-and-internet-service-providers/)
- [UAE PDPL Compliance: Protecting Your Student Data](https://ein360.com/blog/uae-pdpl-school-data-protection/)
- [Student Data Protection Across Borders: GDPR, UAE PDPL](https://www.tutopiya.com/tools/for-schools/school-blog/student-data-protection-across-borders-gdpr-uae-pdpl/)
