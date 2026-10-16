import { InfoPageLayout } from '@/components/layout/InfoPageLayout';

export function PrivacyPage() {
  return (
    <InfoPageLayout title="Privacy Policy" provisional updated="16 October 2026">
      <p>
        This draft explains, in plain language, what information CareCircle handles and how it is protected. It
        describes how the application is designed; it is not a legal guarantee.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address, display name and a securely hashed password (handled by
          our authentication provider — we never see or store your password in readable form).
        </li>
        <li>
          <strong>Care information you enter:</strong> care circles, tasks, routines, medication reminder text,
          appointments, notes and updates.
        </li>
        <li>
          <strong>Activity records:</strong> who created, changed or completed something and when, so the circle has an
          accurate history.
        </li>
        <li>
          <strong>Preferences:</strong> reminder settings, quiet hours and display preferences.
        </li>
      </ul>
      <p>
        We ask only for what the app needs. You don’t need to enter diagnoses or detailed medical history to use
        CareCircle.
      </p>

      <h2>Who can see your information</h2>
      <p>
        Care information is visible only to members of the circle it belongs to, and only to the extent their role
        allows. For example, read-only members cannot change anything, and medication details can be restricted to
        carers. These rules are enforced by the database itself, not just by the interface.
      </p>

      <h2>Demo mode</h2>
      <p>
        In demo mode, all data is fictional and is stored only in your own browser. Nothing is sent to a server.
        Clearing your browser data or using “Reset demo” removes it.
      </p>

      <h2>What we don’t do</h2>
      <ul>
        <li>We don’t sell your information.</li>
        <li>We don’t show advertising or use advertising trackers.</li>
        <li>We don’t use your care information to make medical recommendations.</li>
      </ul>

      <h2>Cookies and local storage</h2>
      <p>
        CareCircle uses browser storage to keep you signed in and to remember display preferences. It does not use
        third-party analytics or advertising cookies.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can update your profile and preferences at any time in Settings.</li>
        <li>You can leave a care circle, or ask its administrator to remove you.</li>
        <li>Data export and account deletion will be available from Settings when the feature is released.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        Activity records are kept so circles have a reliable history. When an account is deleted, personal profile data
        is removed; records that other circle members rely on may be kept in anonymised form. Exact retention periods
        will be defined before public launch.
      </p>
    </InfoPageLayout>
  );
}
