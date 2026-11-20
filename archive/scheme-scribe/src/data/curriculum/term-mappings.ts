import type { StrandInfo, SubStrandInfo } from "./types";
import { getHardcodedStrands } from "./index";
import { getLessonsPerWeek } from "./index";

// ─── Lower Primary Kiswahili: Mada-based term mapping ───
// Each Mada has 4 sub-strands × 3 lessons = 12 lessons = 3 weeks (at 4 lessons/week)
// Term start indices (0-based) for each grade's 10 Mada
const KISWAHILI_LP_TERM_START: Record<string, Record<string, number>> = {
  "Grade 1": { "Term 1": 0, "Term 2": 4, "Term 3": 7 },
  "Grade 2": { "Term 1": 0, "Term 2": 6, "Term 3": -1 }, // User confirmed: T2 starts at Mada 7 (index 6)
  "Grade 3": { "Term 1": 0, "Term 2": 4, "Term 3": 7 },
};

const WEEKS_PER_TERM = 11;
const WEEKS_PER_MADA = 3; // 4 sub-strands × 3 lessons ÷ 4 lessons/week

/**
 * Check if a grade+subject combo is lower primary Kiswahili (Mada-based).
 */
export function isLowerPrimaryKiswahili(grade: string, subject: string): boolean {
  if (subject !== "Kiswahili") return false;
  const num = parseInt(grade.replace("Grade ", ""));
  return num >= 1 && num <= 3;
}

/**
 * Get Mada-based term allocation for lower primary Kiswahili.
 * Returns Mada as strands with their 4 language-skill sub-strands.
 */
export function getKiswahiliLPTermAllocation(
  grade: string,
  term: string
): { strandName: string; subStrands: SubStrandInfo[] }[] | null {
  const allStrands = getHardcodedStrands(grade, "Kiswahili");
  if (!allStrands || allStrands.length === 0) return null;

  const termStarts = KISWAHILI_LP_TERM_START[grade];
  if (!termStarts) return null;

  const startIdx = termStarts[term];
  if (startIdx === undefined || startIdx < 0) return null;

  const maxMada = Math.ceil(WEEKS_PER_TERM / WEEKS_PER_MADA);
  const endIdx = Math.min(startIdx + maxMada, allStrands.length);

  return allStrands.slice(startIdx, endIdx).map(mada => ({
    strandName: mada.name,
    subStrands: mada.subStrands,
  }));
}

/**
 * Term-to-strand mapping for the Kenyan CBC curriculum.
 * Based on the rationalized 2024 curriculum structure from KICD.
 */

type StrandTermRule = Record<string, string[]>;

const STRAND_TERM_RULES: Record<string, StrandTermRule> = {
  "Environmental Activities": {
    "Term 1": ["Social"],
    "Term 2": ["Natural"],
    "Term 3": ["Resources"],
  },
  "Creative Activities": {
    "Term 1": ["Creating"],
    "Term 2": ["Performing"],
    "Term 3": ["Appreciation"],
  },
  "Science & Technology": {
    "Term 1": ["Living Things"],
    "Term 2": ["Matter"],
    "Term 3": ["Force", "Energy"],
  },
  "Creative Arts": {
    "Term 1": ["Creating"],
    "Term 2": ["Performing"],
    "Term 3": ["Appreciation"],
  },
  "English Activities": {
    "Term 1": ["Listening and Speaking"],
    "Term 2": ["Reading"],
    "Term 3": ["Language Use", "Writing"],
  },
};

const MATH_SUBJECT = "Mathematics";

/**
 * Returns the strands and their sub-strands allocated to a specific term.
 */
export function getTermAllocation(
  grade: string,
  subject: string,
  term: string
): { strandName: string; subStrands: SubStrandInfo[] }[] | null {
  // Lower Primary Kiswahili: Mada-based allocation
  if (isLowerPrimaryKiswahili(grade, subject)) {
    return getKiswahiliLPTermAllocation(grade, term);
  }

  const allStrands = getHardcodedStrands(grade, subject);
  if (!allStrands || allStrands.length === 0) return null;

  const termIndex = ["Term 1", "Term 2", "Term 3"].indexOf(term);
  if (termIndex === -1) return null;

  if (subject === MATH_SUBJECT) {
    return getMathTermAllocation(allStrands, termIndex);
  }

  const rules = STRAND_TERM_RULES[subject];
  if (rules) {
    return getExplicitTermAllocation(allStrands, rules, term);
  }

  return getSequentialTermAllocation(allStrands, grade, subject, termIndex);
}

function getMathTermAllocation(
  allStrands: StrandInfo[],
  termIndex: number
): { strandName: string; subStrands: SubStrandInfo[] }[] {
  const numbersStrand = allStrands.find(s => s.name.toLowerCase().includes("number"));
  const otherStrands = allStrands.filter(s => !s.name.toLowerCase().includes("number"));

  if (termIndex === 2) {
    return otherStrands.map(s => ({ strandName: s.name, subStrands: s.subStrands }));
  }

  if (!numbersStrand) return [];
  const subs = numbersStrand.subStrands;
  const half = Math.ceil(subs.length / 2);
  const termSubs = termIndex === 0 ? subs.slice(0, half) : subs.slice(half);

  return [{ strandName: numbersStrand.name, subStrands: termSubs }];
}

function getExplicitTermAllocation(
  allStrands: StrandInfo[],
  rules: StrandTermRule,
  term: string
): { strandName: string; subStrands: SubStrandInfo[] }[] {
  const keywords = rules[term];
  if (!keywords) return [];

  const matched = allStrands.filter(s =>
    keywords.some(k => s.name.toLowerCase().includes(k.toLowerCase()))
  );

  return matched.map(s => ({ strandName: s.name, subStrands: s.subStrands }));
}

function getSequentialTermAllocation(
  allStrands: StrandInfo[],
  grade: string,
  subject: string,
  termIndex: number
): { strandName: string; subStrands: SubStrandInfo[] }[] {
  const items: { strand: StrandInfo; subStrand: SubStrandInfo }[] = [];
  for (const strand of allStrands) {
    for (const ss of strand.subStrands) {
      items.push({ strand, subStrand: ss });
    }
  }

  const totalLessons = items.reduce((sum, i) => sum + i.subStrand.lessons, 0);
  const targetPerTerm = Math.ceil(totalLessons / 3);

  let accumulated = 0;
  let currentTermIdx = 0;
  const termBuckets: { strand: StrandInfo; subStrand: SubStrandInfo }[][] = [[], [], []];

  for (const item of items) {
    termBuckets[currentTermIdx].push(item);
    accumulated += item.subStrand.lessons;

    if (accumulated >= targetPerTerm && currentTermIdx < 2) {
      accumulated = 0;
      currentTermIdx++;
    }
  }

  const termItems = termBuckets[termIndex];
  const grouped = new Map<string, { strandName: string; subStrands: SubStrandInfo[] }>();

  for (const item of termItems) {
    const existing = grouped.get(item.strand.name);
    if (existing) {
      existing.subStrands.push(item.subStrand);
    } else {
      grouped.set(item.strand.name, {
        strandName: item.strand.name,
        subStrands: [item.subStrand],
      });
    }
  }

  return Array.from(grouped.values());
}

/**
 * Get total lessons for a term allocation.
 */
export function getTermLessonCount(
  allocation: { strandName: string; subStrands: SubStrandInfo[] }[]
): number {
  return allocation.reduce(
    (sum, a) => sum + a.subStrands.reduce((s, ss) => s + ss.lessons, 0),
    0
  );
}
