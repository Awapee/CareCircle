import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Droplets,
  HeartHandshake,
  ListChecks,
  MessagesSquare,
  Pill,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { usePageTitle } from '@/lib/usePageTitle';

export function LandingPage() {
  usePageTitle(null);
  return (
    <>
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <FinalCta />
    </>
  );
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 to-canvas"
    >
      <Container className="grid grid-cols-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:py-24">
        <div>
          <Badge tone="brand" icon={<HeartHandshake className="size-3.5" aria-hidden="true" />}>
            One circle. Shared care.
          </Badge>
          <h1 id="hero-heading" className="mt-5 text-4xl font-semibold sm:text-5xl lg:text-[3.4rem]">
            Everyday care, made easier together.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            CareCircle brings daily routines, medication reminders, meals, appointments and updates into one calm,
            shared place, so the person receiving care and the people supporting them always know what’s planned, what’s
            done and what needs a second look.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              to="/get-started"
              size="lg"
              icon={<ArrowRight className="order-last size-5" aria-hidden="true" />}
            >
              Get Started
            </ButtonLink>
            <ButtonLink to="/#how-it-works" size="lg" variant="secondary">
              How It Works
            </ButtonLink>
          </div>
          <p className="mt-5 text-sm text-ink-subtle">A coordination tool, not a medical or emergency service.</p>
        </div>

        <ProductPreview />
      </Container>
    </section>
  );
}

const previewTasks = [
  {
    time: '08:00',
    title: 'Morning medication',
    meta: 'Recorded by Grace',
    icon: Pill,
    status: 'Completed',
    tone: 'success',
  },
  {
    time: '10:30',
    title: 'Glass of water',
    meta: 'Hydration reminder',
    icon: Droplets,
    status: 'Completed',
    tone: 'success',
  },
  { time: '12:30', title: 'Lunch', meta: 'Assigned to Daniel', icon: ListChecks, status: 'Upcoming', tone: 'info' },
  {
    time: '15:00',
    title: 'Physiotherapy session',
    meta: 'Community health centre',
    icon: CalendarClock,
    status: 'Upcoming',
    tone: 'info',
  },
] as const;

