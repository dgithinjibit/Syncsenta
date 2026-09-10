/**
 * Curriculum to Activities Mapper
 * 
 * Maps curriculum data to sandbox activities with proper term assignments
 * and subject-specific content from the KICD curriculum
 */

import { Activity, ActivityType, GradeId, SubjectId } from '../sandbox/sandbox-types';
import { Term } from './term-utils';
import { grade2EnglishLanguageActivitiesCurriculum } from '@/curriculum/grade2-english-language-activities';
import { grade2KiswahiliLanguageActivitiesCurriculum } from '@/curriculum/grade2-kiswahili-language-activities';
import { grade2MathematicsActivitiesCurriculum } from '@/curriculum/grade2-mathematics-activities';

export interface CurriculumActivity extends Activity {
  term: Term;
  strand: string;
  subStrand: string;
  learningOutcomes: string[];
  suggestedActivities: string[];
  keyInquiryQuestions: string[];
  // Add actual questions and answers from curriculum
  questions?: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    hint: string;
  }>;
}

/**
 * Map strand index to term (rough approximation based on curriculum flow)
 * For Grade 2, we typically have 10 strands distributed across 3 terms
 */
function mapStrandToTerm(strandIndex: number, totalStrands: number): Term {
  const strandsPerTerm = Math.ceil(totalStrands / 3);
  
  if (strandIndex < strandsPerTerm) return 1;
  if (strandIndex < strandsPerTerm * 2) return 2;
  return 3;
}

/**
 * Generate activity ID from curriculum data
 */
function generateActivityId(
  grade: GradeId,
  subject: SubjectId,
  strandIndex: number,
  subStrandIndex: number
): string {
  return `${grade}-${subject}-s${strandIndex + 1}-ss${subStrandIndex + 1}`;
}

/**
 * Determine activity type based on sub-strand content
 */
function determineActivityType(subStrandTitle: string, index: number): ActivityType {
  const title = subStrandTitle.toLowerCase();
  
  // Pattern matching for activity types
  if (title.includes('pronunciation') || title.includes('matamshi') || 
      title.includes('vocabulary') || title.includes('msamiati')) {
    return 'explore';
  }
  
  if (title.includes('fluency') || title.includes('ufasaha') ||
      title.includes('comprehension') || title.includes('ufahamu')) {
    return 'practice';
  }
  
  if (title.includes('handwriting') || title.includes('hati nadhifu') ||
      title.includes('kuandika') || title.includes('writing')) {
    return 'create';
  }
  
  if (title.includes('challenge') || title.includes('advanced')) {
    return 'challenge';
  }
  
  // Alternate between explore and practice for variety
  return index % 2 === 0 ? 'explore' : 'practice';
}

/**
 * Get appropriate icon for activity based on content
 */
function getActivityIcon(subStrandTitle: string, subject: SubjectId): string {
  const title = subStrandTitle.toLowerCase();
  
  // Subject-specific icons
  if (subject === 'mathematics') {
    if (title.includes('number')) return '🔢';
    if (title.includes('addition')) return '➕';
    if (title.includes('subtraction')) return '➖';
    if (title.includes('multiplication')) return '✖️';
    if (title.includes('division')) return '➗';
    if (title.includes('fraction')) return '🍕';
    if (title.includes('measurement') || title.includes('length')) return '📏';
    if (title.includes('mass') || title.includes('weight')) return '⚖️';
    if (title.includes('capacity')) return '🥤';
    if (title.includes('time')) return '🕐';
    if (title.includes('money')) return '💰';
    if (title.includes('shape')) return '🔷';
    if (title.includes('line')) return '📐';
    return '🔢';
  }
  
  if (subject === 'english') {
    if (title.includes('pronunciation') || title.includes('sound')) return '🗣️';
    if (title.includes('reading') || title.includes('fluency')) return '📖';
    if (title.includes('comprehension')) return '🧠';
    if (title.includes('writing') || title.includes('handwriting')) return '✍️';
    if (title.includes('vocabulary')) return '📚';
    if (title.includes('grammar')) return '📝';
    return '📝';
  }
  
  if (subject === 'kiswahili') {
    if (title.includes('matamshi') || title.includes('sauti')) return '🗣️';
    if (title.includes('kusoma') || title.includes('ufasaha')) return '📖';
    if (title.includes('ufahamu')) return '🧠';
    if (title.includes('kuandika') || title.includes('hati')) return '✍️';
    if (title.includes('msamiati') || title.includes('maneno')) return '📚';
    if (title.includes('sarufi')) return '📝';
    return '📝';
  }
  
  return '📚';
}
/**
 * Generate actual questions from curriculum sub-strand data
 */
