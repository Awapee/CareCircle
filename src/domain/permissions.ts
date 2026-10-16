import type { Role } from './types';

/**
 * The permission matrix from docs/ARCHITECTURE.md §3. The UI uses it to hide actions a role
 * can't perform; the database enforces the same rules with row-level security.
 */
export type Action =
  | 'view_schedule'
  | 'view_medication'
  | 'edit_tasks'
  | 'record_outcome'
  | 'delete_tasks'
  | 'post_updates'
  | 'view_members'
  | 'manage_members'
  | 'edit_circle';

export interface PermissionContext {
  /** Circle setting: whether Family members may see medication details. */
  familyCanSeeMedication?: boolean;
  /** For `record_outcome`: whether the occurrence is assigned to the acting user. */
  assignedToMe?: boolean;
}

export function can(role: Role, action: Action, ctx: PermissionContext = {}): boolean {
  switch (action) {
    case 'view_schedule':
    case 'view_members':
      return true;
    case 'view_medication':
      if (role === 'family') return !!ctx.familyCanSeeMedication;
      return role !== 'read_only';
    case 'edit_tasks':
      return role === 'admin' || role === 'care_recipient' || role === 'caregiver';
    case 'record_outcome':
      if (role === 'family') return !!ctx.assignedToMe;
      return role === 'admin' || role === 'care_recipient' || role === 'caregiver';
    case 'delete_tasks':
      return role === 'admin' || role === 'care_recipient';
    case 'post_updates':
      return role !== 'read_only';
    case 'manage_members':
    case 'edit_circle':
      return role === 'admin';
  }
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Manages the circle, its members and all tasks.',
  care_recipient: 'The person receiving care. Can manage their own schedule.',
  caregiver: 'Creates and updates tasks and records what happened.',
  family: 'Sees the schedule, posts updates and records tasks assigned to them.',
  read_only: 'Can see the schedule and appointments, but not change anything.',
};