/** A static, decorative illustration of the product. Hidden from assistive tech, which gets a text summary instead. */
function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
      <p className="sr-only">
        Illustration: a sample “Today” schedule for a fictional person named Grace, showing two completed tasks and two
        upcoming ones, alongside a family update.
      </p>
      <div aria-hidden="true" className="relative">
        <div className="absolute -right-6 -top-6 hidden size-40 rounded-full bg-accent-100 sm:block" />
        <div className="absolute -bottom-8 -left-8 hidden size-48 rounded-full bg-brand-100/70 sm:block" />

        <Card padding="none" className="relative overflow-hidden shadow-raised">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Today · Grace’s circle</p>
              <p className="mt-0.5 font-semibold">2 of 4 done</p>
            </div>
            <div className="flex -space-x-2">
              {['G', 'D', 'A'].map((initial, i) => (
                <span
                  key={initial}
                  className={
                    'flex size-8 items-center justify-center rounded-full border-2 border-canvas text-xs font-semibold ' +
                    ['bg-accent-300 text-ink', 'bg-brand-200 text-brand-800', 'bg-info-50 text-info-700'][i]
                  }
                >
                  {initial}
                </span>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-line">
            {previewTasks.map((task) => (
              <li key={task.time} className="flex items-center gap-3 px-5 py-3.5">
                <span className="w-12 shrink-0 text-sm font-medium tabular-nums text-ink-muted">{task.time}</span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <task.icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug">{task.title}</span>
                  <span className="block text-sm leading-snug text-ink-subtle">{task.meta}</span>
                </span>
                <Badge tone={task.tone} className="shrink-0">
                  {task.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="relative -mt-4 ml-auto w-[85%] shadow-raised sm:-mr-6">
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-200 text-sm font-semibold text-brand-800">
              D
            </span>
            <div className="min-w-0 text-sm">
              <p>
                <span className="font-semibold">Daniel</span>{' '}
                <span className="text-ink-muted">shared an update · 09:12</span>
              </p>
              <p className="mt-1 text-ink-muted">“I’ll pick up groceries on the way over at lunch.”</p>
            </div>
          </div>
        </Card>
      </div>
      <figcaption className="mt-4 text-center text-xs text-ink-subtle">
        Illustrative preview with fictional data.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

function SectionIntro({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  id: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
      {children && <p className="mt-4 text-lg text-ink-muted">{children}</p>}
    </div>
  );
}

const problems = [
  {
    title: 'Details live in too many places',
    body: 'Appointment times in one chat, medication notes on the fridge, routines in someone’s head. It’s easy for something to slip.',
  },
  {
    title: '“Did anyone check?” becomes a daily question',
    body: 'Without a shared record, family members call and text just to find out whether something already happened.',
  },
  {
    title: 'One person carries the mental load',
    body: 'Coordination often falls to whoever is closest — and they rarely get a clear picture of who else can help.',
  },
];

function ProblemSection() {
  return (
    <section aria-labelledby="problem-heading" className="py-20 sm:py-24">
      <Container>
        <SectionIntro id="problem-heading" eyebrow="The challenge" title="Care is shared. The information often isn’t.">
          Supporting someone day to day usually involves several people. Keeping everyone in step shouldn’t take more
          effort than the care itself.
        </SectionIntro>
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {problems.map((p, i) => (
            <Card as="li" key={p.title} padding="lg">
              <span className="text-sm font-semibold tabular-nums text-accent-800">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-ink-muted">{p.body}</p>
            </Card>
          ))}
        </ul>
      </Container>
    </section>
  );
}

const features = [
  {
    icon: ClipboardList,
    title: 'Daily tasks & routines',
    body: 'Plan mornings, evenings, rest and personal care. Recurring routines repeat automatically and can be paused or skipped.',
  },
  {
    icon: Pill,
    title: 'Medication reminders',
    body: 'Record the instructions you’ve been given and when each reminder is due. Mark doses as taken, not taken or skipped.',
  },
  {
    icon: Droplets,
    title: 'Meals & hydration',
    body: 'Gentle reminders for meals and drinks, set to the schedule that suits the person — no one-size-fits-all targets.',
  },
  {
    icon: CalendarClock,
    title: 'Appointments',
    body: 'Keep times, places, meeting links and who’s going in one place, with clear upcoming, attended and rescheduled states.',
  },
  {
    icon: Users,
    title: 'A circle with clear roles',
    body: 'Invite family and caregivers with roles that control what they can see and change. Not everyone needs to see everything.',
  },
  {
    icon: BellRing,
    title: 'Updates & calm follow-up',
    body: 'A shared activity feed shows what changed and who changed it. If something stays unconfirmed, chosen contacts are notified.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="features-heading" className="bg-surface py-20 sm:py-24">
      <Container>
        <SectionIntro id="features-heading" eyebrow="Features" title="Everything the day needs, in one shared view">
          CareCircle focuses on the practical parts of daily care, and keeps them simple enough for everyone in the
          circle to use.
        </SectionIntro>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card as="li" key={f.title} padding="lg">
              <span
                className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
                aria-hidden="true"
              >
                <f.icon className="size-[22px]" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-ink-muted">{f.body}</p>
            </Card>
          ))}
        </ul>
      </Container>
    </section>
  );
}

const steps = [
  {
    title: 'Create your circle',
    body: 'Set up a circle around the person receiving care, then invite family members and caregivers with the right role for each.',
  },
  {
    title: 'Plan the day together',
    body: 'Add routines, medication reminders, meals and appointments. Assign tasks to the people who will help with them.',
  },
  {
    title: 'Stay in step',
    body: 'Mark tasks as done, share short updates and see what’s happened at a glance — without a string of check-in calls.',
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="py-20 sm:py-24">
      <Container>
        <SectionIntro id="how-heading" eyebrow="How it works" title="Three steps to a calmer routine" />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-[var(--radius-card)] border border-line bg-canvas p-6 sm:p-7"
            >
              <span
                className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-base font-semibold text-white"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

const benefits = [
  'Everyone sees the same, up-to-date plan for the day.',
  'Responsibilities are clear: each task can have an assigned person.',
  'Fewer “did anyone…?” messages, because completed tasks are recorded.',
  'The person receiving care stays involved and can see who is in their circle.',
  'Unconfirmed tasks lead to a gentle follow-up, not alarm.',
];

const boundaries = [
  {
    title: 'Not medical advice',
    body: 'CareCircle never suggests, changes or doses medication. It records the instructions you enter.',
  },
  {
    title: 'Records, not proof',
    body: 'A task marked as done is what someone recorded — not independent confirmation.',
  },
  {
    title: 'Not an emergency service',
    body: 'An unconfirmed task doesn’t mean someone is in danger, and alerts aren’t guaranteed to arrive.',
  },
  {
    title: 'Private by role',
    body: 'Members only see what their role allows. Sensitive details can be limited to carers.',
  },
];

function BenefitsSection() {
  return (
    <section aria-labelledby="benefits-heading" className="bg-surface py-20 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Why it helps</p>
          <h2 id="benefits-heading" className="mt-3 text-3xl font-semibold sm:text-4xl">
            Shared coordination, without the extra effort
          </h2>
          <ul className="mt-8 space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex gap-3">
                <CircleCheck className="mt-0.5 size-6 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="text-lg text-ink">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <Card padding="lg" as="section" aria-labelledby="boundaries-heading" className="self-start">
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-xl bg-accent-100 text-accent-800"
              aria-hidden="true"
            >
              <ShieldCheck className="size-5" />
            </span>
            <h3 id="boundaries-heading" className="text-lg font-semibold">
              Designed with clear boundaries
            </h3>
          </div>
          <dl className="mt-6 space-y-5">
            {boundaries.map((b) => (
              <div key={b.title}>
                <dt className="font-semibold">{b.title}</dt>
                <dd className="mt-1 text-ink-muted">{b.body}</dd>
              </div>
            ))}
          </dl>
          <ButtonLink to="/limitations" variant="secondary" size="sm" className="mt-6">
            Read about appropriate use
          </ButtonLink>
        </Card>
      </Container>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="py-20 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-brand-700 px-6 py-14 text-center sm:px-12">
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-brand-600" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-brand-800/60" aria-hidden="true" />
          <div className="relative">
            <MessagesSquare className="mx-auto size-10 text-accent-300" aria-hidden="true" />
            <h2 id="cta-heading" className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Bring your circle together
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
              Start with a single routine and grow from there. You can explore everything with fictional demo data
              first.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink to="/get-started" size="lg" variant="inverse">
                Get Started
              </ButtonLink>
              <ButtonLink to="/#how-it-works" size="lg" variant="inverseOutline">
                How It Works
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
