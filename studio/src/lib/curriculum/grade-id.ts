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
