import { PolicyShell } from '@/components/trust/policy-shell';

const feedbackUrl = 'https://forms.gle/3vQhgtJbnEaGD6xV8';

export default function SupportPage() {
  return (
    <PolicyShell title="Support, Privacy, and Safety" description="How to request help, report a concern, or ask about your information.">
      <h2>Choose the right request</h2>
      <ul>
        <li><strong>Product support:</strong> report a page, generation, login, or export problem.</li>
        <li><strong>Privacy request:</strong> ask for access, correction, export, restriction, or deletion.</li>
        <li><strong>School administration:</strong> ask about school membership, roles, class access, or account suspension.</li>
        <li><strong>Safety report:</strong> report harmful, sexual, threatening, discriminatory, exploitative, or privacy-invasive content.</li>
      </ul>
      <h2>How to submit a request</h2>
      <p>Use the configured <a href={feedbackUrl} target="_blank" rel="noopener noreferrer">SyncSenta support and feedback form</a>. Choose the request category and include the page, demo role, approximate time, and a short description. Do not include a child&apos;s full name, password, address, contact details, or other sensitive information.</p>
      <h2>Response and escalation</h2>
      <p>During the experiment, requests are reviewed during active project support hours. A production release must publish a response target, named support owner, safeguarding escalation path, service-status channel, and a verified method for urgent child-safety concerns. The feedback form is not an emergency service.</p>
      <h2>Privacy and deletion requests</h2>
      <p>Use the request category that matches your need. We may need to verify authority before releasing or deleting information. Until the production workflow is enabled, use demo accounts and fictional data only; do not submit real learner records through the form.</p>
      <h2>Current experiment status</h2>
      <p>Demo accounts are available for evaluation. Live minor data, school production records, and public outcome claims are not enabled by this page.</p>
    </PolicyShell>
  );
}
