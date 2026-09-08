// Activity definitions for different grades and subjects

import { Activity, GradeId, SubjectId } from './sandbox-types';
import { getCurriculumActivities, CurriculumActivity } from './curriculum-activities-mapper';
import { getAvailableTerms, getCurrentTerm } from './term-utils';

// Grade 2 Mathematics Activities
export const grade2MathActivities: Activity[] = [
  {
    id: 'g2-math-number-garden-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'explore',
    title: 'Number Garden',
    description: 'Plant flowers by counting! Learn numbers 1-20 in a fun garden.',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Count objects from 1 to 20',
      'Recognize number symbols',
      'One-to-one correspondence'
    ],
    estimatedTime: 10,
    icon: '🌻',
    color: 'bg-green-500',
    tags: ['counting', 'numbers', 'visual'],
    // Canvas micro-assessment — drag exactly N flowers into the garden.
    // Token supply in `makeCountingTokens` is 10, so all targets must be 1..10.
    manipulative: 'tokens',
    competency: 'MATH.G2.NUMBERS.COUNT',
    masteryThreshold: 2,
    variations: [
      { question: 'Plant exactly 5 flowers in the garden.', targetValue: 5, targetLabel: '5' },
      { question: 'Plant exactly 7 flowers in the garden.', targetValue: 7, targetLabel: '7' },
      { question: 'Plant exactly 9 flowers in the garden.', targetValue: 9, targetLabel: '9' },
    ],
  },
  {
    id: 'g2-math-shape-builder-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'explore',
    title: 'Shape Builder',
    description: 'Create pictures using shapes! Learn about circles, squares, and triangles.',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Identify basic 2D shapes',
      'Understand shape properties',
      'Create patterns with shapes'
    ],
    estimatedTime: 15,
    icon: '🔷',
    color: 'bg-blue-500',
    tags: ['geometry', 'shapes', 'creative']
  },
  {
    id: 'g2-math-addition-adventure-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'practice',
    title: 'Addition Adventure',
    description: 'Help animals find their friends by solving addition problems!',
    difficulty: 2,
    prerequisites: ['g2-math-number-garden-1'],
    learningObjectives: [
      'Add numbers within 20',
      'Understand addition concept',
      'Solve simple word problems'
    ],
    estimatedTime: 15,
    icon: '➕',
    color: 'bg-purple-500',
    tags: ['addition', 'word-problems', 'animals'],
    // Drag the TOTAL number of tokens into the answer box. Tokens are
    // worth 1 each, so dropping 7 tokens grades 3 + 4 correctly.
    manipulative: 'tokens',
    competency: 'MATH.G2.OPERATIONS.ADD',
    masteryThreshold: 2,
    variations: [
      { question: 'Three monkeys join four monkeys. Drop the total.', targetValue: 7, targetLabel: '7' },
      { question: 'Two zebras meet six zebras. Drop the total.', targetValue: 8, targetLabel: '8' },
      { question: 'Five lions and four lions. Drop the total.', targetValue: 9, targetLabel: '9' },
    ],
  },
  {
    id: 'g2-math-subtraction-safari-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'practice',
    title: 'Subtraction Safari',
    description: 'Go on a safari and practice taking away numbers!',
    difficulty: 2,
    prerequisites: ['g2-math-number-garden-1'],
    learningObjectives: [
      'Subtract numbers within 20',
      'Understand subtraction concept',
      'Solve simple word problems'
    ],
    estimatedTime: 15,
    icon: '➖',
    color: 'bg-orange-500',
    tags: ['subtraction', 'word-problems', 'safari'],
    // Drop the REMAINING tokens after the subtraction. Same single-zone
    // token paradigm — value 1 per token.
    manipulative: 'tokens',
    competency: 'MATH.G2.OPERATIONS.SUBTRACT',
    masteryThreshold: 2,
    variations: [
      { question: 'Eight giraffes, three walk away. Drop how many remain.', targetValue: 5, targetLabel: '5' },
      { question: 'Nine elephants, two leave the river. Drop how many remain.', targetValue: 7, targetLabel: '7' },
      { question: 'Ten antelope, four hide. Drop how many remain.', targetValue: 6, targetLabel: '6' },
    ],
  },
  {
    id: 'g2-math-place-value-palace-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'explore',
    title: 'Place Value Palace',
    description: 'Build towers with tens and ones blocks!',
    difficulty: 3,
    prerequisites: ['g2-math-number-garden-1'],
    learningObjectives: [
      'Understand place value (tens and ones)',
      'Represent numbers with base-10 blocks',
      'Compare two-digit numbers'
    ],
    estimatedTime: 20,
    icon: '🏰',
    color: 'bg-pink-500',
    tags: ['place-value', 'tens-ones', 'blocks']
  },
  {
    id: 'g2-math-measurement-market-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'explore',
    title: 'Measurement Market',
    description: 'Shop at the market and learn about length, weight, and capacity!',
    difficulty: 3,
    prerequisites: [],
    learningObjectives: [
      'Compare lengths using non-standard units',
      'Understand concepts of heavy/light',
      'Explore capacity with containers'
    ],
    estimatedTime: 20,
    icon: '📏',
    color: 'bg-yellow-500',
    tags: ['measurement', 'comparison', 'real-world']
  },
  {
    id: 'g2-math-pattern-party-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'challenge',
    title: 'Pattern Party',
    description: 'Create and extend patterns to decorate for a party!',
    difficulty: 2,
    prerequisites: ['g2-math-shape-builder-1'],
    learningObjectives: [
      'Identify repeating patterns',
      'Extend patterns',
      'Create original patterns'
    ],
    estimatedTime: 15,
    icon: '🎉',
    color: 'bg-red-500',
    tags: ['patterns', 'sequences', 'creative']
  },
  {
    id: 'g2-math-time-town-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'practice',
    title: 'Time Town',
    description: 'Learn to tell time by helping townspeople with their schedules!',
    difficulty: 4,
    prerequisites: ['g2-math-number-garden-1'],
    learningObjectives: [
      'Tell time to the hour',
      'Tell time to the half hour',
      'Understand daily time sequences'
    ],
    estimatedTime: 20,
    icon: '🕐',
    color: 'bg-indigo-500',
    tags: ['time', 'clock', 'daily-life']
  },
  {
    id: 'g2-math-money-matters-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'practice',
    title: 'Money Matters',
    description: 'Count coins and make change at the toy store!',
    difficulty: 4,
    prerequisites: ['g2-math-addition-adventure-1'],
    learningObjectives: [
      'Identify coin values',
      'Count money combinations',
      'Make simple change'
    ],
    estimatedTime: 20,
    icon: '💰',
    color: 'bg-emerald-500',
    tags: ['money', 'coins', 'real-world']
  },
  {
    id: 'g2-math-story-problems-1',
    grade: 'g2',
    subject: 'mathematics',
    type: 'challenge',
    title: 'Story Problem Theater',
    description: 'Watch animated stories and solve the math problems!',
    difficulty: 5,
    prerequisites: ['g2-math-addition-adventure-1', 'g2-math-subtraction-safari-1'],
    learningObjectives: [
      'Understand word problems',
      'Choose correct operation',
      'Explain problem-solving strategies'
    ],
    estimatedTime: 25,
    icon: '🎭',
    color: 'bg-violet-500',
    tags: ['word-problems', 'critical-thinking', 'stories']
  }
];

