import { z } from 'zod';

const IdSchema = z.union([z.string(), z.number()]).transform(String);
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

export function decodeEnrollments(payload: unknown) {
  return EnrollmentsSchema.parse(payload);
}

export function normalizeEnrollments(payload: z.infer<typeof EnrollmentsSchema>) {
  return payload.data.flatMap(({ userSections, termsById }) =>
    userSections.flatMap((section) => {
      if (!section.sectionId) return [];
      const term = section.termId ? termsById[section.termId] : undefined;
      return [
        {
          id: section.sectionId,
          sectionId: section.sectionId,
          title: section.courseName ?? '',
          ...(section.sectionName ? { institution: section.sectionName } : {}),
          ...(section.courseId ? { courseId: section.courseId } : {}),
          ...(section.courseCode ? { code: section.courseCode } : {}),
          ...(term?.name ? { term: term.name } : {}),
          ...(term?.startDate ? { termStart: term.startDate } : {}),
          ...(term?.isActiveOrFuture !== undefined ? { isActive: term.isActiveOrFuture } : {}),
          ...(section.lessonCount !== undefined ? { lessonCount: section.lessonCount } : {}),
        },
      ];
    }),
  );
}
