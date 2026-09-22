/**
 * Omega Claw curriculum guardrail and Grade 6 introductory pathway.
 *
 * The pedagogy below adapts useful principles from several established
 * approaches; it does not claim that Suzuki or Kumon is being reproduced
 * outside its original context.
 */
export const OMEGA_CLAW_CURRICULUM_GRADE = "g6" as const;

export const omegaClawPedagogy = {
  purpose:
    "Develop curiosity, sound judgement, communication, collaboration, and responsible digital citizenship through a gentle introduction to AI and blockchain.",
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
  ],
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
  ],
} as const;

export const omegaClawIntroductoryCurriculum = {
  grade: "Grade 6",
  title: "Omega Claw: First Steps in AI and Blockchain",
  duration: "8 weeks; 2 lessons per week; 35–45 minutes per lesson",
  scope: "Introduction to AI and blockchain concepts",
  purpose:
    "Build curiosity, digital responsibility, and clear mental models through familiar Kenyan examples, guided practice, and a small community-help project.",
  learnerPromise:
    "You will learn what AI and blockchain mean, how to question technology, and how to suggest a safe human-reviewed use. You will not be expected to code, trade, invest, or share private information.",
  guardrails: [
    "Offer this pathway only when the learner context is Grade 6.",
    "Keep all content conceptual, practical, local, and introductory.",
    "Use teacher-guided, offline-friendly activities and do not collect personal data in demonstrations.",
    "Begin with listening, stories, examples, and imitation before introducing new terms or diagrams.",
    "Use a short diagnostic to choose a starting point, then move in small steps with mastery checks.",
    "Give learners choices in how they respond while keeping the learning goal constant.",
    "Do not introduce this pathway to PP1–Grade 5 learners.",
  ],
  prerequisites: [
    "Learner can describe a simple everyday decision and explain why they made it.",
    "Learner can read or listen to a short explanation and identify its main idea.",
    "Teacher has established a safe classroom agreement for respectful discussion and privacy.",
  ],
  learningOutcomes: [
    "Explain AI as a tool that finds patterns in examples and produces a suggestion or output.",
    "Identify everyday AI uses and distinguish a computer suggestion from a human decision.",
    "Explain blockchain as a shared, linked record that a group can verify.",
    "Describe why a shared record can be useful and why it is not automatically the best solution.",
    "Recognise risks involving privacy, bias, misinformation, security, and unequal access.",
    "Use a simple question-checking routine before trusting or sharing an AI-generated answer.",
    "Propose a small, safe, human-reviewed community use for AI or a shared record.",
    "Communicate learning through at least one chosen mode: speech, drawing, writing, model, role-play, or presentation.",
  ],
  competencies: [
    "Critical thinking and problem solving",
    "Communication and collaboration",
    "Self-efficacy and self-management",
    "Digital literacy and ethical responsibility",
    "Creativity and imagination",
    "Empathy, respect, and community participation",
  ],
  lessonRoutine: [
    {
      step: "1. Welcome and listen",
      minutes: "5 minutes",
      teacherAction: "Connect the idea to a familiar story, object, local example, or short spoken explanation.",
      learnerAction: "Listen, observe, or recall what they already know; no writing is required yet.",
    },
    {
      step: "2. Notice and imitate",
      minutes: "5 minutes",
      teacherAction: "Model one simple example and think aloud about the reasoning and safety check.",
      learnerAction: "Repeat the explanation in their own words, draw it, or act it out.",
    },
    {
      step: "3. Small-step practice",
      minutes: "15 minutes",
      teacherAction: "Offer a short task at the learner's current starting point and give specific feedback.",
      learnerAction: "Complete one bounded task independently or with a partner.",
    },
    {
      step: "4. Choice and connection",
      minutes: "10 minutes",
      teacherAction: "Offer two or three ways to apply the idea to school, home, farming, health, environment, or community life.",
      learnerAction: "Choose a response mode and explain the connection.",
    },
    {
      step: "5. Reflect and preview",
      minutes: "5 minutes",
      teacherAction: "Ask what became clearer, what remains uncertain, and what the next small step is.",
      learnerAction: "Record or share one learning win, one question, and one safe action.",
    },
  ],
  strands: [
    {
      title: "1. How We Learn and Make Decisions",
      weeks: "Week 1",
      bigIdea: "People use examples, experience, and judgement; machines can be given examples but do not carry human responsibility.",
      learningOutcomes: [
        "Separate an observation, a pattern, a suggestion, and a decision.",
        "Explain that people choose the examples and rules used to guide a tool.",
        "Identify when a human should check a suggestion before acting.",
      ],
      suggestedActivities: [
        "Listen to a short story about choosing a route to school, then sort statements into observation, pattern, suggestion, and decision.",
        "Play a teacher-led sorting game using familiar objects, crops, animals, or classroom materials; discuss what a machine would need to see examples.",
        "Create a class routine: Stop, Check the source, Ask an adult, Protect privacy, then Decide.",
      ],
      keyInquiryQuestions: [
        "What is the difference between noticing a pattern and making a wise decision?",
        "When should a person check a computer suggestion?",
      ],
      formativeCheck: "Learner explains one situation where a computer may help but a person must decide.",
      familyConnection: "Ask a family member about a decision where experience and careful judgement mattered.",
    },
    {
      title: "2. What Is Artificial Intelligence?",
      weeks: "Weeks 2–3",
      bigIdea: "AI can use examples to find patterns and produce outputs, but it can be wrong, incomplete, or unfair.",
      learningOutcomes: [
        "Describe AI in simple language without treating it as a person.",
        "Identify examples of AI in phones, search, recommendations, translation, image tools, or voice tools.",
        "Explain that an AI output is a suggestion or generated result, not proof of truth.",
        "Use the Stop–Check–Ask–Protect routine with a sample AI answer.",
      ],
      suggestedActivities: [
        "Listen to or view two short explanations of the same topic and identify which parts are facts, guesses, or missing evidence.",
        "Sort scenario cards into human-only, computer-assisted, and shared human-computer decisions.",
        "Compare two small sets of labelled examples and discuss how changing the examples might change a pattern-based suggestion.",
        "Create an AI responsibility poster using drawings, short sentences, or a role-play.",
      ],
      keyInquiryQuestions: [
        "How can a tool be useful and still be wrong?",
        "Who is responsible for checking an AI suggestion?",
        "What information should we never share just to get an answer?",
      ],
      formativeCheck: "Learner explains AI using the words examples, pattern, output, and human check.",
      familyConnection: "With permission, identify one computer-assisted tool used at home and discuss its benefit and limitation without recording personal data.",
    },
    {
      title: "3. AI Fairness, Privacy, and Misinformation",
      weeks: "Week 4",
      bigIdea: "Responsible technology requires respect, privacy, fairness, evidence, and human accountability.",
      learningOutcomes: [
        "Recognise personal information and explain why permission matters.",
        "Identify how incomplete or unfair examples can lead to an unfair output.",
        "Use a simple source-checking routine before repeating a claim.",
        "Suggest a safer response when an AI output is harmful, private, or suspicious.",
      ],
      suggestedActivities: [
        "Review age-appropriate scenarios about names, photographs, location, passwords, and school records; choose the safer action.",
        "Use coloured cards to show how a pattern can be unfair when the examples leave people out.",
        "Run a fact, question, or opinion relay using printed statements; learners explain what evidence would be needed.",
        "Role-play a learner, teacher, parent, and community member deciding whether a proposed AI use is safe and fair.",
      ],
      keyInquiryQuestions: [
        "What makes information private?",
        "How can missing examples affect a technology-assisted decision?",
        "What should we do when an AI answer seems confident but unsupported?",
      ],
      formativeCheck: "Learner names one privacy risk, one fairness risk, and one human check.",
      familyConnection: "Create a family-safe digital information rule together, such as asking before sharing an image.",
    },
    {
      title: "4. What Is a Shared Record?",
      weeks: "Week 5",
      bigIdea: "Before blockchain, learners need a clear mental model of records, copies, agreement, and verification.",
      learningOutcomes: [
        "Explain what a record is and why a group keeps one.",
        "Compare a private notebook, a school register, and a shared class record.",
        "Describe verification as checking whether a new entry follows agreed rules.",
      ],
      suggestedActivities: [
        "Inspect a fictional library-loan register and identify what information is necessary, unnecessary, or private.",
        "Build a paper chain where each card records one fictional class-library action and refers to the previous card.",
        "Role-play three record keepers checking a new entry against a shared classroom rule.",
      ],
      keyInquiryQuestions: [
        "Why do people keep records?",
        "What makes a record trustworthy?",
        "Who should be allowed to see or change a record?",
      ],
      formativeCheck: "Learner can explain record, shared, verification, and privacy using a classroom example.",
      familyConnection: "Compare a family shopping list or chore chart with a school register without copying real personal details.",
    },
    {
      title: "5. What Is Blockchain?",
      weeks: "Week 6",
      bigIdea: "Blockchain is one way to organise a shared, linked record; it is not automatically money, a guarantee, or the right tool for every problem.",
      learningOutcomes: [
        "Explain blockchain as a shared record made of linked entries that a group verifies.",
        "Describe why changing an earlier entry can affect later links and require group attention.",
        "State at least two limits: it can still contain wrong information, require resources, and expose information if designed poorly.",
        "Distinguish blockchain technology from cryptocurrency and investment activity.",
      ],
      suggestedActivities: [
        "Extend the paper chain from Week 5 and add a simple class verification mark to each fictional entry.",
        "Remove or alter one card and discuss what the group notices; explain that a linked record does not make the original information true.",
        "Compare a paper register, a normal digital database, and a blockchain-style shared record using a teacher-created decision table.",
        "Create a three-sentence explanation of blockchain for a younger learner without using the words crypto, coin, or investment.",
      ],
      keyInquiryQuestions: [
        "What does linking records help a group notice?",
        "Why does verification matter if people can still enter wrong information?",
        "When is a simple register better than a blockchain?",
      ],
      formativeCheck: "Learner explains blockchain as a shared linked record and names one limitation.",
      familyConnection: "Discuss one community record that should be accurate and protected, without sharing its real contents.",
    },
    {
      title: "6. Human-Centred Technology and Community Needs",
      weeks: "Week 7",
      bigIdea: "Good technology begins with a real need, includes the people affected, and is judged by safety, fairness, usefulness, and accessibility.",
      learningOutcomes: [
        "Identify a small school or community problem that does not require private data to explore.",
        "Ask who benefits, who could be left out, and what human review is needed.",
        "Choose whether AI, a shared record, or a simpler non-digital solution best fits the problem.",
      ],
      suggestedActivities: [
        "Choose from teacher-approved challenges such as organising library books, sharing environmental observations, or explaining a school process.",
        "Interview classmates using fictional or anonymous examples and summarise needs without collecting names, contacts, or photographs.",
        "Use a one-page choice board to compare a human process, AI assistance, and a shared record against safety and usefulness criteria.",
      ],
      keyInquiryQuestions: [
        "What problem are we solving, and for whom?",
        "Would a simple human process work better?",
        "How can we include people who have different languages, devices, abilities, or connectivity?",
      ],
      formativeCheck: "Learner justifies a tool choice and names the adult or group responsible for review.",
      familyConnection: "Ask a family member what makes a community solution useful and fair, without proposing to collect their data.",
    },
    {
      title: "7. Omega Claw Community Showcase",
      weeks: "Week 8",
      bigIdea: "Learning is strengthened when learners explain, receive feedback, revise, and share a safe product with a real audience.",
      learningOutcomes: [
        "Explain one AI idea, one blockchain idea, and one responsibility rule in their own words.",
        "Create a small product that communicates a safe, human-reviewed community use or a reason not to use technology.",
        "Give and receive feedback respectfully, revise the product, and reflect on the learning process.",
      ],
      suggestedActivities: [
        "Choose a product mode: poster, labelled model, short oral explanation, comic, role-play, audio explanation, or group presentation.",
        "Use a feedback protocol: one clear strength, one question, and one safe improvement.",
        "Present to classmates or a teacher-approved audience; no public posting or personal information is required.",
        "Complete a reflection: What changed in my thinking? What can the tool do? What can it not do? Who must check it?",
      ],
      keyInquiryQuestions: [
        "How can we show understanding without using advanced technology?",
        "What feedback made our explanation clearer or safer?",
        "What should Omega Claw teach next, and what should it not teach yet?",
      ],
      formativeCheck: "Learner meets the final rubric and can explain the safety boundary without prompting.",
      familyConnection: "Invite a family member to view or hear the product and ask one question about its community relevance.",
    },
  ],
  assessment: {
    diagnostic: [
      "Learner describes a pattern in a familiar set of examples.",
      "Learner explains a decision and identifies who is responsible for it.",
      "Learner identifies information that should remain private.",
    ],
    masteryChecks: [
      "Explain the idea in own words before moving to the next concept.",
      "Use a concrete example, diagram, or role-play to show the idea.",
      "Name one limitation, risk, or human responsibility.",
    ],
    finalRubric: [
      "Conceptual accuracy: explains AI and blockchain without advanced or financial claims.",
      "Critical judgement: identifies a limitation, risk, or reason to choose a simpler solution.",
      "Human-centred design: includes privacy, fairness, accessibility, and adult review.",
      "Communication: presents a clear product using a chosen accessible format.",
      "Reflection: describes one learning change and one next question.",
    ],
    evidenceOptions: [
      "Short oral explanation",
      "Drawing, diagram, comic, or poster",
      "Paper model or role-play",
      "Written response or group presentation",
    ],
  },
  teacherGuidance: [
    "Use the diagnostic only to choose support; never label a learner's ability or publicly rank learners.",
    "Use short practice blocks and pause when attention, frustration, or overload increases.",
    "Read instructions aloud, provide visual and concrete alternatives, and allow extra response time.",
    "Praise careful checking, revision, respectful collaboration, and asking for help—not speed or technical complexity.",
    "Escalate any request involving real personal data, public deployment, money, wallets, tokens, or automated decisions to school leadership and do not run it as a learner activity.",
  ],
  familyAndCommunityPartnership: [
    "Send home a one-page family explanation using plain language and no technology jargon.",
    "Invite families to share local examples of record keeping, decision making, and community problem solving without collecting sensitive information.",
    "Offer offline alternatives for every digital activity so connectivity does not determine participation.",
  ],
} as const;

