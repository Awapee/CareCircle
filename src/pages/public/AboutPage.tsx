import { Link } from 'react-router';
import { InfoPageLayout } from '@/components/layout/InfoPageLayout';

export function AboutPage() {
  return (
    <InfoPageLayout
      title="About CareCircle"
      intro="CareCircle is a shared space for organising everyday care — built around the person receiving care and the people who support them."
    >
      <h2>Why CareCircle exists</h2>
      <p>
        Daily care is rarely one person’s job. A parent, partner, neighbour, sibling or paid caregiver may each help
        with part of the day. When the details are spread across phone calls, group chats and paper notes, things get
        missed and everyone spends extra time checking in.
      </p>
      <p>
        CareCircle gives the circle one shared, up-to-date plan: routines, medication reminders, meals, hydration and
        appointments, with a clear record of what has been done and by whom.
      </p>

      <h2>What we believe</h2>
      <ul>
        <li>
          <strong>The person receiving care comes first.</strong> They should be able to see who is in their circle and
          what is shared.
        </li>
        <li>
          <strong>Privacy by default.</strong> Members see what their role allows — not everything automatically.
        </li>
        <li>
          <strong>Calm, not alarming.</strong> An unconfirmed task prompts a gentle follow-up. It is not treated as an
          emergency.
        </li>
        <li>
          <strong>Honest about limits.</strong> CareCircle supports human care; it doesn’t replace it or professional
          medical advice. Read more on our <Link to="/limitations">appropriate use</Link> page.
        </li>
        <li>
          <strong>Easy for everyone.</strong> Large, readable text, clear labels and simple steps, so people who aren’t
          comfortable with technology can still take part.
        </li>
      </ul>

      <h2>Project status</h2>
      <p>
        CareCircle is currently a student project in active development. Demonstration content uses fictional people,
        routines and medication names. Features that are simulated — such as notifications in demo mode — are labelled
        as such inside the app.
      </p>
    </InfoPageLayout>
  );
}