// Grade 2 English Activities
export const grade2EnglishActivities: Activity[] = [
  {
    id: 'g2-eng-word-workshop-1',
    grade: 'g2',
    subject: 'english',
    type: 'explore',
    title: 'Word Workshop',
    description: 'Match sounds and letters to build words!',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Recognize letter sounds',
      'Blend sounds to make words',
      'Identify rhyming words'
    ],
    estimatedTime: 15,
    icon: '📝',
    color: 'bg-blue-500',
    tags: ['phonics', 'sounds', 'reading']
  },
  {
    id: 'g2-eng-story-studio-1',
    grade: 'g2',
    subject: 'english',
    type: 'explore',
    title: 'Story Studio',
    description: 'Read interactive stories and answer questions!',
    difficulty: 2,
    prerequisites: ['g2-eng-word-workshop-1'],
    learningObjectives: [
      'Read simple stories',
      'Answer comprehension questions',
      'Identify story elements'
    ],
    estimatedTime: 20,
    icon: '📚',
    color: 'bg-purple-500',
    tags: ['reading', 'comprehension', 'stories']
  },
  {
    id: 'g2-eng-writing-corner-1',
    grade: 'g2',
    subject: 'english',
    type: 'create',
    title: 'Writing Corner',
    description: 'Build sentences with word tiles and create your own stories!',
    difficulty: 3,
    prerequisites: ['g2-eng-word-workshop-1'],
    learningObjectives: [
      'Form complete sentences',
      'Use capital letters and periods',
      'Write simple narratives'
    ],
    estimatedTime: 20,
    icon: '✍️',
    color: 'bg-green-500',
    tags: ['writing', 'sentences', 'creative']
  },
  {
    id: 'g2-eng-vocabulary-village-1',
    grade: 'g2',
    subject: 'english',
    type: 'practice',
    title: 'Vocabulary Village',
    description: 'Explore the village and learn new words!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Learn new vocabulary words',
      'Use words in context',
      'Match words to pictures'
    ],
    estimatedTime: 15,
    icon: '🏘️',
    color: 'bg-yellow-500',
    tags: ['vocabulary', 'words', 'context']
  }
];

