import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { EchoGateway, PlayerProperties, SyllabusItem } from '../../domain';
import { getVideoMedia } from './video-progress';

type VideoProgressRequest = {
  lessonId: string;
  mediaId: string;
};

export function useSectionVideoProgress(
  gateway: EchoGateway,
  lessons: readonly SyllabusItem[],
  enabled = true,
): ReadonlyMap<string, PlayerProperties> {
  const requests = useMemo(
    () =>
      lessons.flatMap((lesson): VideoProgressRequest[] => {
        const media = getVideoMedia(lesson);
        return media ? [{ lessonId: lesson.id, mediaId: media.id }] : [];
      }),
    [lessons],
  );
  const queries = useQueries({
    queries: requests.map(({ lessonId, mediaId }) => ({
      queryKey: ['player-properties', 'lessons', lessonId, mediaId],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        gateway.getPlayerProperties('lessons', lessonId, mediaId, { signal }),
      enabled,
      refetchOnMount: 'always',
    })),
  });

  return useMemo(() => {
    const progress = new Map<string, PlayerProperties>();
    requests.forEach(({ lessonId }, index) => {
      const properties = queries[index]?.data;
      if (properties) progress.set(lessonId, properties);
    });
    return progress;
  }, [queries, requests]);
}
