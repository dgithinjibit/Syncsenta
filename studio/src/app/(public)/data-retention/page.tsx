import { PolicyShell } from '@/components/trust/policy-shell';

export default function DataRetentionPage() {
  return (
    <PolicyShell title="Data Retention and Deletion" description="How SyncSenta plans to retain, export, and delete information.">
      <h2>1. Experimental rule</h2>
      <p>Use demo accounts and fictional data during the experiment. The production retention schedule is not yet active because provider contracts, school agreements, backup handling, and identity verification are still being finalised.</p>
      <h2>2. Planned retention categories</h2>
      <ul><li>Account and role records: retained while the account is active, then removed or anonymised according to the school agreement.</li><li>Teacher drafts and approved resources: retained for the school-selected teaching period and removed on an authorised request.</li><li>Student progress and quiz records: retained only for the educational purpose and period agreed with the school and parent/guardian.</li><li>Security and audit logs: retained for a limited security period and access-controlled.</li><li>Backups: deleted or overwritten on a documented schedule after the source record is removed.</li></ul>
      <h2>3. Requests</h2>
      <p>Schools and authorised parents should be able to request access, correction, export, restriction, or deletion. Requests and withdrawals must be verified, logged, completed within the published service window, and reflected in backups where technically possible.</p>
      <h2>4. School responsibility</h2>
      <p>Schools should decide which learners and records are necessary, assign authorised staff, review access, and notify SyncSenta when a learner changes class or school. SyncSenta should not retain information simply because it is technically convenient.</p>
    </PolicyShell>
  );
}