// Grade 2 Kiswahili Activities
export const grade2KiswahiliActivities: Activity[] = [
  {
    id: 'g2-kisw-sauti-safari-1',
    grade: 'g2',
    subject: 'kiswahili',
    type: 'explore',
    title: 'Sauti Safari',
    description: 'Tambua sauti za herufi na unda maneno!',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Tambua sauti za herufi',
      'Unda maneno kutoka kwa sauti',
      'Soma maneno rahisi'
    ],
    estimatedTime: 15,
    icon: '🔤',
    color: 'bg-orange-500',
    tags: ['sauti', 'herufi', 'kusoma']
  },
  {
    id: 'g2-kisw-hadithi-house-1',
    grade: 'g2',
    subject: 'kiswahili',
    type: 'explore',
    title: 'Nyumba ya Hadithi',
    description: 'Soma hadithi fupi na jibu maswali!',
    difficulty: 2,
    prerequisites: ['g2-kisw-sauti-safari-1'],
    learningObjectives: [
      'Soma hadithi fupi',
      'Elewa hadithi',
      'Jibu maswali kuhusu hadithi'
    ],
    estimatedTime: 20,
    icon: '📖',
    color: 'bg-red-500',
    tags: ['hadithi', 'kusoma', 'uelewa']
  },
  {
    id: 'g2-kisw-maneno-market-1',
    grade: 'g2',
    subject: 'kiswahili',
    type: 'practice',
    title: 'Soko la Maneno',
    description: 'Jifunze maneno mapya sokoni!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Jifunze maneno mapya',
      'Tumia maneno katika sentensi',
      'Oanisha maneno na picha'
    ],
    estimatedTime: 15,
    icon: '🛒',
    color: 'bg-green-500',
    tags: ['maneno', 'msamiati', 'soko']
  },
  {
    id: 'g2-kisw-andika-adventure-1',
    grade: 'g2',
    subject: 'kiswahili',
    type: 'create',
    title: 'Safari ya Kuandika',
    description: 'Unda sentensi na hadithi fupi!',
    difficulty: 3,
    prerequisites: ['g2-kisw-sauti-safari-1'],
    learningObjectives: [
      'Andika sentensi sahihi',
      'Tumia herufi kubwa na alama',
      'Unda hadithi fupi'
    ],
    estimatedTime: 20,
    icon: '✏️',
    color: 'bg-blue-500',
    tags: ['kuandika', 'sentensi', 'ubunifu']
  }
];

// Grade 2 Environmental Activities
export const grade2EnvironmentalActivities: Activity[] = [
  {
    id: 'g2-env-nature-explorer-1',
    grade: 'g2',
    subject: 'environmental',
    type: 'explore',
    title: 'Nature Explorer',
    description: 'Discover plants and animals in our environment!',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Identify common plants',
      'Identify common animals',
      'Understand living vs non-living things'
    ],
    estimatedTime: 15,
    icon: '🌿',
    color: 'bg-green-500',
    tags: ['nature', 'plants', 'animals']
  },
  {
    id: 'g2-env-weather-watch-1',
    grade: 'g2',
    subject: 'environmental',
    type: 'explore',
    title: 'Weather Watch',
    description: 'Learn about different types of weather!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Identify weather types',
      'Understand weather patterns',
      'Dress appropriately for weather'
    ],
    estimatedTime: 15,
    icon: '🌤️',
    color: 'bg-blue-500',
    tags: ['weather', 'climate', 'observation']
  },
  {
    id: 'g2-env-clean-earth-1',
    grade: 'g2',
    subject: 'environmental',
    type: 'practice',
    title: 'Clean Earth Heroes',
    description: 'Learn how to keep our environment clean!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Understand importance of cleanliness',
      'Identify ways to keep environment clean',
      'Practice waste management'
    ],
    estimatedTime: 20,
    icon: '♻️',
    color: 'bg-emerald-500',
    tags: ['cleanliness', 'environment', 'responsibility']
  },
  {
    id: 'g2-env-water-world-1',
    grade: 'g2',
    subject: 'environmental',
    type: 'explore',
    title: 'Water World',
    description: 'Discover the importance of water!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Understand uses of water',
      'Learn about water sources',
      'Practice water conservation'
    ],
    estimatedTime: 15,
    icon: '💧',
    color: 'bg-cyan-500',
    tags: ['water', 'conservation', 'resources']
  }
];

