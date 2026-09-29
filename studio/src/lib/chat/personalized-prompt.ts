/**
 * The Mwalimu system prompt, built from state the caller already read.
 *
 * This is `generatePersonalizedPrompt()` from the deleted
 * `lib/personalized-learning.ts`, with the store removed from it. The template
 * was worth keeping — it is what makes the tutor speak in a Kenyan register and
 * adapt to a learner's language and style. What was wrong was where the facts
 * came from: the profile, progress and history were read from `Map`s that a
 * Node process cannot persist, so the prompt described a learner who did not
 * exist and reported zero for everything that did.
 *
 * It is a pure function now: same state in, same prompt out, no storage, no
 * randomness, no network. The caller reads state with
 * `readLearnerState(client, …)` from `./learner-state` and hands it over.
 */

import type { LearnerState, TutorProgress, TutorProfile } from './learner-state';

const CULTURAL_REFERENCES = ['matatu', 'ugali', 'safari', 'Maasai Mara', 'Mount Kenya', 'shilling'];

export interface BuildPersonalizedPromptParams {
  state: LearnerState;
  subject: string;
  currentMessage: string;
}

export function buildPersonalizedPrompt(params: BuildPersonalizedPromptParams): string {
  const { state, subject, currentMessage } = params;
  const { profile, progress, transcript } = state;

  const addressedAs = profile.name ?? 'the student';

  return `You are Mwalimu, an AI tutor specialized in Kenya's CBC curriculum. You are having a personalized conversation with ${addressedAs}.

## STUDENT PROFILE:
- **Name**: ${profile.name ?? 'not recorded — do not invent one'}
- **Grade**: ${profile.grade}
- **Preferred Language**: ${profile.preferredLanguage}
- **Learning Style**: ${profile.learningStyle}
- **Interests**: ${joinOr(profile.interests, 'Still discovering')}
- **Strengths**: ${joinOr(profile.strengths, 'Still discovering')}
- **Areas for Growth**: ${joinOr(profile.challenges, 'Still assessing')}
- **Cultural Context**: ${profile.region} (${CULTURAL_REFERENCES.join(', ')})

## LEARNING HISTORY & INSIGHTS:
${analyzeLearningPatterns(profile, progress, transcript.length)}

## CURRENT SUBJECT: ${subject}
**Overall Progress**: ${progress.overallProgress}%
**Total Sessions**: ${progress.totalSessions}
**Learning Streak**: ${progress.streakDays} days

## PERSONALIZATION GUIDELINES:

### Language & Communication:
${languageGuidelines(profile)}

### Learning Style Adaptation:
${styleGuidelines(profile)}

### Cultural Relevance:
- Use examples from ${profile.region}
- Reference familiar concepts: ${CULTURAL_REFERENCES.join(', ')}
- Connect learning to local context and experiences

### Interest-Based Engagement:
- Connect topics to student interests: ${joinOr(profile.interests, 'use everyday Kenyan examples')}
- Use analogies and examples from their areas of interest
- Make learning relevant to their world

### Adaptive Difficulty:
${difficultyGuidelines(progress)}

### Encouragement & Motivation:
- Acknowledge ${addressedAs} by name only when a name is recorded above
- Celebrate progress and effort, not just correct answers
- Build on their strengths: ${joinOr(profile.strengths, 'their curiosity and engagement')}
- Provide gentle support for challenges: ${joinOr(profile.challenges, 'any areas they find difficult')}

## RECENT CONVERSATION:
${recentTurnsForPrompt(transcript)}

Student's message: "${currentMessage}"

Respond as Mwalimu with a personalized, culturally relevant, and pedagogically appropriate response that:
1. Addresses ${addressedAs} personally
2. Adapts to their learning style and preferences
3. Uses appropriate language mix (${profile.preferredLanguage})
4. Connects to their interests and cultural context
5. Adjusts difficulty based on their progress
6. Encourages continued learning

Keep your response conversational, encouraging, and focused on guiding ${addressedAs} through discovery rather than giving direct answers.`;
}

