import type { EnrollmentsPayload } from './schema';

export function normalizeEnrollments(payload: EnrollmentsPayload) {
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
