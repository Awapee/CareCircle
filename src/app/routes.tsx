import type { RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PlaceholderPage } from '@/pages/app/PlaceholderPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { GetStartedPage } from '@/pages/public/GetStartedPage';
import { LandingPage } from '@/pages/public/LandingPage';
import { LimitationsPage } from '@/pages/public/LimitationsPage';
import { PrivacyPage } from '@/pages/public/PrivacyPage';
import { TermsPage } from '@/pages/public/TermsPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

/** Route table. Kept separate from the router instance so tests can mount it in a memory router. */
export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'get-started', element: <GetStartedPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'limitations', element: <LimitationsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'app',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: (
          <PlaceholderPage
            title="Dashboard"
            description="Your day at a glance."
            milestone="Milestone 4"
            planned={[
              'A personal greeting and today’s date',
              'Scheduled, completed, upcoming and needs-review counts from real task data',
              'Today’s tasks in time order, upcoming appointments and recent activity',
            ]}
          />
        ),
      },
      {
        path: 'planner',
        element: (
          <PlaceholderPage
            title="Planner"
            description="Plan and manage tasks, routines and appointments."
            milestone="Milestone 4"
            planned={[
              'Day, week and list views with date navigation',
              'Filters by category, status and assigned person',
              'Create, edit, complete, skip, cancel and delete tasks — including recurring ones',
            ]}
          />
        ),
      },
      {
        path: 'circle',
        element: (
          <PlaceholderPage
            title="My Care Circle"
            description="The people sharing care, and what each of them can see and do."
            milestone="Milestone 6"
            planned={['Members and their roles', 'Secure invitations', 'Permission and circle settings']}
          />
        ),
      },
      {
        path: 'activity',
        element: (
          <PlaceholderPage
            title="Activity"
            description="A shared history of what happened and who did it."
            milestone="Milestone 6"
            planned={[
              'Task completions and schedule changes',
              'Care updates and acknowledgements',
              'Filtering by type and person',
            ]}
          />
        ),
      },
      {
        path: 'notifications',
        element: (
          <PlaceholderPage
            title="Notifications"
            description="Reminders, follow-ups and updates from your circle."
            milestone="Milestone 7"
            planned={['Read and unread notifications', 'Links to the related task', 'Follow-up for unconfirmed tasks']}
          />
        ),
      },
      {
        path: 'settings',
        element: (
          <PlaceholderPage
            title="Settings"
            description="Your profile, reminders, privacy and accessibility preferences."
            milestone="Milestone 8"
            planned={[
              'Profile and account security',
              'Reminder preferences and quiet hours',
              'Data export and account deletion',
            ]}
          />
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
