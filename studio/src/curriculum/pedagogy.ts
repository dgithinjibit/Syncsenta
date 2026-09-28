/**
 * SyncSenta pedagogy registry — the one machine-readable list of the learning
 * approaches the system claims to draw on.
 *
 * This module used to live inside `omega-claw-ai-blockchain.ts`, which made the
 * AI/blockchain course the only place the platform's pedagogy was written down.
 * It is here instead because every tutor reply, lesson plan and assessment view
 * is supposed to be shaped by the same approaches, not just one course.
 *
 * Two rules for anything added here:
 *
 * 1. Every adaptation needs a `source` this repo can name and a `boundary`
 *    saying what SyncSenta is *not*. An approach with no boundary line is
 *    marketing copy, and the registry would then be a list of claims rather
 *    than a list of decisions.
 * 2. Every principle has to be something a teacher, tutor prompt or interface
 *    can actually act on. See `docs/research/` for the reading behind each
 *    entry and `docs/research/learning-approaches-montessori-waldorf-reggio.md`
 *    for the three frictions that produced the two `excludedPositions` below.
 */

export interface PedagogyAdaptation {
  /** Short name shown to teachers and appended to tutor prompts. */
  readonly name: string;
  /** Who the principles come from, in words a reader can verify. */
  readonly source: string;
  /** Actionable readings of that approach, not its full doctrine. */
  readonly principles: readonly string[];
  /** What this is not — required, and enforced by the registry test. */
  readonly boundary: string;
}

export interface ExcludedPosition {
  /** The approach whose position is deliberately not adopted. */
  readonly approach: string;
  /** The position, stated as that approach would state it. */
  readonly position: string;
  /** Why adopting it is impossible or dishonest for this product. */
  readonly reason: string;
  /** What SyncSenta does instead, so the exclusion is a decision not an omission. */
  readonly instead: string;
  /** Source that states the position. */
  readonly source: string;
}

