/**
 * grade-id — translate between the reference journey's short IDs (`g4`) and
 * the curriculum/backend full strings (`Grade 4`).
 *
 * The student journey, mirrored from dgithinjibit/studio, stores grade as
 * `g4`/`g5`/... in localStorage. The CBC backend and the curriculum registry
 * key off `"Grade 4"`/`"Grade 5"`/... So the chat page and anything else
 * forwarding to the agents service has to translate at the boundary.
 *
 * Unknown inputs pass through unchanged — callers can default safely.
 */

export function gradeIdToName(id: string): string {
  const n = id.replace(/^g/, '');
  return /^[0-9]+$/.test(n) ? `Grade ${n}` : id;
}

export function gradeNameToId(name: string): string {
  const n = name.replace(/^Grade\s+/, '');
  return /^[0-9]+$/.test(n) ? `g${n}` : name;
}

/**
 * Collapse the three grade spellings used across the app (`Grade 4`,
 * `Grade4`, `g4`-free registry keys) to one comparable key so set-membership
 * checks like "is this grade covered by the curriculum registry?" match.
 * The curriculum data layer (`src/data/curriculum`) keys off the spaced-free
 * form (`Grade4`), while journey/UI strings use `Grade 4`.
 */
export function normalizeGradeKey(grade: string): string {
  return String(grade).trim().replace(/\s+/g, '');
}
