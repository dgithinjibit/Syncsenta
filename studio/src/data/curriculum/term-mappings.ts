import { getHardcodedStrands } from "./index";

/**
 * Term-to-strand mapping for the Kenyan CBC curriculum.
 * Returns the strands and their sub-strands allocated to a specific term.
 */

export interface TermAllocation {
  strandName: string;
  subStrandName: string;
  weeks: number[];
}

/**
 * Get term allocation for exam generation
 * Returns strands and sub-strands allocated to a specific term
 */
export function getTermAllocation(
  grade: string,
  subject: string,
  term: string
): TermAllocation[] | null {
  const allStrands = getHardcodedStrands(grade as any, subject);
  if (!allStrands || allStrands.length === 0) return null;

  const termIndex = ["Term 1", "Term 2", "Term 3"].indexOf(term);
  if (termIndex === -1) return null;

  // For now, distribute all strands across the term
  // This is a simplified version - can be enhanced later
  const result: TermAllocation[] = [];
  
  for (const strand of allStrands) {
    for (const subStrand of strand.subStrands) {
      result.push({
        strandName: strand.name,
        subStrandName: subStrand.name,
        weeks: Array.from({ length: 1 }, (_, i) => i + 1),
      });
    }
  }

  return result;
}