export const syncsentaPedagogy = {
  purpose:
    "Adapt tested principles from established learning approaches so that every learner is met at their own stage, in modes they can actually use, and is known through more than a score. This is a list of design commitments, not a claim that SyncSenta is any of these programmes.",
  adaptations: [
    {
      name: "Suzuki-inspired learning environment",
      source: "International Suzuki Association",
      principles: [
        "Assume every learner can grow when the environment is nurturing and expectations are clear.",
        "Begin with listening, observing, imitation, and familiar language before introducing technical vocabulary.",
        "Use encouragement, caregiver partnership, group learning, and reflection on character before technical performance.",
      ],
      boundary:
        "Use these whole-child and environment principles; do not turn Omega Claw into music instruction or claim Suzuki certification.",
    },
    {
      name: "Kumon-inspired progression",
      source: "Kumon: How Kumon Works",
      principles: [
        "Start with a short, low-stakes diagnostic conversation or activity rather than assuming the same starting point for every learner.",
        "Break ideas into small, connected steps and check understanding before adding a new concept.",
        "Provide short independent practice, immediate feedback, and visible progress toward mastery.",
      ],
      boundary:
        "Use flexible practice and teacher judgement; do not use worksheet volume, competition, or acceleration as the goal.",
    },
    {
      name: "Universal Design for Learning",
      source: "CAST UDL Guidelines 3.0",
      principles: [
        "Offer multiple ways to engage: choice, relevance, collaboration, play, and a manageable level of challenge.",
        "Offer multiple ways to access ideas: spoken explanation, simple text, diagrams, physical examples, and local scenarios.",
        "Offer multiple ways to show learning: speaking, drawing, building, writing, role-play, or a short presentation.",
      ],
      boundary:
        "Accessibility is part of the lesson design, not a later accommodation added only after a learner struggles.",
    },
    {
      name: "Project-based inquiry",
      source: "PBLWorks Gold Standard PBL",
      principles: [
        "Frame learning around an age-appropriate community question or challenge.",
        "Give learners bounded voice and choice over examples, roles, materials, and the form of their product.",
        "Use reflection, feedback, revision, and a small public or classroom-facing product to make learning meaningful.",
      ],
      boundary:
        "Projects remain teacher-guided and low-risk; learners do not deploy systems, collect sensitive data, or make financial decisions.",
    },
    {
      name: "Montessori-inspired prepared environment and self-directed pacing",
      source: "American Montessori Society; Montessori Society (UK); Montessori Australia planes of development",
      principles: [
        "Prepare the environment so a learner can choose a bounded activity and carry it out alone: help me to do it by myself.",
        "Work in freedom within limits — the learner chooses what to work on and in what order, inside the goal and safety rules the adult sets.",
        "Choose the mode of teaching from the learner's plane, not only the content: an absorbent mind (PP1-PP2), a reasoning mind that wants to classify and connect (Grade 1-6), and a social self that wants real purpose and real work (Grade 7-12) need different kinds of task.",
        "Let the learner's own timeline set the pace through a concept, and record what they can now do rather than where they sit in a cohort.",
      ],
      boundary:
        "Adapt the prepared environment, autonomy and plane framing. SyncSenta is not a Montessori programme and claims no AMI or AMS recognition; it cannot offer a three-hour uninterrupted work cycle, a fully mixed-age community, or trained Montessori guides, so it must not describe those features when they are absent.",
    },
    {
      name: "Waldorf-inspired developmental sequence and rhythm",
      source: "Waldorf School of Palm Beach; International Waldorf School (NL)",
      principles: [
        "Meet a concept with head, heart and hands together: as an idea, as a feeling or social question, and as something made.",
        "Introduce content in the mode the stage supports — story and image before abstraction, so formal symbolism follows lived experience instead of replacing it.",
        "Dwell with one subject for a coherent block rather than surfacing every subject in every session, and keep the session shape steady so rhythm carries the learning.",
        "Weave artistic and practical work into the academic task itself rather than treating art as the reward afterwards.",
        "Keep the learner's own record of the work — what they wrote, drew, built and revised — as the primary account of progress.",
      ],
      boundary:
        "Adapt the sequence, rhythm and arts integration. SyncSenta is a screen product and does not reproduce Waldorf's media policy; see excludedPositions. Where a stage needs offline work, the system says so and names the activity instead of quietly serving another screen task.",
    },
    {
      name: "Reggio Emilia-inspired expression and documentation",
      source: "Reggio Children (Loris Malaguzzi); Early Excellence",
      principles: [
        "Treat the learner as a subject with rights and strong potentialities: start from what they already say, think and notice.",
        "Value the hundred languages with equal dignity — a drawing, a model, a role-play, a recording and a written answer are equal evidence of the same understanding.",
        "Treat the environment as a teacher: the ordering, wording and materials a learner meets are part of the instruction, not decoration around it.",
        "Document interpretively — an adult records what the learner said, made and changed, and reads it back as meaning, not only as a score.",
        "Keep families and the community in the loop as contributors of questions and readers of the learner's thinking.",
      ],
      boundary:
        "Adapt the hundred languages, environment-as-teacher and adult-authored documentation. SyncSenta is not a Reggio Emilia programme. Automatic machine telemetry is not pedagogical documentation, and no system-generated note substitutes for a teacher's or parent's reading of a learner's own artefact.",
    },
  ] as readonly PedagogyAdaptation[],
  /**
   * Positions held by these approaches that SyncSenta deliberately does not
   * take. Recorded so the exclusions are visible decisions and so nobody has to
   * re-litigate them when the first parent or school asks.
   */
  excludedPositions: [
    {
      approach: "Waldorf",
      position:
        "No electronic media or screens from birth to seven; no media exposure on school nights and mornings from seven to eleven; children twelve to fourteen are too young for social media and smartphones.",
      reason:
        "SyncSenta is a screen product used from Pre-Primary upward, so stating this position without acting on it would be a false claim, and acting on it literally would remove the product for its youngest users.",
      instead:
        "Hybrid, age-gated by developmental plane: the youngest plane gets a capped session and is routed to a named offline activity; the developmental sequence (story and image before abstraction, one subject dwelled with, arts inside the academic task) is adopted for all ages. The plane mapping and its posture live beside this registry.",
      source: "Bright Water Waldorf School media policy, https://www.brightwaterwaldorf.org/media-policy",
    },
    {
      approach: "Montessori and Reggio Emilia",
      position:
        "Learning is motivated by the work itself; extrinsic rewards, points and public ranking are avoided because they displace the learner's own goals.",
      reason:
        "profiles.total_points, achievements and daily_activity.daily_streak are already load-bearing columns feeding teacher and parent views, and removing them would be a data loss justified by taste rather than measurement.",
      instead:
        "Hybrid, age-gated by plane: for the reasoning-mind and younger planes the learner-facing surface leads with mastery language (you can now do X) while points, badges and streaks stay in the teacher and parent views; from the adolescent plane upward they may lead for the learner too.",
      source:
        "American Montessori Society philosophy; Reggio Children hundred languages, https://www.amiusa.org/montessori-philosophy",
    },
  ] as readonly ExcludedPosition[],
  sources: [
    {
      title: "International Suzuki Association: The Suzuki Method",
      url: "https://internationalsuzuki.org/method",
    },
    {
      title: "Kumon: How Kumon Works",
      url: "https://www.kumon.com/how-kumon-works",
    },
    {
      title: "CAST: Universal Design for Learning Guidelines 3.0",
      url: "https://udlguidelines.cast.org/",
    },
    {
      title: "PBLWorks: Gold Standard Project Design Elements",
      url: "https://www.pblworks.org/gold-standard/pbl-project-design",
    },
    {
      title: "American Montessori Society: Montessori Philosophy",
      url: "https://www.amiusa.org/montessori-philosophy",
    },
    {
      title: "Montessori Society (UK): Principles",
      url: "https://www.montessorisociety.org.uk/principles",
    },
    {
      title: "Montessori Australia: The Four Planes of Development",
      url: "https://my.montessori.org.au/montessori-planes-of-development/",
    },
    {
      title: "Waldorf School of Palm Beach: The Curriculum, Decoded",
      url: "https://www.waldorfschoolpalmbeach.org/blog-entries/waldorf-curriculum",
    },
    {
      title: "International Waldorf School: Basic Principles",
      url: "https://www.internationalwaldorfschool.nl/our-school/basic-principles/",
    },
    {
      title: "Bright Water Waldorf School: Media Policy",
      url: "https://www.brightwaterwaldorf.org/media-policy",
    },
    {
      title: "Reggio Children: One Hundred Languages",
      url: "https://www.reggiochildren.it/en/100-languages-month/",
    },
    {
      title: "Early Excellence: The Reggio Emilia Approach",
      url: "https://earlyexcellence.com/practice-and-pedagogy/reggio-emilia-approach/",
    },
    {
      title: "Kenya Institute of Curriculum Development: Basic Education Curriculum Framework",
      url: "https://kicd.ac.ke/wp-content/uploads/2017/10/CURRICULUMFRAMEWORK.pdf",
    },
  ],
} as const;

