import { Link } from 'react-router';
import { InfoPageLayout } from '@/components/layout/InfoPageLayout';

export function TermsPage() {
  return (
    <InfoPageLayout title="Terms of Use" provisional updated="16 October 2026">
      <h2>1. What CareCircle is</h2>
      <p>
        CareCircle is a coordination tool for organising daily routines, reminders and appointments and sharing updates
        within a care circle. It is provided as a prototype and may change, contain errors or be unavailable at times.
      </p>

      <h2>2. What CareCircle is not</h2>
      <ul>
        <li>It is not a medical device and does not diagnose, treat or monitor any condition.</li>
        <li>It does not prescribe, recommend or adjust medication.</li>
        <li>It is not an emergency or alarm service and must not be relied upon in an emergency.</li>
        <li>It does not replace professional healthcare or human caregiving.</li>
      </ul>
      <p>
        See <Link to="/limitations">Limitations &amp; appropriate use</Link> for more detail.
      </p>

      <h2>3. Your responsibilities</h2>
      <ul>
        <li>Keep your sign-in details private and tell a circle administrator if you think your account is misused.</li>
        <li>Only invite people the person receiving care would want in their circle.</li>
        <li>Enter medication instructions exactly as given by a qualified professional or the product label.</li>
        <li>Don’t use CareCircle to store information you have no right to share.</li>
      </ul>

      <h2>4. Records in CareCircle</h2>
      <p>
        A task marked as completed, or a medication marked as taken, is a record entered by a person. It is not
        independent proof that the activity took place.
      </p>

      <h2>5. Notifications</h2>
      <p>
        Reminders and follow-up notifications are provided on a best-effort basis. Delivery can fail or be delayed, and
        we cannot guarantee that a notification is seen.
      </p>

      <h2>6. Changes</h2>
      <p>These terms will be finalised before any public launch, and material changes will be communicated to users.</p>
    </InfoPageLayout>
  );
}
