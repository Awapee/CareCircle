import type { RouteObject } from 'react-router';
import { RequireSession, CircleGate } from '@/app/session';
import { AppShell } from '@/components/layout/AppShell';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ActivityPage } from '@/pages/app/ActivityPage';
import { AppointmentsPage } from '@/pages/app/AppointmentsPage';
import { CirclePage } from '@/pages/app/CirclePage';
import { DashboardPage } from '@/pages/app/DashboardPage';
import { MedicationPage } from '@/pages/app/MedicationPage';
import { NotificationsPage } from '@/pages/app/NotificationsPage';
import { PlannerPage } from '@/pages/app/PlannerPage';
import { RoutinesPage } from '@/pages/app/RoutinesPage';
import { SettingsPage } from '@/pages/app/SettingsPage';
import { InvitePage } from '@/pages/auth/InvitePage';
import { SignInPage, SignUpPage } from '@/pages/auth/SignInPage';
import { WelcomePage } from '@/pages/auth/WelcomePage';
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
      { path: 'sign-in', element: <SignInPage /> },
      { path: 'sign-up', element: <SignUpPage /> },
      { path: 'invite/:token', element: <InvitePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'welcome',
    errorElement: <RouteErrorPage />,
    element: (
      <RequireSession>
        <WelcomePage />
      </RequireSession>
    ),
  },
  {
    path: 'app',
    element: (
      <RequireSession>
        <CircleGate>
          <AppShell />
        </CircleGate>
      </RequireSession>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'planner', element: <PlannerPage /> },
      { path: 'medication', element: <MedicationPage /> },
      { path: 'appointments', element: <AppointmentsPage /> },
      { path: 'routines', element: <RoutinesPage /> },
      { path: 'circle', element: <CirclePage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
