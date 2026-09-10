export type AdaptiveLevel = 'support' | 'steady' | 'challenge';

export interface LearnerAdaptiveProfile {
  level: AdaptiveLevel;
  confidence: number;
  guidance: 'simple' | 'guided' | 'analytical';
}

export type LearnerInterestTag =
  | 'octopus'
  | 'animals'
  | 'ocean'
  | 'nature'
  | 'space'
  | 'sports'
  | 'music'
  | 'unknown';

export interface LearnerInterestSignal {
  raw: string;
  tags: LearnerInterestTag[];
  confidence: number;
  source: 'learner_text';
}

export interface AdaptiveLearningStep {
  prompt: string;
  explanation: string;
  hint: string;
  interestSignal: LearnerInterestSignal;
  mettaFacts: string[];
  media: {
    kind: 'video';
    status: 'not_connected';
    prompt: string;
  };
}

const INTEREST_KEYWORDS: Record<Exclude<LearnerInterestTag, 'unknown'>, string[]> = {
  octopus: ['octopus', 'octopuses', 'octopi'],
  animals: ['animal', 'animals', 'lion', 'elephant', 'giraffe', 'fish', 'bird'],
  ocean: ['ocean', 'sea', 'marine', 'coral', 'underwater'],
  nature: ['nature', 'tree', 'plant', 'forest', 'garden'],
  space: ['space', 'planet', 'star', 'moon', 'rocket'],
  sports: ['football', 'soccer', 'sport', 'running', 'athletics'],
  music: ['music', 'song', 'singing', 'drum', 'dance'],
};

export function inferLearnerInterest(text: string): LearnerInterestSignal {
  const raw = text.trim().slice(0, 240);
  const normalized = raw.toLowerCase();
  const tags = (Object.entries(INTEREST_KEYWORDS) as [Exclude<LearnerInterestTag, 'unknown'>, string[]][])
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([tag]) => tag);

  return {
    raw,
    tags: tags.length > 0 ? tags : ['unknown'],
    confidence: tags.length > 0 ? 0.95 : raw.length > 0 ? 0.25 : 0,
    source: 'learner_text',
  };
}

export function buildAdaptiveLearningStep(input: {
  baseQuestion: string;
  subject: string;
  grade: string;
  competency: string;
  interestText?: string;
  feedbackText?: string;
  profile?: LearnerAdaptiveProfile;
  difficulty?: number;
}): AdaptiveLearningStep {
  const interestSignal = inferLearnerInterest(input.interestText ?? '');
  const profile = input.profile ?? inferAdaptiveProfile(input.grade, input.difficulty ?? 1, 0, 0.5);
  const feedback = (input.feedbackText ?? '').toLowerCase();
  const hasOctopusBridge =
    input.subject.toLowerCase() === 'mathematics' &&
    /fraction|part|whole|denominator/.test(`${input.baseQuestion} ${input.competency}`.toLowerCase()) &&
    interestSignal.tags.includes('octopus');

  if (hasOctopusBridge) {
    const support = feedback.includes('try again') || profile.level === 'support';
    const prompt = support
      ? 'An octopus has 8 equal arms. What fraction of its arms is 2 arms?'
      : 'An octopus has 8 equal arms. If 4 arms are in view, what fraction of the arms is that?';
    const explanation = support
      ? 'The whole is 8 arms. The numerator is the 2 arms we are considering, so the fraction is 2/8, which is equal to 1/4.'
      : 'The whole is 8 arms and 4 are being considered, so the fraction is 4/8, which is equal to 1/2.';
    return {
      prompt,
      explanation,
      hint: 'Count all 8 arms first. Then count the arms in the part being described.',
      interestSignal,
      mettaFacts: [
        `(learner-interest octopus)`,
        `(concept fractions)`,
        `(bridge octopus-legs 8)`,
        `(policy use-interest-example-within-curriculum)`,
        `(policy keep-grade-and-competency-fixed ${input.grade} ${input.competency})`,
        `(feedback-state ${feedback.includes('try again') ? 'support' : 'continue'})`,
      ],
      media: {
        kind: 'video',
        status: 'not_connected',
        prompt: 'Optional future asset: an age-appropriate animation showing 8 octopus arms and highlighting 2 or 4 equal parts; no learner image or biometric data is required.',
      },
    };
  }

  return {
    prompt: personalizePrompt(input.baseQuestion, input.subject, input.grade, input.difficulty ?? 1, profile),
    explanation: 'The next step stays aligned to the current curriculum competency and learner level.',
    hint: buildFallbackHint(input.subject, input.baseQuestion),
    interestSignal,
    mettaFacts: [
      `(concept ${input.competency})`,
      `(policy preserve-curriculum-objective)`,
      `(policy adapt-level ${profile.level})`,
    ],
    media: {
      kind: 'video',
      status: 'not_connected',
      prompt: 'Optional future asset: a curriculum-aligned explanatory video generated or selected with teacher approval.',
    },
  };
}

