import { PolicyShell } from '@/components/trust/policy-shell';

export default function PrivacyPage() {
  return (
    <PolicyShell title="Privacy Policy" description="How SyncSenta handles account, school, learner, and generated-content information during the experiment.">
      <h2>1. Experimental status</h2>
      <p>SyncSenta is an experimental education platform. Demo accounts are provided for evaluation and should use fictional information only. Do not enter real child records, medical information, passwords, payment details, or confidential school data in the experiment.</p>
      <h2>2. Information we may process</h2>
      <p>Depending on the feature, the experiment may process account details, selected role and grade, teacher-created curriculum content, generated lesson drafts, quiz attempts, messages, and technical logs needed to operate and secure the service.</p>
      <h2>3. How information is used</h2>
      <p>Information is used to provide the requested workspace, generate or revise educational drafts, save demo resources, troubleshoot failures, and improve the prototype. We do not use demo information to make admissions, disciplinary, medical, employment, or financial decisions.</p>
      <h2>4. Sharing and providers</h2>
      <p>Some features may use authentication, storage, database, analytics, or AI providers. A production release must publish the final provider list, processing purposes, locations, retention periods, and contractual safeguards before live minor data is enabled.</p>
      <h2>5. Rights and requests</h2>
      <p>Parents, learners, teachers, and schools should be able to request access, correction, export, restriction, or deletion of their information. During the experiment, contact Support to request removal of demo content; the production workflow and identity verification process are still being completed.</p>
      <h2>6. Contact</h2>
      <p>Use the <a href="/support">Support and safety contact page</a> for privacy questions, deletion requests, or suspected exposure of information.</p>
    </PolicyShell>
  );
}
