import { PolicyShell } from '@/components/trust/policy-shell';

export default function ChildSafetyPage() {
  return (
    <PolicyShell title="Child Safety Policy" description="Safeguards for learners, families, teachers, and schools using the SyncSenta experiment.">
      <h2>1. Adult supervision</h2>
      <p>SyncSenta is designed for teacher- and school-guided use. Learners should use classroom, school, or parent-approved sessions. AI outputs are not a replacement for a teacher, parent, counsellor, or emergency service.</p>
      <h2>2. Safe learning boundaries</h2>
      <p>Grade 6 AI and blockchain learning is introductory. Senior School work may be deeper but remains supervised. Learners must not be asked to share passwords, precise location, private photographs, financial credentials, wallet keys, or confidential school records.</p>
      <h2>3. Reporting and escalation</h2>
      <p>Adults should report harmful, sexual, threatening, discriminatory, exploitative, or privacy-invasive content through <a href="/support">Support</a>. A production release must provide a monitored safeguarding channel, response targets, evidence preservation, human review, and escalation to the responsible school or safeguarding authority.</p>
      <h2>4. Voice and communication</h2>
      <p>Voice features require adult and school approval, a text fallback, clear recording status, and a way to stop or delete a session. The experiment should use fictional or non-sensitive content only.</p>
      <h2>5. No public claims yet</h2>
      <p>Student outcome claims, testimonials, and case studies must be permissioned and anonymised. No live minor data should be used until the privacy, consent, security, and safeguarding review is complete.</p>
    </PolicyShell>
  );
}