export const omegaClawSeniorCurriculum = {
  grades: ["Grade 10", "Grade 11", "Grade 12"],
  title: "Omega Claw Senior School: Applied AI and Blockchain Systems",
  duration: "3 years; 3 terms per year; adaptable to the school's timetable",
  scope: "In-depth senior-school study with theory, practical work, ethics, governance, and a supervised capstone",
  purpose:
    "Move from Grade 6 conceptual literacy to responsible analysis, design, implementation, evaluation, and communication of AI and blockchain systems.",
  prerequisites: [
    "Grade 6 introductory AI and blockchain concepts or an equivalent diagnostic demonstration.",
    "Foundational mathematics, scientific reasoning, communication, and digital safety.",
    "Teacher approval for any use of code, datasets, networked tools, or external AI services.",
  ],
  seniorGuardrails: [
    "Senior School depth does not remove teacher supervision, privacy protection, or human accountability.",
    "No real-money trading, token sales, wallet custody, financial promotion, or unsupervised public deployment in student work.",
    "Use synthetic, public-domain, anonymised, or teacher-created datasets; never upload learner records to an external model.",
    "Every practical system must document purpose, users, risks, limitations, test evidence, and a rollback or stop procedure.",
    "Students may study security concepts defensively, but may not attack real systems or collect credentials.",
  ],
  progression: [
    {
      grade: "Grade 10",
      theme: "Foundations and responsible experimentation",
      outcomes: [
        "Explain data, features, labels, algorithms, models, training, validation, inference, and bias.",
        "Use spreadsheets or beginner-friendly code to clean a small synthetic dataset and describe its limitations.",
        "Compare rule-based automation with machine-learning pattern recognition.",
        "Explain blockchain data structures, hashes, blocks, consensus, wallets, and smart contracts conceptually.",
        "Apply privacy, consent, fairness, safety, and source-checking principles to a proposed system.",
      ],
      modules: [
        "AI systems and data literacy",
        "Algorithms, patterns, and evaluation",
        "Introduction to Python or another approved beginner language",
        "Blockchain primitives: hashes, linked blocks, keys, and verification",
        "Digital identity, privacy, and responsible technology",
      ],
      projects: [
        "A documented classification experiment using a synthetic dataset, with an error table and fairness reflection.",
        "A paper or local simulation showing how a block can reference a previous block and how tampering is detected.",
      ],
    },
    {
      grade: "Grade 11",
      theme: "Applied systems, security, and critical evaluation",
      outcomes: [
        "Compare supervised, unsupervised, and reinforcement-learning ideas at an appropriate mathematical depth.",
        "Design a reproducible data pipeline with documented assumptions, train/test separation, and evaluation metrics.",
        "Interpret confusion matrices, precision, recall, accuracy, and basic trade-offs without overstating results.",
        "Explain distributed ledgers, consensus trade-offs, smart-contract logic, and the difference between permissioned and public networks.",
        "Conduct a threat model and risk assessment for a proposed AI or blockchain application.",
        "Evaluate energy, accessibility, governance, inclusion, and social effects alongside technical performance.",
      ],
      modules: [
        "Data preparation, feature design, and model evaluation",
        "Bias, explainability, robustness, and human-in-the-loop review",
        "Distributed systems, consensus, and blockchain architecture",
        "Smart-contract concepts and secure design patterns in a sandbox",
        "Cybersecurity fundamentals, threat modelling, and incident response",
        "Technology governance, intellectual property, and responsible innovation",
      ],
      projects: [
        "An auditable model report comparing two approaches on synthetic data and explaining false positives and false negatives.",
        "A permissioned-ledger design for a school or community record, including roles, access rules, failure cases, and a non-blockchain alternative.",
      ],
    },
    {
      grade: "Grade 12",
      theme: "Integration, research, and supervised capstone",
      outcomes: [
        "Translate a real but bounded problem into requirements, success measures, ethical constraints, and a system design.",
        "Build or simulate an AI or blockchain prototype in an approved sandbox with versioned documentation.",
        "Validate performance, usability, accessibility, privacy, security, and social impact with evidence.",
        "Explain limitations, uncertainty, maintenance needs, costs, and the conditions under which the system should not be used.",
        "Present technical and non-technical findings clearly and respond to critique.",
        "Reflect on further study, careers, entrepreneurship, public service, and responsible participation in the digital economy.",
      ],
      modules: [
        "Requirements, architecture, and project planning",
        "AI or blockchain specialisation pathway",
        "Testing, monitoring, documentation, and reproducibility",
        "Human-centred design, accessibility, and community consultation",
        "Research communication, portfolio building, and career readiness",
        "Capstone exhibition and external or teacher panel review",
      ],
      projects: [
        "A supervised capstone that solves or clarifies a community problem using the simplest safe approach, whether AI, blockchain, or no advanced technology.",
        "A final portfolio containing requirements, data or ledger design, prototype or simulation, tests, risk register, user feedback, reflection, and an ethics statement.",
      ],
    },
  ],
  practicalMethod: [
    "Begin each unit with a diagnostic task and a short listening-first explanation of the problem and vocabulary.",
    "Use small, mastery-checked exercises before independent implementation; allow extension only after core understanding is demonstrated.",
    "Offer multiple ways to access and demonstrate learning, including diagrams, code, oral explanation, spreadsheets, paper simulations, and presentations.",
    "Use project-based inquiry for authentic application, with learner choice bounded by safety, privacy, feasibility, and teacher approval.",
    "Require peer or teacher critique, revision, and a written reflection before a project is marked complete.",
  ],
  assessment: {
    formative: [
      "Concept explanations and vocabulary checks",
      "Short coding, spreadsheet, paper-simulation, or diagram tasks",
      "Data and ledger design reviews",
      "Security and ethics scenario responses",
      "Learning journal with feedback and next-step goals",
    ],
    summative: [
      "Technical understanding and accurate use of concepts",
      "Evidence-based evaluation and reproducibility",
      "Safety, privacy, fairness, accessibility, and governance reasoning",
      "Communication with both technical and community audiences",
      "Reflection, revision, and responsible capstone decisions",
    ],
  },
} as const;

