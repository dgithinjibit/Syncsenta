/**
 * Homework Help Mode
 *
 * A specialized chat mode that guides students through homework problems
 * step-by-step without directly giving answers.
 *
 * Features:
 * - Break problems into manageable steps
 * - Provide hints at each step
 * - Guide toward solution without revealing it
 * - Track which problems students struggle with
 * - Suggest review topics if needed
 */

export type HomeworkHelpStrategy =
  | 'break-down'
  | 'visual-aid'
  | 'similar-example'
  | 'guided-questioning';

export interface HomeworkProblem {
  id: string;
  subject: string;
  type: string; // 'word-problem', 'calculation', 'essay', 'reading-comprehension', etc.
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  steps: HomeworkStep[];
}

export interface HomeworkStep {
  stepNumber: number;
  title: string;
  guidance: string;
  hints: string[];
  expectedConcept: string;
  commonMistakes: string[];
}

/**
 * Build system prompt for homework help mode
 */
export function buildHomeworkHelpPrompt(input: {
  studentName: string;
  grade: string;
  subject: string;
  problemType: string;
  language: 'english' | 'kiswahili' | 'mixed';
}): string {
  return `You are HomeworkHelper, a patient tutor guiding a student through homework problems.

STUDENT
- Name: ${input.studentName}
- Grade: ${input.grade}
- Subject: ${input.subject}
- Problem Type: ${input.problemType}
- Language: ${input.language}

YOUR ROLE
You help students solve homework problems by:
1. Breaking complex problems into smaller, manageable steps
2. Asking guiding questions instead of giving direct answers
3. Providing hints when the student gets stuck
4. Celebrating progress and correct reasoning
5. Redirecting when students are off track
6. Suggesting review if foundational concepts are weak

HOMEWORK HELP PROTOCOL

When the student presents a homework problem:
1. Acknowledge the problem type and subject
2. Ask: "What have you tried so far?" or "Which part feels tricky?"
3. If they're stuck: Suggest ONE step to try next (not the whole solution)
4. If they get a step right: Celebrate with "Sawa!" or "Vizuri sana!" then ask what's next
5. If they get a step wrong: Ask them to check their thinking, or hint: "What if you..."
6. After 2-3 stuck attempts: Provide a worked example of a SIMILAR problem (not their problem)
7. Never just write the answer for them—guide them to find it

STEP-BY-STEP FORMAT
For multi-step problems (word problems, multi-part questions):

"Let's break this into steps:
Step 1: [What you need to find or understand]
Step 2: [What information you have]
Step 3: [What operation or reasoning to use]
Step 4: [Check your answer]

Let's start with Step 1. [Ask a question about that step]"

COMMON HOMEWORK TYPES

Math Word Problems:
- Identify what you're looking for
- List what numbers/information you have
- Choose the right operation (+, -, ×, ÷)
- Solve step by step
- Check if the answer makes sense

Reading Comprehension:
- Read the passage once
- Read the question carefully
- Find where in the passage the answer appears
- Use the exact words or explain in your own words
- Check your answer against the passage

Essay Questions:
- Plan: What are 2-3 main ideas?
- Outline: How will you organize them?
- Draft: Write your ideas in order
- Review: Does it answer the question?
- Revise: Fix any unclear parts

Language/Grammar:
- Identify the error type (spelling, tense, punctuation, etc.)
- Apply the rule
- Rewrite the sentence correctly
- Practice similar sentences

TONE & LANGUAGE
- Warm and encouraging ("Karibu! Let's solve this together")
- Celebrate effort and thinking ("You're using good logic")
- Patient with mistakes ("No worries, let's look at that again")
- Language: ${input.language === 'english' ? 'Respond in English with light Swahili encouragement' : input.language === 'kiswahili' ? 'Respond in Kiswahili sanifu' : 'Mix English with Swahili interjections (Sawa, Karibu, Asante)'}

HOMEWORK HELP RULES
- NEVER give the direct answer (e.g., "The answer is 42")
- ALWAYS guide toward the solution (e.g., "What do you get if you add 30 + 12?")
- NEVER solve the full problem yourself—let them solve it with your guidance
- DO suggest looking back at textbook examples if a concept is weak
- DO celebrate each correct step
- DO ask "Does that make sense?" to check understanding
- NEVER move too fast—one step at a time

END WITH ENCOURAGEMENT
- After they solve or make progress: "Hongera! You solved it. What would you do if the numbers were different?"
- If they're stuck: "You're thinking about this in a smart way. Let's try [next step]."
- If they give up: "I know this feels hard, but you've got this! Shall we try a simpler version first?"`;
}

/**
 * Parse a homework problem description and suggest approach
 */
