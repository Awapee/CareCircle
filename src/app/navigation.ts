import {
  Activity,
  Bell,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  Pill,
  Settings,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface AppNavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar (limited to the most-used destinations). */
  primary: boolean;
}

/** Single source of truth for in-app navigation, shared by the sidebar, mobile menu and bottom bar. */
export const appNavItems: AppNavItem[] = [
  { to: '/app', label: 'Dashboard', shortLabel: 'Today', icon: LayoutDashboard, primary: true },
  { to: '/app/planner', label: 'Planner', shortLabel: 'Planner', icon: CalendarDays, primary: true },
  { to: '/app/medication', label: 'Medication', shortLabel: 'Medication', icon: Pill, primary: false },
  { to: '/app/appointments', label: 'Appointments', shortLabel: 'Appts', icon: CalendarClock, primary: false },
  { to: '/app/routines', label: 'Meals & routines', shortLabel: 'Routines', icon: Sun, primary: false },
  { to: '/app/circle', label: 'My Care Circle', shortLabel: 'Circle', icon: Users, primary: true },
  { to: '/app/activity', label: 'Activity & updates', shortLabel: 'Activity', icon: Activity, primary: true },
  { to: '/app/notifications', label: 'Notifications', shortLabel: 'Alerts', icon: Bell, primary: false },
  { to: '/app/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, primary: false },
];
