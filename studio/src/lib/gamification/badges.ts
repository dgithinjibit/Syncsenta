import type { GamificationBadge } from '@/components/student/gamification-panel';

/**
 * Catalog of culturally-relevant badges for SentaStudio students.
 *
 * Badge labels are tied to Kenyan context and CBC competencies rather than
 * generic achievement labels.
 *
 * `earned` and `earnedAt` are placeholders; downstream code (or the demo
 * dashboard) decides which are unlocked for the current student.
 */
export const kenyanBadgeCatalog: GamificationBadge[] = [
  {
    id: 'first-steps',
    name: 'Karibu Learner',
    description: 'You completed your first lesson — karibu sana!',
    icon: 'star',
    earned: false,
    rarity: 'common',
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: '7 days of consistent learning. Endelea hivyo!',
    icon: 'flame',
    earned: false,
    rarity: 'rare',
  },
  {
    id: 'wangari-maathai',
    name: 'Wangari Maathai Award',
    description: 'Excellence in environmental science and conservation.',
    icon: 'sparkles',
    earned: false,
    rarity: 'epic',
  },
  {
    id: 'ubuntu-champion',
    name: 'Ubuntu Champion',
    description: 'Helped 5 classmates this week. Your spirit lifts everyone — asante sana!',
    icon: 'award',
    earned: false,
    rarity: 'rare',
  },
  {
    id: 'matatu-math-master',
    name: 'Matatu Math Master',
    description: 'Applied math to real Kenyan life — fares, change, and everyday problems.',
    icon: 'trophy',
    earned: false,
    rarity: 'rare',
  },
  {
    id: 'cbc-critical-thinker',
    name: 'CBC Critical Thinker',
    description: 'Demonstrated the problem-solving core competency across topics.',
    icon: 'target',
    earned: false,
    rarity: 'epic',
  },
  {
    id: 'ngugi-literature',
    name: "Ngugi wa Thiong'o Badge",
    description: 'Excellence in literature — reading and analysing stories.',
    icon: 'medal',
    earned: false,
    rarity: 'epic',
  },
  {
    id: 'lupita-creative',
    name: "Lupita Nyong'o Star",
    description: 'Outstanding work in creative arts and expression.',
    icon: 'crown',
    earned: false,
    rarity: 'rare',
  },
];

/**
 * Demo badge state for the student dashboard. Three earned, the rest visible
 * as "next badges to earn". Replace with real progress once the backend is
 * wired up.
 */
export function getDemoBadges(): GamificationBadge[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const earnedMap: Record<string, number> = {
    'first-steps': now - 7 * day,
    'week-warrior': now - 3 * day,
    'matatu-math-master': now - 1 * day,
  };

  return kenyanBadgeCatalog.map((badge) => {
    const earnedAt = earnedMap[badge.id];
    return earnedAt
      ? { ...badge, earned: true, earnedAt: new Date(earnedAt).toISOString() }
      : badge;
  });
}
