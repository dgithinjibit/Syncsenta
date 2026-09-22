import { PolicyShell } from '@/components/trust/policy-shell';

export default function DataOwnershipPage() {
  return (
    <PolicyShell title="Student Progress Data Ownership" description="The intended responsibilities for learning records, reports, and generated resources.">
      <h2>School-controlled educational records</h2>
      <p>Schools should control the educational records they create or commission, subject to applicable law and their agreements with families. SyncSenta should process those records only to provide the agreed service.</p>
      <h2>Parent and learner access</h2>
      <p>Authorised parents and learners should be able to view appropriate progress information. Parents should be able to request correction, export, restriction, or deletion through the school or the verified support process.</p>
      <h2>Teacher-created resources</h2>
      <p>Teacher and school resources should remain distinguishable from AI-generated drafts. The product should preserve authorship, approval status, revision history, and the curriculum source used to create a resource.</p>
      <h2>Change of school or closure</h2>
      <p>A production system must document what happens when a learner changes school, a parent withdraws consent, a teacher leaves, or an account is closed. No progress record should be silently transferred or kept indefinitely.</p>
    </PolicyShell>
  );
}
