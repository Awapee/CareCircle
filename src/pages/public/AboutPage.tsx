import { Link } from 'react-router';
import { InfoPageLayout } from '@/components/layout/InfoPageLayout';

export function AboutPage() {
  return (
    <InfoPageLayout
      title="About CareCircle"
      intro="CareCircle is a shared space for organising everyday care, built around the person receiving care and the people who support them."
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

      <h2>Why we’re different</h2>
      <p>
        Your phone can already remind you to do something. But a reminder only reaches one person, on one phone, and it
        disappears once it’s swiped away. Care involves several people, and what matters is whether it actually
        happened. That’s the gap CareCircle fills.
      </p>
      <ul>
        <li>
          <strong>Made for a group, not one phone.</strong> Everyone in the circle works from the same plan. When one
          person changes a time or takes on a task, everyone else sees it straight away.
        </li>
        <li>
          <strong>It records what happened.</strong> Each task is marked as done, taken, not taken or skipped, with who
          did it and when. Nobody has to call round asking “did Mum have her tablets?”
        </li>
        <li>
          <strong>It notices when something is missed.</strong> If nothing is recorded, the right people get a gentle
          follow-up so it doesn’t quietly slip through. A phone alarm can’t tell whether anyone acted on it.
        </li>
        <li>
          <strong>Each person sees what they should.</strong> A carer, a grandchild and a neighbour have different
          roles. Medication details stay private unless the circle chooses to share them.
        </li>
        <li>
          <strong>Updates stay with the care.</strong> Notes after a visit sit alongside the day’s plan, and others
          acknowledge them, so you know they were read. Nothing gets lost in a busy group chat.
        </li>
        <li>
          <strong>Built around the person receiving care.</strong> They can be part of their own circle, see who’s in
          it, and manage their own routine where they’re able to.
        </li>
      </ul>

      <h2>What we believe</h2>
      <ul>
        <li>
          <strong>The person receiving care comes first.</strong> They should be able to see who is in their circle and
          what is shared.
        </li>
        <li>
          <strong>Privacy by default.</strong> Members see what their role allows, not everything automatically.
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
        CareCircle is currently a student project in active development. The guided walkthrough uses sample people,
        routines and medication names, and anything simulated there (such as notifications) is labelled as such inside
        the app.
      </p>
    </InfoPageLayout>
  );
}