export function inferAdaptiveProfile(
  grade: string,
  difficulty: number,
  streak = 0,
  accuracy = 0.5,
): LearnerAdaptiveProfile {
  const numericGrade = Number.parseInt((grade || 'g2').replace(/\D/g, ''), 10) || 2;
  const gradeFactor = Math.max(0, numericGrade - 2) / 4;
  const difficultyFactor = Math.max(0, (difficulty - 1) / 4);
  const streakFactor = Math.min(0.2, streak * 0.04);
  const accuracyFactor = (accuracy - 0.5) * 0.4;
  const score = gradeFactor + difficultyFactor + streakFactor + accuracyFactor;

  if (score < 0.45) {
    return { level: 'support', confidence: accuracy, guidance: 'simple' };
  }

  if (score < 0.8) {
    return { level: 'steady', confidence: accuracy, guidance: 'guided' };
  }

  return { level: 'challenge', confidence: accuracy, guidance: 'analytical' };
}

function getInstructionPrefix(subject: string, profile: LearnerAdaptiveProfile, grade: string): string {
  if (subject === 'kiswahili') {
    return profile.level === 'challenge' ? 'Chagua jibu sahihi zaidi' : 'Chagua jibu sahihi';
  }

  const gradeLabel = grade.toUpperCase().replace(/G/, 'Grade ');

  if (profile.level === 'challenge') {
    return `For ${gradeLabel} learners, choose the most accurate response`;
  }

  if (profile.level === 'steady') {
    return `Choose the best answer for this ${gradeLabel} task`;
  }

  return `Choose the best answer for ${gradeLabel} learners`;
}

export function personalizePrompt(
  baseQuestion: string,
  subject: string,
  grade: string,
  difficulty: number,
  profile?: LearnerAdaptiveProfile,
): string {
  const resolvedProfile = profile ?? inferAdaptiveProfile(grade, difficulty, 0, 0.5);
  const prefix = getInstructionPrefix(subject, resolvedProfile, grade);

  return `${prefix}: ${baseQuestion}`;
}

