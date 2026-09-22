import { PolicyShell } from '@/components/trust/policy-shell';

export default function AiLimitationsPage() {
  return (
    <PolicyShell title="AI Limitations and Human Review" description="What SyncSenta AI can and cannot safely do.">
      <h2>AI-generated content is a draft</h2>
      <p>AI-generated lesson plans, schemes, quizzes, feedback, translations, summaries, and tutor responses may be wrong, biased, incomplete, outdated, or unsuitable for a particular learner. A teacher or authorised adult must review content before it is used or shared.</p>
      <h2>What the AI must not decide</h2>
      <p>SyncSenta AI must not independently make admissions, discipline, safeguarding, medical, disability, employment, financial, or high-impact learner decisions. It should support professional judgement, not replace it.</p>
      <h2>Curriculum boundaries</h2>
      <p>Grade 6 AI and blockchain content is introductory. Senior School content may be deeper, but safety, privacy, ethics, evidence, and teacher approval remain required. Generated alignment is not proof of official approval.</p>
      <h2>Teacher controls</h2>
      <p>Teachers should verify outcomes, examples, translations, sources, activities, assessment criteria, accessibility, and local suitability. Save the approved version separately from the original draft.</p>
    </PolicyShell>
  );
}
