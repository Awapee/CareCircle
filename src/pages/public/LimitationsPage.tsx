import { InfoPageLayout } from '@/components/layout/InfoPageLayout';
import { Notice } from '@/components/ui/Notice';

export function LimitationsPage() {
  return (
    <InfoPageLayout
      title="Limitations & appropriate use"
      intro="CareCircle is designed to make everyday coordination easier. To use it safely, it helps to be clear about what it does not do."
    >
      <Notice tone="warning" title="In an emergency">
        Contact your local emergency number. CareCircle does not detect emergencies and does not contact emergency
        services.
      </Notice>

      <h2>Medication</h2>
      <ul>
        <li>
          CareCircle stores the medication name and instructions <strong>you</strong> enter. It doesn’t check them.
        </li>
        <li>It never recommends a dose, a change in dose, or what to do after a missed dose.</li>
        <li>“Marked as taken” means someone recorded it — not that the medicine was definitely taken.</li>
        <li>For any question about medication, ask a pharmacist, doctor or other qualified professional.</li>
      </ul>

      <h2>Unconfirmed tasks and follow-up</h2>
      <ul>
        <li>
          An unconfirmed task means nobody has recorded an outcome yet. Often it simply means someone forgot to tap
          “done”.
        </li>
        <li>An unconfirmed task is not evidence that something is wrong or that anyone is in danger.</li>
        <li>
          Follow-up notifications go to contacts you choose, using channels that have been set up. Delivery isn’t
          guaranteed, and CareCircle can’t confirm that a person has read a notification.
        </li>
      </ul>

      <h2>Meals, hydration and routines</h2>
      <p>
        Reminders follow the schedule you set. CareCircle doesn’t give nutrition or hydration advice or impose targets —
        those decisions belong to the person and the professionals supporting them.
      </p>

      <h2>Monitoring</h2>
      <p>
        CareCircle does not monitor anyone’s location, movement, health or physical condition, and doesn’t use sensors
        or cameras.
      </p>

      <h2>Prototype status</h2>
      <p>
        This version is a student prototype. Features shown as simulated — including notifications in demo mode — do not
        send real messages.
      </p>
    </InfoPageLayout>
  );
}