const OMEGA_CLAW_TOPIC_PATTERN = /\b(ai|artificial intelligence|machine learning|blockchain|crypto(?:currency)?)\b/i;
const OMEGA_CLAW_ADVANCED_PATTERN = /\b(code|coding|program|programming|smart contract|wallet|token|mine|mining|trade|trading|invest|investment|neural network|train a model|deploy|production system)\b/i;

export function isOmegaClawTopic(queryOrContent: string): boolean {
  return OMEGA_CLAW_TOPIC_PATTERN.test(queryOrContent);
}

export function isOmegaClawAdvancedRequest(queryOrContent: string): boolean {
  return OMEGA_CLAW_ADVANCED_PATTERN.test(queryOrContent);
}

export function isOmegaClawGrade(grade: string): boolean {
  const normalizedGrade = grade.trim().toLowerCase().replace(/\s+/g, "");
  return normalizedGrade === OMEGA_CLAW_CURRICULUM_GRADE || normalizedGrade === "grade6";
}

export function isOmegaClawSeniorGrade(grade: string): boolean {
  const normalizedGrade = grade.trim().toLowerCase().replace(/\s+/g, "");
  return ["g10", "g11", "g12", "grade10", "grade11", "grade12", "s1", "s2", "s3"].includes(normalizedGrade);
}