interface QuestionGenerationContext {
  grade?: string;
  difficulty?: number;
}

function inferLearnerProfile(grade: string, difficulty?: number) {
  const numericGrade = Number.parseInt((grade || 'g2').replace(/\D/g, ''), 10) || 2;
  const levelScore = (numericGrade - 2) + (difficulty ?? 1);

  if (levelScore <= 2) return { label: 'early', voice: 'simple' as const };
  if (levelScore <= 5) return { label: 'developing', voice: 'guided' as const };
  if (levelScore <= 8) return { label: 'secure', voice: 'analytical' as const };
  return { label: 'advanced', voice: 'deep' as const };
}

function personalizePrompt(baseQuestion: string, subject: string, grade: string, difficulty?: number) {
  const profile = inferLearnerProfile(grade, difficulty);
  const gradeLabel = grade.toUpperCase().replace(/G/, 'Grade ');

  if (subject === 'kiswahili') {
    const prefix = profile.label === 'advanced'
      ? 'Chagua jibu sahihi zaidi'
      : 'Chagua jibu sahihi';
    return `${prefix}: ${baseQuestion}`;
  }

  const prefix = profile.label === 'advanced'
    ? `For ${gradeLabel} learners, choose the most accurate response:`
    : profile.label === 'secure'
      ? `Choose the best answer for this ${gradeLabel} task:`
      : profile.label === 'developing'
        ? `Pick the best answer for this ${subject} activity:`
        : `Choose the best answer:`;

  return `${prefix} ${baseQuestion}`;
}

function personalizeHint(baseHint: string, grade: string, difficulty?: number) {
  const profile = inferLearnerProfile(grade, difficulty);
  if (profile.label === 'advanced') return `${baseHint} Think about the full idea, not just one keyword.`;
  if (profile.label === 'secure') return `${baseHint} Use the clues in the question and topic.`;
  if (profile.label === 'developing') return `${baseHint} Focus on the key words in the prompt.`;
  return `${baseHint} Listen carefully for the main idea.`;
}

