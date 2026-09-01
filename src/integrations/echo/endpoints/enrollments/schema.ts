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
    termsById: z.record(z.string(), TermSchema).optional(),
  })
  .passthrough();
const EnrollmentsSchema = z.union([
  z.array(EnrollmentSchema),
  z.object({ enrollments: z.array(EnrollmentSchema) }).passthrough(),
  z.object({ data: z.array(LiveEnrollmentSchema) }).passthrough(),
]);

type EnrollmentWire = z.infer<typeof EnrollmentSchema>;

function records(payload: z.infer<typeof EnrollmentsSchema>): EnrollmentWire[] {
  if (Array.isArray(payload)) return payload;
  if ('enrollments' in payload) return (payload as { enrollments: EnrollmentWire[] }).enrollments;
  const data = (payload.data as z.infer<typeof LiveEnrollmentSchema>[])[0];
  if (!data) return [];
  return data.userSections.map((section) => ({
    id: section.sectionId,
    courseId: section.courseId,
    title: section.courseName,
    name: section.sectionName,
    institution: section.sectionName,
    courseCode: section.courseCode,
    lessonCount: section.lessonCount,
    term: section.termId ? data.termsById?.[section.termId] : undefined,
  }));
}

export function decodeEnrollments(payload: unknown) {
  return EnrollmentsSchema.parse(payload);
}

export function normalizeEnrollments(payload: z.infer<typeof EnrollmentsSchema>) {
  return records(payload).flatMap((record) => {
    if (!record.id) return [];
    const title = record.title ?? record.name ?? '';
    const courseCode = (record as EnrollmentWire & { courseCode?: string }).courseCode;
    const lessonCount = (record as EnrollmentWire & { lessonCount?: number }).lessonCount;
    const term = (record as EnrollmentWire & { term?: z.infer<typeof TermSchema> }).term;
    return [
      {
        id: record.id,
        title,
        ...(record.institution ? { institution: record.institution } : {}),
        ...(record.name && record.title ? { sectionId: record.id } : {}),
        ...(record.courseId ? { courseId: record.courseId } : {}),
        ...(courseCode ? { code: courseCode } : {}),
        ...(term?.name ? { term: term.name } : {}),
        ...(term?.startDate ? { termStart: term.startDate } : {}),
        ...(term?.isActiveOrFuture !== undefined ? { isActive: term.isActiveOrFuture } : {}),
        ...(lessonCount !== undefined ? { lessonCount } : {}),
      },
    ];
  });
}
