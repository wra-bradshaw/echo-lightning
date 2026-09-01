import { z } from 'zod';

const IdSchema = z.union([z.string(), z.number()]).transform(String);
const EnrollmentSchema = z
  .object({
    id: IdSchema.optional(),
    courseId: IdSchema.optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    institution: z.string().optional(),
  })
  .passthrough();
const EnrollmentsSchema = z.union([
  z.array(EnrollmentSchema),
  z.object({ enrollments: z.array(EnrollmentSchema) }).passthrough(),
]);

type EnrollmentWire = z.infer<typeof EnrollmentSchema>;

function records(payload: z.infer<typeof EnrollmentsSchema>): EnrollmentWire[] {
  return Array.isArray(payload) ? payload : payload.enrollments;
}

export function decodeEnrollments(payload: unknown) {
  return EnrollmentsSchema.parse(payload);
}

export function normalizeEnrollments(payload: z.infer<typeof EnrollmentsSchema>) {
  return records(payload).flatMap((record) => {
    if (!record.id) return [];
    return [{ id: record.id, title: record.title ?? record.name ?? '', institution: record.institution }];
  });
}
