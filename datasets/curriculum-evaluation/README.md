# Synthetic curriculum policy evaluation v1

## Purpose

This release contains 5,000 deterministic, synthetic tabular scenarios for
testing a traditional ML workflow, rule-policy parity, and connectivity-aware
delivery in tools such as Colab or Dify. JSONL is the canonical format; the
companion CSV flattens the same features and labels for pandas and spreadsheet
workflows. `summary.json` reports the dataset's generated group counts.

The policy targets mirror the current `omega-tutoring-v1` MeTTa rules. They are
not educator-authored ground truth. Curriculum subjects, strands, and objectives
are illustrative mappings, not verified or quoted CBC/KICD standards. Every
row is marked `educator_reviewed: false` and
`curriculum_review_status: illustrative_mapping_unreviewed`.

## Safety and intended use

- Every record is synthetic, contains no learner identifiers or personal data,
  and uses `consent_status: not_applicable_synthetic`.
- Grades, subjects, language modes, and connectivity are evaluation conditions,
  not protected-trait labels or claims about real learner groups.
- Use this data for pipeline checks, baseline models, policy-parity tests, and
  model interface prototypes only. Do not treat test scores as educational
  quality, fairness, learner outcome, or production-readiness evidence.
- Before a learning decision is used with children, educators must review the
  curriculum mapping and expected action; child-safety, accessibility, privacy,
  and multilingual reviews are separate gates.
- Offline delivery labels are provisional evaluation targets. They describe
  local practice without awarding or syncing progress; they do not implement
  offline answer storage or synchronization.
- No real learner or consented learner data is included. Real data needs a
  separate lawful basis, consent/authorization process, minimization, and
  documented governance before it is added.

## Fields

The model inputs are grade, subject, strand, competency, learning objective,
language mode, connectivity, questions answered, correct answers, mastery
percent, hints used, and consecutive wrong answers. Expected labels include
scaffolding, next action, hint, evidence/provenance, and network delivery
policy. `record_id`, `split`, provenance, consent, synthetic, review, and
license fields are metadata; exclude them from model features.

`split` groups identical policy feature vectors into one partition to avoid
identical inputs appearing in both train and evaluation splits. Check
`summary.json` for actual split sizes. The synthetic rows are generated from
the same deterministic policy that produced their labels, so a high model
score mainly measures rule recovery, not generalization to real learners.

## Reproduce and validate

From the repository root:

```bash
python3 datasets/curriculum-evaluation/generate_dataset.py
python3 -m unittest discover \
  -s datasets/curriculum-evaluation -p 'test_*.py' -v
python3 datasets/curriculum-evaluation/validate_dataset.py
```

Generation accepts `--count`, `--seed`, and `--output-dir`. The default seed is
`20261120`. `schema.json` documents the JSONL record shape. The validator uses
Python's standard library and also checks every expected policy label against
the included reference implementation.

## License and provenance

The generated records, schema, generator, and documentation are released under
CC BY 4.0. Each row records generator, seed, fixed generation date, policy
version, label source, and license. No external curriculum text is included.