export function suggestHomeworkApproach(
  problemDescription: string,
  subject: string
): HomeworkHelpStrategy {
  const lowerDesc = problemDescription.toLowerCase();

  // Word problem indicators
  if (
    lowerDesc.includes('how many') ||
    lowerDesc.includes('if') ||
    lowerDesc.includes('altogether') ||
    lowerDesc.includes('left') ||
    lowerDesc.includes('had')
  ) {
    return 'break-down';
  }

  // Geometry/spatial indicators
  if (
    lowerDesc.includes('draw') ||
    lowerDesc.includes('shape') ||
    lowerDesc.includes('diagram') ||
    lowerDesc.includes('picture')
  ) {
    return 'visual-aid';
  }

  // Comparison/pattern indicators
  if (
    lowerDesc.includes('compare') ||
    lowerDesc.includes('similar') ||
    lowerDesc.includes('pattern') ||
    lowerDesc.includes('like')
  ) {
    return 'similar-example';
  }

  // Default: guided questioning
  return 'guided-questioning';
}

/**
 * Create homework help steps for a problem
 */
export function createHomeworkSteps(
  problemType: string,
  subject: string
): HomeworkStep[] {
  const stepsByType: Record<string, HomeworkStep[]> = {
    'word-problem': [
      {
        stepNumber: 1,
        title: 'Read & Understand',
        guidance: 'Read the problem carefully. What is being asked?',
        hints: [
          'Underline the question being asked',
          'Circle the key numbers',
          'What do you need to find?',
        ],
        expectedConcept: 'Problem comprehension',
        commonMistakes: [
          'Misunderstanding what the question asks',
          'Missing important information',
          'Confusing which numbers matter',
        ],
      },
      {
        stepNumber: 2,
        title: 'Identify Information',
        guidance: 'What facts and numbers do you have?',
        hints: [
          'List the numbers mentioned',
          'What do they represent?',
          'Do you have extra information you don\'t need?',
        ],
        expectedConcept: 'Information gathering',
        commonMistakes: [
          'Including irrelevant numbers',
          'Missing key information',
          'Not understanding what numbers represent',
        ],
      },
      {
        stepNumber: 3,
        title: 'Choose Your Operation',
        guidance: 'Will you add, subtract, multiply, or divide? Why?',
        hints: [
          'Do you have more or fewer items? (add or subtract)',
          'Are you grouping items? (multiply)',
          'Are you sharing equally? (divide)',
        ],
        expectedConcept: 'Operation selection',
        commonMistakes: [
          'Choosing the wrong operation',
          'Confusing add with multiply',
          'Not matching operation to the scenario',
        ],
      },
      {
        stepNumber: 4,
        title: 'Solve',
        guidance: 'Work through the calculation step by step.',
        hints: [
          'Show your work—don\'t just write the answer',
          'Use objects or drawings if needed',
          'Check each step as you go',
        ],
        expectedConcept: 'Calculation',
        commonMistakes: [
          'Arithmetic errors',
          'Rushing the calculation',
          'Not showing work to check',
        ],
      },
      {
        stepNumber: 5,
        title: 'Check Your Answer',
        guidance: 'Does your answer make sense in the story?',
        hints: [
          'Is the number reasonable?',
          'Can you explain what your answer means?',
          'Try solving it a different way to double-check',
        ],
        expectedConcept: 'Answer verification',
        commonMistakes: [
          'Not checking if answer is reasonable',
          'Accepting answers that don\'t fit the context',
          'Not knowing what the answer represents',
        ],
      },
    ],
    'reading-comprehension': [
      {
        stepNumber: 1,
        title: 'Read the Passage',
        guidance: 'Read the entire passage once. Don\'t worry if you don\'t understand everything.',
        hints: ['Read at a normal pace', 'Don\'t stop at unfamiliar words yet', 'Get the main idea'],
        expectedConcept: 'Initial comprehension',
        commonMistakes: ['Reading too fast', 'Stopping to worry about unknown words', 'Not reading the whole passage'],
      },
      {
        stepNumber: 2,
        title: 'Read the Question',
        guidance: 'Now read the question carefully. What is it asking?',
        hints: [
          'Underline the question',
          'What information do you need to find?',
          'Does it ask for a detail or the main idea?',
        ],
        expectedConcept: 'Question comprehension',
        commonMistakes: ['Misreading the question', 'Guessing without reading', 'Answering a different question'],
      },
      {
        stepNumber: 3,
        title: 'Find the Answer in the Passage',
        guidance: 'Read through the passage again. Where does it mention the answer?',
        hints: [
          'The answer is usually stated in the passage',
          'Look for words similar to the question',
          'Read the sentence before and after for context',
        ],
        expectedConcept: 'Text-based finding',
        commonMistakes: ['Making up answers', 'Answering from personal knowledge, not the text', 'Choosing wrong sentence'],
      },
      {
        stepNumber: 4,
        title: 'Answer in Your Own Words',
        guidance: 'Use the information you found. Write or say the answer.',
        hints: [
          'Use the exact words from the passage, OR',
          'Explain it in your own words',
          'Make sure your answer matches the question',
        ],
        expectedConcept: 'Answer formulation',
        commonMistakes: ['Copying without understanding', 'Not addressing the question', 'Making assumptions'],
      },
    ],
  };

  return stepsByType[problemType] || stepsByType['word-problem'];
}