// Grade 2 CRE Activities
export const grade2CREActivities: Activity[] = [
  {
    id: 'g2-cre-creation-story-1',
    grade: 'g2',
    subject: 'cre',
    type: 'explore',
    title: 'Creation Story',
    description: 'Learn about how God created the world!',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Understand the creation story',
      'Identify things God created',
      'Appreciate God\'s creation'
    ],
    estimatedTime: 15,
    icon: '🌍',
    color: 'bg-purple-500',
    tags: ['creation', 'bible', 'stories']
  },
  {
    id: 'g2-cre-prayer-time-1',
    grade: 'g2',
    subject: 'cre',
    type: 'practice',
    title: 'Prayer Time',
    description: 'Learn simple prayers and when to pray!',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Learn simple prayers',
      'Understand importance of prayer',
      'Know when to pray'
    ],
    estimatedTime: 15,
    icon: '🙏',
    color: 'bg-indigo-500',
    tags: ['prayer', 'worship', 'faith']
  },
  {
    id: 'g2-cre-good-deeds-1',
    grade: 'g2',
    subject: 'cre',
    type: 'practice',
    title: 'Good Deeds Garden',
    description: 'Plant seeds of kindness by doing good deeds!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Identify good deeds',
      'Practice kindness',
      'Help others'
    ],
    estimatedTime: 20,
    icon: '❤️',
    color: 'bg-pink-500',
    tags: ['kindness', 'values', 'character']
  },
  {
    id: 'g2-cre-bible-heroes-1',
    grade: 'g2',
    subject: 'cre',
    type: 'explore',
    title: 'Bible Heroes',
    description: 'Meet heroes from the Bible!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Learn about Bible characters',
      'Understand their stories',
      'Learn lessons from their lives'
    ],
    estimatedTime: 20,
    icon: '⭐',
    color: 'bg-yellow-500',
    tags: ['bible', 'heroes', 'stories']
  }
];

// Grade 2 Creative Activities  
export const grade2CreativeActivities: Activity[] = [
  {
    id: 'g2-creative-shape-art-1',
    grade: 'g2',
    subject: 'creative',
    type: 'create',
    title: 'Shape Art Studio',
    description: 'Create beautiful pictures using shapes!',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Identify shapes in environment',
      'Draw simple forms using shapes',
      'Create collage pictures'
    ],
    estimatedTime: 20,
    icon: '🎨',
    color: 'bg-pink-500',
    tags: ['art', 'shapes', 'creativity']
  },
  {
    id: 'g2-creative-rhythm-playground-1',
    grade: 'g2',
    subject: 'creative',
    type: 'explore',
    title: 'Rhythm Playground',
    description: 'Make music and learn about rhythm!',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Identify ways of creating rhythm',
      'Sing songs maintaining beat',
      'Make body movements to reflect rhythms'
    ],
    estimatedTime: 15,
    icon: '🎵',
    color: 'bg-purple-500',
    tags: ['music', 'rhythm', 'movement']
  },
  {
    id: 'g2-creative-color-mixer-1',
    grade: 'g2',
    subject: 'creative',
    type: 'explore',
    title: 'Color Mixer',
    description: 'Mix colors and create new ones!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Identify primary colors',
      'Mix colors to create secondary colors',
      'Use colors expressively'
    ],
    estimatedTime: 20,
    icon: '🌈',
    color: 'bg-red-500',
    tags: ['colors', 'mixing', 'art']
  },
  {
    id: 'g2-creative-story-drama-1',
    grade: 'g2',
    subject: 'creative',
    type: 'create',
    title: 'Story Drama',
    description: 'Act out stories and express yourself!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Express ideas through drama',
      'Use body language',
      'Work collaboratively'
    ],
    estimatedTime: 25,
    icon: '🎭',
    color: 'bg-orange-500',
    tags: ['drama', 'expression', 'collaboration']
  }
];

