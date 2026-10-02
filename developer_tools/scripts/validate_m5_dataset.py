import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "datasets" / "holistic-development" / "v1"
schema = json.loads((root / "schema.json").read_text())
allowed_domains = set(schema["properties"]["domain"]["enum"])
allowed_sources = set(schema["properties"]["evidence_source"]["enum"])
forbidden = ("face recognition", "facial expression", "biometric", "voiceprint", "emotion detected", "mood detected", "personality inferred")
rows = []
for line_number, line in enumerate((root / "examples.jsonl").read_text().splitlines(), 1):
    record = json.loads(line)
    required = {"record_id", "learner_ref", "domain", "evidence_source", "statement", "consent", "provenance"}
    missing = required - record.keys()
    assert not missing, (line_number, missing)
    assert record["record_id"].startswith("synthetic-")
    assert record["learner_ref"].startswith("learner-")
    assert record["domain"] in allowed_domains
    assert record["evidence_source"] in allowed_sources
    assert record["provenance"]["kind"] == "synthetic_fixture"
    assert record["provenance"]["license"] == "CC BY 4.0"
    lower = record["statement"].lower()
    assert not any(term in lower for term in forbidden), (line_number, lower)
    if record["domain"] == "wellbeing_check_in":
        assert record["consent"]["recorded"] is True, line_number
    rows.append(record)
assert len(rows) == 6
print(f"M5_DATASET_VALID: {len(rows)} synthetic records; no forbidden biometric language; consent rules valid")
