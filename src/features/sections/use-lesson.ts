import { useQueries } from '@tanstack/react-query';
import type { EchoGateway, SyllabusItem } from '../../domain';
import { useCourses } from '../courses';

export function useLesson(gateway: EchoGateway, lessonId: string, enabled = Boolean(lessonId)) {
  const coursesQuery = useCourses(gateway, enabled);
  const sectionIds = coursesQuery.data?.map((course) => course.sectionId) ?? [];
  const syllabiQueries = useQueries({
    queries: sectionIds.map((sectionId) => ({
      queryKey: ['section', sectionId, 'syllabus'] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) => gateway.getSectionSyllabus(sectionId, { signal }),
      enabled: enabled && sectionIds.length > 0,
      staleTime: 1000 * 60 * 5,
    })),
  });
  const isLoading = enabled && (coursesQuery.isLoading || syllabiQueries.some((q) => q.isLoading));
  const isError = enabled && (coursesQuery.isError || syllabiQueries.some((q) => q.isError));
  const found = (() => {
    if (!enabled || isLoading || isError) return undefined;
    for (let index = 0; index < syllabiQueries.length; index += 1) {
      const query = syllabiQueries[index]!;
      const lesson = query.data?.find((item) => item.id === lessonId);
      if (lesson) {
        const sectionId = lesson.sectionId ?? sectionIds[index];
        return { lesson, sectionId };
      }
    }
    return undefined;
  })();
  return {
    lesson: found?.lesson as SyllabusItem | undefined,
    sectionId: found?.sectionId as string | undefined,
    isLoading,
    isError,
  };
}