export type SyncsentaPedagogy = typeof syncsentaPedagogy;

/**
 * The approaches allowed to shape a learner-facing reply, in the order they
 * should appear in a prompt: environment and pacing first, then access and
 * expression, then the stage-specific sequence.
 */
export const pedagogyAdaptations = syncsentaPedagogy.adaptations;

/**
 * Render the registry as tutor-prompt lines: one leading principle per approach
 * plus its full boundary. Used by the Mwalimu pipeline so that a new approach
 * changes model behaviour on the same commit it is added here — an approach that
 * is not in this block is decoration.
 *
 * Deliberately one principle rather than all of them: this block is appended to
 * every learner turn, so the full principle lists belong in the teacher-facing
 * curriculum context (`omega-claw-ai-blockchain.ts`) and in the docs, not in
 * every chat request. The boundary lines stay whole, since a truncated "do not"
 * is the part that prevents an overclaim.
 */
export function formatPedagogyConstraintBlock(): string {
  const lines = pedagogyAdaptations.map(
    (adaptation) =>
      `- ${adaptation.name}: ${adaptation.principles[0]} Boundary: ${adaptation.boundary}`,
  );
  return [
    '# PEDAGOGY CONSTRAINT (from the SyncSenta pedagogy registry)',
    'These are adaptations of principles, not programme claims. Read every boundary as a hard limit on what you may say about the approach or the learner.',
    ...lines,
  ].join('\n');
}