export function getOmegaClawScopeMessage(grade: string): string {
  if (!isOmegaClawGrade(grade)) {
    if (isOmegaClawSeniorGrade(grade)) {
      return "Omega Claw Senior School: AI and blockchain may be studied in depth through supervised theory, practical work, ethics, governance, security, and a capstone. No real-money trading, wallet custody, or unsupervised public deployment is allowed.";
    }
    return "Omega Claw AI and blockchain learning is available as an introduction in Grade 6 and in-depth only in Senior School Grades 10–12. Please use the learner's own grade-level CBC content instead.";
  }

  return [
    "Omega Claw Grade 6 introduction: AI helps people find patterns and make suggestions; blockchain is a shared, linked record that groups can verify.",
    "Use a nurturing, listening-first environment; small mastery steps; accessible choices; and teacher-guided inquiry. Keep lessons conceptual and avoid coding, deployment, trading, investment advice, wallets, tokens, or requests for personal data.",
  ].join("\n\n");
}

export function getOmegaClawTeacherCurriculumContext(
  grade: string,
  subject: string,
  topic: string,
): string | undefined {
  const request = `${subject} ${topic}`;
  if (!isOmegaClawTopic(request)) return undefined;

  if (isOmegaClawGrade(grade)) {
    return [
      "OMEGA CLAW GRADE 6 CURRICULUM CONTEXT",
      `Learner stage: ${grade}`,
      "Use introduction-only, conceptual, teacher-guided content.",
      `Learning outcomes: ${omegaClawIntroductoryCurriculum.learningOutcomes.join("; ")}`,
      `Safety boundaries: ${omegaClawIntroductoryCurriculum.guardrails.join("; ")}`,
    ].join("\n");
  }

  if (isOmegaClawSeniorGrade(grade)) {
    const stage = omegaClawSeniorCurriculum.progression.find((item) => item.grade.toLowerCase() === grade.trim().toLowerCase())
      || omegaClawSeniorCurriculum.progression.find((item) => item.grade.replace("Grade ", "g").toLowerCase() === grade.trim().toLowerCase());

    return [
      "OMEGA CLAW SENIOR SCHOOL CURRICULUM CONTEXT",
      `Learner stage: ${grade}`,
      "Use in-depth, supervised Senior School content with evidence, ethics, privacy, accessibility, and human review.",
      stage ? `Stage theme: ${stage.theme}\nLearning outcomes: ${stage.outcomes.join("; ")}\nModules: ${stage.modules.join("; ")}\nSuggested projects: ${stage.projects.join("; ")}` : "Use the appropriate Grade 10–12 progression stage from the curriculum guide.",
      `Safety boundaries: ${omegaClawSeniorCurriculum.seniorGuardrails.join("; ")}`,
    ].join("\n");
  }

  return undefined;
}
