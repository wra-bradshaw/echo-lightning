import { z } from 'zod';
import { IdSchema } from '../shared/schema';

const TermSchema = z
  .object({
    id: IdSchema.optional(),
    name: z.string().optional(),
    startDate: z.string().optional(),
    isActiveOrFuture: z.boolean().optional(),
  })
  .passthrough();
const UserSectionSchema = z
  .object({
    sectionId: IdSchema.optional(),
    sectionName: z.string().optional(),
    courseId: IdSchema.optional(),
    courseCode: z.string().optional(),
    courseName: z.string().optional(),
    lessonCount: z.number().optional(),
    termId: IdSchema.optional(),
  })
  .passthrough();
const LiveEnrollmentSchema = z
  .object({
    userSections: z.array(UserSectionSchema),
    termsById: z.record(z.string(), TermSchema),
  })
  .passthrough();
const EnrollmentsSchema = z.object({ data: z.array(LiveEnrollmentSchema) }).passthrough();

export type EnrollmentsPayload = z.infer<typeof EnrollmentsSchema>;

export function decodeEnrollments(payload: unknown): EnrollmentsPayload {
  return EnrollmentsSchema.parse(payload);
}