export function generateQuestionsFromCurriculum(
  subStrand: any,
  subject: SubjectId | string,
  context: QuestionGenerationContext = {}
): Array<{ question: string; options: string[]; correctAnswer: number; hint: string }> {
  const questions: Array<{ question: string; options: string[]; correctAnswer: number; hint: string }> = [];

  const inquiryQuestions = subStrand.key_inquiry_questions || [];
  const learningOutcomes = subStrand.learning_outcomes || [];
  const suggestedActivities = subStrand.suggested_activities || [];
  const combinedText = [
    ...learningOutcomes,
    ...suggestedActivities,
    ...inquiryQuestions,
  ].join(' ').toLowerCase();
  const grade = context.grade || 'g2';
  const difficulty = context.difficulty;

  for (let i = 0; i < Math.min(3, learningOutcomes.length); i++) {
    const outcome = learningOutcomes[i] || '';
    const inquiryQ = inquiryQuestions[i] || inquiryQuestions[0] || 'What did you learn?';

    let question = inquiryQ;
    let options: string[] = [];
    let correctAnswer = 0;
    let hint = '';

    const isGrammarTopic = /grammar|usage|matumizi|sentence|punctuation|kiulizi|-ako|-enu/.test(combinedText);
    const isPronunciationTopic = /sound|pronunciation|phonics|sauti|silabi|\/ny\/|\/ng\/|matamshi/.test(combinedText);
    const isComprehensionTopic = /read|reading|story|text|comprehension|understand|hadithi|ufahamu/.test(combinedText);
    const isScienceTopic = /scientific|experiment|hypothesis|observe|energy|matter|cells|organism|process|system|environment/.test(combinedText);

    if (subject === 'english') {
      if (isPronunciationTopic || outcome.includes('sound') || outcome.includes('pronunciation')) {
        question = 'Which word has the correct letter-sound combination?';
        options = ['blue (bl)', 'bule (bl)', 'bleu (bl)', 'bloo (bl)'];
        hint = 'Listen carefully to the sound at the beginning of the word.';
      } else if (isGrammarTopic || outcome.includes('grammar') || outcome.includes('sentence')) {
        question = 'Which sentence uses the correct grammar and word choice?';
        options = ['She is reading a book.', 'She are reading a book.', 'She reading a book.', 'She am reading a book.'];
        hint = 'Think about the subject and the verb that fit together.';
      } else if (isComprehensionTopic || outcome.includes('read') || outcome.includes('fluency')) {
        question = 'What should you do when reading aloud?';
        options = ['Read at the right speed with expression', 'Read as fast as possible', 'Skip difficult words', 'Read without pausing'];
        hint = 'Good reading includes proper speed and expression.';
      } else if (outcome.includes('write') || outcome.includes('handwriting')) {
        question = 'Why is it important to write neatly?';
        options = ['So others can read our writing', 'To use more paper', 'To write slowly', 'To make it look fancy'];
        hint = 'Think about who will read what you write.';
      } else {
        question = inquiryQ;
        options = ['Practice and listen carefully', 'Skip the hard parts', 'Only read easy words', 'Avoid asking questions'];
        hint = outcome.substring(0, 50) + '...';
      }
    } else if (subject === 'kiswahili') {
      const usesSoundPatterns = /sauti lengwa|\/ny\/|\/ng\/|silabi/.test(combinedText);
      const usesPossessiveForms = /-ako|-enu|matumizi ya/.test(combinedText);

      if (usesPossessiveForms && /-ako|-enu/.test(combinedText)) {
        question = 'Ni sentensi gani ina matumizi sahihi ya -ako na -enu?';
        options = ['Mtoto wako anapenda nyumba yenu.', 'Mtoto wangu anapenda nyumba ya yako.', 'Mtoto wangu anapenda nyumba na yako.', 'Mtoto wangu anapenda nyumba yetu.'];
        correctAnswer = 0;
        hint = 'Fikiria jinsi tunavyotumia -ako na -enu kuonyesha umiliki wa mtu mmoja au watu wengi.';
      } else if (usesSoundPatterns) {
        question = 'Ni neno gani lina sauti /ny/ na /ng/ kwenye silabi zake?';
        options = ['nyanya', 'nguo', 'mwana', 'kiti'];
        correctAnswer = 0;
        hint = 'Fikiria sauti ya kwanza na ya mwisho ya neno; sauti hizi huonekana katika maneno ya sauti lengwa.';
      } else if (outcome.includes('kutambua') || outcome.includes('tambua')) {
        question = 'Ni neno gani lina sauti ya /p/?';
        options = ['paka', 'baba', 'taka', 'dada'];
        hint = 'Sikiliza sauti ya kwanza ya neno.';
      } else if (outcome.includes('kusoma') || outcome.includes('soma')) {
        question = 'Tunapaswa kusoma vipi?';
        options = ['Kwa sauti inayosikika na kasi ifaayo', 'Haraka sana', 'Bila kuzingatia alama', 'Kwa sauti ya chini'];
        hint = 'Kusoma kwa ufasaha ni muhimu.';
      } else if (outcome.includes('kuandika') || outcome.includes('andika')) {
        question = 'Kwa nini tuandike kwa hati nadhifu?';
        options = ['Ili wengine waweze kusoma', 'Ili kutumia karatasi nyingi', 'Ili kuandika polepole', 'Ili kuonyesha ujuzi'];
        hint = 'Fikiria watu watakaosoma ulichoandika.';
      } else if (outcome.includes('ufahamu')) {
        question = 'Picha zinasaidia vipi katika hadithi?';
        options = ['Zinaonyesha hadithi inahusu nini', 'Zinafanya kitabu kizuri', 'Zinachukua nafasi', 'Ni pambo tu'];
        hint = 'Picha zinatupa vidokezo kuhusu hadithi.';
      } else {
        question = inquiryQ;
        options = ['Fanya mazoezi na sikiliza kwa makini', 'Ruka sehemu ngumu', 'Soma maneno rahisi tu', 'Usiulize maswali'];
        hint = outcome.substring(0, 50) + '...';
      }
    } else if (subject === 'mathematics') {
      if (outcome.includes('count') || outcome.includes('identify numbers')) {
        question = 'How many objects are there?';
        options = ['7 objects', '5 objects', '9 objects', '6 objects'];
        hint = 'Count each object one by one.';
      } else if (outcome.includes('add')) {
        question = 'What is 5 + 3?';
        options = ['8', '7', '9', '6'];
        hint = 'Count forward from 5: 6, 7, 8...';
      } else if (outcome.includes('subtract')) {
        question = 'What is 10 - 4?';
        options = ['6', '5', '7', '14'];
        hint = 'Count backward from 10: 9, 8, 7, 6...';
      } else if (outcome.includes('multiply')) {
        question = 'What is 3 × 2?';
        options = ['6', '5', '7', '8'];
        hint = '3 groups of 2 objects each.';
      } else if (outcome.includes('divide')) {
        question = 'Share 8 items equally between 2 people. How many does each get?';
        options = ['4 items each', '3 items each', '5 items each', '2 items each'];
        hint = 'Give one to each person, then repeat.';
      } else if (outcome.includes('fraction')) {
        question = 'What is half of a whole?';
        options = ['1/2 or one part of two equal parts', '1/4 or one part of four', 'The whole thing', 'Three parts'];
        hint = 'Half means dividing into 2 equal parts.';
      } else if (outcome.includes('measure') || outcome.includes('length')) {
        question = 'What do we use to measure length?';
        options = ['A metre stick or ruler', 'A cup', 'A clock', 'A scale'];
        hint = 'Think about tools for measuring how long something is.';
      } else if (outcome.includes('shape')) {
        question = 'Which shape has 4 equal sides?';
        options = ['Square', 'Triangle', 'Circle', 'Rectangle'];
        hint = 'Count the sides and check if they are equal.';
      } else {
        question = inquiryQ;
        options = ['Practice counting and solving problems', 'Skip the hard questions', 'Only do easy math', 'Avoid using objects'];
        hint = outcome.substring(0, 50) + '...';
      }
    } else if (isScienceTopic || subject === 'science') {
      if (outcome.includes('experiment') || combinedText.includes('experiment')) {
        question = 'Which step comes next in a simple experiment?';
        options = ['Record the result', 'Skip the test', 'Ignore the materials', 'Guess without observing'];
        hint = 'Science investigations depend on careful observation and recording.';
      } else if (outcome.includes('energy') || combinedText.includes('energy')) {
        question = 'Which source provides energy to a plant?';
        options = ['Sunlight', 'Rock', 'Shadow', 'Water bottle'];
        hint = 'Plants need light to make food.';
      } else {
        question = 'Which statement best explains the main idea of this science topic?';
        options = ['It describes the key concept clearly', 'It is unrelated to the topic', 'It gives a random example', 'It avoids evidence'];
        hint = 'Focus on the main concept and the evidence that supports it.';
      }
    } else {
      question = inquiryQ;
      options = ['Choose the best answer', 'Pick an option that fits the topic', 'Review the lesson idea', 'Try again later'];
      hint = outcome.substring(0, 50) + '...';
    }

    question = personalizePrompt(question, String(subject), grade, difficulty);
    hint = personalizeHint(hint || 'Use the clues in the lesson.', grade, difficulty);

    questions.push({ question, options, correctAnswer, hint });
  }

  return questions.length > 0 ? questions : [
    {
      question: personalizePrompt(inquiryQuestions[0] || 'What did you learn from this lesson?', String(subject), grade, difficulty),
      options: [
        learningOutcomes[0]?.substring(0, 40) || 'The main concept',
        'Something different',
        'Nothing specific',
        'I need to review'
      ],
      correctAnswer: 0,
      hint: personalizeHint('Think about the learning outcomes for this activity.', grade, difficulty)
    }
  ];
}


