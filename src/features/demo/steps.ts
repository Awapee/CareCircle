import type { Role } from '@/domain/types';

export interface GuideNames {
  /** The person the circle is for. */
  recipient: string;
  circle: string;
  you: string;
  viewer: string;
}

export interface GuideStep {
  /** Page inside the demo app this step explains. */
  route: string;
  /** Whose eyes the step shows the app through (defaults to the visitor, the admin). */
  viewAs?: Role;
  title: (n: GuideNames) => string;
  body: (n: GuideNames) => string;
  /** Something to try on this page. */
  tryIt?: (n: GuideNames) => string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    route: '/app',
    title: () => 'One place for the whole day',
    body: (n) =>
      `This is ${n.recipient}’s day in one place: what’s done, what’s coming up, and anything that needs a look.`,
    tryIt: () => 'Mark a task as done and watch the counts change.',
  },
  {
    route: '/app/planner',
    title: () => 'Plan the week',
    body: () => 'Every task, meal and visit on one calendar. Tasks can repeat and be given to whoever is helping.',
    tryIt: () => 'Press “New task” to add something for this week.',
  },
  {
    route: '/app/medication',
    title: () => 'Medication reminders',
    body: (n) =>
      `Each dose is recorded as taken or not taken, so nobody has to ask whether ${n.recipient} had their tablets. Medication details stay hidden from family unless you allow it.`,
  },
  {
    route: '/app/appointments',
    title: () => 'Appointments',
    body: (n) =>
      `Doctor visits and video calls, with where to go, who it’s with, and who is going with ${n.recipient}.`,
  },
  {
    route: '/app/routines',
    title: () => 'Meals & routines',
    body: () => 'Meals, water and daily habits that keep the day steady, with notes on what works.',
  },
  {
    route: '/app/activity',
    title: () => 'Updates for everyone',
    body: () => 'Share a quick note after a visit. Others acknowledge it, so you know it was read.',
    tryIt: () => 'Write an update and post it.',
  },
  {
    route: '/app/notifications',
    title: () => 'Reminders & follow-ups',
    body: () =>
      'Helpers get a reminder before each task. If something is missed, the right people get a follow-up so it doesn’t slip.',
  },
  {
    route: '/app/circle',
    title: (n) => `Who’s in ${n.circle}`,
    body: () =>
      'Invite family, carers and friends. Each person’s role decides what they can see and do, from running the circle to just viewing.',
  },
  {
    route: '/app',
    viewAs: 'read_only',
    title: () => 'See it through someone else’s eyes',
    body: (n) =>
      `You’re now viewing as ${n.viewer}, a neighbour with view-only access. They can follow the day but can’t change anything.`,
    tryIt: () => 'Use “View as” at the top to switch between people at any time.',
  },
  {
    route: '/app',
    title: () => 'That’s CareCircle',
    body: (n) =>
      `You’re back as ${n.you}. Keep exploring ${n.circle}, or create an account to set up a real circle for the people you care for.`,
  },
];
