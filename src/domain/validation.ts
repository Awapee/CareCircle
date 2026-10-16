import { z } from 'zod';
import { isValidTimeZone } from './dates';
import { CATEGORIES, ROLES } from './types';

/**
 * Validation schemas shared by forms and both backends. Limits mirror the CHECK constraints
 * in supabase/migrations/0001_schema.sql.
 */

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 08:30');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');
const timeZone = z.string().refine(isValidTimeZone, 'Choose a valid time zone');

export const LIMITS = {
  title: 120,
  notes: 1000,
  displayName: 80,
  circleName: 80,
  updateBody: 1000,
  medicationName: 120,
  instructions: 500,
  location: 200,
  link: 500,
  professional: 120,
  occurrenceNote: 500,
} as const;

export const recurrenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('once') }),
  z.object({ kind: z.literal('daily') }),
  z.object({
    kind: z.literal('weekly'),
    days: z
      .array(
        z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
      )
      .min(1, 'Choose at least one day'),
  }),
  z.object({ kind: z.literal('interval'), everyDays: z.number().int().min(2, 'At least 2').max(90, 'At most 90') }),
]);

export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title').max(LIMITS.title),
    category: z.enum(CATEGORIES),
    notes: z.string().max(LIMITS.notes),
    recurrence: recurrenceSchema,
    times: z.array(time).min(1, 'Add at least one time').max(8, 'At most 8 times a day'),
    startDate: date,
    endDate: date.nullable(),
    assigneeId: z.string().nullable(),
    followUpMinutes: z.number().int().min(5, 'At least 5 minutes').max(1440, 'At most 24 hours'),
    reminderMinutesBefore: z.number().int().min(0).max(1440).nullable(),
    medication: z
      .object({
        name: z.string().trim().min(1, 'Enter the medication name').max(LIMITS.medicationName),
        instructions: z.string().max(LIMITS.instructions),
      })
      .nullable(),
    appointment: z
      .object({
        location: z.string().max(LIMITS.location),
        meetingLink: z
          .string()
          .max(LIMITS.link)
          .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Use a full https:// link'),
        professional: z.string().max(LIMITS.professional),
      })
      .nullable(),
  })
  .refine((t) => !t.endDate || t.endDate >= t.startDate, {
    path: ['endDate'],
    message: 'The end date must be on or after the start date',
  })
  .refine((t) => (t.category === 'medication') === (t.medication !== null), {
    path: ['medication'],
    message: 'Medication details are required for medication tasks only',
  })
  .refine((t) => t.category === 'appointment' || t.appointment === null, {
    path: ['appointment'],
    message: 'Appointment details apply to appointments only',
  });

export type TaskInput = z.infer<typeof taskInputSchema>;

export const circleInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name for the circle').max(LIMITS.circleName),
  timeZone,
  recipientName: z.string().trim().min(1, 'Enter a name').max(LIMITS.displayName),
  myRole: z.enum(['admin', 'care_recipient']),
});

export type CircleInput = z.infer<typeof circleInputSchema>;

export const profileInputSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(LIMITS.displayName),
  timeZone,
});

export const careUpdateInputSchema = z.object({
  body: z.string().trim().min(1, 'Write something first').max(LIMITS.updateBody),
  visibility: z.enum(['circle', 'private']),
  occurrenceId: z.string().nullable(),
});

export type CareUpdateInput = z.infer<typeof careUpdateInputSchema>;

export const invitationInputSchema = z.object({
  role: z.enum(ROLES),
  label: z.string().trim().max(60),
  expiresInDays: z.number().int().min(1).max(30),
});

export type InvitationInput = z.infer<typeof invitationInputSchema>;

export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