/**
 * Get color based on activity type and difficulty
 */
function getActivityColor(type: ActivityType, difficulty: number): string {
  const baseColors = {
    explore: 'bg-blue-500',
    practice: 'bg-green-500',
    challenge: 'bg-orange-500',
    create: 'bg-purple-500',
  };
  
  return baseColors[type];
}

/**
 * Generate activities from Grade 2 English curriculum
 */
export function generateGrade2EnglishActivities(): CurriculumActivity[] {
  const activities: CurriculumActivity[] = [];
  const curriculum = grade2EnglishLanguageActivitiesCurriculum;
  
  curriculum.strands.forEach((strand, strandIndex) => {
    const term = mapStrandToTerm(strandIndex, curriculum.strands.length);
    
    strand.sub_strands.forEach((subStrand, subStrandIndex) => {
      const activityId = generateActivityId('g2', 'english', strandIndex, subStrandIndex);
      const activityType = determineActivityType(subStrand.title, subStrandIndex);
      const difficulty = Math.min(5, Math.floor(strandIndex / 2) + 1);
      
      activities.push({
        id: activityId,
        grade: 'g2',
        subject: 'english',
        type: activityType,
        title: subStrand.title.replace(/^\d+\.\d+\.\d+\s*/, ''), // Remove numbering
        description: subStrand.learning_outcomes[0] || 'Practice English language skills',
        difficulty,
        prerequisites: subStrandIndex > 0 ? [generateActivityId('g2', 'english', strandIndex, subStrandIndex - 1)] : [],
        learningObjectives: subStrand.learning_outcomes,
        estimatedTime: 15 + (difficulty * 5),
        icon: getActivityIcon(subStrand.title, 'english'),
        color: getActivityColor(activityType, difficulty),
        tags: ['english', 'language', strand.title.toLowerCase().replace(/\d+\.\d+\s*/, '')],
        term,
        strand: strand.title,
        subStrand: subStrand.title,
        learningOutcomes: subStrand.learning_outcomes,
        suggestedActivities: subStrand.suggested_activities,
        keyInquiryQuestions: subStrand.key_inquiry_questions,
        questions: generateQuestionsFromCurriculum(subStrand, 'english'),
      });
    });
  });
  
  return activities;
}