// Grade 2 Indigenous Language Activities
export const grade2IndigenousActivities: Activity[] = [
  {
    id: 'g2-indig-instruction-game-1',
    grade: 'g2',
    subject: 'indigenous',
    type: 'practice',
    title: 'Instruction Game',
    description: 'Follow and give instructions in your language!',
    difficulty: 1,
    prerequisites: [],
    learningObjectives: [
      'Respond to simple sequenced instructions',
      'Use verbal and non-verbal cues',
      'Give instructions to peers'
    ],
    estimatedTime: 15,
    icon: '👂',
    color: 'bg-teal-500',
    tags: ['listening', 'instructions', 'communication']
  },
  {
    id: 'g2-indig-picture-story-1',
    grade: 'g2',
    subject: 'indigenous',
    type: 'explore',
    title: 'Picture Story Builder',
    description: 'Create stories from pictures!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Identify pictures of items in school',
      'Make predictions on stories',
      'Create stories from pictures'
    ],
    estimatedTime: 20,
    icon: '🖼️',
    color: 'bg-indigo-500',
    tags: ['pictures', 'stories', 'creativity']
  },
  {
    id: 'g2-indig-word-builder-1',
    grade: 'g2',
    subject: 'indigenous',
    type: 'practice',
    title: 'Word Builder',
    description: 'Build words in your mother tongue!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Form simple words',
      'Read simple texts',
      'Understand word meanings'
    ],
    estimatedTime: 15,
    icon: '🔤',
    color: 'bg-green-500',
    tags: ['words', 'reading', 'language']
  },
  {
    id: 'g2-indig-cultural-tales-1',
    grade: 'g2',
    subject: 'indigenous',
    type: 'explore',
    title: 'Cultural Tales',
    description: 'Learn traditional stories and their lessons!',
    difficulty: 2,
    prerequisites: [],
    learningObjectives: [
      'Listen to traditional stories',
      'Understand cultural values',
      'Retell stories'
    ],
    estimatedTime: 20,
    icon: '📚',
    color: 'bg-amber-500',
    tags: ['culture', 'stories', 'values']
  }
];

// Activity registry - maps grade + subject to activities
export const activityRegistry: Record<string, Activity[]> = {
  'g2-mathematics': grade2MathActivities,
  'g2-english': grade2EnglishActivities,
  'g2-kiswahili': grade2KiswahiliActivities,
  'g2-environmental': grade2EnvironmentalActivities,
  'g2-cre': grade2CREActivities,
  'g2-creative': grade2CreativeActivities,
  'g2-indigenous': grade2IndigenousActivities,
  // Add more grades as we build them
};

// Helper function to get activities for a grade and subject with term filtering
export function getActivitiesForGradeSubject(
  grade: GradeId,
  subject: SubjectId,
  filterByTerm: boolean = true
): Activity[] {
  const key = `${grade}-${subject}`;
  let activities = activityRegistry[key] || [];
  
  // For Grade 2, merge with curriculum-based activities
  if (grade === 'g2' && ['english', 'kiswahili', 'mathematics'].includes(subject)) {
    const curriculumActivities = getCurriculumActivities(subject);
    // Merge, preferring curriculum activities
    const curriculumIds = new Set(curriculumActivities.map(a => a.id));
    const legacyActivities = activities.filter(a => !curriculumIds.has(a.id));
    activities = [...curriculumActivities, ...legacyActivities];
  }
  
  // Filter by available terms if requested
  if (filterByTerm) {
    const availableTerms = getAvailableTerms();
    activities = activities.filter(activity => {
      // If no term specified, include it (legacy activities)
      if (!activity.term) return true;
      // Otherwise check if term is available
      return availableTerms.includes(activity.term as 1 | 2 | 3);
    });
  }

  // Keep every sandbox route usable while authored, grade-specific content is
  // still being expanded. The generic worksheet is intentionally small and
  // routes through the same adaptive grading, progress, and Omega chat bridge
  // as authored activities; it is not presented as curriculum-complete.
  if (activities.length === 0) {
    const subjectLabel = subject
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    activities = [{
      id: `${grade}-${subject}-guided-foundations`,
      grade,
      subject,
      type: 'explore',
      title: `${subjectLabel} Guided Foundations`,
      description: `Start a guided ${subjectLabel} learning conversation and build one foundation skill at a time.`,
      difficulty: 1,
      icon: '🧭',
      color: 'bg-teal-100',
      tags: ['guided', 'foundations'],
      prerequisites: [],
      learningObjectives: [`Explain one idea from ${subjectLabel} in your own words`],
      estimatedTime: 10,
    }];
  }
  
  return activities;
}