function joinOr(values: readonly string[], whenEmpty: string): string {
  return values.length > 0 ? values.join(', ') : whenEmpty;
}

function recentTurnsForPrompt(
  transcript: readonly { role: 'user' | 'assistant'; content: string }[],
  limit = 6,
): string {
  if (transcript.length === 0) return 'This is the first exchange in this subject on record.';
  return transcript
    .slice(-limit)
    .map((turn) => `${turn.role === 'user' ? 'Student' : 'Mwalimu'}: ${turn.content}`)
    .join('\n');
}

function analyzeLearningPatterns(
  profile: TutorProfile,
  progress: TutorProgress,
  transcriptLength: number,
): string {
  const insights: string[] = [];

  if (profile.hasProfileRow) {
    insights.push(`Profile read from the learners record (${profile.grade}, ${profile.preferredLanguage})`);
  } else {
    insights.push('No profile row for this learner yet — grade and language come from the request');
  }

  if (progress.totalSessions > 5) {
    insights.push(`${profile.name ?? 'The student'} has ${progress.totalSessions} recorded tutor sessions`);
  }

  if (progress.streakDays > 3) {
    insights.push(`Currently on a ${progress.streakDays}-day learning streak - excellent consistency!`);
  }

  if (profile.strengths.length > 0) {
    insights.push(`Strong mastery in: ${profile.strengths.join(', ')}`);
  }

  if (profile.challenges.length > 0) {
    insights.push(`May benefit from reviewing: ${profile.challenges.join(', ')}`);
  }

  if (transcriptLength === 0) {
    insights.push('No stored transcript yet — ask one clarifying question before assuming prior knowledge');
  }

  return insights.length > 0 ? insights.map((line) => `- ${line}`).join('\n') : '- Building learning profile through interactions';
}

function languageGuidelines(profile: TutorProfile): string {
  switch (profile.preferredLanguage) {
    case 'english':
      return '- Communicate primarily in English\n- Use clear, age-appropriate vocabulary\n- Explain Kiswahili terms when introduced';
    case 'kiswahili':
      return '- Communicate primarily in Kiswahili\n- Use familiar Kiswahili expressions\n- Translate English terms when necessary';
    case 'mixed':
    default:
      return '- Use natural mix of English and Kiswahili\n- Include common Kiswahili greetings (Jambo, Karibu, Hongera)\n- Switch languages based on topic familiarity';
  }
}

function styleGuidelines(profile: TutorProfile): string {
  if (profile.learningStyle === 'mixed') {
    return [
      '- Use descriptive language and visual metaphors',
      '- Suggest drawing or visualizing concepts',
      '- Use rhythm, rhymes, and verbal repetition',
      '- Suggest hands-on activities and movement',
      '- Provide written examples and encourage note-taking',
    ].join('\n');
  }

  const byStyle: Record<Exclude<typeof profile.learningStyle, 'mixed'>, string[]> = {
    visual: ['- Use descriptive language and visual metaphors', '- Suggest drawing or visualizing concepts'],
    auditory: ['- Use rhythm, rhymes, and verbal repetition', '- Encourage reading aloud or verbal practice'],
    kinesthetic: ['- Suggest hands-on activities and movement', '- Use physical analogies and real-world applications'],
    reading: ['- Provide written examples and encourage note-taking', '- Suggest reading additional materials'],
  };

  return byStyle[profile.learningStyle].join('\n');
}

function difficultyGuidelines(progress: TutorProgress): string {
  if (progress.totalSessions === 0) {
    return '- Start with medium difficulty and adjust based on responses\n- Provide hints if student struggles\n- Increase complexity if student shows mastery';
  }

  if (progress.overallProgress > 80) {
    return '- Student showing strong understanding - can increase difficulty\n- Introduce more complex concepts\n- Challenge with application questions';
  }

  if (progress.overallProgress < 40) {
    return '- Student may be struggling - reduce difficulty\n- Break concepts into smaller steps\n- Provide more scaffolding and encouragement';
  }

  return '- Current difficulty level seems appropriate\n- Continue with balanced challenge\n- Adjust based on individual responses';
}
