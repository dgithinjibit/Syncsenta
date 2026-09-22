import { PolicyShell } from '@/components/trust/policy-shell';

export default function SchoolControlsPage() {
  return (
    <PolicyShell title="School Administration Controls" description="The controls planned for school-managed accounts and safe classroom deployment.">
      <h2>Required controls</h2>
      <ul><li>Invite and remove staff with verified school membership.</li><li>Assign teacher, school-head, parent, and student roles server-side.</li><li>Manage classes, learner membership, curriculum permissions, and approved resources.</li><li>Review parental-consent status before enabling child features or voice.</li><li>Export, correct, restrict, and delete school-owned records.</li><li>Review audit logs, revoke sessions, suspend accounts, and escalate safeguarding reports.</li></ul>
      <h2>Experimental status</h2>
      <p>Demo role selection is available for evaluation. It must not be used as authorization for real school or learner data. Production deployment requires server-side checks on every resource and a school agreement defining responsibilities.</p>
    </PolicyShell>
  );
}
