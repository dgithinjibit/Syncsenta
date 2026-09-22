export type SocraticGuidanceStage = 'orient' | 'probe' | 'hint' | 'reflect' | 'mastery';

type GuidanceInput = {
  currentMessage: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
};

const questionStems: Record<SocraticGuidanceStage, string[]> = {
  orient: [
    'What do you already notice?',
    'Which part feels familiar, and which part feels new?',
  ],
  probe: [
    'What evidence supports your idea?',
    'What would you expect to happen next, and why?',
  ],
  hint: [
    'Which smaller example could help you test that idea?',
    'What changes if we look at one step at a time?',
  ],
  reflect: [
    'Can you explain the rule in your own words?',
    'What mistake would be easy to make here, and how could you check it?',
  ],
  mastery: [
    'Can you apply the same idea to a new example?',
    'How would you teach this idea to a classmate?',
  ],
};

function getStage({ currentMessage, history = [] }: GuidanceInput): SocraticGuidanceStage {
  const text = currentMessage.toLowerCase();
  const recentTurns = history.filter((turn) => turn.role === 'user').slice(-3);

  if (recentTurns.length >= 2 && /(wrong|stuck|don't know|dont know|confused|help)/i.test(text)) {
    return 'hint';
  }
  if (recentTurns.length >= 3) return 'mastery';
  if (recentTurns.length >= 1) return 'probe';
  if (text.length < 18 || /^(what is|define|meaning of)/i.test(text)) return 'orient';
  return 'reflect';
}

/**
 * Prompt contract for a bounded, activity-first tutor turn.
 * The tutor should guide the learner toward an answer instead of replacing
 * the learner's thinking with a long answer dump.
 */
export function buildSocraticGuidancePrompt(input: GuidanceInput): string {
  const stage = getStage(input);
  const stems = questionStems[stage];

  return `# SOCRATIC GUIDANCE (Synthesis-inspired, curriculum-controlled)
Current guidance stage: ${stage}.
Use a warm, patient, encouraging tone. Treat mistakes as useful evidence, not failure.
Ask at most one meaningful question per turn, then wait for the learner's response.
Prefer a short concrete or Kenyan-context example, visual description, sorting task, or small experiment before abstract explanation.
Do not reveal the final answer immediately unless the learner has tried the available scaffold or explicitly asks for a worked example.
If the learner is unsure, use a progressive hint ladder: prompt noticing, isolate one step, name the likely misconception without shame, show a simple representation, then model one example.
After a correct response, briefly celebrate the effort and ask for transfer to a new example or an explanation in the learner's own words.
Keep the next action small enough to complete in one turn. Avoid pretending to know a learner's feelings or claiming mastery without evidence.
Suggested question stems (choose or adapt one): ${stems.join(' | ')}.`;
}

export function getSocraticGuidanceStage(input: GuidanceInput): SocraticGuidanceStage {
  return getStage(input);
}