export function buildFallbackPrompt(
  subject: string,
  objective: string,
  grade: string,
  difficulty: number,
  profile?: LearnerAdaptiveProfile,
): string {
  const resolvedProfile = profile ?? inferAdaptiveProfile(grade, difficulty, 0, 0.5);
  const normalizedObjective = objective.toLowerCase();

  if (subject === 'mathematics') {
    if (normalizedObjective.includes('count')) return personalizePrompt('Count the objects and choose the correct number.', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('add')) return personalizePrompt('What is 5 + 3?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('subtract')) return personalizePrompt('What is 10 - 4?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('shape')) return personalizePrompt('Which shape has 4 equal sides?', subject, grade, difficulty, resolvedProfile);
  }

  if (subject === 'english') {
    if (normalizedObjective.includes('sound') || normalizedObjective.includes('pronunciation') || normalizedObjective.includes('phonics')) {
      return personalizePrompt("Which word starts with the 'b' sound?", subject, grade, difficulty, resolvedProfile);
    }
    if (normalizedObjective.includes('read') || normalizedObjective.includes('comprehension')) {
      return personalizePrompt('What is the main idea of this story?', subject, grade, difficulty, resolvedProfile);
    }
    if (normalizedObjective.includes('write') || normalizedObjective.includes('sentence')) {
      return personalizePrompt('Which sentence is correct?', subject, grade, difficulty, resolvedProfile);
    }
  }

  if (subject === 'kiswahili') {
    if (normalizedObjective.includes('sauti')) return personalizePrompt("Ni neno gani lina sauti ya 'm' kwenye silabi yake?", subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('soma')) return personalizePrompt('Hadithi hii inahusu nini?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('kitenzi')) return personalizePrompt('Chagua kitenzi sahihi katika sentensi hii.', subject, grade, difficulty, resolvedProfile);
  }

  if (subject === 'environmental') {
    if (normalizedObjective.includes('plant')) return personalizePrompt('Which of these is a plant?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('animal')) return personalizePrompt('Which animal lives in water?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('weather') || normalizedObjective.includes('rain') || normalizedObjective.includes('climate')) {
      return personalizePrompt('What do we wear when it rains?', subject, grade, difficulty, resolvedProfile);
    }
    if (normalizedObjective.includes('health') || normalizedObjective.includes('hygiene') || normalizedObjective.includes('clean')) {
      return personalizePrompt('Which habit helps keep us healthy?', subject, grade, difficulty, resolvedProfile);
    }
  }

  if (subject === 'cre') {
    if (normalizedObjective.includes('creation') || normalizedObjective.includes('created')) return personalizePrompt('What did God create on the first day?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('identify things')) return personalizePrompt('Which of these did God create?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('appreciate')) return personalizePrompt('How can we appreciate God\'s creation?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('prayer')) return personalizePrompt('When should we pray?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('good deed') || normalizedObjective.includes('kindness')) return personalizePrompt('Which of these is a good deed?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('bible') || normalizedObjective.includes('hero')) return personalizePrompt('Who is a hero from the Bible?', subject, grade, difficulty, resolvedProfile);
  }

  if (subject === 'creative') {
    if (normalizedObjective.includes('shape')) return personalizePrompt('Which shape can you use to draw a house?', subject, grade, difficulty, resolvedProfile);
    if (normalizedObjective.includes('rhythm')) return personalizePrompt('Which action shows rhythm?', subject, grade, difficulty, resolvedProfile);
  }

  return personalizePrompt(`Let's practice: ${objective}`, subject, grade, difficulty, resolvedProfile);
}

export function buildFallbackHint(subject: string, objective: string): string {
  const normalizedObjective = objective.toLowerCase();

  if (subject === 'kiswahili') {
    if (normalizedObjective.includes('sauti')) return 'Fikiria kuhusu sauti ya kwanza na silabi ya neno.';
    if (normalizedObjective.includes('soma')) return 'Tafuta kifungu muhimu au wazo kuu la hadithi.';
    if (normalizedObjective.includes('kitenzi')) return 'Angalia kitenzi kinachofaa katika sentensi.';
    return 'Fikiria kwa makini kuhusu maana ya sentensi.';
  }

  if (subject === 'english') {
    if (normalizedObjective.includes('sound')) return 'Think about the first sound of each word.';
    if (normalizedObjective.includes('read')) return 'Look for the main idea or key message.';
    if (normalizedObjective.includes('write')) return 'Check the grammar and punctuation carefully.';
  }

  if (subject === 'mathematics') {
    if (normalizedObjective.includes('count')) return 'Count carefully and look for the total number.';
    if (normalizedObjective.includes('add')) return 'Try adding the numbers step by step.';
    if (normalizedObjective.includes('shape')) return 'Remember the properties of each shape.';
  }

  if (subject === 'environmental') {
    if (normalizedObjective.includes('plant')) return 'Think about what grows from the ground.';
    if (normalizedObjective.includes('animal')) return 'Consider where the animal usually lives.';
    if (normalizedObjective.includes('weather')) return 'Think about what protects us from rain.';
  }

  return 'Look closely at the clue and choose the most helpful answer.';
}

export function buildFallbackOptions(subject: string, objective: string): string[] {
  const normalizedObjective = objective.toLowerCase();

  if (subject === 'mathematics') {
    if (normalizedObjective.includes('count')) return ['8', '6', '10', '7'];
    if (normalizedObjective.includes('add')) return ['8', '7', '9', '6'];
    if (normalizedObjective.includes('shape')) return ['Square', 'Triangle', 'Circle', 'Rectangle'];
  }

  if (subject === 'english') {
    if (normalizedObjective.includes('sound')) return ['Ball', 'Cat', 'Dog', 'Apple'];
    if (normalizedObjective.includes('sentence')) return ['I am happy.', 'i am happy', 'I am happy', 'i Am happy'];
  }

  if (subject === 'kiswahili') {
    if (normalizedObjective.includes('sauti')) return ['Mwana', 'Miti', 'Maji', 'Mwezi'];
    if (normalizedObjective.includes('kitenzi')) return ['anacheza', 'anacheze', 'anachezaje', 'anachezwi'];
    return ['Mama', 'Baba', 'Dada', 'Kaka'];
  }

  if (subject === 'environmental') {
    if (normalizedObjective.includes('plant')) return ['Tree', 'Car', 'Book', 'Chair'];
    if (normalizedObjective.includes('animal')) return ['Fish', 'Table', 'Pen', 'Cup'];
    if (normalizedObjective.includes('weather') || normalizedObjective.includes('rain')) return ['Raincoat', 'Shorts', 'Sunglasses', 'Swimming suit'];
    if (normalizedObjective.includes('sun') || normalizedObjective.includes('hot')) return ['Hat', 'Jacket', 'Boots', 'Scarf'];
    if (normalizedObjective.includes('cold')) return ['Sweater', 'Shorts', 'Sandals', 'T-shirt'];
    if (normalizedObjective.includes('water')) return ['River', 'Chair', 'Book', 'Pencil'];
    if (normalizedObjective.includes('food')) return ['Apple', 'Stone', 'Paper', 'Stick'];
  }

  if (subject === 'cre') {
    if (normalizedObjective.includes('creation')) return ['Light', 'Animals', 'Plants', 'People'];
    if (normalizedObjective.includes('identify things') || normalizedObjective.includes('created')) return ['Sun', 'Cars', 'Phones', 'Houses'];
    if (normalizedObjective.includes('appreciate')) return ['Care for nature', 'Waste water', 'Litter', 'Cut trees'];
    if (normalizedObjective.includes('prayer')) return ['Anytime', 'Never', 'Only Sunday', 'Only morning'];
    if (normalizedObjective.includes('good deed') || normalizedObjective.includes('kindness') || normalizedObjective.includes('help')) return ['Helping a friend', 'Lying', 'Stealing', 'Shouting'];
    if (normalizedObjective.includes('bible') || normalizedObjective.includes('hero') || normalizedObjective.includes('character')) return ['Moses', 'A teacher', 'A doctor', 'A driver'];
  }

  return ['Yes', 'No', 'Sometimes', "I don't know"];
}