// Helper function to get activity by ID.
//
// Curriculum-generated activities (ids shaped like `g2-english-s1-ss1`) live
// in `curriculum-activities-mapper.ts`, not in `activityRegistry`. The old
// implementation only walked the registry, so any deep link into a curriculum
// activity rendered the "Activity Not Found" fallback. We now check the
// curriculum activities for the grades/subjects that produce them before
// giving up.
export function getActivityById(activityId: string): Activity | undefined {
  for (const activities of Object.values(activityRegistry)) {
    const activity = activities.find(a => a.id === activityId);
    if (activity) return activity;
  }

  // Curriculum activities are only generated for Grade 2 today; the id prefix
  // tells us which subject mapper to consult so we don't pay the cost of
  // generating every curriculum on every lookup.
  if (activityId.startsWith('g2-')) {
    const subjectFromId = activityId.split('-')[1] as SubjectId | undefined;
    const curriculumSubjects: SubjectId[] = ['english', 'kiswahili', 'mathematics'];
    if (subjectFromId && curriculumSubjects.includes(subjectFromId)) {
      const curriculumActivities = getCurriculumActivities(subjectFromId);
      const found = curriculumActivities.find(a => a.id === activityId);
      if (found) return found;
    }
  }

  return undefined;
}

// Helper function to get next recommended activities
export function getRecommendedActivities(
  grade: GradeId,
  subject: SubjectId,
  completedActivityIds: string[]
): Activity[] {
  const allActivities = getActivitiesForGradeSubject(grade, subject, true); // Filter by term
  
  // Filter activities where all prerequisites are completed
  const available = allActivities.filter(activity => {
    if (completedActivityIds.includes(activity.id)) return false;
    return activity.prerequisites.every(prereq => completedActivityIds.includes(prereq));
  });
  
  // Sort by term first, then difficulty and priority
  return available.sort((a, b) => {
    // Prioritize current term activities
    const currentTerm = getCurrentTerm();
    const aIsCurrentTerm = a.term === currentTerm;
    const bIsCurrentTerm = b.term === currentTerm;
    
    if (aIsCurrentTerm && !bIsCurrentTerm) return -1;
    if (!aIsCurrentTerm && bIsCurrentTerm) return 1;
    
    // Then by term (earlier terms first)
    if (a.term && b.term && a.term !== b.term) return a.term - b.term;
    
    // Then by difficulty
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
    
    // Finally by estimated time
    return a.estimatedTime - b.estimatedTime;
  }).slice(0, 3); // Return top 3 recommendations
}

// Helper function to get activities by term
export function getActivitiesByTerm(
  grade: GradeId,
  subject: SubjectId,
  term: number
): Activity[] {
  const allActivities = getActivitiesForGradeSubject(grade, subject, false); // Don't filter
  return allActivities.filter(activity => activity.term === term);
}

// Helper function to get term statistics
export function getTermStatistics(
  grade: GradeId,
  subject: SubjectId
): { term: number; count: number; completed: number }[] {
  const allActivities = getActivitiesForGradeSubject(grade, subject, false);
  const stats = new Map<number, { count: number; completed: number }>();
  
  // Initialize for terms 1, 2, 3
  [1, 2, 3].forEach(term => {
    stats.set(term, { count: 0, completed: 0 });
  });
  
  // Count activities per term
  allActivities.forEach(activity => {
    const term = activity.term || 1; // Default to term 1 for legacy activities
    const stat = stats.get(term);
    if (stat) {
      stat.count++;
    }
  });
  
  return Array.from(stats.entries()).map(([term, data]) => ({
    term,
    count: data.count,
    completed: data.completed
  }));
}

// Made with Bob