/**
 * Generate activities from Grade 2 Kiswahili curriculum
 */
export function generateGrade2KiswahiliActivities(): CurriculumActivity[] {
  const activities: CurriculumActivity[] = [];
  const curriculum = grade2KiswahiliLanguageActivitiesCurriculum;
  
  curriculum.strands.forEach((strand, strandIndex) => {
    const term = mapStrandToTerm(strandIndex, curriculum.strands.length);
    
    strand.sub_strands.forEach((subStrand, subStrandIndex) => {
      const activityId = generateActivityId('g2', 'kiswahili', strandIndex, subStrandIndex);
      const activityType = determineActivityType(subStrand.title, subStrandIndex);
      const difficulty = Math.min(5, Math.floor(strandIndex / 2) + 1);
      
      activities.push({
        id: activityId,
        grade: 'g2',
        subject: 'kiswahili',
        type: activityType,
        title: subStrand.title.replace(/^\d+\.\d+\.\d+\s*/, ''),
        description: subStrand.learning_outcomes[0] || 'Fanya mazoezi ya Kiswahili',
        difficulty,
        prerequisites: subStrandIndex > 0 ? [generateActivityId('g2', 'kiswahili', strandIndex, subStrandIndex - 1)] : [],
        learningObjectives: subStrand.learning_outcomes,
        estimatedTime: 15 + (difficulty * 5),
        icon: getActivityIcon(subStrand.title, 'kiswahili'),
        color: getActivityColor(activityType, difficulty),
        tags: ['kiswahili', 'lugha', strand.title.toLowerCase().replace(/\d+\.\d+\s*/, '')],
        term,
        strand: strand.title,
        subStrand: subStrand.title,
        learningOutcomes: subStrand.learning_outcomes,
        suggestedActivities: subStrand.suggested_activities,
        keyInquiryQuestions: subStrand.key_inquiry_questions,
        questions: generateQuestionsFromCurriculum(subStrand, 'kiswahili'),
      });
    });
  });
  
  return activities;
}

/**
 * Generate activities from Grade 2 Mathematics curriculum
 */
export function generateGrade2MathematicsActivities(): CurriculumActivity[] {
  const activities: CurriculumActivity[] = [];
  const curriculum = grade2MathematicsActivitiesCurriculum;
  
  curriculum.strands.forEach((strand, strandIndex) => {
    const term = mapStrandToTerm(strandIndex, curriculum.strands.length);
    
    strand.sub_strands.forEach((subStrand, subStrandIndex) => {
      const activityId = generateActivityId('g2', 'mathematics', strandIndex, subStrandIndex);
      const activityType = determineActivityType(subStrand.title, subStrandIndex);
      const difficulty = Math.min(5, Math.floor(strandIndex / 2) + 1);
      
      activities.push({
        id: activityId,
        grade: 'g2',
        subject: 'mathematics',
        type: activityType,
        title: subStrand.title.replace(/^\d+\.\d+\s*/, ''),
        description: subStrand.learning_outcomes[0] || 'Practice mathematics skills',
        difficulty,
        prerequisites: subStrandIndex > 0 ? [generateActivityId('g2', 'mathematics', strandIndex, subStrandIndex - 1)] : [],
        learningObjectives: subStrand.learning_outcomes,
        estimatedTime: 15 + (difficulty * 5),
        icon: getActivityIcon(subStrand.title, 'mathematics'),
        color: getActivityColor(activityType, difficulty),
        tags: ['mathematics', 'math', strand.title.toLowerCase().replace(/\d+\.\d+\s*/, '')],
        term,
        strand: strand.title,
        subStrand: subStrand.title,
        learningOutcomes: subStrand.learning_outcomes,
        suggestedActivities: subStrand.suggested_activities,
        keyInquiryQuestions: subStrand.key_inquiry_questions,
        questions: generateQuestionsFromCurriculum(subStrand, 'mathematics'),
      });
    });
  });
  
  return activities;
}

/**
 * Get all curriculum-based activities for a subject
 */
export function getCurriculumActivities(subject: SubjectId): CurriculumActivity[] {
  switch (subject) {
    case 'english':
      return generateGrade2EnglishActivities();
    case 'kiswahili':
      return generateGrade2KiswahiliActivities();
    case 'mathematics':
      return generateGrade2MathematicsActivities();
    default:
      return [];
  }
}

// Made with Bob
